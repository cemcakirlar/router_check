import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useRouterState } from "../context/RouterStateContext";
import { ThemeMode } from "../types";
import { applyThemeMode, normalizeThemeMode } from "../utils/theme";

export default function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    routerIp: initialIp,
    routerPassword: initialPassword,
    autoRefreshInterval: initialAutoRefreshInterval,
    autoRefreshOnStartup: initialAutoRefreshOnStartup,
    mainWindowOnStartup: initialMainWindowOnStartup,
    themeMode: initialThemeMode,
    handleSaveSettings: onSave,
  } = useRouterState();

  const [ip, setIp] = useState(initialIp);
  const [password, setPassword] = useState(initialPassword);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(initialAutoRefreshInterval);
  const [autoRefreshOnStartup, setAutoRefreshOnStartup] = useState(initialAutoRefreshOnStartup);
  const [mainWindowOnStartup, setMainWindowOnStartup] = useState(initialMainWindowOnStartup);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [isSaving, setIsSaving] = useState(false);
  const [ipError, setIpError] = useState("");
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    let cancelled = false;
    getVersion()
      .then((version) => {
        if (!cancelled) setAppVersion(version);
      })
      .catch(() => {
        if (!cancelled) setAppVersion("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      setIp(initialIp);
      setPassword(initialPassword);
      setAutoRefreshInterval(initialAutoRefreshInterval);
      setAutoRefreshOnStartup(initialAutoRefreshOnStartup);
      setMainWindowOnStartup(initialMainWindowOnStartup);
      setThemeMode(initialThemeMode);
      setIpError("");
    }
  }, [
    isSettingsOpen,
    initialIp,
    initialPassword,
    initialAutoRefreshInterval,
    initialAutoRefreshOnStartup,
    initialMainWindowOnStartup,
    initialThemeMode,
  ]);

  useEffect(() => {
    if (!isSettingsOpen) {
      applyThemeMode(initialThemeMode);
    }
  }, [isSettingsOpen, initialThemeMode]);

  const isValidRouterHost = (host: string): boolean => {
    const trimmed = host.trim();
    if (!trimmed || trimmed.length > 253) return false;
    const hostOnly = (() => {
      const idx = trimmed.lastIndexOf(":");
      if (idx > 0) {
        const port = trimmed.slice(idx + 1);
        if (/^\d+$/.test(port)) return trimmed.slice(0, idx);
      }
      return trimmed;
    })();
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostOnly)) {
      return hostOnly.split(".").every((o) => {
        const n = Number(o);
        return o.length > 0 && n >= 0 && n <= 255;
      });
    }
    return /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(hostOnly);
  };

  const handleThemeChange = (next: ThemeMode) => {
    const normalized = normalizeThemeMode(next);
    setThemeMode(normalized);
    applyThemeMode(normalized);
  };

  const handleSave = async () => {
    if (!isValidRouterHost(ip)) {
      setIpError("Enter a valid IPv4 address or hostname");
      return;
    }
    setIpError("");
    setIsSaving(true);
    try {
      await onSave(ip.trim(), password, autoRefreshInterval, autoRefreshOnStartup, mainWindowOnStartup, themeMode);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="settingsOverlay" data-tauri-drag-region className={`fullscreen-overlay ${isSettingsOpen ? "active" : ""}`}>
      <div className="overlay-card overlay-card-sm">
        <h2 className="overlay-title">Router Settings</h2>
        <p className="settings-intro">Provide the IP address, admin credentials, and application behavior settings.</p>
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="settingsIp">Router IP Address</label>
            <input
              type="text"
              id="settingsIp"
              className="form-input"
              placeholder="192.168.0.1"
              value={ip}
              onChange={(e) => {
                setIp(e.target.value);
                setIpError("");
              }}
            />
            {ipError ? <p className="form-error">{ipError}</p> : null}
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

          <div className="form-group form-check">
            <input
              type="checkbox"
              id="settingsAutoRefreshOnStartup"
              className="form-check-input"
              checked={autoRefreshOnStartup}
              onChange={(e) => setAutoRefreshOnStartup(e.target.checked)}
            />
            <label htmlFor="settingsAutoRefreshOnStartup" className="form-check-label">
              Auto Refresh on Startup
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="settingsMainWindowOnStartup">Main Window Initial Status</label>
            <select
              id="settingsMainWindowOnStartup"
              className="form-input form-select"
              value={mainWindowOnStartup}
              onChange={(e) => setMainWindowOnStartup(e.target.value)}
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="settingsThemeMode">Theme</label>
            <select
              id="settingsThemeMode"
              className="form-input form-select"
              value={themeMode}
              onChange={(e) => handleThemeChange(normalizeThemeMode(e.target.value))}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="form-actions">
            <button id="settingsCancelBtn" onClick={() => setIsSettingsOpen(false)} className="btn btn-secondary" disabled={isSaving}>
              Cancel
            </button>
            <button id="settingsSaveBtn" onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <p className="settings-app-version">Router Check {appVersion ? `v${appVersion}` : "—"}</p>
        </div>
      </div>
    </div>
  );
}
