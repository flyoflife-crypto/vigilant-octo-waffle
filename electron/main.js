const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')

let win

function createWindow () {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    console.error('[MAIN] did-fail-load', { errorCode, errorDesc, validatedURL })
    win.webContents.openDevTools({ mode: 'detach' })
  })

  win.webContents.on('render-process-gone', (event, details) => {
    console.error('[MAIN] render-process-gone', details)
  })

  const isDev = !app.isPackaged
  const resourcesRoot = isDev
    ? path.resolve(process.cwd())
    : process.resourcesPath

  // В prod ожидаем out/ лежит в extraResources (resourcesPath/out/index.html)
  const outIndex = path.join(resourcesRoot, 'out', 'index.html')

  if (app.isPackaged && !fs.existsSync(outIndex)) {
    console.error('[MAIN] prod missing index.html at', outIndex)
  }

  // В dev — просто открываем dev-сервер
  if (!app.isPackaged) {
    const devURL = 'http://localhost:3000'
    console.log('[MAIN] dev loadURL:', devURL)
    win.loadURL(devURL)
  } else {
    // В prod — грузим локальный файл, чтобы избежать проблем с file:// и поиском путей
    console.log('[MAIN] prod loadFile:', outIndex)
    win.loadFile(outIndex)
  }

  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) {
      shell.openExternal(target)
    } else {
      console.warn('[MAIN] blocked non-http(s) target', target)
    }
    return { action: 'deny' }
  })

  win.on('closed', () => { win = null })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
