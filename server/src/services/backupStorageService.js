const fs = require('fs');
const path = require('path');

// Base backup directory targeting the 1 TB Hard Disk HDD mounted at /data
// Default is /data/backups, with fallback to ./backups in project
function getBaseBackupDir() {
  const envPath = process.env.HDD_BACKUP_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  if (fs.existsSync('/data/backups')) return '/data/backups';
  if (fs.existsSync('/data')) {
    try {
      const p = '/data/backups';
      fs.mkdirSync(p, { recursive: true });
      return p;
    } catch {}
  }
  const fallback = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

/**
 * Sanitizes shop name while keeping it human readable (e.g. 'nitheesh kadai')
 */
function sanitizeShopFolderName(shopName) {
  if (!shopName || typeof shopName !== 'string') return 'unnamed_shop';
  // Keep letters, numbers, spaces, underscores, dashes
  const cleaned = shopName.trim().replace(/[/\\?%*:|"<>]/g, '').slice(0, 100);
  return cleaned || 'unnamed_shop';
}

/**
 * Ensures the dedicated shop folder exists on the 1 TB HDD (e.g. /data/backups/nitheesh kadai)
 */
function ensureShopHddFolder(shopName, initialInfo = {}) {
  try {
    const baseDir = getBaseBackupDir();
    const folderName = sanitizeShopFolderName(shopName);
    const shopDir = path.join(baseDir, folderName);

    if (!fs.existsSync(shopDir)) {
      fs.mkdirSync(shopDir, { recursive: true });
      console.log(`📁 [1 TB HDD Backup Storage] Created dedicated shop folder: "${shopDir}"`);
    }

    const metaFile = path.join(shopDir, 'shop_profile.json');
    const existingMeta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
    const updatedMeta = {
      ...existingMeta,
      ...initialInfo,
      shop_name: shopName,
      folder_name: folderName,
      hdd_path: shopDir,
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(metaFile, JSON.stringify(updatedMeta, null, 2), 'utf8');

    return { success: true, shopDir, folderName };
  } catch (err) {
    console.error('❌ Failed to ensure shop HDD backup folder:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Saves a backup snapshot file to the shop's dedicated HDD folder
 */
function saveBackupToHdd(shopName, backupPayload, backupName) {
  try {
    const { shopDir } = ensureShopHddFolder(shopName);
    if (!shopDir) throw new Error('Could not establish shop HDD directory');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = (backupName || 'snapshot').replace(/[/\\?%*:|"<> ]/g, '_');
    const filename = `${safeName}_${timestamp}.json`;
    const targetFile = path.join(shopDir, filename);

    const dataToWrite = typeof backupPayload === 'string' ? backupPayload : JSON.stringify(backupPayload, null, 2);
    fs.writeFileSync(targetFile, dataToWrite, 'utf8');

    // Also write/update latest_backup.json for instant restore access
    const latestFile = path.join(shopDir, 'latest_backup.json');
    fs.writeFileSync(latestFile, dataToWrite, 'utf8');

    const sizeBytes = Buffer.byteLength(dataToWrite, 'utf8');
    console.log(`💾 [1 TB HDD Backup] Saved ${Math.round(sizeBytes / 1024)} KB to "${targetFile}"`);

    return {
      success: true,
      filename,
      filePath: targetFile,
      sizeBytes,
      saved_at: new Date().toISOString()
    };
  } catch (err) {
    console.error('❌ HDD backup save error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Lists backups stored on HDD for a given shop
 */
function listHddBackups(shopName) {
  try {
    const baseDir = getBaseBackupDir();
    const folderName = sanitizeShopFolderName(shopName);
    const shopDir = path.join(baseDir, folderName);

    if (!fs.existsSync(shopDir)) return [];

    const files = fs.readdirSync(shopDir);
    const backups = [];

    for (const f of files) {
      if (f.endsWith('.json') && f !== 'shop_profile.json') {
        const fullPath = path.join(shopDir, f);
        const stats = fs.statSync(fullPath);
        backups.push({
          id: 'hdd_' + f,
          backup_name: f.replace('.json', ''),
          filename: f,
          size_bytes: stats.size,
          created_at: stats.mtime.toISOString(),
          storage: '1TB_HDD',
          path: fullPath
        });
      }
    }

    return backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    console.error('Error listing HDD backups:', err.message);
    return [];
  }
}

/**
 * Reads a backup from HDD by filename
 */
function getHddBackupData(shopName, filename) {
  try {
    const baseDir = getBaseBackupDir();
    const folderName = sanitizeShopFolderName(shopName);
    const fullPath = path.join(baseDir, folderName, filename);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading HDD backup:', err.message);
    return null;
  }
}

module.exports = {
  getBaseBackupDir,
  sanitizeShopFolderName,
  ensureShopHddFolder,
  saveBackupToHdd,
  listHddBackups,
  getHddBackupData
};
