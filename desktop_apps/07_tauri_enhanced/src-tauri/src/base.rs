use std::collections::HashMap;
use tauri::State;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use crate::{AppState, AppConfig, make_request, get_epoch_ms};

/// Performs an authentication handshake with the router.
/// Decodes the local router password configuration, encodes it to Base64,
/// and sends a login POST payload to `/goform_set_cmd_process`.
#[tauri::command]
pub async fn login(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
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
    
    Ok(result)
}

/// Logs out the active session from the router's web portal
/// by sending a logout request.
#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGOUT".to_string());
    
    println!("🚪 Attempting logout from router...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🚪 Logout response: {:?}", result);
    
    Ok(result)
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
