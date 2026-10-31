const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'KNITE Medico - Pharmacy POS & Inventory SaaS',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
      sandbox: true,
      webSecurity: true
    },
    autoHideMenuBar: true,
  });

  // Remove menu bar in production to prevent inspect element access
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Block Developer Tools shortcuts and inspect shortcuts in production
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        input.key === 'F12' ||
        ((input.control || input.meta) && input.shift && ['I', 'J', 'C', 'i', 'j', 'c'].includes(input.key)) ||
        ((input.control || input.meta) && ['U', 'u'].includes(input.key))
      ) {
        event.preventDefault();
      }
    });

    // Block right-click context menu (Inspect Element) in production
    mainWindow.webContents.on('context-menu', (e) => {
      e.preventDefault();
    });
  }

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  console.log('[Main Process] Loading startUrl:', startUrl);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Main Process] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] (${sourceId}:${line}) ${message}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main Process] Page loaded successfully!');
  });

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler for silent thermal printing
ipcMain.handle('print-thermal-receipt', async (event, htmlContent) => {
  let printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  
  return new Promise((resolve) => {
    printWin.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      printWin.close();
      resolve({ success, failureReason });
    });
  });
});
