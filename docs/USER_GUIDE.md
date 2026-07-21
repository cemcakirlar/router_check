# Router Check — User Guide

A desktop dashboard for monitoring ZTE mobile routers (MF286R, MC801A, MU5001, and similar `goform` API devices).

---

## 1. First launch

1. Open the app (desktop only — it does not work in a browser).
2. Enter your **router IP** (e.g. `192.168.0.1`) and **admin password**.
3. Click **Save Changes**. The app connects automatically.

Settings are stored locally in `config.json` under the app config directory.

---

## 2. Header controls

| Control                      | What it does                                      |
| ---------------------------- | ------------------------------------------------- |
| **API: Connected / Offline** | Login session status                              |
| **Pause / Auto**             | Pause or resume automatic polling                 |
| **Refresh**                  | Manual refresh (visible when auto-poll is paused) |
| **Settings**                 | Router IP, password, polling, theme               |
| **Login / Logout**           | Start or end the router session                   |

---

## 3. Dashboard cards

- **Network & Signal** — RSRP, SINR, sparklines, Cell ID, EARFCN. Use **Recover Cell** to re-attach to the tower when signal quality drops.
- **Realtime** — Live upload/download speed and throughput.
- **Router Info** — WAN/LAN status, network mode, connect/disconnect, bearer preference.
- **Usage** — Monthly and session data usage.
- **Logs** — Recent router-side changes.
- **Static IP Reservations** — Reserved hostnames, IPs, MACs.
- **Connected Devices** — Active clients on the network.

---

## 4. Settings

Open **Settings** to change:

- Router IP and admin password
- **Auto Refresh Polling Interval** (minimum 500 ms)
- **Auto Refresh on Startup**
- **Main Window Initial Status** — visible or hidden at launch
- **Theme** — System, Light, or Dark

After saving, the app reconnects with the new credentials.

---

## 5. System tray

The app can run in the background. Right-click the tray icon for:

- **Show / Hide Window**
- **Toggle Auto Refresh**
- **Force Refresh**
- **Quit**

Left-click toggles the main window. The tray title shows live signal info when connected.

---

## 6. Cell recovery

If SINR or signal quality is poor, click **Recover Cell** on the Signal card. The app runs an automated sequence: disconnect → 3G → Auto (LTE) → reconnect. You can **Abort** mid-sequence or **Dismiss** when done.

> This briefly interrupts your internet connection. Do not run it during critical work.

---

## 7. Troubleshooting

| Problem                       | Try this                                                           |
| ----------------------------- | ------------------------------------------------------------------ |
| Connection failure on startup | Check IP and password in **Settings**, then **Retry**              |
| Wrong password                | Many ZTE routers lock login for ~5 minutes after repeated failures |
| API stays Offline             | Click **Login** or restart the app                                 |
| No data updating              | Ensure **Auto** polling is on, or click **Refresh**                |

Your computer must be on the same network as the router (or able to reach its IP).
