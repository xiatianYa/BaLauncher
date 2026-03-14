import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdate from 'electron-updater'
const { autoUpdater } = electronUpdate

export function checkForUpdates(win: BrowserWindow) {
  if (app.isPackaged) {
    autoUpdater.autoDownload = false
    // 强制启用开发环境更新配置
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://www.bluearchive.top/statics/soft/',
    })
    const updateInfo = autoUpdater.checkForUpdates()
    autoUpdater.on('update-available', () => {
      win.webContents.send('update-available')
    })

    autoUpdater.on('download-progress', (progressObj) => {
      win.webContents.send('update-downloading', progressObj)
    })

    autoUpdater.on('update-downloaded', () => {
      win.webContents.send('update-downloaded')
    })
  }
}

export function setupAutoUpdaterIpc() {
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate()
  })
}