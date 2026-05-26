import { FormatBytes, formatTime } from '../utils/format';

interface UsageCardProps {
  monthlyRx: number | null;
  monthlyTx: number | null;
  monthlyTime: number | null;
  provider: string;
  networkType: string;
}

export default function UsageCard({
  monthlyRx,
  monthlyTx,
  monthlyTime,
  provider,
  networkType,
}: UsageCardProps) {
  const totalUsage = (monthlyRx || 0) + (monthlyTx || 0);

  return (
    <div className="card md:col-span-4">
      <div className="card-title">📊 Monthly Data</div>
      <div className="big-value">
        <FormatBytes bytes={totalUsage} />
      </div>
      <div className="sub-value">
        {formatTime(monthlyTime)}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.8rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '0.4rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="sub-value">Monthly DL</div>
          <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            <FormatBytes bytes={monthlyRx} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="sub-value">Monthly UL</div>
          <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            <FormatBytes bytes={monthlyTx} />
          </div>
        </div>
      </div>
      <div style={{ marginTop: '0.8rem' }} className="sub-value">
        Provider:{' '}
        <span style={{ color: 'var(--text-main)' }}>{provider || '--'}</span>
        <span style={{ margin: '0 0.4rem', opacity: 0.3 }}>|</span>
        Type:{' '}
        <span style={{ color: 'var(--text-main)' }}>{networkType || '--'}</span>
      </div>
    </div>
  );
}
