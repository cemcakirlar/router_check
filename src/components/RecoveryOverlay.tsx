import type { CSSProperties } from "react";
import { useRouterState } from "../context/RouterStateContext";

export type RecoveryStep =
  | "idle"
  | "disconnecting"
  | "verifying_disconnect"
  | "setting_3g"
  | "verifying_3g"
  | "setting_auto"
  | "verifying_lte"
  | "connecting"
  | "verifying_connect"
  | "completed"
  | "failed";

const STEPS_CONFIG = [
  { id: "disconnecting", label: "Disconnect network connection" },
  { id: "verifying_disconnect", label: "Verify network status is disconnected" },
  { id: "setting_3g", label: "Change network preference to 3G/WCDMA" },
  { id: "verifying_3g", label: "Verify successful 3G network registration" },
  { id: "setting_auto", label: "Restore network preference to Auto (LTE/4G)" },
  { id: "verifying_lte", label: "Verify successful LTE network registration" },
  { id: "connecting", label: "Reconnect network connection" },
  { id: "verifying_connect", label: "Verify network status is connected" },
];

export default function RecoveryOverlay() {
  const {
    recoveryStep: step,
    recoveryMessage: message,
    recoveryLogs: logs,
    handleAbortRecovery: onAbort,
    dismissRecovery,
  } = useRouterState();

  const isOpen = step !== "idle";

  if (!isOpen) return null;

  let activeIndex = STEPS_CONFIG.findIndex((s) => s.id === step);
  if (step === "completed") activeIndex = STEPS_CONFIG.length;
  if (step === "failed") activeIndex = STEPS_CONFIG.length;

  const percent = Math.min(100, Math.round(((activeIndex === -1 ? 0 : activeIndex) / STEPS_CONFIG.length) * 100));
  const fillPercent = step === "completed" || step === "failed" ? 100 : percent;
  const fillStyle = { ["--fill-width" as string]: `${fillPercent}%` } as CSSProperties;
  const isTerminal = step === "completed" || step === "failed";

  return (
    <div id="recoveryOverlay" data-tauri-drag-region className="fullscreen-overlay active recovery-overlay">
      <div className="overlay-card recovery-card">
        <div className="recovery-header">
          <div>
            <h2 className="overlay-title recovery-title">CELL RECOVERY SEQUENCE</h2>
            <p className="recovery-subtitle">Re-initiating local tower attachment to recover SINR / signal performance.</p>
          </div>
          <div className={`recovery-icon ${isTerminal ? "" : "is-spinning"}`}>
            {step === "completed" ? "✅" : step === "failed" ? "❌" : "⚡"}
          </div>
        </div>

        <div className="recovery-progress">
          <div className={`recovery-progress-fill ${step === "failed" ? "is-failed" : ""}`} style={fillStyle} />
        </div>

        <div className="recovery-steps">
          {STEPS_CONFIG.map((cfg, index) => {
            const isDone = activeIndex > index || step === "completed";
            const isActive = activeIndex === index && step !== "failed";
            const isErr = step === "failed" && activeIndex === index;
            const stepClass = isActive ? "is-active" : isDone ? "is-done" : "is-pending";

            return (
              <div key={cfg.id} className={`recovery-step ${stepClass}`}>
                <div className="recovery-step-icon">
                  {isDone ? (
                    <span className="text-success">✓</span>
                  ) : isActive ? (
                    <span className="recovery-pulse" />
                  ) : isErr ? (
                    <span className="text-danger">✗</span>
                  ) : (
                    <span className="text-dim">○</span>
                  )}
                </div>
                <span className="recovery-step-label">{cfg.label}</span>
              </div>
            );
          })}
        </div>

        <div className={`recovery-status ${step === "failed" ? "is-failed" : ""}`}>
          <div className="recovery-status-label">STATUS:</div>
          <div>{message}</div>
          {logs.slice(-2).map((log, idx) => (
            <div key={idx} className="recovery-status-log">
              {log}
            </div>
          ))}
        </div>

        <div className="recovery-actions">
          {isTerminal ? (
            <button onClick={dismissRecovery} className="btn btn-primary btn-recovery-dismiss">
              Dismiss
            </button>
          ) : (
            <button onClick={onAbort} className="btn btn-secondary btn-recovery-abort">
              Abort / Cancel Sequence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
