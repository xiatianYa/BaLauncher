import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'

let agreementWindow: BrowserWindow | null = null

/**
 * 打开用户协议 / 隐私政策窗口
 */
export function setupAgreementIpc() {
  ipcMain.handle('open-agreement-window', async (_, type: 'user' | 'privacy') => {
    // 已打开则聚焦，避免重复创建（防止访问已销毁的窗口对象）
    if (agreementWindow && !agreementWindow.isDestroyed()) {
      if (agreementWindow.isMinimized()) {
        agreementWindow.restore()
      }
      agreementWindow.focus()
      return
    }
    // 残留的已销毁窗口引用置空
    agreementWindow = null

    agreementWindow = new BrowserWindow({
      title: '蔚蓝档案登录器 - 协议',
      icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
      width: 820,
      height: 680,
      minWidth: 640,
      minHeight: 480,
      show: false,
      backgroundColor: '#161a26',
      autoHideMenuBar: true,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    const win = agreementWindow

    win.once('ready-to-show', () => {
      // 窗口可能在加载过程中被关闭，需确认未被销毁
      if (win && !win.isDestroyed()) {
        win.show()
      }
    })

    win.on('close', () => {
      // 仅当当前窗口引用一致时才置空，避免覆盖新窗口
      if (agreementWindow === win) {
        agreementWindow = null
      }
    })

    try {
      // 通过 query 参数指定展示用户协议或隐私政策
      await win.loadFile(path.join(process.env.VITE_PUBLIC, 'agreement', 'index.html'), {
        query: { type: type === 'privacy' ? 'privacy' : 'user' }
      })
    } catch (err) {
      // 加载失败（如窗口在加载过程中被关闭）时安全清理
      if (win && !win.isDestroyed()) {
        win.close()
      }
      if (agreementWindow === win) {
        agreementWindow = null
      }
    }
  })
}
