import "./style.css";

// Component Imports
import Header from "./components/Header";
import BootstrapOverlay from "./components/BootstrapOverlay";
import SettingsModal from "./components/SettingsModal";
import SignalCard from "./components/SignalCard";
import UsageCard from "./components/UsageCard";
import RealtimeCard from "./components/RealtimeCard";
import InfoCard from "./components/InfoCard";
import DevicesTable from "./components/DevicesTable";
import LogsCard from "./components/LogsCard";
import RecoveryOverlay from "./components/RecoveryOverlay";
import { RouterStateProvider, useRouterState } from "./context/RouterStateContext";

// Check if running inside Tauri
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

export default function App() {
  if (!isTauri) {
    return (
      <div className="fullscreen-overlay active" style={{ zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="overlay-card" style={{ maxWidth: "480px", textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>🖥️</div>
          <h2 className="overlay-title" style={{ color: "#ff4949", letterSpacing: "2px", marginBottom: "1rem" }}>
            DESKTOP MODE REQUIRED
          </h2>
          <div className="progress-text" style={{ margin: "1rem 0", lineHeight: 1.6, fontSize: "0.95rem" }}>
            This application requires native integration and cannot communicate with your router directly from a web browser.
          </div>
          <div style={{ marginTop: "1.5rem", fontSize: "0.85rem", opacity: 0.8 }}>
            Please run the desktop app or start it via:
            <code
              style={{
                display: "block",
                padding: "8px 12px",
                background: "var(--surface-inset)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                marginTop: "8px",
                color: "var(--accent-primary)",
                fontFamily: "monospace",
              }}
            >
              npm run dev
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RouterStateProvider>
      <RouterDashboard />
    </RouterStateProvider>
  );
}

function RouterDashboard() {
  const { toasts, setToasts } = useRouterState();

  return (
    <>
      {/* Toast Notifications */}
      <div id="toastContainer" className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
            <span
              style={{ marginLeft: "10px", cursor: "pointer", opacity: 0.7 }}
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
            >
              ✕
            </span>
          </div>
        ))}
      </div>

      {/* Bootstrap Connection Loader Overlay */}
      <BootstrapOverlay />

      {/* Router Credentials Settings Modal */}
      <SettingsModal />

      {/* Recovery Process Overlay */}
      <RecoveryOverlay />

      {/* Main Container */}
      <div className="container">
        <Header />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Signal Card */}
          <SignalCard />

          {/* Realtime Rate speeds */}
          <RealtimeCard />

          {/* Network configurations, firmware info, stats */}
          <InfoCard />

          {/* Monthly Usage Card */}
          <UsageCard />

          {/* Router change logs */}
          <LogsCard />

          {/* Client devices active/static list tables */}
          <DevicesTable />
        </div>
      </div>
    </>
  );
}
