// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

const isDev = !app.isPackaged;
const DEBUG = process.env.DEBUG_APP_PROTOCOL === '1';
let mainWindow = null;

// Привилегии кастомной схемы
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, allowServiceWorkers: true } },
]);

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const deep = argv.find(a => typeof a === 'string' && a.startsWith('onepager://'));
      if (deep) mainWindow.webContents.send('deep-link', deep);
    }
  });
}

// Window state
const statePath = path.join(app.getPath('userData'), 'window-state.json');
function readWindowState() {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf-8')); }
  catch { return { width: 1280, height: 800, x: undefined, y: undefined }; }
}
function saveWindowState() {
  if (!mainWindow) return;
  const b = mainWindow.getBounds();
  fs.writeFileSync(statePath, JSON.stringify({ width: b.width, height: b.height, x: b.x, y: b.y }));
}

// Пути к out/ (dev/asar/unpacked)
function pickFirstExisting(paths) {
  for (const p of paths) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return paths[0];
}
function resolveOutDir() {
  const fromHere        = path.resolve(__dirname, '..', 'out');
  const unpackedAsar    = path.join(process.resourcesPath, 'app.asar.unpacked', 'out');
  const asarOut         = path.join(process.resourcesPath, 'app.asar', 'out');
  const unpackedClassic = path.join(process.resourcesPath, 'app', 'out');

  const OUT_DIR = pickFirstExisting([fromHere, unpackedAsar, asarOut, unpackedClassic]);
  if (DEBUG) console.log('[resolveOutDir]', { fromHere, unpackedAsar, asarOut, unpackedClassic, OUT_DIR });
  return OUT_DIR;
}
function safeJoin(rootDir, urlPathname) {
  let rel = urlPathname.replace(/^[\\/]+/, '');
  rel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(rootDir, rel);
}

// Регистрация app://
function registerAppProtocol(OUT_DIR) {
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      const u = new URL(request.url);
      let pathname = decodeURIComponent(u.pathname || '/').replace(/\/{2,}/g, '/');

      if (DEBUG) console.log('[app://] request', pathname);

      if (pathname === '/' || pathname === '/index.html') {
        const indexPath = path.join(OUT_DIR, 'index.html');
        if (DEBUG) console.log(' -> index', indexPath);
        return callback({ path: indexPath });
      }

      const candidatePath = safeJoin(OUT_DIR, pathname);

      // ассеты: файл или 404, без SPA fallback
      if (pathname.startsWith('/_next/') || /\.(js|css|map|png|jpe?g|webp|svg|ico|txt|json)$/i.test(pathname)) {
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
          if (DEBUG) console.log(' -> asset', candidatePath);
          return callback({ path: candidatePath });
        }
        if (DEBUG) console.log(' -> 404 asset', candidatePath);
        return callback({ error: -6 });
      }

      // директория → index.html
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
        const dirIndex = path.join(candidatePath, 'index.html');
        if (fs.existsSync(dirIndex)) {
          if (DEBUG) console.log(' -> dir index', dirIndex);
          return callback({ path: dirIndex });
        }
      }

      // файл
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        if (DEBUG) console.log(' -> file', candidatePath);
        return callback({ path: candidatePath });
      }

      // SPA fallback
      if (DEBUG) console.log(' -> SPA fallback index');
      return callback({ path: path.join(OUT_DIR, 'index.html') });
    } catch (e) {
      if (DEBUG) console.log(' -> exception', e?.message);
      return callback({ error: -2 });
    }
  });
}

// Create window
function createMainWindow() {
  const state = readWindowState();

  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 1024,
    minHeight: 700,
    show: true,
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,        // при необходимости включишь обратно
      webSecurity: true,
      spellcheck: false,
      devTools: true
    },
  });

  // Внешние ссылки — наружу
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.once('did-frame-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadURL('app://local/');
  }

  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => { mainWindow = null; });

  if (DEBUG) {
    const ses = mainWindow.webContents.session;
    ses.webRequest.onErrorOccurred((d)=>console.log('[net error]', d.error, d.method, d.url));
    ses.webRequest.onCompleted((d)=>{ if(d.statusCode>=400) console.log('[net completed]', d.statusCode, d.method, d.url); });
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, urlStr) => {
      console.log('[did-fail-load]', code, desc, urlStr);
    });
    mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      console.log('[renderer]', { level, message, line, sourceId });
    });
  }
}

// App lifecycle
app.whenReady().then(() => {
  // (опционально) отключение GPU, если были «чёрные экраны»
  // app.disableHardwareAcceleration();

  const OUT_DIR = resolveOutDir();
  registerAppProtocol(OUT_DIR);
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC
ipcMain.handle('save-png', async (_evt, { dataUrl, suggestedName }) => {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
      return { ok: false, error: 'Invalid dataURL' };
    }
    const base64 = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PNG',
      defaultPath: suggestedName || 'mars-onepager.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    fs.writeFileSync(filePath, buffer);
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('export-fullpage-png', async () => {
  try {
    if (!mainWindow) throw new Error('No window');
    const image = await mainWindow.webContents.capturePage();
    const png = image.toPNG();

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export One-Pager as PNG',
      defaultPath: 'onepager.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    fs.writeFileSync(filePath, png);
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

// deep link / open-file
app.setAsDefaultProtocolClient('onepager');
app.on('open-url', (event, deepUrl) => {
  event.preventDefault();
  if (mainWindow) mainWindow.webContents.send('deep-link', deepUrl);
});
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) mainWindow.webContents.send('open-file', filePath);
});
