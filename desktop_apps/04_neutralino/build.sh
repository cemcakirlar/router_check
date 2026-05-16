#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build for RouterCheck (Neutralinojs)..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# Try to find and source the virtual environment in the project root
VENV_PATH="../../.venv/bin/activate"
if [ -f "$VENV_PATH" ]; then
    echo "🐍 Activating virtual environment..."
    source "$VENV_PATH"
fi

# 1. Build the Python Sidecar
# We bundle the Python server as a single executable that Neutralino will manage.
# We don't use --windowed because this is a background sidecar.
echo "🏗️  Building Python sidecar..."
python3 -m pip install pyinstaller
pyinstaller --onefile --noconfirm --clean --name "server-macos" server.py

# Move sidecar to the bin folder expected by neutralino.config.json
mkdir -p bin
cp dist/server-macos bin/

# 2. Build the Neutralino app
# This requires the @neutralinojs/neu CLI
if command -v neu &> /dev/null; then
    echo "🏗️  Updating and Building Neutralino app..."
    neu update
    neu build
elif command -v npx &> /dev/null; then
    echo "🏗️  Updating and Building Neutralino app using npx..."
    npx -y @neutralinojs/neu update
    npx -y @neutralinojs/neu build
else
    echo "⚠️  Neutralino CLI (neu) not found and npx not found."
    echo "👉 Install it using: npm install -g @neutralinojs/neu"
fi

# 3. Finalize Distribution
echo "📦 Finalizing distribution..."
if [ -d "dist/router-check" ]; then
    cp -r bin dist/router-check/
    
    # Remove macOS quarantine attributes
    echo "🔓 Clearing macOS quarantine attributes..."
    xattr -cr dist/router-check || true
    
    # Ad-hoc sign the binaries (fixes -50 error on modern macOS)
    echo "✍️  Ad-hoc signing binaries..."
    codesign --force --deep --sign - dist/router-check/router-check-mac_arm64 || true
    codesign --force --deep --sign - dist/router-check/router-check-mac_universal || true
    codesign --force --deep --sign - dist/router-check/bin/server-macos || true
    
    # Create a proper .app bundle (the most reliable way to avoid -50 errors)
    echo "🍎 Creating macOS .app bundle..."
    APP_NAME="RouterCheck"
    APP_PATH="dist/router-check/$APP_NAME.app"
    
    # Clean up old bundle to ensure a fresh start
    rm -rf "$APP_PATH"
    mkdir -p "$APP_PATH/Contents/MacOS"
    mkdir -p "$APP_PATH/Contents/Resources"
    
    # Copy files into the bundle - Use the universal binary for maximum compatibility
    cp dist/router-check/router-check-mac_universal "$APP_PATH/Contents/MacOS/$APP_NAME"
    chmod +x "$APP_PATH/Contents/MacOS/$APP_NAME"
    
    # Standard location for resources in a macOS bundle
    cp dist/router-check/resources.neu "$APP_PATH/Contents/Resources/"
    # Fallback symlink in MacOS folder (some engines look here first)
    ln -sf ../Resources/resources.neu "$APP_PATH/Contents/MacOS/resources.neu"
    
    cp neutralino.config.json "$APP_PATH/Contents/MacOS/"
    cp -r dist/router-check/bin "$APP_PATH/Contents/MacOS/"
    
    # Create a minimal Info.plist
    cat > "$APP_PATH/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>io.cakirlar.routercheck</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.1</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
    
    # Ad-hoc sign everything inside the bundle, then the bundle itself
    echo "✍️  Ad-hoc signing the bundle contents..."
    find "$APP_PATH" -type f -exec codesign --force --deep --sign - {} \; 2>/dev/null || true
    codesign --force --deep --sign - "$APP_PATH" || true
    
    # Final un-quarantine of the finished bundle
    xattr -cr "$APP_PATH" || true
    
    echo "✅ Distribution ready in dist/router-check/"
    echo "🚀 You can now run: $APP_PATH"
fi

echo "✅ Build complete!"
echo "📁 Python sidecar is ready in bin/ and dist/router-check/bin/"
echo "📁 Neutralino resources are in resources/"
