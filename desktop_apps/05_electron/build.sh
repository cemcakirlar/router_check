#!/bin/bash

# ==============================================================================
# RouterCheck Build Script (Electron)
# This script prepares the Electron application by:
# 1. Compiling the Python backend into a "sidecar" binary.
# 2. Setting up the Node.js environment for the Electron frontend.
# ==============================================================================

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting build for RouterCheck (Electron)..."

# Ensure the script runs relative to its own directory
cd "$(dirname "$0")"

# ------------------------------------------------------------------------------
# 1. Environment Setup (Python)
# ------------------------------------------------------------------------------

# Attempt to locate and activate the Python virtual environment from the project root
VENV_PATH="../../.venv/bin/activate"
if [ -f "$VENV_PATH" ]; then
    echo "🐍 Activating virtual environment..."
    source "$VENV_PATH"
else
    echo "⚠️  Warning: Virtual environment not found at $VENV_PATH. Using system Python."
fi

# ------------------------------------------------------------------------------
# 2. Build the Python Sidecar
# ------------------------------------------------------------------------------

# We bundle the Python server as a single executable that Electron will spawn.
# Note: We do NOT use --windowed here because this binary runs in the 
# background as a child process of Electron.
echo "🏗️  Building Python sidecar..."

python3 -m pip install --upgrade pyinstaller

# --onefile:  Bundles the backend into a single executable for easy distribution.
# --noconfirm: Overwrites the output directory without asking.
# --clean:    Cleans the PyInstaller cache before building.
# --name:     The name of the sidecar binary (used by Electron's main process).
pyinstaller --onefile --noconfirm --clean --name "server-macos" server.py

# Create the internal resources directory and move the sidecar there.
# Electron will look for this binary at runtime.
mkdir -p resources/bin
cp dist/server-macos resources/bin/

# ------------------------------------------------------------------------------
# 3. Setup Electron (Node.js)
# ------------------------------------------------------------------------------

echo "📦 Installing npm dependencies..."

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found. Please install Node.js and npm to continue."
    exit 1
else
    # Install dependencies listed in package.json
    npm install
fi

# ------------------------------------------------------------------------------
# 4. Finalization
# ------------------------------------------------------------------------------

echo "✅ Setup complete!"
echo ""
echo "🖥️  To run in development mode:"
echo "    npm start"
echo ""
echo "📦 To package for distribution:"
echo "    npm run package"
