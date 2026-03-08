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
  if (os.release().startsWith('6.1') || os.release().startsWith('10.0.2')) app.disableHardwareAcceleration()
  
  if (process.platform === 'win32') app.setAppUserModelId(app.getName())
  
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
  }
}
