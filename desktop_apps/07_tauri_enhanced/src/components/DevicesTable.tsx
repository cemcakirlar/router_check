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
}

export default function DevicesTable({
  staticIps,
  stations,
}: DevicesTableProps) {
  return (
    <>
      {/* Static IP Reservations */}
      <div className="card table-card md:col-span-6">
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>📌 Static IP Reservations ({staticIps.length})</span>
        </div>

        <div style={{ maxHeight: '200px', overflow: 'auto', width: '100%' }}>
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>IP Address</th>
                <th>MAC Address</th>
              </tr>
            </thead>
            <tbody>
              {staticIps.length > 0 ? (
                staticIps.map((s, index) => (
                  <tr key={s.mac || index}>
                    <td>{s.hostname || '--'}</td>
                    <td>{s.ip}</td>
                    <td>{s.mac}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No static reservations
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="card table-card md:col-span-6">
        <div className="card-title">📱 Connected Devices ({stations.length})</div>
        <div style={{ maxHeight: '200px', overflow: 'auto', width: '100%' }}>
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>IP Address</th>
                <th>MAC Address</th>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
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
