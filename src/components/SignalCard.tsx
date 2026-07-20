import Sparkline from "./Sparkline";
import { useRouterState } from "../context/RouterStateContext";
import type { CSSProperties } from "react";

function Grade({ value, thresholds }: { value: number | null; thresholds: { excellent: number; good: number; fair: number } }) {
  if (value === null || isNaN(value)) return <span>--</span>;
  if (value >= thresholds.excellent) {
    return <span className="text-glow-success">Excellent</span>;
  }
  if (value >= thresholds.good) {
    return <span className="text-glow-accent">Good</span>;
  }
  if (value >= thresholds.fair) {
    return <span className="text-warning">Fair</span>;
  }
  return <span className="text-glow-danger">Poor</span>;
}

export default function SignalCard() {
  const { rsrp, sinr, cellId, earfcn, rsrpHistory, sinrHistory, isConnected, handleCellRecovery, recoveryStep } = useRouterState();

  const isRecovering = recoveryStep !== "idle";

  const rsrpPct = rsrp !== null ? Math.min(Math.max(((rsrp + 120) / 60) * 100, 0), 100) : 0;
  const sinrPct = sinr !== null ? Math.min(Math.max((sinr / 20) * 100, 0), 100) : 0;

  const getRsrpStats = () => {
    if (rsrpHistory.length === 0) return { min: "--", max: "--", avg: "--" };
    const min = Math.min(...rsrpHistory);
    const max = Math.max(...rsrpHistory);
    const avg = rsrpHistory.reduce((a, b) => a + b, 0) / rsrpHistory.length;
    return {
      min: `${min.toFixed(0)} dBm`,
      max: `${max.toFixed(0)} dBm`,
      avg: `${avg.toFixed(0)} dBm`,
    };
  };

  const getSinrStats = () => {
    if (sinrHistory.length === 0) return { min: "--", max: "--", avg: "--" };
    const min = Math.min(...sinrHistory);
    const max = Math.max(...sinrHistory);
    const avg = sinrHistory.reduce((a, b) => a + b, 0) / sinrHistory.length;
    return {
      min: `${min.toFixed(1)} dB`,
      max: `${max.toFixed(1)} dB`,
      avg: `${avg.toFixed(1)} dB`,
    };
  };

  const rsrpStats = getRsrpStats();
  const sinrStats = getSinrStats();

  const rsrpFillStyle = { ["--fill-width" as string]: `${rsrpPct}%` } as CSSProperties;
  const sinrFillStyle = { ["--fill-width" as string]: `${sinrPct}%` } as CSSProperties;

  return (
    <div className="card md:col-span-4">
      <div className="card-title">📶 Network & Signal</div>
      <div className="signal-grid">
        <div>
          <div className="sub-value">RSRP (Strength)</div>
          <div className="big-value">
            {rsrp !== null ? (
              <>
                {rsrp} <small className="unit">dBm</small>
              </>
            ) : (
              "--"
            )}
          </div>
          <div className="signal-meter">
            <div className="signal-fill" style={rsrpFillStyle} />
          </div>
          <div className="grade-label">
            <Grade value={rsrp} thresholds={{ excellent: -80, good: -90, fair: -105 }} />
          </div>
          <div className="sparkline-container">
            <Sparkline points={rsrpHistory} isUpload={false} />
          </div>
          <div className="stats-grid">
            <div className="stat-row">
              <span>Min</span>
              <b>{rsrpStats.min}</b>
            </div>
            <div className="stat-row">
              <span>Avg</span>
              <b>{rsrpStats.avg}</b>
            </div>
            <div className="stat-row">
              <span>Max</span>
              <b>{rsrpStats.max}</b>
            </div>
          </div>
        </div>

        <div>
          <div className="sub-value">SINR (Quality)</div>
          <div className="big-value">
            {sinr !== null ? (
              <>
                {sinr} <small className="unit">dB</small>
              </>
            ) : (
              "--"
            )}
          </div>
          <div className="signal-meter">
            <div className="signal-fill" style={sinrFillStyle} />
          </div>
          <div className="grade-label">
            <Grade value={sinr} thresholds={{ excellent: 15, good: 10, fair: 5 }} />
          </div>
          <div className="sparkline-container">
            <Sparkline points={sinrHistory} isUpload={false} />
          </div>
          <div className="stats-grid">
            <div className="stat-row">
              <span>Min</span>
              <b>{sinrStats.min}</b>
            </div>
            <div className="stat-row">
              <span>Avg</span>
              <b>{sinrStats.avg}</b>
            </div>
            <div className="stat-row">
              <span>Max</span>
              <b>{sinrStats.max}</b>
            </div>
          </div>
        </div>
      </div>
      <div className="row-between-baseline mt-sm">
        <div className="sub-value">
          Cell ID: <span className="text-main font-strong">{cellId || "--"}</span>
        </div>
        <div className="sub-value">
          EARFCN: <span className="text-main font-strong">{earfcn || "--"}</span>
        </div>
      </div>

      {isConnected && (
        <div className="card-section">
          <button
            id="cellRecoveryBtn"
            onClick={handleCellRecovery}
            disabled={isRecovering}
            className="refresh-btn refresh-btn-block btn-accent-soft"
          >
            {isRecovering ? "⚡ RECOVERING..." : "⚡ RECOVER CELL"}
          </button>
        </div>
      )}
    </div>
  );
}
