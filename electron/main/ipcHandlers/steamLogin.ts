import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'
import { getMainWindow } from '../windowManager'

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
      height: 36px;
      background: rgba(22, 26, 38, 0.98);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 2147483647;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-app-region: drag;
      font-family: system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
      overflow: hidden;
    }
    #ba-launcher-login-title {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-left: 12px;
      font-size: 12.5px;
      color: rgba(255,255,255,0.85);
      font-weight: 600;
      letter-spacing: 0.5px;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #ba-launcher-login-title .title-badge {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(102, 192, 244, 0.15);
    }
    #ba-launcher-login-title .title-badge svg {
      width: 14px;
      height: 14px;
      fill: #66c0f4;
    }
    #ba-launcher-login-close {
      width: 44px;
      height: 36px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      -webkit-app-region: no-drag;
      transition: background 0.2s;
    }
    #ba-launcher-login-close:hover {
      background: rgba(232, 17, 35, 0.85);
    }
    #ba-launcher-login-close svg {
      width: 9px;
      height: 9px;
      fill: rgba(255,255,255,0.7);
      transition: fill 0.2s;
    }
    #ba-launcher-login-close:hover svg {
      fill: #fff;
    }
    #ba-launcher-header-placeholder {
      width: 100%;
      height: 36px;
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
    <div id="ba-launcher-login-title">
      <div class="title-badge">
        <svg viewBox="0 0 496 512"><path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.6-76.3-239-180.4l95.2 39.3c6.4 2.6 12.3 4.2 18.8 4.2 28.7 0 52-23.3 52-52 0-5.5-1.1-10.9-3.1-15.8 2.1-.3 4.2-.5 6.4-.5 20.4 0 37 16.6 37 37s-16.6 37-37 37c-1.3 0-2.6 0-3.8-.1l-38.2 15.8c12.5 25.2 38.1 42.6 67.7 42.6 41.5 0 75.2-33.7 75.2-75.2 0-41.5-33.7-75.2-75.2-75.2-7.1 0-14 .9-20.5 2.8-10.1-18.4-29.7-31.3-52.4-31.3-10.4 0-20.2 2.6-28.7 7.3L108.4 178c17.5-39.4 55.6-67.1 100.4-67.1 60.5 0 109.5 49 109.5 109.5 0 10.9-1.7 21.5-4.7 31.4l54.1 22.4c17.1 7.1 31.8 20.8 41.5 38.1 13.2 23.4 21.2 50.8 21.2 79.8 0 32.3-9.9 62.2-26.9 87.3C414.7 449.3 458.8 361.3 458.8 256c0-111.9-91.1-202.9-203-202.9-33.9 0-65.8 8.4-93.8 23.2L138.7 41.5C172.8 16.6 213 1 256 1 391.2 1 496 113 496 256zM240.2 385.8c-29.1 0-52.7-23.6-52.7-52.7 0-29.1 23.6-52.7 52.7-52.7s52.7 23.6 52.7 52.7c0 29.1-23.6 52.7-52.7 52.7z"/></svg>
      </div>
      <span>蔚蓝档案登录器 - Steam登录</span>
    </div>
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

export function setupSteamLoginIpc() {
  ipcMain.handle('open-steam-login-window', async (_, url) => {
    // 已有登录窗口则聚焦复用，避免重复创建导致窗口泄漏（孤儿窗口会出现在 ALT+TAB 中）
    if (steamLoginWindow && !steamLoginWindow.isDestroyed()) {
      if (steamLoginWindow.isMinimized()) {
        steamLoginWindow.restore()
      }
      steamLoginWindow.focus()
      return
    }
    steamLoginWindow = null

    return new Promise((resolve, reject) => {
      // 用局部引用捕获窗口对象，避免后续 closed 事件误清理新窗口
      const win = new BrowserWindow({
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
        backgroundColor: '#161a26',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        },
        autoHideMenuBar: true,
        frame: false,
        // 依附主窗口：不出现在 ALT+TAB/任务栏，避免多个应用条目残留；主窗口关闭时随之销毁
        parent: getMainWindow() || undefined,
        skipTaskbar: true
      })
      steamLoginWindow = win

      win.once('ready-to-show', () => {
        // 等待注入脚本执行完毕后再显示窗口
        win.webContents.executeJavaScript(INJECT_HEADER_SCRIPT).then(() => {
          if (!win.isDestroyed()) {
            win.show()
          }
        })
      })

      // 阻止 Chromium 在 will-navigate 被 preventDefault 后自动
      // 创建默认窗口（无 skipTaskbar/parent），导致 ALT+TAB 幽灵条目
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

      win.webContents.on('will-navigate', (event, url) => {
        if (url === 'ba-launcher://close') {
          event.preventDefault()
          // hide() 先通知 Windows shell 从 ALT+TAB 列表移除窗口，
          // 再 destroy() 释放 Electron 资源，避免 shell 缓存残留
          if (!win.isDestroyed()) {
            win.hide()
            win.destroy()
          }
        }
      })

      win.webContents.on('did-start-loading', () => {
        if (!win.isDestroyed()) {
          win.webContents.executeJavaScript(INJECT_HEADER_SCRIPT)
        }
      })

      win.loadURL(url)

      win.webContents.on('will-redirect', async (event, redirectUrl) => {
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
                if (!win.isDestroyed()) {
                  win.hide()
                  win.destroy()
                }
                return
              }
            }
            
            reject(new Error('无法获取 Steam ID'))
          } catch (err) {
            reject(err)
          } finally {
            // 登录完成（成功或失败）后先 hide 再 destroy，确保 Windows shell 立即清理 ALT+TAB 条目
            if (!win.isDestroyed()) {
              win.hide()
              win.destroy()
            }
          }
        }
      })

      // 使用 closed 事件（窗口完全销毁后）清理引用，避免
      // close 事件（窗口开始关闭时）过早置空，导致：
      // 1. 旧窗口 native 资源未释放时创建新窗口 → ALT+TAB 幽灵条目
      // 2. 旧窗口的 closed 延迟触发，误清新窗口引用
      win.once('closed', () => {
        // 仅当仍指向当前窗口时才置空，防止误清理后续新窗口
        if (steamLoginWindow === win) {
          steamLoginWindow = null
        }
        reject(new Error('用户取消登录'))
      })
    })
  })
}
