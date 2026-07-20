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
      <div data-tauri-drag-region className="drag-hit flex items-center gap-3">
        <img data-tauri-drag-region src={logoUrl} alt="Logo" className="header-logo" />
        <div data-tauri-drag-region className="drag-ignore">
          <h1 data-tauri-drag-region>ROUTER CHECK</h1>
          <div data-tauri-drag-region className="flex items-center gap-3">
            <p data-tauri-drag-region className="header-subtitle">
              Live Diagnostic Dashboard
            </p>
          </div>
        </div>
      </div>

      <div data-tauri-drag-region className="cursor-default min-w-5 h-full flex-1 self-stretch" />

      <div className="relative z-10 flex items-center gap-3">
        <div id="connectionStatus" className="status-badge" title="Router API connection status">
          <div className={`status-dot ${isConnected ? "online" : ""}`} />
          <span className="status-label">API: {isConnected ? "Connected" : "Offline"}</span>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface-muted) px-2 py-1">
          {lastUpdate && (
            <span id="lastUpdate" className="last-update">
              {lastUpdate.replace("UPDATED: ", "")}
            </span>
          )}

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`refresh-btn btn-compact ${autoRefresh ? "btn-success-soft" : "btn-dim"}`}
            title={autoRefresh ? "Pause Auto-poll" : "Resume Auto-poll"}
          >
            {autoRefresh ? "⏸ Pause" : "▶ Auto"}
          </button>

          {!autoRefresh && (
            <button
              id="refreshBtn"
              onClick={refresh}
              className="refresh-btn btn-compact-md"
              disabled={isRefreshing}
              title="Force manual refresh"
            >
              {isRefreshing ? "⏳" : "🔄 Refresh"}
            </button>
          )}
        </div>

        <div className="flex gap-1">
          <button
            id="settingsBtn"
            onClick={() => setIsSettingsOpen(true)}
            className="refresh-btn btn-header"
            title="Open system configuration"
          >
            ⚙️ Settings
          </button>

          {isConnected ? (
            <button id="logoutBtn" onClick={handleLogout} className="refresh-btn btn-header" disabled={isLoggingOut}>
              {isLoggingOut ? "Logout..." : "Logout"}
            </button>
          ) : (
            <button id="loginBtn" onClick={handleLogin} className="refresh-btn btn-login" disabled={isLoggingIn}>
              {isLoggingIn ? "Login..." : "Login"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
