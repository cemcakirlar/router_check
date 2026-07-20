//! Live read-only e2e against a LAN ZTE router.
//!
//! Credentials are read **only** from the project-root `.env.e2e` file
//! (see `.env.e2e.example`). Never invent or try wrong passwords — a bad
//! login locks many ZTE units for ~5 minutes.
//!
//! Run (preferred):
//!   npm run test:e2e:live
//!
//! Or after creating `.env.e2e`:
//!   cargo test --manifest-path src-tauri/Cargo.toml --test router_live -- --nocapture

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use router_check::base::{
    fetch_router_data_inner, fetch_stations_inner, fetch_static_ips_inner, login_inner,
    logout_inner, reset_session, verify_login_status,
};
use router_check::{create_app_state, AppConfig, AppState};

/// Same command list as the React frontend `COMMANDS` in RouterStateContext.
const TELEMETRY_COMMANDS: &str = "modem_main_state,signalbar,network_type,network_provider,rssi,rscp,lte_rsrp,lte_rsrq,sinr,cell_id,Z_dl_earfcn,realtime_tx_bytes,realtime_rx_bytes,realtime_tx_thrpt,realtime_rx_thrpt,monthly_rx_bytes,monthly_tx_bytes,monthly_time,imei,msisdn,cr_version,wa_version,hardware_version,lan_ipaddr,mac_address,wan_ipaddr,ppp_status,wifi_access_sta_num,sms_unread_num,host_name_web,mac_addr_web,ip_addr_web,lan_netmask,dhcpEnabled,guest_dhcpEnabled,net_select";

const REQUIRED_KEYS: &[&str] = &["ROUTER_IP", "ROUTER_PASSWORD"];

struct LiveEnv {
    ip: String,
    password: String,
}

fn env_e2e_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join(".env.e2e")
}

/// Minimal `KEY=VALUE` parser (supports optional quotes; ignores blank/# lines).
fn parse_dotenv(contents: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for raw in contents.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        let mut value = value.trim().to_string();
        if (value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\''))
        {
            value = value[1..value.len() - 1].to_string();
        }
        if !key.is_empty() {
            map.insert(key.to_string(), value);
        }
    }
    map
}

/// Loads `.env.e2e`. Returns `None` after printing what is missing (test soft-skips).
fn live_env_from_file() -> Option<LiveEnv> {
    let path = env_e2e_path();
    if !path.is_file() {
        eprintln!("skip: missing env file at {}", path.display());
        eprintln!("  cp .env.e2e.example .env.e2e");
        eprintln!("  then set ROUTER_IP and ROUTER_PASSWORD (correct password only)");
        return None;
    }

    let contents = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("skip: could not read {}: {}", path.display(), e);
            return None;
        }
    };

    let map = parse_dotenv(&contents);
    let mut missing: Vec<&str> = Vec::new();
    for key in REQUIRED_KEYS {
        match map.get(*key) {
            Some(v) if !v.trim().is_empty() => {}
            _ => missing.push(*key),
        }
    }

    if !missing.is_empty() {
        eprintln!(
            "skip: {} is missing required key(s): {}",
            path.display(),
            missing.join(", ")
        );
        eprintln!("  edit the file and set those values (use the real router password)");
        return None;
    }

    Some(LiveEnv {
        ip: map.get("ROUTER_IP").unwrap().trim().to_string(),
        password: map.get("ROUTER_PASSWORD").unwrap().clone(),
    })
}

fn build_state(ip: &str, password: &str) -> AppState {
    let config = AppConfig {
        router_ip: ip.to_string(),
        router_password: password.to_string(),
        auto_refresh_interval: 2000,
        auto_refresh_on_startup: false,
        main_window_on_startup: "visible".to_string(),
        theme_mode: "system".to_string(),
    };
    create_app_state(config, PathBuf::from("/tmp/router-check-e2e-config.json"))
        .expect("failed to create AppState")
}

fn dump(label: &str, value: &serde_json::Value) {
    eprintln!(
        "\n=== {} ===\n{}\n",
        label,
        serde_json::to_string_pretty(value).unwrap_or_else(|_| format!("{:?}", value))
    );
}

async fn assert_router_reachable(state: &AppState) {
    let probe = fetch_router_data_inner(state, "hardware_version").await;
    match probe {
        Ok(v) => {
            dump("reachability probe (hardware_version)", &v);
        }
        Err(e) => {
            panic!(
                "Router at {} is unreachable: {}. Check ROUTER_IP in .env.e2e and LAN connectivity.",
                state
                    .config
                    .read()
                    .map(|c| c.router_ip.clone())
                    .unwrap_or_default(),
                e
            );
        }
    }
}

