import { app, ipcMain, BrowserWindow, shell } from 'electron'
import axios from 'axios'
import fs from 'fs'
import path from 'path'

const UPDATE_DOWNLOAD_URL = 'https://www.bluearchive.top/statics/soft/蔚蓝档案登录器-Windows-Setup.exe'
const GITHUB_REPO_OWNER = 'your-username'
const GITHUB_REPO_NAME = 'BaLauncher'

let downloadedFilePath: string | null = null
let downloadAbortController: AbortController | null = null

function getCurrentVersion(): string {
  return app.getVersion()
}

async function getLatestVersionFromGitHub(): Promise<string | null> {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`)
    const tagName = response.data.tag_name
    return tagName.replace(/^v/, '')
  } catch (error) {
    console.error('Failed to check GitHub latest version:', error)
    return null
  }
}

function compareVersions(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number)
  const latestParts = latest.split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0
    if (latestPart > currentPart) return true
    if (latestPart < currentPart) return false
  }
  return false
}

export async function checkForUpdates(win: BrowserWindow): Promise<boolean> {
  if (!app.isPackaged) return false

  const currentVersion = getCurrentVersion()
  const latestVersion = await getLatestVersionFromGitHub()

  if (!latestVersion) {
    console.log('Could not get latest version from GitHub')
    return false
  }

  if (compareVersions(currentVersion, latestVersion)) {
    win.webContents.send('update-available')
    return true
  }
  return false
}

async function downloadUpdate(win: BrowserWindow) {
  const tempDir = app.getPath('temp')
  downloadedFilePath = path.join(tempDir, `BaLauncher-Setup-${Date.now()}.exe`)
  downloadAbortController = new AbortController()

  try {
    const response = await axios({
      method: 'GET',
      url: UPDATE_DOWNLOAD_URL,
      responseType: 'stream',
      signal: downloadAbortController.signal
    })

    const totalSize = parseInt(response.headers['content-length'] || '0', 10)
    let downloadedSize = 0
    const startTime = Date.now()

    const writer = fs.createWriteStream(downloadedFilePath)

    response.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length
      writer.write(chunk)

      const elapsed = (Date.now() - startTime) / 1000
      const speed = elapsed > 0 ? downloadedSize / elapsed : 0
      const percent = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0

      win.webContents.send('update-downloading', {
        percent,
        bytesPerSecond: speed
      })
    })

    response.data.on('end', () => {
      writer.end()
      win.webContents.send('update-downloaded')
    })

    response.data.on('error', (err: Error) => {
      console.error('Download error:', err)
      writer.end()
    })
  } catch (error) {
    console.error('Failed to download update:', error)
  }
}

async function installUpdate() {
  if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
    shell.openPath(downloadedFilePath)
    app.quit()
  }
}

export function setupAutoUpdaterIpc(win: BrowserWindow) {
  ipcMain.handle('install-update', async () => {
    await installUpdate()
  })

  ipcMain.handle('download-update', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      await downloadUpdate(window)
    }
  })

  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates(win)
  })
}
