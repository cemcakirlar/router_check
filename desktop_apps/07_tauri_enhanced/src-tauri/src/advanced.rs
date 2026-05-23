use std::collections::HashMap;
use tauri::State;
use crate::{AppState, make_request};

// Challenge-response AD token calculation helper for secure command process
async fn get_ad_token(state: &AppState) -> Result<String, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
        
    let path = format!(
        "/goform_get_cmd_process?isTest=false&cmd=wa_inner_version,cr_version,RD&_={}",
        now
    );
    
    println!("🔐 Fetching AD challenge inputs from router...");
    let res = make_request(state, &path, None, "GET").await?;
    
    let wa_inner_version = res.get("wa_inner_version")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let cr_version = res.get("cr_version")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let rd = res.get("RD")
        .and_then(|v| v.as_str())
        .unwrap_or("");
        
    if rd.is_empty() {
        return Err("Failed to retrieve RD security parameter from router".to_string());
    }
    
    // 1. Prefix hash: md5(wa_inner_version + cr_version)
    let prefix_string = format!("{}{}", wa_inner_version, cr_version);
    let prefix_hash = format!("{:x}", md5::compute(prefix_string.as_bytes()));
    
    // 2. Final AD hash: md5(prefix_hash + RD)
    let ad_string = format!("{}{}", prefix_hash, rd);
    let final_ad = format!("{:x}", md5::compute(ad_string.as_bytes()));
    
    println!("🔐 Successfully computed AD token: {} (RD={})", final_ad, rd);
    Ok(final_ad)
}

#[tauri::command]
pub async fn reboot(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "REBOOT_DEVICE".to_string());
    payload.insert("AD".to_string(), ad_token);
    
    println!("🔌 Attempting router reboot...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🔌 Reboot response: {:?}", result);
    
    Ok(result)
}

#[tauri::command]
pub async fn set_connection_mode(state: State<'_, AppState>, auto_dial: bool) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "SET_CONNECTION_MODE".to_string());
    payload.insert(
        "ConnectionMode".to_string(),
        if auto_dial { "auto_dial" } else { "manual_dial" }.to_string(),
    );
    payload.insert("AD".to_string(), ad_token);
    
    println!("⚙️ Setting connection mode to: auto_dial={}", auto_dial);
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("⚙️ Connection mode response: {:?}", result);
    
    Ok(result)
}

#[tauri::command]
pub async fn connect_network(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "CONNECT_NETWORK".to_string());
    payload.insert("AD".to_string(), ad_token);
    
    println!("⚡ Connecting WAN network...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("⚡ Connect response: {:?}", result);
    
    Ok(result)
}

#[tauri::command]
pub async fn disconnect_network(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "DISCONNECT_NETWORK".to_string());
    payload.insert("AD".to_string(), ad_token);
    
    println!("🛑 Disconnecting WAN network...");
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("🛑 Disconnect response: {:?}", result);
    
    Ok(result)
}

#[tauri::command]
pub async fn add_static_ip(
    state: State<'_, AppState>,
    hostname: String,
    ip_addr: String,
    mac_addr: String,
) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    
    // 1. Add static address mapping (DHCP_RESERVATION_TO_STATIC)
    let mut payload1 = HashMap::new();
    payload1.insert("isTest".to_string(), "false".to_string());
    payload1.insert("notCallback".to_string(), "true".to_string());
    payload1.insert("goformId".to_string(), "DHCP_RESERVATION_TO_STATIC".to_string());
    payload1.insert("hostname".to_string(), hostname.clone());
    payload1.insert("ipAddress".to_string(), ip_addr.clone());
    payload1.insert("macAddress".to_string(), mac_addr.clone());
    payload1.insert("AD".to_string(), ad_token.clone());
    
    println!("📌 Adding IP reservation: {} -> {} ({})", mac_addr, ip_addr, hostname);
    let res = make_request(&state, "/goform_set_cmd_process", Some(payload1), "POST").await?;
    println!("📌 IP reservation response: {:?}", res);
    
    // Fetch a fresh AD token for the second sequential request
    let ad_token2 = get_ad_token(&state).await?;
    
    // 2. Enforce the binding update (SET_BIND_STATIC_ADDRESS)
    let mut payload2 = HashMap::new();
    payload2.insert("isTest".to_string(), "false".to_string());
    payload2.insert("notCallback".to_string(), "true".to_string());
    payload2.insert("goformId".to_string(), "SET_BIND_STATIC_ADDRESS".to_string());
    payload2.insert("AD".to_string(), ad_token2);
    
    println!("📌 Enforcing static address binding rules...");
    let res2 = make_request(&state, "/goform_set_cmd_process", Some(payload2), "POST").await?;
    println!("📌 Enforce rules response: {:?}", res2);
    
    Ok(res)
}

#[tauri::command]
pub async fn set_bearer_preference(state: State<'_, AppState>, preference: String) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "SET_BEARER_PREFERENCE".to_string());
    payload.insert("BearerPreference".to_string(), preference.clone());
    payload.insert("AD".to_string(), ad_token);
    
    println!("📶 Locking bearer/technology preference to: {}", preference);
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("📶 Bearer lock response: {:?}", result);
    
    Ok(result)
}

#[tauri::command]
pub async fn send_sms(
    state: State<'_, AppState>,
    number: String,
    message_hex: String,
    date: String,
) -> Result<serde_json::Value, String> {
    let ad_token = get_ad_token(&state).await?;
    let mut payload = HashMap::new();
    payload.insert("isTest".to_string(), "false".to_string());
    payload.insert("notCallback".to_string(), "true".to_string());
    payload.insert("goformId".to_string(), "SEND_SMS".to_string());
    payload.insert("Number".to_string(), number.clone());
    payload.insert("Message".to_string(), message_hex);
    payload.insert("SMS_date".to_string(), date);
    payload.insert("AD".to_string(), ad_token);
    
    println!("💬 Dispatching SMS to: {}", number);
    let result = make_request(&state, "/goform_set_cmd_process", Some(payload), "POST").await?;
    println!("💬 SMS response: {:?}", result);
    
    Ok(result)
}
