import { initializeApp } from './config'
import { setupWindowEvents } from './windowManager'
import { checkForUpdates, setupAutoUpdaterIpc } from './autoUpdater'
import { setupAllIpcHandlers } from './ipcHandlers'
import { setMainWindowForCs2Gsi } from './ipcHandlers/cs2Gsi'
import { setMainWindowForLogReader } from './ipcHandlers/logReader'

initializeApp()
setupAutoUpdaterIpc()
setupAllIpcHandlers()
setupWindowEvents((win) => {
  checkForUpdates(win)
  setMainWindowForCs2Gsi(win)
  setMainWindowForLogReader(win)
})
