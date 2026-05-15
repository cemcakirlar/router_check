# ZTE Router Dashboard & Monitor

A modern web dashboard and CLI monitoring tool for ZTE mobile routers (specifically tested on ZTE 4G/5G models like MC801A, MU5001, etc.).

## Features

- **Real-time Monitoring**: Track signal strength (RSRP, RSRQ, SINR), data usage, and battery status.
- **Modern Web UI**: A glassmorphism-inspired dashboard with smooth animations and responsive design.
- **CLI Reports**: Quick terminal-based reports with signal quality analysis and connected device lists.
- **Bypass CORS**: Includes a local proxy server to communicate with the router without browser security restrictions.
- **Device Management**: View connected stations and static IP reservations.

## Prerequisites

- Python 3.x
- `requests` library (for CLI tool)

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install requests
```

## Getting Started

### 1. Configure Connection
Open `server.py` or `router_status.py` and update the `ROUTER_IP` and `PASSWORD` variables if they differ from the defaults:
- **Default IP**: `192.168.0.1`
- **Default Port**: `8080` (Local Proxy)

### 2. Run the Web Dashboard
The web dashboard requires the proxy server to handle authentication and bypass CORS.

```bash
python server.py
```
Then visit: [http://localhost:8080](http://localhost:8080)

### 3. Run the CLI Tool
For a quick status report in your terminal:

```bash
python router_status.py
```

## Project Structure

- `server.py`: Local proxy server (built with `http.server`) that serves the UI and handles router communication.
- `router_status.py`: Standalone CLI script for quick diagnostic reports.
- `index.html`: The frontend dashboard structure.
- `dashboard.js`: Frontend logic, data polling, and UI updates.
- `.gitignore`: Standard ignores for Python and macOS.

## Signal Quality Reference

The CLI tool and dashboard provide analysis based on:
- **RSRP (Strength)**: Excellent (>-80dBm) to Poor (<-100dBm).
- **SINR (Quality)**: Excellent (>13dB) to Poor (<0dB).

## License
MIT
