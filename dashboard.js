// --- Configuration ---
// All requests go through the local proxy server to avoid CORS issues.
// The proxy handles authentication and forwards requests to the router.
const COMMANDS = [
    "modem_main_state", "signalbar", "network_type", "network_provider",
    "rssi", "rscp", "lte_rsrp", "lte_rsrq", "sinr", "cell_id", "Z_dl_earfcn",
    "realtime_tx_bytes", "realtime_rx_bytes", "realtime_tx_thrpt", 
    "realtime_rx_thrpt", "monthly_rx_bytes", "monthly_tx_bytes", "monthly_time",
    "imei", "msisdn", "cr_version", "wa_version", "hardware_version",
    "lan_ipaddr", "mac_address", "wan_ipaddr", "ppp_status",
    "battery_pers", "battery_charging", "wifi_access_sta_num",
    "sms_unread_num",
    "host_name_web", "mac_addr_web", "ip_addr_web", "lan_netmask", 
    "dhcpEnabled", "guest_dhcpEnabled"
];

// --- Utilities ---
function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bps) {
    if (!bps || isNaN(bps)) return "0 bps";
    if (bps < 1000) return bps + " bps";
    if (bps < 1000000) return (bps/1000).toFixed(2) + " Kbps";
    return (bps/1000000).toFixed(2) + " Mbps";
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "--";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

// --- API Logic (through local proxy) ---
async function login() {
    try {
        const response = await fetch('/api/login');
        const result = await response.json();
        console.log("Login result:", result);
        return result.result === "0" || result.result === "ok";
    } catch (e) {
        console.error("Login failed:", e);
        return false;
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout');
        const result = await response.json();
        console.log("Logout result:", result);
        return result.result === "0" || result.result === "ok";
    } catch (e) {
        console.error("Logout failed:", e);
        return false;
    }
}

async function fetchRouterData() {
    try {
        const params = new URLSearchParams({
            cmd: COMMANDS.join(",")
        });
        const response = await fetch(`/api/data?${params}`);
        return await response.json();
    } catch (e) {
        console.error("Fetch failed:", e);
        return null;
    }
}

async function fetchStationList() {
    try {
        const response = await fetch('/api/stations');
        return await response.json();
    } catch (e) {
        return null;
    }
}

async function fetchStaticIpList() {
    try {
        const response = await fetch('/api/static_ips');
        return await response.json();
    } catch (e) {
        return null;
    }
}

// --- UI Update ---
function clearUI(message) {
    const dot = document.querySelector('.status-dot');
    const statusSpan = document.getElementById('connectionStatus').querySelector('span');
    
    dot.className = 'status-dot';
    statusSpan.innerText = message;

    // Signal
    document.getElementById('rsrpValue').innerText = "--";
    document.getElementById('sinrValue').innerText = "--";
    document.getElementById('rsrpFill').style.width = "0%";
    document.getElementById('sinrFill').style.width = "0%";
    document.getElementById('cellId').innerText = "--";
    document.getElementById('signalAnalysis').innerHTML = "No active session";

    // Info
    document.getElementById('provider').innerText = "--";
    document.getElementById('netType').innerText = "--";

    // Usage
    document.getElementById('monthlyUsage').innerText = "--";
    document.getElementById('monthlyTime').innerText = "--";
    document.getElementById('monthlyDl').innerText = "--";
    document.getElementById('monthlyUl').innerText = "--";

    // Speeds
    document.getElementById('dlSpeed').innerText = "--";
    document.getElementById('ulSpeed').innerText = "--";
    document.getElementById('totalData').innerText = "--";

    // System Details
    document.getElementById('imei').innerText = "--";
    document.getElementById('firmware').innerText = "--";
    document.getElementById('hardware').innerText = "--";
    document.getElementById('msisdn').innerText = "--";

    // Network & LAN
    document.getElementById('wanIp').innerText = "--";
    document.getElementById('pppStatus').innerText = "--";
    document.getElementById('lanIp').innerText = "--";
    document.getElementById('lanNetmask').innerText = "--";
    document.getElementById('dhcpState').innerText = "--";
    document.getElementById('mac').innerText = "--";
    document.getElementById('staticIpTableBody').innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No static reservations</td></tr>';

    // Battery & Misc
    document.getElementById('smsCount').innerText = "0";
    document.getElementById('wifiCount').innerText = "0";

    // Stations
    document.getElementById('deviceTableBody').innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No devices detected</td></tr>';
    document.getElementById('deviceCount').innerText = "0";

    // Button Visibility
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('loginBtn').disabled = false;
}

function updateUI(data, stationData, staticData, loginSuccess) {
    // Update timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('lastUpdate').innerText = `UPDATED: ${timeStr}`;

    if (!loginSuccess) {
        clearUI("Disconnected / No SIM");
        return;
    }

    if (!data) {
        clearUI("No Data");
        return;
    }

    const dot = document.querySelector('.status-dot');
    const statusSpan = document.getElementById('connectionStatus').querySelector('span');

    dot.className = 'status-dot online';
    statusSpan.innerText = "Connected";

    // Button Visibility
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('logoutBtn').disabled = false;

    // Signal
    const rsrp = parseInt(data.lte_rsrp) || 0;
    const sinr = parseFloat(data.sinr) || 0;
    document.getElementById('rsrpValue').innerText = rsrp + " dBm";
    document.getElementById('sinrValue').innerText = sinr + " dB";

    // Signal Bars (Percentage calculation for UI)
    const rsrpPct = Math.min(Math.max((rsrp + 120) / 60 * 100, 0), 100);
    const sinrPct = Math.min(Math.max(sinr / 20 * 100, 0), 100);
    document.getElementById('rsrpFill').style.width = rsrpPct + "%";
    document.getElementById('sinrFill').style.width = sinrPct + "%";

    // Signal Analysis
    let analysis = `RSRP: ${rsrp >= -80 ? 'Excellent' : rsrp >= -100 ? 'Fair' : 'Poor'}<br>`;
    analysis += `SINR: ${sinr >= 13 ? 'Excellent' : sinr >= 5 ? 'Good' : 'Fair'}`;
    if (sinr < 5) analysis += `<div class="tip">Interference detected! Try rotating the router.</div>`;
    document.getElementById('signalAnalysis').innerHTML = analysis;

    // Info
    document.getElementById('provider').innerText = data.network_provider || "--";
    document.getElementById('netType').innerText = data.network_type || "--";

    // Usage
    const mDl = parseInt(data.monthly_rx_bytes) || 0;
    const mUl = parseInt(data.monthly_tx_bytes) || 0;
    document.getElementById('monthlyUsage').innerText = formatBytes(mDl + mUl);
    document.getElementById('monthlyTime').innerText = "Uptime: " + formatTime(parseInt(data.monthly_time));
    document.getElementById('monthlyDl').innerText = formatBytes(mDl);
    document.getElementById('monthlyUl').innerText = formatBytes(mUl);

    // Speeds
    document.getElementById('dlSpeed').innerText = formatSpeed(parseInt(data.realtime_rx_thrpt));
    document.getElementById('ulSpeed').innerText = formatSpeed(parseInt(data.realtime_tx_thrpt));
    document.getElementById('totalData').innerText = formatBytes(parseInt(data.realtime_rx_bytes) + parseInt(data.realtime_tx_bytes));

    // System Details
    document.getElementById('imei').innerText = data.imei || "--";
    document.getElementById('firmware').innerText = data.cr_version || data.wa_version || "--";
    document.getElementById('hardware').innerText = data.hardware_version || "--";
    document.getElementById('msisdn').innerText = data.msisdn || "--";

    // Network & LAN Details
    document.getElementById('wanIp').innerText = data.wan_ipaddr || "--";
    document.getElementById('pppStatus').innerText = data.ppp_status || "--";
    document.getElementById('lanIp').innerText = data.lan_ipaddr || data.ip_addr_web || "--";
    document.getElementById('lanNetmask').innerText = data.lan_netmask || "--";
    document.getElementById('dhcpState').innerText = data.dhcpEnabled === "1" ? "Enabled" : "Disabled";
    document.getElementById('mac').innerText = data.mac_address || "--";

    // Static IP Reservations
    const staticList = staticData?.current_static_addr_list || [];
    const staticBody = document.getElementById('staticIpTableBody');
    if (staticList.length > 0) {
        staticBody.innerHTML = staticList.map(s => `
            <tr>
                <td>${s.hostname || '--'}</td>
                <td>${s.ip}</td>
                <td>${s.mac}</td>
            </tr>
        `).join('');
    } else {
        staticBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No static reservations</td></tr>';
    }

    // System Stats
    document.getElementById('smsCount').innerText = data.sms_unread_num || "0";
    document.getElementById('cellId').innerText = data.cell_id || "--";
    document.getElementById('wifiCount').innerText = data.wifi_access_sta_num || "0";

    // Stations
    const body = document.getElementById('deviceTableBody');
    const stations = stationData?.station_list || [];
    document.getElementById('deviceCount').innerText = stations.length;
    
    if (stations.length > 0) {
        body.innerHTML = stations.map(s => `
            <tr>
                <td>${(s.hostname && s.hostname !== "--") ? s.hostname : '<span style="color: var(--text-dim);">Unknown Device</span>'}</td>
                <td>${s.ip_addr}</td>
                <td>${s.mac_addr}</td>
            </tr>
        `).join('');
    } else {
        body.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No devices detected</td></tr>';
    }
}

let refreshInterval = null;

async function refresh() {
    const btn = document.getElementById('refreshBtn');
    const isAuto = document.getElementById('autoRefresh').checked;
    
    if (!isAuto) {
        btn.disabled = true;
        // btn.innerText = "REFRESHING...";
    }

    // Step 1: Fetch Data via proxy
    let data = await fetchRouterData();
    let stationData = await fetchStationList();
    let staticData = await fetchStaticIpList();
    
    console.log("Fetched Data:", data);
    
    // Using network_provider as a probe for login & SIM status
    let loginSuccess = data && data.network_provider && data.network_provider.trim() !== "";
    
    // If probe fails, try auto-login once
    if (!loginSuccess) {
        console.log("Probe failed, attempting auto-login...");
        const autoLoginResult = await login();
        if (autoLoginResult) {
            // Retry fetching data
            data = await fetchRouterData();
            stationData = await fetchStationList();
            staticData = await fetchStaticIpList();
            loginSuccess = data && data.network_provider && data.network_provider.trim() !== "";
        }
    }
    
    updateUI(data, stationData, staticData, loginSuccess);

    if (!isAuto) {
        btn.disabled = false;
        // btn.innerText = "REFRESH";
    }
}

document.getElementById('refreshBtn').addEventListener('click', refresh);

document.getElementById('loginBtn').addEventListener('click', async () => {
    const btn = document.getElementById('loginBtn');
    btn.innerText = "LOGGING IN...";
    btn.disabled = true;
    
    const success = await login();
    
    btn.innerText = success ? "LOGGED IN" : "FAILED";
    setTimeout(() => {
        btn.innerText = "LOGIN";
        btn.disabled = false;
    }, 2000);
    
    if (success) refresh();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    const btn = document.getElementById('logoutBtn');
    btn.innerText = "LOGGING OUT...";
    btn.disabled = true;
    
    const success = await logout();
    btn.disabled = false
    btn.innerText = success ? "LOGOUT" : "FAILED";
    
    // Turn off auto refresh on logout
    const autoRefresh = document.getElementById('autoRefresh');
    if (autoRefresh.checked) {
        autoRefresh.checked = false;
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    }

    // After logout, refresh will show Auth Required
    updateUI(null, null, false);
    
});

document.getElementById('autoRefresh').addEventListener('change', (e) => {
    if (e.target.checked) {
        refreshInterval = setInterval(refresh, 1000); // Auto refresh every 5 seconds
        refresh();
    } else {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    }
});

document.getElementById('stopServerBtn').addEventListener('click', async () => {
    if (!confirm("Are you sure you want to stop the local proxy server?")) return;
    
    const btn = document.getElementById('stopServerBtn');
    btn.innerText = "STOPPING...";
    btn.disabled = true;
    
    try {
        await fetch('/api/stop');
        document.body.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: white; font-family: sans-serif;">
                <h1 style="color: #ff5555;">Server Stopped</h1>
                <p style="color: #94a3b8;">The local proxy has been shut down. You can close this tab.</p>
            </div>
        `;
    } catch (e) {
        console.error("Stop failed:", e);
    }
});

// Initial Load
refresh();
