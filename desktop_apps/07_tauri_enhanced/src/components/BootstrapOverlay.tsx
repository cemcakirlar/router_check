interface BootstrapOverlayProps {
  isOpen: boolean;
  hasError: boolean;
  routerIp: string;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export default function BootstrapOverlay({
  isOpen,
  hasError,
  routerIp,
  onRetry,
  onOpenSettings,
}: BootstrapOverlayProps) {
  return (
    <div
      id="bootstrapOverlay"
      data-tauri-drag-region
      className={`fullscreen-overlay ${isOpen ? 'active' : ''}`}
    >
      <div className="overlay-card">
        {!hasError && (
          <div className="spinner-container">
            <div className="spinner-glow" />
            <div className="spinner" />
          </div>
        )}
        <h2 className="overlay-title">
          {hasError ? 'CONNECTION FAILURE' : 'INITIALIZING CONNECTION'}
        </h2>
        <div className="progress-text">
          {hasError ? (
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
              Could not connect to router at {routerIp}. Check settings or password.
            </span>
          ) : (
            `Connecting to router at ${routerIp}...`
          )}
        </div>
        
        <div
          className="form-actions"
          style={{ display: hasError ? 'flex' : 'none', marginTop: '1rem', width: '100%' }}
        >
          <button onClick={onOpenSettings} className="btn btn-secondary">
            Settings
          </button>
          <button onClick={onRetry} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
