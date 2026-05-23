import Sparkline from './Sparkline';

interface SignalCardProps {
  rsrp: number | null;
  sinr: number | null;
  cellId: string;
  earfcn: string;
  rsrpHistory: number[];
  sinrHistory: number[];
  bearerPreference?: string;
  onSetBearerPreference?: (preference: string) => void;
}

function Grade({
  value,
  thresholds,
}: {
  value: number | null;
  thresholds: { excellent: number; good: number; fair: number };
}) {
  if (value === null || isNaN(value)) return <span>--</span>;
  if (value >= thresholds.excellent) {
    return (
      <span style={{ color: 'var(--success)', textShadow: '0 0 10px var(--success-glow)' }}>
        Excellent
      </span>
    );
  }
  if (value >= thresholds.good) {
    return (
      <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 10px var(--accent-primary-glow)' }}>
        Good
      </span>
    );
  }
  if (value >= thresholds.fair) {
    return <span style={{ color: 'var(--warning)' }}>Fair</span>;
  }
  return (
    <span style={{ color: 'var(--danger)', textShadow: '0 0 10px var(--danger-glow)' }}>
      Poor
    </span>
  );
}

export default function SignalCard({
  rsrp,
  sinr,
  cellId,
  earfcn,
  rsrpHistory,
  sinrHistory,
  bearerPreference = 'Network_Auto',
  onSetBearerPreference,
}: SignalCardProps) {
  // Calculations for fill percentage
  const rsrpPct = rsrp !== null ? Math.min(Math.max(((rsrp + 120) / 60) * 100, 0), 100) : 0;
  const sinrPct = sinr !== null ? Math.min(Math.max((sinr / 20) * 100, 0), 100) : 0;

  // Stats calculation
  const getRsrpStats = () => {
    if (rsrpHistory.length === 0) return { min: '--', max: '--', avg: '--' };
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
    if (sinrHistory.length === 0) return { min: '--', max: '--', avg: '--' };
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

  return (
    <div className="card">
      <div className="card-title">📶 Network & Signal</div>
      <div className="signal-grid">
        {/* RSRP Panel */}
        <div>
          <div className="sub-value">RSRP (Strength)</div>
          <div className="big-value">
            {rsrp !== null ? (
              <>
                {rsrp} <small className="unit">dBm</small>
              </>
            ) : (
              '--'
            )}
          </div>
          <div className="signal-meter">
            <div className="signal-fill" style={{ width: `${rsrpPct}%` }} />
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>
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

        {/* SINR Panel */}
        <div>
          <div className="sub-value">SINR (Quality)</div>
          <div className="big-value">
            {sinr !== null ? (
              <>
                {sinr} <small className="unit">dB</small>
              </>
            ) : (
              '--'
            )}
          </div>
          <div className="signal-meter">
            <div className="signal-fill" style={{ width: `${sinrPct}%` }} />
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 600 }}>
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
      <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="sub-value">
          Cell ID:{' '}
          <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            {cellId || '--'}
          </span>
        </div>
        <div className="sub-value">
          EARFCN:{' '}
          <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            {earfcn || '--'}
          </span>
        </div>
      </div>
      <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.8rem' }}>
        <div className="sub-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
          <span>Technology Lock:</span>
          <select
            value={bearerPreference}
            onChange={(e) => onSetBearerPreference?.(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border)',
              borderRadius: '0.35rem',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            <option value="Network_Auto">Auto Mode</option>
            <option value="Only_LTE">4G Only</option>
            <option value="Only_5G">5G Only</option>
          </select>
        </div>
      </div>
    </div>
  );
}
