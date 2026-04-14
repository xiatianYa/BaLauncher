import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { SetupStoreId } from '@/enum'
import ServerWebsocket from '@/utils/ws/server'
import { fetchGetCommunityList } from '@/service/api'
import { fetchGetServerList } from '@/service/api'
import { fetchGetMapList } from '@/service/api'
import { fetchGetPieChart } from '@/service/api'
import { localStg } from '@/utils/storage'
import { GamePlatform } from '@/constants/app'
import GisWebsocket from '@/utils/ws/gis'
import { useAppStore } from '../app'
import { LOG_PATTERNS, UserConnectionStatus, GisDataSendTimerState } from '@/constants/cs2'
import { GAME_STORAGE_KEYS } from '@/constants/cache'

/** GIS数据发送间隔（毫秒） */
const GIS_SEND_INTERVAL = 5000
/** 游戏状态检查间隔（毫秒） */
const GAME_CHECK_INTERVAL = 10000

/**
 * 游戏状态管理 Store
 * 管理游戏相关状态、服务器列表、自动挤服、GSI数据等功能
 */
export const useGameStore = defineStore(SetupStoreId.Game, () => {
  // ==================== 定时器 ====================
  /** 游戏状态检查定时器 */
  let gameCheckTimer: ReturnType<typeof setInterval> | null = null
  /** 连接检测定时器 */
  let connectionCheckTimer: ReturnType<typeof setTimeout> | null = null
  /** 防止 connection_failed 重复触发重试的标志 */
  let hasRetriedForThisConnection = false

  // ==================== 列表数据 ====================
  /** 社区列表 */
  const communityList = reactive<Api.Game.Community[]>([])
  /** 自定义分类ID列表 */
  const customCommunityIds = reactive<number[]>([])
  /** 服务器列表 */
  const serverDataList = reactive<Api.Game.Server[]>([])
  /** 地图列表 */
  const mapList = reactive<Api.Game.Map[]>([])
  /** 当前服务器列表（源服务器查询结果） */
  const currentServerList = reactive<Api.Game.InfoResponse[]>([])
  /** 当前服务器列表（WebSocket推送） */
  const currentServerWsList = reactive<Api.Game.InfoResponse[]>([])
  /** GIS服务器信息列表 */
  const currentGisServerList = reactive<Api.Game.ServerInfoData[]>([])
  /** GIS玩家信息列表 */
  const currentGisPlayerList = reactive<Api.Game.CsgoPlayer[]>([])
  /** 自动挤服玩家列表 */
  const currentAutomaticPlayerList = reactive<Api.Game.AutomationPlayer[]>([])
  /** 自动挤服动态消息列表 */
  const currentAutomaticPlayerDynamicList = reactive<string[]>([])

  // ==================== 用户设置 ====================
  /** 已应用的按键绑定项 */
  const applyKeyBindItems = ref<Api.Game.ApplyKeyBindItem[]>([])
  /** 已勾选的启动项 */
  const selectedStartItems = ref<string[]>([])
  /** 当前选择的社区ID */
  const selectedCommunityId = ref<number | null>(null)

  // ==================== 服务器相关 ====================
  /** 正在刷新的服务器地址列表 */
  const refreshingServerAddrs = ref<string[]>([])
  /** 要加入的服务器信息 */
  const joinServerInfo = ref<Api.Game.InfoResponse>()

  // ==================== 自动挤服状态 ====================
  /** 是否正在自动挤服 */
  const isAutomatic = ref(false)
  /** 挤服托盘是否可见 */
  const isJoinServerTrayVisible = ref(false)
  /** 是否自动重试（用户是否切换到目标地图） */
  const isAutomaticRetry = ref(false)
  /** 自动挤服尝试次数 */
  const automaticCount = ref(0)
  /** 自动挤服配置 */
  const automaticJoinConfig = ref<Api.Game.AutomaticJoinConfig>({
    joinServerPersonValue: 63,
    joinServerCountValue: 2,
    joinServerAutoRetryValue: true,
    pushGisValue: true,
    joinServerDelayValue: 0
  })
  /** 自动挤服信息 */
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

  // ==================== 游戏状态 ====================
  /** 游戏是否运行中 */
  const isGameRunning = ref(false)
  /** 游戏是否正在启动 */
  const isGameLaunching = ref(false)
  /** GSI服务是否运行中 */
  const isGsiRunning = ref(false)
  /** 日志监听是否运行中 */
  const isLogReading = ref(false)
  /** 用户连接状态 */
  const userConnectionStatus = ref<UserConnectionStatus>('idle')
  /** 是否全屏 */
  const isFullscreen = ref(false)
  /** 服务器视图模式 */
  const serverViewModule = ref<UnionKey.ServerLayoutModule>('cardModel')

  // ==================== 平台与路径 ====================
  /** 游戏平台（international/perfect） */
  const GamePlatform = ref<GamePlatform>('international')
  /** CS2安装路径 */
  const csgo2Path = ref('')
  /** Steam安装路径 */
  const steamPath = ref('')

  // ==================== 游戏信息 ====================
  /** 当前服务器游戏信息 */
  const gameServerInfo = ref<Api.Game.ServerInfoData>({
    addr: '',
    round: '',
    CTScore: '',
    TScore: '',
    mapStage: '',
    mapPhase: ''
  })
  
  /** 当前玩家游戏信息 */
  const gamePlayerInfo = ref<Api.Game.CsgoPlayer>({
    addr: '',
    team: '',
    health: 0,
    armor: 0,
    money: 0,
    equipValue: 0,
    weapon: '',
    clipAmmo: 0,
    reserveAmmo: 0,
    helmet: false,
    kills: 0,
    score: 0
  })

  // ==================== GIS发送状态 ====================
  /** GIS数据发送状态 */
  const gisSendState: GisDataSendTimerState = {
    lastSentAt: 0,
    sendTimer: null,
    pendingData: null
  }

  // ==================== 工具函数 ====================

  /**
   * 安全打印日志
   * 防止日志打印失败导致程序崩溃
   */
  function safeLog(message: string, ...args: unknown[]): void {
    try {
      console.log(message, ...args)
    } catch {
      console.log(message, '[日志打印失败，原始数据:]', args)
    }
  }

  // ==================== 存储相关 ====================

  /** 从本地存储加载设置 */
  function loadSettingsFromStorage(): void {
    const savedPlatform = localStg.get(GAME_STORAGE_KEYS.GAME_PLATFORM)
    const savedCsgo2Path = localStg.get(GAME_STORAGE_KEYS.CSGO2_PATH)
    const savedSteamPath = localStg.get(GAME_STORAGE_KEYS.STEAM_PATH)
    const savedAutomaticJoinConfig = localStg.get(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG)
    const savedApplyKeyBindItems = localStg.get(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS)
    const savedSelectedStartItems = localStg.get(GAME_STORAGE_KEYS.SELECTED_START_ITEMS)
    const savedIsFullscreen = localStg.get(GAME_STORAGE_KEYS.IS_FULLSCREEN)
    const savedServerViewModule = localStg.get(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE)
    const savedSelectedCommunityId = localStg.get(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID)

    if (savedPlatform) GamePlatform.value = savedPlatform as 'international' | 'perfect'
    if (savedCsgo2Path) csgo2Path.value = savedCsgo2Path
    if (savedSteamPath) steamPath.value = savedSteamPath
    if (savedAutomaticJoinConfig) {
      automaticJoinConfig.value = {
        ...automaticJoinConfig.value,
        ...savedAutomaticJoinConfig
      }
    }
    if (savedApplyKeyBindItems) applyKeyBindItems.value = savedApplyKeyBindItems
    if (savedSelectedStartItems) selectedStartItems.value = savedSelectedStartItems
    if (savedIsFullscreen !== null) isFullscreen.value = savedIsFullscreen
    if (savedServerViewModule) serverViewModule.value = savedServerViewModule
    if (savedSelectedCommunityId !== null) selectedCommunityId.value = savedSelectedCommunityId
  }

  /** 应用社区排序 */
  function applyCommunityOrder(communities: Api.Game.Community[]): Api.Game.Community[] {
    const savedOrder = localStg.get(GAME_STORAGE_KEYS.COMMUNITY_ORDER) as number[] | null
    if (!savedOrder || savedOrder.length === 0) {
      return communities
    }

    const idToCommunity = new Map(communities.map(c => [c.id, c]))
    const sorted: Api.Game.Community[] = []

    for (const id of savedOrder) {
      const community = idToCommunity.get(id)
      if (community) {
        sorted.push(community)
        idToCommunity.delete(id)
      }
    }

    sorted.push(...idToCommunity.values())

    return sorted
  }

  /** 保存社区排序 */
  function saveCommunityOrder(): void {
    const order = communityList.map(c => c.id)
    localStg.set(GAME_STORAGE_KEYS.COMMUNITY_ORDER, order)
  }

  /** 加载自定义分类ID */
  function loadCustomCommunityIds(): void {
    const saved = localStg.get(GAME_STORAGE_KEYS.CUSTOM_COMMUNITY_IDS) as number[] | null
    if (saved) {
      customCommunityIds.splice(0, customCommunityIds.length, ...saved)
    }
  }

  /** 保存自定义分类ID */
  function saveCustomCommunityIds(): void {
    localStg.set(GAME_STORAGE_KEYS.CUSTOM_COMMUNITY_IDS, [...customCommunityIds])
  }

  /** 加载自定义分类 */
  function loadCustomCommunities(): void {
    const saved = localStg.get(GAME_STORAGE_KEYS.CUSTOM_COMMUNITIES) as Api.Game.Community[] | null
    if (saved) {
      saved.forEach(community => {
        if (!communityList.find(c => c.id === community.id)) {
          communityList.push(community)
        }
      })
    }
  }

  /** 保存自定义分类 */
  function saveCustomCommunities(): void {
    const customCommunities = communityList.filter(c => customCommunityIds.includes(c.id))
    localStg.set(GAME_STORAGE_KEYS.CUSTOM_COMMUNITIES, [...customCommunities])
  }

  /** 加载自定义服务器 */
  function loadCustomServers(): void {
    const saved = localStg.get(GAME_STORAGE_KEYS.CUSTOM_SERVERS) as Api.Game.Server[] | null
    if (saved) {
      saved.forEach(server => {
        if (!serverDataList.find(s => s.connectStr === server.connectStr && s.communityId === server.communityId)) {
          serverDataList.push(server)
        }
      })
    }
  }

  /** 保存自定义服务器 */
  function saveCustomServers(): void {
    const customServers = serverDataList.filter(server => customCommunityIds.includes(server.communityId || 0))
    localStg.set(GAME_STORAGE_KEYS.CUSTOM_SERVERS, [...customServers])
  }

  /** 添加自定义分类 */
  function addCustomCategory(name: string): Api.Game.Community {
    const category: Api.Game.Community = {
      id: Number(Date.now().toString() + Math.floor(Math.random() * 10000).toString().padStart(4, '0')),
      createBy: '',
      createTime: '',
      updateBy: '',
      updateTime: '',
      status: 1,
      communityName: name,
      logo: '',
      website: '',
      serverNumber: 0,
      playerNumber: 0
    }
    communityList.push(category)
    customCommunityIds.push(category.id)
    saveCustomCommunityIds()
    saveCustomCommunities()
    saveCommunityOrder()
    return category
  }

  /** 编辑自定义分类 */
  function editCustomCategory(categoryId: number, name: string): void {
    const category = communityList.find(c => c.id === categoryId)
    if (category) {
      category.communityName = name
      saveCustomCommunities()
    }
  }

  /** 删除自定义分类 */
  function removeCustomCategory(categoryId: number): void {
    const categoryIndex = communityList.findIndex(c => c.id === categoryId)
    if (categoryIndex !== -1) {
      communityList.splice(categoryIndex, 1)
    }
    const idIndex = customCommunityIds.indexOf(categoryId)
    if (idIndex !== -1) {
      customCommunityIds.splice(idIndex, 1)
    }
    const serversToRemove = serverDataList.filter(s => s.communityId === categoryId)
    serversToRemove.forEach(server => {
      const serverIndex = serverDataList.indexOf(server)
      if (serverIndex !== -1) {
        serverDataList.splice(serverIndex, 1)
      }
    })
    if (selectedCommunityId.value === categoryId) {
      selectedCommunityId.value = null
    }
    saveCustomCommunityIds()
    saveCustomCommunities()
    saveCustomServers()
    saveCommunityOrder()
  }

  /** 添加服务器到自定义分类 */
  function addServerToCategory(categoryId: number, server: Api.Game.Server): void {
    serverDataList.push(server)
    const category = communityList.find(c => c.id === categoryId)
    if (category) {
      category.serverNumber = serverDataList.filter(s => s.communityId === categoryId).length
    }
    saveCustomServers()
  }

  /** 删除自定义服务器 */
  function removeCustomServer(addr: string, communityId?: number): void {
    const id = communityId || selectedCommunityId.value || 0
    const index = serverDataList.findIndex(s => {
      if (s.communityId !== id) return false
      if (s.connectStr === addr) return true
      if (s.ip && s.port) {
        const serverAddr = `${s.ip}:${s.port}`
        if (serverAddr === addr) return true
      }
      return false
    })
    if (index !== -1) {
      const categoryId = id
      serverDataList.splice(index, 1)
      const category = communityList.find(c => c.id === categoryId)
      if (category) {
        category.serverNumber = serverDataList.filter(s => s.communityId === categoryId).length
      }
      saveCustomServers()
    }
  }

  /** 判断是否是自定义分类 */
  function isCustomCategory(communityId: number): boolean {
    return customCommunityIds.includes(communityId)
  }

  /** 获取自定义分类的服务器列表 */
  function getCustomCategoryServers(categoryId: number): Api.Game.InfoResponse[] {
    const servers = serverDataList.filter(s => s.communityId === categoryId)
    return servers.map(s => ({
      protocol: 0,
      name: s.serverName || '',
      map: '',
      folder: '',
      game: '',
      appId: 730,
      players: 0,
      maxPlayers: 0,
      bots: 0,
      serverType: 'd',
      environment: 'l',
      visibility: 0,
      vac: 0,
      version: '1.0.0.0',
      addr: s.ip && s.port ? `${s.ip}:${s.port}` : s.connectStr || '',
      isOnline: false,
      round: '',
      CTScore: '0',
      TScore: '0',
      mapStage: '',
      mapPhase: '',
      csgoPlayer: []
    }))
  }

  /** 保存设置到本地存储 */
  function saveSettingsToStorage(): void {
    localStg.set(GAME_STORAGE_KEYS.GAME_PLATFORM, GamePlatform.value)
    localStg.set(GAME_STORAGE_KEYS.CSGO2_PATH, csgo2Path.value)
    localStg.set(GAME_STORAGE_KEYS.STEAM_PATH, steamPath.value)
    localStg.set(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG, automaticJoinConfig.value)
    localStg.set(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, applyKeyBindItems.value)
  }

  /** 设置已应用的按键绑定项 */
  function setApplyKeyBindItems(items: Api.Game.ApplyKeyBindItem[]): void {
    applyKeyBindItems.value = items
    localStg.set(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, items)
  }

  /** 设置已勾选的启动项 */
  function setSelectedStartItems(items: string[]): void {
    selectedStartItems.value = items
    localStg.set(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, items)
  }

  /** 切换启动项勾选状态 */
  function toggleStartItem(value: string): void {
    const index = selectedStartItems.value.indexOf(value)
    if (index > -1) {
      selectedStartItems.value.splice(index, 1)
    } else {
      selectedStartItems.value.push(value)
    }
    localStg.set(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, selectedStartItems.value)
  }

  /** 设置游戏平台 */
  function setGamePlatform(platform: 'international' | 'perfect'): void {
    GamePlatform.value = platform
    saveSettingsToStorage()
  }

  /** 设置CS2路径 */
  function setCsgo2Path(path: string): void {
    csgo2Path.value = path
    saveSettingsToStorage()
  }

  /** 设置Steam路径 */
  function setSteamPath(path: string): void {
    steamPath.value = path
    saveSettingsToStorage()
  }

  /** 切换全屏状态 */
  function toggleFullscreen(): void {
    isFullscreen.value = !isFullscreen.value
    safeLog('切换全屏状态', isFullscreen.value)
    localStg.set(GAME_STORAGE_KEYS.IS_FULLSCREEN, isFullscreen.value)
  }

  /** 切换服务器视图模式 */
  function toggleServerViewModule(): void {
    serverViewModule.value = serverViewModule.value === 'cardModel' ? 'tableModal' : 'cardModel'
    localStg.set(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE, serverViewModule.value)
  }

  /** 更新社区列表排序 */
  function updateCommunityList(communities: Api.Game.Community[]): void {
    communityList.splice(0, communityList.length, ...communities)
    saveCommunityOrder()
  }

  /** 设置选中的社区ID */
  function setSelectedCommunityId(id: number): void {
    selectedCommunityId.value = id
    localStg.set(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID, id)
  }

  /** 设置自动挤服人数阈值 */
  function setJoinServerPersonValue(value: number): void {
    automaticJoinConfig.value.joinServerPersonValue = value
    saveSettingsToStorage()
  }

  /** 设置自动挤服线程数量 */
  function setJoinServerCountValue(value: number): void {
    automaticJoinConfig.value.joinServerCountValue = value
    saveSettingsToStorage()
  }

  /** 设置是否自动重试 */
  function setJoinServerAutoRetryValue(value: boolean): void {
    automaticJoinConfig.value.joinServerAutoRetryValue = value
    saveSettingsToStorage()
  }

  /** 设置是否推送GIS数据 */
  function setPushGisValue(value: boolean): void {
    automaticJoinConfig.value.pushGisValue = value
    saveSettingsToStorage()
  }

  /** 设置挤服延迟 */
  function setJoinServerDelayValue(value: number): void {
    automaticJoinConfig.value.joinServerDelayValue = value
    saveSettingsToStorage()
  }

  // ==================== 游戏状态检查 ====================

  /**
   * 检查游戏是否运行中
   * 自动启动/停止GSI服务和日志监听
   */
  async function checkGameRunning(): Promise<void> {
    try {
      const { isRunning } = await window.ipcRenderer.checkCsgo2Running()
      isGameRunning.value = isRunning

      if (isGameRunning.value) {
        // 检查GSI配置是否存在
        const { exists } = await window.ipcRenderer.checkGsiConfig(csgo2Path.value)
        if (!exists) return

        // 检查GSI服务是否已启动
        const { isConnected } = await window.ipcRenderer.checkGsiConnected()
        if (!isConnected) {
          await window.ipcRenderer.startGsiService()
          safeLog('GSI 服务已启动')
          listenToGsiData()
        }

        // 开始读取日志
        if (!isLogReading.value) {
          startLogReading()
        }
      } else {
        // 游戏已关闭，清理相关服务
        stopAutomaticJoinServer()
        const gsiConnected = await window.ipcRenderer.stopGsiService()
        if (!gsiConnected && isGsiRunning.value) {
          isGsiRunning.value = false
          removeGsiDataListener()
        }
        if (isLogReading.value) {
          stopLogReading()
        }
      }
    } catch (error) {
      console.error('检查游戏状态失败:', error)
    }
  }

  /** 开始定期检查游戏状态 */
  function startGameRunningCheck(intervalMs = GAME_CHECK_INTERVAL): void {
    if (gameCheckTimer) return
    checkGameRunning()
    gameCheckTimer = setInterval(checkGameRunning, intervalMs)
  }

  /** 停止定期检查游戏状态 */
  function stopGameRunningCheck(): void {
    if (!gameCheckTimer) return
    clearInterval(gameCheckTimer)
    gameCheckTimer = null
  }

  // ==================== 服务器列表初始化 ====================

  /** 初始化服务器列表 */
  async function initServerList(): Promise<void> {
    loadSettingsFromStorage()
    loadCustomCommunityIds()
    loadCustomCommunities()
    loadCustomServers()

    const customCommunities = [...communityList.filter(c => customCommunityIds.includes(c.id))]
    const customServers = [...serverDataList.filter(server => customCommunityIds.includes(server.communityId || 0))]

    const { data: communityData } = await fetchGetCommunityList()
    if (communityData) {
      const allCommunities = [...communityData, ...customCommunities]
      const sortedCommunities = applyCommunityOrder(allCommunities)
      communityList.splice(0, communityList.length, ...sortedCommunities)
    }
    const { data: mapData } = await fetchGetMapList()
    if (mapData) mapList.push(...mapData)

    await countServerServerNumber()

    const currentCustomServers = serverDataList.filter(server => customCommunityIds.includes(server.communityId || 0))
    const missingCustomServers = customServers.filter(cs =>
      !currentCustomServers.some(ccs => ccs.connectStr === cs.connectStr && ccs.communityId === cs.communityId)
    )
    if (missingCustomServers.length > 0) {
      serverDataList.push(...missingCustomServers)
    }

    await countServerPlayerNumber()
  }

  /** 统计各社区的服务器数量 */
  async function countServerServerNumber(): Promise<void> {
    const { data: serverData } = await fetchGetServerList()
    const customServers = serverDataList.filter(server => customCommunityIds.includes(server.communityId || 0))
    if (serverData) {
      const allServers = [...serverData, ...customServers]
      serverDataList.splice(0, serverDataList.length, ...allServers)
    }
    for (const community of communityList) {
      community.serverNumber = serverDataList.filter(server => server.communityId === community.id).length
    }
    saveCustomServers()
  }

  /** 统计各社区的在线玩家数量 */
  async function countServerPlayerNumber(): Promise<void> {
    const { data: pieChartData } = await fetchGetPieChart()
    for (const community of communityList) {
      community.playerNumber = 0
      if (!pieChartData) continue
      community.playerNumber = pieChartData.find(item => item.name === community.communityName)?.value || 0
    }
  }

  // ==================== 服务器查询 ====================

  /**
   * 创建离线服务器数据
   * @param server 服务器基础信息
   */
  function createOfflineServer(server: Api.Game.Server): Api.Game.InfoResponse {
    return {
      protocol: 0,
      name: server.serverName || '',
      map: '',
      folder: '',
      game: '',
      appId: 0,
      players: 0,
      maxPlayers: 0,
      bots: 0,
      serverType: '',
      environment: '',
      visibility: 0,
      vac: 0,
      version: '',
      addr: server.connectStr || '',
      isOnline: false,
      round: '',
      CTScore: '',
      TScore: '',
      mapStage: '',
      mapPhase: '',
      csgoPlayer: [],
      sort: server.sort
    }
  }

  /**
   * 查询服务器列表信息（源服务器）
   * 获取服务器在线状态、玩家数量等信息
   */
  async function queryServerInfosResponse(): Promise<void> {
    if (serverDataList.length === 0) {
      await countServerServerNumber()
      await countServerPlayerNumber()
      return
    }

    const targetServers = serverDataList.filter(server => server.connectStr && server.communityId === selectedCommunityId.value)
    const serverAddresses = targetServers.map(server => server.connectStr)

    try {
      const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses)
      if (!success) return

      const processedServers = infoResponseList.map((item: any) => {
        if (item.success === false) {
          item.isOnline = false
          const wsServer = currentServerWsList.find(ws => ws.addr === item.addr)
          if (wsServer) {
            Object.assign(item, wsServer)
            item.isOnline = true
          }
        } else {
          item.isOnline = true
        }

        const matchingServer = currentGisServerList.find(gisServer => gisServer.addr === item.addr)
        if (matchingServer) {
          item.round = matchingServer.round || ''
          item.CTScore = matchingServer.CTScore || ''
          item.TScore = matchingServer.TScore || ''
          item.mapStage = matchingServer.mapStage || ''
          item.mapPhase = matchingServer.mapPhase || ''
        }

        return item
      })

      const sortedServers = targetServers.map(server => {
        const foundServer = processedServers.find((s: Api.Game.InfoResponse) => s.addr === server.connectStr)
        const result = foundServer || createOfflineServer(server)
        result.sort = server.sort
        return result
      }).sort((a, b) => (a.sort || 0) - (b.sort || 0))

      currentServerList.splice(0, currentServerList.length, ...sortedServers)

      if (joinServerInfo.value) {
        const matchingServer = sortedServers.find(
          (server: Api.Game.InfoResponse) => server.addr === joinServerInfo.value?.addr
        )
        if (matchingServer) {
          joinServerInfo.value = matchingServer
        }
      }
    } finally {
      await countServerServerNumber()
      await countServerPlayerNumber()
    }
  }

  /**
   * 查询服务器Ping值
   * 更新当前服务器列表的延迟信息
   */
  async function queryServerInfosPingResponse(): Promise<void> {
    if (serverDataList.length === 0) return

    const serverAddresses = serverDataList
      .filter(server => server.connectStr && server.communityId === selectedCommunityId.value)
      .map(server => server.connectStr)

    const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses)
    if (!success) return

    infoResponseList.forEach((item: any) => {
      const server = currentServerList.find(s => s.addr === item.addr)
      if (server) {
        server.ping = item.ping
      }
    })
  }

  /**
   * 查询服务器列表信息（WebSocket）
   * 优先使用WebSocket推送的数据更新服务器列表
   */
  async function queryWsServerInfosResponse() {
    queryServerInfosPingResponse()

    const targetServers = serverDataList.filter(server => server.connectStr && server.communityId === selectedCommunityId.value)

    const allServers: Api.Game.InfoResponse[] = targetServers.map(server => {
      const wsServer = currentServerWsList.find(item => item.addr === server.connectStr)

      if (wsServer) {
        wsServer.isOnline = true
        const matchingServer = currentGisServerList.find(gisServer => gisServer.addr === wsServer.addr)
        if (matchingServer) {
          wsServer.round = matchingServer.round || ''
          wsServer.CTScore = matchingServer.CTScore || ''
          wsServer.TScore = matchingServer.TScore || ''
          wsServer.mapStage = matchingServer.mapStage || ''
          wsServer.mapPhase = matchingServer.mapPhase || ''
        }
        wsServer.sort = server.sort
        return wsServer
      }

      const offlineServer = createOfflineServer(server)
      offlineServer.sort = server.sort
      return offlineServer
    }).sort((a, b) => (a.sort || 0) - (b.sort || 0))

    currentServerList.splice(0, currentServerList.length, ...allServers)
    await countServerServerNumber()
    await countServerPlayerNumber()
  }

  /**
   * 查询单个服务器信息
   * @param server 要查询的服务器
   * @returns 是否查询成功
   */
  async function queryServerInfoResponse(server: Api.Game.InfoResponse): Promise<boolean> {
    const { success, data: infoResponse } = await window.ipcRenderer.invoke('query-game-server', server.addr)

    if (success) {
      currentServerList.forEach((item: Api.Game.InfoResponse) => {
        if (item.addr === server.addr) {
          item.isOnline = true
          Object.assign(item, infoResponse.data)
        }
      })

      if (joinServerInfo.value && joinServerInfo.value.addr === server.addr && server.name) {
        const updatedServer = { ...infoResponse.data }
        updatedServer.addr = server.addr
        updatedServer.isOnline = true
        joinServerInfo.value = updatedServer
      }
    } else {
      server.isOnline = false
      if (joinServerInfo.value && joinServerInfo.value.addr === server.addr) {
        joinServerInfo.value.isOnline = false
      }
    }

    return success
  }

  // ==================== 游戏启动 ====================

  /**
   * 检查游戏启动前的准备工作
   * 验证路径配置、创建GSI配置
   * @returns 是否准备就绪
   */
  async function ensureGameStartReady(): Promise<boolean> {
    if (!csgo2Path.value) {
      console.error('未配置 CS2 路径，请在设置中配置')
      window.$message?.error('未配置 CS2 路径，请在设置中配置')
      return false
    }

    if (!steamPath.value) {
      console.error('未配置 Steam 路径，请在设置中配置')
      window.$message?.error('未配置 Steam 路径，请在设置中配置')
      return false
    }

    const { exists } = await window.ipcRenderer.checkGsiConfig(csgo2Path.value)
    if (!exists) {
      const { success } = await window.ipcRenderer.createGsiConfig(csgo2Path.value)
      if (!success) {
        window.$message?.error('GSI 配置文件创建失败，部分功能可能无法使用')
      }
    }

    return true
  }

  /**
   * 启动游戏
   * @returns 是否启动成功
   */
  async function startGame(): Promise<boolean> {
    const ready = await ensureGameStartReady()
    if (!ready) return false

    isGameLaunching.value = true
    const serverMode = GamePlatform.value === 'perfect' ? 'perfectworld' : 'worldwide'
    const startType: 'steamurl' | 'steamexe' = isGameRunning.value ? 'steamurl' : 'steamexe'

    const launchResult = await window.ipcRenderer.launchCs2(
      csgo2Path.value,
      serverMode,
      startType,
      steamPath.value,
      [...selectedStartItems.value]
    )

    if (!launchResult.success) {
      window.$message?.error('启动游戏失败: ' + launchResult.error)
      isGameLaunching.value = false
      return false
    }

    const waitResult = await window.ipcRenderer.waitForCs2Launch(csgo2Path.value)
    if (!waitResult.success) {
      window.$message?.error('等待游戏启动超时')
      isGameLaunching.value = false
      return false
    }

    isGameLaunching.value = false
    return true
  }

  /**
   * 使用Steam URL连接服务器
   * 通过steam://协议启动游戏并连接
   */
  async function connectServerUsingSteamUrl(): Promise<void> {
    if (!joinServerInfo.value) return
    const ready = await ensureGameStartReady()
    if (!ready) return

    currentGisPlayerList.splice(0, currentGisPlayerList.length)
    const aLink = document.createElement('a')
    aLink.href = `steam://rungame/730/76561198977557298/+connect ${joinServerInfo.value.addr}`
    aLink.click()
  }

  // ==================== 自动挤服 ====================

  /**
   * 开始自动挤服
   * 启动多线程挤服，监控服务器空位
   */
  async function startAutomaticJoinServer(): Promise<void> {
    if (!joinServerInfo.value) {
      window.$message?.error('请先选择要加入的服务器')
      return
    }

    const ready = await ensureGameStartReady()
    if (!ready) return

    isAutomatic.value = true
    automaticCount.value = 0
    hasRetriedForThisConnection = false

    try {
      const result = await window.ipcRenderer.invoke('start-automatic-join', {
        serverAddr: joinServerInfo.value.addr,
        maxPlayers: automaticJoinConfig.value.joinServerPersonValue,
        threadCount: automaticJoinConfig.value.joinServerCountValue,
        joinDelay: automaticJoinConfig.value.joinServerDelayValue
      })

      if (result.success && result.found) {
        isAutomaticRetry.value = true

        if (automaticJoinConfig.value.joinServerAutoRetryValue) {
          connectServerUsingSteamUrl()

          // 清除之前的定时器
          if (connectionCheckTimer) {
            clearTimeout(connectionCheckTimer)
            connectionCheckTimer = null
          }

          // 60秒后检查是否连接成功，否则重试
          connectionCheckTimer = setTimeout(() => {
            if (isAutomaticRetry.value && isAutomatic.value) {
              safeLog('⏰ 连接超时，重新尝试连接...')
              startAutomaticJoinServer()
            }
          }, 60000)
        } else {
          isAutomatic.value = false
          isAutomaticRetry.value = false
          connectServerUsingSteamUrl()
          window.$message?.success('连接成功')
        }
      } else if (result.stopped) {
        window.$message?.info('已停止自动挤服')
      } else if (!result.success) {
        window.$message?.error(result.error || '自动挤服失败')
      }
    } catch (error) {
      console.error('自动挤服失败:', error)
      window.$message?.error('自动挤服失败')
    }
  }

  /**
   * 停止自动挤服
   * 清理定时器和状态
   */
  async function stopAutomaticJoinServer(): Promise<void> {
    isAutomaticRetry.value = false
    hasRetriedForThisConnection = false

    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer)
      connectionCheckTimer = null
    }

    try {
      console.log(isAutomatic.value);
      
      if (isAutomatic.value) {
        console.log("暂停挤服");
        await window.ipcRenderer.invoke('stop-automatic-join')
        isAutomatic.value = false
      }
    } catch (error) {
      console.error('停止自动挤服失败:', error)
    }
  }

  // ==================== GSI数据监听 ====================

  /** GSI数据事件处理器 */
  let gsiDataHandler: ((_event: unknown, res: unknown) => void) | null = null

  /**
   * 监听GSI数据
   * 处理游戏状态变化事件
   */
  function listenToGsiData(): void {
    safeLog('开始监听 GSI 数据')
    isGsiRunning.value = true

    gsiDataHandler = (_event, res: any) => {
      const { eventName, data } = res

      switch (eventName) {
        // 地图名称变更 - 用户成功连接到目标服务器
        case 'map:nameChanged':
          safeLog('🗺️ [Map:地图名称变更] - 当前游戏地图已切换', {
            '原地图': data.previous || '无',
            '当前地图': data.current,
            '目标服务器地图': joinServerInfo.value?.map || '未设置'
          })
          const targetMap = joinServerInfo.value?.map
          const currentMap = data.current
          if (targetMap && currentMap && (targetMap.includes(currentMap) || currentMap.includes(targetMap)) && isAutomatic.value) {
            safeLog('✅ 用户已成功连接到目标服务器')
            isJoinServerTrayVisible.value = false;

            // 发送用户连接信息到GIS服务器
            sendUserGisJoinAddr()
            // 清除玩家挤服状态
            pauseAutomaticJoinServer()
            // 清除玩家挤服状态
            currentAutomaticPlayerDynamicList.splice(0, currentAutomaticPlayerDynamicList.length)
            // 发送已连接进服务器...动态信息
            sendAutomaticDynamic('已连接进服务器...')
            // 停止自动挤服
            stopAutomaticJoinServer()

            // 播放连接成功音效
            const appStore = useAppStore()
            const currentTheme = appStore.currentTheme
            const audioSrc = appStore.audioMap[currentTheme] || appStore.audioMap['阿罗娜']
            const audio = new Audio(audioSrc)
            audio.volume = appStore.volume
            audio.play()
            window.$message?.success('连接成功');
          }
          break

        // 地图阶段变更
        case 'map:phaseChanged':
          safeLog('🎯 [Map:阶段变更] - 游戏阶段已更新', data.current, data.previous)
          gameServerInfo.value.mapPhase = data.current
          sendServerGisData(gameServerInfo.value)
          break

        // 回合数变更
        case 'map:roundChanged':
          safeLog('🔄 [Map:回合变更] - 回合数已更新', data.current, data.previous)
          gameServerInfo.value.round = data.current
          sendServerGisData(gameServerInfo.value)
          break

        // CT分数变更
        case 'map:teamCTScoreChanged':
          safeLog('🔵 [Map:CT分数变更] - CT阵营分数已更新', data.current, data.previous)
          gameServerInfo.value.CTScore = data.current
          sendServerGisData(gameServerInfo.value)
          break

        // T分数变更
        case 'map:teamTScoreChanged':
          safeLog('🟠 [Map:T分数变更] - T阵营分数已更新', data.current, data.previous)
          gameServerInfo.value.TScore = data.current
          sendServerGisData(gameServerInfo.value)
          break

        // 回合阶段相关事件
        case 'round:phaseChanged':
        case 'round:started':
        case 'round:ended':
          safeLog(`⏱️ [Round:${eventName.split(':')[1]}]`, data.current, data.previous)
          gameServerInfo.value.mapPhase = data.current
          sendServerGisData(gameServerInfo.value)
          break

        // 玩家阵营变更
        case 'player:teamChanged':
          safeLog('👥 [Player:阵营变更] - 玩家所属阵营已切换', data.current, data.previous)
          gamePlayerInfo.value.team = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家生命值变更
        case 'player:hpChanged':
          safeLog('❤️ [Player:生命值变更] - 玩家生命值已更新', data.current, data.previous)
          gamePlayerInfo.value.health = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家护甲值变更
        case 'player:armorChanged':
          safeLog('🛡️ [Player:护甲值变更] - 玩家护甲值已更新', data.current, data.previous)
          gamePlayerInfo.value.armor = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家头盔状态变更
        case 'player:helmetChanged':
          safeLog('⛑️ [Player:头盔变更] - 玩家头盔状态已更新', data.current, data.previous)
          gamePlayerInfo.value.helmet = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家金钱变更
        case 'player:moneyChanged':
          safeLog('💰 [Player:金钱变更] - 玩家金钱已更新', data.current, data.previous)
          gamePlayerInfo.value.money = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家装备价值变更
        case 'player:equipmentValueChanged':
          safeLog('💎 [Player:装备价值变更] - 玩家装备价值已更新', data.current, data.previous)
          gamePlayerInfo.value.equipValue = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家武器变更
        case 'player:weaponChanged':
          safeLog('🔫 [Player:武器变更] - 玩家武器已更新', data.current, data.previous)
          gamePlayerInfo.value.weapon = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家弹夹弹药变更
        case 'player:ammoClipChanged':
          safeLog('📦 [Player:弹夹弹药变更] - 玩家弹夹弹药已更新', data.current, data.previous)
          gamePlayerInfo.value.clipAmmo = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家备用弹药变更
        case 'player:ammoReserveChanged':
          safeLog('🎒 [Player:备用弹药变更] - 玩家备用弹药已更新', data.current, data.previous)
          gamePlayerInfo.value.reserveAmmo = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家击杀数变更
        case 'player:killsChanged':
          safeLog('💀 [Player:击杀数变更] - 玩家击杀数已更新', data.current, data.previous)
          gamePlayerInfo.value.kills = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 玩家分数变更
        case 'player:scoreChanged':
          safeLog('📊 [Player:分数变更] - 玩家分数已更新', data.current, data.previous)
          gamePlayerInfo.value.score = data.current
          sendUserGisData(gamePlayerInfo.value)
          break

        // 时间戳变更
        case 'provider:timestampChanged':
          safeLog('⏰ [Provider:时间戳变更] - 更新服务器时间戳', data.current, data.previous)
          sendServerGisData(gameServerInfo.value)
          break

        default:
          safeLog('❓ [未知事件]', { eventName, data })
      }
    }

    window.ipcRenderer.on('cs2-gsi-data', gsiDataHandler)
  }

  /** 移除GSI数据监听 */
  function removeGsiDataListener(): void {
    if (gsiDataHandler) {
      window.ipcRenderer.off('cs2-gsi-data', gsiDataHandler)
      safeLog('✅ GSI 数据监听已移除')
      gsiDataHandler = null
    }
  }

  // ==================== 日志监听 ====================

  /** 控制台日志事件处理器 */
  let consoleLogHandler: ((_event: unknown, logData: string) => void) | null = null

  /**
   * 解析单行日志
   * @param logLine 日志行内容
   * @returns 解析结果
   */
  function parseLogLine(logLine: string): { status: UserConnectionStatus; message: string; mapName?: string } | null {
    if (LOG_PATTERNS.connected.test(logLine)) {
      return { status: 'connecting', message: '正在连接服务器' }
    }

    if (LOG_PATTERNS.switchingToLevelload.test(logLine)) {
      return { status: 'map_loading', message: '开始加载地图' }
    }

    if (LOG_PATTERNS.loadingToIngame.test(logLine)) {
      return { status: 'in_game', message: '玩家进入游戏' }
    }

    if (LOG_PATTERNS.serverFull.test(logLine)) {
      return { status: 'connection_failed', message: '服务器已满员' }
    }

    if (LOG_PATTERNS.disconnected.test(logLine)) {
      return { status: 'disconnected', message: '用户已断开连接' }
    }

    const mapMatch = logLine.match(LOG_PATTERNS.mapInfo)
    if (mapMatch) {
      return {
        status: 'map_loading',
        mapName: mapMatch[1],
        message: `正在加载地图: ${mapMatch[1]}`
      }
    }

    return null
  }

  /**
   * 解析日志内容
   * 从后向前查找最新的状态变化
   * @param logContent 日志内容
   */
  function parseLogContent(logContent: string): ReturnType<typeof parseLogLine> {
    const lines = logContent.split('\n').reverse()

    for (const line of lines) {
      const result = parseLogLine(line)
      if (result) return result
    }

    return null
  }

  /**
   * 监听控制台日志
   * 处理游戏连接状态变化
   */
  function listenToConsoleLog(): void {
    consoleLogHandler = (_event, logData: string) => {
      const lines = logData.split('\n')

      // 检测新的连接请求，重置重试标志
      for (const line of lines) {
        if (LOG_PATTERNS.queueNewRequest.test(line)) {
          hasRetriedForThisConnection = false
          break
        }
      }

      const logContent = parseLogContent(logData)

      if (logContent) {
        userConnectionStatus.value = logContent.status

        switch (logContent.status) {
          case 'in_game':
            safeLog('✅ 用户已成功进入游戏')
            hasRetriedForThisConnection = false
            break
          case 'connection_failed':
            safeLog('❌ 服务器已满员，连接被拒绝')
            // 自动重试连接
            if (isAutomatic.value && automaticJoinConfig.value.joinServerAutoRetryValue && !hasRetriedForThisConnection) {
              hasRetriedForThisConnection = true
              startAutomaticJoinServer()
            }
            break
          case 'map_loading':
            safeLog('📦 用户正在加载地图')
            break
          case 'connecting':
            safeLog('🔗 用户正在连接服务器')
            break
          case 'disconnected':
            safeLog('🔌 用户已断开连接')
            // 如果没有在自动挤服,则清除用户GIS连接数据
            if (!isAutomatic.value) {
              pauseAutomaticJoinServer();
            }
            break
        }
      }
    }

    window.ipcRenderer.on('cs2-console-log', consoleLogHandler)
  }

  /** 移除控制台日志监听 */
  function removeConsoleLogListener(): void {
    if (consoleLogHandler) {
      window.ipcRenderer.off('cs2-console-log', consoleLogHandler)
      safeLog('✅ 控制台日志监听已移除')
      consoleLogHandler = null
    }
  }

  /**
   * 开始读取游戏日志
   * @param delayMs 读取延迟（毫秒）
   */
  async function startLogReading(delayMs = 5000): Promise<void> {
    if (!csgo2Path.value) {
      console.error('未配置 CS2 路径，无法开始读取日志')
      return
    }

    try {
      const result = await window.ipcRenderer.invoke('start-log-reader', csgo2Path.value, delayMs)
      if (result.success) {
        isLogReading.value = true
        listenToConsoleLog()
        safeLog('开始读取日志')
      }
    } catch (error) {
      console.error('开始读取日志失败:', error)
    }
  }

  /** 停止读取游戏日志 */
  async function stopLogReading(): Promise<void> {
    if (!isLogReading.value) return

    try {
      await window.ipcRenderer.invoke('stop-log-reader')
      isLogReading.value = false
      userConnectionStatus.value = 'idle'
      removeConsoleLogListener()
    } catch (error) {
      console.error('停止读取日志失败:', error)
    }
  }

  // ==================== GIS数据发送 ====================

  /** 刷新并发送待发送的GIS用户数据 */
  function flushUserGisData(): void {
    if (!joinServerInfo.value?.addr) return
    if (!GisWebsocket.GisWebsocket) return
    if (!gisSendState.pendingData) return

    const addr = joinServerInfo.value.addr
    const dataToSend: Api.Game.CsgoPlayer = { ...gisSendState.pendingData, addr }
    gisSendState.pendingData = null
    gisSendState.lastSentAt = Date.now()

    const sendMessage: Api.Game.WsServerMsgType = {
      type: '100',
      data: dataToSend
    }

    GisWebsocket.GisWebsocket.send(JSON.stringify(sendMessage))
  }

  /**
   * 发送用户GIS数据（带节流）
   * 限制发送频率，避免频繁发送
   * @param data 用户数据
   */
  function sendUserGisData(data: Api.Game.CsgoPlayer): void {
    if (!joinServerInfo.value?.addr || !automaticJoinConfig.value.pushGisValue) return
    gisSendState.pendingData = { ...data, addr: joinServerInfo.value.addr }

    const now = Date.now()
    const elapsed = now - gisSendState.lastSentAt

    if (elapsed >= GIS_SEND_INTERVAL) {
      if (gisSendState.sendTimer) {
        clearTimeout(gisSendState.sendTimer)
        gisSendState.sendTimer = null
      }
      flushUserGisData()
      return
    }

    if (gisSendState.sendTimer) return

    gisSendState.sendTimer = setTimeout(() => {
      gisSendState.sendTimer = null
      flushUserGisData()
    }, GIS_SEND_INTERVAL - elapsed)
  }

  /**
   * 发送服务器GIS数据
   * @param data 服务器数据
   */
  function sendServerGisData(data: Api.Game.ServerInfoData): void {
    if (!joinServerInfo.value?.addr) return
    data.addr = joinServerInfo.value.addr

    const sendMessage: Api.Game.WsServerMsgType = {
      type: '103',
      data
    }

    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.ServerWebsocket.send(JSON.stringify(sendMessage))
    }
  }

  /**
   * 发送自动挤服动态消息
   * @param data 动态消息内容
   */
  function sendAutomaticDynamic(data: string): void {
    if (!data) return
    const sendMessage: Api.Game.WsServerMsgType = {
      type: '102',
      data: {
        addr: joinServerInfo?.value?.addr,
        description: data
      }
    }
    if (GisWebsocket.GisWebsocket) {
      GisWebsocket.GisWebsocket.send(JSON.stringify(sendMessage))
    }
  }

  /**
   * 发送加入服务器信息
   * @param data 服务器信息
   */
  function sendJoinServer(data: Api.Game.ServerVo): void {
    const sendMessage: Api.Game.WsServerMsgType = {
      type: '100',
      data
    }
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.ServerWebsocket.send(JSON.stringify(sendMessage))
    }
  }

  /** 发送用户GIS搜索地址 */
  function sendUserGisAddr(): void {
    if (!joinServerInfo.value?.addr) return
    if (!GisWebsocket.GisWebsocket) return

    const setAddrMessage: Api.Game.WsServerMsgType = {
      type: '101',
      data: joinServerInfo.value.addr
    }
    GisWebsocket.GisWebsocket.send(JSON.stringify(setAddrMessage))
  }

  /** 发送用户GIS连接地址 */
  function sendUserGisJoinAddr(): void {
    if (!joinServerInfo.value?.addr) return
    if (!GisWebsocket.GisWebsocket) return

    const setAddrMessage: Api.Game.WsServerMsgType = {
      type: '103',
      data: joinServerInfo.value.addr
    }
    GisWebsocket.GisWebsocket.send(JSON.stringify(setAddrMessage))
  }

  /**
   * 暂停自动挤服
   * 向服务器发送暂停消息
   */
  async function pauseAutomaticJoinServer(): Promise<void> {
    const sendMessage = {
      type: '104',
      data: {
        serverAddr: joinServerInfo.value?.addr
      }
    }
    if (GisWebsocket.GisWebsocket) {
      GisWebsocket.GisWebsocket.send(JSON.stringify(sendMessage))
    }
  }

  // ==================== WebSocket ====================

  /** 初始化服务器WebSocket连接 */
  async function initServerWebsocket(): Promise<void> {
    ServerWebsocket.init()
  }

  /** 关闭GIS WebSocket连接 */
  function closeGisWebsocket(): void {
    if (GisWebsocket.GisWebsocket) {
      GisWebsocket.close()
    }
  }

  /** 初始化GIS WebSocket连接 */
  async function initGisWebsocket(): Promise<void> {
    GisWebsocket.init()
  }

  /** 关闭服务器WebSocket连接 */
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
    customCommunityIds,
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

    // 方法
    initServerWebsocket,
    initGisWebsocket,
    initServerList,
    closeServerWebsocket,
    closeGisWebsocket,
    sendJoinServer,
    queryServerInfosResponse,
    queryServerInfoResponse,
    countServerServerNumber,
    countServerPlayerNumber,
    listenToGsiData,
    removeGsiDataListener,
    checkGameRunning,
    startGameRunningCheck,
    stopGameRunningCheck,
    setGamePlatform,
    setCsgo2Path,
    setSteamPath,
    toggleFullscreen,
    toggleServerViewModule,
    updateCommunityList,
    addCustomCategory,
    editCustomCategory,
    removeCustomCategory,
    addServerToCategory,
    removeCustomServer,
    isCustomCategory,
    getCustomCategoryServers,
    setSelectedCommunityId,
    setJoinServerPersonValue,
    setJoinServerCountValue,
    setJoinServerAutoRetryValue,
    setPushGisValue,
    setJoinServerDelayValue,
    setApplyKeyBindItems,
    setSelectedStartItems,
    toggleStartItem,
    startGame,
    startAutomaticJoinServer,
    stopAutomaticJoinServer,
    pauseAutomaticJoinServer,
    connectServerUsingSteamUrl,
    queryWsServerInfosResponse,
    sendAutomaticDynamic,
    ensureGameStartReady,
    sendUserGisAddr,
    sendUserGisJoinAddr,
    startLogReading,
    stopLogReading,
    applyKeyBindItems,
    selectedStartItems
  }
})
