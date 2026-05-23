import { useState } from 'react';

export interface StaticIp {
  hostname?: string;
  ip: string;
  mac: string;
}

export interface Station {
  hostname?: string;
  ip_addr: string;
  mac_addr: string;
}

interface DevicesTableProps {
  staticIps: StaticIp[];
  stations: Station[];
  onAddStaticIp?: (hostname: string, ip: string, mac: string) => Promise<void>;
  isAddingStaticIp?: boolean;
  onShowToast?: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export default function DevicesTable({
  staticIps,
  stations,
  onAddStaticIp,
  isAddingStaticIp = false,
  onShowToast,
}: DevicesTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formHostname, setFormHostname] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formMac, setFormMac] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHostname.trim() || !formIp.trim() || !formMac.trim()) return;

    if (onAddStaticIp) {
      try {
        await onAddStaticIp(formHostname.trim(), formIp.trim(), formMac.trim());
        setFormHostname('');
        setFormIp('');
        setFormMac('');
        setIsFormOpen(false);
      } catch (err) {
        console.error('Failed to save reservation:', err);
      }
    }
  };

  const handleDeleteClick = () => {
    if (onShowToast) {
      onShowToast(
        'Deletion of IP reservations is not supported by standard ZTE API. Please modify/delete reservations using the router web portal.',
        'info'
      );
    }
  };

  return (
    <>
      {/* Static IP Reservations */}
      <div className="card table-card">
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>📌 Static IP Reservations</span>
          {!isFormOpen && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="refresh-btn"
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.65rem',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                color: 'var(--accent-primary)',
              }}
            >
              ➕ Reserve IP
            </button>
          )}
        </div>

        {/* Collapsible Form */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.8rem',
              marginBottom: '1.25rem',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              alignItems: 'flex-end',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                Hostname
              </label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                placeholder="e.g. Server"
                value={formHostname}
                onChange={(e) => setFormHostname(e.target.value)}
                disabled={isAddingStaticIp}
                required
              />
            </div>
            <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                IP Address
              </label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                placeholder="e.g. 192.168.0.150"
                value={formIp}
                onChange={(e) => setFormIp(e.target.value)}
                disabled={isAddingStaticIp}
                required
              />
            </div>
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                MAC Address
              </label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                placeholder="e.g. AA:BB:CC:DD:EE:FF"
                value={formMac}
                onChange={(e) => setFormMac(e.target.value)}
                disabled={isAddingStaticIp}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button
                type="button"
                className="refresh-btn"
                onClick={() => setIsFormOpen(false)}
                disabled={isAddingStaticIp}
                style={{ padding: '0.4rem 0.8rem', height: '32px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="refresh-btn"
                disabled={isAddingStaticIp || !formHostname || !formIp || !formMac}
                style={{
                  padding: '0.4rem 0.8rem',
                  height: '32px',
                  background: 'linear-gradient(135deg, var(--accent-primary), #3b82f6)',
                  border: 'none',
                  color: '#030712',
                }}
              >
                {isAddingStaticIp ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        <div style={{ maxHeight: '200px', overflowY: 'auto', width: '100%' }}>
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>IP Address</th>
                <th>MAC Address</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staticIps.length > 0 ? (
                staticIps.map((s, index) => (
                  <tr key={s.mac || index}>
                    <td>{s.hostname || '--'}</td>
                    <td>{s.ip}</td>
                    <td>{s.mac}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={handleDeleteClick}
                        className="refresh-btn"
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.65rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          display: 'inline-flex',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No static reservations
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="card table-card">
        <div className="card-title">📱 Connected Devices ({stations.length})</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto', width: '100%' }}>
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>IP Address</th>
                <th>MAC Address</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stations.length > 0 ? (
                stations.map((s, index) => (
                  <tr key={s.mac_addr || index}>
                    <td>
                      {s.hostname && s.hostname !== '--' ? (
                        s.hostname
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>Unknown Device</span>
                      )}
                    </td>
                    <td>{s.ip_addr}</td>
                    <td>{s.mac_addr}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setFormHostname(
                            s.hostname && s.hostname !== '--' && s.hostname !== 'Unknown Device'
                              ? s.hostname
                              : 'StaticDevice'
                          );
                          setFormIp(s.ip_addr);
                          setFormMac(s.mac_addr);
                          setIsFormOpen(true);
                        }}
                        className="refresh-btn"
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.65rem',
                          display: 'inline-flex',
                          border: '1px solid rgba(0, 242, 255, 0.2)',
                          color: 'var(--accent-primary)',
                          background: 'rgba(0, 242, 255, 0.05)',
                        }}
                      >
                        📌 Reserve IP
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No devices detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
