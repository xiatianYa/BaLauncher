import { ipcMain } from 'electron'
import { Worker, isMainThread } from 'worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let shouldStop = false

export function setupAutomaticJoinIpc() {
  ipcMain.handle('start-automatic-join', async (_, options) => {
    const { serverAddr, maxPlayers, threadCount } = options
    shouldStop = false

    if (!isMainThread) {
      return { success: false, error: 'Must be run in main thread' }
    }

    const workerPath = path.join(__dirname, 'serverQuery.js')
    const workers: Worker[] = []

    for (let i = 0; i < threadCount; i++) {
      const worker = new Worker(workerPath)
      workers.push(worker)
    }

    return new Promise((resolve) => {
      let resolved = false
      let activeWorkers = workers.length

      const cleanup = () => {
        workers.forEach(w => w.terminate())
        resolved = true
      }

      const onResult = (message: any, worker: Worker) => {
        if (resolved) return

        if (shouldStop) {
          cleanup()
          resolve({
            success: true,
            found: false,
            stopped: true
          })
          return
        }

        if (message.success && message.found) {
          cleanup()
          resolve({
            success: true,
            found: true,
            serverInfo: message.serverInfo
          })
          return
        }

        if (!shouldStop && !resolved) {
          setTimeout(() => {
            if (!shouldStop && !resolved) {
              worker.postMessage({ serverAddr, maxPlayers })
            }
          }, 200) 
        }
      }

      workers.forEach(worker => {
        worker.on('message', (msg) => onResult(msg, worker))
        worker.on('error', (err) => {
          console.error('Worker error:', err)
          if (!shouldStop && !resolved) {
             setTimeout(() => {
                if (!shouldStop && !resolved) {
                  worker.postMessage({ serverAddr, maxPlayers })
                }
             }, 1000)
          }
        })
        
        worker.postMessage({ serverAddr, maxPlayers })
      })
    })
  })

  ipcMain.handle('stop-automatic-join', async () => {
    shouldStop = true
    return {
      success: true
    }
  })
}
