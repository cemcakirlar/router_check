#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::RwLock;
use std::time::SystemTime;
use tauri::{Manager, State};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct AppConfig {
    router_ip: String,
    router_password: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            router_ip: "192.168.0.1".to_string(),
            router_password: "FoldMund2204*".to_string(),
        }
    }
}

struct AppState {
    config_path: std::path::PathBuf,
    config: RwLock<AppConfig>,
    client: reqwest::Client,
}

async fn make_request(
    state: &AppState,
    path: &str,
    data: Option<HashMap<String, String>>,
    method: &str,
) -> Result<serde_json::Value, String> {
    let ip = {
        let cfg = state.config.read().unwrap();
        cfg.router_ip.clone()
    };

    let url = format!("http://{}/goform{}", ip, path);

    let mut req_builder = if method == "POST" {
        state.client.post(&url)
    } else {
        state.client.get(&url)
    };

    // Add headers
    req_builder = req_builder
        .header("Referer", format!("http://{}/index.html", ip))
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36")
        .header("Accept", "application/json, text/javascript, */*; q=0.01")
        .header("Accept-Language", "tr,en;q=0.9")
        .header("Cache-Control", "no-cache")
        .header("Pragma", "no-cache")
        .header("X-Requested-With", "XMLHttpRequest");

    // Add post data
    if let Some(form_data) = data {
        req_builder = req_builder.form(&form_data);
    }

    let response = req_builder.send().await.map_err(|e| format!("Network error: {}", e))?;
    let body = response.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;

    if body.to_lowercase().contains("<html") {
        return Ok(serde_json::json!({ "result": "not_login" }));
    }

    if body.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }

    let val: serde_json::Value = serde_json::from_str(&body).map_err(|e| {
        format!("JSON decode error (body was: {}): {}", body, e)
    })?;

    Ok(val)
}

#[tauri::command]
async fn login(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
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
async fn logout(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("goformId".to_string(), "LOGOUT".to_string());
    
    println!("🚪 Attempting logout from router...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🚪 Logout response: {:?}", result);
    
    Ok(serde_json::json!({ "result": "0", "router_response": result }))
}

#[tauri::command]
async fn fetch_router_data(state: State<'_, AppState>, commands: String) -> Result<serde_json::Value, String> {
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
async fn fetch_stations(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
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
async fn fetch_static_ips(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
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
fn get_config(state: State<'_, AppState>) -> AppConfig {
    let cfg = state.config.read().unwrap();
    cfg.clone()
}

#[tauri::command]
async fn save_config(state: State<'_, AppState>, config: AppConfig) -> Result<(), String> {
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Find application config directory
            let config_dir = app.path().app_config_dir()
                .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
            
            // Create config dir if it doesn't exist
            std::fs::create_dir_all(&config_dir)?;
            
            let config_path = config_dir.join("config.json");
            
            // Load config or write default
            let config = if config_path.exists() {
                let file = std::fs::File::open(&config_path)?;
                serde_json::from_reader(file).unwrap_or_else(|_| AppConfig::default())
            } else {
                let file = std::fs::File::create(&config_path)?;
                let default_cfg = AppConfig::default();
                serde_json::to_writer_pretty(file, &default_cfg)?;
                default_cfg
            };
            
            app.manage(AppState {
                config_path,
                config: RwLock::new(config),
                client: reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(5))
                    .cookie_store(true)
                    .build()
                    .unwrap(),
            });
            
            // Apply macOS window vibrancy
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::UnderWindowBackground, None, None);
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            fetch_router_data,
            fetch_stations,
            fetch_static_ips,
            get_config,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
