#!/bin/bash

# ==============================================================================
# RouterCheck Build Script (PyWebView)
# This script packages the Python + Webview application into a standalone 
# macOS .app bundle using PyInstaller.
# ==============================================================================

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting build for RouterCheck (PyWebView)..."

# Ensure the script runs relative to its own directory, regardless of where it's called from
cd "$(dirname "$0")"

# ------------------------------------------------------------------------------
# 1. Environment Setup
# ------------------------------------------------------------------------------

# Attempt to locate and activate the Python virtual environment from the project root
VENV_PATH="../../.venv/bin/activate"
if [ -f "$VENV_PATH" ]; then
    echo "🐍 Activating virtual environment..."
    source "$VENV_PATH"
else
    echo "⚠️  Warning: Virtual environment not found at $VENV_PATH. Using system Python."
fi

# Ensure the necessary packaging tools are installed/updated
echo "📦 Ensuring dependencies are installed..."
python3 -m pip install --upgrade pyinstaller pywebview

# ------------------------------------------------------------------------------
# 2. Cleanup
# ------------------------------------------------------------------------------

# Remove previous build artifacts to ensure a fresh compilation
echo "🧹 Cleaning previous builds..."
rm -rf build dist *.spec

# ------------------------------------------------------------------------------
# 3. Packaging
# ------------------------------------------------------------------------------

echo "🏗️  Building standalone executable..."

# PyInstaller Configuration:
# --onedir:   Creates a folder containing the executable and dynamic libraries. 
#             This is required for a standard macOS .app bundle structure.
# --windowed: (or --noconsole) Prevents a terminal/command prompt from opening 
#             when the app is launched. Essential for GUI apps.
# --noconfirm: Overwrites the output directory without asking for permission.
# --clean:    Cleans the PyInstaller cache before building.
# --add-data: Bundles external files (HTML/JS) into the application. 
#             Format: "source:destination" (destination "." is the root of the bundle).
# --name:     The name of the generated .app bundle.
pyinstaller --onedir --windowed --noconfirm --clean \
    --add-data "index.html:." \
    --add-data "dashboard.js:." \
    --name "RouterCheck-WebView" \
    server.py

# ------------------------------------------------------------------------------
# 4. Finalization
# ------------------------------------------------------------------------------

echo "✅ Build complete!"
echo "📁 Standalone app is located in: $(pwd)/dist/RouterCheck-WebView.app"
