import type { Ref } from 'vue'
import { LOG_PATTERNS, UserConnectionStatus } from '@/constants/cs2'
import { reportPlayerQuit } from '@/utils/ws/server'

interface LogReaderDeps {
  csgo2Path: Ref<string>
  isLogReading: Ref<boolean>
  userConnectionStatus: Ref<UserConnectionStatus>
  isAutomatic: Ref<boolean>
  automaticJoinConfig: Ref<Api.Game.AutomaticJoinConfig>
  safeLog: (message: string, ...args: unknown[]) => void
  /** 追加一条本地挤服日志（右侧挤服日志面板展示） */
  pushAutoJoinLog: (content: string) => void
  startAutomaticJoinServer: () => Promise<void>
  /** 停止自动挤服（进入游戏判定连接成功后调用） */
  stopAutomaticJoinServer: () => Promise<void>
  /** 标记已连接成功（仅连接器发起的连接成功后才调用） */
  markJoinRequested: () => void
}

/**
 * 日志读取和解析相关逻辑
 * 负责监听 CS2 控制台日志，解析游戏状态变化
 */
export function useLogReader(deps: LogReaderDeps) {
  const {
    csgo2Path,
    isLogReading,
    userConnectionStatus,
    isAutomatic,
    automaticJoinConfig,
    safeLog,
    pushAutoJoinLog,
    startAutomaticJoinServer,
    stopAutomaticJoinServer,
    markJoinRequested,
  } = deps

  /** 防止 connection_failed 重复触发重试的标志 */
  let hasRetriedForThisConnection = false

  /**
   * 是否跳过首个日志事件。
   * 主进程 logReader 每次启动都会从文件头（position 0）读取，因此首个事件是整份历史日志快照；
   * 快照中的旧状态行（in_game/connecting 等）不应触发挤服停止/重启/退出上报等副作用。
   */
  let skipSnapshotEvent = true

  /** 控制台日志事件处理器 */
  let consoleLogHandler: ((_event: unknown, logData: string) => void) | null = null

  /** 解析单行日志 */
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
        message: `正在加载地图: ${mapMatch[1]}`,
      }
    }

    return null
  }

  /** 解析日志内容 */
  function parseLogContent(logContent: string): ReturnType<typeof parseLogLine> {
    const lines = logContent.split('\n').reverse()

    for (const line of lines) {
      const result = parseLogLine(line)
      if (result) return result
    }

    return null
  }

  /** 监听控制台日志 */
  function listenToConsoleLog(): void {
    // 每次启动日志读取都重置快照跳过标志（主进程从文件头重新读取）
    skipSnapshotEvent = true

    // 防止重复注册：已存在监听时先移除旧的处理器，避免 ipcRenderer.on 叠加导致事件被重复处理
    removeConsoleLogListener()

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
        // 首个事件是启动时读取的全量历史快照，忽略其中的状态，避免误触发挤服停止/重启/退出上报
        if (skipSnapshotEvent) {
          skipSnapshotEvent = false
          return
        }

        userConnectionStatus.value = logContent.status

        switch (logContent.status) {
          case 'in_game':
            safeLog('✅ 用户已成功进入游戏')
            pushAutoJoinLog('连接成功，已进入游戏')
            // 仅当本次连接由连接器发起（正在自动挤服）时才标记加入请求，
            // 否则玩家自行进入其他服务器时也会触发，导致误抑制退出上报
            if (isAutomatic.value) {
              markJoinRequested()
            }
            hasRetriedForThisConnection = false
            // 双通道成功检测：进入游戏即判定连接成功，停止自动挤服
            stopAutomaticJoinServer()
            break
          case 'connection_failed':
            safeLog('❌ 服务器已满员，连接被拒绝')
            pushAutoJoinLog('服务器已满员，连接被拒绝')
            if (isAutomatic.value && automaticJoinConfig.value.joinServerAutoRetryValue && !hasRetriedForThisConnection) {
              hasRetriedForThisConnection = true
              // 人满被拒后等待 5s 冷却再重新挤服，避免高频重复 connect；期间若用户停止挤服则不再重启
              window.setTimeout(() => {
                if (isAutomatic.value) {
                  startAutomaticJoinServer()
                }
              }, 5000)
            }
            break
          case 'map_loading':
            safeLog('📦 用户正在加载地图')
            pushAutoJoinLog('正在加载地图')
            break
          case 'connecting':
            safeLog('🔗 用户正在连接服务器')
            pushAutoJoinLog('正在连接服务器')
            break
          case 'disconnected':
            safeLog('🔌 用户已断开连接')
            pushAutoJoinLog('已断开连接')
            // 用户退出服务器/退出游戏，上报 type 113
            reportPlayerQuit()
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

  /** 开始读取游戏日志 */
  async function startLogReading(delayMs = 5000): Promise<void> {
    if (!csgo2Path.value) {
      // 首次使用未配置游戏路径时给出明确提示，避免服务"似乎未运行"却无任何反馈
      safeLog('未配置 CS2 路径，无法开始读取日志（请在设置中配置游戏路径）')
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

  /** 重置重试标志（供外部调用，如开始自动挤服时重置） */
  function resetRetryFlag(): void {
    hasRetriedForThisConnection = false
  }

  return {
    startLogReading,
    stopLogReading,
    listenToConsoleLog,
    removeConsoleLogListener,
    resetRetryFlag,
  }
}
