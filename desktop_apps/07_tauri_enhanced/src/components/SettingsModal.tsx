import { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  initialIp: string;
  initialPassword: string;
  onCancel: () => void;
  onSave: (ip: string, password: string) => Promise<void>;
}

export default function SettingsModal({
  isOpen,
  initialIp,
  initialPassword,
  onCancel,
  onSave,
}: SettingsModalProps) {
  const [ip, setIp] = useState(initialIp);
  const [password, setPassword] = useState(initialPassword);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setIp(initialIp);
      setPassword(initialPassword);
    }
  }, [isOpen, initialIp, initialPassword]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(ip, password);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="settingsOverlay"
      data-tauri-drag-region
      className={`fullscreen-overlay ${isOpen ? 'active' : ''}`}
    >
      <div className="overlay-card">
        <h2 className="overlay-title">Router Settings</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textAlign: 'left' }}>
          Provide the IP address and admin password for your ZTE router.
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
          <div className="form-actions">
            <button
              id="settingsCancelBtn"
              onClick={onCancel}
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
