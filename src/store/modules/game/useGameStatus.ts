import { unref } from 'vue'
import type { Ref } from 'vue'
import type { GamePlatform } from '@/constants/app'

/** 游戏状态检查间隔（毫秒） */
const GAME_CHECK_INTERVAL = 10000

interface GameStatusDeps {
  isGameRunning: Ref<boolean>
  isGameLaunching: Ref<boolean>
  isGsiRunning: Ref<boolean>
  isLogReading: Ref<boolean>
  csgo2Path: Ref<string>
  steamPath: Ref<string>
  gamePlatform: Ref<GamePlatform>
  selectedStartItems: Ref<string[]>
  joinServerInfo: Ref<Api.Game.SeverVo | undefined>
  safeLog: (message: string, ...args: unknown[]) => void
  listenToGsiData: () => void
  removeGsiDataListener: () => void
  startLogReading: (delayMs?: number) => Promise<void>
  stopLogReading: () => Promise<void>
  stopAutomaticJoinServer: () => Promise<void>
  connectServerUsingSteamUrl: () => Promise<void>
  connectToServerById: (serverId: number) => void
  /** 标记已发起加入服务器请求（用于抑制 10s 内的退出上报） */
  markJoinRequested: () => void
}

/**
 * 游戏状态检查与启动相关逻辑
 * 负责定期检查游戏运行状态、启动游戏等
 */
export function useGameStatus(deps: GameStatusDeps) {
  const {
    isGameRunning,
    isGameLaunching,
    isGsiRunning,
    isLogReading,
    csgo2Path,
    steamPath,
    gamePlatform,
    selectedStartItems,
    joinServerInfo,
    safeLog,
    listenToGsiData,
    removeGsiDataListener,
    startLogReading,
    stopLogReading,
    stopAutomaticJoinServer,
    connectToServerById,
    markJoinRequested,
  } = deps

  /** 游戏状态检查定时器 */
  let gameCheckTimer: ReturnType<typeof setInterval> | null = null

  /** 检查游戏是否运行中 */
  async function checkGameRunning(): Promise<void> {
    try {
      const { isRunning } = await window.ipcRenderer.checkCsgo2Running()
      isGameRunning.value = isRunning

      if (unref(isGameRunning)) {
        const { exists } = await window.ipcRenderer.checkGsiConfig(unref(csgo2Path))
        if (!exists) return

        const { isConnected } = await window.ipcRenderer.checkGsiConnected()
        if (!isConnected) {
          await window.ipcRenderer.startGsiService()
          safeLog('GSI 服务已启动')
          listenToGsiData()
        }

        if (!unref(isLogReading)) {
          startLogReading()
        }
      } else {
        stopAutomaticJoinServer()
        const gsiConnected = await window.ipcRenderer.stopGsiService()
        if (!gsiConnected && unref(isGsiRunning)) {
          isGsiRunning.value = false
          removeGsiDataListener()
        }
        if (unref(isLogReading)) {
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

  /** 检查游戏启动前的准备工作 */
  async function ensureGameStartReady(): Promise<boolean> {
    if (!unref(csgo2Path)) {
      console.error('未配置 CS2 路径，请在设置中配置')
      window.$message?.error('未配置 CS2 路径，请在设置中配置')
      return false
    }

    if (!unref(steamPath)) {
      console.error('未配置 Steam 路径，请在设置中配置')
      window.$message?.error('未配置 Steam 路径，请在设置中配置')
      return false
    }

    const csgo2PathValue = unref(csgo2Path)
    const { exists } = await window.ipcRenderer.checkGsiConfig(csgo2PathValue)
    if (!exists) {
      const { success } = await window.ipcRenderer.createGsiConfig(csgo2PathValue)
      if (!success) {
        window.$message?.error('GSI 配置文件创建失败，部分功能可能无法使用')
      }
    }

    return true
  }

  /** 启动游戏 */
  async function startGame(): Promise<boolean> {
    const ready = await ensureGameStartReady()
    if (!ready) return false

    isGameLaunching.value = true
    const serverMode = unref(gamePlatform) === 'perfect' ? 'perfectworld' : 'worldwide'
    const startType: 'steamurl' | 'steamexe' = unref(isGameRunning) ? 'steamurl' : 'steamexe'

    const launchResult = await window.ipcRenderer.launchCs2(
      unref(csgo2Path),
      serverMode,
      startType,
      unref(steamPath),
      [...unref(selectedStartItems)],
    )

    if (!launchResult.success) {
      window.$message?.error('启动游戏失败: ' + launchResult.error)
      isGameLaunching.value = false
      return false
    }

    const waitResult = await window.ipcRenderer.waitForCs2Launch(unref(csgo2Path))
    if (!waitResult.success) {
      window.$message?.error('等待游戏启动超时')
      isGameLaunching.value = false
      return false
    }

    isGameLaunching.value = false
    return true
  }

  /** 使用Steam URL连接服务器 */
  async function connectServerUsingSteamUrl(): Promise<void> {
    const joinInfo = unref(joinServerInfo)
    if (!joinInfo) return
    const ready = await ensureGameStartReady()
    if (!ready) return

    // 标记已发起加入服务器请求：10s 内抑制退出上报，避免切服时 GIS 数据被误清
    markJoinRequested()
    connectToServerById(joinInfo.serverId)
    const aLink = document.createElement('a')
    aLink.href = `steam://rungame/730/76561198977557298/+connect ${joinInfo.connectStr}`
    aLink.click()
  }

  return {
    checkGameRunning,
    startGameRunningCheck,
    stopGameRunningCheck,
    ensureGameStartReady,
    startGame,
    connectServerUsingSteamUrl,
  }
}
