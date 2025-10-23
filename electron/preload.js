const { contextBridge, ipcRenderer } = require("electron");
console.log("[PRELOAD] ready");

contextBridge.exposeInMainWorld('native', {
  exportFullPagePNG: () => ipcRenderer.invoke('export-fullpage-png')
});
console.log('[PRELOAD] ready');
