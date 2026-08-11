import { app } from 'electron'
import { initializeApp } from './config'
import { setupWindowEvents } from './windowManager'
import { checkForUpdates, setupAutoUpdaterIpc } from './autoUpdater'
import { setupAllIpcHandlers } from './ipcHandlers'
import { setMainWindowForCs2Gsi } from './ipcHandlers/cs2Gsi'
import { setMainWindowForLogReader } from './ipcHandlers/logReader'
import { registerImageCacheScheme, setupImageCache } from './imageCache'

initializeApp()
// 注册图片缓存协议（必须在 app ready 之前）
registerImageCacheScheme()
setupAllIpcHandlers()
setupAutoUpdaterIpc()
// 初始化图片磁盘缓存（内部等待 app ready）
setupImageCache()
setupWindowEvents((win) => {
  checkForUpdates(win)
  setMainWindowForCs2Gsi(win)
  setMainWindowForLogReader(win)
})
