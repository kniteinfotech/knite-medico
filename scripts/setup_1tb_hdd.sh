#!/bin/bash
# ============================================================
# KNITE Medico — 1 TB HDD Setup Script
# Run this ONCE to prepare the 1TB hard disk for cloud data storage
# Usage: sudo bash setup_1tb_hdd.sh [/dev/sdX]  (e.g. /dev/sdb)
# ============================================================

set -e

HDD_DEVICE="${1:-/dev/sdb}"
MOUNT_POINT="/mnt/1tb-hdd"
KNITE_DATA_DIR="$MOUNT_POINT/knite-medico"

echo "🔧 KNITE Medico — 1 TB HDD Setup"
echo "   HDD Device  : $HDD_DEVICE"
echo "   Mount Point : $MOUNT_POINT"
echo ""

# 1. Check if device exists
if [ ! -b "$HDD_DEVICE" ]; then
  echo "❌ Device $HDD_DEVICE not found. Available block devices:"
  lsblk
  exit 1
fi

# 2. Create mount point
echo "📁 Creating mount point $MOUNT_POINT ..."
mkdir -p "$MOUNT_POINT"

# 3. Format only if not already formatted (check for filesystem)
EXISTING_FS=$(blkid -o value -s TYPE "$HDD_DEVICE" 2>/dev/null || echo "")
if [ -z "$EXISTING_FS" ]; then
  echo "💽 No filesystem detected. Formatting $HDD_DEVICE as ext4..."
  mkfs.ext4 -L "knite-1tb" "$HDD_DEVICE"
  echo "✅ Formatted as ext4 with label 'knite-1tb'"
else
  echo "✅ Existing filesystem detected: $EXISTING_FS — skipping format"
fi

# 4. Mount the HDD
echo "🔗 Mounting $HDD_DEVICE → $MOUNT_POINT ..."
mount "$HDD_DEVICE" "$MOUNT_POINT" 2>/dev/null || true

# 5. Add to /etc/fstab for auto-mount on reboot (if not already present)
HDD_UUID=$(blkid -o value -s UUID "$HDD_DEVICE")
if ! grep -q "$HDD_UUID" /etc/fstab; then
  echo "📌 Adding to /etc/fstab for auto-mount on boot..."
  echo "UUID=$HDD_UUID  $MOUNT_POINT  ext4  defaults,nofail  0  2" >> /etc/fstab
  echo "✅ Added to /etc/fstab"
else
  echo "✅ Already in /etc/fstab — skipping"
fi

# 6. Create KNITE directory structure on HDD
echo "📂 Creating KNITE Medico data directories on 1TB HDD..."
mkdir -p "$KNITE_DATA_DIR/postgres-data"
mkdir -p "$KNITE_DATA_DIR/backups"

# Create a README in the backups root
cat > "$KNITE_DATA_DIR/backups/README.txt" << 'EOF'
KNITE Medico — Cloud Backup Storage (1 TB HDD)
===============================================
Each registered pharmacy store gets its own dedicated subfolder here.

Structure:
  /data/backups/<shop_name>/
    shop_profile.json    ← Store metadata
    latest_backup.json   ← Latest snapshot (instant restore)
    Backup-YYYY-MM-DD-*.json  ← Timestamped snapshots

Example:
  /data/backups/nitheesh kadai/
  /data/backups/apollo pharmacy/
  /data/backups/ram medicals/

All data is encrypted in PostgreSQL and also mirrored here as JSON snapshots.
EOF

# 7. Set proper permissions (Docker containers run as root)
chmod -R 777 "$KNITE_DATA_DIR"

echo ""
echo "✅ 1 TB HDD Setup Complete!"
echo ""
echo "   PostgreSQL data  → $KNITE_DATA_DIR/postgres-data"
echo "   Shop backups     → $KNITE_DATA_DIR/backups/<shop_name>/"
echo ""
echo "📋 Next Steps:"
echo "   1. cd /path/to/Medical\\ saas/server"
echo "   2. docker compose down"
echo "   3. docker compose up -d"
echo ""
echo "   The KNITE Medico server will now store ALL data on your 1 TB HDD."
