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
import { setupAgreementIpc } from './agreementWindow'
import { setupWeatherIpc } from './weather'
import { setupSystemMonitorIpc } from './systemMonitor'
import { registerWorkshopScheme, setupWorkshopIpc } from './workshop'

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
  setupAgreementIpc()
  setupWeatherIpc()
  setupSystemMonitorIpc()
  // 创意工坊协议必须在 app ready 前注册
  registerWorkshopScheme()
  setupWorkshopIpc()
}
