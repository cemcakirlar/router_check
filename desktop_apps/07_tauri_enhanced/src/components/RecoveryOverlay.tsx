
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

interface RecoveryOverlayProps {
  isOpen: boolean;
  step: RecoveryStep;
  message: string;
  onAbort: () => void;
  logs: string[];
}

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

export default function RecoveryOverlay({
  isOpen,
  step,
  message,
  onAbort,
  logs,
}: RecoveryOverlayProps) {
  if (!isOpen) return null;

  // Calculate progress percentage
  let activeIndex = STEPS_CONFIG.findIndex((s) => s.id === step);
  if (step === "completed") activeIndex = STEPS_CONFIG.length;
  if (step === "failed") activeIndex = STEPS_CONFIG.length;

  const percent = Math.min(
    100,
    Math.round(((activeIndex === -1 ? 0 : activeIndex) / STEPS_CONFIG.length) * 100)
  );

  return (
    <div
      id="recoveryOverlay"
      data-tauri-drag-region
      className="fullscreen-overlay active"
      style={{
        zIndex: 9999,
        background: "rgba(10, 10, 12, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "all 0.3s ease",
      }}
    >
      <div
        className="overlay-card"
        style={{
          maxWidth: "540px",
          width: "90%",
          padding: "2rem",
          background: "rgba(20, 20, 25, 0.75)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2
              className="overlay-title"
              style={{
                fontSize: "1.3rem",
                color: "#a78bfa",
                letterSpacing: "1px",
                margin: 0,
                textAlign: "left",
              }}
            >
              CELL RECOVERY SEQUENCE
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", margin: "4px 0 0 0", textAlign: "left" }}>
              Re-initiating local tower attachment to recover SINR / signal performance.
            </p>
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              animation: step === "completed" || step === "failed" ? "none" : "spin 3s linear infinite",
            }}
          >
            {step === "completed" ? "✅" : step === "failed" ? "❌" : "⚡"}
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: "6px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "1.5rem",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${step === "completed" ? 100 : step === "failed" ? 100 : percent}%`,
              background: step === "failed" ? "var(--danger)" : "linear-gradient(90deg, #8b5cf6, #ec4899)",
              boxShadow: step === "failed" ? "none" : "0 0 10px rgba(139, 92, 246, 0.5)",
              borderRadius: "3px",
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Steps List */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            textAlign: "left",
            marginBottom: "1.5rem",
            maxHeight: "220px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {STEPS_CONFIG.map((cfg, index) => {
            const isDone = activeIndex > index || step === "completed";
            const isActive = activeIndex === index && step !== "failed";
            const isErr = step === "failed" && activeIndex === index;

            return (
              <div
                key={cfg.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  opacity: isActive ? 1 : isDone ? 0.8 : 0.4,
                  fontSize: "0.85rem",
                  transition: "opacity 0.2s ease",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  background: isActive ? "rgba(139, 92, 246, 0.08)" : "transparent",
                  border: isActive ? "1px solid rgba(139, 92, 246, 0.15)" : "1px solid transparent",
                }}
              >
                <div style={{ minWidth: "18px" }}>
                  {isDone ? (
                    <span style={{ color: "#34d399" }}>✓</span>
                  ) : isActive ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#a78bfa",
                        boxShadow: "0 0 8px #a78bfa",
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                  ) : isErr ? (
                    <span style={{ color: "var(--danger)" }}>✗</span>
                  ) : (
                    <span style={{ color: "var(--text-dim)" }}>○</span>
                  )}
                </div>
                <span
                  style={{
                    color: isActive ? "#d8b4fe" : isDone ? "var(--text-bright)" : "var(--text-dim)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live log / message box */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "6px",
            padding: "10px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: step === "failed" ? "#f87171" : "#a78bfa",
            textAlign: "left",
            marginBottom: "1.5rem",
            minHeight: "45px",
            maxHeight: "100px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", opacity: 0.8 }}>STATUS:</div>
          <div>{message}</div>
          {logs.slice(-2).map((log, idx) => (
            <div key={idx} style={{ opacity: 0.5, fontSize: "0.7rem", marginTop: "2px" }}>
              {log}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", gap: "0.8rem", width: "100%" }}>
          {step === "completed" || step === "failed" ? (
            <button
              onClick={onAbort}
              className="btn btn-primary"
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                borderColor: "#a78bfa",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
              }}
            >
              Dismiss
            </button>
          ) : (
            <button
              onClick={onAbort}
              className="btn btn-secondary"
              style={{
                width: "100%",
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
              }}
            >
              Abort / Cancel Sequence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
