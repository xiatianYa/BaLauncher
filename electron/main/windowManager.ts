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
    width: 1400,
    height: 820,
    minWidth: 1400,
    minHeight: 820,
    maxWidth: 1400,
    maxHeight: 820,
    resizable: false,
    webPreferences: {
      preload,
      devTools: VITE_DEV_SERVER_URL ? true : false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
    frame: false,
    // 启动加载期间窗口背景透明（无背景色），应用加载完成后由主题背景覆盖
    transparent: true,
    backgroundColor: '#00000000'
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

  // 锁定屏幕缩放率为 100%
  win.webContents.on('dom-ready', () => {
    win?.webContents.setZoomFactor(1.0)
  })

  // 监听缩放变化，强制重置为 100%
  win.webContents.on('zoom-changed', (event, zoomDirection) => {
    win?.webContents.setZoomFactor(1.0)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  });

  // 主窗口关闭即退出应用：辅助窗口（协议/登录等）仍开着时 window-all-closed 不会触发，
  // 若不强制退出，进程和窗口会残留，导致 ALT+TAB/任务栏出现多个应用条目
  win.on('closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
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

  // activate 事件是 macOS dock 专用，Windows 上 ALT+TAB / 任务栏点击也会触发
  // 不加平台守卫可能导致 getAllWindows() 为 0 时误创建新主窗口，造成 ALT+TAB 条目增倍
  app.on('activate', () => {
    if (process.platform !== 'darwin') return
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
      allWindows[0].focus()
    } else {
      createWindow(onDidFinishLoad)
    }
  })
}
