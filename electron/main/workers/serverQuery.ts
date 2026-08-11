import { parentPort } from 'worker_threads'
import { queryGameServerInfo } from 'steam-server-query'

if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const { serverAddr, maxPlayers } = message
      const serverInfo = await queryGameServerInfo(serverAddr, 1, 1000)
      const found = serverInfo.players <= maxPlayers
      parentPort?.postMessage({
        success: true,
        found,
        serverInfo: { ...serverInfo, addr: serverAddr }
      })
    } catch (error) {
      parentPort?.postMessage({
        success: false,
        found: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })
}
