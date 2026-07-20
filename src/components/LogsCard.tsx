import { useState } from "react";
import { useRouterState } from "../context/RouterStateContext";

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  rsrp: string;
  sinr: string;
  cellId: string;
  networkType: string;
}

function fieldBadgeClass(field: string): string {
  if (field === "Cell ID") return "log-field-badge is-cell";
  if (field === "Network Type") return "log-field-badge is-network";
  if (field === "RSRP") return "log-field-badge is-rsrp";
  if (field === "SINR") return "log-field-badge is-sinr";
  return "log-field-badge";
}

export default function LogsCard() {
  const { logs, setLogs } = useRouterState();
  const [filterField, setFilterField] = useState<string>("all");

  const onClear = () => {
    setLogs([]);
    localStorage.removeItem("router_telemetry_logs");
  };

  const filteredLogs = logs.filter((log) => {
    if (filterField === "all") return true;
    if (filterField === "cell_id") return log.field === "Cell ID";
    if (filterField === "network_type") return log.field === "Network Type";
    if (filterField === "rsrp") return log.field === "RSRP";
    if (filterField === "sinr") return log.field === "SINR";
    return true;
  });

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Timestamp", "Field", "Old Value", "New Value", "RSRP (dBm)", "SINR (dB)", "Cell ID", "Network Type"];
    const rows = logs.map((log) => [
      log.timestamp,
      log.field,
      log.oldValue,
      log.newValue,
      log.rsrp,
      log.sinr,
      log.cellId || "",
      log.networkType || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `router_change_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card md:col-span-12">
      <div className="card-title row-wrap">
        <span className="log-title-label">📋 Router Telemetry Change Log ({filteredLogs.length})</span>
        <div className="log-toolbar-actions">
          <select value={filterField} onChange={(e) => setFilterField(e.target.value)} className="log-filter-select">
            <option value="all">All Events</option>
            <option value="cell_id">Cell ID Only</option>
            <option value="network_type">Network Type Only</option>
            <option value="rsrp">RSRP Only</option>
            <option value="sinr">SINR Only</option>
          </select>
          <button onClick={handleExportCSV} disabled={logs.length === 0} className="refresh-btn btn-tiny">
            📥 Export CSV
          </button>
          <button onClick={onClear} disabled={logs.length === 0} className="refresh-btn btn-clear-danger">
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="scroll-pane-lg">
        <table className="log-table">
          <thead className="log-thead">
            <tr>
              <th className="log-th-ts">Timestamp</th>
              <th className="log-th-param">Parameter</th>
              <th>Change Details</th>
              <th className="log-th-rsrp">RSRP</th>
              <th className="log-th-sinr">SINR</th>
              <th className="log-th-cell">Cell ID</th>
              <th className="log-th-net">Network Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="text-dim">{log.timestamp}</td>
                  <td>
                    <span className={fieldBadgeClass(log.field)}>{log.field}</span>
                  </td>
                  <td className="log-detail">
                    {log.oldValue ? (
                      <>
                        <span className="text-danger">{log.oldValue}</span>
                        <span className="log-arrow">➔</span>
                        <span className="text-success font-strong">{log.newValue}</span>
                      </>
                    ) : (
                      <span>
                        Initialized as <span className="text-success font-strong">{log.newValue}</span>
                      </span>
                    )}
                  </td>
                  <td className={parseInt(log.rsrp, 10) >= -90 ? "text-success" : "text-warning"}>{log.rsrp ? `${log.rsrp} dBm` : "--"}</td>
                  <td className={parseFloat(log.sinr) >= 10 ? "text-success" : "text-warning"}>{log.sinr ? `${log.sinr} dB` : "--"}</td>
                  <td className="text-main">{log.cellId || "--"}</td>
                  <td className="text-main">{log.networkType || "--"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="table-empty-pad">
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
