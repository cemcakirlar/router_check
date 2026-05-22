// --- Configuration ---
// All requests go through the local proxy server to avoid CORS issues.
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
// Elements that need specialized handling or frequent access
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
  fields: [], // Will be populated on init
};

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
          value = `${num} <small style="font-size: 0.5em; opacity: 0.7; font-weight: 400;">dBm</small>`;
          break;
        case "sinr":
          value = `${num} <small style="font-size: 0.5em; opacity: 0.7; font-weight: 400;">dB</small>`;
          break;
        case "dhcp":
          value = value === "1" ? "Enabled" : "Disabled";
          break;
      }
    }

    // Update the element
    const isHtml = format === "html" || format === "speed" || format === "bytes" || format === "rsrp" || format === "sinr";
    if (isHtml) el.innerHTML = value;
    else el.innerText = value;
  });
}

// --- API Logic (through local proxy) ---
async function login() {
  try {
    const response = await fetch("/api/login");
    const result = await response.json();
    return result.result === "0" || result.result === "ok";
  } catch (e) {
    console.error("Login failed:", e);
    return false;
  }
}

async function logout() {
  if (UI.autoRefresh && UI.autoRefresh.checked) {
    UI.autoRefresh.checked = false;
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = null;
  }

  try {
    const response = await fetch("/api/logout");
    const result = await response.json();
    return result.result === "0" || result.result === "ok";
  } catch (e) {
    console.error("Logout failed:", e);
    return false;
  }
}

async function fetchRouterData() {
  try {
    const params = new URLSearchParams({ cmd: COMMANDS.join(",") });
    const response = await fetch(`/api/data?${params}`);
    return await response.json();
  } catch (e) {
    console.error("Fetch failed:", e);
    return null;
  }
}

async function fetchStationList() {
  try {
    const response = await fetch("/api/stations");
    return await response.json();
  } catch (e) {
    return null;
  }
}

async function fetchStaticIpList() {
  try {
    const response = await fetch("/api/static_ips");
    return await response.json();
  } catch (e) {
    return null;
  }
}

// --- UI Logic ---
function clearUI(message) {
  UI.dot.className = "status-dot";

  // Create a "null" data object for the mapper to clear fields
  const emptyData = {
    connectionStatusText: message,
    rsrpGrade: "--",
    sinrGrade: "--",
    sms_unread_num: "0",
    wifi_access_sta_num: "0",
    deviceCount: "0",
  };

  applyDataToUI(emptyData);

  // Reset visual bars
  UI.rsrpFill.style.width = "0%";
  UI.sinrFill.style.width = "0%";

  // Reset tables
  UI.staticTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No static reservations</td></tr>';
  UI.deviceTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim);">No devices detected</td></tr>';

  // Buttons
  UI.loginBtn.style.display = "block";
  UI.logoutBtn.style.display = "none";
  UI.loginBtn.disabled = false;
  
  // Reset Trendlines
  Object.values(TRENDS).forEach(t => t.clear());
}

