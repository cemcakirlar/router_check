import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./style.css";
import { AppConfig, Station, StaticIp, RouterData } from "./types";

// Component Imports
import Header from "./components/Header";
import BootstrapOverlay from "./components/BootstrapOverlay";
import SettingsModal from "./components/SettingsModal";
import SignalCard from "./components/SignalCard";
import UsageCard from "./components/UsageCard";
import RealtimeCard from "./components/RealtimeCard";
import InfoCard from "./components/InfoCard";
import DevicesTable from "./components/DevicesTable";
import LogsCard, { ChangeLogEntry } from "./components/LogsCard";

// Check if running inside Tauri
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

async function fnCall<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isTauri) {
    try {
      return await invoke<T>(command, args);
    } catch (e) {
      console.error(`Tauri command ${command} failed:`, e);
      throw e;
    }
  } else {
    throw new Error(`Tauri environment not detected. Cannot execute: ${command}`);
  }
}

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
  "net_select",
];

interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

export default function App() {
  if (!isTauri) {
    return (
      <div className="fullscreen-overlay active" style={{ zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="overlay-card" style={{ maxWidth: "480px", textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>🖥️</div>
          <h2 className="overlay-title" style={{ color: "#ff4949", letterSpacing: "2px", marginBottom: "1rem" }}>
            DESKTOP MODE REQUIRED
          </h2>
          <div className="progress-text" style={{ margin: "1rem 0", lineHeight: 1.6, fontSize: "0.95rem" }}>
            This application requires native integration and cannot communicate with your router directly from a web browser.
          </div>
          <div style={{ marginTop: "1.5rem", fontSize: "0.85rem", opacity: 0.8 }}>
            Please run the desktop app or start it via:
            <code
              style={{
                display: "block",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                marginTop: "8px",
                color: "#58a6ff",
                fontFamily: "monospace",
              }}
            >
              npm run dev
            </code>
          </div>
        </div>
      </div>
    );
  }

  // Authentication & Connections State
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSettingBearer, setIsSettingBearer] = useState(false);

  // Router configuration settings
  const [routerIp, setRouterIp] = useState("192.168.0.1");
  const [routerPassword, setRouterPassword] = useState("");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(2000);
  const [autoRefreshOnStartup, setAutoRefreshOnStartup] = useState(true);
  const [mainWindowOnStartup, setMainWindowOnStartup] = useState("visible");

  // Overlay states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBootstrapOpen, setIsBootstrapOpen] = useState(true);
  const [bootstrapHasError, setBootstrapHasError] = useState(false);

  // Auto Refresh checkbox
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Main UI Data State
  const [routerData, setRouterData] = useState<RouterData | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [staticIps, setStaticIps] = useState<StaticIp[]>([]);
  const [lastUpdate, setLastUpdate] = useState("");

  // Sparkline data histories
  const [rsrpHistory, setRsrpHistory] = useState<number[]>([]);
  const [sinrHistory, setSinrHistory] = useState<number[]>([]);
  const [dlHistory, setDlHistory] = useState<number[]>([]);
  const [ulHistory, setUlHistory] = useState<number[]>([]);

  // Toast notification state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Telemetry Change Logs
  const [logs, setLogs] = useState<ChangeLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("router_telemetry_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const prevFieldsRef = useRef<{
    cellId?: string;
    networkType?: string;
    rsrp?: string;
    sinr?: string;
  }>({});

  const logSaveTimeoutRef = useRef<any>(null);
  const isRefreshingRef = useRef(false);

  // Debounced log persistence to localStorage to prevent high SSD write wear
  const saveLogsToStorage = (updatedLogs: ChangeLogEntry[]) => {
    if (logSaveTimeoutRef.current) {
      clearTimeout(logSaveTimeoutRef.current);
    }
    logSaveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem("router_telemetry_logs", JSON.stringify(updatedLogs));
      } catch (e) {
        console.error("Failed to save logs to localStorage:", e);
      }
    }, 2000);
  };

  const addLog = (field: string, oldValue: string, newValue: string, rsrpVal: string, sinrVal: string, cellIdVal: string, networkTypeVal: string) => {
    const newLog: ChangeLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleString(),
      field,
      oldValue,
      newValue,
      rsrp: rsrpVal,
      sinr: sinrVal,
      cellId: cellIdVal,
      networkType: networkTypeVal,
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 500);

      // Save immediately for critical events, debounce for telemetry fluctuations
      if (field === "Cell ID" || field === "Network Type") {
        if (logSaveTimeoutRef.current) {
          clearTimeout(logSaveTimeoutRef.current);
        }
        try {
          localStorage.setItem("router_telemetry_logs", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save logs to localStorage:", e);
        }
      } else {
        saveLogsToStorage(updated);
      }
      return updated;
    });
  };

  // Cleanup log save timeout on unmount
  useEffect(() => {
    return () => {
      if (logSaveTimeoutRef.current) {
        clearTimeout(logSaveTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (message: string, type: "info" | "success" | "error" = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const refresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      let data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") });

      // Check if router requires login
      if (!data || data.result === "not_login" || !data.network_provider) {
        console.log("🔑 Router returned not_login. Attempting login...");
        const loginResult = await fnCall<{ result: string; success?: boolean }>("login");
        if (loginResult && (loginResult.success || loginResult.result === "0" || loginResult.result === "ok")) {
          // Retry fetch
          data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") });
        } else {
          throw new Error("Login failed");
        }
      }

      if (!data || data.result === "not_login") {
        throw new Error("Could not authenticate with router");
      }

      const stationData = await fnCall<{ station_list: Station[] }>("fetch_stations").catch(() => null);
      const staticData = await fnCall<{ current_static_addr_list: StaticIp[] }>("fetch_static_ips").catch(() => null);

      setRouterData(data);
      setStations(stationData?.station_list || []);
      setStaticIps(staticData?.current_static_addr_list || []);

      // Detect telemetry changes
      const cellIdVal = data.cell_id || "";
      const networkTypeVal = data.network_type || "";
      const rsrpStr = data.lte_rsrp || "";
      const sinrStr = data.sinr || "";

      const prev = prevFieldsRef.current;
      const checkChange = (prevVal: string | undefined, newVal: string, label: string, threshold?: number): string | undefined => {
        if (!newVal) return prevVal;

        if (prevVal === undefined) {
          addLog(label, "", newVal, rsrpStr, sinrStr, cellIdVal, networkTypeVal);
          return newVal;
        }

        if (prevVal !== newVal) {
          if (threshold !== undefined) {
            const pNum = parseFloat(prevVal) || 0;
            const nNum = parseFloat(newVal) || 0;
            if (Math.abs(nNum - pNum) < threshold) {
              return prevVal;
            }
          }
          addLog(label, prevVal, newVal, rsrpStr, sinrStr, cellIdVal, networkTypeVal);
          return newVal;
        }

        return prevVal;
      };

      const nextCellId = checkChange(prev.cellId, cellIdVal, "Cell ID");
      const nextNetworkType = checkChange(prev.networkType, networkTypeVal, "Network Type");
      const nextRsrp = checkChange(prev.rsrp, rsrpStr, "RSRP", 3);
      const nextSinr = checkChange(prev.sinr, sinrStr, "SINR", 2);

      prevFieldsRef.current = {
        cellId: nextCellId,
        networkType: nextNetworkType,
        rsrp: nextRsrp,
        sinr: nextSinr,
      };

      // Calculate Sparkline point values
      const rsrpVal = parseInt(data.lte_rsrp || "0") || 0;
      const sinrVal = parseFloat(data.sinr || "0") || 0;
      const dlSpeedBps = (parseFloat(data.realtime_rx_thrpt || "0") || 0) * 8;
      const ulSpeedBps = (parseFloat(data.realtime_tx_thrpt || "0") || 0) * 8;

      setRsrpHistory((prev) => [...prev, rsrpVal].slice(-50));
      setSinrHistory((prev) => [...prev, sinrVal].slice(-50));
      setDlHistory((prev) => [...prev, dlSpeedBps].slice(-50));
      setUlHistory((prev) => [...prev, ulSpeedBps].slice(-50));

      const now = new Date();
      setLastUpdate("UPDATED: " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setIsConnected(true);
      setBootstrapHasError(false);
      setIsBootstrapOpen(false);

      if (isTauri) {
        const rsrpVal = data.lte_rsrp || "N/A";
        const sinrVal = data.sinr || "N/A";
        const cellIdVal = data.cell_id || "N/A";
        const netType = data.network_type || "N/A";
        invoke("update_tray_title", {
          title: `${netType} | RSRP: ${rsrpVal}dBm | SINR: ${sinrVal}dB | CID: ${cellIdVal}`,
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Refresh failed:", e);
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate("");
      setIsConnected(false);
      setBootstrapHasError(true);
      setIsBootstrapOpen(true);

      if (isTauri) {
        invoke("update_tray_title", { title: "Offline" }).catch(() => {});
      }
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await fnCall<{ result: string; success?: boolean }>("login");
      const success = result && (result.success || result.result === "0" || result.result === "ok");
      if (success) {
        showToast("Logged in successfully!", "success");
        setTimeout(refresh, 500);
      } else {
        showToast("Login failed.", "error");
      }
    } catch {
      showToast("An error occurred during login.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fnCall("logout");
      showToast("Logged out successfully.", "info");
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate("");
      setIsConnected(false);

      if (isTauri) {
        invoke("update_tray_title", { title: "Offline" }).catch(() => {});
      }
    } catch {
      showToast("An error occurred during logout.", "error");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const result = await fnCall<{ result: string; success?: boolean }>("disconnect_network");
      const success = result && (result.success || result.result === "0" || result.result === "ok" || result.result === "success");
      if (success) {
        showToast("Disconnection request sent!", "success");
        let attempts = 0;
        const pollDisconnection = async () => {
          if (attempts >= 5) return;
          attempts++;
          try {
            const data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") });
            if (data) {
              setRouterData(data);
              const ppp = data.ppp_status || "";
              if (ppp.includes("disconnected") || ppp === "") {
                refresh();
                return;
              }
            }
          } catch (e) {
            console.error("Polling ppp status failed:", e);
          }
          setTimeout(pollDisconnection, 1000);
        };
        setTimeout(pollDisconnection, 500);
      } else {
        showToast("Disconnection command failed.", "error");
      }
    } catch (e) {
      showToast(`Error disconnecting: ${e}`, "error");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await fnCall<{ result: string; success?: boolean }>("connect_network");
      const success = result && (result.success || result.result === "0" || result.result === "ok" || result.result === "success");
      if (success) {
        showToast("Connection request sent!", "success");
        let attempts = 0;
        const pollConnection = async () => {
          if (attempts >= 10) return;
          attempts++;
          try {
            const data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") });
            if (data) {
              setRouterData(data);
              const ppp = data.ppp_status || "";
              if (ppp.includes("connected") && !ppp.includes("disconnected")) {
                refresh();
                return;
              }
            }
          } catch (e) {
            console.error("Polling ppp status failed:", e);
          }
          setTimeout(pollConnection, 1500);
        };
        setTimeout(pollConnection, 1000);
      } else {
        showToast("Connection command failed.", "error");
      }
    } catch (e) {
      showToast(`Error connecting: ${e}`, "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSetBearerPreference = async (preference: string) => {
    setIsSettingBearer(true);
    try {
      const result = await fnCall<{ result: string; success?: boolean }>("set_bearer_preference", { preference });
      const success = result && (result.success || result.result === "0" || result.result === "ok" || result.result === "success");
      if (success) {
        showToast(`Bearer preference set to ${preference}!`, "success");
        refresh();
      } else {
        showToast("Failed to set bearer preference.", "error");
      }
    } catch (e) {
      showToast(`Error setting bearer preference: ${e}`, "error");
    } finally {
      setIsSettingBearer(false);
    }
  };

  const handleSaveSettings = async (ip: string, pass: string, interval: number, refreshOnStartup: boolean, windowOnStartup: string) => {
    try {
      const config = {
        router_ip: ip,
        router_password: pass,
        auto_refresh_interval: interval,
        auto_refresh_on_startup: refreshOnStartup,
        main_window_on_startup: windowOnStartup,
      };
      await fnCall("save_config", { config });
      setRouterIp(ip);
      setRouterPassword(pass);
      setAutoRefreshInterval(interval);
      setAutoRefreshOnStartup(refreshOnStartup);
      setMainWindowOnStartup(windowOnStartup);
      setAutoRefresh(refreshOnStartup);
      setIsSettingsOpen(false);
      showToast("Configuration saved!", "success");

      // Clear states for clean reconnection
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate("");
      setIsConnected(false);
      setBootstrapHasError(false);
      setIsBootstrapOpen(true);

      setTimeout(refresh, 500);
    } catch (e) {
      showToast(`Failed to save settings: ${e}`, "error");
    }
  };

  // Load config on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fnCall<AppConfig>("get_config");
        if (config) {
          setRouterIp(config.router_ip);
          setRouterPassword(config.router_password);
          setAutoRefreshInterval(config.auto_refresh_interval);
          setAutoRefreshOnStartup(config.auto_refresh_on_startup);
          setMainWindowOnStartup(config.main_window_on_startup);
          setAutoRefresh(config.auto_refresh_on_startup);
        }
      } catch (e) {
        console.error("Failed to load configuration:", e);
      }
    };

    loadConfig().then(() => {
      refresh();
    });
  }, []);

  // Poll recursive effect loop
  useEffect(() => {
    if (!autoRefresh) return;

    let active = true;
    let timeoutId: any = null;

    const poll = async () => {
      if (!active) return;
      await refresh();
      if (!active) return;
      timeoutId = setTimeout(poll, autoRefreshInterval);
    };

    timeoutId = setTimeout(poll, autoRefreshInterval);

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [autoRefresh, autoRefreshInterval]);

  // Dynamic Window Title Updater
  useEffect(() => {
    if (isTauri) {
      try {
        const appWindow = getCurrentWebviewWindow();
        if (isConnected && routerData) {
          const rsrpVal = routerData.lte_rsrp || "N/A";
          const sinrVal = routerData.sinr || "N/A";
          const netType = routerData.network_type || "N/A";
          appWindow.setTitle(`Router Check (Enhanced) - ${netType} - RSRP: ${rsrpVal} dBm | SINR: ${sinrVal} dB`);
        } else {
          appWindow.setTitle("Router Check (Enhanced) - Disconnected");
        }
      } catch (e) {
        console.error("Failed to set window title:", e);
      }
    }
  }, [routerData, isConnected]);

  // Poll tray events periodically
  useEffect(() => {
    if (!isTauri) return;

    const checkPendingActions = async () => {
      try {
        const actions = await invoke<string[]>("get_pending_actions");
        if (actions && actions.length > 0) {
          for (const action of actions) {
            console.log("Processing tray action:", action);
            if (action === "toggle_refresh") {
              setAutoRefresh((prev) => !prev);
            } else if (action === "force_refresh") {
              refresh();
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch pending tray actions:", e);
      }
    };

    const intervalId = setInterval(checkPendingActions, 500);
    return () => clearInterval(intervalId);
  }, []);

  // Update Menu Item Text when autoRefresh changes
  useEffect(() => {
    if (isTauri) {
      const text = autoRefresh ? "Pause Auto-Poll" : "Resume Auto-Poll";
      console.log("Invoking update_menu_item_text with:", text);
      invoke("update_menu_item_text", { text })
        .then(() => console.log("Menu item text successfully updated to:", text))
        .catch((e) => console.error("Failed to update menu item text:", e));
    }
  }, [autoRefresh]);

  // Derived Values
  const rsrp = routerData && routerData.lte_rsrp ? parseInt(routerData.lte_rsrp) || 0 : null;
  const sinr = routerData && routerData.sinr ? parseFloat(routerData.sinr) || 0 : null;
  const cellId = routerData?.cell_id || "";
  const earfcn = routerData?.Z_dl_earfcn || "";

  const monthlyRx = routerData && routerData.monthly_rx_bytes ? parseInt(routerData.monthly_rx_bytes) || 0 : null;
  const monthlyTx = routerData && routerData.monthly_tx_bytes ? parseInt(routerData.monthly_tx_bytes) || 0 : null;
  const monthlyTime = routerData && routerData.monthly_time ? parseInt(routerData.monthly_time) || 0 : null;
  const provider = routerData?.network_provider || "";
  const networkType = routerData?.network_type || "";

  const dlSpeed = routerData && routerData.realtime_rx_thrpt ? (parseFloat(routerData.realtime_rx_thrpt) || 0) * 8 : null;
  const ulSpeed = routerData && routerData.realtime_tx_thrpt ? (parseFloat(routerData.realtime_tx_thrpt) || 0) * 8 : null;
  const totalSessionBytes = routerData
    ? (parseInt(routerData.realtime_rx_bytes || "0") || 0) + (parseInt(routerData.realtime_tx_bytes || "0") || 0)
    : null;

  return (
    <>
      {/* Toast Notifications */}
      <div id="toastContainer" className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
            <span
              style={{ marginLeft: "10px", cursor: "pointer", opacity: 0.7 }}
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
            >
              ✕
            </span>
          </div>
        ))}
      </div>

      {/* Bootstrap Connection Loader Overlay */}
      <BootstrapOverlay
        isOpen={isBootstrapOpen}
        hasError={bootstrapHasError}
        routerIp={routerIp}
        onRetry={refresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Router Credentials Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        initialIp={routerIp}
        initialPassword={routerPassword}
        initialAutoRefreshInterval={autoRefreshInterval}
        initialAutoRefreshOnStartup={autoRefreshOnStartup}
        initialMainWindowOnStartup={mainWindowOnStartup}
        onCancel={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Main Container */}
      <div className="w-[95%] max-w-[1600px] mx-auto animate-[fadeIn_0.8s_ease-out]">
        <Header
          isConnected={isConnected}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={setAutoRefresh}
          lastUpdate={lastUpdate}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          isLoggingIn={isLoggingIn}
          isLoggingOut={isLoggingOut}
          pppStatus={routerData?.ppp_status || ""}
          onDisconnect={handleDisconnect}
          isDisconnecting={isDisconnecting}
          onConnect={handleConnect}
          isConnecting={isConnecting}
          netSelect={routerData?.net_select || ""}
          onSetBearerPreference={handleSetBearerPreference}
          isSettingBearer={isSettingBearer}
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Signal Card */}
          <SignalCard rsrp={rsrp} sinr={sinr} cellId={cellId} earfcn={earfcn} rsrpHistory={rsrpHistory} sinrHistory={sinrHistory} />

          {/* Realtime Rate speeds */}
          <RealtimeCard dlSpeed={dlSpeed} ulSpeed={ulSpeed} totalSessionBytes={totalSessionBytes} dlHistory={dlHistory} ulHistory={ulHistory} />
          {/* Monthly Usage Card */}
          <UsageCard monthlyRx={monthlyRx} monthlyTx={monthlyTx} monthlyTime={monthlyTime} provider={provider} networkType={networkType} />
          {/* Router change logs */}
          <LogsCard
            logs={logs}
            onClear={() => {
              setLogs([]);
              localStorage.removeItem("router_telemetry_logs");
            }}
          />

          {/* Network configurations, firmware info, stats */}
          <InfoCard
            wanIp={routerData?.wan_ipaddr || ""}
            pppStatus={routerData?.ppp_status || ""}
            lanIp={routerData?.lan_ipaddr || routerData?.ip_addr_web || ""}
            lanNetmask={routerData?.lan_netmask || ""}
            dhcpEnabled={routerData?.dhcpEnabled || ""}
            macAddress={routerData?.mac_address || ""}
            imei={routerData?.imei || ""}
            firmware={routerData?.cr_version || routerData?.wa_version || ""}
            hardware={routerData?.hardware_version || ""}
            msisdn={routerData?.msisdn || ""}
            smsUnread={routerData?.sms_unread_num || "0"}
            wifiClients={routerData?.wifi_access_sta_num || ""}
          />
          {/* Client devices active/static list tables */}
          <DevicesTable staticIps={staticIps} stations={stations} />
        </div>
      </div>
    </>
  );
}
