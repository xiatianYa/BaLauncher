import { unref } from 'vue'
import type { Ref } from 'vue'
import { localStg } from '@/utils/storage'
import { GAME_STORAGE_KEYS } from '@/constants/cache'
import type { GamePlatform } from '@/constants/app'

interface StorageDeps {
  gamePlatform: Ref<GamePlatform>
  csgo2Path: Ref<string>
  steamPath: Ref<string>
  automaticJoinConfig: Ref<Api.Game.AutomaticJoinConfig>
  applyKeyBindItems: Ref<Api.Game.ApplyKeyBindItem[]>
  selectedStartItems: Ref<string[]>
  isFullscreen: Ref<boolean>
  serverViewModule: Ref<UnionKey.ServerLayoutModule>
  selectedCommunityId: Ref<number | null>
}

/**
 * 本地存储相关逻辑
 * 负责从 localStorage 加载/保存游戏相关设置
 */
export function useGameStorage(deps: StorageDeps) {
  const {
    gamePlatform,
    csgo2Path,
    steamPath,
    automaticJoinConfig,
    applyKeyBindItems,
    selectedStartItems,
    isFullscreen,
    serverViewModule,
    selectedCommunityId,
  } = deps

  /** 从本地存储加载设置 */
  function loadSettingsFromStorage(): void {
    const savedPlatform = localStg.get(GAME_STORAGE_KEYS.GAME_PLATFORM) as GamePlatform | undefined
    const savedCsgo2Path = localStg.get(GAME_STORAGE_KEYS.CSGO2_PATH) as string | undefined
    const savedSteamPath = localStg.get(GAME_STORAGE_KEYS.STEAM_PATH) as string | undefined
    const savedAutomaticJoinConfig = localStg.get(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG) as Partial<Api.Game.AutomaticJoinConfig> | undefined
    const savedApplyKeyBindItems = localStg.get(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS) as Api.Game.ApplyKeyBindItem[] | undefined
    const savedSelectedStartItems = localStg.get(GAME_STORAGE_KEYS.SELECTED_START_ITEMS) as string[] | undefined
    const savedIsFullscreen = localStg.get(GAME_STORAGE_KEYS.IS_FULLSCREEN) as boolean | null
    const savedServerViewModule = localStg.get(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE) as UnionKey.ServerLayoutModule | undefined
    const savedSelectedCommunityId = localStg.get(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID) as number | null

    if (savedPlatform) gamePlatform.value = savedPlatform
    if (savedCsgo2Path) csgo2Path.value = savedCsgo2Path
    if (savedSteamPath) steamPath.value = savedSteamPath
    if (savedAutomaticJoinConfig) {
      automaticJoinConfig.value = {
        ...unref(automaticJoinConfig),
        ...savedAutomaticJoinConfig,
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
  function saveCommunityOrder(communityList: Api.Game.Community[]): void {
    const order = communityList.map(c => c.id)
    localStg.set(GAME_STORAGE_KEYS.COMMUNITY_ORDER, order)
  }

  /** 保存设置到本地存储 */
  function saveSettingsToStorage(): void {
    localStg.set(GAME_STORAGE_KEYS.GAME_PLATFORM, unref(gamePlatform))
    localStg.set(GAME_STORAGE_KEYS.CSGO2_PATH, unref(csgo2Path))
    localStg.set(GAME_STORAGE_KEYS.STEAM_PATH, unref(steamPath))
    localStg.set(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG, unref(automaticJoinConfig))
    localStg.set(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, unref(applyKeyBindItems))
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
    const selectedItems = unref(selectedStartItems)
    const index = selectedItems.indexOf(value)
    if (index > -1) {
      selectedItems.splice(index, 1)
    } else {
      selectedItems.push(value)
    }
    localStg.set(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, selectedItems)
  }

  /** 设置游戏平台 */
  function setGamePlatform(platform: GamePlatform): void {
    gamePlatform.value = platform
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
    isFullscreen.value = !unref(isFullscreen)
    localStg.set(GAME_STORAGE_KEYS.IS_FULLSCREEN, unref(isFullscreen))
  }

  /** 切换服务器视图模式 */
  function toggleServerViewModule(): void {
    const currentModule = unref(serverViewModule)
    serverViewModule.value = currentModule === 'cardModel' ? 'tableModal' : 'cardModel'
    localStg.set(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE, unref(serverViewModule))
  }

  /** 设置选中的社区ID */
  function setSelectedCommunityId(id: number): void {
    selectedCommunityId.value = id
    localStg.set(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID, id)
  }

  /** 设置自动挤服人数阈值 */
  function setJoinServerPersonValue(value: number): void {
    unref(automaticJoinConfig).joinServerPersonValue = value
    saveSettingsToStorage()
  }

  /** 设置自动挤服线程数量 */
  function setJoinServerCountValue(value: number): void {
    unref(automaticJoinConfig).joinServerCountValue = value
    saveSettingsToStorage()
  }

  /** 设置是否自动重试 */
  function setJoinServerAutoRetryValue(value: boolean): void {
    unref(automaticJoinConfig).joinServerAutoRetryValue = value
    saveSettingsToStorage()
  }

  /** 设置是否推送GIS数据 */
  function setPushGisValue(value: boolean): void {
    unref(automaticJoinConfig).pushGisValue = value
    saveSettingsToStorage()
  }

  /** 设置挤服延迟 */
  function setJoinServerDelayValue(value: number): void {
    unref(automaticJoinConfig).joinServerDelayValue = value
    saveSettingsToStorage()
  }

  return {
    loadSettingsFromStorage,
    applyCommunityOrder,
    saveCommunityOrder,
    saveSettingsToStorage,
    setApplyKeyBindItems,
    setSelectedStartItems,
    toggleStartItem,
    setGamePlatform,
    setCsgo2Path,
    setSteamPath,
    toggleFullscreen,
    toggleServerViewModule,
    setSelectedCommunityId,
    setJoinServerPersonValue,
    setJoinServerCountValue,
    setJoinServerAutoRetryValue,
    setPushGisValue,
    setJoinServerDelayValue,
  }
}
