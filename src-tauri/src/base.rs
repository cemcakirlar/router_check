use std::collections::HashMap;
use tauri::State;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use crate::{AppState, AppConfig, make_request, get_epoch_ms};

/// Recreates the reqwest Client to completely clear cookies and cached connection pools.
fn reset_session(state: &AppState) -> Result<(), String> {
    let new_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .cookie_store(true)
        .build()
        .map_err(|e| format!("Failed to rebuild client: {}", e))?;
    let mut guard = state.client.write().map_err(|e| format!("Client lock poisoned: {}", e))?;
    *guard = new_client;
    Ok(())
}

async fn verify_login_status(state: &AppState) -> Result<bool, String> {
    let now = get_epoch_ms();
    let verify_path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd=hardware_version&_={}",
        now
    );

    match make_request(state, &verify_path, None, "GET").await {
        Ok(verify_data) => {
            let hw_ver = verify_data.get("hardware_version")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(!hw_ver.is_empty())
        }
        Err(_) => Ok(false),
    }
}

/// Performs an authentication handshake with the router.
/// Decodes the local router password configuration, encodes it to Base64,
/// and sends a login POST payload to `/goform_set_cmd_process`.
#[tauri::command]
pub async fn login(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    // Reset session before login just in case there's any dirty session cookie
    reset_session(&state)?;

    let password = {
        let cfg = state.config.read().map_err(|e| format!("Config lock poisoned: {}", e))?;
        cfg.router_password.clone()
    };
    
    let enc_pass = BASE64.encode(password.as_bytes());
    
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGIN_MULTI_USER".to_string());
    payload.insert("user".to_string(), "admin".to_string());
    payload.insert("password".to_string(), enc_pass);
    
    println!("🔑 Attempting login to router...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🔑 Login response: {:?}", result);
    
    // Verify login state
    if !verify_login_status(&state).await? {
        // Reset session immediately to clear any partial cookies or failed login attempts
        reset_session(&state)?;
        return Err("Login failed: wrong password".to_string());
    }

    println!("✅ Login verified successfully.");
    Ok(result)
}

/// Logs out the active session from the router's web portal
/// by sending a logout request.
#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    // Attempt normal router logout first. It might fail or succeed, but we do it gracefully.
    let ad = fetch_ad_token(&state).await.unwrap_or_default();

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGOUT".to_string());
    if !ad.is_empty() {
        payload.insert("AD".to_string(), ad);
    }
    
    println!("🚪 Attempting logout from router...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await;
    println!("🚪 Logout response: {:?}", result);
    
    // Crucially, reset the reqwest client to drop all cookies locally!
    reset_session(&state)?;
    
    // Verify we are indeed logged out
    if verify_login_status(&state).await? {
        return Err("Logout failed: session still active".to_string());
    }
    
    println!("✅ Logout verified successfully.");
    Ok(serde_json::json!({ "success": true }))
}

/// Fetches multiple diagnostic telemetry parameters from the router (e.g., RSRP, SINR, band info)
/// by passing a comma-separated list of telemetry parameter keys.
#[tauri::command]
pub async fn fetch_router_data(state: State<'_, AppState>, commands: String) -> Result<serde_json::Value, String> {
    let now = get_epoch_ms();
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd={}&_={}",
        commands, now
    );
    
    make_request(&state, &path, None, "GET").await
}

/// Retrieves the list of currently connected wireless/wired client stations
/// from the router's active DHCP leases table.
#[tauri::command]
pub async fn fetch_stations(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let now = get_epoch_ms();
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=station_list&_={}",
        now
    );
    
    make_request(&state, &path, None, "GET").await
}

/// Fetches the list of static/reserved IP address allocations configured
/// in the router's DHCP reservation table.
#[tauri::command]
pub async fn fetch_static_ips(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let now = get_epoch_ms();
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=current_static_addr_list&_={}",
        now
    );
    
    make_request(&state, &path, None, "GET").await
}

/// Retrieves the current application configuration (Router IP & Password)
/// stored in memory.
#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let cfg = state.config.read().map_err(|e| format!("Config lock poisoned: {}", e))?;
    Ok(cfg.clone())
}

/// Updates the application configuration both in active memory and
/// permanently by overwriting the `config.json` configuration file.
#[tauri::command]
pub async fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    // Save to memory
    {
        let mut cfg = state.config.write().map_err(|e| format!("Config lock poisoned: {}", e))?;
        *cfg = config.clone();
    }
    
    // Save to config.json asynchronously
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
    tokio::fs::write(&state.config_path, content).await
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    
    println!("⚙️ Config saved successfully: {:?}", config);
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
    let mut guard = state.pending_actions.write().map_err(|e| format!("Poisoned: {}", e))?;
    let actions = guard.clone();
    guard.clear();
    Ok(actions)
}

async fn fetch_ad_token(state: &State<'_, AppState>) -> Result<String, String> {
    let now = get_epoch_ms();
    let get_path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd=wa_inner_version,cr_version,RD&_={}",
        now
    );
    
    let auth_info = make_request(state, &get_path, None, "GET").await?;
    
    let wa_inner = auth_info.get("wa_inner_version")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing wa_inner_version from router response".to_string())?;
        
    let cr_ver = auth_info.get("cr_version")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing cr_version from router response".to_string())?;
        
    let rd = auth_info.get("RD")
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
    payload.insert("AD".to_string(), ad.clone());

    println!("🔌 Sending DISCONNECT_NETWORK command with AD={}...", ad);
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
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
    payload.insert("AD".to_string(), ad.clone());

    println!("🔌 Sending CONNECT_NETWORK command with AD={}...", ad);
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🔌 Connection response: {:?}", result);

    Ok(result)
}

#[tauri::command]
pub async fn set_bearer_preference(state: State<'_, AppState>, preference: String) -> Result<serde_json::Value, String> {
    if preference != "Only_LTE" && preference != "Only_WCDMA" && preference != "NETWORK_auto" {
        return Err(format!("Invalid bearer preference: {}", preference));
    }

    println!("🔌 Fetching security tokens for setting bearer preference...");
    let ad = fetch_ad_token(&state).await?;

    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "SET_BEARER_PREFERENCE".to_string());
    payload.insert("BearerPreference".to_string(), preference.clone());
    payload.insert("AD".to_string(), ad.clone());

    println!("🔌 Sending SET_BEARER_PREFERENCE command with BearerPreference={} and AD={}...", preference, ad);
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🔌 Bearer preference response: {:?}", result);

    Ok(result)
}




