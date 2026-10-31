const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (htmlContent) => ipcRenderer.invoke('print-thermal-receipt', htmlContent),
  isDesktop: true,
  platform: process.platform
});
