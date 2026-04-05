// 日志模式
export const LOG_PATTERNS = {
  // 加载到游戏状态
  loadingToIngame: /ChangeGameUIState:.*LOADINGSCREEN\s*->\s*CSGO_GAME_UI_STATE_INGAME/,
  // 地图信息
  mapInfo: /\[Client\] Map:\s*"([^"]+)"/,
  // 连接服务器
  connected: /\[Client\] CL:\s*Connected to/,
  // 服务器已满
  serverFull: /\[Client\] Disconnected from server: NETWORK_DISCONNECT_REJECT_SERVERFULL/,
  // 切换到levelload循环模式
  switchingToLevelload: /switching to "levelload" loopmode/,
  // 队列新请求
  queueNewRequest: /\[HostStateManager\] CHostStateMgr::QueueNewRequest/,
  // 用户断开连接
  disconnected: /\[Client\] CL:\s*disconnect/
} as const

// 用户连接状态
export type UserConnectionStatus = 'idle' | 'connecting' | 'map_loading' | 'in_game' | 'connection_failed' | 'disconnected'

/** GIS数据发送计时器状态 */
export interface GisDataSendTimerState {
  lastSentAt: number
  sendTimer: ReturnType<typeof setTimeout> | null
  pendingData: Api.Game.CsgoPlayer | null
}
