import { useState, useEffect } from "react";
import { useRouterState } from "../context/RouterStateContext";

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
    if (!status) return "--";
    if (status.includes("connected") && !status.includes("disconnected")) {
      return "Connected";
    }
    if (status.includes("disconnected")) {
      return "Disconnected";
    }
    if (status.includes("connecting")) {
      return "Connecting...";
    }
    if (status.includes("disconnecting")) {
      return "Disconnecting...";
    }
    const clean = status.replace(/_/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const getPppDotClass = (status: string) => {
    if (!status) return "";
    if (status.includes("connected") && !status.includes("disconnected")) {
      return "online";
    }
    return "";
  };

  const isPppConnected = pppStatus.includes("connected") && !pppStatus.includes("disconnected");
  const isPppDisconnected = pppStatus.includes("disconnected");

  const [selectedBearer, setSelectedBearer] = useState("NETWORK_auto");

  useEffect(() => {
    if (netSelect && ["Only_LTE", "Only_WCDMA", "NETWORK_auto"].includes(netSelect)) {
      setSelectedBearer(netSelect);
    }
  }, [netSelect]);

  return (
    <>
      <div className="card md:col-span-4">
        <div className="card-title">🌐 Network & LAN</div>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">WAN IP</span>
            <span className="info-value">{wanIp || "--"}</span>
          </div>
          <div className="info-row items-center">
            <span className="info-label">PPP Status</span>
            <div className="row-center">
              <div className={`status-dot ${getPppDotClass(pppStatus)}`} />
              <span className="info-value">{formatPppStatus(pppStatus)}</span>
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">LAN IP</span>
            <span className="info-value">{lanIp || "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Netmask</span>
            <span className="info-value">{lanNetmask || "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">DHCP</span>
            <span className="info-value">{dhcpEnabled === "1" ? "Enabled" : dhcpEnabled === "0" ? "Disabled" : "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">WiFi MAC</span>
            <span className="info-value">{macAddress || "--"}</span>
          </div>
        </div>

        {isConnected && (
          <div className="card-section col-stack">
            {isPppConnected ? (
              <button
                id="disconnectBtn"
                onClick={handleDisconnect}
                className="refresh-btn refresh-btn-block btn-danger-soft"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? "DISCONNECTING..." : "🔌 DISCONNECT PPP"}
              </button>
            ) : (
              <button
                id="connectBtn"
                onClick={handleConnect}
                className="refresh-btn refresh-btn-block btn-success-soft-strong"
                disabled={isConnecting}
              >
                {isConnecting ? "CONNECTING..." : "🔌 CONNECT PPP"}
              </button>
            )}

            <div className="bearer-row">
              <select
                id="bearerPreferenceSelect"
                value={selectedBearer}
                onChange={(e) => setSelectedBearer(e.target.value)}
                disabled={!isPppDisconnected || isSettingBearer}
                className="refresh-btn bearer-select"
              >
                <option value="NETWORK_auto">Auto Network</option>
                <option value="Only_LTE">Only LTE</option>
                <option value="Only_WCDMA">Only WCDMA</option>
              </select>
              <button
                id="setBearerBtn"
                onClick={() => handleSetBearerPreference(selectedBearer)}
                disabled={!isPppDisconnected || isSettingBearer}
                className={`refresh-btn ${isPppDisconnected ? "btn-info-soft" : "btn-muted"}`}
              >
                {isSettingBearer ? "SETTING..." : "SET BEARER"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card md:col-span-4">
        <div className="card-title">🛠️ System Details</div>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">IMEI</span>
            <span className="info-value">{imei || "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Firmware</span>
            <span className="info-value">{firmware || "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Hardware</span>
            <span className="info-value">{hardware || "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">MSISDN</span>
            <span className="info-value">{msisdn || "--"}</span>
          </div>
        </div>
      </div>

      <div className="card md:col-span-4">
        <div className="card-title">📊 System Stats</div>
        <div className="info-grid">
          <div className="info-row items-center">
            <span className="info-label">SMS Unread</span>
            <span className="info-value text-accent">{smsUnread || "0"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">WiFi Clients</span>
            <span className="info-value">{wifiClients || "--"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
