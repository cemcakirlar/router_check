use std::collections::HashMap;
use std::sync::RwLock;
use tauri::Manager;

pub mod base;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub router_ip: String,
    pub router_password: String,
    pub auto_refresh_interval: u32,
    pub auto_refresh_on_startup: bool,
    pub main_window_on_startup: String,
    #[serde(default = "default_theme_mode")]
    pub theme_mode: String,
}

fn default_theme_mode() -> String {
    "system".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            router_ip: "192.168.0.1".to_string(),
            router_password: "".to_string(),
            auto_refresh_interval: 2000,
            auto_refresh_on_startup: true,
            main_window_on_startup: "visible".to_string(),
            theme_mode: default_theme_mode(),
        }
    }
}

pub struct AppState {
    pub config_path: std::path::PathBuf,
    pub config: RwLock<AppConfig>,
    pub client: RwLock<reqwest::Client>,
    pub toggle_refresh_item: RwLock<Option<tauri::menu::MenuItem<tauri::Wry>>>,
    pub pending_actions: RwLock<Vec<String>>,
}

pub async fn make_request(
    state: &AppState,
    path: &str,
    data: Option<HashMap<String, String>>,
    method: &str,
) -> Result<serde_json::Value, String> {
    let ip = {
        let cfg = state
            .config
            .read()
            .map_err(|e| format!("Config lock poisoned: {}", e))?;
        cfg.router_ip.clone()
    };

    let url = format!("http://{}/goform{}", ip, path);

    let client = {
        let client_guard = state
            .client
            .read()
            .map_err(|e| format!("Client lock poisoned: {}", e))?;
        client_guard.clone()
    };
    let mut req_builder = if method == "POST" {
        client.post(&url)
    } else {
        client.get(&url)
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

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        let snippet: String = body.chars().take(200).collect();
        return Err(format!(
            "HTTP {}: {}",
            status.as_u16(),
            if snippet.is_empty() {
                "(empty body)".to_string()
            } else {
                snippet
            }
        ));
    }

    if body.to_lowercase().contains("<html") {
        return Ok(serde_json::json!({ "result": "not_login" }));
    }

    if body.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }

    let val: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("JSON decode error (body was: {}): {}", body, e))?;

    if method == "POST" {
        let mut map = serde_json::Map::new();
        map.insert("success".to_string(), serde_json::Value::Bool(true));
        map.insert("_orig".to_string(), val);
        return Ok(serde_json::Value::Object(map));
    }

    Ok(val)
}

pub fn get_epoch_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// Builds a cookie-enabled HTTP client matching the app's production settings.
pub fn build_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .cookie_store(true)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

/// Creates an `AppState` suitable for tests or headless use (no tray menu item).
pub fn create_app_state(config: AppConfig, config_path: std::path::PathBuf) -> Result<AppState, String> {
    Ok(AppState {
        config_path,
        config: RwLock::new(config),
        client: RwLock::new(build_http_client()?),
        toggle_refresh_item: RwLock::new(None),
        pending_actions: RwLock::new(Vec::new()),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Find application config directory
            let config_dir = app.path().app_config_dir().map_err(|e| {
                tauri::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    e.to_string(),
                ))
            })?;

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

            let client = build_http_client().map_err(|e| {
                tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;

            let initial_refresh_text = if config.auto_refresh_on_startup {
                "Pause Auto-Poll"
            } else {
                "Resume Auto-Poll"
            };
            let initial_visibility_text = if config.main_window_on_startup == "hidden" {
                "Show Window"
            } else {
                "Hide Window"
            };

            use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
            let toggle_visibility =
                MenuItemBuilder::with_id("toggle_visibility", initial_visibility_text).build(app)?;
            let toggle_refresh =
                MenuItemBuilder::with_id("toggle_refresh", initial_refresh_text).build(app)?;
            let force_refresh = MenuItemBuilder::with_id("force_refresh", "Refresh Now").build(app)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Exit Router Check").build(app)?;

            app.manage(AppState {
                config_path,
                config: RwLock::new(config.clone()),
                client: RwLock::new(client),
                toggle_refresh_item: RwLock::new(Some(toggle_refresh.clone())),
                pending_actions: RwLock::new(Vec::new()),
            });

            // Set up native window event listeners to handle show, hide, and close request
            if let Some(window) = app.get_webview_window("main") {
                if config.main_window_on_startup != "hidden" {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }

                let toggle_vis_clone = toggle_visibility.clone();
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                        let _ = toggle_vis_clone.set_text("Show Window");
                    }
                });
            }

            // Initialize TrayIcon
            if let Some(icon) = app.default_window_icon() {
                let menu = MenuBuilder::new(app)
                    .items(&[
                        &toggle_visibility,
                        &separator,
                        &toggle_refresh,
                        &force_refresh,
                        &separator,
                        &quit,
                    ])
                    .build()?;

                let toggle_vis_clone_menu = toggle_visibility.clone();
                let toggle_vis_clone_tray = toggle_visibility.clone();
                let _tray = tauri::tray::TrayIconBuilder::with_id("main")
                    .icon(icon.clone())
                    .title("Offline")
                    .menu(&menu)
                    .on_menu_event(move |app, event| {
                        match event.id().as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            "toggle_visibility" => {
                                if let Some(webview_window) = app.get_webview_window("main") {
                                    if webview_window.is_visible().unwrap_or(false) {
                                        let _ = webview_window.hide();
                                        let _ = toggle_vis_clone_menu.set_text("Show Window");
                                    } else {
                                        let _ = webview_window.unminimize();
                                        let _ = webview_window.show();
                                        let _ = webview_window.set_focus();
                                        let _ = toggle_vis_clone_menu.set_text("Hide Window");
                                    }
                                }
                            }
                            "toggle_refresh" => {
                                println!("🖱️ Tray menu click: toggle_refresh (enqueued)");
                                if let Ok(mut guard) = app.state::<AppState>().pending_actions.write() {
                                    guard.push("toggle_refresh".to_string());
                                }
                            }
                            "force_refresh" => {
                                println!("🖱️ Tray menu click: force_refresh (enqueued)");
                                if let Ok(mut guard) = app.state::<AppState>().pending_actions.write() {
                                    guard.push("force_refresh".to_string());
                                }
                            }
                            _ => (),
                        }
                    })
                    .on_tray_icon_event(move |tray, event| {
                        if let tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            button_state: tauri::tray::MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(webview_window) = app.get_webview_window("main") {
                                let _ = webview_window.unminimize();
                                let _ = webview_window.show();
                                let _ = webview_window.set_focus();
                                let _ = toggle_vis_clone_tray.set_text("Hide Window");
                            }
                        }
                    })
                    .build(app)?;
            }

            // Apply macOS window vibrancy
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_vibrancy(
                        &window,
                        NSVisualEffectMaterial::UnderWindowBackground,
                        None,
                        None,
                    );
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
            base::save_config,
            base::update_tray_title,
            base::update_menu_item_text,
            base::get_pending_actions,
            base::disconnect_network,
            base::connect_network,
            base::set_bearer_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
