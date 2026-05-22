#!/bin/bash
set -e
cd "$(dirname "$0")"

# 1. Environment Setup (Python)
VENV_PATH="../../.venv/bin/activate"
if [ -f "$VENV_PATH" ]; then
    echo "🐍 Activating virtual environment..."
    source "$VENV_PATH"
else
    echo "⚠️  Warning: Virtual environment not found at $VENV_PATH. Using system Python."
fi

echo "🏗️  Installing PyInstaller..."
python3 -m pip install --upgrade pyinstaller

# 2. Get the target triple for Tauri sidecar naming
TARGET_TRIPLE=$(rustc -vV | grep host | cut -d ' ' -f 2 2>/dev/null || true)
if [ -z "$TARGET_TRIPLE" ]; then
    # Fallback to standard macOS architectures if rustc is not found
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        TARGET_TRIPLE="aarch64-apple-darwin"
    else
        TARGET_TRIPLE="x86_64-apple-darwin"
    fi
fi

echo "🏗️  Building Python sidecar for target: $TARGET_TRIPLE..."
pyinstaller --onefile --noconfirm --clean --name "server-macos" server.py

# Move sidecar binary with target triple suffix to src-tauri/bin/
mkdir -p src-tauri/bin
cp "dist/server-macos" "src-tauri/bin/server-macos-$TARGET_TRIPLE"

# 3. Setup Node/Tauri CLI
echo "📦 Installing Tauri NPM dependencies..."
if ! command -v npm &> /dev/null; then
    echo "⚠️  Warning: npm not found. Skipping npm install."
else
    npm install
fi

echo "✅ Tauri Setup Complete!"
echo "To run the Tauri app in development mode, run:"
echo "  npm run dev"
