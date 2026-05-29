import { useState, useEffect } from 'react';

interface InfoCardProps {
  wanIp: string;
  pppStatus: string;
  lanIp: string;
  lanNetmask: string;
  dhcpEnabled: string;
  macAddress: string;
  imei: string;
  firmware: string;
  hardware: string;
  msisdn: string;
  smsUnread: string;
  wifiClients: string;

  isConnected: boolean;
  onConnect: () => void;
  isConnecting: boolean;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  netSelect?: string;
  onSetBearerPreference: (preference: string) => Promise<void>;
  isSettingBearer: boolean;
}

export default function InfoCard({
  wanIp,
  pppStatus,
  lanIp,
  lanNetmask,
  dhcpEnabled,
  macAddress,
  imei,
  firmware,
  hardware,
  msisdn,
  smsUnread,
  wifiClients,
  isConnected,
  onConnect,
  isConnecting,
  onDisconnect,
  isDisconnecting,
  netSelect,
  onSetBearerPreference,
  isSettingBearer,
}: InfoCardProps) {
  const formatPppStatus = (status: string) => {
    if (!status) return '--';
    if (status.includes('connected') && !status.includes('disconnected')) {
      return 'Connected';
    }
    if (status.includes('disconnected')) {
      return 'Disconnected';
    }
    if (status.includes('connecting')) {
      return 'Connecting...';
    }
    if (status.includes('disconnecting')) {
      return 'Disconnecting...';
    }
    const clean = status.replace(/_/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const getPppDotClass = (status: string) => {
    if (!status) return '';
    if (status.includes('connected') && !status.includes('disconnected')) {
      return 'online';
    }
    return '';
  };

  const isPppConnected = pppStatus.includes('connected') && !pppStatus.includes('disconnected');
  const isPppDisconnected = pppStatus.includes('disconnected');

  const [selectedBearer, setSelectedBearer] = useState('NETWORK_auto');

  useEffect(() => {
    if (netSelect && ['Only_LTE', 'Only_WCDMA', 'NETWORK_auto'].includes(netSelect)) {
      setSelectedBearer(netSelect);
    }
  }, [netSelect]);

  return (
    <>
      {/* Network & LAN Config */}
      <div className="card md:col-span-4">
        <div className="card-title">🌐 Network & LAN</div>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">WAN IP</span>
            <span className="info-value">{wanIp || '--'}</span>
          </div>
          <div className="info-row" style={{ alignItems: 'center' }}>
            <span className="info-label">PPP Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div className={`status-dot ${getPppDotClass(pppStatus)}`} />
              <span className="info-value">{formatPppStatus(pppStatus)}</span>
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">LAN IP</span>
            <span className="info-value">{lanIp || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Netmask</span>
            <span className="info-value">{lanNetmask || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">DHCP</span>
            <span className="info-value">
              {dhcpEnabled === '1' ? 'Enabled' : dhcpEnabled === '0' ? 'Disabled' : '--'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">WiFi MAC</span>
            <span className="info-value">{macAddress || '--'}</span>
          </div>
        </div>

        {/* Connection Action Buttons */}
        {isConnected && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isPppConnected ? (
              <button
                id="disconnectBtn"
                onClick={onDisconnect}
                className="refresh-btn"
                disabled={isDisconnecting}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  boxShadow: '0 4px 10px rgba(239, 68, 68, 0.15)',
                  padding: '0.5rem',
                }}
              >
                {isDisconnecting ? 'DISCONNECTING...' : '🔌 DISCONNECT PPP'}
              </button>
            ) : (
              <button
                id="connectBtn"
                onClick={onConnect}
                className="refresh-btn"
                disabled={isConnecting}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.15)',
                  padding: '0.5rem',
                }}
              >
                {isConnecting ? 'CONNECTING...' : '🔌 CONNECT PPP'}
              </button>
            )}

            {/* Bearer Preference Controls */}
            <div style={{ display: 'flex', gap: '0.4rem', width: '100%', marginTop: '0.25rem' }}>
              <select
                id="bearerPreferenceSelect"
                value={selectedBearer}
                onChange={(e) => setSelectedBearer(e.target.value)}
                disabled={!isPppDisconnected || isSettingBearer}
                className="refresh-btn"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: isPppDisconnected ? 'var(--text-bright)' : 'var(--text-dim)',
                  cursor: isPppDisconnected ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  padding: '0.5rem',
                }}
              >
                <option value="NETWORK_auto" style={{ background: '#1f2937', color: 'white' }}>
                  Auto Network
                </option>
                <option value="Only_LTE" style={{ background: '#1f2937', color: 'white' }}>
                  Only LTE
                </option>
                <option value="Only_WCDMA" style={{ background: '#1f2937', color: 'white' }}>
                  Only WCDMA
                </option>
              </select>
              <button
                id="setBearerBtn"
                onClick={() => onSetBearerPreference(selectedBearer)}
                disabled={!isPppDisconnected || isSettingBearer}
                className="refresh-btn"
                style={{
                  background: isPppDisconnected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  borderColor: isPppDisconnected ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                  color: isPppDisconnected ? '#60a5fa' : 'var(--text-dim)',
                  boxShadow: isPppDisconnected ? '0 4px 10px rgba(59, 130, 246, 0.15)' : 'none',
                  cursor: isPppDisconnected ? 'pointer' : 'not-allowed',
                  padding: '0.5rem 0.75rem',
                }}
              >
                {isSettingBearer ? 'SETTING...' : 'SET BEARER'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* System & Network Info */}
      <div className="card md:col-span-4">
        <div className="card-title">🛠️ System Details</div>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">IMEI</span>
            <span className="info-value">{imei || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Firmware</span>
            <span className="info-value">{firmware || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Hardware</span>
            <span className="info-value">{hardware || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">MSISDN</span>
            <span className="info-value">{msisdn || '--'}</span>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="card md:col-span-4">
        <div className="card-title">📊 System Stats</div>
        <div className="info-grid">
          <div className="info-row" style={{ alignItems: 'center' }}>
            <span className="info-label">SMS Unread</span>
            <span className="info-value" style={{ color: 'var(--accent-primary)' }}>
              {smsUnread || '0'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">WiFi Clients</span>
            <span className="info-value">{wifiClients || '--'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
