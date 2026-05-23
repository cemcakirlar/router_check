use std::collections::HashMap;
use std::time::SystemTime;
use tauri::State;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use crate::{AppState, AppConfig, make_request};

#[tauri::command]
pub async fn login(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let password = {
        let cfg = state.config.read().unwrap();
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
    
    Ok(serde_json::json!({ "result": "0", "router_response": result }))
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGOUT".to_string());
    
    println!("🚪 Attempting logout from router...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🚪 Logout response: {:?}", result);
    
    Ok(serde_json::json!({ "result": "0", "router_response": result }))
}

#[tauri::command]
pub async fn fetch_router_data(state: State<'_, AppState>, commands: String) -> Result<serde_json::Value, String> {
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&multi_data=1&cmd={}&_={}",
        commands, now
    );
    
    make_request(&state, &path, None, "GET").await
}

#[tauri::command]
pub async fn fetch_stations(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=station_list&_={}",
        now
    );
    
    make_request(&state, &path, None, "GET").await
}

#[tauri::command]
pub async fn fetch_static_ips(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=current_static_addr_list&_={}",
        now
    );
    
    make_request(&state, &path, None, "GET").await
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppConfig {
    let cfg = state.config.read().unwrap();
    cfg.clone()
}

#[tauri::command]
pub async fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    // Save to memory
    {
        let mut cfg = state.config.write().unwrap();
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
