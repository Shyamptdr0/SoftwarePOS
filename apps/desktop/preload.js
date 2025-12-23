const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-status');
    ipcRenderer.removeAllListeners('update-progress');
  },
  
  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Printing
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),
  
  // Local data storage
  getLocalData: (key) => ipcRenderer.invoke('get-local-data', key),
  saveLocalData: (key, data) => ipcRenderer.invoke('save-local-data', key, data),
  
  // License validation
  validateLicense: (licenseKey) => ipcRenderer.invoke('validate-license', licenseKey),
  
  // Menu events
  onMenuNewSale: (callback) => ipcRenderer.on('menu-new-sale', callback),
  
  // Remove all listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Handle app ready events
window.addEventListener('DOMContentLoaded', () => {
  // Replace console.log with electron-safe version
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    // Send logs to main process if needed
  };
  
  // Handle window close
  window.addEventListener('beforeunload', () => {
    // Cleanup before closing
  });
});
