#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build for RouterCheck (Eel)..."

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
python3 -m pip install pyinstaller eel setuptools

# Clean previous builds
rm -rf build dist *.spec

echo "🏗️  Building standalone executable..."

# Use PyInstaller directly to avoid issues with the Eel CLI in newer Python versions
# --onedir: preferred structure for macOS .app bundles
# --add-data "web:web": includes the frontend folder
pyinstaller --onedir --windowed --noconfirm --clean \
    --add-data "web:web" \
    --name "RouterCheck-Eel" \
    server.py

echo "✅ Build complete!"
echo "📁 Standalone app is located in: $(pwd)/dist/RouterCheck-Eel.app"
