#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build for RouterCheck (Electron)..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# Try to find and source the virtual environment in the project root
VENV_PATH="../../.venv/bin/activate"
if [ -f "$VENV_PATH" ]; then
    echo "🐍 Activating virtual environment..."
    source "$VENV_PATH"
fi

# 1. Build the Python Sidecar
# We bundle the Python server as a single executable that Electron will spawn.
# We don't use --windowed because this is a background sidecar.
echo "🏗️  Building Python sidecar..."
python3 -m pip install pyinstaller
pyinstaller --onefile --noconfirm --clean --name "server-macos" server.py

# Move sidecar to the resources folder
mkdir -p resources/bin
cp dist/server-macos resources/bin/

# 2. Setup Electron
echo "📦 Installing npm dependencies..."
if ! command -v npm &> /dev/null; then
    echo "⚠️  npm not found. Please install Node.js and npm."
else
    npm install
fi

echo "✅ Setup complete!"
echo ""
echo "🖥️  To run in development mode:"
echo "    cd desktop_apps/05_electron && npm start"
echo ""
echo "📦 To package for distribution:"
echo "    cd desktop_apps/05_electron && npm run package"
