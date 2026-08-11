import { BrowserWindow } from 'electron'
import path from 'node:path'
import { getMainWindow } from '../windowManager'

/** 登录窗口对象引用（QQ/Steam 各自维护一份，供复用检测与 closed 清理） */
export interface LoginWindowRef {
  window: BrowserWindow | null
}

interface CreateLoginWindowOptions {
  /** 当前登录窗口引用 */
  ref: LoginWindowRef
  /** 窗口标题 */
  title: string
  /** 窗口尺寸（固定不可缩放） */
  width: number
  height: number
  /** 登录页地址 */
  url: string
  /** 顶部标题栏注入脚本（由 buildLoginHeaderScript 生成） */
  injectScript: string
  /** 处理 OAuth 回调重定向：返回结果 → resolve；抛错 → reject；返回 undefined → 保持窗口打开 */
  handleRedirect: (url: string) => unknown | Promise<unknown>
}

/**
 * 创建依附主窗口的登录窗口（无边框 + 注入顶部标题栏）
 * - 已有窗口时聚焦复用，避免重复创建导致窗口泄漏（孤儿窗口会出现在 ALT+TAB 中）
 * - 登录成功 resolve 结果；用户关闭窗口 / 取消登录 reject
 */
export function createLoginWindow(options: CreateLoginWindowOptions): Promise<unknown> {
  const { ref, title, width, height, url, injectScript, handleRedirect } = options

  // 已有登录窗口则聚焦复用
  if (ref.window && !ref.window.isDestroyed()) {
    if (ref.window.isMinimized()) ref.window.restore()
    ref.window.focus()
    return Promise.resolve(undefined)
  }
  ref.window = null

  return new Promise((resolve, reject) => {
    // 用局部引用捕获窗口对象，避免后续 closed 事件误清理新窗口
    const win = new BrowserWindow({
      title,
      icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
      width,
      height,
      minWidth: width,
      minHeight: height,
      maxWidth: width,
      maxHeight: height,
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
    ref.window = win

    win.once('ready-to-show', () => {
      // 等待注入脚本执行完毕后再显示窗口
      win.webContents.executeJavaScript(injectScript).then(() => {
        if (!win.isDestroyed()) {
          win.show()
        }
      })
    })

    // 阻止 Chromium 在 will-navigate 被 preventDefault 后自动
    // 创建默认窗口（无 skipTaskbar/parent），导致 ALT+TAB 幽灵条目
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

    win.webContents.on('will-navigate', (event, navUrl) => {
      // 标题栏关闭按钮通过 ba-launcher://close 本地协议请求关闭
      if (navUrl === 'ba-launcher://close') {
        event.preventDefault()
        closeLoginWindow(win)
      }
    })

    win.webContents.on('did-start-loading', () => {
      if (!win.isDestroyed()) {
        win.webContents.executeJavaScript(injectScript)
      }
    })

    win.loadURL(url)

    win.webContents.on('will-redirect', async (event, redirectUrl) => {
      // 仅处理登录成功回调地址
      if (!redirectUrl.startsWith('https://www.bluearchive.top/main')) return
      event.preventDefault()
      try {
        const result = await handleRedirect(redirectUrl)
        // 返回 undefined 表示未识别出有效参数，保持窗口打开等待继续操作
        if (result === undefined) return
        resolve(result)
      } catch (err) {
        reject(err)
      } finally {
        // 登录完成（成功或失败）后先 hide 再 destroy，确保 Windows shell 立即清理 ALT+TAB 条目
        closeLoginWindow(win)
      }
    })

    // 使用 closed 事件（窗口完全销毁后）清理引用，避免
    // close 事件（窗口开始关闭时）过早置空，导致：
    // 1. 旧窗口 native 资源未释放时创建新窗口 → ALT+TAB 幽灵条目
    // 2. 旧窗口的 closed 延迟触发，误清新窗口引用
    win.once('closed', () => {
      // 仅当仍指向当前窗口时才置空，防止误清理后续新窗口
      if (ref.window === win) {
        ref.window = null
      }
      reject(new Error('用户取消登录'))
    })
  })
}

/** 先 hide 再 destroy：hide 通知 Windows shell 从 ALT+TAB 列表移除窗口，destroy 释放 Electron 资源 */
function closeLoginWindow(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    win.hide()
    win.destroy()
  }
}

interface LoginHeaderOptions {
  /** 登录窗口标题文字 */
  title: string
  /** 徽标 SVG（完整 <svg> 标签） */
  iconSvg: string
  /** 主题色（十六进制，如 #12b7f5），用于徽标底色与图标填充 */
  accentColor: string
}

/** 构建登录窗口顶部标题栏注入脚本（标题 + 徽标 + 关闭按钮） */
export function buildLoginHeaderScript({ title, iconSvg, accentColor }: LoginHeaderOptions): string {
  return `
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
      background: ${hexToRgba(accentColor, 0.15)};
    }
    #ba-launcher-login-title .title-badge svg {
      width: 14px;
      height: 14px;
      fill: ${accentColor};
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
        ${iconSvg}
      </div>
      <span>${title}</span>
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
}

/** 将十六进制颜色 #rrggbb 转为带透明度的 rgba() 字符串 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
