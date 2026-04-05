import { ipcMain } from 'electron'
import { Worker, isMainThread } from 'worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let workers: Worker[] = []
let currentResolve: ((value: any) => void) | null = null

export function setupAutomaticJoinIpc() {
  ipcMain.handle('start-automatic-join', async (_, options) => {
    const { serverAddr, maxPlayers, threadCount, joinDelay } = options
    console.log(joinDelay)

    if (!isMainThread) {
      return { success: false, error: 'Must be run in main thread' }
    }

    const workerPath = path.join(__dirname, 'serverQuery.js')

    for (let i = 0; i < threadCount; i++) {
      const worker = new Worker(workerPath)
      workers.push(worker)
    }

    return new Promise((resolve) => {
      let resolved = false
      currentResolve = resolve

      const cleanup = () => {
        workers.forEach(w => w.terminate())
        workers = []
        resolved = true
        currentResolve = null
      }

      const onResult = (message: any, worker: Worker) => {
        console.log('Worker success')
        if (resolved) return

        if (message.success && message.found) {
          cleanup()
          resolve({
            success: true,
            found: true,
            serverInfo: message.serverInfo
          })
          return
        }

        if (!resolved) {
          setTimeout(() => {
            if (!resolved && workers.includes(worker)) {
              worker.postMessage({ serverAddr, maxPlayers })
            }
          }, joinDelay || 200)
        }
      }

      workers.forEach(worker => {
        worker.on('message', (msg) => onResult(msg, worker))
        worker.on('error', (err) => {
          console.error('Worker error:', err)
          if (!resolved) {
             setTimeout(() => {
                if (!resolved && workers.includes(worker)) {
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
    console.log('Stop automatic join')
    workers.forEach(w => w.terminate())
    workers = []

    if (currentResolve) {
      currentResolve({
        success: true,
        found: false,
        stopped: true
      })
      currentResolve = null
    }

    return {
      success: true
    }
  })
}
