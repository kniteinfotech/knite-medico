#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  💻 Building KNITE Medico Desktop Application"
echo "=========================================================="

cd /home/knite-server/Documents/Medical\ saas/client

echo "1. Building Vite Production Bundle..."
npm run build

echo "2. Packaging with Electron Builder..."
# Builds for current platform; use --win for Windows .exe or --mac for macOS .dmg
npx electron-builder --linux --publish never

echo "✅ Desktop installer created inside: client/dist-electron/"
