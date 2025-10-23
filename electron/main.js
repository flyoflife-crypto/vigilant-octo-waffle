const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: true,
  });

  // Правильный путь: на уровень выше — в /out/
  const outPath = path.join(__dirname, '..', 'out', 'index.html');
  console.log('[MAIN] try loadFile:', outPath);

  win.loadFile(outPath).catch((err) => {
    console.error('[MAIN] loadFile error', err);
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[MAIN] did-finish-load ✅');
  });

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[MAIN] did-fail-load ❌', { code, desc, url });
  });
}


app.whenReady().then(() => {
  
  const path = require("path");
  const outDir = path.resolve(__dirname, "..", "out");

  // Перехватываем file:///_next/* и т.п. -> out/_next/*
  const { protocol } = require("electron");
  try {
    protocol.interceptFileProtocol("file", (request, callback) => {
      try {
        const raw = decodeURIComponent(request.url.replace("file://",""));
        if (raw.startsWith("/_next/") || raw === "/favicon.ico" || raw.startsWith("/fonts/")) {
          const mapped = path.join(outDir, raw.replace(/^\//,""));
          return callback({ path: mapped });
        }
        callback({ path: raw });
      } catch (e) {
        console.error("[MAIN] intercept error", e);
        callback({ path: raw });
      }
    });
  } catch(e) {
    console.warn("[MAIN] intercept set failed", e);
  }

console.log('[MAIN] app ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
