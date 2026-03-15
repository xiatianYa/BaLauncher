import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdate from 'electron-updater'
const { autoUpdater } = electronUpdate

let isInitialized = false

function initAutoUpdater(win: BrowserWindow) {
  if (isInitialized) return
  isInitialized = true

  autoUpdater.autoDownload = false
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://www.bluearchive.top/statics/soft/',
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('检查更新中...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('发现更新:', info)
    win.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('没有可用更新:', info)
    win.webContents.send('update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    console.error('更新错误:', err)
    win.webContents.send('update-error', err.message)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('update-downloading', progressObj)
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update-downloaded', info)
  })
}

export function checkForUpdates(win: BrowserWindow, delay: number = 2000) {
  if (app.isPackaged) {
    initAutoUpdater(win)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('检查更新失败:', err)
      })
    }, delay)
  }
}

export function setupAutoUpdaterIpc() {
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate()
  })

  ipcMain.handle('check-update', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      checkForUpdates(win)
    }
  })
}