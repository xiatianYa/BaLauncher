import { defineStore } from 'pinia'
import { SetupStoreId } from '@/enum'
import { ref, type Ref } from 'vue'
import { localStg } from '@/utils/storage'
import { APP_STORAGE_KEYS, GAME_STORAGE_KEYS } from '@/constants/cache'
import type { GamePlatform } from '@/constants/app'

// 音频资源
import audioSystem from '@/assets/video/系统.mp3'
import audioYuuka from '@/assets/video/优香.mp3'
import audioHoshino from '@/assets/video/星野.mp3'
import audioYuzu from '@/assets/video/柚子.mp3'
import audioAris from '@/assets/video/爱丽丝.mp3'
import audioShiroko from '@/assets/video/白子.mp3'
import audioArona from '@/assets/video/阿罗纳.mp3'

// 主题图片
import themeSystem from '@/assets/theme/系统.png'
import themeYuuka from '@/assets/theme/优香.png'
import themeHoshino from '@/assets/theme/星野.png'
import themeYuzu from '@/assets/theme/柚子.png'
import themeAris from '@/assets/theme/爱丽丝.png'
import themeShiroko from '@/assets/theme/白子.png'
import themeArona from '@/assets/theme/阿罗娜.png'

/** 自动挤服默认配置（存储无数据时的兜底值） */
const DEFAULT_AUTOMATIC_JOIN_CONFIG: Api.Game.AutomaticJoinConfig = {
  joinServerPersonValue: 63,
  joinServerCountValue: 2,
  joinServerAutoRetryValue: true,
  pushGisValue: true,
  joinServerDelayValue: 0
}

/** 读取本地存储，无值时返回兜底值 */
function getStg<T>(key: keyof StorageType.Local, fallback: T): T {
  return (localStg.get(key) ?? fallback) as T
}

/** 写入本地存储 */
function setStg(key: keyof StorageType.Local, value: any): void {
  localStg.set(key, value)
}

