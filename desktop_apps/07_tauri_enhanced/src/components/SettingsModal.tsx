import { useState, useEffect } from 'react';
import { useRouterState } from '../context/RouterStateContext';

export default function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    routerIp: initialIp,
    routerPassword: initialPassword,
    autoRefreshInterval: initialAutoRefreshInterval,
    autoRefreshOnStartup: initialAutoRefreshOnStartup,
    mainWindowOnStartup: initialMainWindowOnStartup,
    handleSaveSettings: onSave,
  } = useRouterState();

  const [ip, setIp] = useState(initialIp);
  const [password, setPassword] = useState(initialPassword);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(initialAutoRefreshInterval);
  const [autoRefreshOnStartup, setAutoRefreshOnStartup] = useState(initialAutoRefreshOnStartup);
  const [mainWindowOnStartup, setMainWindowOnStartup] = useState(initialMainWindowOnStartup);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isSettingsOpen) {
      setIp(initialIp);
      setPassword(initialPassword);
      setAutoRefreshInterval(initialAutoRefreshInterval);
      setAutoRefreshOnStartup(initialAutoRefreshOnStartup);
      setMainWindowOnStartup(initialMainWindowOnStartup);
    }
  }, [
    isSettingsOpen,
    initialIp,
    initialPassword,
    initialAutoRefreshInterval,
    initialAutoRefreshOnStartup,
    initialMainWindowOnStartup,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(ip, password, autoRefreshInterval, autoRefreshOnStartup, mainWindowOnStartup);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="settingsOverlay"
      data-tauri-drag-region
      className={`fullscreen-overlay ${isSettingsOpen ? 'active' : ''}`}
    >
      <div className="overlay-card" style={{ maxWidth: '480px' }}>
        <h2 className="overlay-title">Router Settings</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textAlign: 'left', width: '100%' }}>
          Provide the IP address, admin credentials, and application behavior settings.
        </p>
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="settingsIp">Router IP Address</label>
            <input
              type="text"
              id="settingsIp"
              className="form-input"
              placeholder="192.168.0.1"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="settingsPassword">Admin Password</label>
            <input
              type="password"
              id="settingsPassword"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settingsInterval">Auto Refresh Polling Interval (ms)</label>
            <input
              type="number"
              id="settingsInterval"
              className="form-input"
              min="500"
              step="100"
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value) || 2000)}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
            <input
              type="checkbox"
              id="settingsAutoRefreshOnStartup"
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              checked={autoRefreshOnStartup}
              onChange={(e) => setAutoRefreshOnStartup(e.target.checked)}
            />
            <label htmlFor="settingsAutoRefreshOnStartup" style={{ cursor: 'pointer', textTransform: 'none', marginBottom: 0 }}>
              Auto Refresh on Startup
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="settingsMainWindowOnStartup">Main Window Initial Status</label>
            <select
              id="settingsMainWindowOnStartup"
              className="form-input"
              style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'var(--text-main)', cursor: 'pointer' }}
              value={mainWindowOnStartup}
              onChange={(e) => setMainWindowOnStartup(e.target.value)}
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              id="settingsCancelBtn"
              onClick={() => setIsSettingsOpen(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              id="settingsSaveBtn"
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
