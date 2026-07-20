use std::collections::HashMap;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tauri::State;

use crate::{get_epoch_ms, make_request, AppConfig, AppState};

/// Recreates the reqwest Client to completely clear cookies and cached connection pools.
pub fn reset_session(state: &AppState) -> Result<(), String> {
    let new_client = crate::build_http_client()?;
    let mut guard = state
        .client
        .write()
        .map_err(|e| format!("Client lock poisoned: {}", e))?;
    *guard = new_client;
    Ok(())
}

pub async fn verify_login_status(state: &AppState) -> Result<bool, String> {
    let now = get_epoch_ms();
    let verify_path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd=hardware_version&_={}",
        now
    );

    match make_request(state, &verify_path, None, "GET").await {
        Ok(verify_data) => {
            let hw_ver = verify_data
                .get("hardware_version")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(!hw_ver.is_empty())
        }
        Err(_) => Ok(false),
    }
}

/// Reads the ZTE goform POST verdict from `make_request`'s wrapper (`_orig.result`).
/// The top-level `success: true` from `make_request` is transport-only until validated.
/// Observed on MF286R: `"0"` = ok, `"1"` = wrong password (login).
pub fn zte_post_result(wrapped: &serde_json::Value) -> Option<String> {
    let result = wrapped.get("_orig")?.get("result")?;
    if let Some(s) = result.as_str() {
        return Some(s.to_string());
    }
    if let Some(n) = result.as_i64() {
        return Some(n.to_string());
    }
    if let Some(n) = result.as_u64() {
        return Some(n.to_string());
    }
    None
}

fn is_zte_command_success_code(code: &str) -> bool {
    matches!(code.to_ascii_lowercase().as_str(), "0" | "ok" | "success")
}

/// After a POST `make_request` wrap, require a real ZTE `_orig.result` success code.
/// Returns `{ success: true, result }` so UI checks of `success` stay valid and truthful.
pub fn require_zte_command_ok(
    wrapped: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let Some(code) = zte_post_result(&wrapped) else {
        return Err("Router command failed: missing _orig.result".to_string());
    };
    if !is_zte_command_success_code(&code) {
        return Err(format!("Router command failed: result code {}", code));
    }
    Ok(serde_json::json!({
        "success": true,
        "result": code,
    }))
}

fn auth_ok_response(router_result: &str) -> serde_json::Value {
    serde_json::json!({
        "result": router_result,
        "verified": true,
        "telemetry_ok": true,
    })
}

fn is_valid_router_host(host: &str) -> bool {
    let host = host.trim();
    if host.is_empty() || host.len() > 253 {
        return false;
    }
    // Strip optional :port for validation of the host part
    let host_only = host.rsplit_once(':').map(|(h, port)| {
        if port.chars().all(|c| c.is_ascii_digit()) && !port.is_empty() {
            h
        } else {
            host
        }
    }).unwrap_or(host);

    let parts: Vec<&str> = host_only.split('.').collect();
    if parts.len() == 4 && parts.iter().all(|p| !p.is_empty() && p.parse::<u8>().is_ok()) {
        return true;
    }

    host_only
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
        && !host_only.starts_with('-')
        && !host_only.starts_with('.')
        && host_only.chars().any(|c| c.is_ascii_alphanumeric())
}

/// Sends a LOGIN_MULTI_USER POST with the given password (Base64-encoded).
/// Does **not** call `verify_login_status` — useful for inspecting raw `_orig` shapes.
pub async fn login_raw_post(
    state: &AppState,
    password: &str,
) -> Result<serde_json::Value, String> {
    let enc_pass = BASE64.encode(password.as_bytes());

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGIN_MULTI_USER".to_string());
    payload.insert("user".to_string(), "admin".to_string());
    payload.insert("password".to_string(), enc_pass);

    make_request(state, "/goform_set_cmd_process", Some(payload), "POST").await
}

