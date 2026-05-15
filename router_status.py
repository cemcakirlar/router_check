import requests
import base64
import json
import time

# --- Configuration ---
ROUTER_IP = "192.168.0.1"
PASSWORD = "FoldMund2204*"  # Updated from your browser payload
BASE_URL = f"http://{ROUTER_IP}/goform"
HEADERS = {
    "Referer": f"http://{ROUTER_IP}/index.html",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "tr,en;q=0.9,en-GB;q=0.8,en-US;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "X-Requested-With": "XMLHttpRequest"
}

# Comprehensive list of commands extracted from your router's API call
COMMANDS = [
    # Status & Signal
    "modem_main_state", "signalbar", "network_type", "network_provider",
    "rssi", "rscp", "lte_rsrp", "lte_rsrq", "sinr", "cell_id", "Z_dl_earfcn", "station_list",
    
    # Device Info
    "imei", "imsi", "sim_imsi", "msisdn", "fsn_no_get",
    "cr_version", "wa_version", "hardware_version", "web_version", "wa_inner_version",
    
    # Network / WAN / LAN
    "lan_ipaddr", "mac_address", "LocalDomain", "wan_ipaddr", "static_wan_ipaddr", 
    "ipv6_wan_ipaddr", "ipv6_pdp_type", "pdp_type", "opms_wan_mode", 
    "opms_wan_auto_mode", "ppp_status",
    
    # Usage
    "realtime_tx_bytes", "realtime_rx_bytes", "realtime_tx_thrpt", 
    "realtime_rx_thrpt", "battery_vol_percent", "simcard_roam",
    
    # WiFi Settings
    "wifi_onoff_state", "m_ssid_enable", "m_SSID2", "m_HideSSID", "wifi_enable", "RadioOff",
    "wifi_chip1_ssid1_switch_onoff", "wifi_chip1_ssid1_ssid", "wifi_chip1_ssid1_auth_mode", 
    "wifi_chip1_ssid1_password_encode", "wifi_chip1_ssid1_max_access_num", "wifi_chip1_ssid1_wifi_coverage",
    "wifi_chip1_ssid2_switch_onoff", "wifi_chip1_ssid2_ssid", "wifi_chip1_ssid2_max_access_num",
    "wifi_chip2_ssid1_switch_onoff", "wifi_chip2_ssid1_ssid", "wifi_chip2_ssid1_auth_mode", 
    "wifi_chip2_ssid1_password_encode", "wifi_chip2_ssid1_max_access_num",
    "wifi_chip2_ssid2_switch_onoff", "wifi_chip2_ssid2_ssid", "wifi_chip2_ssid2_max_access_num",
    "wifi_chip1_ssid1_access_sta_num", "wifi_chip2_ssid1_access_sta_num", "wifi_access_sta_num",

    # NEW: Data Limits & Monthly Usage
    "monthly_rx_bytes", "monthly_tx_bytes", "monthly_time", "date_month",
    "data_volume_limit_switch", "data_volume_limit_size", "data_volume_alert_percent", "data_volume_limit_unit",
    
    # NEW: Battery & System
    "battery_charging", "battery_value", "battery_pers", "pin_status", 
    "new_version_state", "current_upgrade_state", "is_mandatory",
    "ppp_dial_conn_fail_counter", "dial_mode", "wifi_dfs_status",
    
    # NEW: SMS & Extra Network
    "sms_unread_num", "sms_received_flag", "sts_received_flag",
    "pppoe_status", "dhcp_wan_status", "static_wan_status",
    
    # NEW: LAN & DHCP Details
    "host_name_web", "mac_addr_web", "ip_addr_web", "lan_netmask", 
    "dhcpEnabled", "guest_dhcpEnabled", "current_static_addr_list",
    "spn_name_data", "hmcc", "hmnc"
]

