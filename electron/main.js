const { app, BrowserWindow, Menu, dialog, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

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

  const indexPath = path.join(__dirname, "..", "out", "index.html");
  console.log("[MAIN] try loadFile:", indexPath);

  mainWindow.loadFile(indexPath).catch((e) => {
    console.error("[MAIN] loadFile error", e);
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
          accelerator: process.platform === "darwin" ? "Cmd+Shift+S" : "Ctrl+Shift+S",
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
  // Прозрачно чинит абсолютные /_next/* для file://
  protocol.interceptFileProtocol("file", (request, callback) => {
    try {
      const decoded = decodeURI(request.url);
      // Перенаправляем file:///_next/... -> <proj>/out/_next/...
      if (decoded.startsWith("file:///_next/")) {
        const rel = decoded.replace("file:///_next/", "_next/");
        const mapped = path.join(__dirname, "..", "out", rel);
        // console.log("[PROTO] map", decoded, "->", mapped);
        return callback({ path: mapped });
      }
      // Всё остальное — по умолчанию
      return callback(decoded.replace("file://", ""));
    } catch (e) {
      console.error("[PROTO] intercept error:", e);
      return callback(request.url.replace("file://", ""));
    }
  });

  // Один хэндлер — без дублей
  try { ipcMain.removeHandler("export-fullpage-png"); } catch {}
  ipcMain.handle("export-fullpage-png", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await exportFullPagePNGFrom(win);
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
