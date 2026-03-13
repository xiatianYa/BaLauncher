import { parentPort } from 'worker_threads'
import { queryGameServerInfo } from 'steam-server-query'

if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const { serverAddr, maxPlayers } = message
      const serverInfo = await queryGameServerInfo(serverAddr, 1, 1000)
      serverInfo.addr = serverAddr
      const found = serverInfo.players <= maxPlayers
      parentPort?.postMessage({ success: true, found, serverInfo })
    } catch (error) {
      parentPort?.postMessage({ 
        success: false, 
        found: false, 
        error: error && (error as Error).message ? (error as Error).message : String(error) 
      })
    }
  })
}
