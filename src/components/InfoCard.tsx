import { useState, useEffect } from 'react';
import { useRouterState } from '../context/RouterStateContext';

export default function InfoCard() {
  const {
    routerData,
    isConnected,
    handleConnect,
    isConnecting,
    handleDisconnect,
    isDisconnecting,
    handleSetBearerPreference,
    isSettingBearer,
  } = useRouterState();

  const netSelect = routerData?.net_select || "";
  const wanIp = routerData?.wan_ipaddr || "";
  const pppStatus = routerData?.ppp_status || "";
  const lanIp = routerData?.lan_ipaddr || routerData?.ip_addr_web || "";
  const lanNetmask = routerData?.lan_netmask || "";
  const dhcpEnabled = routerData?.dhcpEnabled || "";
  const macAddress = routerData?.mac_address || "";
  const imei = routerData?.imei || "";
  const firmware = routerData?.cr_version || routerData?.wa_version || "";
  const hardware = routerData?.hardware_version || "";
  const msisdn = routerData?.msisdn || "";
  const smsUnread = routerData?.sms_unread_num || "0";
  const wifiClients = routerData?.wifi_access_sta_num || "";

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
                onClick={handleDisconnect}
                className="refresh-btn"
                disabled={isDisconnecting}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  color: 'var(--danger)',
                  boxShadow: '0 4px 10px rgba(239, 68, 68, 0.15)',
                  padding: '0.5rem',
                }}
              >
                {isDisconnecting ? 'DISCONNECTING...' : '🔌 DISCONNECT PPP'}
              </button>
            ) : (
              <button
                id="connectBtn"
                onClick={handleConnect}
                className="refresh-btn"
                disabled={isConnecting}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  color: 'var(--success)',
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
                  background: 'var(--surface-control)',
                  borderColor: 'var(--control-border)',
                  color: isPppDisconnected ? 'var(--text-bright)' : 'var(--text-dim)',
                  cursor: isPppDisconnected ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  padding: '0.5rem',
                }}
              >
                <option value="NETWORK_auto" style={{ background: 'var(--option-bg)', color: 'var(--option-color)' }}>
                  Auto Network
                </option>
                <option value="Only_LTE" style={{ background: 'var(--option-bg)', color: 'var(--option-color)' }}>
                  Only LTE
                </option>
                <option value="Only_WCDMA" style={{ background: 'var(--option-bg)', color: 'var(--option-color)' }}>
                  Only WCDMA
                </option>
              </select>
              <button
                id="setBearerBtn"
                onClick={() => handleSetBearerPreference(selectedBearer)}
                disabled={!isPppDisconnected || isSettingBearer}
                className="refresh-btn"
                style={{
                  background: isPppDisconnected ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-muted)',
                  borderColor: isPppDisconnected ? 'rgba(59, 130, 246, 0.35)' : 'var(--border)',
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
