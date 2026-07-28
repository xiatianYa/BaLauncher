import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { SetupStoreId } from '@/enum'
import { UserConnectionStatus, GisDataSendTimerState } from '@/constants/cs2'
import type { GamePlatform } from '@/constants/app'
import ServerWebsocket from '@/utils/ws/server'
import GisWebsocket from '@/utils/ws/gis'
import { useGameStorage } from './useGameStorage'
import { useServerQuery } from './useServerQuery'
import { useGsiListener } from './useGsiListener'
import { useLogReader } from './useLogReader'
import { useGameStatus } from './useGameStatus'
import { useAutoJoin } from './useAutoJoin'

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
 */
export const useGameStore = defineStore(SetupStoreId.Game, () => {
  // ==================== 状态定义 ====================

  /** 防止 connection_failed 重复触发重试的标志 */
  let hasRetriedForThisConnection = false

  // 列表数据
  const communityList = reactive<Api.Game.Community[]>([])
  const serverDataList = reactive<Api.Game.Server[]>([])
  const mapList = reactive<Api.Game.Map[]>([])
  const currentServerList = reactive<Api.Game.SeverVo[]>([])
  const currentServerWsList = reactive<Api.Game.SeverVo[]>([])
  const currentGisServerList = reactive<Api.Game.ServerInfoData[]>([])
  const currentGisPlayerList = reactive<Api.Game.CsgoPlayer[]>([])
  const currentAutomaticPlayerList = reactive<Api.Game.AutomationPlayer[]>([])
  const currentAutomaticPlayerDynamicList = reactive<string[]>([])

  // 用户设置
  const applyKeyBindItems = ref<Api.Game.ApplyKeyBindItem[]>([])
  const selectedStartItems = ref<string[]>([])
  const selectedCommunityId = ref<number | null>(null)

  // 服务器相关
  const refreshingServerAddrs = ref<string[]>([])
  const joinServerInfo = ref<Api.Game.SeverVo>()

  // 自动挤服状态
  const isAutomatic = ref(false)
  const isJoinServerTrayVisible = ref(false)
  const isAutomaticRetry = ref(false)
  const automaticCount = ref(0)
  const automaticJoinConfig = ref<Api.Game.AutomaticJoinConfig>({
    joinServerPersonValue: 63,
    joinServerCountValue: 2,
    joinServerAutoRetryValue: true,
    pushGisValue: true,
    joinServerDelayValue: 0
  })
  const automaticInfo = ref<Api.Game.ServerVo>({
    connectStr: '',
    mapLabel: '',
    mapName: '',
    mapUrl: '',
    maxPlayers: 0,
    numPlayers: 0,
    serverName: '',
    type: '',
    tag: [],
    minPlayers: 0
  })

  // 游戏状态
  const isGameRunning = ref(false)
  const isGameLaunching = ref(false)
  const isGsiRunning = ref(false)
  const isLogReading = ref(false)
  const userConnectionStatus = ref<UserConnectionStatus>('idle')
  const isFullscreen = ref(false)
  const serverViewModule = ref<UnionKey.ServerLayoutModule>('cardModel')

  // 平台与路径
  const GamePlatform = ref<GamePlatform>('international')
  const csgo2Path = ref('')
  const steamPath = ref('')

  // 游戏信息
  const gameServerInfo = ref<Api.Game.ServerInfoData>({
    addr: '', round: '', CTScore: '', TScore: '', mapStage: '', mapPhase: ''
  })
  const gamePlayerInfo = ref<Api.Game.CsgoPlayer>({
    addr: '', team: '', health: 0, armor: 0, money: 0, equipValue: 0,
    weapon: '', clipAmmo: 0, reserveAmmo: 0, helmet: false, kills: 0, score: 0
  })

  // GIS发送状态
  const gisSendState: GisDataSendTimerState = {
    lastSentAt: 0, sendTimer: null, pendingData: null
  }

  // ==================== 工具函数 ====================

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

  // ==================== 绑定真实实现到 getter ====================
  fnGetters.ensureGameStartReady = gameStatus.ensureGameStartReady
  fnGetters.connectServerUsingSteamUrl = gameStatus.connectServerUsingSteamUrl
  fnGetters.stopAutomaticJoinServer = autoJoin.stopAutomaticJoinServer
  fnGetters.startAutomaticJoinServer = autoJoin.startAutomaticJoinServer
  fnGetters.listenToGsiData = gsiListener.listenToGsiData
  fnGetters.removeGsiDataListener = gsiListener.removeGsiDataListener
  fnGetters.resetRetryFlag = logReader.resetRetryFlag

  // ==================== WebSocket ====================

  async function initServerWebsocket(): Promise<void> {
    ServerWebsocket.init()
  }

  function closeGisWebsocket(): void {
    if (GisWebsocket.GisWebsocket) {
      GisWebsocket.close()
    }
  }

  async function initGisWebsocket(): Promise<void> {
    GisWebsocket.init()
  }

  function closeServerWebsocket(): void {
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.close()
    }
  }

  // ==================== 导出 ====================

  return {
    // 状态
    automaticInfo,
    automaticCount,
    isAutomatic,
    communityList,
    serverDataList,
    mapList,
    currentServerList,
    selectedCommunityId,
    isGameRunning,
    GamePlatform,
    csgo2Path,
    steamPath,
    refreshingServerAddrs,
    joinServerInfo,
    isGameLaunching,
    automaticJoinConfig,
    currentServerWsList,
    gameServerInfo,
    gamePlayerInfo,
    currentGisServerList,
    currentGisPlayerList,
    currentAutomaticPlayerList,
    currentAutomaticPlayerDynamicList,
    isJoinServerTrayVisible,
    isLogReading,
    userConnectionStatus,
    isFullscreen,
    serverViewModule,

    // 方法 - 存储
    setGamePlatform: storage.setGamePlatform,
    setCsgo2Path: storage.setCsgo2Path,
    setSteamPath: storage.setSteamPath,
    toggleFullscreen: storage.toggleFullscreen,
    toggleServerViewModule: storage.toggleServerViewModule,
    setSelectedCommunityId: storage.setSelectedCommunityId,
    setJoinServerPersonValue: storage.setJoinServerPersonValue,
    setJoinServerCountValue: storage.setJoinServerCountValue,
    setJoinServerAutoRetryValue: storage.setJoinServerAutoRetryValue,
    setPushGisValue: storage.setPushGisValue,
    setJoinServerDelayValue: storage.setJoinServerDelayValue,
    setApplyKeyBindItems: storage.setApplyKeyBindItems,
    setSelectedStartItems: storage.setSelectedStartItems,
    toggleStartItem: storage.toggleStartItem,
    applyKeyBindItems,
    selectedStartItems,

    // 方法 - 游戏状态
    checkGameRunning: gameStatus.checkGameRunning,
    startGameRunningCheck: gameStatus.startGameRunningCheck,
    stopGameRunningCheck: gameStatus.stopGameRunningCheck,
    startGame: gameStatus.startGame,
    ensureGameStartReady: gameStatus.ensureGameStartReady,

    // 方法 - 服务器查询
    initServerList: serverQuery.initServerList,
    queryServerInfosResponse: serverQuery.queryServerInfosResponse,
    queryServerSeverVo: serverQuery.queryServerSeverVo,
    countServerServerNumber: serverQuery.countServerServerNumber,
    countServerPlayerNumber: serverQuery.countServerPlayerNumber,
    updateCommunityList: serverQuery.updateCommunityList,
    queryWsServerInfosResponse: serverQuery.queryWsServerInfosResponse,

    // 方法 - GSI
    listenToGsiData: gsiListener.listenToGsiData,
    removeGsiDataListener: gsiListener.removeGsiDataListener,

    // 方法 - 日志
    startLogReading: logReader.startLogReading,
    stopLogReading: logReader.stopLogReading,

    // 方法 - 自动挤服
    startAutomaticJoinServer: autoJoin.startAutomaticJoinServer,
    pauseAutomaticJoinServer: autoJoin.pauseAutomaticJoinServer,
    stopAutomaticJoinServer: autoJoin.stopAutomaticJoinServer,
    connectServerUsingSteamUrl: gameStatus.connectServerUsingSteamUrl,
    sendAutomaticDynamic,

    // 方法 - WebSocket
    initServerWebsocket,
    initGisWebsocket,
    closeServerWebsocket,
    closeGisWebsocket,
  }
})