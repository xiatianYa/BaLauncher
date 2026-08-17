import type { Ref } from 'vue'
import { fetchGetCommunityList, fetchGetMapList, fetchGetServerList } from '@/service/api'

interface ServerQueryDeps {
  communityList: Ref<Api.Game.Community[]>
  serverDataList: Ref<Api.Game.Server[]>
  mapList: Ref<Api.Game.Map[]>
  currentServerList: Ref<Api.Game.SeverVo[]>
  currentServerWsList: Ref<Api.Game.SeverVo[]>
  currentGisServerList: Ref<Api.Game.ServerInfoData[]>
  selectedCommunityId: Ref<number | null>
  joinServerInfo: Ref<Api.Game.SeverVo | undefined>
  loadSettingsFromStorage: () => void
  applyCommunityOrder: (communities: Api.Game.Community[]) => Api.Game.Community[]
  saveCommunityOrder: (communityList: Api.Game.Community[]) => void
}

/**
 * 服务器查询相关逻辑
 * 负责服务器列表初始化、查询、Ping 检测等
 */
export function useServerQuery(deps: ServerQueryDeps) {
  const {
    communityList,
    serverDataList,
    mapList,
    currentServerList,
    currentServerWsList,
    currentGisServerList,
    selectedCommunityId,
    joinServerInfo,
    loadSettingsFromStorage,
    applyCommunityOrder,
    saveCommunityOrder,
  } = deps

  /** 创建离线服务器数据 */
  function createOfflineServer(server: Api.Game.Server): Api.Game.SeverVo {
    return {
      serverId: 0,
      mode: server.mode,
      communityName: '',
      communityId: 0,
      mapId: 0,
      mapName: '',
      mapLabel: '',
      mapUrl: '',
      type: '',
      tag: [],
      artifact: '',
      // 离线时也带上源服务器的名称与连接地址，避免两个视图拿不到名称而显示空白/undefined
      serverName: server.serverName || '',
      numPlayers: 0,
      maxPlayers: 0,
      connectStr: server.connectStr || '',
      minPlayers: 0,
      dateTimeOriginal: undefined,
      ping: 0,
      isOnline: false,
      round: '',
      CTScore: '',
      TScore: '',
      mapStage: '',
      mapPhase: '',
    }
  }

  /** 统计各社区的服务器数量 */
  function countServerServerNumber(): void {
    const serverDataListValue = serverDataList.value
    for (const community of communityList.value) {
      community.serverNumber = serverDataListValue.filter(server => server.communityId === community.id).length
    }
  }

  /** 初始化服务器列表 */
  async function initServerList(): Promise<void> {
    loadSettingsFromStorage()

    const { data: communityData } = await fetchGetCommunityList()
    if (communityData) {
      const sortedCommunities = applyCommunityOrder(communityData)
      communityList.value.splice(0, communityList.value.length, ...sortedCommunities)
    }
    const { data: mapData } = await fetchGetMapList()
    if (mapData) mapList.value.push(...mapData)

    const { data: serverData } = await fetchGetServerList()
    if (serverData) {
      serverDataList.value.splice(0, serverDataList.value.length, ...serverData)
    }

    countServerServerNumber()
  }

  /** 更新社区列表排序 */
  function updateCommunityList(communities: Api.Game.Community[]): void {
    communityList.value.splice(0, communityList.value.length, ...communities)
    saveCommunityOrder(communityList.value)
  }

  /** 查询服务器列表信息（源服务器） */
  async function queryServerInfosResponse(): Promise<void> {
    if (serverDataList.value.length === 0) {
      const { data: serverData } = await fetchGetServerList()
      if (serverData) {
        serverDataList.value.splice(0, serverDataList.value.length, ...serverData)
      }
      countServerServerNumber()
      return
    }

    // 记录发起查询时的社区，异步返回期间用户可能已切换社区
    const queryCommunityId = selectedCommunityId.value
    const targetServers = serverDataList.value.filter(server => server.connectStr && server.communityId === queryCommunityId)
    const serverAddresses = targetServers.map(server => server.connectStr)

    try {
      const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses)
      // 查询期间用户已切换社区：丢弃本次过期结果，避免上一次搜索回来的数据覆盖当前社区列表
      if (queryCommunityId !== selectedCommunityId.value) return
      if (success) {
        infoResponseList.forEach((item: any) => {
          // 本地查询失败（如服务器离线）时不覆盖任何已有数据，保留源服务器名称/地图等信息
          // 注意：成功项的字段在 item.data 内（{ success: true, data: { players, addr, ... } }），
          // 只有失败项才是 { addr, success: false }，直接读 item.players 会取到 undefined 导致人数不更新
          if (!item.success || !item.data) return
          const info = item.data

          const listServer = currentServerList.value.find(s => s.connectStr === info.addr)
          if (listServer) {
            listServer.numPlayers = info.players
            listServer.mapName = info.map
            listServer.maxPlayers = info.maxPlayers
            // A2S 查询成功：回填 Ping 值并标记在线（与 queryServerInfosPingResponse 保持一致）
            listServer.ping = info.ping
            listServer.isOnline = true
            // A2S 查询（query-game-servers）返回的数据没有 mapId，只有原始地图名 info.map，
            // 原先按 mapId 匹配 mapList 永远匹配不上，导致换图后 mapUrl/mapLabel 等地图信息不更新。
            // 改为按地图名匹配（与 open-game-join / mapOrder 中 mapName 匹配逻辑一致）
            const map = mapList.value.find(m => m.mapName === info.map)
            if (map) {
              listServer.mapId = map.id
              listServer.mapLabel = map.mapLabel
              listServer.mapUrl = map.mapUrl
              listServer.type = map.type
              listServer.tag = map.tag
              listServer.artifact = map.artifact
            } else if (info.map) {
              // 地图不在维护的地图列表中（如自定义/工坊地图）时清空旧地图信息，避免残留上一张地图的图片与译名
              listServer.mapId = 0
              listServer.mapLabel = ''
              listServer.mapUrl = ''
              listServer.type = ''
              listServer.tag = []
              listServer.artifact = ''
            }
          }
        })
      }
    } finally {
      countServerServerNumber()
    }
  }

  /** 查询服务器列表信息（WebSocket）：用 WS 实时数据组装当前社区列表，缺失的服务器置为离线 */
  async function queryWsServerInfosResponse(): Promise<void> {
    // 先查询源服务器的 Ping 值并回填到 currentServerList，再组装列表，确保 UI 渲染时 Ping 已就绪
    queryServerInfosPingResponse()

    const targetServers = serverDataList.value.filter(server => server.connectStr && server.communityId === selectedCommunityId.value)

    const allServers: Api.Game.SeverVo[] = targetServers.map(server => {
      const wsServer = currentServerWsList.value.find(item => item.connectStr === server.connectStr)
      if (wsServer) {
        wsServer.isOnline = true
        return wsServer
      }
      return createOfflineServer(server)
    })

    currentServerList.value.splice(0, currentServerList.value.length, ...allServers)
    countServerServerNumber()
  }

  /** 将 WS 最新推送的服务器列表合并到当前展示列表（按 connectStr 实时更新在线状态/人数/地图信息） */
  function applyWsServerList(wsList: Api.Game.SeverVo[]): void {
    const list = currentServerList.value
    const wsMap = new Map(wsList.map(s => [s.connectStr, s]))
    list.forEach(server => {
      const ws = wsMap.get(server.connectStr)
      if (!ws) return
      server.numPlayers = ws.numPlayers ?? server.numPlayers
      server.maxPlayers = ws.maxPlayers ?? server.maxPlayers
      server.isOnline = ws.isOnline !== false
      if (ws.mapName) server.mapName = ws.mapName
      if (ws.mapId) {
        server.mapId = ws.mapId
        server.mapLabel = ws.mapLabel ?? server.mapLabel
        server.mapUrl = ws.mapUrl ?? server.mapUrl
      }
      if (ws.ping != null) server.ping = ws.ping
    })
  }

  /** 查询服务器Ping值 */
  async function queryServerInfosPingResponse(): Promise<void> {
    if (serverDataList.value.length === 0) return

    // 记录发起查询时的社区，异步返回期间用户可能已切换社区
    const queryCommunityId = selectedCommunityId.value
    const serverAddresses = serverDataList.value
      .filter(server => server.connectStr && server.communityId === queryCommunityId)
      .map(server => server.connectStr)

    const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses)
    if (!success) return
    // 查询期间用户已切换社区：丢弃过期 ping 结果，避免污染新社区数据
    if (queryCommunityId !== selectedCommunityId.value) return

    infoResponseList.forEach((item: any) => {
      // 查询失败（如服务器离线）时不覆盖 ping，保留原值
      if (!item.success) return
      const server = currentServerList.value.find(s => s.connectStr === item.data.addr)
      if (server) {
        server.ping = item.data.ping
      }
    })
  }

  /** 查询单个服务器信息 */
  async function queryServerSeverVo(server: Api.Game.SeverVo): Promise<boolean> {
    const { success, data: infoResponse } = await window.ipcRenderer.invoke('query-game-server', server.connectStr)

    if (success) {
      // A2S 查询返回的是原始字段（name/map/players/addr），与 SeverVo 字段（serverName/mapName/numPlayers/connectStr）不一致，
      // 需逐字段映射，不能直接 Object.assign
      const info = infoResponse as {
        name?: string
        map?: string
        players?: number
        maxPlayers?: number
        ping?: number
      }

      currentServerList.value.forEach((item: Api.Game.SeverVo) => {
        if (item.connectStr === server.connectStr) {
          item.isOnline = true
          item.serverName = info.name || item.serverName
          item.numPlayers = info.players ?? item.numPlayers
          item.maxPlayers = info.maxPlayers ?? item.maxPlayers
          item.ping = info.ping ?? item.ping

          // 按地图名匹配地图列表，回填地图详情（与批量查询 queryServerInfosResponse 保持一致）
          if (info.map) {
            item.mapName = info.map
            const map = mapList.value.find(m => m.mapName === info.map)
            if (map) {
              item.mapId = map.id
              item.mapLabel = map.mapLabel
              item.mapUrl = map.mapUrl
              item.type = map.type
              item.tag = map.tag
              item.artifact = map.artifact
            } else {
              // 地图不在维护的地图列表中（如自定义/工坊地图）时清空旧地图信息，避免残留上一张地图的图片与译名
              item.mapId = 0
              item.mapLabel = ''
              item.mapUrl = ''
              item.type = ''
              item.tag = []
              item.artifact = ''
            }
          }
        }
      })
    } else {
      server.isOnline = false
    }

    return success
  }

  return {
    initServerList,
    updateCommunityList,
    queryServerInfosResponse,
    queryWsServerInfosResponse,
    queryServerSeverVo,
    countServerServerNumber,
    createOfflineServer,
    applyWsServerList,
  }
}