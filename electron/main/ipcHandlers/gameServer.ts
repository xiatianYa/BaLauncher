import { ipcMain } from 'electron'
import { queryGameServerInfo } from 'steam-server-query'

/** 查询单个服务器：成功返回 { success, data }（data 含 addr/ping 字段），失败返回 { addr, success: false } */
async function queryServer(server: string, queryAttempts: number, queryTimeout: number) {
  const start = Date.now()
  try {
    const info = await queryGameServerInfo(server, queryAttempts, queryTimeout)
    return {
      success: true,
      data: { ...info, addr: server, ping: Date.now() - start }
    }
  } catch {
    return { addr: server, success: false }
  }
}

export function setupGameServerIpc() {
  ipcMain.handle('query-game-server', async (_, gameServer: string, attempts?: number, timeout?: number | number[]) => {
    const queryTimeout = typeof timeout === 'number' ? timeout : 5000
    const queryAttempts = attempts || 2
    return queryServer(gameServer, queryAttempts, queryTimeout)
  })

  ipcMain.handle('query-game-servers', async (_, gameServers: string[], attempts?: number, timeout?: number | number[]) => {
    const queryTimeout = typeof timeout === 'number' ? timeout : 5000
    const queryAttempts = attempts || 2
    const results = await Promise.all(
      gameServers.map(server => queryServer(server, queryAttempts, queryTimeout))
    )
    return { success: true, data: results }
  })
}
