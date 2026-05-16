#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build for RouterCheck (PyWebView)..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# Try to find and source the virtual environment in the project root
VENV_PATH="../../.venv/bin/activate"
if [ -f "$VENV_PATH" ]; then
    echo "🐍 Activating virtual environment..."
    source "$VENV_PATH"
fi

# Install dependencies
echo "📦 Installing dependencies..."
python3 -m pip install pyinstaller pywebview

# Clean previous builds
rm -rf build dist *.spec

echo "🏗️  Building standalone executable..."

# --onedir: creates a standard macOS .app bundle structure (preferred over --onefile for windowed apps)
# --windowed: creates the .app bundle and prevents a terminal from opening
# --add-data: include the frontend files
# --name: name of the final executable
pyinstaller --onedir --windowed --noconfirm --clean \
    --add-data "index.html:." \
    --add-data "dashboard.js:." \
    --name "RouterCheck-WebView" \
    server.py

echo "✅ Build complete!"
echo "📁 Standalone app is located in: $(pwd)/dist/RouterCheck-WebView.app"
