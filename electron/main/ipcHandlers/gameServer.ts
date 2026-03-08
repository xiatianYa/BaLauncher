import { ipcMain } from 'electron'
import { queryGameServerInfo } from 'steam-server-query'

let shouldStop = false

async function executeSingleQuery(serverAddr: string, maxPlayers: number) {
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

export function setupGameServerIpc() {
  ipcMain.handle('query-game-server', async (_, gameServer: string, attempts?: number, timeout?: number | number[]) => {
    console.log('[query-game-server] 查询单个服务器:', gameServer)
    try {
      const queryTimeout = timeout || 5000
      const queryAttempts = attempts || 2

      const data = await queryGameServerInfo(gameServer, queryAttempts, queryTimeout)
      data.addr = gameServer
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

  ipcMain.handle('query-game-servers', async (_, gameServers: string[], attempts?: number, timeout?: number | number[]) => {
    try {
      const queryTimeout = timeout || 5000
      const queryAttempts = attempts || 2
      const results = await Promise.allSettled(
        gameServers.map(async (server) => {
          try {
            const data = await queryGameServerInfo(server, queryAttempts, queryTimeout)
            data.addr = server
            return data
          } catch (error) {
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

  ipcMain.handle('start-automatic-join', async (_, options) => {
    const { serverAddr, maxPlayers, threadCount } = options

    let foundServer = null
    shouldStop = false

    while (!foundServer && !shouldStop) {
      const queries: Promise<any>[] = []

      for (let i = 0; i < threadCount && !shouldStop; i++) {
        queries.push(executeSingleQuery(serverAddr, maxPlayers))
      }

      const queryResults = await Promise.all(queries)

      if (shouldStop) {
        break
      }

      for (const result of queryResults) {
        if (result.success && result.found) {
          foundServer = result.serverInfo
          break
        }
      }

      if (!foundServer && !shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (shouldStop) {
      return {
        success: true,
        found: false,
        stopped: true
      }
    }

    return {
      success: true,
      found: true,
      serverInfo: foundServer
    }
  })

  ipcMain.handle('stop-automatic-join', async () => {
    shouldStop = true
    return {
      success: true
    }
  })
}
