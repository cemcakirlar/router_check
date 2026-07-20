import { useRouterState } from "../context/RouterStateContext";

export default function BootstrapOverlay() {
  const { isBootstrapOpen, bootstrapHasError, routerIp, refresh, setIsSettingsOpen } = useRouterState();

  return (
    <div id="bootstrapOverlay" data-tauri-drag-region className={`fullscreen-overlay ${isBootstrapOpen ? "active" : ""}`}>
      <div className="overlay-card">
        {!bootstrapHasError && (
          <div className="spinner-container">
            <div className="spinner-glow" />
            <div className="spinner" />
          </div>
        )}
        <h2 className="overlay-title">{bootstrapHasError ? "CONNECTION FAILURE" : "INITIALIZING CONNECTION"}</h2>
        <div className="progress-text">
          {bootstrapHasError ? (
            <span className="text-danger font-semibold">Could not connect to router at {routerIp}. Check settings or password.</span>
          ) : (
            `Connecting to router at ${routerIp}...`
          )}
        </div>

        {bootstrapHasError ? (
          <div className="form-actions mt-md">
            <button onClick={() => setIsSettingsOpen(true)} className="btn btn-secondary">
              Settings
            </button>
            <button onClick={refresh} className="btn btn-primary">
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