LABELS = {
    "modem_main_state": "Modem State",
    "signalbar": "Signal Bars",
    "network_type": "Network Type",
    "network_provider": "Network Provider",
    "rssi": "RSSI",
    "rscp": "RSCP",
    "lte_rsrp": "RSRP (Signal Strength)",
    "lte_rsrq": "RSRQ (Signal Quality)",
    "sinr": "SINR (Noise Ratio)",
    "cell_id": "Cell ID",
    "Z_dl_earfcn": "Frequency Channel (EARFCN)",
    "imei": "IMEI",
    "imsi": "IMSI",
    "sim_imsi": "SIM IMSI",
    "msisdn": "Phone Number (MSISDN)",
    "fsn_no_get": "FSN Number",
    "cr_version": "Software Version (CR)",
    "wa_version": "Web Version (WA)",
    "hardware_version": "Hardware Version",
    "web_version": "UI Version",
    "wa_inner_version": "Inner Version",
    "lan_ipaddr": "LAN IP Address",
    "mac_address": "MAC Address",
    "LocalDomain": "Local Domain",
    "wan_ipaddr": "WAN IP Address",
    "static_wan_ipaddr": "Static WAN IP",
    "ipv6_wan_ipaddr": "IPv6 WAN IP",
    "ipv6_pdp_type": "IPv6 PDP Type",
    "pdp_type": "PDP Type",
    "opms_wan_mode": "WAN Mode",
    "opms_wan_auto_mode": "WAN Auto Mode",
    "ppp_status": "Connection Status",
    "realtime_tx_bytes": "Total Uploaded",
    "realtime_rx_bytes": "Total Downloaded",
    "realtime_tx_thrpt": "Current Upload Speed",
    "realtime_rx_thrpt": "Current Download Speed",
    "battery_vol_percent": "Battery Level (%)",
    "battery_charging": "Battery Charging Status",
    "battery_value": "Battery Voltage",
    "battery_pers": "Battery Percentage",
    "monthly_rx_bytes": "Monthly Download",
    "monthly_tx_bytes": "Monthly Upload",
    "data_volume_limit_size": "Data Limit Size",
    "sms_unread_num": "Unread SMS Count",
    "pin_status": "SIM PIN Status",
    "new_version_state": "Update Available",
    "ppp_dial_conn_fail_counter": "Connection Failures",
    "wifi_access_sta_num": "Total WiFi Clients",
    "wifi_chip1_ssid1_access_sta_num": "2.4GHz Clients",
    "wifi_chip2_ssid1_access_sta_num": "5GHz Clients"
}

session = requests.Session()

def login():
    try:
        # Some ZTE routers use the password as-is, some use Base64
        enc_pass = base64.b64encode(PASSWORD.encode()).decode()
        payload = {
            "isTest": "false",
            "goformId": "LOGIN_MULTI_USER",
            "user": "admin",
            "password": enc_pass,
            "AD": "08110e07fae97cfd2d2314078ab631cf" # We'll try this token from your payload
        }
        
        # 1. Attempt login
        response = session.post(f"{BASE_URL}/goform_set_cmd_process", data=payload, headers=HEADERS, timeout=5)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("result") == "0" or result.get("result") == "ok":
                return True
            else:
                print(f"Login failed: Router returned {result}")
                return False
        else:
            print(f"Login failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Login error: {e}")
        return False

def get_router_data():
    try:
        params = {
            "isTest": "false",
            "multi_data": "1",
            "cmd": ",".join(COMMANDS),
            "_": int(time.time() * 1000)
        }
        response = session.get(f"{BASE_URL}/goform_get_cmd_process", params=params, headers=HEADERS, timeout=5)
        return response.json()
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return None

def get_station_list():
    try:
        params = {
            "isTest": "false",
            "cmd": "station_list",
            "_": int(time.time() * 1000)
        }
        response = session.get(f"{BASE_URL}/goform_get_cmd_process", params=params, headers=HEADERS, timeout=5)
        return response.json()
    except Exception as e:
        print(f"Failed to fetch station list: {e}")
        return None

