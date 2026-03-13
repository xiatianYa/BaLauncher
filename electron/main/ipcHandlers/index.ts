import { setupWindowControlIpc } from './windowControl'
import { setupQqLoginIpc } from './qqLogin'
import { setupSteamLoginIpc } from './steamLogin'
import { setupGameServerIpc } from './gameServer'
import { setupGamePathIpc } from './gamePath'
import { setupCs2GsiIpc } from './cs2Gsi'
import { setupLogReaderIpc } from './logReader'
import { setupAutomaticJoinIpc } from './automaticJoin'

export function setupAllIpcHandlers() {
  setupWindowControlIpc()
  setupQqLoginIpc()
  setupSteamLoginIpc()
  setupGameServerIpc()
  setupGamePathIpc()
  setupCs2GsiIpc()
  setupLogReaderIpc()
  setupAutomaticJoinIpc()
}