#[tokio::test]
async fn live_read_only_login_telemetry_logout() {
    let Some(env) = live_env_from_file() else {
        return;
    };

    eprintln!(
        "live e2e: using .env.e2e → ROUTER_IP={} (password not logged)",
        env.ip
    );

    let state = build_state(&env.ip, &env.password);
    assert_router_reachable(&state).await;

    // --- A: telemetry while logged out ---
    // MF286R still returns public fields (imei, network_type, ppp_status, …) when
    // unauthenticated; auth-gated fields like hardware_version / network_provider stay empty.
    reset_session(&state).expect("reset_session");
    let logged_out = fetch_router_data_inner(&state, TELEMETRY_COMMANDS)
        .await
        .expect("telemetry while logged out");
    dump("A: telemetry while logged out", &logged_out);
    let hw_empty = logged_out
        .get("hardware_version")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .is_empty();
    let provider_empty = logged_out
        .get("network_provider")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .is_empty();
    assert!(
        hw_empty || provider_empty,
        "expected empty hardware_version and/or network_provider when logged out, got: {}",
        logged_out
    );

    // --- B: login with password from .env.e2e (never try a wrong password — lockout) ---
    // Successful LOGIN_MULTI_USER returns _orig.result "0"; login_inner unwraps to
    // { "result": "0", "verified": true, "telemetry_ok": true } after hardware_version
    // confirm AND a post-login telemetry GET (hardware_version / network_provider).
    let good_login = login_inner(&state)
        .await
        .expect("login_inner with password from .env.e2e");
    dump("B: login_inner success (result 0 + verified + telemetry_ok)", &good_login);
    assert_eq!(
        good_login.get("result").and_then(|v| v.as_str()),
        Some("0"),
        "expected result \"0\" after successful login, got: {}",
        good_login
    );
    assert_eq!(
        good_login.get("verified").and_then(|v| v.as_bool()),
        Some(true),
        "expected verified:true after successful login, got: {}",
        good_login
    );
    assert_eq!(
        good_login.get("telemetry_ok").and_then(|v| v.as_bool()),
        Some(true),
        "expected telemetry_ok:true after successful login, got: {}",
        good_login
    );
    assert!(
        verify_login_status(&state)
            .await
            .expect("verify after good login"),
        "session should be active after successful login"
    );

    // --- C: post-login telemetry GET health check ---
    let telemetry = fetch_router_data_inner(&state, TELEMETRY_COMMANDS)
        .await
        .expect("telemetry while logged in");
    dump("C: telemetry while logged in (post-login GET health)", &telemetry);
    assert_ne!(
        telemetry.get("result").and_then(|v| v.as_str()),
        Some("not_login"),
        "should not be not_login after successful login"
    );
    let has_provider = telemetry
        .get("network_provider")
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    let has_hw = telemetry
        .get("hardware_version")
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    assert!(
        has_provider || has_hw,
        "post-login telemetry GET must expose network_provider or hardware_version, got: {}",
        telemetry
    );

    // --- D: stations + static IPs ---
    let stations = fetch_stations_inner(&state)
        .await
        .expect("fetch_stations");
    dump("D: stations", &stations);

    let static_ips = fetch_static_ips_inner(&state)
        .await
        .expect("fetch_static_ips");
    dump("D: static_ips", &static_ips);

    eprintln!(
        "station keys: {:?}",
        stations
            .as_object()
            .map(|o| o.keys().cloned().collect::<Vec<_>>())
    );
    eprintln!(
        "static_ip keys: {:?}",
        static_ips
            .as_object()
            .map(|o| o.keys().cloned().collect::<Vec<_>>())
    );

    // --- E: logout + confirm session gone ---
    let logout_result = logout_inner(&state).await.expect("logout_inner");
    dump("E: logout_inner (result + verified)", &logout_result);
    assert_eq!(
        logout_result.get("verified").and_then(|v| v.as_bool()),
        Some(true),
        "expected verified:true after logout, got: {}",
        logout_result
    );
    assert!(
        !verify_login_status(&state)
            .await
            .expect("verify after logout"),
        "session should be inactive after logout"
    );

    let after_logout = fetch_router_data_inner(&state, TELEMETRY_COMMANDS)
        .await
        .expect("telemetry after logout");
    dump("E: telemetry after logout", &after_logout);
    let hw_empty_after = after_logout
        .get("hardware_version")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .is_empty();
    assert!(
        hw_empty_after,
        "expected empty hardware_version after logout, got: {}",
        after_logout
    );
}
