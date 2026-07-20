import "./style.css";

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

const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

export default function App() {
  if (!isTauri) {
    return (
      <div className="fullscreen-overlay active desktop-gate">
        <div className="overlay-card desktop-gate-card">
          <div className="desktop-gate-icon">🖥️</div>
          <h2 className="overlay-title desktop-gate-title">DESKTOP MODE REQUIRED</h2>
          <div className="progress-text desktop-gate-body">
            This application requires native integration and cannot communicate with your router directly from a web browser.
          </div>
          <div className="desktop-gate-hint">
            Please run the desktop app or start it via:
            <code className="desktop-gate-code">npm run dev</code>
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
      <div id="toastContainer" className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
            <span className="toast-dismiss" onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}>
              ✕
            </span>
          </div>
        ))}
      </div>

      <BootstrapOverlay />
      <SettingsModal />
      <RecoveryOverlay />

      <div className="container">
        <Header />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <SignalCard />
          <RealtimeCard />
          <InfoCard />
          <UsageCard />
          <LogsCard />
          <DevicesTable />
        </div>
      </div>
    </>
  );
}
