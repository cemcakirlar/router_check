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
}: HeaderProps) {
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
          <div data-tauri-drag-region style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <p data-tauri-drag-region style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Live Diagnostic Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Draggable spacer in the middle */}
      <div data-tauri-drag-region style={{ flex: 1, alignSelf: "stretch", height: "100%", minWidth: "20px", cursor: "default" }} />

      <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", position: "relative", zIndex: 10 }}>
        {/* Router API Connection Status */}
        <div id="connectionStatus" className="status-badge" title="Router API connection status">
          <div className={`status-dot ${isConnected ? "online" : ""}`} />
          <span style={{ fontSize: "0.75rem" }}>API: {isConnected ? "Connected" : "Offline"}</span>
        </div>

        {/* Polling & Refresh Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255, 255, 255, 0.02)", padding: "0.25rem 0.5rem", borderRadius: "0.5rem", border: "1px solid var(--border)" }}>
          {/* Last Update timestamp */}
          {lastUpdate && (
            <span
              id="lastUpdate"
              style={{
                fontSize: "0.7rem",
                color: "var(--accent-primary)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                marginRight: "0.4rem",
              }}
            >
              {lastUpdate.replace("UPDATED: ", "")}
            </span>
          )}

          {/* Toggle Auto Refresh (Play/Pause symbol) */}
          <button
            onClick={() => onToggleAutoRefresh(!autoRefresh)}
            className="refresh-btn"
            title={autoRefresh ? "Pause Auto-poll" : "Resume Auto-poll"}
            style={{
              padding: "0.3rem 0.5rem",
              background: autoRefresh ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.04)",
              borderColor: autoRefresh ? "rgba(16, 185, 129, 0.25)" : "var(--border)",
              color: autoRefresh ? "#34d399" : "var(--text-dim)",
            }}
          >
            {autoRefresh ? "⏸ Pause" : "▶ Auto"}
          </button>

          {/* Manual Refresh button */}
          {!autoRefresh && (
            <button
              id="refreshBtn"
              onClick={onRefresh}
              className="refresh-btn"
              disabled={isRefreshing}
              title="Force manual refresh"
              style={{
                padding: "0.3rem 0.6rem",
                background: "linear-gradient(135deg, var(--accent-primary), #3b82f6)",
                border: "none",
                color: "#030712",
                boxShadow: "0 2px 8px var(--accent-primary-glow)",
              }}
            >
              {isRefreshing ? "⏳" : "🔄 Refresh"}
            </button>
          )}
        </div>

        {/* Administration / Settings */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            id="settingsBtn"
            onClick={onOpenSettings}
            className="refresh-btn"
            title="Open system configuration"
            style={{ padding: "0.45rem 0.75rem" }}
          >
            ⚙️ Settings
          </button>

          {isConnected ? (
            <button
              id="logoutBtn"
              onClick={onLogout}
              className="refresh-btn"
              disabled={isLoggingOut}
              style={{ padding: "0.45rem 0.75rem" }}
            >
              {isLoggingOut ? "Logout..." : "Logout"}
            </button>
          ) : (
            <button
              id="loginBtn"
              onClick={onLogin}
              className="refresh-btn"
              disabled={isLoggingIn}
              style={{
                padding: "0.45rem 0.75rem",
                background: "rgba(16, 185, 129, 0.12)",
                borderColor: "rgba(16, 185, 129, 0.35)",
                color: "#34d399",
              }}
            >
              {isLoggingIn ? "Login..." : "Login"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
