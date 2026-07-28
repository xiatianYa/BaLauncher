import { unref } from 'vue'
import type { Ref } from 'vue'
import { localStg } from '@/utils/storage'
import { GAME_STORAGE_KEYS } from '@/constants/cache'
import type { GamePlatform } from '@/constants/app'

type MaybeRef<T> = T | Ref<T>

interface StorageDeps {
  gamePlatform: MaybeRef<GamePlatform>
  csgo2Path: MaybeRef<string>
  steamPath: MaybeRef<string>
  automaticJoinConfig: MaybeRef<Api.Game.AutomaticJoinConfig>
  applyKeyBindItems: MaybeRef<Api.Game.ApplyKeyBindItem[]>
  selectedStartItems: MaybeRef<string[]>
  isFullscreen: MaybeRef<boolean>
  serverViewModule: MaybeRef<UnionKey.ServerLayoutModule>
  selectedCommunityId: MaybeRef<number | null>
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
    const savedPlatform = localStg.get(GAME_STORAGE_KEYS.GAME_PLATFORM)
    const savedCsgo2Path = localStg.get(GAME_STORAGE_KEYS.CSGO2_PATH)
    const savedSteamPath = localStg.get(GAME_STORAGE_KEYS.STEAM_PATH)
    const savedAutomaticJoinConfig = localStg.get(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG)
    const savedApplyKeyBindItems = localStg.get(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS)
    const savedSelectedStartItems = localStg.get(GAME_STORAGE_KEYS.SELECTED_START_ITEMS)
    const savedIsFullscreen = localStg.get(GAME_STORAGE_KEYS.IS_FULLSCREEN)
    const savedServerViewModule = localStg.get(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE)
    const savedSelectedCommunityId = localStg.get(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID)

    if (savedPlatform) (gamePlatform as Ref<GamePlatform>).value = savedPlatform as GamePlatform
    if (savedCsgo2Path) (csgo2Path as Ref<string>).value = savedCsgo2Path
    if (savedSteamPath) (steamPath as Ref<string>).value = savedSteamPath
    if (savedAutomaticJoinConfig) {
      ;(automaticJoinConfig as Ref<Api.Game.AutomaticJoinConfig>).value = {
        ...unref(automaticJoinConfig),
        ...savedAutomaticJoinConfig
      }
    }
    if (savedApplyKeyBindItems) (applyKeyBindItems as Ref<Api.Game.ApplyKeyBindItem[]>).value = savedApplyKeyBindItems
    if (savedSelectedStartItems) (selectedStartItems as Ref<string[]>).value = savedSelectedStartItems
    if (savedIsFullscreen !== null) (isFullscreen as Ref<boolean>).value = savedIsFullscreen
    if (savedServerViewModule) (serverViewModule as Ref<UnionKey.ServerLayoutModule>).value = savedServerViewModule
    if (savedSelectedCommunityId !== null) (selectedCommunityId as Ref<number | null>).value = savedSelectedCommunityId
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
    ;(applyKeyBindItems as Ref<Api.Game.ApplyKeyBindItem[]>).value = items
    localStg.set(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, items)
  }

  /** 设置已勾选的启动项 */
  function setSelectedStartItems(items: string[]): void {
    ;(selectedStartItems as Ref<string[]>).value = items
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
    ;(gamePlatform as Ref<GamePlatform>).value = platform
    saveSettingsToStorage()
  }

  /** 设置CS2路径 */
  function setCsgo2Path(path: string): void {
    ;(csgo2Path as Ref<string>).value = path
    saveSettingsToStorage()
  }

  /** 设置Steam路径 */
  function setSteamPath(path: string): void {
    ;(steamPath as Ref<string>).value = path
    saveSettingsToStorage()
  }

  /** 切换全屏状态 */
  function toggleFullscreen(): void {
    ;(isFullscreen as Ref<boolean>).value = !unref(isFullscreen)
    localStg.set(GAME_STORAGE_KEYS.IS_FULLSCREEN, unref(isFullscreen))
  }

  /** 切换服务器视图模式 */
  function toggleServerViewModule(): void {
    const currentModule = unref(serverViewModule)
    ;(serverViewModule as Ref<UnionKey.ServerLayoutModule>).value = currentModule === 'cardModel' ? 'tableModal' : 'cardModel'
    localStg.set(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE, unref(serverViewModule))
  }

  /** 设置选中的社区ID */
  function setSelectedCommunityId(id: number): void {
    ;(selectedCommunityId as Ref<number | null>).value = id
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