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
  onOpenSmsComposer?: () => void;
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
  onOpenSmsComposer,
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

  return (
    <>
      {/* Network & LAN Config */}
      <div className="card">
        <div className="card-title">🌐 Network & LAN</div>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">WAN IP</span>
            <span className="info-value">{wanIp || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">PPP Status</span>
            <span className="info-value">{formatPppStatus(pppStatus)}</span>
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
      </div>

      {/* System & Network Info */}
      <div className="card">
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
      <div className="card">
        <div className="card-title">📊 System Stats</div>
        <div className="info-grid">
          <div className="info-row" style={{ alignItems: 'center' }}>
            <span className="info-label">SMS Unread</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="info-value" style={{ color: 'var(--accent-primary)' }}>
                {smsUnread || '0'}
              </span>
              <button
                onClick={onOpenSmsComposer}
                className="refresh-btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', display: 'inline-flex' }}
              >
                💬 Compose
              </button>
            </div>
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