/// Performs an authentication handshake with the router using the password in config,
/// then verifies the session via `hardware_version`.
pub async fn login_inner(state: &AppState) -> Result<serde_json::Value, String> {
    reset_session(state)?;

    let password = {
        let cfg = state
            .config
            .read()
            .map_err(|e| format!("Config lock poisoned: {}", e))?;
        cfg.router_password.clone()
    };

    println!("🔑 Attempting login to router...");
    let wrapped = login_raw_post(state, &password).await?;
    println!("🔑 Login response: {:?}", wrapped);

    let Some(code) = zte_post_result(&wrapped) else {
        reset_session(state)?;
        return Err("Login failed: unexpected response shape (missing _orig.result)".to_string());
    };

    // Fail fast on known wrong-password code before a second round-trip.
    if code == "1" {
        reset_session(state)?;
        return Err("Login failed: wrong password".to_string());
    }

    if code != "0" {
        reset_session(state)?;
        return Err(format!(
            "Login failed: router returned result code {}",
            code
        ));
    }

    if !verify_login_status(state).await? {
        reset_session(state)?;
        return Err("Login failed: session not established".to_string());
    }

    // Post-login telemetry GET must show auth-gated fields.
    let telemetry = match fetch_router_data_inner(state, "hardware_version,network_provider").await {
        Ok(v) => v,
        Err(e) => {
            reset_session(state)?;
            return Err(format!("Login failed: telemetry not available after login ({})", e));
        }
    };
    let hw = telemetry
        .get("hardware_version")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let provider = telemetry
        .get("network_provider")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if hw.is_empty() && provider.is_empty() {
        reset_session(state)?;
        return Err("Login failed: telemetry not available after login".to_string());
    }

    println!("✅ Login verified successfully (telemetry ok).");
    Ok(auth_ok_response(&code))
}

/// Logs out the active session and clears the local cookie jar.
pub async fn logout_inner(state: &AppState) -> Result<serde_json::Value, String> {
    let ad = fetch_ad_token(state).await.unwrap_or_default();

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGOUT".to_string());
    if !ad.is_empty() {
        payload.insert("AD".to_string(), ad);
    }

    println!("🚪 Attempting logout from router...");
    let wrapped = make_request(state, "/goform_set_cmd_process", Some(payload), "POST").await;
    println!("🚪 Logout response: {:?}", wrapped);

    let router_result = match &wrapped {
        Ok(v) => {
            let code = zte_post_result(v);
            if let Some(ref c) = code {
                println!("🚪 Logout _orig.result={}", c);
            }
            code.unwrap_or_else(|| "0".to_string())
        }
        Err(_) => "0".to_string(),
    };

    // Always drop local cookies; session verify is the source of truth.
    reset_session(state)?;

    if verify_login_status(state).await? {
        return Err("Logout failed: session still active".to_string());
    }

    println!("✅ Logout verified successfully.");
    Ok(auth_ok_response(&router_result))
}

pub async fn fetch_router_data_inner(
    state: &AppState,
    commands: &str,
) -> Result<serde_json::Value, String> {
    let now = get_epoch_ms();
    let path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd={}&_={}",
        commands, now
    );
    make_request(state, &path, None, "GET").await
}

pub async fn fetch_stations_inner(state: &AppState) -> Result<serde_json::Value, String> {
    let now = get_epoch_ms();
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=station_list&_={}",
        now
    );
    make_request(state, &path, None, "GET").await
}

pub async fn fetch_static_ips_inner(state: &AppState) -> Result<serde_json::Value, String> {
    let now = get_epoch_ms();
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=current_static_addr_list&_={}",
        now
    );
    make_request(state, &path, None, "GET").await
}

#[tauri::command]
pub async fn login(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    login_inner(&state).await
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    logout_inner(&state).await
}

#[tauri::command]
pub async fn fetch_router_data(
    state: State<'_, AppState>,
    commands: String,
) -> Result<serde_json::Value, String> {
    fetch_router_data_inner(&state, &commands).await
}

#[tauri::command]
pub async fn fetch_stations(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    fetch_stations_inner(&state).await
}

#[tauri::command]
pub async fn fetch_static_ips(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    fetch_static_ips_inner(&state).await
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let cfg = state
        .config
        .read()
        .map_err(|e| format!("Config lock poisoned: {}", e))?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    if !is_valid_router_host(&config.router_ip) {
        return Err("Invalid router_ip: expected IPv4 or hostname".to_string());
    }

    {
        let mut cfg = state
            .config
            .write()
            .map_err(|e| format!("Config lock poisoned: {}", e))?;
        *cfg = config.clone();
    }

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    tokio::fs::write(&state.config_path, content)
        .await
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    println!(
        "⚙️ Config saved successfully: router_ip={}, auto_refresh_interval={}, auto_refresh_on_startup={}, main_window_on_startup={}, theme_mode={}",
        config.router_ip,
        config.auto_refresh_interval,
        config.auto_refresh_on_startup,
        config.main_window_on_startup,
        config.theme_mode
    );
    Ok(())
}

