import { useRouterState } from "../context/RouterStateContext";

export default function DevicesTable() {
  const { staticIps, stations } = useRouterState();

  return (
    <>
      <div className="card table-card md:col-span-6">
        <div className="card-title row-between">
          <span>📌 Static IP Reservations ({staticIps.length})</span>
        </div>

        <div className="scroll-pane">
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
                    <td>{s.hostname || "--"}</td>
                    <td>{s.ip}</td>
                    <td>{s.mac}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="table-empty">
                    No static reservations
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card md:col-span-6">
        <div className="card-title">📱 Connected Devices ({stations.length})</div>
        <div className="scroll-pane">
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
                    <td>{s.hostname && s.hostname !== "--" ? s.hostname : <span className="text-dim">Unknown Device</span>}</td>
                    <td>{s.ip_addr}</td>
                    <td>{s.mac_addr}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="table-empty">
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
