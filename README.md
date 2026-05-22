# 🚀 ZTE Router Dashboard & Monitor Suite

A premium, modern web dashboard, powerful CLI diagnostics tool, and cross-platform desktop application suite for ZTE mobile routers. Specifically designed for models like the **MF286R**, **MC801A**, **MU5001**, and other ZTE 4G/5G units that use the standard `goform` web API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

---

## ✨ Features

### 🎨 Premium Glassmorphism Dashboard
- **Modern Aesthetics**: Built with high-end glassmorphism styling, vibrant HSL gradients, and the modern **Outfit** font face.
- **Dynamic Sparklines & Trends**: Live-rendered SVG sparklines tracking signal strength (RSRP), quality (SINR), download speeds, and upload speeds over time.
- **Trend Statistics**: Dynamically calculated Min, Max, and Average values for RSRP, SINR, and real-time traffic speeds.
- **Zero-Latency Data Mapping**: Uses an efficient custom data-attribute binder (`data-field` / `data-format`) for instant UI updates.
- **Connected Stations & Static IP tables**: Live tables displaying connected client hostnames, MACs, and IPs alongside static IP reservations.
- **Responsive Layout**: Designed to look stunning on both mobile phones and ultra-wide desktop monitors.

### 🛠️ Standalone Diagnostics (CLI)
- **Deep Signal Diagnostics**: Immediate analysis of **RSRP**, **RSRQ**, and **SINR** signal parameters.
- **Band & Cell Identification**: Real-time extraction of Cell ID, EARFCN, and connection technology (4G/5G).
- **Traffic Insights**: Tracks session throughput and monthly data caps against usage thresholds.

### 🛡️ Smart Local Proxy Server
- **CORS Bypass**: Solves browser CORS blocking policies by proxying request headers directly to the router's internal endpoint.
- **Stateful Cookie Jar**: Standardizes login credentials and securely persists session cookies across polling cycles.
- **Clean Event Logger**: Terminal output prints only major session milestones (login, logout, backend shutdown).

---

## 🖥️ Desktop Application Targets

This suite has been expanded into five cross-platform desktop wrapper formats, located under the `desktop_apps/` directory. Each wrappers bundles the Python proxy backend as a child process or a standalone "sidecar" binary.

