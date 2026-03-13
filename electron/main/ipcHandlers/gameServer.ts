import { ipcMain } from 'electron'
import { queryGameServerInfo } from 'steam-server-query'
import { Worker, isMainThread } from 'worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let shouldStop = false

/**
 * 执行单个查询
 */
export async function executeSingleQuery(serverAddr: string, maxPlayers: number) {
  try {
    const serverInfo = await queryGameServerInfo(serverAddr, 1, 1000)
    serverInfo.addr = serverAddr
    const found = serverInfo.players <= maxPlayers
    console.log(found);
    return {
      success: true,
      found,
      serverInfo
    }
  } catch (error) {
    return {
      success: false,
      found: false,
      error: (error as Error).message
    }
  }
}

function executeSingleQueryInWorker(serverAddr: string, maxPlayers: number) {
  if (!isMainThread) {
    return executeSingleQuery(serverAddr, maxPlayers)
  }

  // 在打包后，Worker 脚本位于与主进程相同的目录下
  const workerPath = path.join(__dirname, 'serverQuery.js');

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { serverAddr, maxPlayers },
    });

    const cleanup = () => {
      worker.removeAllListeners();
    };

    worker.on('message', (message) => {
      cleanup();
      resolve(message);
      worker.terminate();
    });

    worker.on('error', (error) => {
      cleanup();
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        cleanup();
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

/**
 * 查询单个服务器信息
 */
export function setupGameServerIpc() {
  ipcMain.handle('query-game-server', async (_, gameServer: string, attempts?: number, timeout?: number | number[]) => {
    console.log('[query-game-server] 查询单个服务器:', gameServer)
    try {
      const queryTimeout = timeout || 5000
      const queryAttempts = attempts || 2
      const start = Date.now()
      const data = await queryGameServerInfo(gameServer, queryAttempts, queryTimeout)
      const end = Date.now()
      data.addr = gameServer;
      data.ping = end - start
      console.log('[query-game-server] 查询成功:', gameServer, data)
      return {
        success: true,
        data
      }
    } catch (error) {
      console.log('[query-game-server] 查询失败:', gameServer, error)
      return {
        addr: gameServer,
        success: false,
      }
    }
  })

  /**
   * 查询多个服务器信息
   */
  ipcMain.handle('query-game-servers', async (_, gameServers: string[], attempts?: number, timeout?: number | number[]) => {
    try {
      const queryTimeout = timeout || 5000
      const queryAttempts = attempts || 2
      const results = await Promise.allSettled(
        gameServers.map(async (server) => {
          const start = Date.now()
          try {
            const data = await queryGameServerInfo(server, queryAttempts, queryTimeout)
            const end = Date.now()
            data.addr = server;
            data.ping = end - start
            return data
          } catch (error) {
            const end = Date.now()
            return {
              addr: server,
              success: false,
            }
          }
        })
      )

      const formattedResults = results.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value
        }
        return {
          success: false,
        }
      })
      return { success: true, data: formattedResults }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
  
  /**
   * 开启自动挤服 (优化版：Worker池复用 + 持续并发)
   */
  ipcMain.handle('start-automatic-join', async (_, options) => {
    const { serverAddr, maxPlayers, threadCount } = options
    shouldStop = false

    // 如果在主线程直接执行，不使用 Worker 逻辑 (虽然不建议)
    if (!isMainThread) {
      return { success: false, error: 'Must be run in main thread' }
    }

    const workerPath = path.join(__dirname, 'serverQuery.js')
    const workers: Worker[] = []

    // 初始化 Worker 池
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

        // 没找到，继续让该 Worker 进行下一次查询
        // 添加微小延迟避免过于频繁导致被封禁或网络拥塞，同时给事件循环喘息机会
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
          // Worker 出错不应中断整个流程，尝试重启或忽略
          // 这里简单处理：让它继续尝试
          if (!shouldStop && !resolved) {
             setTimeout(() => {
                if (!shouldStop && !resolved) {
                  worker.postMessage({ serverAddr, maxPlayers })
                }
             }, 1000)
          }
        })
        
        // 启动第一次查询
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
