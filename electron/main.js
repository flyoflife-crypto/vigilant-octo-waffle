const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function getOutIndexFile() {
  // путь до out/index.html внутри установленного приложения
  const base = app.isPackaged ? process.resourcesPath : __dirname + '/../';
  return path.join(base, 'out', 'index.html');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    // в дев-режиме можно открывать локальный сервер, если хочется
    const fileUrl = 'file://' + getOutIndexFile().replace(/\\/g, '/');
    win.loadURL(fileUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const fileUrl = 'file://' + getOutIndexFile().replace(/\\/g, '/');
    win.loadURL(fileUrl);
  }

  // внешние ссылки — в системном браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
