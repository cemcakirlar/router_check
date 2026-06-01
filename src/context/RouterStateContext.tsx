import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AppConfig, Station, StaticIp, RouterData } from "../types";
import { ChangeLogEntry } from "../components/LogsCard";
import { RecoveryStep } from "../components/RecoveryOverlay";

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

export interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

export interface RouterStateContextType {
  // Authentication & Connections State
  isConnected: boolean;
  isRefreshing: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isDisconnecting: boolean;
  isConnecting: boolean;
  isSettingBearer: boolean;

  // Cell Recovery State
  recoveryStep: RecoveryStep;
  recoveryMessage: string;
  recoveryLogs: string[];

  // Router configuration settings
  routerIp: string;
  routerPassword: string;
  autoRefreshInterval: number;
  autoRefreshOnStartup: boolean;
  mainWindowOnStartup: string;

  // Overlay states
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isBootstrapOpen: boolean;
  setIsBootstrapOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bootstrapHasError: boolean;
  setBootstrapHasError: React.Dispatch<React.SetStateAction<boolean>>;

  // Auto Refresh checkbox
  autoRefresh: boolean;
  setAutoRefresh: React.Dispatch<React.SetStateAction<boolean>>;

  // Main UI Data State
  routerData: RouterData | null;
  stations: Station[];
  staticIps: StaticIp[];
  lastUpdate: string;

  // Sparkline data histories
  rsrpHistory: number[];
  sinrHistory: number[];
  dlHistory: number[];
  ulHistory: number[];

  // Toast notification state
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  showToast: (message: string, type?: "info" | "success" | "error") => void;

  // Telemetry Change Logs
  logs: ChangeLogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<ChangeLogEntry[]>>;

  // Derived Values
  rsrp: number | null;
  sinr: number | null;
  cellId: string;
  earfcn: string;
  monthlyRx: number | null;
  monthlyTx: number | null;
  monthlyTime: number | null;
  provider: string;
  networkType: string;
  dlSpeed: number | null;
  ulSpeed: number | null;
  totalSessionBytes: number | null;

  // Action methods
  refresh: () => Promise<void>;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleConnect: () => Promise<void>;
  handleSetBearerPreference: (preference: string) => Promise<void>;
  handleCellRecovery: () => Promise<void>;
  handleAbortRecovery: () => void;
  dismissRecovery: () => void;
  handleSaveSettings: (ip: string, pass: string, interval: number, refreshOnStartup: boolean, windowOnStartup: string) => Promise<void>;
}

const RouterStateContext = createContext<RouterStateContextType | undefined>(undefined);

