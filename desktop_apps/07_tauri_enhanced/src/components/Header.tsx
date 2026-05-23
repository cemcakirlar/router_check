import logoUrl from '/icon.png';

interface HeaderProps {
  isConnected: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (checked: boolean) => void;
  lastUpdate: string;
  onOpenSettings: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
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
    <header data-tauri-drag-region>
      <div
        data-tauri-drag-region
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', pointerEvents: 'none' }}
      >
        <img
          data-tauri-drag-region
          src={logoUrl}
          alt="Logo"
          style={{
            width: '38px',
            height: '38px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 8px var(--accent-primary-glow))',
          }}
        />
        <div data-tauri-drag-region>
          <h1 data-tauri-drag-region style={{ pointerEvents: 'none' }}>
            ROUTER CHECK
          </h1>
          <div
            data-tauri-drag-region
            style={{ display: 'flex', gap: '1rem', alignItems: 'center', pointerEvents: 'none' }}
          >
            <p data-tauri-drag-region style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Live Diagnostic Dashboard
            </p>
            <p
              data-tauri-drag-region
              id="lastUpdate"
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
              }}
            >
              {lastUpdate}
            </p>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <div id="connectionStatus" className="status-badge">
          <div className={`status-dot ${isConnected ? 'online' : ''}`} />
          <span>{isConnected ? 'Connected' : 'Offline'}</span>
        </div>
        <div className="auto-toggle">
          <input
            type="checkbox"
            id="autoRefresh"
            style={{ cursor: 'pointer' }}
            checked={autoRefresh}
            onChange={(e) => onToggleAutoRefresh(e.target.checked)}
          />
          <label
            htmlFor="autoRefresh"
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--text-dim)',
              letterSpacing: '0.5px',
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
            {isLoggingOut ? 'LOGGING OUT...' : 'LOGOUT'}
          </button>
        ) : (
          <button id="loginBtn" onClick={onLogin} className="refresh-btn" disabled={isLoggingIn}>
            {isLoggingIn ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        )}
        {!autoRefresh && (
          <button
            id="refreshBtn"
            onClick={onRefresh}
            className="refresh-btn"
            disabled={isRefreshing}
            style={{ display: 'flex' }}
          >
            {isRefreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>
        )}
      </div>
    </header>
  );
}
