#!/bin/bash

# ==============================================================================
# RouterCheck Build Script (PyInstaller + Auto-Browser)
# This script packages the Python application into a standalone macOS .app bundle.
# This variant typically runs a local server and automatically opens the 
# system's default web browser to display the dashboard.
# ==============================================================================

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting build for RouterCheck (PyInstaller + Auto-Browser)..."

# Ensure the script runs relative to its own directory
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

# Ensure PyInstaller is installed/available
if ! command -v pyinstaller &> /dev/null; then
    echo "📦 PyInstaller not found. Installing..."
    python3 -m pip install --upgrade pyinstaller
fi

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
# --onedir:   Creates a folder containing the executable and libraries.
#             Required for standard macOS .app bundles.
# --windowed: (or --noconsole) Prevents a terminal from opening. 
#             Note: For this variant, the browser will open in a separate window.
# --noconfirm: Overwrites output directory without asking.
# --clean:    Cleans PyInstaller cache before building.
# --add-data: Bundles external files (HTML/JS) into the application.
#             Format: "source:destination" (destination "." is the root of the bundle).
# --name:     The name of the generated .app bundle.
pyinstaller --onedir --windowed --noconfirm --clean \
    --add-data "index.html:." \
    --add-data "dashboard.js:." \
    --name "RouterCheck" \
    server.py

# ------------------------------------------------------------------------------
# 4. Finalization
# ------------------------------------------------------------------------------

echo "✅ Build complete!"
echo "📁 Standalone app is located in: $(pwd)/dist/RouterCheck.app"
echo "ℹ️  On macOS, you can find the executable inside the .app bundle."
