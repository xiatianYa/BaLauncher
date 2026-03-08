import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'
import axios from 'axios'
import querystring from 'node:querystring'

let qqLoginWindow: BrowserWindow | null = null

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
        title: '蔚蓝档案登录器',
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

      qqLoginWindow.once('ready-to-show', () => {
        qqLoginWindow?.show()
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
