import { ipcMain } from 'electron'
import { setupWindowControlIpc } from './windowControl'
import { setupQqLoginIpc } from './qqLogin'
import { setupSteamLoginIpc } from './steamLogin'
import { setupGameServerIpc } from './gameServer'
import { setupGamePathIpc } from './gamePath'
import { setupCs2GsiIpc } from './cs2Gsi'
import { setupLogReaderIpc } from './logReader'
import { setupAutomaticJoinIpc } from './automaticJoin'
import { setupCs2CfgIpc } from './cs2Cfg'
import { setupNotificationIpc } from '../notificationWindow'

export function setupAllIpcHandlers() {
  setupWindowControlIpc()
  setupQqLoginIpc()
  setupSteamLoginIpc()
  setupGameServerIpc()
  setupGamePathIpc()
  setupCs2GsiIpc()
  setupLogReaderIpc()
  setupAutomaticJoinIpc()
  setupCs2CfgIpc()
  setupNotificationIpc(ipcMain)
}
