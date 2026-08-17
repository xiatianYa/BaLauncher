import type { Ref } from 'vue'
import type { GamePlatform } from '@/constants/app'
import { reportPlayerQuit } from '@/utils/ws/server'

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
  connectToServerById: (serverId: number) => void
  /** 记录发起了一次连接（用于后续区分连接成功是否来自连接器） */
  markConnectAttempt: () => void
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
    markConnectAttempt,
  } = deps

  /** 游戏状态检查定时器 */
  let gameCheckTimer: ReturnType<typeof setInterval> | null = null

  /** 是否已弹窗提示过 GSI 服务未启动（避免 10 秒轮询反复打扰；服务启动成功后重置） */
  let gsiIssueNotified = false

  // ===== 游戏状态检查 =====

  /** 检查游戏是否运行中 */
  async function checkGameRunning(): Promise<void> {
    try {
      // 记录本轮检查前的运行状态，用于检测"运行中 → 已关闭"的跳变
      const wasRunning = isGameRunning.value
      const { isRunning } = await window.ipcRenderer.checkCsgo2Running()
      isGameRunning.value = isRunning

      // 用户关闭游戏（进程退出）时上报退出事件 type 113
      if (wasRunning && !isRunning) {
        safeLog('🛑 检测到游戏已关闭')
        reportPlayerQuit()
      }

      // GSI 服务与应用生命周期解耦：应用可用后持续保活，游戏启动即可推送数据，
      // 避免"游戏先于应用运行"（如首次使用）时服务未启动
      const { isConnected } = await window.ipcRenderer.checkGsiConnected()
      if (!isConnected) {
        const gsiResult = await window.ipcRenderer.startGsiService()
        if (gsiResult.success) {
          // 服务启动成功，重置提示标记，后续再次异常仍可提示
          gsiIssueNotified = false
          safeLog('GSI 服务已启动')
        } else {
          safeLog('GSI 服务启动失败，将在下一轮检查中自动重试:', gsiResult.error)
          // 游戏已运行但 GSI 服务未能启动时，一次性弹窗提示（避免每轮检查反复打扰）
          if (isRunning && !gsiIssueNotified) {
            gsiIssueNotified = true
            safeLog('检测到游戏已运行，但 GSI 服务未启动，请使用登录器重启游戏')
            window.$notification?.error({
              title: 'GSI 服务未启动',
              content: '检测到游戏已运行，但 GSI 服务未启动，请使用登录器重启游戏',
              duration: 5000,
            })
          }
        }
      }
      // 确保渲染端 GSI 监听已注册（幂等；热更新导致监听丢失后也能自动恢复）
      if (!isGsiRunning.value) {
        listenToGsiData()
      }

      // 日志读取依赖游戏控制台文件：仅游戏运行时保持，未启动则主动拉起
      if (isGameRunning.value) {
        if (!isLogReading.value) {
          await startLogReading()
        }
      } else {
        stopAutomaticJoinServer()
        if (isLogReading.value) {
          await stopLogReading()
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

  // ===== 游戏启动 =====

  /** 检查游戏启动前的准备工作（GSI 配置已在应用启动时同步，此处仅校验路径） */
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

    return true
  }

  /** 启动游戏 */
  async function startGame(): Promise<boolean> {
    const ready = await ensureGameStartReady()
    if (!ready) return false

    isGameLaunching.value = true
    const serverMode = gamePlatform.value === 'perfect' ? 'perfectworld' : 'worldwide'
    const startType: 'steamurl' | 'steamexe' = isGameRunning.value ? 'steamurl' : 'steamexe'

    const launchResult = await window.ipcRenderer.launchCs2(
      csgo2Path.value,
      serverMode,
      startType,
      steamPath.value,
      [...selectedStartItems.value],
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

  // ===== 连接服务器 =====

  /** 使用 Steam URL 连接服务器 */
  async function connectServerUsingSteamUrl(): Promise<void> {
    const joinInfo = joinServerInfo.value
    if (!joinInfo) return
    const ready = await ensureGameStartReady()
    if (!ready) return

    // 记录发起连接的时间戳：连接成功（日志 in_game / GSI 地图匹配）后才调用 markJoinRequested，
    // 通过该时间戳区分本次连接成功是否来自连接器，避免玩家自行进入其他服务器时误触发退出上报抑制
    markConnectAttempt()
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
