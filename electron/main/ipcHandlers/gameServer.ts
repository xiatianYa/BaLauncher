import { ipcMain } from 'electron'
import { queryGameServerInfo } from 'steam-server-query'

export async function executeSingleQuery(serverAddr: string, maxPlayers: number) {
  try {
    const serverInfo = await queryGameServerInfo(serverAddr, 1, 1000)
    serverInfo.addr = serverAddr
    const found = serverInfo.players <= maxPlayers
    console.log(found)
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
      const start = Date.now()
      const data = await queryGameServerInfo(gameServer, queryAttempts, queryTimeout)
      const end = Date.now()
      data.addr = gameServer
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
            data.addr = server
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
}
