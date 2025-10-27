const { contextBridge, ipcRenderer } = require('electron');

// Legacy API (kept for backward compatibility)
contextBridge.exposeInMainWorld('api', {
  exportFullpagePNG: () => ipcRenderer.invoke('export-fullpage-png'),
});

// New minimal API used by lib/png.ts
contextBridge.exposeInMainWorld('electron', {
  /**
   * Save a base64 dataURL PNG through native dialog.
   * @param {string} dataUrl - data:image/png;base64,...
   * @param {string=} suggestedName - e.g. "mars-onepager-2025-10-26.png"
   * @returns {Promise<{ok:boolean,canceled?:boolean,path?:string,error?:string}>}
   */
  savePng: (dataUrl, suggestedName) => ipcRenderer.invoke('save-png', { dataUrl, suggestedName }),
});
