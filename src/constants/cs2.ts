// 存储键
export const STORAGE_KEYS = {
  GAME_PLATFORM: 'GamePlatform' as const,
  CSGO2_PATH: 'csgo2Path' as const,
  STEAM_PATH: 'steamPath' as const,
  AUTOMATIC_JOIN_CONFIG: 'automaticJoinConfig' as const,
  APPLY_KEY_BIND_ITEMS: 'applyKeyBindItems' as const,
  SELECTED_START_ITEMS: 'selectedStartItems' as const
}

// 日志模式
export const LOG_PATTERNS = {
  loadingToIngame: /ChangeGameUIState:.*LOADINGSCREEN\s*->\s*CSGO_GAME_UI_STATE_INGAME/,
  mapInfo: /\[Client\] Map:\s*"([^"]+)"/,
  connected: /\[Client\] CL:\s*Connected to/,
  serverFull: /\[Client\] Disconnected from server: NETWORK_DISCONNECT_REJECT_SERVERFULL/,
  switchingToLevelload: /switching to "levelload" loopmode/,
  queueNewRequest: /\[HostStateManager\] CHostStateMgr::QueueNewRequest/
} as const

// 用户连接状态
export type UserConnectionStatus = 'idle' | 'connecting' | 'map_loading' | 'in_game' | 'connection_failed'

/** GIS数据发送计时器状态 */
export interface GisDataSendTimerState {
  lastSentAt: number
  sendTimer: ReturnType<typeof setTimeout> | null
  pendingData: Api.Game.CsgoPlayer | null
}
