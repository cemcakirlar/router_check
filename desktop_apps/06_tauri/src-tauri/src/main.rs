#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct AppState {
    sidecar_child: Mutex<Option<CommandChild>>,
}

#[derive(Clone, serde::Serialize)]
struct StatusPayload {
    status: String,
    message: String,
    percentage: u8,
}

fn emit_status(app: &tauri::AppHandle, status: &str, message: &str, percentage: u8) {
    let payload = StatusPayload {
        status: status.to_string(),
        message: message.to_string(),
        percentage,
    };
    let _ = app.emit("bootstrap-status", payload);
    println!("📢 Bootstrap Status [{}%]: {} ({})", percentage, message, status);
}

fn check_and_resolve_port_conflict() -> Result<bool, String> {
    use std::net::TcpListener;
    
    // Check if port 8080 is occupied
    let is_occupied = match TcpListener::bind("127.0.0.1:8080") {
        Ok(_) => false,
        Err(_) => true,
    };
    
    if is_occupied {
        println!("⚠️ Port 8080 is occupied. Attempting conflict recovery...");
        
        // On macOS:
        // Run: lsof -t -i tcp:8080
        let lsof_output = std::process::Command::new("lsof")
            .args(&["-t", "-i", "tcp:8080"])
            .output();
            
        match lsof_output {
            Ok(output) => {
                let pids_str = String::from_utf8_lossy(&output.stdout);
                let pids: Vec<&str> = pids_str
                    .lines()
                    .map(|line| line.trim())
                    .filter(|line| !line.is_empty())
                    .collect();
                
                if pids.is_empty() {
                    println!("⚠️ Port 8080 is occupied, but lsof returned no PIDs.");
                    return Ok(false);
                } else {
                    println!("🔍 Found PIDs using port 8080: {:?}", pids);
                    for pid in pids {
                        println!("💀 Killing PID: {}", pid);
                        let _ = std::process::Command::new("kill")
                            .args(&["-9", pid])
                            .status();
                    }
                    // Wait for the OS to release the socket
                    std::thread::sleep(std::time::Duration::from_millis(800));
                }
            }
            Err(e) => {
                return Err(format!("Failed to run lsof: {}", e));
            }
        }
        
        // Re-check port
        let still_occupied = match TcpListener::bind("127.0.0.1:8080") {
            Ok(_) => false,
            Err(_) => true,
        };
        if still_occupied {
            return Err("Port 8080 is still occupied after kill attempt.".to_string());
        }
        return Ok(true);
    }
    
    Ok(false)
}

async fn start_sidecar_internal(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut child_guard = state.sidecar_child.lock().unwrap();

    // Kill existing sidecar if running
    if let Some(child) = child_guard.take() {
        let _ = child.kill();
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    println!("📡 Starting Python backend sidecar...");

    // Retrieve target-triple suffix matched sidecar binary
    let sidecar_cmd = app.shell()
        .sidecar("server-macos")
        .map_err(|e| format!("Failed to locate server-macos sidecar: {}", e))?;

    match sidecar_cmd.spawn() {
        Ok((mut rx, child)) => {
            *child_guard = Some(child);

            // Forward stdout/stderr logs to console
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                            println!("🐍 Python: {}", String::from_utf8_lossy(&line).trim());
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                            eprintln!("🐍 Python Error: {}", String::from_utf8_lossy(&line).trim());
                        }
                        _ => {}
                    }
                }
            });
            Ok(())
        }
        Err(e) => {
            let err_msg = format!("Failed to spawn Python sidecar: {}", e);
            eprintln!("❌ {}", err_msg);
            Err(err_msg)
        }
    }
}