| Target Directory | Framework | Description | Key Features | Build Script |
| :--- | :--- | :--- | :--- | :--- |
| [`01_pyinstaller_autobrowser`](file:///Users/cakirlarc/Projects/__DEV__/router_check/desktop_apps/01_pyinstaller_autobrowser) | **PyInstaller + Browser** | Packages the Python backend and auto-opens the system default web browser. | Ultra-lightweight, zero node dependencies. | `build.sh` |
| [`02_pywebview`](file:///Users/cakirlarc/Projects/__DEV__/router_check/desktop_apps/02_pywebview) | **PyWebView** | Packages the backend and mounts it into a lightweight native webview window. | Single-window desktop app, native OS styling. | `build.sh` |
| [`03_eel`](file:///Users/cakirlarc/Projects/__DEV__/router_check/desktop_apps/03_eel) | **Eel** | Runs Python backend and connects it to a Chrome/Edge runtime window. | Bidirectional JS/Python IPC bridge. | `build.sh` |
| [`05_electron`](file:///Users/cakirlarc/Projects/__DEV__/router_check/desktop_apps/05_electron) | **Electron** | Bundles the frontend dashboard and embeds the Python backend as a packaged sidecar. | Port conflict resolving, IPC restart/stop bridges, cleanup teardown screens. | `build.sh` |
| [`06_tauri`](file:///Users/cakirlarc/Projects/__DEV__/router_check/desktop_apps/06_tauri) | **Tauri (Rust)** | Lightning-fast native wrapper leveraging a Rust core with a Python sidecar binary. | Minimal binary size, port conflict recovery, robust resource teardown. | `build.sh` |

### ⚡ Sidecar Lifecycle Management & Recovery (Electron & Tauri)
The **Electron** and **Tauri** targets feature enterprise-grade lifecycle handling:
- **Port Conflict Resolution**: Checks if port `8080` is in use. On macOS, it runs `lsof -t -i tcp:8080` to locate conflicting process PIDs and executes `kill -9` to automatically release the port.
- **Safe Teardown**: Upon window close, the apps display a teardown screen, kill the background Python sidecar, ensure port 8080 is clean, and exit to prevent orphaned processes.
- **Control Bridge**: Users can restart or shut down the proxy server directly from the UI dashboard using IPC channels.

---

## 🚦 Getting Started

### 1. Prerequisites
- **Python 3.8+**
- **Node.js 16+** (Only required for the Electron & Tauri desktop targets)
- **Rust / Cargo** (Only required for compiling the Tauri target from source)
- A ZTE Router on the local network (Default IP: `192.168.0.1`)

### 2. Setup Environment
```bash
# Clone the repository
git clone https://github.com/yourusername/router_check.git
cd router_check

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install core dependencies
pip install --upgrade pip
pip install requests pyinstaller pywebview eel setuptools
```

### 3. Configuration
Open `server.py` and `router_status.py` in the root (or inside your target desktop folder) and configure:
- `ROUTER_IP`: IP address of the router (Default: `192.168.0.1`)
- `PASSWORD`: Router's admin dashboard password

---

## 🚀 Usage

### 🌐 Web Dashboard (CLI Launcher)
Runs the standalone proxy server and serves the dashboard via your browser:
```bash
python3 server.py
# Open http://localhost:8080 in your web browser
```

### 💻 Diagnostic CLI Tool
Prints a detailed snapshot of router parameters directly to your shell:
```bash
python3 router_status.py
```

### 🖥️ Building Desktop Applications

Ensure your virtual environment is active before running any desktop build scripts.

#### Electron
```bash
cd desktop_apps/05_electron
npm install
./build.sh      # Packages Python sidecar & copies resources
npm start       # Run dev environment
npm run package # Build production installer (.dmg/.exe)
```

#### Tauri
```bash
cd desktop_apps/06_tauri
npm install
./build.sh      # Packages Python sidecar as a Tauri sidecar binary
npm run dev     # Run dev environment
npm run build   # Compile optimized native binary
```

---

## 📂 Project Structure

```
├── README.md               # You are here
├── server.py               # Core local proxy server
├── router_status.py        # CLI diagnostic script
├── index.html              # Dashboard markup
├── dashboard.js            # Core JS data-binding & sparkline updates
└── desktop_apps/           # Desktop App Target Prototypes
    ├── 01_pyinstaller_autobrowser/
    ├── 02_pywebview/
    ├── 03_eel/
    ├── 05_electron/        # Electron wrapper configuration, scripts, & IPC setup
    └── 06_tauri/           # Tauri (Rust) wrapper configuration, sidecars, & setup
```

---

## 📊 Signal Quality Reference

The tool provides status grades based on industry LTE/5G signal metrics:

| Metric | Excellent (Green) | Good (Cyan) | Fair (Orange) | Poor (Red) |
| :--- | :--- | :--- | :--- | :--- |
| **RSRP** (Strength) | `> -80 dBm` | `-80 to -90 dBm` | `-90 to -105 dBm` | `< -105 dBm` |
| **SINR** (Quality) | `> 15 dB` | `10 to 15 dB` | `5 to 10 dB` | `< 5 dB` |

---

## 🛠️ Troubleshooting

- **CORS Blocked**: Ensure you access the app through the proxy URL (`http://localhost:8080`) instead of double-clicking `index.html` on your filesystem.
- **Zombie Python Process**: If the port is blocked and conflict resolution fails, manually free port 8080:
  ```bash
  kill -9 $(lsof -t -i:8080)
  ```
- **Tauri Sidecar Naming**: If Tauri fails to launch, check that the sidecar binary under `src-tauri/bin/` is named exactly `server-macos-<target_triple>` matching your current system architecture (e.g. `server-macos-aarch64-apple-darwin`).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
