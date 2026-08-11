import { ipcMain, BrowserWindow, dialog, app, shell } from 'electron'
import path from 'node:path'
import { getMainWindow } from '../windowManager'
import { preload, indexHtml, VITE_DEV_SERVER_URL } from '../config'

export function setupWindowControlIpc() {
  ipcMain.handle('electron:get-app-version', async () => {
    try {
      return app.getVersion()
    } catch {
      return 'unknown' // 版本获取失败时的兜底值
    }
  })

  ipcMain.handle('open-win', (_, arg) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return

    const childWindow = new BrowserWindow({
      // 依附主窗口：不出现在 ALT+TAB/任务栏，避免多个应用条目残留
      parent: win,
      skipTaskbar: true,
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

  ipcMain.handle('open-external-window', (_, url: string) => {
    if (!url) return
    const mainWindow = getMainWindow()
    // 主窗口不存在/已销毁（如应用正在退出）时改用系统浏览器打开，
    // 避免创建无 parent 的独立窗口，成为任务栏/ALT+TAB 中的多余应用条目
    if (!mainWindow || mainWindow.isDestroyed()) {
      shell.openExternal(url)
      return
    }
    const childWindow = new BrowserWindow({
      title: '',
      icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
      width: 960,
      height: 720,
      minWidth: 640,
      minHeight: 480,
      autoHideMenuBar: true,
      backgroundColor: '#161a26',
      // 依附主窗口：不出现在 ALT+TAB/任务栏，避免多个应用条目残留
      parent: mainWindow,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })
    // 窗口内继续打开的新链接（target=_blank / window.open）在同一窗口内加载，不新开浏览器
    childWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
      if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
        childWindow.loadURL(targetUrl)
      }
      return { action: 'deny' }
    })
    childWindow.loadURL(url)
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
