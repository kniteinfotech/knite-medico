#!/usr/bin/env bash
# ==============================================================================
# KNITE Medico Pharmacy POS - Automated Linux Workstation Setup
# Website: https://knitemedico.kniteinfotech.in
# Support Hotline: +91 8778721940 | kniteinfotech@gmail.com
# ==============================================================================

set -e

echo ""
echo "======================================================================"
echo "  🏥 KNITE Medico Pharmacy POS - Native Linux Installer"
echo "  🌐 Platform: Linux $(uname -m)"
echo "======================================================================"
echo ""

APP_DIR="$HOME/.knite-medico"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICONS_DIR="$HOME/.local/share/icons"
ICON_PATH="$ICONS_DIR/knite-medico.png"
NATIVE_APP="$APP_DIR/KNITE-Medico.AppImage"

mkdir -p "$APP_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICONS_DIR"
mkdir -p "$HOME/Desktop"

echo "📥 [1/4] Downloading KNITE Medico native standalone Linux application..."

# Download official logo icon
curl -sSL "https://knitemedico.kniteinfotech.in/logo.png" -o "$ICON_PATH" 2>/dev/null || true

# Always download freshest AppImage binary
echo "📥 Fetching KNITE-Medico.AppImage..."
curl -L --progress-bar "https://knitemedico.kniteinfotech.in/downloads/KNITE-Medico.AppImage" -o "$NATIVE_APP.tmp"
mv "$NATIVE_APP.tmp" "$NATIVE_APP"
chmod +x "$NATIVE_APP"

# Create Native Launcher Script
cat << 'EOF' > "$APP_DIR/launch.sh"
#!/usr/bin/env bash
export DISPLAY="${DISPLAY:-:0}"
if [ -z "$XAUTHORITY" ] && [ -f "$HOME/.Xauthority" ]; then
  export XAUTHORITY="$HOME/.Xauthority"
fi

LOCAL_UNPACKED="/home/knite-server/Documents/Medical saas/client/dist-electron/linux-unpacked/knite-medico-client"
NATIVE_APP="$HOME/.knite-medico/KNITE-Medico.AppImage"

if [ -f "$LOCAL_UNPACKED" ]; then
  exec "$LOCAL_UNPACKED" --no-sandbox "$@"
elif [ -f "$NATIVE_APP" ]; then
  exec "$NATIVE_APP" --no-sandbox "$@"
else
  xdg-open "https://knitemedico.kniteinfotech.in/#/app" >/dev/null 2>&1 &
fi
EOF

chmod +x "$APP_DIR/launch.sh"

# Create symlink in ~/.local/bin for terminal execution
ln -sf "$APP_DIR/launch.sh" "$BIN_DIR/knite-medico"
export PATH="$BIN_DIR:$PATH"
if ! grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

echo "🖥️  [2/4] Registering Linux Desktop Entry & Application Menu..."

# Create .desktop entry
DESKTOP_FILE="$DESKTOP_DIR/knite-medico.desktop"
cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=KNITE Medico Pharmacy POS
Comment=Next-Gen Pharmacy POS Billing, GST & Cloud ERP
Exec=$APP_DIR/launch.sh
Icon=$ICON_PATH
Terminal=false
Type=Application
Categories=Office;MedicalSoftware;Finance;Pharmacy;
StartupWMClass=KNITE Medico
StartupNotify=true
EOF

chmod +x "$DESKTOP_FILE"

echo "📌 [3/4] Adding Desktop Shortcut..."
if [ -d "$HOME/Desktop" ]; then
  cp "$DESKTOP_FILE" "$HOME/Desktop/knite-medico.desktop" 2>/dev/null || true
  chmod +x "$HOME/Desktop/knite-medico.desktop" 2>/dev/null || true
  if command -v gio &> /dev/null; then
    gio set "$HOME/Desktop/knite-medico.desktop" metadata::trusted true 2>/dev/null || true
  fi
fi

if command -v update-desktop-database &> /dev/null; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo "🚀 [4/4] Launching KNITE Medico local native desktop app..."
nohup "$APP_DIR/launch.sh" >/dev/null 2>&1 &

echo ""
echo "======================================================================"
echo "  ✅ KNITE Medico local native desktop app installed and running!"
echo ""
echo "  👉 How to launch next time:"
echo "     1. Search 'KNITE Medico' in your Applications / Activities menu"
echo "     2. Double-click the 'KNITE Medico' icon on your Desktop"
echo "     3. Run 'knite-medico' in any terminal window"
echo ""
echo "  📞 Technical Support & Thermal Printer Setup: +91 8778721940"
echo "======================================================================"
echo ""
