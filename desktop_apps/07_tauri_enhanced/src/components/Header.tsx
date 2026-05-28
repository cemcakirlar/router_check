import { useState, useEffect } from "react";
import logoUrl from "/icon.png";

interface HeaderProps {
  isConnected: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (checked: boolean) => void;
  lastUpdate: string;
  onOpenSettings: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isRefreshing: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  onRefresh: () => void;
  pppStatus: string;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  onConnect: () => void;
  isConnecting: boolean;
  netSelect?: string;
  onSetBearerPreference: (preference: string) => Promise<void>;
  isSettingBearer: boolean;
  onStartRecovery: () => void;
  isRecovering: boolean;
}

export default function Header({
  isConnected,
  autoRefresh,
  onToggleAutoRefresh,
  lastUpdate,
  onOpenSettings,
  onLogin,
  onLogout,
  onRefresh,
  isRefreshing,
  isLoggingIn,
  isLoggingOut,
  pppStatus,
  onDisconnect,
  isDisconnecting,
  onConnect,
  isConnecting,
  netSelect,
  onSetBearerPreference,
  isSettingBearer,
  onStartRecovery,
  isRecovering,
}: HeaderProps) {
  const formatPppStatus = (status: string) => {
    if (!status) return "Unknown";
    // if (status.includes("connected") && !status.includes("disconnected")) {
    //   return "Connected";
    // }
    // if (status.includes("disconnected")) {
    //   return "Disconnected";
    // }
    // if (status.includes("connecting")) {
    //   return "Connecting...";
    // }
    // if (status.includes("disconnecting")) {
    //   return "Disconnecting...";
    // }
    const clean = status.replace(/_/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const getPppDotClass = (status: string) => {
    if (!status) return "";
    if (status.includes("connected") && !status.includes("disconnected")) {
      return "online";
    }
    return "";
  };

  const isPppConnected = pppStatus.includes("connected") && !pppStatus.includes("disconnected");
  const isPppDisconnected = pppStatus.includes("disconnected");

  const [selectedBearer, setSelectedBearer] = useState("NETWORK_auto");

  useEffect(() => {
    if (netSelect && ["Only_LTE", "Only_WCDMA", "NETWORK_auto"].includes(netSelect)) {
      setSelectedBearer(netSelect);
    }
  }, [netSelect]);

  return (
    <header>
      <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: "0.75rem", pointerEvents: "auto", cursor: "default" }}>
        <img
          data-tauri-drag-region
          src={logoUrl}
          alt="Logo"
          style={{
            width: "38px",
            height: "38px",
            objectFit: "contain",
            filter: "drop-shadow(0 0 8px var(--accent-primary-glow))",
            pointerEvents: "none",
          }}
        />
        <div data-tauri-drag-region style={{ pointerEvents: "none" }}>
          <h1 data-tauri-drag-region>ROUTER CHECK</h1>
          <div data-tauri-drag-region style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <p data-tauri-drag-region style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Live Diagnostic Dashboard
            </p>
            <p
              data-tauri-drag-region
              id="lastUpdate"
              style={{
                fontSize: "0.75rem",
                color: "var(--accent-primary)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              {lastUpdate}
            </p>
          </div>
        </div>
      </div>

      {/* Draggable spacer in the middle */}
      <div data-tauri-drag-region style={{ flex: 1, alignSelf: "stretch", height: "100%", minWidth: "20px", cursor: "default" }} />

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", position: "relative", zIndex: 10 }}>
        {/* Router API Connection Status */}
        <div id="connectionStatus" className="status-badge" title="Router API connection status">
          <div className={`status-dot ${isConnected ? "online" : ""}`} />
          <span style={{ fontSize: "0.75rem" }}>API: {isConnected ? "Connected" : "Offline"}</span>
        </div>

        {/* PPP Connection Link Status */}
        {isConnected && (
          <div id="pppStatus" className="status-badge" title="PPP Internet connection status">
            <div className={`status-dot ${getPppDotClass(pppStatus)}`} />
            <span style={{ fontSize: "0.75rem" }}>PPP Link: {formatPppStatus(pppStatus)}</span>
          </div>
        )}

        {/* PPP Disconnect Button */}
        {isConnected && isPppConnected && (
          <button
            id="disconnectBtn"
            onClick={onDisconnect}
            className="refresh-btn"
            disabled={isDisconnecting}
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              borderColor: "rgba(239, 68, 68, 0.35)",
              color: "#f87171",
              boxShadow: "0 4px 10px rgba(239, 68, 68, 0.15)",
            }}
          >
            {isDisconnecting ? "DISCONNECTING..." : "🔌 DISCONNECT"}
          </button>
        )}

        {/* PPP Connect Button */}
        {isConnected && !isPppConnected && (
          <button
            id="connectBtn"
            onClick={onConnect}
            className="refresh-btn"
            disabled={isConnecting}
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              borderColor: "rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              boxShadow: "0 4px 10px rgba(16, 185, 129, 0.15)",
            }}
          >
            {isConnecting ? "CONNECTING..." : "🔌 CONNECT"}
          </button>
        )}

        {/* Bearer Preference Selection Dropdown and Button */}
        {isConnected && (
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <select
              id="bearerPreferenceSelect"
              value={selectedBearer}
              onChange={(e) => setSelectedBearer(e.target.value)}
              disabled={!isPppDisconnected || isSettingBearer}
              className="refresh-btn"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(255, 255, 255, 0.12)",
                color: isPppDisconnected ? "var(--text-bright)" : "var(--text-dim)",
                cursor: isPppDisconnected ? "pointer" : "not-allowed",
                outline: "none",
                paddingRight: "0.5rem",
              }}
            >
              <option value="NETWORK_auto" style={{ background: "#1f2937", color: "white" }}>
                Auto Network
              </option>
              <option value="Only_LTE" style={{ background: "#1f2937", color: "white" }}>
                Only LTE
              </option>
              <option value="Only_WCDMA" style={{ background: "#1f2937", color: "white" }}>
                Only WCDMA
              </option>
            </select>
            <button
              id="setBearerBtn"
              onClick={() => onSetBearerPreference(selectedBearer)}
              disabled={!isPppDisconnected || isSettingBearer}
              className="refresh-btn"
              style={{
                background: isPppDisconnected ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.02)",
                borderColor: isPppDisconnected ? "rgba(59, 130, 246, 0.35)" : "rgba(255, 255, 255, 0.05)",
                color: isPppDisconnected ? "#60a5fa" : "var(--text-dim)",
                boxShadow: isPppDisconnected ? "0 4px 10px rgba(59, 130, 246, 0.15)" : "none",
                cursor: isPppDisconnected ? "pointer" : "not-allowed",
              }}
            >
              {isSettingBearer ? "SETTING..." : "SET BEARER"}
            </button>
          </div>
        )}

        {/* Cell Recovery Button */}
        {isConnected && (
          <button
            id="cellRecoveryBtn"
            onClick={onStartRecovery}
            disabled={isRecovering}
            className="refresh-btn"
            style={{
              background: "rgba(139, 92, 246, 0.12)",
              borderColor: "rgba(139, 92, 246, 0.35)",
              color: "#a78bfa",
              boxShadow: "0 4px 10px rgba(139, 92, 246, 0.15)",
              cursor: isRecovering ? "not-allowed" : "pointer",
            }}
          >
            {isRecovering ? "⚡ RECOVERING..." : "⚡ RECOVER CELL"}
          </button>
        )}

        {!autoRefresh && (
          <button id="refreshBtn" onClick={onRefresh} className="refresh-btn" disabled={isRefreshing} style={{ display: "flex" }}>
            {/* {isRefreshing ? "REFRESHING..." : "REFRESH"} */}
            REFRESH
          </button>
        )}

        <div className="auto-toggle">
          <input
            type="checkbox"
            id="autoRefresh"
            style={{ cursor: "pointer" }}
            checked={autoRefresh}
            onChange={(e) => onToggleAutoRefresh(e.target.checked)}
          />
          <label
            htmlFor="autoRefresh"
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              cursor: "pointer",
              color: "var(--text-dim)",
              letterSpacing: "0.5px",
            }}
          >
            AUTO
          </label>
        </div>

        <button id="settingsBtn" onClick={onOpenSettings} className="refresh-btn">
          ⚙️ Settings
        </button>
        {isConnected ? (
          <button id="logoutBtn" onClick={onLogout} className="refresh-btn" disabled={isLoggingOut}>
            {isLoggingOut ? "LOGGING OUT..." : "LOGOUT"}
          </button>
        ) : (
          <button id="loginBtn" onClick={onLogin} className="refresh-btn" disabled={isLoggingIn}>
            {isLoggingIn ? "LOGGING IN..." : "LOGIN"}
          </button>
        )}
      </div>
    </header>
  );
}
