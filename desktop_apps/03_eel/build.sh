#!/bin/bash

# ==============================================================================
# RouterCheck Build Script (Eel)
# This script packages the Eel-based Python application into a standalone 
# macOS .app bundle. Eel uses a Chrome/Edge window to render the UI while
# running a Python backend.
# ==============================================================================

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting build for RouterCheck (Eel)..."

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

# Ensure the necessary packaging tools and frameworks are installed/updated
echo "📦 Ensuring dependencies are installed..."
python3 -m pip install --upgrade pyinstaller eel setuptools

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
# We use PyInstaller directly instead of the 'python -m eel' CLI to have 
# better control over the build process and avoid compatibility issues.

# --onedir:   Creates a folder containing the executable and dynamic libraries. 
#             This is the preferred structure for macOS .app bundles.
# --windowed: (or --noconsole) Prevents a terminal from opening. 
#             Eel will launch its own window (usually via Chrome).
# --noconfirm: Overwrites the output directory without asking.
# --clean:    Cleans the PyInstaller cache before building.
# --add-data: Bundles the entire frontend folder.
#             Format: "web:web" (copies the 'web' directory into the bundle root).
# --name:     The name of the generated .app bundle.
pyinstaller --onedir --windowed --noconfirm --clean \
    --add-data "web:web" \
    --name "RouterCheck-Eel" \
    server.py

# ------------------------------------------------------------------------------
# 4. Finalization
# ------------------------------------------------------------------------------

echo "✅ Build complete!"
echo "📁 Standalone app is located in: $(pwd)/dist/RouterCheck-Eel.app"
