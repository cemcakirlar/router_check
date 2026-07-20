export type ThemeMode = "system" | "light" | "dark";

export interface AppConfig {
  router_ip: string;
  router_password: string;
  auto_refresh_interval: number;
  auto_refresh_on_startup: boolean;
  main_window_on_startup: string;
  theme_mode?: ThemeMode;
}

export interface Station {
  hostname: string;
  ip_addr: string;
  mac_addr: string;
}

export interface StaticIp {
  hostname: string;
  ip: string;
  mac: string;
}

export interface RouterData {
  lte_rsrp?: string;
  sinr?: string;
  cell_id?: string;
  Z_dl_earfcn?: string;
  monthly_rx_bytes?: string;
  monthly_tx_bytes?: string;
  monthly_time?: string;
  network_provider?: string;
  network_type?: string;
  realtime_rx_thrpt?: string;
  realtime_tx_thrpt?: string;
  wan_ipaddr?: string;
  ppp_status?: string;
  lan_ipaddr?: string;
  lan_netmask?: string;
  dhcpEnabled?: string;
  mac_address?: string;
  imei?: string;
  cr_version?: string;
  hardware_version?: string;
  msisdn?: string;
  sms_unread_num?: string;
  wifi_access_sta_num?: string;
  net_select?: string;
  ip_addr_web?: string;
  wa_version?: string;
  realtime_rx_bytes?: string;
  realtime_tx_bytes?: string;
  result?: string;
}