export function RouterStateProvider({ children }: { children: ReactNode }) {
  // Authentication & Connections State
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSettingBearer, setIsSettingBearer] = useState(false);

  // Cell Recovery State
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("idle");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryLogs, setRecoveryLogs] = useState<string[]>([]);
  const abortRecoveryRef = useRef<boolean>(false);

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
    } catch (e: any) {
      console.error("Refresh failed:", e);
      const errStr = String(e);
      if (errStr.includes("Login failed") || errStr.includes("password") || errStr.includes("unauthorized")) {
        setAutoRefresh(false);
        showToast("Auto-refresh paused: Login failed (check password)", "error");
      }
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
    } catch (e: any) {
      const errorMsg = typeof e === "string" ? e : (e?.message || "An error occurred during login.");
      showToast(errorMsg, "error");
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

  const handleCellRecovery = async () => {
    if (recoveryStep !== "idle") return;

    abortRecoveryRef.current = false;
    setRecoveryLogs([]);
    const wasAutoRefresh = autoRefresh;
    if (autoRefresh) {
      setAutoRefresh(false);
    }

    const log = (msg: string) => {
      setRecoveryLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      setRecoveryMessage(msg);
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const checkAborted = () => {
      if (abortRecoveryRef.current) {
        throw new Error("Aborted by user");
      }
    };

    try {
      // 1. Disconnect
      setRecoveryStep("disconnecting");
      log("Disconnecting network...");
      const discResult = await fnCall<{ result: string; success?: boolean }>("disconnect_network");
      const discSuccess =
        discResult && (discResult.success || discResult.result === "0" || discResult.result === "ok" || discResult.result === "success");
      if (!discSuccess) {
        throw new Error("Disconnect command failed");
      }
      checkAborted();
      await sleep(1000);

      // 2. Verify Disconnected
      setRecoveryStep("verifying_disconnect");
      log("Verifying disconnected status...");
      let discVerified = false;
      for (let i = 0; i < 20; i++) {
        checkAborted();
        const data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") }).catch(() => null);
        if (data) {
          const ppp = data.ppp_status || "";
          log(`Verifying disconnect (attempt ${i + 1}/20) - status: ${ppp || "empty"}`);
          if (ppp.includes("disconnected") || ppp === "") {
            discVerified = true;
            break;
          }
        }
        await sleep(1000);
      }
      if (!discVerified) {
        throw new Error("Failed to verify disconnection within timeout");
      }
      checkAborted();

      // 3. Switch to 3G (Only_WCDMA)
      setRecoveryStep("setting_3g");
      log("Switching bearer preference to Only 3G/WCDMA...");
      const set3gResult = await fnCall<{ result: string; success?: boolean }>("set_bearer_preference", { preference: "Only_WCDMA" });
      const set3gSuccess =
        set3gResult && (set3gResult.success || set3gResult.result === "0" || set3gResult.result === "ok" || set3gResult.result === "success");
      if (!set3gSuccess) {
        throw new Error("Failed to set preference to Only WCDMA");
      }
      checkAborted();
      await sleep(2000);

      // 4. Verify 3G Registration
      setRecoveryStep("verifying_3g");
      log("Waiting for router to register on 3G network...");
      let registered3g = false;
      for (let i = 0; i < 20; i++) {
        checkAborted();
        const data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") }).catch(() => null);
        if (data) {
          const net = (data.network_type || "").toLowerCase();
          log(`Verifying 3G registration (attempt ${i + 1}/20) - network: ${data.network_type || "None"}`);
          if (
            net.includes("wcdma") ||
            net.includes("umts") ||
            net.includes("hsdpa") ||
            net.includes("hsupa") ||
            net.includes("hspa") ||
            net.includes("3g")
          ) {
            registered3g = true;
            break;
          }
        }
        await sleep(1500);
      }
      if (!registered3g) {
        throw new Error("Router failed to register on 3G network within timeout");
      }
      checkAborted();

      // 5. Switch back to Auto
      setRecoveryStep("setting_auto");
      log("Restoring bearer preference to Auto...");
      const setAutoResult = await fnCall<{ result: string; success?: boolean }>("set_bearer_preference", { preference: "NETWORK_auto" });
      const setAutoSuccess =
        setAutoResult &&
        (setAutoResult.success || setAutoResult.result === "0" || setAutoResult.result === "ok" || setAutoResult.result === "success");
      if (!setAutoSuccess) {
        throw new Error("Failed to restore preference to Auto");
      }
      checkAborted();
      await sleep(2000);

      // 6. Verify LTE / LTE-A
      setRecoveryStep("verifying_lte");
      log("Waiting for router to register on 4G LTE/LTE-A network...");
      let registeredLte = false;
      for (let i = 0; i < 25; i++) {
        checkAborted();
        const data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") }).catch(() => null);
        if (data) {
          const net = (data.network_type || "").toLowerCase();
          log(`Verifying 4G registration (attempt ${i + 1}/25) - network: ${data.network_type || "None"}`);
          if (
            net.includes("lte") ||
            net.includes("4g") ||
            net.includes("5g") ||
            net.includes("hspa+") ||
            net.includes("lte_a") ||
            net.includes("lte-a") ||
            net.includes("lte+")
          ) {
            registeredLte = true;
            break;
          }
        }
        await sleep(1500);
      }
      if (!registeredLte) {
        throw new Error("Router failed to register on 4G/LTE network within timeout");
      }
      checkAborted();

      // 7. Connect Network
      setRecoveryStep("connecting");
      log("Connecting network...");
      const connResult = await fnCall<{ result: string; success?: boolean }>("connect_network");
      const connSuccess =
        connResult && (connResult.success || connResult.result === "0" || connResult.result === "ok" || connResult.result === "success");
      if (!connSuccess) {
        throw new Error("Connect command failed");
      }
      checkAborted();
      await sleep(1500);

      // 8. Verify Connection
      setRecoveryStep("verifying_connect");
      log("Verifying network connection...");
      let connVerified = false;
      for (let i = 0; i < 20; i++) {
        checkAborted();
        const data = await fnCall<RouterData>("fetch_router_data", { commands: COMMANDS.join(",") }).catch(() => null);
        if (data) {
          const ppp = data.ppp_status || "";
          log(`Verifying connect (attempt ${i + 1}/20) - status: ${ppp}`);
          if (ppp.includes("connected") && !ppp.includes("disconnected")) {
            connVerified = true;
            break;
          }
        }
        await sleep(1000);
      }
      if (!connVerified) {
        throw new Error("Failed to verify connection within timeout");
      }

      setRecoveryStep("completed");
      log("Cell recovery sequence completed successfully!");
      showToast("Cell recovery completed successfully!", "success");
    } catch (err: any) {
      console.error("Cell recovery failed:", err);
      setRecoveryStep("failed");
      log(`Recovery failed: ${err.message || err}`);
      showToast(`Cell recovery failed: ${err.message || err}`, "error");
    } finally {
      // Restore auto-refresh
      if (wasAutoRefresh) {
        setAutoRefresh(true);
      }
      // Trigger a final refresh to get latest statistics
      refresh();
    }
  };

  const handleAbortRecovery = () => {
    abortRecoveryRef.current = true;
    setRecoveryStep("idle");
    showToast("Cell recovery sequence aborted", "info");
    refresh();
  };

  const dismissRecovery = () => {
    setRecoveryStep("idle");
    refresh();
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

      // Invalidate old session and clear local cookie jar
      await fnCall("logout").catch(() => null);

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
          appWindow.setTitle(`Router Check - ${netType} - RSRP: ${rsrpVal} dBm | SINR: ${sinrVal} dB`);
        } else {
          appWindow.setTitle("Router Check - Disconnected");
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
    <RouterStateContext.Provider
      value={{
        isConnected,
        isRefreshing,
        isLoggingIn,
        isLoggingOut,
        isDisconnecting,
        isConnecting,
        isSettingBearer,
        recoveryStep,
        recoveryMessage,
        recoveryLogs,
        routerIp,
        routerPassword,
        autoRefreshInterval,
        autoRefreshOnStartup,
        mainWindowOnStartup,
        isSettingsOpen,
        setIsSettingsOpen,
        isBootstrapOpen,
        setIsBootstrapOpen,
        bootstrapHasError,
        setBootstrapHasError,
        autoRefresh,
        setAutoRefresh,
        routerData,
        stations,
        staticIps,
        lastUpdate,
        rsrpHistory,
        sinrHistory,
        dlHistory,
        ulHistory,
        toasts,
        setToasts,
        showToast,
        logs,
        setLogs,
        rsrp,
        sinr,
        cellId,
        earfcn,
        monthlyRx,
        monthlyTx,
        monthlyTime,
        provider,
        networkType,
        dlSpeed,
        ulSpeed,
        totalSessionBytes,
        refresh,
        handleLogin,
        handleLogout,
        handleDisconnect,
        handleConnect,
        handleSetBearerPreference,
        handleCellRecovery,
        handleAbortRecovery,
        dismissRecovery,
        handleSaveSettings,
      }}
    >
      {children}
    </RouterStateContext.Provider>
  );
}

export function useRouterState() {
  const context = useContext(RouterStateContext);
  if (context === undefined) {
    throw new Error("useRouterState must be used within a RouterStateProvider");
  }
  return context;
}
