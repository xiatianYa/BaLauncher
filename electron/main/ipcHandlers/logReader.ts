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
      if (retryCount <= MAX_RETRIES) {
        console.log(`等待日志文件创建... (${retryCount}/${MAX_RETRIES})`)
      }
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
        } catch (readError) {
          console.log('文件被占用，跳过本次读取')
        }
      }
    }
    
    retryCount = 0
  } catch (error) {
    console.error('读取console.log失败:', error.message)
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
    console.log('开始读取CS2控制台日志')
    logReaderInterval = setInterval(() => {
      readConsoleLog(csgo2Path)
    }, 1000)
  }
  
  if (delayMs > 0) {
    console.log(`延迟 ${delayMs}ms 后开始读取日志`)
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
    console.log('停止读取CS2控制台日志')
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
