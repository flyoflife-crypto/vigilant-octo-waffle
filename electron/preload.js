const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  exportFullpagePNG: () => ipcRenderer.invoke("export-fullpage-png"),
});
