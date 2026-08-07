import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { defineStore } from 'pinia'
import { SetupStoreId } from '@/enum'
import { UserConnectionStatus, GisDataSendTimerState } from '@/constants/cs2'
import ServerWebsocket, { sendPlayerAction, sendPlayerGameData, sendServerGameData } from '@/utils/ws/server'
import { useAppStore } from '@/store/modules/app'
import { useServerQuery } from './useServerQuery'
import { useGsiListener } from './useGsiListener'
import { useLogReader } from './useLogReader'
import { useGameStatus } from './useGameStatus'
import { useAutoJoin } from './useAutoJoin'
import { usePlayerAction } from './usePlayerAction'

/**
 * 游戏状态管理 Store
 * 管理游戏相关状态、服务器列表、自动挤服、GSI数据等功能
 *
 * 已拆分为多个 composable：
 * - appStore: 本地存储读写（game/app 持久化设置统一管理）
 * - useServerQuery: 服务器查询
 * - useGsiListener: GSI事件监听
 * - useLogReader: 日志解析
 * - useGameStatus: 游戏状态检查与启动
 * - useAutoJoin: 自动挤服
 * - usePlayerAction: 玩家动作管理
 */
export const useGameStore = defineStore(SetupStoreId.Game, () => {
  // ==================== 持久化设置 ====================
  // 游戏/应用持久化设置统一由 appStore 管理（含 localStorage 读写），此处仅解耦引用
  const appStore = useAppStore()
  const {
    gamePlatform: GamePlatform,
    csgo2Path,
    steamPath,
    automaticJoinConfig,
    applyKeyBindItems,
    selectedStartItems,
    isFullscreen,
    serverViewModule,
    selectedCommunityId
  } = storeToRefs(appStore)

  // ==================== 列表数据 ====================

  /** 社区列表 */
  const communityList = reactive<Api.Game.Community[]>([])

  /** 源服务器数据列表（后端配置的所有服务器） */
  const serverDataList = reactive<Api.Game.Server[]>([])

  /** 地图列表 */
  const mapList = reactive<Api.Game.Map[]>([])

  /** 当前展示的服务器列表（包含实时状态） */
  const currentServerList = reactive<Api.Game.SeverVo[]>([])

  /** WebSocket 推送的服务器列表 */
  const currentServerWsList = reactive<Api.Game.SeverVo[]>([])

  /** GSI 服务端返回的服务器信息列表 */
  const currentGisServerList = reactive<Api.Game.ServerInfoData[]>([])

  /** WebSocket 推送的服务器游戏实时数据（key：服务器ID字符串） */
  const serverGameDataMap = reactive<Api.Game.ServerGameDataVo>({
    serverInfoMap: {},
    userGameDataMap: {},
    playerActionMap: {},
  })

  // ==================== 服务器相关 ====================

  /** 正在刷新的服务器地址列表 */
  const refreshingServerAddrs = ref<string[]>([])

  /** 当前选中的待加入服务器信息 */
  const joinServerInfo = ref<Api.Game.SeverVo>()

  /** 最近一次发起加入服务器请求的时间戳，10s 内抑制退出上报（避免切服时误清 GIS 数据） */
  const lastJoinRequestTime = ref(0)
  const QUIT_REPORT_SUPPRESS_WINDOW = 10000

  /** 标记已发起加入服务器请求 */
  function markJoinRequested(): void {
    lastJoinRequestTime.value = Date.now()
  }

  /** 是否处于退出上报抑制窗口（10s 内刚发起过加入服务器请求） */
  function isQuitReportSuppressed(): boolean {
    return Date.now() - lastJoinRequestTime.value < QUIT_REPORT_SUPPRESS_WINDOW
  }

  // ==================== 自动挤服状态 ====================

  /** 是否正在自动挤服 */
  const isAutomatic = ref(false)

  /** 挤服托盘是否可见 */
  const isJoinServerTrayVisible = ref(false)

  /** 是否处于自动重试状态 */
  const isAutomaticRetry = ref(false)

  /** 自动挤服计数 */
  const automaticCount = ref(0)

  // ==================== 游戏状态 ====================

  /** 游戏是否正在运行 */
  const isGameRunning = ref(false)

  /** 游戏是否正在启动中 */
  const isGameLaunching = ref(false)

  /** GSI 服务是否正在运行 */
  const isGsiRunning = ref(false)

  /** 日志读取是否正在运行 */
  const isLogReading = ref(false)

  /** 用户连接服务器状态 */
  const userConnectionStatus = ref<UserConnectionStatus>('idle')

  // ==================== 游戏实时信息 ====================

  /** 当前游戏服务器信息 */
  const gameServerInfo = ref<Api.Game.ServerInfoData>({
    id: 0, round: '', CTScore: '', TScore: '', mapStage: '', mapPhase: ''
  })

  /** 当前玩家游戏内信息 */
  const gamePlayerInfo = ref<Api.Game.CsgoPlayer>({
    team: '', playStatus: '', health: 0, armor: 0, money: 0, equipValue: 0,
    weapon: '', clipAmmo: 0, reserveAmmo: 0, helmet: false, kills: 0, score: 0
  })

  /** GSI 数据发送定时器状态 */
  const gisSendState: GisDataSendTimerState = {
    lastSentAt: 0, sendTimer: null, pendingData: null, pendingServerData: null
  }

  /** GSI 数据发送最小间隔（1秒） */
  const GIS_SEND_MIN_INTERVAL = 1000

  // ==================== 工具函数 ====================

  /** 安全日志输出 */
  function safeLog(message: string, ...args: unknown[]): void {
    try {
      console.log(message, ...args)
    } catch {
      console.log(message, '[日志打印失败，原始数据:]', args)
    }
  }

  // ==================== 循环依赖解决 ====================
  // 通过 getter 函数在调用时才解析真实实现，避免循环依赖
  // 所有 composable 通过 fnGetters 延迟获取彼此的函数

  const fnGetters = {
    ensureGameStartReady: (): Promise<boolean> => Promise.resolve(false),
    connectServerUsingSteamUrl: (): Promise<void> => Promise.resolve(),
    stopAutomaticJoinServer: (): Promise<void> => Promise.resolve(),
    startAutomaticJoinServer: (): Promise<void> => Promise.resolve(),
    listenToGsiData: (): void => { },
    removeGsiDataListener: (): void => { },
    resetRetryFlag: (): void => { },
    connectToServerById: (serverId: number): void => { },
  }

  // ==================== 组合各 Composable ====================

  // 1. 存储相关 - 已统一迁至 appStore 管理（loadSettingsFromStorage / applyCommunityOrder / saveCommunityOrder 等）

  // 2. 自动挤服 - 通过 getter 延迟引用 game status 的函数
  /**
   * 通过 WebSocket 上报玩家操作动态（对应 Java CODE_PLAYER_ACTION → type=112）
   * @param actionContent 动态内容（如：开始挤服 / 暂停挤服 / 加入服务器）
   * @param serverIdOverwrite 可选：强制指定服务器ID（不传则使用 joinServerInfo.serverId）
   */
  function reportPlayerAction(actionContent: string, serverIdOverwrite?: number | string) {
    const serverId = serverIdOverwrite != null
      ? String(serverIdOverwrite)
      : (joinServerInfo.value?.serverId != null ? String(joinServerInfo.value.serverId) : '')
    if (!serverId) {
      return;
    }
    if (!actionContent || !actionContent.trim()) {
      return;
    }
    sendPlayerAction(serverId, actionContent)
  }

  const autoJoin = useAutoJoin({
    joinServerInfo,
    automaticJoinConfig,
    isAutomatic,
    isAutomaticRetry,
    automaticCount,
    safeLog,
    ensureGameStartReady: () => fnGetters.ensureGameStartReady(),
    connectServerUsingSteamUrl: () => fnGetters.connectServerUsingSteamUrl(),
    resetRetryFlag: () => fnGetters.resetRetryFlag(),
    reportPlayerAction: (actionContent) => reportPlayerAction(actionContent),
  })

  // 3. 日志读取 - 通过 getter 延迟引用 autoJoin 的函数
  const logReader = useLogReader({
    csgo2Path,
    isLogReading,
    userConnectionStatus,
    isAutomatic,
    automaticJoinConfig,
    safeLog,
    startAutomaticJoinServer: () => fnGetters.startAutomaticJoinServer(),
  })

  // 4. GSI 监听 - 通过 getter 延迟引用 autoJoin 的函数
  /** 立即执行 WebSocket 发送（同时发送玩家和服务器数据） */
  function flushGisSend(): void {
    gisSendState.lastSentAt = Date.now()
    if (gisSendState.sendTimer) {
      clearTimeout(gisSendState.sendTimer)
      gisSendState.sendTimer = null
    }
    if (gisSendState.pendingData) {
      sendPlayerGameData(gisSendState.pendingData)
      gisSendState.pendingData = null
    }
    if (gisSendState.pendingServerData) {
      sendServerGameData(gisSendState.pendingServerData)
      gisSendState.pendingServerData = null
    }
  }

  /** 调度 GSI 数据发送：最快 1s 推送一次 */
  function scheduleGisSend(): void {
    if (gisSendState.sendTimer) return
    const elapsed = Date.now() - gisSendState.lastSentAt
    const remain = GIS_SEND_MIN_INTERVAL - elapsed
    if (remain <= 0) {
      flushGisSend()
    } else {
      gisSendState.sendTimer = setTimeout(flushGisSend, remain)
    }
  }

  /** 通过 WebSocket 发送玩家数据（code 110），最快 3s 一次 */
  function sendPlayerData(player: Api.Game.CsgoPlayer): void {
    gisSendState.pendingData = { ...player }
    scheduleGisSend()
  }

  /** 通过 WebSocket 发送服务器数据（code 111），最快 3s 一次 */
  function sendServerData(server: Api.Game.ServerInfoData): void {
    gisSendState.pendingServerData = { ...server }
    scheduleGisSend()
  }

  const gsiListener = useGsiListener({
    isGsiRunning,
    gameServerInfo,
    gamePlayerInfo,
    joinServerInfo,
    isAutomatic,
    isJoinServerTrayVisible,
    safeLog,
    stopAutomaticJoinServer: () => fnGetters.stopAutomaticJoinServer(),
    sendPlayerData,
    sendServerData,
    shouldSuppressQuitReport: isQuitReportSuppressed,
  })

  // 5. 游戏状态检查与启动
  const gameStatus = useGameStatus({
    isGameRunning,
    isGameLaunching,
    isGsiRunning,
    isLogReading,
    csgo2Path,
    steamPath,
    gamePlatform: GamePlatform,
    selectedStartItems,
    joinServerInfo,
    safeLog,
    listenToGsiData: () => fnGetters.listenToGsiData(),
    removeGsiDataListener: () => fnGetters.removeGsiDataListener(),
    startLogReading: logReader.startLogReading,
    stopLogReading: logReader.stopLogReading,
    stopAutomaticJoinServer: () => fnGetters.stopAutomaticJoinServer(),
    connectServerUsingSteamUrl: () => fnGetters.connectServerUsingSteamUrl(),
    connectToServerById: (id: number) => fnGetters.connectToServerById(id),
    markJoinRequested,
  })

  // 6. 服务器查询
  const serverQuery = useServerQuery({
    communityList,
    serverDataList,
    mapList,
    currentServerList,
    currentServerWsList,
    currentGisServerList,
    selectedCommunityId,
    joinServerInfo,
    loadSettingsFromStorage: appStore.loadSettingsFromStorage,
    applyCommunityOrder: appStore.applyCommunityOrder,
    saveCommunityOrder: appStore.saveCommunityOrder,
  })

  // 7. 玩家动作管理
  const playerAction = usePlayerAction({
    serverDataList,
  })

  // ==================== 绑定真实实现到 getter ====================
  fnGetters.ensureGameStartReady = gameStatus.ensureGameStartReady
  fnGetters.connectServerUsingSteamUrl = gameStatus.connectServerUsingSteamUrl
  fnGetters.stopAutomaticJoinServer = autoJoin.stopAutomaticJoinServer
  fnGetters.startAutomaticJoinServer = autoJoin.startAutomaticJoinServer
  fnGetters.listenToGsiData = gsiListener.listenToGsiData
  fnGetters.removeGsiDataListener = gsiListener.removeGsiDataListener
  fnGetters.resetRetryFlag = logReader.resetRetryFlag
  fnGetters.connectToServerById = playerAction.connectToServerById

  // ==================== WebSocket ====================

  /** 初始化服务器 WebSocket 连接 */
  async function initServerWebsocket(): Promise<void> {
    ServerWebsocket.init()
  }

  /** 关闭服务器 WebSocket 连接 */
  function closeServerWebsocket(): void {
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.close()
    }
  }

  // ==================== 导出 ====================

  return {
    // ---- 列表数据 ----
    /** 社区列表 */
    communityList,
    /** 源服务器数据列表 */
    serverDataList,
    /** 地图列表 */
    mapList,
    /** 当前展示的服务器列表 */
    currentServerList,
    /** WebSocket 推送的服务器列表 */
    currentServerWsList,
    /** GSI 服务端返回的服务器信息列表 */
    currentGisServerList,
    /** WebSocket 推送的服务器游戏实时数据（服务器信息+玩家数据映射） */
    serverGameDataMap,

    // ---- 服务器相关 ----
    /** 正在刷新的服务器地址列表 */
    refreshingServerAddrs,
    /** 当前选中的待加入服务器信息 */
    joinServerInfo,

    // ---- 自动挤服状态 ----
    /** 是否正在自动挤服 */
    isAutomatic,
    /** 挤服托盘是否可见 */
    isJoinServerTrayVisible,
    /** 自动挤服计数 */
    automaticCount,

    // ---- 游戏状态 ----
    /** 游戏是否正在运行 */
    isGameRunning,
    /** 游戏是否正在启动中 */
    isGameLaunching,
    /** GSI 服务是否正在运行 */
    isGsiRunning,
    /** 日志读取是否正在运行 */
    isLogReading,
    /** 用户连接服务器状态 */
    userConnectionStatus,

    // ---- 游戏实时信息 ----
    /** 当前游戏服务器信息 */
    gameServerInfo,
    /** 当前玩家游戏内信息 */
    gamePlayerInfo,

    // ---- 方法 - 游戏状态 ----
    /** 检查游戏运行状态 */
    checkGameRunning: gameStatus.checkGameRunning,
    /** 开始定期检查游戏状态 */
    startGameRunningCheck: gameStatus.startGameRunningCheck,
    /** 停止定期检查游戏状态 */
    stopGameRunningCheck: gameStatus.stopGameRunningCheck,
    /** 启动游戏 */
    startGame: gameStatus.startGame,
    /** 检查游戏启动前的准备工作 */
    ensureGameStartReady: gameStatus.ensureGameStartReady,

    // ---- 方法 - 服务器查询 ----
    /** 初始化服务器列表 */
    initServerList: serverQuery.initServerList,
    /** 查询服务器列表信息（源服务器） */
    queryServerInfosResponse: serverQuery.queryServerInfosResponse,
    /** 查询单个服务器信息 */
    queryServerSeverVo: serverQuery.queryServerSeverVo,
    /** 统计各社区服务器数量 */
    countServerServerNumber: serverQuery.countServerServerNumber,
    /** 更新社区列表排序 */
    updateCommunityList: serverQuery.updateCommunityList,
    /** 查询 WebSocket 服务器列表信息 */
    queryWsServerInfosResponse: serverQuery.queryWsServerInfosResponse,

    // ---- 方法 - GSI ----
    /** 开始监听 GSI 数据 */
    listenToGsiData: gsiListener.listenToGsiData,
    /** 移除 GSI 数据监听 */
    removeGsiDataListener: gsiListener.removeGsiDataListener,

    // ---- 方法 - 日志 ----
    /** 开始日志读取 */
    startLogReading: logReader.startLogReading,
    /** 停止日志读取 */
    stopLogReading: logReader.stopLogReading,

    // ---- 方法 - 自动挤服 ----
    /** 开始自动挤服 */
    startAutomaticJoinServer: autoJoin.startAutomaticJoinServer,
    /** 暂停自动挤服 */
    pauseAutomaticJoinServer: autoJoin.pauseAutomaticJoinServer,
    /** 停止自动挤服 */
    stopAutomaticJoinServer: autoJoin.stopAutomaticJoinServer,
    /** 使用 Steam URL 连接服务器 */
    connectServerUsingSteamUrl: gameStatus.connectServerUsingSteamUrl,

    // ---- 方法 - 玩家动作 ----
    /** 根据服务器ID连接服务器（通过WebSocket） */
    connectToServerById: playerAction.connectToServerById,
    /** 上报玩家操作动态（type=102 → CODE_PLAYER_ACTION） */
    reportPlayerAction,

    // ---- 方法 - WebSocket ----
    /** 初始化服务器 WebSocket 连接 */
    initServerWebsocket,
    /** 关闭服务器 WebSocket 连接 */
    closeServerWebsocket,
  }
})
