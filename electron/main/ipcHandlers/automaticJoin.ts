import { ipcMain } from 'electron'
import { Worker, isMainThread } from 'worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 挤服会话：同时只允许一个轮询循环在跑，防止并发启动导致 worker 泄漏 */
interface JoinSession {
  workers: Worker[]
  resolve: ((value: any) => void) | null
  resolved: boolean
}

let joinSession: JoinSession | null = null

/**
 * 结束当前挤服会话：终止全部 worker、resolve 挂起 Promise、清空会话状态。
 * 会话已 resolve（found）时不会重复 resolve。
 */
function stopJoinSession(result: Record<string, unknown> = { success: true, found: false, stopped: true }): void {
  if (!joinSession) return
  const session = joinSession
  joinSession = null
  session.workers.forEach(w => w.terminate())
  session.workers = []
  if (session.resolve && !session.resolved) {
    session.resolved = true
    session.resolve(result)
  }
}

export function setupAutomaticJoinIpc() {
  ipcMain.handle('start-automatic-join', async (_, options) => {
    const { serverAddr, maxPlayers, threadCount, joinDelay } = options

    if (!isMainThread) {
      return { success: false, error: 'Must be run in main thread' }
    }

    // 防并发：已有挤服循环在跑时，先终止旧循环并 resolve 旧 Promise，再启动新循环
    if (joinSession) {
      stopJoinSession()
    }

    const workerPath = path.join(__dirname, 'serverQuery.js')
    const session: JoinSession = { workers: [], resolve: null, resolved: false }
    joinSession = session

    // 创建轮询 worker 线程
    for (let i = 0; i < threadCount; i++) {
      session.workers.push(new Worker(workerPath))
    }

    return new Promise((resolve) => {
      session.resolve = resolve

      const onResult = (message: any, worker: Worker) => {
        // 过期会话（已被替换/停止）的 worker 延迟消息一律忽略
        if (joinSession !== session || session.resolved) return

        if (message.success && message.found) {
          session.resolved = true
          stopJoinSession()
          resolve({ success: true, found: true, serverInfo: message.serverInfo })
          return
        }

        // 未找到空位，延迟后让该 worker 继续轮询
        setTimeout(() => {
          if (joinSession === session && !session.resolved && session.workers.includes(worker)) {
            worker.postMessage({ serverAddr, maxPlayers })
          }
        }, joinDelay || 200)
      }

      session.workers.forEach(worker => {
        worker.on('message', (msg) => onResult(msg, worker))
        worker.on('error', () => {
          // worker 异常后延迟重试，保证挤服循环不中断
          setTimeout(() => {
            if (joinSession === session && !session.resolved && session.workers.includes(worker)) {
              worker.postMessage({ serverAddr, maxPlayers })
            }
          }, 1000)
        })

        worker.postMessage({ serverAddr, maxPlayers })
      })
    })
  })

  ipcMain.handle('stop-automatic-join', async () => {
    stopJoinSession()
    return { success: true }
  })
}