async fn probe_sidecar() -> bool {
    // Attempt to connect to port 8080
    // Try 15 times with 200ms delay (total 3s)
    for _ in 0..15 {
        if std::net::TcpStream::connect("127.0.0.1:8080").is_ok() {
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
    false
}

#[tauri::command]
async fn bootstrap_app(app: tauri::AppHandle) -> Result<(), String> {
    // 1. Conflict Check
    emit_status(&app, "conflict_check", "Checking for port conflicts on port 8080...", 20);
    
    match check_and_resolve_port_conflict() {
        Ok(killed_any) => {
            if killed_any {
                emit_status(&app, "conflict_check", "Port conflict found and resolved.", 35);
            } else {
                emit_status(&app, "conflict_check", "Port 8080 is clear.", 35);
            }
        }
        Err(e) => {
            emit_status(&app, "conflict_check", &format!("Warning during conflict check: {}", e), 35);
        }
    }
    
    // 2. Spawning Sidecar
    emit_status(&app, "spawning", "Spawning Python sidecar...", 50);
    
    // Spawn
    let spawn_result = start_sidecar_internal(&app).await;
    if let Err(e) = spawn_result {
        emit_status(&app, "failed", &format!("Failed to spawn sidecar: {}", e), 100);
        return Err(e);
    }
    
    // 3. Probing Sidecar
    emit_status(&app, "probing", "Probing proxy server on port 8080...", 70);
    
    let mut success = probe_sidecar().await;
    
    if !success {
        // Attempt recovery!
        emit_status(&app, "recovery", "Sidecar unresponsive. Attempting recovery restart...", 80);
        
        // Teardown the spawned child
        {
            let state = app.state::<AppState>();
            let mut child_guard = state.sidecar_child.lock().unwrap();
            if let Some(child) = child_guard.take() {
                let _ = child.kill();
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
        }
        
        // Re-run conflict check
        let _ = check_and_resolve_port_conflict();
        
        // Spawn again
        let retry_spawn = start_sidecar_internal(&app).await;
        if let Err(e) = retry_spawn {
            emit_status(&app, "failed", &format!("Recovery failed to spawn sidecar: {}", e), 100);
            return Err(e);
        }
        
        emit_status(&app, "probing", "Probing sidecar again after restart...", 85);
        success = probe_sidecar().await;
    }
    
    if success {
        emit_status(&app, "ready", "Proxy server is ready and responsive!", 100);
        Ok(())
    } else {
        emit_status(&app, "failed", "Proxy server failed to respond on port 8080.", 100);
        Err("Failed to start sidecar".into())
    }
}

#[tauri::command]
async fn restart_server(app: tauri::AppHandle) -> Result<(), String> {
    println!("🔄 Restart request received from UI via Tauri command");
    bootstrap_app(app).await
}

#[tauri::command]
fn stop_server(app: tauri::AppHandle) {
    let state = app.state::<AppState>();
    let mut child_guard = state.sidecar_child.lock().unwrap();
    if let Some(child) = child_guard.take() {
        let _ = child.kill();
        println!("🛑 Python sidecar stopped via Tauri command");
    } else {
        println!("⚠️ Stop requested but no running sidecar found");
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            sidecar_child: Mutex::new(None),
        })
        .setup(|_app| {
            // Note: Sidecar is no longer spawned on setup automatically.
            // It is triggered by the frontend calling `bootstrap_app` upon page load.
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent window from closing immediately
                api.prevent_close();
                
                let app = window.app_handle().clone();
                
                // Run cleanup asynchronously so we don't block the UI thread/event loop
                tauri::async_runtime::spawn(async move {
                    // Notify UI that teardown has started
                    let _ = app.emit("cleanup-status", "teardown_started");
                    
                    // Allow UI some time to show the overlay and animate
                    std::thread::sleep(std::time::Duration::from_millis(600));
                    
                    // Kill the sidecar process
                    {
                        let state = app.state::<AppState>();
                        let mut child_guard = state.sidecar_child.lock().unwrap();
                        if let Some(child) = child_guard.take() {
                            println!("🧹 Terminating sidecar process during app exit...");
                            let _ = child.kill();
                            // Allow process some time to release system resources
                            std::thread::sleep(std::time::Duration::from_millis(800));
                        }
                    }
                    
                    // Double-check conflict cleanup to be absolutely sure port is clean
                    let _ = check_and_resolve_port_conflict();
                    
                    // Notify UI that teardown is complete
                    let _ = app.emit("cleanup-status", "teardown_complete");
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    
                    // Exit the app completely
                    std::process::exit(0);
                });
            }
        })
        .invoke_handler(tauri::generate_handler![
            bootstrap_app,
            restart_server,
            stop_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
