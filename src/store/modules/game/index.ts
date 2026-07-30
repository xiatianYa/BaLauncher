import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { SetupStoreId } from '@/enum'
import { UserConnectionStatus, GisDataSendTimerState } from '@/constants/cs2'
import type { GamePlatform } from '@/constants/app'
import ServerWebsocket from '@/utils/ws/server'
import { useGameStorage } from './useGameStorage'
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
 * - useGameStorage: 本地存储读写
 * - useServerQuery: 服务器查询
 * - useGsiListener: GSI事件监听
 * - useLogReader: 日志解析
 * - useGameStatus: 游戏状态检查与启动
 * - useAutoJoin: 自动挤服
 * - usePlayerAction: 玩家动作管理
 */
export const useGameStore = defineStore(SetupStoreId.Game, () => {
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

  /** 当前 GSI 玩家列表 */
  const currentGisPlayerList = reactive<Api.Game.CsgoPlayer[]>([])

  /** 自动挤服玩家列表 */
  const currentAutomaticPlayerList = reactive<Api.Game.AutomationPlayer[]>([])

  /** 自动挤服动态消息列表 */
  const currentAutomaticPlayerDynamicList = reactive<string[]>([])

  // ==================== 用户设置 ====================

  /** 按键绑定配置项 */
  const applyKeyBindItems = ref<Api.Game.ApplyKeyBindItem[]>([])

  /** 游戏启动项列表 */
  const selectedStartItems = ref<string[]>([])

  /** 当前选中的社区ID */
  const selectedCommunityId = ref<number | null>(null)

  // ==================== 服务器相关 ====================

  /** 正在刷新的服务器地址列表 */
  const refreshingServerAddrs = ref<string[]>([])

  /** 当前选中的待加入服务器信息 */
  const joinServerInfo = ref<Api.Game.SeverVo>()

  // ==================== 自动挤服状态 ====================

  /** 是否正在自动挤服 */
  const isAutomatic = ref(false)

  /** 挤服托盘是否可见 */
  const isJoinServerTrayVisible = ref(false)

  /** 是否处于自动重试状态 */
  const isAutomaticRetry = ref(false)

  /** 自动挤服计数 */
  const automaticCount = ref(0)

  /** 自动挤服配置 */
  const automaticJoinConfig = ref<Api.Game.AutomaticJoinConfig>({
    joinServerPersonValue: 63,
    joinServerCountValue: 2,
    joinServerAutoRetryValue: true,
    pushGisValue: true,
    joinServerDelayValue: 0
  })

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

  /** 是否全屏显示服务器列表 */
  const isFullscreen = ref(false)

  /** 服务器列表视图模式（卡片/表格） */
  const serverViewModule = ref<UnionKey.ServerLayoutModule>('cardModel')

  // ==================== 平台与路径 ====================

  /** 游戏平台（国际服/完美服） */
  const GamePlatform = ref<GamePlatform>('international')

  /** CS2 游戏路径 */
  const csgo2Path = ref('')

  /** Steam 安装路径 */
  const steamPath = ref('')

  // ==================== 游戏实时信息 ====================

  /** 当前游戏服务器信息 */
  const gameServerInfo = ref<Api.Game.ServerInfoData>({
    round: '', CTScore: '', TScore: '', mapStage: '', mapPhase: ''
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

  /** GSI 数据发送最小间隔（3秒） */
  const GIS_SEND_MIN_INTERVAL = 3000

  // ==================== 工具函数 ====================

  /** 安全日志输出 */
  function safeLog(message: string, ...args: unknown[]): void {
    try {
      console.log(message, ...args)
    } catch {
      console.log(message, '[日志打印失败，原始数据:]', args)
    }
  }

  /** 发送自动挤服动态消息 */
  function sendAutomaticDynamic(text: string): void {
    currentAutomaticPlayerDynamicList.push(text)
  }

  // ==================== 循环依赖解决 ====================
  // 通过 getter 函数在调用时才解析真实实现，避免循环依赖
  // 所有 composable 通过 fnGetters 延迟获取彼此的函数

  const fnGetters = {
    ensureGameStartReady: (): Promise<boolean> => Promise.resolve(false),
    connectServerUsingSteamUrl: (): Promise<void> => Promise.resolve(),
    stopAutomaticJoinServer: (): Promise<void> => Promise.resolve(),
    startAutomaticJoinServer: (): Promise<void> => Promise.resolve(),
    listenToGsiData: (): void => {},
    removeGsiDataListener: (): void => {},
    resetRetryFlag: (): void => {},
    connectToServerById: (serverId: number): void => {},
  }

  // ==================== 组合各 Composable ====================

  // 1. 存储相关
  const storage = useGameStorage({
    gamePlatform: GamePlatform,
    csgo2Path,
    steamPath,
    automaticJoinConfig,
    applyKeyBindItems,
    selectedStartItems,
    isFullscreen,
    serverViewModule,
    selectedCommunityId,
  })

  // 2. 自动挤服 - 通过 getter 延迟引用 game status 的函数
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
      ServerWebsocket.send('110', JSON.stringify(gisSendState.pendingData))
      gisSendState.pendingData = null
    }
    if (gisSendState.pendingServerData) {
      ServerWebsocket.send('111', JSON.stringify(gisSendState.pendingServerData))
      gisSendState.pendingServerData = null
    }
  }

  /** 调度 GSI 数据发送：最快 3s 推送一次 */
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
    currentAutomaticPlayerDynamicList,
    currentGisPlayerList,
    safeLog,
    stopAutomaticJoinServer: () => fnGetters.stopAutomaticJoinServer(),
    sendPlayerData,
    sendServerData,
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
    currentGisPlayerList,
    safeLog,
    listenToGsiData: () => fnGetters.listenToGsiData(),
    removeGsiDataListener: () => fnGetters.removeGsiDataListener(),
    startLogReading: logReader.startLogReading,
    stopLogReading: logReader.stopLogReading,
    stopAutomaticJoinServer: () => fnGetters.stopAutomaticJoinServer(),
    connectServerUsingSteamUrl: () => fnGetters.connectServerUsingSteamUrl(),
    connectToServerById: (id: number) => fnGetters.connectToServerById(id),
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
    loadSettingsFromStorage: storage.loadSettingsFromStorage,
    applyCommunityOrder: storage.applyCommunityOrder,
    saveCommunityOrder: storage.saveCommunityOrder,
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
    /** 当前 GSI 玩家列表 */
    currentGisPlayerList,
    /** 自动挤服玩家列表 */
    currentAutomaticPlayerList,
    /** 自动挤服动态消息列表 */
    currentAutomaticPlayerDynamicList,

    // ---- 用户设置 ----
    /** 按键绑定配置项 */
    applyKeyBindItems,
    /** 游戏启动项列表 */
    selectedStartItems,
    /** 当前选中的社区ID */
    selectedCommunityId,

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
    /** 自动挤服配置 */
    automaticJoinConfig,

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
    /** 是否全屏显示服务器列表 */
    isFullscreen,
    /** 服务器列表视图模式 */
    serverViewModule,

    // ---- 平台与路径 ----
    /** 游戏平台 */
    GamePlatform,
    /** CS2 游戏路径 */
    csgo2Path,
    /** Steam 安装路径 */
    steamPath,

    // ---- 游戏实时信息 ----
    /** 当前游戏服务器信息 */
    gameServerInfo,
    /** 当前玩家游戏内信息 */
    gamePlayerInfo,

    // ---- 方法 - 存储 ----
    /** 设置游戏平台 */
    setGamePlatform: storage.setGamePlatform,
    /** 设置 CS2 路径 */
    setCsgo2Path: storage.setCsgo2Path,
    /** 设置 Steam 路径 */
    setSteamPath: storage.setSteamPath,
    /** 切换全屏模式 */
    toggleFullscreen: storage.toggleFullscreen,
    /** 切换服务器列表视图模式 */
    toggleServerViewModule: storage.toggleServerViewModule,
    /** 设置选中的社区ID */
    setSelectedCommunityId: storage.setSelectedCommunityId,
    /** 设置自动挤服人数阈值 */
    setJoinServerPersonValue: storage.setJoinServerPersonValue,
    /** 设置自动挤服线程数 */
    setJoinServerCountValue: storage.setJoinServerCountValue,
    /** 设置是否自动重试挤服 */
    setJoinServerAutoRetryValue: storage.setJoinServerAutoRetryValue,
    /** 设置是否推送 GIS 数据 */
    setPushGisValue: storage.setPushGisValue,
    /** 设置挤服延迟 */
    setJoinServerDelayValue: storage.setJoinServerDelayValue,
    /** 设置按键绑定配置 */
    setApplyKeyBindItems: storage.setApplyKeyBindItems,
    /** 设置游戏启动项 */
    setSelectedStartItems: storage.setSelectedStartItems,
    /** 切换单个启动项 */
    toggleStartItem: storage.toggleStartItem,

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
    /** 统计各社区玩家数量 */
    countServerPlayerNumber: serverQuery.countServerPlayerNumber,
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
    /** 发送自动挤服动态消息 */
    sendAutomaticDynamic,

    // ---- 方法 - 玩家动作 ----
    /** 根据服务器ID连接服务器（通过WebSocket） */
    connectToServerById: playerAction.connectToServerById,

    // ---- 方法 - WebSocket ----
    /** 初始化服务器 WebSocket 连接 */
    initServerWebsocket,
    /** 关闭服务器 WebSocket 连接 */
    closeServerWebsocket,
  }
})
