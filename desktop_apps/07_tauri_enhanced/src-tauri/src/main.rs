#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::RwLock;
use tauri::Manager;

mod base;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub router_ip: String,
    pub router_password: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            router_ip: "192.168.0.1".to_string(),
            router_password: "".to_string(),
        }
    }
}

pub struct AppState {
    pub config_path: std::path::PathBuf,
    pub config: RwLock<AppConfig>,
    pub client: reqwest::Client,
}

pub async fn make_request(
    state: &AppState,
    path: &str,
    data: Option<HashMap<String, String>>,
    method: &str,
) -> Result<serde_json::Value, String> {
    let ip = {
        let cfg = state.config.read().map_err(|e| format!("Config lock poisoned: {}", e))?;
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

pub fn get_epoch_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
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
            
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(5))
                .cookie_store(true)
                .build()
                .map_err(|e| tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
            
            app.manage(AppState {
                config_path,
                config: RwLock::new(config),
                client,
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
            base::login,
            base::logout,
            base::fetch_router_data,
            base::fetch_stations,
            base::fetch_static_ips,
            base::get_config,
            base::save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