#[tauri::command]
pub fn update_tray_title(app: tauri::AppHandle, title: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(title));
    }
}

#[tauri::command]
pub fn update_menu_item_text(state: State<'_, AppState>, text: String) -> Result<(), String> {
    println!("⚙️ update_menu_item_text called with: {}", text);
    match state.toggle_refresh_item.read() {
        Ok(guard) => {
            if let Some(item) = &*guard {
                if let Err(e) = item.set_text(text.clone()) {
                    println!("❌ Failed to set menu item text: {:?}", e);
                    Err(format!("Failed to set text: {:?}", e))
                } else {
                    println!("✅ Menu item text set to: {}", text);
                    Ok(())
                }
            } else {
                println!("❌ Menu item is None");
                Err("Menu item is None".to_string())
            }
        }
        Err(e) => {
            println!("❌ Failed to read lock: {:?}", e);
            Err(format!("Lock error: {:?}", e))
        }
    }
}

#[tauri::command]
pub fn get_pending_actions(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let mut guard = state
        .pending_actions
        .write()
        .map_err(|e| format!("Poisoned: {}", e))?;
    let actions = guard.clone();
    guard.clear();
    Ok(actions)
}

async fn fetch_ad_token(state: &AppState) -> Result<String, String> {
    let now = get_epoch_ms();
    let get_path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd=wa_inner_version,cr_version,RD&_={}",
        now
    );

    let auth_info = make_request(state, &get_path, None, "GET").await?;

    let wa_inner = auth_info
        .get("wa_inner_version")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing wa_inner_version from router response".to_string())?;

    let cr_ver = auth_info
        .get("cr_version")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing cr_version from router response".to_string())?;

    let rd = auth_info
        .get("RD")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing RD from router response".to_string())?;

    // AD = md5(md5(wa_inner_version + cr_version) + RD)
    let first_concat = format!("{}{}", wa_inner, cr_ver);
    let first_md5 = format!("{:x}", md5::compute(first_concat.as_bytes()));
    let second_concat = format!("{}{}", first_md5, rd);
    let ad = format!("{:x}", md5::compute(second_concat.as_bytes()));

    Ok(ad)
}

#[tauri::command]
pub async fn disconnect_network(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    println!("🔌 Fetching security tokens for network disconnection...");
    let ad = fetch_ad_token(&state).await?;

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "DISCONNECT_NETWORK".to_string());
    payload.insert("AD".to_string(), ad);

    println!("🔌 Sending DISCONNECT_NETWORK command...");
    let wrapped = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    let result = require_zte_command_ok(wrapped)?;
    println!("🔌 Disconnection response: {:?}", result);
    Ok(result)
}

#[tauri::command]
pub async fn connect_network(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    println!("🔌 Fetching security tokens for network connection...");
    let ad = fetch_ad_token(&state).await?;

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "CONNECT_NETWORK".to_string());
    payload.insert("AD".to_string(), ad);

    println!("🔌 Sending CONNECT_NETWORK command...");
    let wrapped = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    let result = require_zte_command_ok(wrapped)?;
    println!("🔌 Connection response: {:?}", result);
    Ok(result)
}

#[tauri::command]
pub async fn set_bearer_preference(
    state: State<'_, AppState>,
    preference: String,
) -> Result<serde_json::Value, String> {
    if preference != "Only_LTE" && preference != "Only_WCDMA" && preference != "NETWORK_auto" {
        return Err(format!("Invalid bearer preference: {}", preference));
    }

    println!("🔌 Fetching security tokens for setting bearer preference...");
    let ad = fetch_ad_token(&state).await?;

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "SET_BEARER_PREFERENCE".to_string());
    payload.insert("BearerPreference".to_string(), preference.clone());
    payload.insert("AD".to_string(), ad);

    println!(
        "🔌 Sending SET_BEARER_PREFERENCE command with BearerPreference={}...",
        preference
    );
    let wrapped = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    let result = require_zte_command_ok(wrapped)?;
    println!("🔌 Bearer preference response: {:?}", result);
    Ok(result)
}