def analyze_signal(data):
    try:
        rsrp = int(data.get("lte_rsrp", 0))
        sinr = float(data.get("sinr", 0))
        
        print("\n--- Signal Quality Analysis ---")
        
        # RSRP Analysis
        if rsrp >= -80: rsrp_desc = "Excellent"
        elif rsrp >= -90: rsrp_desc = "Good"
        elif rsrp >= -100: rsrp_desc = "Fair"
        else: rsrp_desc = "Poor"
        print(f"RSRP (Strength): {rsrp} dBm -> {rsrp_desc}")
        
        # SINR Analysis
        if sinr >= 13: sinr_desc = "Excellent"
        elif sinr >= 10: sinr_desc = "Good"
        elif sinr >= 0: sinr_desc = "Fair (High Noise)"
        else: sinr_desc = "Poor (Significant Interference)"
        print(f"SINR (Quality): {sinr} dB -> {sinr_desc}")
        
        if sinr < 5:
            print("\nTIP: Your signal is strong but has high interference.")
            print("Try rotating the router or moving it away from other electronics.")
            
    except Exception:
        pass

def format_value(cmd, val):
    if val is None or str(val).strip() == "":
        return val
    
    # Convert to numeric if possible
    try:
        num = float(val)
    except Exception:
        return val

    # Byte Formatting (Total usage)
    if "bytes" in cmd:
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if num < 1024:
                return f"{num:.2f} {unit} ({val})"
            num /= 1024
            
    # Throughput Formatting (Speeds)
    if "thrpt" in cmd:
        if num < 1000:
            return f"{num} bps ({val})"
        elif num < 1000000:
            return f"{num/1000:.2f} Kbps ({val})"
        else:
            return f"{num/1000000:.2f} Mbps ({val})"

    # Time Formatting (Seconds)
    if "_time" in cmd:
        days = int(num // 86400)
        hours = int((num % 86400) // 3600)
        mins = int((num % 3600) // 60)
        return f"{days}d {hours}h {mins}m ({val})"

    # Signal Units
    if cmd in ["rssi", "lte_rsrp", "rscp", "sinr"]:
        unit = "dB" if cmd == "sinr" else "dBm"
        return f"{val} {unit} ({val})"
        
    # Percentages
    if "percent" in cmd or "pers" in cmd:
        return f"{val}% ({val})"

    return val

def print_station_list(station_data):
    if not station_data:
        return
        
    stations = station_data.get("station_list")
    if not stations or not isinstance(stations, list):
        return
        
    print("\n" + "-"*50)
    print(f"{'CONNECTED DEVICES':^50}")
    print("-"*50)
    print(f"{'Device Name':<20} | {'IP Address':<15} | {'MAC Address':<17}")
    print("-"*50)
    
    for s in stations:
        name = s.get("hostname", "Unknown")
        ip = s.get("ip_addr", "N/A")
        mac = s.get("mac_addr", "N/A")
        print(f"{name:<20} | {ip:<15} | {mac:<17}")

if __name__ == "__main__":
    if login():
        data = get_router_data()
        if data:
            print("\n" + "="*50)
            print("         ROUTER STATUS REPORT")
            print("="*50)
            
            for cmd in COMMANDS:
                if cmd == "station_list": continue
                
                val = data.get(cmd)
                # Only display if the value is not empty
                if val is not None and str(val).strip() != "":
                    label = LABELS.get(cmd, cmd.replace("_", " ").title())
                    cmd_ref = f"({cmd})"
                    readable_val = format_value(cmd, val)
                    print(f"{label:<40} {cmd_ref:<40} : {readable_val}")
            
            # Fetch and print station list separately
            station_data = get_station_list()
            print_station_list(station_data)
            
            analyze_signal(data)
            print("="*50 + "\n")
        else:
            print("No data retrieved.")
    else:
        print("Failed to authenticate.")