function updateUI(data, stationData, staticData, loginSuccess) {
  if (!loginSuccess || !data) {
    clearUI(!loginSuccess ? "Disconnected / No SIM" : "No Data");
    return;
  }

  // 1. Prepare computed fields for the mapper
  // Fix: ZTE throughput is reported in Bytes/s. Convert to bits/s for standard speed display.
  if (data.realtime_rx_thrpt) data.realtime_rx_thrpt = parseFloat(data.realtime_rx_thrpt) * 8;
  if (data.realtime_tx_thrpt) data.realtime_tx_thrpt = parseFloat(data.realtime_tx_thrpt) * 8;

  const now = new Date();
  data.lastUpdate = "UPDATED: " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  data.connectionStatusText = "Connected";
  // Fallbacks
  data.cr_version = data.cr_version || data.wa_version || "--";
  data.lan_ipaddr = data.lan_ipaddr || data.ip_addr_web || "--";

  // Usage sums
  data.monthly_usage = (parseInt(data.monthly_rx_bytes) || 0) + (parseInt(data.monthly_tx_bytes) || 0);
  data.total_data = (parseInt(data.realtime_rx_bytes) || 0) + (parseInt(data.realtime_tx_bytes) || 0);

  // Signal Analysis
  const rsrp = parseInt(data.lte_rsrp) || 0;
  const sinr = parseFloat(data.sinr) || 0;

  const getGrade = (val, thresholds) => {
    if (val >= thresholds.excellent) return `<span style="color: var(--success); font-weight: 700;">Excellent</span>`;
    if (val >= thresholds.good) return `<span style="color: var(--accent-primary); font-weight: 700;">Good</span>`;
    if (val >= thresholds.fair) return `<span style="color: var(--warning); font-weight: 700;">Fair</span>`;
    return `<span style="color: var(--danger); font-weight: 700;">Poor</span>`;
  };

  const rsrpGrade = getGrade(rsrp, { excellent: -80, good: -90, fair: -105 });
  const sinrGrade = getGrade(sinr, { excellent: 15, good: 10, fair: 5 });

  data.rsrpGrade = rsrpGrade;
  data.sinrGrade = sinrGrade;

  // Station count
  const stations = stationData?.station_list || [];
  data.deviceCount = stations.length;

  // 2. Run the automated mapper
  applyDataToUI(data);

  // 3. Specialized handling for non-text elements
  UI.dot.className = "status-dot online";
  UI.loginBtn.style.display = "none";
  UI.logoutBtn.style.display = "block";
  UI.logoutBtn.disabled = false;

  // Update Sparklines
  TRENDS.rsrp.addPoint(rsrp);
  TRENDS.sinr.addPoint(sinr);
  TRENDS.dl.addPoint(data.realtime_rx_thrpt);
  TRENDS.ul.addPoint(data.realtime_tx_thrpt);

  // Signal Bars
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

  // Device Table
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

let refreshInterval = null;

async function refresh() {
  const isAuto = UI.autoRefresh.checked;
  if (!isAuto) UI.refreshBtn.disabled = true;

  let data = await fetchRouterData();
  let stationData = await fetchStationList();
  let staticData = await fetchStaticIpList();

  // Probe for login status
  let loginSuccess = data && data.network_provider && data.network_provider.trim() !== "";

  if (!loginSuccess) {
    const autoLoginResult = await login();
    if (autoLoginResult) {
      data = await fetchRouterData();
      stationData = await fetchStationList();
      staticData = await fetchStaticIpList();
      loginSuccess = data && data.network_provider && data.network_provider.trim() !== "";
    }
  }

  updateUI(data, stationData, staticData, loginSuccess);
  if (!isAuto) UI.refreshBtn.disabled = false;
}

// --- Trend Manager for Sparklines ---
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

    // Use parent SVG size or fallback
    const svg = this.element.closest("svg");
    const width = svg.clientWidth || 100;
    const height = svg.clientHeight || 30;

    const min = Math.min(...this.points);
    const max = Math.max(...this.points);
    const range = max - min || 1;

    const pathData = this.points
      .map((p, i) => {
        const x = (i / (this.maxPoints - 1)) * width;
        // Flip Y axis (SVG 0 is top) and add padding
        const y = height - ((p - min) / range) * (height - 10) - 5;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    this.element.setAttribute("d", pathData);
  }
}

const TRENDS = {
  rsrp: new TrendManager("rsrpSpark", { 
    minId: "rsrpMin", maxId: "rsrpMax", avgId: "rsrpAvg",
    formatter: (v) => `${v.toFixed(0)} <small class="unit">dBm</small>`
  }),
  sinr: new TrendManager("sinrSpark", { 
    minId: "sinrMin", maxId: "sinrMax", avgId: "sinrAvg",
    formatter: (v) => `${v.toFixed(1)} <small class="unit">dB</small>`
  }),
  dl: new TrendManager("dlSpark", { 
    minId: "dlMin", maxId: "dlMax", avgId: "dlAvg",
    formatter: formatSpeed
  }),
  ul: new TrendManager("ulSpark", { 
    minId: "ulMin", maxId: "ulMax", avgId: "ulAvg",
    formatter: formatSpeed
  }),
};

// --- Initialization ---
function init() {
  UI.fields = document.querySelectorAll("[data-field]");

  UI.refreshBtn.addEventListener("click", refresh);

  UI.loginBtn.addEventListener("click", async () => {
    UI.loginBtn.innerText = "LOGGING IN...";
    UI.loginBtn.disabled = true;
    const success = await login();
    UI.loginBtn.innerText = success ? "LOGGED IN" : "FAILED";
    setTimeout(() => {
      UI.loginBtn.innerText = "LOGIN";
      UI.loginBtn.disabled = false;
    }, 2000);
    if (success) refresh();
  });

  UI.logoutBtn.addEventListener("click", async () => {
    UI.logoutBtn.innerText = "LOGGING OUT...";
    UI.logoutBtn.disabled = true;
    const success = await logout();
    UI.logoutBtn.disabled = false;
    UI.logoutBtn.innerText = success ? "LOGOUT" : "FAILED";
    updateUI(null, null, null, false);
  });

  UI.autoRefresh.addEventListener("change", (e) => {
    if (e.target.checked) {
      refreshInterval = setInterval(refresh, 1000);
      refresh();
    } else {
      if (refreshInterval) clearInterval(refreshInterval);
      refreshInterval = null;
    }
  });


  // Default to Auto-Refresh ON
  UI.autoRefresh.checked = true;
  refreshInterval = setInterval(refresh, 1000);
  
  refresh();
}

init();
