import { invoke } from '@tauri-apps/api/core';

// --- Configuration ---
const COMMANDS = [
  "modem_main_state",
  "signalbar",
  "network_type",
  "network_provider",
  "rssi",
  "rscp",
  "lte_rsrp",
  "lte_rsrq",
  "sinr",
  "cell_id",
  "Z_dl_earfcn",
  "realtime_tx_bytes",
  "realtime_rx_bytes",
  "realtime_tx_thrpt",
  "realtime_rx_thrpt",
  "monthly_rx_bytes",
  "monthly_tx_bytes",
  "monthly_time",
  "imei",
  "msisdn",
  "cr_version",
  "wa_version",
  "hardware_version",
  "lan_ipaddr",
  "mac_address",
  "wan_ipaddr",
  "ppp_status",
  "wifi_access_sta_num",
  "sms_unread_num",
  "host_name_web",
  "mac_addr_web",
  "ip_addr_web",
  "lan_netmask",
  "dhcpEnabled",
  "guest_dhcpEnabled",
];

// --- UI Registry ---
const UI = {
  dot: document.querySelector(".status-dot"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  autoRefresh: document.getElementById("autoRefresh"),
  rsrpFill: document.getElementById("rsrpFill"),
  sinrFill: document.getElementById("sinrFill"),
  deviceTable: document.getElementById("deviceTableBody"),
  staticTable: document.getElementById("staticIpTableBody"),
  
  // Overlays
  bootstrapOverlay: document.getElementById("bootstrapOverlay"),
  bootstrapTitle: document.getElementById("bootstrapTitle"),
  bootstrapMessage: document.getElementById("bootstrapMessage"),
  bootstrapActions: document.getElementById("bootstrapActions"),
  bootstrapRetryBtn: document.getElementById("bootstrapRetryBtn"),
  bootstrapSettingsBtn: document.getElementById("bootstrapSettingsBtn"),
  
  settingsOverlay: document.getElementById("settingsOverlay"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsIp: document.getElementById("settingsIp"),
  settingsPassword: document.getElementById("settingsPassword"),
  settingsSaveBtn: document.getElementById("settingsSaveBtn"),
  settingsCancelBtn: document.getElementById("settingsCancelBtn"),
  
  fields: [], // Populated on init
};

let autoRefreshTimeout = null;
let isRefreshing = false;
let currentRouterIp = "192.168.0.1";

// --- Utilities ---
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return `0 <small class="unit">B</small>`;
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${val} <small class="unit">${sizes[i]}</small>`;
}

function formatSpeed(bps) {
  if (!bps || isNaN(bps)) return `0 <small class="unit">bps</small>`;
  if (bps < 1000) return `${bps} <small class="unit">bps</small>`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(2)} <small class="unit">Kbps</small>`;
  return `${(bps / 1000000).toFixed(2)} <small class="unit">Mbps</small>`;
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "--";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// --- Toast System ---
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
      <span>${message}</span>
      <span style="margin-left: 10px; cursor: pointer; opacity: 0.7;" class="toast-close">✕</span>
  `;

  // Manual close listener
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto-remove toast after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// --- Data Binding Logic ---
function applyDataToUI(data) {
  UI.fields.forEach((el) => {
    const field = el.dataset.field;
    const format = el.dataset.format;
    let value = data && data[field] !== undefined ? data[field] : "--";

    // Specialized Formatting
    if (data && data[field] !== undefined && format) {
      const num = parseFloat(value);
      switch (format) {
        case "bytes":
          value = formatBytes(num);
          break;
        case "speed":
          value = formatSpeed(num);
          break;
        case "time":
          value = formatTime(num);
          break;
        case "rsrp":
          value = `${num} <small class="unit">dBm</small>`;
          break;
        case "sinr":
          value = `${num} <small class="unit">dB</small>`;
          break;
        case "dhcp":
          value = value === "1" ? "Enabled" : "Disabled";
          break;
      }
    }

    const isHtml = format === "html" || format === "speed" || format === "bytes" || format === "rsrp" || format === "sinr";
    if (isHtml) el.innerHTML = value;
    else el.innerText = value;
  });
}

// --- API Calls using Tauri IPC ---
async function fnCall(command, args = {}) {
  const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
  if (isTauri) {
    try {
      return await invoke(command, args);
    } catch (e) {
      console.error(`Tauri command ${command} failed:`, e);
      throw e;
    }
  } else {
    console.warn(`Tauri environment not detected. Mocking command: ${command}`);
    return mockCall(command, args);
  }
}

// Mock responses for web-based development/debugging
function mockCall(command, args) {
  if (command === "get_config") {
    return { router_ip: "192.168.0.1", router_password: "mock_password" };
  }
  if (command === "save_config") {
    return null;
  }
  if (command === "login") {
    return { result: "0" };
  }
  if (command === "fetch_router_data") {
    return {
      lte_rsrp: "-85",
      sinr: "12.4",
      cell_id: "49201",
      Z_dl_earfcn: "1600",
      monthly_rx_bytes: "12894819481",
      monthly_tx_bytes: "1948184918",
      monthly_time: "482010",
      network_provider: "Mock Operator",
      network_type: "LTE/4G",
      realtime_rx_thrpt: "2848184",
      realtime_tx_thrpt: "482910",
      wan_ipaddr: "100.82.91.24",
      ppp_status: "connected",
      lan_ipaddr: "192.168.0.1",
      lan_netmask: "255.255.255.0",
      dhcpEnabled: "1",
      mac_address: "AA:BB:CC:DD:EE:FF",
      imei: "359184918491849",
      cr_version: "V1.0.0B02",
      hardware_version: "ZTE-T9",
      msisdn: "+905555555555",
      sms_unread_num: "2",
      wifi_access_sta_num: "5"
    };
  }
  if (command === "fetch_stations") {
    return {
      station_list: [
        { hostname: "MacBook Pro", ip_addr: "192.168.0.100", mac_addr: "11:22:33:44:55:66" },
        { hostname: "iPhone 15", ip_addr: "192.168.0.101", mac_addr: "77:88:99:AA:BB:CC" }
      ]
    };
  }
  if (command === "fetch_static_ips") {
    return {
      current_static_addr_list: [
        { hostname: "Home Server", ip: "192.168.0.10", mac: "11:22:33:44:55:00" }
      ]
    };
  }
  return {};
}

// --- Connection Sequence ---
async function refresh() {
  if (isRefreshing) return;
  isRefreshing = true;

  const isAuto = UI.autoRefresh.checked;
  if (!isAuto) UI.refreshBtn.disabled = true;

  try {
    let data = await fnCall("fetch_router_data", { commands: COMMANDS.join(",") });
    
    // Check if we need to login
    if (!data || data.result === "not_login" || !data.network_provider) {
      console.log("🔑 Router returned not_login. Attempting login...");
      const loginResult = await fnCall("login");
      if (loginResult && (loginResult.result === "0" || loginResult.result === "ok")) {
        // Try fetching again
        data = await fnCall("fetch_router_data", { commands: COMMANDS.join(",") });
      } else {
        throw new Error("Login failed");
      }
    }

    if (!data || data.result === "not_login") {
      throw new Error("Could not authenticate with router");
    }

    const stationData = await fnCall("fetch_stations").catch(() => null);
    const staticData = await fnCall("fetch_static_ips").catch(() => null);

    updateUI(data, stationData, staticData, true);
    
    // Successfully connected: hide bootstrap overlay if active
    if (UI.bootstrapOverlay.classList.contains("active")) {
      UI.bootstrapOverlay.classList.remove("active");
    }
  } catch (e) {
    console.error("Refresh failed:", e);
    updateUI(null, null, null, false);
    
    // Show error in bootstrap screen
    UI.bootstrapTitle.innerText = "CONNECTION FAILURE";
    UI.bootstrapMessage.innerHTML = `<span style="color: var(--danger); font-weight: 600;">Could not connect to router at ${currentRouterIp}. Check settings or password.</span>`;
    UI.bootstrapActions.style.display = "flex";
  } finally {
    if (!isAuto) UI.refreshBtn.disabled = false;
    isRefreshing = false;
  }
}

function clearUI(message) {
  UI.dot.className = "status-dot";
  
  const emptyData = {
    connectionStatusText: message,
    rsrpGrade: "--",
    sinrGrade: "--",
    sms_unread_num: "0",
    wifi_access_sta_num: "0",
    deviceCount: "0",
  };

  applyDataToUI(emptyData);

  UI.rsrpFill.style.width = "0%";
  UI.sinrFill.style.width = "0%";

  UI.staticTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No static reservations</td></tr>';
  UI.deviceTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No devices detected</td></tr>';

  UI.loginBtn.style.display = "block";
  UI.logoutBtn.style.display = "none";
  UI.loginBtn.disabled = false;

  Object.values(TRENDS).forEach((t) => t.clear());
}

function updateUI(data, stationData, staticData, connected) {
  if (!connected || !data) {
    clearUI("Disconnected");
    return;
  }

  // 1. Compute values for layout
  if (data.realtime_rx_thrpt) data.realtime_rx_thrpt = parseFloat(data.realtime_rx_thrpt) * 8;
  if (data.realtime_tx_thrpt) data.realtime_tx_thrpt = parseFloat(data.realtime_tx_thrpt) * 8;

  const now = new Date();
  data.lastUpdate = "UPDATED: " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  data.connectionStatusText = "Connected";
  data.cr_version = data.cr_version || data.wa_version || "--";
  data.lan_ipaddr = data.lan_ipaddr || data.ip_addr_web || "--";

  data.monthly_usage = (parseInt(data.monthly_rx_bytes) || 0) + (parseInt(data.monthly_tx_bytes) || 0);
  data.total_data = (parseInt(data.realtime_rx_bytes) || 0) + (parseInt(data.realtime_tx_bytes) || 0);

  const rsrp = parseInt(data.lte_rsrp) || 0;
  const sinr = parseFloat(data.sinr) || 0;

  const getGrade = (val, thresholds) => {
    if (val >= thresholds.excellent) return `<span style="color: var(--success); text-shadow: 0 0 10px var(--success-glow);">Excellent</span>`;
    if (val >= thresholds.good) return `<span style="color: var(--accent-primary); text-shadow: 0 0 10px var(--accent-primary-glow);">Good</span>`;
    if (val >= thresholds.fair) return `<span style="color: var(--warning);">Fair</span>`;
    return `<span style="color: var(--danger); text-shadow: 0 0 10px var(--danger-glow);">Poor</span>`;
  };

  data.rsrpGrade = getGrade(rsrp, { excellent: -80, good: -90, fair: -105 });
  data.sinrGrade = getGrade(sinr, { excellent: 15, good: 10, fair: 5 });

  const stations = stationData?.station_list || [];
  data.deviceCount = stations.length;

  // 2. Apply
  applyDataToUI(data);

  // 3. Status updates
  UI.dot.className = "status-dot online";
  UI.loginBtn.style.display = "none";
  UI.logoutBtn.style.display = "block";
  UI.logoutBtn.disabled = false;

  // Update Sparklines
  TRENDS.rsrp.addPoint(rsrp);
  TRENDS.sinr.addPoint(sinr);
  TRENDS.dl.addPoint(data.realtime_rx_thrpt);
  TRENDS.ul.addPoint(data.realtime_tx_thrpt);

  // Signal meters
  const rsrpPct = Math.min(Math.max(((rsrp + 120) / 60) * 100, 0), 100);
  const sinrPct = Math.min(Math.max((sinr / 20) * 100, 0), 100);
  UI.rsrpFill.style.width = rsrpPct + "%";
  UI.sinrFill.style.width = sinrPct + "%";

  // Static IP Table
  const staticList = staticData?.current_static_addr_list || [];
  if (staticList.length > 0) {
    UI.staticTable.innerHTML = staticList
      .map(
        (s) => `
            <tr>
                <td>${s.hostname || "--"}</td>
                <td>${s.ip}</td>
                <td>${s.mac}</td>
            </tr>
        `,
      )
      .join("");
  } else {
    UI.staticTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No static reservations</td></tr>';
  }

  // Connected Devices Table
  if (stations.length > 0) {
    UI.deviceTable.innerHTML = stations
      .map(
        (s) => `
            <tr>
                <td>${s.hostname && s.hostname !== "--" ? s.hostname : '<span style="color: var(--text-dim);">Unknown Device</span>'}</td>
                <td>${s.ip_addr}</td>
                <td>${s.mac_addr}</td>
            </tr>
        `,
      )
      .join("");
  } else {
    UI.deviceTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No devices detected</td></tr>';
  }
}

// --- Trend Manager for SVG Sparklines ---
class TrendManager {
  constructor(elementId, options = {}) {
    this.element = document.getElementById(elementId);
    this.points = [];
    this.maxPoints = options.maxPoints || 50;
    this.formatter = options.formatter || ((v) => v.toFixed(1));
    this.stats = {
      min: document.getElementById(options.minId),
      max: document.getElementById(options.maxId),
      avg: document.getElementById(options.avgId),
    };
  }

  addPoint(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    this.points.push(num);
    if (this.points.length > this.maxPoints) this.points.shift();
    this.draw();
    this.updateStats();
  }

  clear() {
    this.points = [];
    if (this.element) {
      this.element.setAttribute("d", "");
    }
    this.updateStats();
  }

  updateStats() {
    if (this.points.length === 0) {
      if (this.stats.min) this.stats.min.innerText = "--";
      if (this.stats.max) this.stats.max.innerText = "--";
      if (this.stats.avg) this.stats.avg.innerText = "--";
      return;
    }

    const min = Math.min(...this.points);
    const max = Math.max(...this.points);
    const avg = this.points.reduce((a, b) => a + b, 0) / this.points.length;

    if (this.stats.min) this.stats.min.innerHTML = this.formatter(min);
    if (this.stats.max) this.stats.max.innerHTML = this.formatter(max);
    if (this.stats.avg) this.stats.avg.innerHTML = this.formatter(avg);
  }

  draw() {
    if (!this.element || this.points.length < 2) return;

    const svg = this.element.closest("svg");
    const width = svg.clientWidth || 150;
    const height = svg.clientHeight || 40;

    const min = Math.min(...this.points);
    const max = Math.max(...this.points);
    const range = max - min || 1;

    const pathData = this.points
      .map((p, i) => {
        const x = (i / (this.maxPoints - 1)) * width;
        const y = height - ((p - min) / range) * (height - 8) - 4;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    this.element.setAttribute("d", pathData);
  }
}

const TRENDS = {
  rsrp: new TrendManager("rsrpSpark", {
    minId: "rsrpMin",
    maxId: "rsrpMax",
    avgId: "rsrpAvg",
    formatter: (v) => `${v.toFixed(0)} <small class="unit">dBm</small>`,
  }),
  sinr: new TrendManager("sinrSpark", {
    minId: "sinrMin",
    maxId: "sinrMax",
    avgId: "sinrAvg",
    formatter: (v) => `${v.toFixed(1)} <small class="unit">dB</small>`,
  }),
  dl: new TrendManager("dlSpark", {
    minId: "dlMin",
    maxId: "dlMax",
    avgId: "dlAvg",
    formatter: formatSpeed,
  }),
  ul: new TrendManager("ulSpark", {
    minId: "ulMin",
    maxId: "ulMax",
    avgId: "ulAvg",
    formatter: formatSpeed,
  }),
};

// --- Polling Queue Manager (recursive setTimeout) ---
async function startPollingLoop() {
  if (autoRefreshTimeout) {
    clearTimeout(autoRefreshTimeout);
  }

  const poll = async () => {
    if (UI.autoRefresh.checked) {
      await refresh();
      autoRefreshTimeout = setTimeout(poll, 2000);
    }
  };

  await poll();
}

function stopPollingLoop() {
  if (autoRefreshTimeout) {
    clearTimeout(autoRefreshTimeout);
    autoRefreshTimeout = null;
  }
}

// --- Initialization & Event Listeners ---
async function init() {
  UI.fields = document.querySelectorAll("[data-field]");

  // Load config from backend
  try {
    const config = await fnCall("get_config");
    if (config) {
      currentRouterIp = config.router_ip;
      UI.settingsIp.value = config.router_ip;
      UI.settingsPassword.value = config.router_password;
    }
  } catch (e) {
    console.error("Failed to load config from backend:", e);
  }

  // Refresh
  UI.refreshBtn.addEventListener("click", refresh);

  // Auto-refresh checkbox
  UI.autoRefresh.addEventListener("change", (e) => {
    if (e.target.checked) {
      startPollingLoop();
    } else {
      stopPollingLoop();
    }
  });

  // Login button
  UI.loginBtn.addEventListener("click", async () => {
    UI.loginBtn.innerText = "LOGGING IN...";
    UI.loginBtn.disabled = true;
    try {
      const result = await fnCall("login");
      const success = result && (result.result === "0" || result.result === "ok");
      UI.loginBtn.innerText = success ? "LOGGED IN" : "FAILED";
      if (success) {
        showToast("Logged in successfully!", "success");
        setTimeout(refresh, 500);
      } else {
        showToast("Login failed.", "error");
      }
    } catch {
      UI.loginBtn.innerText = "FAILED";
      showToast("An error occurred during login.", "error");
    } finally {
      setTimeout(() => {
        UI.loginBtn.innerText = "LOGIN";
        UI.loginBtn.disabled = false;
      }, 2000);
    }
  });

  // Logout button
  UI.logoutBtn.addEventListener("click", async () => {
    UI.logoutBtn.innerText = "LOGGING OUT...";
    UI.logoutBtn.disabled = true;
    try {
      await fnCall("logout");
      UI.logoutBtn.innerText = "LOGGED OUT";
      showToast("Logged out successfully.", "info");
      updateUI(null, null, null, false);
    } catch {
      UI.logoutBtn.innerText = "FAILED";
      showToast("An error occurred during logout.", "error");
    } finally {
      setTimeout(() => {
        UI.logoutBtn.innerText = "LOGOUT";
        UI.logoutBtn.disabled = false;
      }, 2000);
    }
  });

  // Settings Actions
  UI.settingsBtn.addEventListener("click", () => {
    UI.settingsOverlay.classList.add("active");
  });

  UI.settingsCancelBtn.addEventListener("click", () => {
    UI.settingsOverlay.classList.remove("active");
  });

  UI.settingsSaveBtn.addEventListener("click", async () => {
    const ip = UI.settingsIp.value.trim();
    const password = UI.settingsPassword.value.trim();
    
    if (!ip) {
      showToast("Router IP cannot be empty.", "error");
      return;
    }

    UI.settingsSaveBtn.innerText = "SAVING...";
    UI.settingsSaveBtn.disabled = true;

    try {
      await fnCall("save_config", { config: { router_ip: ip, router_password: password } });
      currentRouterIp = ip;
      
      // Close overlay
      UI.settingsOverlay.classList.remove("active");
      showToast("Configuration saved!", "success");
      
      // Trigger a clean reconnection
      clearUI("Reconnecting...");
      UI.bootstrapTitle.innerText = "INITIALIZING CONNECTION";
      UI.bootstrapMessage.innerText = `Connecting to router at ${ip}...`;
      UI.bootstrapActions.style.display = "none";
      UI.bootstrapOverlay.classList.add("active");
      
      setTimeout(refresh, 500);
    } catch (e) {
      showToast(`Failed to save settings: ${e}`, "error");
    } finally {
      UI.settingsSaveBtn.innerText = "SAVE CHANGES";
      UI.settingsSaveBtn.disabled = false;
    }
  });

  // Bootstrap overlay Actions
  UI.bootstrapRetryBtn.addEventListener("click", () => {
    UI.bootstrapActions.style.display = "none";
    UI.bootstrapTitle.innerText = "INITIALIZING CONNECTION";
    UI.bootstrapMessage.innerText = "Reconnecting to router...";
    setTimeout(refresh, 200);
  });

  UI.bootstrapSettingsBtn.addEventListener("click", () => {
    UI.settingsOverlay.classList.add("active");
  });

  // Default to Auto-Refresh ON
  UI.autoRefresh.checked = true;
  await startPollingLoop();
  
  // Start connection check
  setTimeout(refresh, 200);
}

document.addEventListener("DOMContentLoaded", init);