export const useAppStore = defineStore(SetupStoreId.App, () => {
  // ==================== 应用设置 ====================

  const currentTheme = ref(getStg(APP_STORAGE_KEYS.THEME, '阿罗娜'))
  const volume = ref(getStg(APP_STORAGE_KEYS.VOLUME, 0.5))
  const mouseCursor = ref<UnionKey.MouseCursor>(getStg(APP_STORAGE_KEYS.MOUSE_CURSOR, 'app'))
  const locale = ref<App.I18n.LangType>(getStg(APP_STORAGE_KEYS.LANG, 'zh-CN'))
  /** 明暗主题：启动时从本地存储读取，切换后持久化，避免每次启动都回退到默认深色主题 */
  const themeScheme = ref<UnionKey.ThemeScheme>(getStg<UnionKey.ThemeScheme>(APP_STORAGE_KEYS.THEME_SCHEME, 'dark'))
  const onlineUserList = ref<Api.System.OnLineUser[]>([])

  // 音频映射（key：角色名）
  const audioMap: Record<string, string> = {
    '优香': audioYuuka,
    '星野': audioHoshino,
    '柚子': audioYuzu,
    '爱丽丝': audioAris,
    '系统': audioSystem,
    '白子': audioShiroko,
    '阿罗娜': audioArona
  }

  // 主题列表
  const themes = [
    { name: '阿罗娜', img: themeArona, id: '阿罗娜' },
    { name: '优香', img: themeYuuka, id: '优香' },
    { name: '星野', img: themeHoshino, id: '星野' },
    { name: '柚子', img: themeYuzu, id: '柚子' },
    { name: '爱丽丝', img: themeAris, id: '爱丽丝' },
    { name: '白子', img: themeShiroko, id: '白子' },
    { name: '系统', img: themeSystem, id: '系统' }
  ]

  // ==================== 游戏持久化设置 ====================

  /** 游戏平台（国际服/完美服） */
  const gamePlatform = ref<GamePlatform>(getStg(GAME_STORAGE_KEYS.GAME_PLATFORM, 'international'))
  /** CS2 游戏路径 */
  const csgo2Path = ref(getStg(GAME_STORAGE_KEYS.CSGO2_PATH, ''))
  /** Steam 安装路径 */
  const steamPath = ref(getStg(GAME_STORAGE_KEYS.STEAM_PATH, ''))
  /** 自动挤服配置 */
  const automaticJoinConfig = ref<Api.Game.AutomaticJoinConfig>({
    ...DEFAULT_AUTOMATIC_JOIN_CONFIG,
    ...getStg(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG, {})
  })
  /** 按键绑定配置项 */
  const applyKeyBindItems = ref<Api.Game.ApplyKeyBindItem[]>(
    getStg<Api.Game.ApplyKeyBindItem[]>(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, []).map(item => ({
      ...item,
      // 旧版本数据无 applied 字段：旧逻辑添加绑定时会自动写入 cfg，故默认视为已应用
      applied: item.applied ?? true
    }))
  )
  /** 游戏启动项列表 */
  const selectedStartItems = ref(getStg<string[]>(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, []))
  /** 是否全屏显示服务器列表 */
  const isFullscreen = ref(getStg(GAME_STORAGE_KEYS.IS_FULLSCREEN, false))
  /** 服务器列表视图模式（卡片/表格） */
  const serverViewModule = ref<UnionKey.ServerLayoutModule>(getStg(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE, 'cardModel'))
  /** 当前选中的社区ID */
  const selectedCommunityId = ref<number | null>(getStg<number | null>(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID, null))

  // ==================== 应用设置方法 ====================

  /** 设置音量 */
  function setVolume(val: number): void {
    volume.value = val
    setStg(APP_STORAGE_KEYS.VOLUME, val)
  }

  /** 设置当前主题 */
  function setTheme(theme: string): void {
    currentTheme.value = theme
    setStg(APP_STORAGE_KEYS.THEME, theme)
  }

  /** 设置鼠标主题（app=应用主题自定义指针，system=系统默认指针） */
  function setMouseCursor(cursor: UnionKey.MouseCursor): void {
    mouseCursor.value = cursor
    setStg(APP_STORAGE_KEYS.MOUSE_CURSOR, cursor)
  }

  /** 设置明暗主题并持久化 */
  function setThemeScheme(scheme: UnionKey.ThemeScheme): void {
    themeScheme.value = scheme
    setStg(APP_STORAGE_KEYS.THEME_SCHEME, scheme)
  }

  // ==================== 游戏存储读写 ====================

  /** 保存游戏设置到本地存储 */
  function saveSettingsToStorage(): void {
    setStg(GAME_STORAGE_KEYS.GAME_PLATFORM, gamePlatform.value)
    setStg(GAME_STORAGE_KEYS.CSGO2_PATH, csgo2Path.value)
    setStg(GAME_STORAGE_KEYS.STEAM_PATH, steamPath.value)
    setStg(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG, automaticJoinConfig.value)
    setStg(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, applyKeyBindItems.value)
  }

  /** 从本地存储重新加载设置（覆盖当前值，transform 用于回填时的字段兼容） */
  function loadSettingsFromStorage(): void {
    const load = <T>(key: keyof StorageType.Local, target: Ref<T>, transform?: (v: T) => T): void => {
      const value = localStg.get(key)
      if (value != null) target.value = transform ? transform(value as T) : (value as T)
    }

    load(GAME_STORAGE_KEYS.GAME_PLATFORM, gamePlatform)
    load(GAME_STORAGE_KEYS.CSGO2_PATH, csgo2Path)
    load(GAME_STORAGE_KEYS.STEAM_PATH, steamPath)
    load(GAME_STORAGE_KEYS.AUTOMATIC_JOIN_CONFIG, automaticJoinConfig, v => ({
      ...automaticJoinConfig.value,
      ...v
    }))
    load(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, applyKeyBindItems, v =>
      v.map(item => ({ ...item, applied: item.applied ?? true }))
    )
    load(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, selectedStartItems)
    load(GAME_STORAGE_KEYS.IS_FULLSCREEN, isFullscreen)
    load(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE, serverViewModule)
    load(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID, selectedCommunityId)
  }

  /** 应用社区排序（未保存过排序则保持原顺序） */
  function applyCommunityOrder(communities: Api.Game.Community[]): Api.Game.Community[] {
    const savedOrder = getStg(GAME_STORAGE_KEYS.COMMUNITY_ORDER, [] as number[])
    if (savedOrder.length === 0) return communities

    const byId = new Map(communities.map(c => [c.id, c]))
    const sorted: Api.Game.Community[] = []
    for (const id of savedOrder) {
      const community = byId.get(id)
      if (community) {
        sorted.push(community)
        byId.delete(id)
      }
    }
    return [...sorted, ...byId.values()]
  }

  /** 保存社区排序 */
  function saveCommunityOrder(communityList: Api.Game.Community[]): void {
    setStg(GAME_STORAGE_KEYS.COMMUNITY_ORDER, communityList.map(c => c.id))
  }

  // ---- 设置 setter ----

  function setGamePlatform(platform: GamePlatform): void {
    gamePlatform.value = platform
    saveSettingsToStorage()
  }

  function setCsgo2Path(path: string): void {
    csgo2Path.value = path
    saveSettingsToStorage()
  }

  function setSteamPath(path: string): void {
    steamPath.value = path
    saveSettingsToStorage()
  }

  function setApplyKeyBindItems(items: Api.Game.ApplyKeyBindItem[]): void {
    applyKeyBindItems.value = items
    setStg(GAME_STORAGE_KEYS.APPLY_KEY_BIND_ITEMS, items)
  }

  function setSelectedStartItems(items: string[]): void {
    selectedStartItems.value = items
    setStg(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, items)
  }

  /** 切换单个启动项勾选状态 */
  function toggleStartItem(value: string): void {
    const index = selectedStartItems.value.indexOf(value)
    if (index > -1) {
      selectedStartItems.value.splice(index, 1)
    } else {
      selectedStartItems.value.push(value)
    }
    setStg(GAME_STORAGE_KEYS.SELECTED_START_ITEMS, selectedStartItems.value)
  }

  /** 切换全屏状态 */
  function toggleFullscreen(): void {
    isFullscreen.value = !isFullscreen.value
    setStg(GAME_STORAGE_KEYS.IS_FULLSCREEN, isFullscreen.value)
  }

  /** 切换服务器视图模式 */
  function toggleServerViewModule(): void {
    serverViewModule.value = serverViewModule.value === 'cardModel' ? 'tableModal' : 'cardModel'
    setStg(GAME_STORAGE_KEYS.SERVER_VIEW_MODULE, serverViewModule.value)
  }

  function setSelectedCommunityId(id: number): void {
    selectedCommunityId.value = id
    setStg(GAME_STORAGE_KEYS.SELECTED_COMMUNITY_ID, id)
  }

  // ---- 自动挤服配置 setter ----

  /** 局部更新自动挤服配置并持久化 */
  function updateJoinConfig(patch: Partial<Api.Game.AutomaticJoinConfig>): void {
    automaticJoinConfig.value = { ...automaticJoinConfig.value, ...patch }
    saveSettingsToStorage()
  }

  const setJoinServerPersonValue = (value: number): void => updateJoinConfig({ joinServerPersonValue: value })
  const setJoinServerCountValue = (value: number): void => updateJoinConfig({ joinServerCountValue: value })
  const setJoinServerAutoRetryValue = (value: boolean): void => updateJoinConfig({ joinServerAutoRetryValue: value })
  const setPushGisValue = (value: boolean): void => updateJoinConfig({ pushGisValue: value })
  const setJoinServerDelayValue = (value: number): void => updateJoinConfig({ joinServerDelayValue: value })

  return {
    // ---- 应用设置 ----
    currentTheme,
    audioMap,
    themes,
    locale,
    onlineUserList,
    volume,
    mouseCursor,
    themeScheme,
    setTheme,
    setVolume,
    setMouseCursor,
    setThemeScheme,

    // ---- 游戏持久化设置 ----
    gamePlatform,
    csgo2Path,
    steamPath,
    automaticJoinConfig,
    applyKeyBindItems,
    selectedStartItems,
    isFullscreen,
    serverViewModule,
    selectedCommunityId,

    // ---- 游戏存储读写 ----
    loadSettingsFromStorage,
    saveSettingsToStorage,
    applyCommunityOrder,
    saveCommunityOrder,
    setGamePlatform,
    setCsgo2Path,
    setSteamPath,
    setApplyKeyBindItems,
    setSelectedStartItems,
    toggleStartItem,
    toggleFullscreen,
    toggleServerViewModule,
    setSelectedCommunityId,
    setJoinServerPersonValue,
    setJoinServerCountValue,
    setJoinServerAutoRetryValue,
    setPushGisValue,
    setJoinServerDelayValue
  }
})
