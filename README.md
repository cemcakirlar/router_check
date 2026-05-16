# 🚀 ZTE Router Dashboard & Monitor

A premium, modern web dashboard and powerful CLI monitoring tool for ZTE mobile routers. Specifically designed for models like the **MF286R**, **MC801A**, **MU5001**, and other ZTE 4G/5G units that use the standard `goform` API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)

---

## ✨ Features

### 🎨 Modern Web Dashboard
- **Glassmorphism Design**: A sleek, transparent UI with vibrant accents and smooth micro-animations.
- **Real-time Data Mapping**: Uses an efficient data-attribute system for instant UI updates without manual DOM manipulation.
- **Responsive Layout**: Optimized for both desktop and mobile viewing.
- **Live Polling**: Continuous background updates for signal metrics and connection status.

### 🛠️ Powerful Monitoring
- **Signal Analysis**: Real-time tracking and interpretation of **RSRP**, **RSRQ**, and **SINR**.
- **Data Insights**: Monitor upload/download speeds, total data usage, and monthly limits.
- **Device Management**: View a live list of connected stations and current static IP reservations.
- **Network Info**: Quick access to WAN/LAN IPs, IMEI, Software Versions, and more.

### 🛡️ Smart Proxy Server
- **CORS Bypass**: Includes a built-in Python proxy server to communicate with the router without browser security restrictions.
- **Session Persistence**: Maintains persistent authentication cookies across requests.
- **Lightweight Logging**: Clean terminal output showing only critical session events (login/logout).

---

## 📱 Supported Devices

This tool communicates via the ZTE `goform` API. It has been tested and is compatible with:
- **MF286R** (Verified)
- **MC801A** (Verified)
- **MU5001** (Verified)
- **MF286 / MF286D** (Compatible)
- **MF253V / MF283+** (Compatible)
- *Most ZTE units using the standard web-based admin interface.*

---

## 🚦 Getting Started

### 1. Prerequisites
- **Python 3.8+**
- A ZTE Router accessible via network (default `192.168.0.1`)

### 2. Setup Environment
```bash
# Clone the repository (if applicable)
# cd router_check

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install requests
```

### 3. Configuration
Open `server.py` and `router_status.py` to update the following variables if necessary:
- `ROUTER_IP`: Your router's gateway IP (Default: `192.168.0.1`)
- `PASSWORD`: Your router's admin password

---

## 🚀 Usage

### 🌐 Web Dashboard
The web dashboard requires the proxy server to handle authentication and bypass CORS.

1. **Start the server**:
   ```bash
   python server.py
   ```
2. **Access the UI**:
   Open [http://localhost:8080](http://localhost:8080) in your browser.

### 💻 CLI Tool
For a comprehensive diagnostic report directly in your terminal:
```bash
python router_status.py
```

---

## 📂 Project Structure

- 📄 `server.py`: The local proxy server and API bridge.
- 📄 `router_status.py`: Standalone CLI diagnostic script.
- 📄 `index.html`: The frontend structure (Glassmorphism design).
- 📄 `dashboard.js`: Frontend logic and real-time data mapping.
- 📄 `.gitignore`: Optimized for Python and environment artifacts.

---

## 📊 Signal Quality Reference

The tool provides analysis based on industry-standard ranges:

| Metric | Excellent | Good | Fair | Poor |
| :--- | :--- | :--- | :--- | :--- |
| **RSRP** (Strength) | > -80 dBm | -80 to -90 | -90 to -100 | < -100 dBm |
| **SINR** (Quality) | > 13 dB | 10 to 13 | 0 to 10 | < 0 dB |

---

## 🛠️ Troubleshooting

- **Authentication Failed**: Ensure your `PASSWORD` is correct in both `.py` files.
- **Connection Timed Out**: Verify your machine is connected to the router's network and `ROUTER_IP` is correct.
- **CORS Errors**: Ensure you are accessing the dashboard via `http://localhost:8080` and NOT by opening `index.html` directly.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
