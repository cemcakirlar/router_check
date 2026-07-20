import logoUrl from "/icon.png";
import { useRouterState } from "../context/RouterStateContext";

export default function Header() {
  const {
    isConnected,
    autoRefresh,
    setAutoRefresh,
    lastUpdate,
    setIsSettingsOpen,
    handleLogin,
    handleLogout,
    isRefreshing,
    isLoggingIn,
    isLoggingOut,
    refresh,
  } = useRouterState();

  return (
    <header className="flex w-full items-center justify-between">
      <div data-tauri-drag-region className="flex items-center gap-3" style={{ pointerEvents: "auto", cursor: "default" }}>
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
          <div data-tauri-drag-region className="flex items-center gap-3">
            <p data-tauri-drag-region style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Live Diagnostic Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Draggable spacer in the middle */}
      <div data-tauri-drag-region className="min-w-5 h-full flex-1 self-stretch" style={{ cursor: "default" }} />

      <div className="relative z-10 flex items-center gap-3">
        {/* Router API Connection Status */}
        <div id="connectionStatus" className="status-badge" title="Router API connection status">
          <div className={`status-dot ${isConnected ? "online" : ""}`} />
          <span style={{ fontSize: "0.75rem" }}>API: {isConnected ? "Connected" : "Offline"}</span>
        </div>

        {/* Polling & Refresh Controls */}
        <div className="flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-1">
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
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="refresh-btn"
            title={autoRefresh ? "Pause Auto-poll" : "Resume Auto-poll"}
            style={{
              padding: "0.3rem 0.5rem",
              background: autoRefresh ? "rgba(16, 185, 129, 0.12)" : "var(--surface-subtle)",
              borderColor: autoRefresh ? "rgba(16, 185, 129, 0.25)" : "var(--border)",
              color: autoRefresh ? "var(--success)" : "var(--text-dim)",
            }}
          >
            {autoRefresh ? "⏸ Pause" : "▶ Auto"}
          </button>

          {/* Manual Refresh button */}
          {!autoRefresh && (
            <button
              id="refreshBtn"
              onClick={refresh}
              className="refresh-btn"
              disabled={isRefreshing}
              title="Force manual refresh"
              style={{
                padding: "0.3rem 0.6rem",
                background: "linear-gradient(135deg, var(--accent-primary), #3b82f6)",
                border: "none",
                color: "var(--btn-on-accent)",
                boxShadow: "0 2px 8px var(--accent-primary-glow)",
              }}
            >
              {isRefreshing ? "⏳" : "🔄 Refresh"}
            </button>
          )}
        </div>

        {/* Administration / Settings */}
        <div className="flex gap-1">
          <button
            id="settingsBtn"
            onClick={() => setIsSettingsOpen(true)}
            className="refresh-btn"
            title="Open system configuration"
            style={{ padding: "0.45rem 0.75rem" }}
          >
            ⚙️ Settings
          </button>

          {isConnected ? (
            <button
              id="logoutBtn"
              onClick={handleLogout}
              className="refresh-btn"
              disabled={isLoggingOut}
              style={{ padding: "0.45rem 0.75rem" }}
            >
              {isLoggingOut ? "Logout..." : "Logout"}
            </button>
          ) : (
            <button
              id="loginBtn"
              onClick={handleLogin}
              className="refresh-btn"
              disabled={isLoggingIn}
              style={{
                padding: "0.45rem 0.75rem",
                background: "rgba(16, 185, 129, 0.12)",
                borderColor: "rgba(16, 185, 129, 0.35)",
                color: "var(--success)",
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
