import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let mainWindow: BrowserWindow | null = null
let logReaderInterval: NodeJS.Timeout | null = null
let logFilePosition: number = 0
let retryCount: number = 0
let isReading: boolean = false
const MAX_RETRIES: number = 120

export function setMainWindowForLogReader(window: BrowserWindow) {
  mainWindow = window
}

function getConsoleLogPath(csgo2Path: string): string {
  return path.join(csgo2Path, 'game', 'csgo', 'console.log')
}

function sendLogDataToRenderer(logData: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cs2-console-log', logData)
  }
}

async function readConsoleLog(csgo2Path: string) {
  if (isReading) {
    return
  }

  const logPath = getConsoleLogPath(csgo2Path)
  
  try {
    if (!fs.existsSync(logPath)) {
      retryCount++
      return
    }

    isReading = true

    const stats = fs.statSync(logPath)
    const fileSize = stats.size

    if (fileSize > logFilePosition) {
      const bytesToRead = fileSize - logFilePosition
      
      if (bytesToRead > 0) {
        const buffer = Buffer.alloc(bytesToRead)
        
        try {
          const fd = fs.openSync(logPath, 'r')
          fs.readSync(fd, buffer, 0, bytesToRead, logFilePosition)
          fs.closeSync(fd)
          
          const newLogContent = buffer.toString('utf8')
          logFilePosition = fileSize
          
          if (newLogContent) {
            sendLogDataToRenderer(newLogContent)
          }
        } catch {
          // 文件被 CS2 占用（写入中），跳过本次读取
        }
      }
    }

    retryCount = 0
  } catch {
    // 读取失败，静默重试
    retryCount++
  } finally {
    isReading = false
  }
}

export function startLogReader(csgo2Path: string, delayMs: number = 0) {
  if (logReaderInterval) {
    stopLogReader()
  }

  logFilePosition = 0
  retryCount = 0
  isReading = false
  
  const startReading = () => {
    logReaderInterval = setInterval(() => {
      readConsoleLog(csgo2Path)
    }, 1000)
  }

  if (delayMs > 0) {
    setTimeout(startReading, delayMs)
  } else {
    startReading()
  }
}

export function stopLogReader() {
  if (logReaderInterval) {
    clearInterval(logReaderInterval)
    logReaderInterval = null
    logFilePosition = 0
    retryCount = 0
    isReading = false
  }
}

export function setupLogReaderIpc() {
  ipcMain.handle('start-log-reader', async (_event, csgo2Path: string, delayMs: number = 0) => {
    if (!csgo2Path) return { success: false, error: 'CS2 path not provided' }
    startLogReader(csgo2Path, delayMs)
    return { success: true }
  })

  ipcMain.handle('stop-log-reader', async () => {
    stopLogReader()
    return { success: true }
  })
}
