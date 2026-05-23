import Sparkline from './Sparkline';
import { FormatBytes, FormatSpeed } from '../utils/format';

interface RealtimeCardProps {
  dlSpeed: number | null;
  ulSpeed: number | null;
  totalSessionBytes: number | null;
  dlHistory: number[];
  ulHistory: number[];
}

export default function RealtimeCard({
  dlSpeed,
  ulSpeed,
  totalSessionBytes,
  dlHistory,
  ulHistory,
}: RealtimeCardProps) {
  const getSpeedStats = (history: number[]) => {
    if (history.length === 0) return { min: '--', max: '--', avg: '--' };
    const min = Math.min(...history);
    const max = Math.max(...history);
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    return {
      min: <FormatSpeed bps={min} />,
      max: <FormatSpeed bps={max} />,
      avg: <FormatSpeed bps={avg} />,
    };
  };

  const dlStats = getSpeedStats(dlHistory);
  const ulStats = getSpeedStats(ulHistory);

  return (
    <div className="card">
      <div className="card-title">⚡ Realtime Speeds</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        {/* Download Rate */}
        <div style={{ flex: 1 }}>
          <div className="sub-value">Download</div>
          <div className="big-value" style={{ color: 'var(--accent-primary)' }}>
            <FormatSpeed bps={dlSpeed} />
          </div>
          <div className="sparkline-container">
            <Sparkline points={dlHistory} isUpload={false} />
          </div>
          <div className="stats-grid">
            <div className="stat-row">
              <span>Min</span>
              <b>{dlStats.min}</b>
            </div>
            <div className="stat-row">
              <span>Avg</span>
              <b>{dlStats.avg}</b>
            </div>
            <div className="stat-row">
              <span>Max</span>
              <b>{dlStats.max}</b>
            </div>
          </div>
        </div>

        {/* Upload Rate */}
        <div style={{ flex: 1 }}>
          <div className="sub-value">Upload</div>
          <div className="big-value" style={{ color: 'var(--accent-secondary)' }}>
            <FormatSpeed bps={ulSpeed} />
          </div>
          <div className="sparkline-container">
            <Sparkline points={ulHistory} isUpload={true} />
          </div>
          <div className="stats-grid">
            <div className="stat-row">
              <span>Min</span>
              <b>{ulStats.min}</b>
            </div>
            <div className="stat-row">
              <span>Avg</span>
              <b>{ulStats.avg}</b>
            </div>
            <div className="stat-row">
              <span>Max</span>
              <b>{ulStats.max}</b>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '0.8rem' }} className="sub-value">
        Total session:{' '}
        <span style={{ color: 'var(--text-main)' }}>
          <FormatBytes bytes={totalSessionBytes} />
        </span>
      </div>
    </div>
  );
}
