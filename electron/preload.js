// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Минимальный и стабильный API для UI
contextBridge.exposeInMainWorld('electron', {
  savePng: (dataUrl, suggestedName) => ipcRenderer.invoke('save-png', { dataUrl, suggestedName }),
});

// Легаси-хук (если где-то используется)
contextBridge.exposeInMainWorld('api', {
  exportFullpagePNG: () => ipcRenderer.invoke('export-fullpage-png'),
});

// Однонаправленные события из main
ipcRenderer.on('deep-link', (_e, deepUrl) => {
  window.dispatchEvent(new CustomEvent('electron:deep-link', { detail: { url: deepUrl } }));
});
ipcRenderer.on('open-file', (_e, filePath) => {
  window.dispatchEvent(new CustomEvent('electron:open-file', { detail: { filePath } }));
});
