import { useState } from 'react';

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  rsrp: string;
  sinr: string;
}

interface LogsCardProps {
  logs: ChangeLogEntry[];
  onClear: () => void;
}

export default function LogsCard({ logs, onClear }: LogsCardProps) {
  const [filterField, setFilterField] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterField === 'all') return true;
    if (filterField === 'cell_id') return log.field === 'Cell ID';
    if (filterField === 'network_type') return log.field === 'Network Type';
    if (filterField === 'rsrp') return log.field === 'RSRP';
    if (filterField === 'sinr') return log.field === 'SINR';
    return true;
  });

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Field', 'Old Value', 'New Value', 'RSRP (dBm)', 'SINR (dB)'];
    const rows = logs.map((log) => [
      log.timestamp,
      log.field,
      log.oldValue,
      log.newValue,
      log.rsrp,
      log.sinr,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `router_change_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card md:col-span-12">
      <div
        className="card-title"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          📋 Router Telemetry Change Log ({filteredLogs.length})
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '4px 8px',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Events</option>
            <option value="cell_id">Cell ID Only</option>
            <option value="network_type">Network Type Only</option>
            <option value="rsrp">RSRP Only</option>
            <option value="sinr">SINR Only</option>
          </select>
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="refresh-btn"
            style={{ padding: '4px 8px', fontSize: '0.65rem' }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="refresh-btn"
            style={{
              padding: '4px 8px',
              fontSize: '0.65rem',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: 'var(--danger)',
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          width: '100%',
          marginTop: '10px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <table style={{ margin: 0 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#111827', zIndex: 1 }}>
            <tr>
              <th style={{ width: '180px' }}>Timestamp</th>
              <th style={{ width: '120px' }}>Parameter</th>
              <th>Change Details</th>
              <th style={{ width: '110px' }}>RSRP</th>
              <th style={{ width: '100px' }}>SINR</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-dim)' }}>{log.timestamp}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        background:
                          log.field === 'Cell ID'
                            ? 'rgba(0, 242, 255, 0.15)'
                            : log.field === 'Network Type'
                            ? 'rgba(139, 92, 246, 0.15)'
                            : log.field === 'RSRP'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : log.field === 'SINR'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(255, 255, 255, 0.08)',
                        color:
                          log.field === 'Cell ID'
                            ? 'var(--accent-primary)'
                            : log.field === 'Network Type'
                            ? 'var(--accent-secondary)'
                            : log.field === 'RSRP'
                            ? 'var(--success)'
                            : log.field === 'SINR'
                            ? 'var(--warning)'
                            : 'var(--text-main)',
                      }}
                    >
                      {log.field}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>
                    {log.oldValue ? (
                      <>
                        <span style={{ color: 'var(--danger)' }}>{log.oldValue}</span>
                        <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>➔</span>
                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{log.newValue}</span>
                      </>
                    ) : (
                      <span>
                        Initialized as <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{log.newValue}</span>
                      </span>
                    )}
                  </td>
                  <td style={{ color: parseInt(log.rsrp) >= -90 ? 'var(--success)' : 'var(--warning)' }}>
                    {log.rsrp ? `${log.rsrp} dBm` : '--'}
                  </td>
                  <td style={{ color: parseFloat(log.sinr) >= 10 ? 'var(--success)' : 'var(--warning)' }}>
                    {log.sinr ? `${log.sinr} dB` : '--'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                  No telemetry changes recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
