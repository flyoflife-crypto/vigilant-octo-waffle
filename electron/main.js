const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const url = require('url')

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

  const resourcesRoot = app.isPackaged
    ? process.resourcesPath
    : path.resolve(process.cwd())

  // В prod ожидаем out/ лежит в extraResources
  const outIndex = path.join(resourcesRoot, 'out', 'index.html')

  // В dev — просто открываем dev-сервер
  if (!app.isPackaged) {
    const devURL = 'http://localhost:3000'
    console.log('[MAIN] dev loadURL:', devURL)
    win.loadURL(devURL)
  } else {
    const indexURL = url.pathToFileURL(outIndex).toString()
    console.log('[MAIN] prod loadURL:', indexURL)
    win.loadURL(indexURL)
  }

  win.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target)
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
