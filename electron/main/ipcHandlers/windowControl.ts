import { ipcMain, BrowserWindow, dialog } from 'electron'
import { getMainWindow } from '../windowManager'
import { preload, indexHtml, VITE_DEV_SERVER_URL } from '../config'

export function setupWindowControlIpc() {
  ipcMain.handle('open-win', (_, arg) => {
    const win = getMainWindow()
    if (!win) return

    const childWindow = new BrowserWindow({
      webPreferences: {
        preload,
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    if (VITE_DEV_SERVER_URL) {
      childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
    } else {
      childWindow.loadFile(indexHtml, { hash: arg })
    }
  })

  ipcMain.handle('window-minimize', () => {
    const win = getMainWindow()
    if (win) {
      win.minimize()
    }
  })

  ipcMain.handle('window-close', () => {
    const win = getMainWindow()
    if (win) {
      win.close()
    }
  })

  ipcMain.handle('select-directory', async (_, title) => {
    const win = getMainWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: title || '选择目录',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })
}
