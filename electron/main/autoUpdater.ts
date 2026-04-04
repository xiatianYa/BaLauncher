import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdate from 'electron-updater'
const { autoUpdater } = electronUpdate

let isInitialized = false
let mainWindow: BrowserWindow | null = null

// 检查窗口是否可用
function isWindowAvailable(win: BrowserWindow | null): win is BrowserWindow {
  return win !== null && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()
}

// 安全地发送消息到窗口
function safeSendToWindow(win: BrowserWindow | null, channel: string, ...args: any[]) {
  if (isWindowAvailable(win)) {
    try {
      win.webContents.send(channel, ...args)
    } catch (err) {
      console.error(`发送消息到窗口失败 (${channel}):`, err)
    }
  }
}

// 初始化自动更新
function initAutoUpdater(win: BrowserWindow) {
  if (isInitialized) return
  isInitialized = true
  mainWindow = win

  // 自动下载更新
  autoUpdater.autoDownload = false
  // 退出应用时自动安装（静默关键）
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://www.bluearchive.top/statics/soft/',
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('检查更新中...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('发现更新:', info)
    safeSendToWindow(mainWindow, 'update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('没有可用更新:', info)
    safeSendToWindow(mainWindow, 'update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    console.error('更新错误:', err)
    safeSendToWindow(mainWindow, 'update-error', err.message)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    safeSendToWindow(mainWindow, 'update-downloading', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    safeSendToWindow(mainWindow, 'update-downloaded', info)
  })

  // 监听窗口关闭事件，清理引用
  win.on('closed', () => {
    mainWindow = null
  })
}

// 检查更新
export function checkForUpdates(win: BrowserWindow, delay: number = 2000) {
  if (app.isPackaged && isWindowAvailable(win)) {
    initAutoUpdater(win)
    setTimeout(() => {
      // 再次检查窗口是否可用
      if (isWindowAvailable(win)) {
        autoUpdater.checkForUpdates().catch((err) => {
          console.error('检查更新失败:', err)
        })
      }
    }, delay)
  }
}

// 设置自动更新IPC事件
export function setupAutoUpdaterIpc() {
  // 安装更新
  ipcMain.handle('install-update', () => {
    // 静默安装 + 安装后自动重启
    autoUpdater.quitAndInstall(true, true)
  })

  // 下载更新
  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate()
  })

  // 检查更新
  ipcMain.handle('check-update', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && isWindowAvailable(win)) {
      checkForUpdates(win)
    }
  })
}
