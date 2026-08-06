import { unref } from 'vue'
import type { Ref } from 'vue'
import { fetchGetCommunityList } from '@/service/api'
import { fetchGetServerList } from '@/service/api'
import { fetchGetMapList } from '@/service/api'

type MaybeRef<T> = T | Ref<T>

interface ServerQueryDeps {
  communityList: MaybeRef<Api.Game.Community[]>
  serverDataList: MaybeRef<Api.Game.Server[]>
  mapList: MaybeRef<Api.Game.Map[]>
  currentServerList: MaybeRef<Api.Game.SeverVo[]>
  currentServerWsList: MaybeRef<Api.Game.SeverVo[]>
  currentGisServerList: MaybeRef<Api.Game.ServerInfoData[]>
  selectedCommunityId: MaybeRef<number | null>
  joinServerInfo: MaybeRef<Api.Game.SeverVo | undefined>
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
    const serverDataListValue = unref(serverDataList)
    for (const community of unref(communityList)) {
      community.serverNumber = serverDataListValue.filter(server => server.communityId === community.id).length
    }
  }

  /** 初始化服务器列表 */
  async function initServerList(): Promise<void> {
    loadSettingsFromStorage()

    const { data: communityData } = await fetchGetCommunityList()
    if (communityData) {
      const sortedCommunities = applyCommunityOrder(communityData)
      unref(communityList).splice(0, unref(communityList).length, ...sortedCommunities)
    }
    const { data: mapData } = await fetchGetMapList()
    if (mapData) unref(mapList).push(...mapData)

    const { data: serverData } = await fetchGetServerList()
    if (serverData) {
      unref(serverDataList).splice(0, unref(serverDataList).length, ...serverData)
    }

    countServerServerNumber()
  }

  /** 更新社区列表排序 */
  function updateCommunityList(communities: Api.Game.Community[]): void {
    unref(communityList).splice(0, unref(communityList).length, ...communities)
    saveCommunityOrder(unref(communityList))
  }

  /** 查询服务器列表信息（源服务器） */
  async function queryServerInfosResponse(): Promise<void> {
    if (unref(serverDataList).length === 0) {
      const { data: serverData } = await fetchGetServerList()
      if (serverData) {
        unref(serverDataList).splice(0, unref(serverDataList).length, ...serverData)
      }
      countServerServerNumber()
      return
    }

    const targetServers = unref(serverDataList).filter(server => server.connectStr && server.communityId === unref(selectedCommunityId))
    const serverAddresses = targetServers.map(server => server.connectStr)

    try {
      const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses)
      if (success) {
        infoResponseList.forEach((item: any) => {
          const listServer = unref(currentServerList).find(s => s.connectStr === item.addr)
          if (listServer) {
            listServer.numPlayers = item.players
            listServer.mapName = item.map
            listServer.maxPlayers = item.maxPlayers
            listServer.serverName = item.name
            const map = unref(mapList).find(m => m.id === item.mapId)
            if (map) {
              listServer.mapId = map.id
              listServer.mapLabel = map.mapLabel
              listServer.mapUrl = map.mapUrl
              listServer.type = map.type
              listServer.tag = map.tag
              listServer.artifact = map.artifact
            }
          }
        })
      }
    } finally {
      countServerServerNumber()
    }
  }

  /** 查询服务器列表信息（WebSocket） */
  async function queryWsServerInfosResponse() {
    queryServerInfosPingResponse()

    const targetServers = unref(serverDataList).filter(server => server.connectStr && server.communityId === unref(selectedCommunityId))

    const allServers: Api.Game.SeverVo[] = targetServers.map(server => {
    const wsServer = unref(currentServerWsList).find(item => item.connectStr === server.connectStr)

    if (wsServer) {
        wsServer.isOnline = true
        return wsServer
      }

      return createOfflineServer(server)
    })

    unref(currentServerList).splice(0, unref(currentServerList).length, ...allServers)
    countServerServerNumber()
  }

  /** 查询服务器Ping值 */
  async function queryServerInfosPingResponse(): Promise<void> {
    if (unref(serverDataList).length === 0) return

    const serverAddresses = unref(serverDataList)
      .filter(server => server.connectStr && server.communityId === unref(selectedCommunityId))
      .map(server => server.connectStr)

    const { success, data: infoResponseList } = await window.ipcRenderer.invoke('query-game-servers', serverAddresses)
    if (!success) return

    infoResponseList.forEach((item: any) => {
      const server = unref(currentServerList).find(s => s.connectStr === item.addr)
      if (server) {
        server.ping = item.ping
      }
    })
  }

  /** 查询单个服务器信息 */
  async function queryServerSeverVo(server: Api.Game.SeverVo): Promise<boolean> {
    const { success, data: infoResponse } = await window.ipcRenderer.invoke('query-game-server', server.connectStr)

    if (success) {
      unref(currentServerList).forEach((item: Api.Game.SeverVo) => {
        if (item.connectStr === server.connectStr) {
          item.isOnline = true
          Object.assign(item, infoResponse.data)
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
  }
}