import { BrowserWindow, shell, app } from 'electron'
import path from 'node:path'
import { VITE_DEV_SERVER_URL, preload, indexHtml } from './config'

let win: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return win
}

export function setMainWindow(window: BrowserWindow | null): void {
  win = window
}

async function createWindow(onDidFinishLoad?: (win: BrowserWindow) => void) {
  win = new BrowserWindow({
    title: '蔚蓝档案登录器',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1200,
    height: 720,
    minWidth: 1200,
    minHeight: 720,
    maxWidth: 1200,
    maxHeight: 720,
    resizable: false,
    webPreferences: {
      preload,
      devTools: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
    frame: false
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    if (onDidFinishLoad && win) {
      onDidFinishLoad(win)
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  });
}

export function setupWindowEvents(onDidFinishLoad?: (win: BrowserWindow) => void) {
  app.whenReady().then(() => createWindow(onDidFinishLoad))

  app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
      allWindows[0].focus()
    } else {
      createWindow(onDidFinishLoad)
    }
  })
}
