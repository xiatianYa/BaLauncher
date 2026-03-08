import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'

let steamLoginWindow: BrowserWindow | null = null

export function setupSteamLoginIpc() {
  ipcMain.handle('open-steam-login-window', async (_, url) => {
    if (steamLoginWindow) {
      if (steamLoginWindow.isMinimized()) {
        steamLoginWindow.restore()
      }
      steamLoginWindow.focus()
    }

    return new Promise((resolve, reject) => {
      steamLoginWindow = new BrowserWindow({
        title: '蔚蓝档案登录器 - Steam登录',
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        maxWidth: 800,
        maxHeight: 600,
        resizable: false,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        },
        autoHideMenuBar: true,
        frame: false
      })

      steamLoginWindow.once('ready-to-show', () => {
        steamLoginWindow?.show()
      })

      steamLoginWindow.loadURL(url)

      steamLoginWindow.webContents.on('will-redirect', async (event, redirectUrl) => {
        if (redirectUrl.startsWith('https://www.bluearchive.top/main')) {
          event.preventDefault()
          
          try {
            const urlObj = new URL(redirectUrl)
            const claimedId = urlObj.searchParams.get('openid.claimed_id')
            
            if (claimedId) {
              const steamIdMatch = claimedId.match(/\/id\/(\d+)/)
              if (steamIdMatch) {
                const steamId = steamIdMatch[1]
                resolve({ steamId })
                steamLoginWindow?.close()
                steamLoginWindow = null
                return
              }
            }
            
            reject(new Error('无法获取 Steam ID'))
          } catch (err) {
            reject(err)
          } finally {
            steamLoginWindow?.close()
            steamLoginWindow = null
          }
        }
      })

      steamLoginWindow.on('close', () => {
        steamLoginWindow = null
        reject(new Error('用户取消登录'))
      })
    })
  })
}
