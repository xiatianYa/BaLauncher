import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'

let steamLoginWindow: BrowserWindow | null = null

const INJECT_HEADER_SCRIPT = `
(function() {
  if (document.getElementById('ba-launcher-login-header')) return;
  
  const style = document.createElement('style');
  style.textContent = \`
    #ba-launcher-login-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 32px;
      background: #f3f3f3;
      z-index: 2147483647;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-app-region: drag;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      font-family: system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
      overflow: hidden;
    }
    #ba-launcher-login-title {
      margin-left: 12px;
      font-size: 13px;
      color: #333;
      font-weight: 500;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #ba-launcher-login-close {
      width: 46px;
      height: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      -webkit-app-region: no-drag;
      transition: background 0.2s;
    }
    #ba-launcher-login-close:hover {
      background: #e81123;
    }
    #ba-launcher-login-close svg {
      width: 10px;
      height: 10px;
      fill: #27272e;
    }
    #ba-launcher-login-close:hover svg {
      fill: #fff;
    }
    html {
      width: 100% !important;
      height: 100% !important;
    }
    body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding-top: 32px !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
  \`;
  document.head.appendChild(style);

  const header = document.createElement('div');
  header.id = 'ba-launcher-login-header';
  header.innerHTML = \`
    <div id="ba-launcher-login-title">蔚蓝档案登录器 - Steam登录</div>
    <div id="ba-launcher-login-close" title="关闭">
      <svg viewBox="0 0 10.2 10.2"><path d="M10.2,0.7L9.5,0L5.1,4.4L0.7,0L0,0.7l4.4,4.4L0,9.5l0.7,0.7l4.4-4.4l4.4,4.4l0.7-0.7L5.8,5.1L10.2,0.7z"/></svg>
    </div>
  \`;

  document.body.prepend(header);
  
  document.getElementById('ba-launcher-login-close').addEventListener('click', () => {
    window.location.href = 'ba-launcher://close';
  });
})();
`

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
        width: 1000,
        height: 800,
        minWidth: 1000,
        minHeight: 800,
        maxWidth: 1000,
        maxHeight: 800,
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
        // 等待注入脚本执行完毕后再显示窗口
        steamLoginWindow?.webContents.executeJavaScript(INJECT_HEADER_SCRIPT).then(() => {
          steamLoginWindow?.show()
        })
      })

      steamLoginWindow.webContents.on('will-navigate', (event, url) => {
        if (url === 'ba-launcher://close') {
          event.preventDefault()
          steamLoginWindow?.close()
        }
      })

      steamLoginWindow.webContents.on('did-start-loading', () => {
        steamLoginWindow?.webContents.executeJavaScript(INJECT_HEADER_SCRIPT)
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
