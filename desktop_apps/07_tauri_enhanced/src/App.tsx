import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './style.css';

// Component Imports
import Header from './components/Header';
import BootstrapOverlay from './components/BootstrapOverlay';
import SettingsModal from './components/SettingsModal';
import SignalCard from './components/SignalCard';
import UsageCard from './components/UsageCard';
import RealtimeCard from './components/RealtimeCard';
import InfoCard from './components/InfoCard';
import DevicesTable from './components/DevicesTable';
import SmsModal from './components/SmsModal';

// Check if running inside Tauri
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

async function fnCall<T>(command: string, args: Record<string, any> = {}): Promise<T> {
  if (isTauri) {
    try {
      return await invoke<T>(command, args);
    } catch (e) {
      console.error(`Tauri command ${command} failed:`, e);
      throw e;
    }
  } else {
    console.warn(`Tauri environment not detected. Mocking command: ${command}`);
    return mockCall(command, args) as T;
  }
}

// Mock responses for web-based development/debugging
function mockCall(command: string, _args: Record<string, any>): any {
  if (command === 'get_config') {
    return { router_ip: '192.168.0.1', router_password: 'mock_password' };
  }
  if (command === 'save_config') {
    return null;
  }
  if (command === 'login') {
    return { result: '0' };
  }
  if (command === 'fetch_router_data') {
    return {
      lte_rsrp: (Math.floor(Math.random() * 20) - 95).toString(), // fluctuating RSRP
      sinr: (Math.random() * 10 + 8).toFixed(1), // fluctuating SINR
      cell_id: '49201',
      Z_dl_earfcn: '1600',
      monthly_rx_bytes: '12894819481',
      monthly_tx_bytes: '1948184918',
      monthly_time: '482010',
      network_provider: 'Mock Operator',
      network_type: 'LTE/4G',
      realtime_rx_thrpt: (Math.floor(Math.random() * 5000000) + 1000000).toString(),
      realtime_tx_thrpt: (Math.floor(Math.random() * 1000000) + 200000).toString(),
      wan_ipaddr: '100.82.91.24',
      ppp_status: 'connected',
      lan_ipaddr: '192.168.0.1',
      lan_netmask: '255.255.255.0',
      dhcpEnabled: '1',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      imei: '359184918491849',
      cr_version: 'V1.0.0B02',
      hardware_version: 'ZTE-T9',
      msisdn: '+905555555555',
      sms_unread_num: '2',
      wifi_access_sta_num: '5',
      net_select: 'Network_Auto',
    };
  }
  if (command === 'fetch_stations') {
    return {
      station_list: [
        { hostname: 'MacBook Pro', ip_addr: '192.168.0.100', mac_addr: '11:22:33:44:55:66' },
        { hostname: 'iPhone 15', ip_addr: '192.168.0.101', mac_addr: '77:88:99:AA:BB:CC' },
      ],
    };
  }
  if (command === 'fetch_static_ips') {
    return {
      current_static_addr_list: [
        { hostname: 'Home Server', ip: '192.168.0.10', mac: '11:22:33:44:55:00' },
      ],
    };
  }
  return {};
}

