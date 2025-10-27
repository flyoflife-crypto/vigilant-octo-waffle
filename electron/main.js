const { app, BrowserWindow, Menu, dialog, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const { fileURLToPath, pathToFileURL } = require("url");

let mainWindow;

function getOutDir() {
  const devOut = path.join(__dirname, "..", "out");
  return fs.existsSync(devOut) ? devOut : path.join(process.resourcesPath || path.join(__dirname, ".."), "out");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const outDir = getOutDir();
  const indexUrl = pathToFileURL(path.join(outDir, "index.html")).toString();
  console.log("[MAIN] try loadURL:", indexUrl);

  mainWindow.loadURL(indexUrl).catch((e) => {
    console.error("[MAIN] loadURL error", e);
  });

  mainWindow.webContents.on("did-fail-load", (e, code, desc, url) => {
    console.error("[MAIN] did-fail-load ❌", { code, desc, url });
  });

  mainWindow.webContents.once("dom-ready", () => {
    mainWindow.show();
    console.log("[MAIN] did-finish-load ✅");
  });

  const template = [
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      label: "File",
      submenu: [
        {
          label: "Save full page as PNG",
          accelerator: "CmdOrCtrl+4",
          click: async () => {
            try {
              const res = await exportFullPagePNGFrom(mainWindow);
              if (res?.ok) console.log("[MAIN] PNG saved:", res.filePath);
            } catch (e) {
              console.error("[MAIN] PNG export failed:", e);
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  // Прозрачно чинит абсолютные /_next/* и другие root-relative ассеты для file://
  protocol.interceptFileProtocol("file", (request, callback) => {
    try {
      const u = new URL(request.url);
      const rawPathname = u.pathname || "/";
      const pathname = decodeURIComponent(rawPathname);

      // 1) Абсолютные ассеты сборки Next: /_next/** -> <proj>/out/_next/**
      if (pathname.startsWith("/_next/")) {
        const mapped = path.join(__dirname, "..", "out", pathname.replace(/^\/+/, ""));
        return callback({ path: mapped });
      }

      // 2) Главная страница
      if (pathname === "/" || pathname === "/index.html") {
        const mapped = path.join(__dirname, "..", "out", "index.html");
        return callback({ path: mapped });
      }

      // 3) Любые другие root-relative файлы (например, /favicon.ico, /robots.txt, /assets/**)
      //    Маппим в out/<pathname>
      //    Исключения: реальные абсолютные пути ОС (например, /Users/... на macOS или /C:/... на Windows)
      const isMacAbs = pathname.startsWith("/Users/") || pathname.startsWith("/Volumes/");
      const isWinAbs = /^[\\/][A-Za-z]:[\\/]/.test(pathname) || /^[A-Za-z]:[\\/]/.test(pathname);

      if (!isMacAbs && !isWinAbs) {
        const mapped = path.join(__dirname, "..", "out", pathname.replace(/^\/+/, ""));
        return callback({ path: mapped });
      }

      // 4) Обычные file:// URL — отдаём как есть (кроссплатформенно)
      const filePath = fileURLToPath(u);
      return callback({ path: filePath });
    } catch (e) {
      console.error("[PROTO] intercept error:", e);
      // Фоллбэк на index.html
      const fallback = path.join(__dirname, "..", "out", "index.html");
      return callback({ path: fallback });
    }
  });

  // Один хэндлер — без дублей
  try { ipcMain.removeHandler("export-fullpage-png"); } catch {}
  ipcMain.handle("export-fullpage-png", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await exportFullPagePNGFrom(win);
  });

  // Bridge for renderer-side html-to-image PNG saving
  try { ipcMain.removeHandler('save-png'); } catch {}
  ipcMain.handle('save-png', async (event, { dataUrl, suggestedName }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Save full page as PNG',
        defaultPath: suggestedName || 'mars-onepager.png',
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });
      if (canceled || !filePath) return { ok: false, canceled: true };

      if (!dataUrl || typeof dataUrl !== 'string') {
        return { ok: false, error: 'EMPTY_DATA_URL' };
      }
      const base64 = dataUrl.replace(/^data:image\/(png|PNG);base64,/, '');
      if (!base64) return { ok: false, error: 'BAD_DATA_URL' };

      await fs.promises.writeFile(filePath, base64, 'base64');
      return { ok: true, path: filePath };
    } catch (e) {
      console.error('[MAIN] save-png failed:', e);
      return { ok: false, error: String((e && e.message) || e) };
    }
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- Общая функция PNG экспорта (как в Edge) ----------
async function exportFullPagePNGFrom(win) {
  if (!win) return { ok: false, error: "no-window" };
  const wc = win.webContents;

  // Реальные размеры документа
  const { fullHeight, fullWidth } = await wc.executeJavaScript(`(() => {
    const el = document.documentElement;
    const body = document.body;
    const h = Math.max(
      el.scrollHeight, body.scrollHeight,
      el.offsetHeight,  body.offsetHeight,
      el.clientHeight,  body.clientHeight
    );
    const w = Math.max(
      el.scrollWidth, body.scrollWidth,
      el.offsetWidth,  body.offsetWidth,
      el.clientWidth,  body.clientWidth
    );
    return { fullHeight: h, fullWidth: w };
  })();`);

  const [oldW, oldH] = win.getContentSize();
  const MAX_DIM = 20000; // предохранитель
  const capW = Math.min(Math.max(oldW, fullWidth), MAX_DIM);
  const capH = Math.min(Math.max(oldH, fullHeight), MAX_DIM);

  win.setContentSize(capW, capH);
  await new Promise((r) => setTimeout(r, 150));

  const image = await wc.capturePage({ x: 0, y: 0, width: capW, height: capH });
  const png = image.toPNG();

  win.setContentSize(oldW, oldH);

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Save full page as PNG",
    defaultPath: "onepager.png",
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  fs.writeFileSync(filePath, png);
  return { ok: true, filePath };
}
