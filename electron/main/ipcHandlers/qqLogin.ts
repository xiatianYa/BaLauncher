import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'
import axios from 'axios'
import querystring from 'node:querystring'

let qqLoginWindow: BrowserWindow | null = null

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
      fill: #000;
    }
    #ba-launcher-login-close:hover svg {
      fill: #fff;
    }
    #ba-launcher-header-placeholder {
      width: 100%;
      height: 32px;
      display: block;
      visibility: hidden;
      flex-shrink: 0;
    }
    html, body {
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    /* 隐藏可能存在的滚动条 */
    ::-webkit-scrollbar {
      display: none;
    }
  \`;
  document.head.appendChild(style);

  const header = document.createElement('div');
  header.id = 'ba-launcher-login-header';
  header.innerHTML = \`
    <div id="ba-launcher-login-title">蔚蓝档案登录器 - QQ登陆</div>
    <div id="ba-launcher-login-close" title="关闭">
      <svg viewBox="0 0 10.2 10.2"><path d="M10.2,0.7L9.5,0L5.1,4.4L0.7,0L0,0.7l4.4,4.4L0,9.5l0.7,0.7l4.4-4.4l4.4,4.4l0.7-0.7L5.8,5.1L10.2,0.7z"/></svg>
    </div>
  \`;
  
  const placeholder = document.createElement('div');
  placeholder.id = 'ba-launcher-header-placeholder';
  
  document.body.prepend(placeholder);
  document.body.prepend(header);
  
  document.getElementById('ba-launcher-login-close').addEventListener('click', () => {
    window.location.href = 'ba-launcher://close';
  });
})();
`

export function setupQqLoginIpc() {
  ipcMain.handle('open-qq-login-window', async (_, url) => {
    if (qqLoginWindow) {
      if (qqLoginWindow.isMinimized()) {
        qqLoginWindow.restore()
      }
      qqLoginWindow.focus()
    }

    return new Promise((resolve, reject) => {
      qqLoginWindow = new BrowserWindow({
        title: '蔚蓝档案登录器 - QQ登录',
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
        width: 500,
        height: 600,
        minWidth: 500,
        minHeight: 600,
        maxWidth: 500,
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

      qqLoginWindow.once('ready-to-show', () => {
        // 等待注入脚本执行完毕后再显示窗口
        qqLoginWindow?.webContents.executeJavaScript(INJECT_HEADER_SCRIPT).then(() => {
          qqLoginWindow?.show()
        })
      })

      qqLoginWindow.webContents.on('will-navigate', (event, url) => {
        if (url === 'ba-launcher://close') {
          event.preventDefault()
          qqLoginWindow?.close()
        }
      })

      qqLoginWindow.webContents.on('did-start-loading', () => {
        qqLoginWindow?.webContents.executeJavaScript(INJECT_HEADER_SCRIPT)
      })

      qqLoginWindow.loadURL(url)

      qqLoginWindow.webContents.on('will-redirect', async (event, redirectUrl) => {
        if (redirectUrl.startsWith('https://www.bluearchive.top/main')) {
          event.preventDefault()
          const urlParams = new URLSearchParams(new URL(redirectUrl).search)

          const code = urlParams.get('code')
          const error = urlParams.get('error')

          if (code) {
            try {
              const tokenRes = await axios.get('https://graph.qq.com/oauth2.0/token', {
                params: {
                  grant_type: 'authorization_code',
                  client_id: '102129326',
                  client_secret: 'GVYMwHNGuRFrEMFt',
                  code: code,
                  redirect_uri: 'https://www.bluearchive.top/main'
                }
              })
              const tokenData = querystring.parse(tokenRes.data)

              if (tokenData.error) {
                throw new Error(`获取token失败: ${tokenData.error_description}`)
              }

              const openIdRes = await axios.get('https://graph.qq.com/oauth2.0/me', {
                params: {
                  access_token: tokenData.access_token
                }
              })

              const openIdJson = openIdRes.data
                .replace(/^callback\(/, '')
                .replace(/\);$/, '')
              const openIdData = JSON.parse(openIdJson)

              if (openIdData.error) {
                throw new Error(`获取openid失败: ${openIdData.error_description}`)
              }

              resolve({
                code,
                accessToken: tokenData.access_token,
                expiresIn: tokenData.expires_in,
                refreshToken: tokenData.refresh_token,
                openid: openIdData.openid
              })
            } catch (err) {
              reject(err)
            } finally {
              qqLoginWindow?.close()
              qqLoginWindow = null
            }
          } else if (error) {
            reject(new Error(`登录失败: ${urlParams.get('error_description') || error}`))
            qqLoginWindow?.close()
            qqLoginWindow = null
          }
        }
      })

      qqLoginWindow.on('close', () => {
        qqLoginWindow = null
        reject(new Error('用户取消登录'))
      })
    })
  })
}
