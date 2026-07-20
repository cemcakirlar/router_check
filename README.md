# 🚀 ZTE Router Dashboard & Monitor

A premium, cross-platform desktop application written in **Tauri (Rust)** and **React / TypeScript / Vite** for monitoring and managing ZTE mobile routers (such as the **MF286R**, **MC801A**, **MU5001**, and other standard units using the standard `goform` web API).

This application bypasses CORS, manages sessions cleanly, provides signal statistics, tracks connected devices, and offers system tray controls—all within a lightweight native desktop container.

---

## ✨ Features

- **Modern Glassmorphism Design**: High-end glassmorphism dashboard styling, vibrant custom HSL gradients, and the **Outfit** typography.
- **Dynamic Signal Sparklines**: Live-updating signal parameters (RSRP, SINR) with real-time SVG trend sparklines.
- **Connected Clients & IP Settings**: Lists active hostnames, MAC addresses, IPs, and static IP reservations.
- **Native OS Vibrancy**: Supports native window translucency/vibrancy on macOS.
- **System Tray Management**: Can run in the background with tray controls to show/hide the dashboard, pause/resume polling, or force refresh.
- **Pure Rust Network Client**: Handles CORS issues natively and maintains stateful login sessions securely in Rust without python helpers.

---

## 🚦 Getting Started

### 1. Prerequisites

- **Node.js**: (v18+ recommended)
- **Rust Toolchain**: Cargo and rustc (needed for building/compiling the Tauri project)

### 2. Installation

Install Node dependencies in the root directory:

```bash
npm install
```

### 3. Development

Run the application in development mode:

```bash
npm run dev
```

### 4. Build

Compile the production-ready optimized native installer (e.g. `.dmg` on macOS, `.exe` on Windows):

```bash
npm run build
```

---

## 🛠️ Configuration

The app will prompt you for configuration details on first launch, or you can manage them within the application. The configurations are saved locally under the standard application config directory (`config.json`).

---

## Live router e2e (read-only)

Hits your LAN ZTE router through the same Rust HTTP path as the app (login / logout / telemetry / stations). Credentials are read **only** from project-root `.env.e2e` (never from `config.json`).

**ZTE login codes** (`LOGIN_MULTI_USER` `_orig.result`): `"0"` = success, `"1"` = wrong password. Do **not** probe wrong passwords in e2e — many units lock login for ~5 minutes.

**One-time setup** (~30 seconds):

```bash
cp .env.e2e.example .env.e2e
# edit .env.e2e → set ROUTER_IP and ROUTER_PASSWORD (correct password only)
```

Required keys: `ROUTER_IP`, `ROUTER_PASSWORD`. If either is missing, the suite skips and prints what to fix.

**Run:**

```bash
npm run test:e2e:live
```

Use `--nocapture` (already in the npm script) so response JSON shapes are printed to the terminal.