const COMMANDS = [
  'modem_main_state',
  'signalbar',
  'network_type',
  'network_provider',
  'rssi',
  'rscp',
  'lte_rsrp',
  'lte_rsrq',
  'sinr',
  'cell_id',
  'Z_dl_earfcn',
  'realtime_tx_bytes',
  'realtime_rx_bytes',
  'realtime_tx_thrpt',
  'realtime_rx_thrpt',
  'monthly_rx_bytes',
  'monthly_tx_bytes',
  'monthly_time',
  'imei',
  'msisdn',
  'cr_version',
  'wa_version',
  'hardware_version',
  'lan_ipaddr',
  'mac_address',
  'wan_ipaddr',
  'ppp_status',
  'wifi_access_sta_num',
  'sms_unread_num',
  'host_name_web',
  'mac_addr_web',
  'ip_addr_web',
  'lan_netmask',
  'dhcpEnabled',
  'guest_dhcpEnabled',
  'net_select',
];

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function App() {
  // Authentication & Connections State
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Router configuration settings
  const [routerIp, setRouterIp] = useState('192.168.0.1');
  const [routerPassword, setRouterPassword] = useState('FoldMund2204*');

  // Overlay states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBootstrapOpen, setIsBootstrapOpen] = useState(true);
  const [bootstrapHasError, setBootstrapHasError] = useState(false);

  // Auto Refresh checkbox
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Main UI Data State
  const [routerData, setRouterData] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [staticIps, setStaticIps] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState('');

  // Sparkline data histories
  const [rsrpHistory, setRsrpHistory] = useState<number[]>([]);
  const [sinrHistory, setSinrHistory] = useState<number[]>([]);
  const [dlHistory, setDlHistory] = useState<number[]>([]);
  const [ulHistory, setUlHistory] = useState<number[]>([]);

  // Toast notification state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Advanced control states
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isAddingStaticIp, setIsAddingStaticIp] = useState(false);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const refresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      let data = await fnCall<any>('fetch_router_data', { commands: COMMANDS.join(',') });

      // Check if router requires login
      if (!data || data.result === 'not_login' || !data.network_provider) {
        console.log('🔑 Router returned not_login. Attempting login...');
        const loginResult = await fnCall<any>('login');
        if (loginResult && (loginResult.result === '0' || loginResult.result === 'ok')) {
          // Retry fetch
          data = await fnCall<any>('fetch_router_data', { commands: COMMANDS.join(',') });
        } else {
          throw new Error('Login failed');
        }
      }

      if (!data || data.result === 'not_login') {
        throw new Error('Could not authenticate with router');
      }

      const stationData = await fnCall<any>('fetch_stations').catch(() => null);
      const staticData = await fnCall<any>('fetch_static_ips').catch(() => null);

      setRouterData(data);
      setStations(stationData?.station_list || []);
      setStaticIps(staticData?.current_static_addr_list || []);

      // Calculate Sparkline point values
      const rsrpVal = parseInt(data.lte_rsrp) || 0;
      const sinrVal = parseFloat(data.sinr) || 0;
      const dlSpeedBps = (parseFloat(data.realtime_rx_thrpt) || 0) * 8;
      const ulSpeedBps = (parseFloat(data.realtime_tx_thrpt) || 0) * 8;

      setRsrpHistory((prev) => [...prev, rsrpVal].slice(-50));
      setSinrHistory((prev) => [...prev, sinrVal].slice(-50));
      setDlHistory((prev) => [...prev, dlSpeedBps].slice(-50));
      setUlHistory((prev) => [...prev, ulSpeedBps].slice(-50));

      const now = new Date();
      setLastUpdate(
        'UPDATED: ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setIsConnected(true);
      setBootstrapHasError(false);
      setIsBootstrapOpen(false);
    } catch (e) {
      console.error('Refresh failed:', e);
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate('');
      setIsConnected(false);
      setBootstrapHasError(true);
      setIsBootstrapOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await fnCall<any>('login');
      const success = result && (result.result === '0' || result.result === 'ok');
      if (success) {
        showToast('Logged in successfully!', 'success');
        setTimeout(refresh, 500);
      } else {
        showToast('Login failed.', 'error');
      }
    } catch {
      showToast('An error occurred during login.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fnCall('logout');
      showToast('Logged out successfully.', 'info');
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate('');
      setIsConnected(false);
    } catch {
      showToast('An error occurred during logout.', 'error');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Helper: Convert string to UCS-2 Hex for SMS
  const toUcs2Hex = (str: string): string => {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      hex += code.toString(16).toUpperCase().padStart(4, '0');
    }
    return hex;
  };

  // Helper: Format SMS date
  const getSmsDate = (): string => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');

    const offsetMinutes = -now.getTimezoneOffset();
    const offsetQuarters = Math.round(offsetMinutes / 15);
    const sign = offsetQuarters >= 0 ? '+' : '-';
    const zz = Math.abs(offsetQuarters).toString().padStart(2, '0');

    return `${yy};${mm};${dd};${hh};${min};${ss};${sign}${zz}`;
  };

  const handleReboot = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reboot the router? This will temporarily disconnect your internet connection.'
    );
    if (!confirmed) return;

    showToast('Rebooting router...', 'info');
    try {
      await fnCall('reboot');
      showToast('Reboot command sent. Router is restarting...', 'success');
      // Clear state & show connection bootstrap loader
      setIsConnected(false);
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate('');
      setBootstrapHasError(false);
      setIsBootstrapOpen(true);

      // Try reconnecting after a brief period
      setTimeout(refresh, 15000);
    } catch (e) {
      showToast(`Reboot failed: ${e}`, 'error');
    }
  };

  const handleConnectNetwork = async () => {
    showToast('Connecting WAN...', 'info');
    try {
      await fnCall('connect_network');
      showToast('WAN Connection command sent.', 'success');
      setTimeout(refresh, 2000);
    } catch (e) {
      showToast(`Connection failed: ${e}`, 'error');
    }
  };

  const handleDisconnectNetwork = async () => {
    showToast('Disconnecting WAN...', 'info');
    try {
      await fnCall('disconnect_network');
      showToast('WAN Disconnection command sent.', 'success');
      setTimeout(refresh, 2000);
    } catch (e) {
      showToast(`Disconnection failed: ${e}`, 'error');
    }
  };

  const handleSetBearerPreference = async (pref: string) => {
    const prefLabel = pref === 'Network_Auto' ? 'Auto' : pref === 'Only_LTE' ? '4G Only' : '5G Only';
    showToast(`Locking bearer preference to ${prefLabel}...`, 'info');
    try {
      await fnCall('set_bearer_preference', { preference: pref });
      showToast('Bearer preference updated successfully.', 'success');
      setTimeout(refresh, 2000);
    } catch (e) {
      showToast(`Failed to update bearer preference: ${e}`, 'error');
    }
  };

  const handleSaveStaticIp = async (hostname: string, ip: string, mac: string) => {
    setIsAddingStaticIp(true);
    showToast(`Reserving IP ${ip} for ${mac}...`, 'info');
    try {
      await fnCall('add_static_ip', { hostname, ipAddr: ip, macAddr: mac });
      showToast('Static IP reserved successfully.', 'success');
      setTimeout(refresh, 1000);
    } catch (e) {
      showToast(`Failed to reserve IP: ${e}`, 'error');
    } finally {
      setIsAddingStaticIp(false);
    }
  };

  const handleSendSms = async (number: string, message: string) => {
    setIsSendingSms(true);
    showToast(`Sending SMS to ${number}...`, 'info');
    try {
      const hexMsg = toUcs2Hex(message);
      const dateStr = getSmsDate();
      await fnCall('send_sms', { number, messageHex: hexMsg, date: dateStr });
      showToast('SMS sent successfully!', 'success');
      setIsSmsModalOpen(false);
      setTimeout(refresh, 2000);
    } catch (e) {
      showToast(`Failed to send SMS: ${e}`, 'error');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSaveSettings = async (ip: string, pass: string) => {
    try {
      await fnCall('save_config', { config: { router_ip: ip, router_password: pass } });
      setRouterIp(ip);
      setRouterPassword(pass);
      setIsSettingsOpen(false);
      showToast('Configuration saved!', 'success');

      // Clear states for clean reconnection
      setRouterData(null);
      setStations([]);
      setStaticIps([]);
      setRsrpHistory([]);
      setSinrHistory([]);
      setDlHistory([]);
      setUlHistory([]);
      setLastUpdate('');
      setIsConnected(false);
      setBootstrapHasError(false);
      setIsBootstrapOpen(true);

      setTimeout(refresh, 500);
    } catch (e) {
      showToast(`Failed to save settings: ${e}`, 'error');
    }
  };

  // Load config on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fnCall<any>('get_config');
        if (config) {
          setRouterIp(config.router_ip);
          setRouterPassword(config.router_password);
        }
      } catch (e) {
        console.error('Failed to load configuration:', e);
      }
    };

    loadConfig().then(() => {
      refresh();
    });
  }, []);

  // Poll recursive effect loop
  useEffect(() => {
    let timeoutId: any = null;

    const poll = async () => {
      if (autoRefresh && isConnected) {
        await refresh();
        timeoutId = setTimeout(poll, 2000);
      }
    };

    if (autoRefresh && isConnected) {
      timeoutId = setTimeout(poll, 2000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [autoRefresh, isConnected]);

  // Derived Values
  const rsrp = routerData ? parseInt(routerData.lte_rsrp) || 0 : null;
  const sinr = routerData ? parseFloat(routerData.sinr) || 0 : null;
  const cellId = routerData?.cell_id || '';
  const earfcn = routerData?.Z_dl_earfcn || '';

  const monthlyRx = routerData ? parseInt(routerData.monthly_rx_bytes) || 0 : null;
  const monthlyTx = routerData ? parseInt(routerData.monthly_tx_bytes) || 0 : null;
  const monthlyTime = routerData ? parseInt(routerData.monthly_time) || 0 : null;
  const provider = routerData?.network_provider || '';
  const networkType = routerData?.network_type || '';

  const dlSpeed = routerData ? (parseFloat(routerData.realtime_rx_thrpt) || 0) * 8 : null;
  const ulSpeed = routerData ? (parseFloat(routerData.realtime_tx_thrpt) || 0) * 8 : null;
  const totalSessionBytes = routerData
    ? (parseInt(routerData.realtime_rx_bytes) || 0) + (parseInt(routerData.realtime_tx_bytes) || 0)
    : null;

  return (
    <>
      {/* Toast Notifications */}
      <div id="toastContainer" className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
            <span
              style={{ marginLeft: '10px', cursor: 'pointer', opacity: 0.7 }}
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
            >
              ✕
            </span>
          </div>
        ))}
      </div>

      {/* Bootstrap Connection Loader Overlay */}
      <BootstrapOverlay
        isOpen={isBootstrapOpen}
        hasError={bootstrapHasError}
        routerIp={routerIp}
        onRetry={refresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Router Credentials Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        initialIp={routerIp}
        initialPassword={routerPassword}
        onCancel={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Main Container */}
      <div className="container">
        <Header
          isConnected={isConnected}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={setAutoRefresh}
          lastUpdate={lastUpdate}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          isLoggingIn={isLoggingIn}
          isLoggingOut={isLoggingOut}
          pppStatus={routerData?.ppp_status || ''}
          onReboot={handleReboot}
          onConnectNetwork={handleConnectNetwork}
          onDisconnectNetwork={handleDisconnectNetwork}
        />

        <div className="dashboard-grid">
          {/* Signal Card */}
          <SignalCard
            rsrp={rsrp}
            sinr={sinr}
            cellId={cellId}
            earfcn={earfcn}
            rsrpHistory={rsrpHistory}
            sinrHistory={sinrHistory}
            bearerPreference={routerData?.net_select}
            onSetBearerPreference={handleSetBearerPreference}
          />

          {/* Monthly Usage Card */}
          <UsageCard
            monthlyRx={monthlyRx}
            monthlyTx={monthlyTx}
            monthlyTime={monthlyTime}
            provider={provider}
            networkType={networkType}
          />

          {/* Realtime Rate speeds */}
          <RealtimeCard
            dlSpeed={dlSpeed}
            ulSpeed={ulSpeed}
            totalSessionBytes={totalSessionBytes}
            dlHistory={dlHistory}
            ulHistory={ulHistory}
          />

          {/* Network configurations, firmware info, stats */}
          <InfoCard
            wanIp={routerData?.wan_ipaddr || ''}
            pppStatus={routerData?.ppp_status || ''}
            lanIp={routerData?.lan_ipaddr || routerData?.ip_addr_web || ''}
            lanNetmask={routerData?.lan_netmask || ''}
            dhcpEnabled={routerData?.dhcpEnabled || ''}
            macAddress={routerData?.mac_address || ''}
            imei={routerData?.imei || ''}
            firmware={routerData?.cr_version || routerData?.wa_version || ''}
            hardware={routerData?.hardware_version || ''}
            msisdn={routerData?.msisdn || ''}
            smsUnread={routerData?.sms_unread_num || '0'}
            wifiClients={routerData?.wifi_access_sta_num || ''}
            onOpenSmsComposer={() => setIsSmsModalOpen(true)}
          />

          {/* Client devices active/static list tables */}
          <DevicesTable
            staticIps={staticIps}
            stations={stations}
            onAddStaticIp={handleSaveStaticIp}
            isAddingStaticIp={isAddingStaticIp}
            onShowToast={showToast}
          />
        </div>
      </div>

      {/* SMS Composer Modal */}
      <SmsModal
        isOpen={isSmsModalOpen}
        onCancel={() => setIsSmsModalOpen(false)}
        onSend={handleSendSms}
        isSending={isSendingSms}
      />
    </>
  );
}
