import { app } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

export const preload = path.join(__dirname, '../preload/index.mjs')
export const indexHtml = path.join(RENDERER_DIST, 'index.html')

export function initializeApp() {
  // 仅 Win7 (6.1) 禁用硬件加速；Win11 保持硬件加速（软件合成 + 透明窗口在反复 ALT+TAB 时会产生 DWM 幻影窗口条目）
  if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

  // 与 electron-builder 的 appId 保持一致，确保任务栏分组与右键菜单图标正确关联
  if (process.platform === 'win32') app.setAppUserModelId('com.bluearchive.balauncher')

  if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
  }
}
