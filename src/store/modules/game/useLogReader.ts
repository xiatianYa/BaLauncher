import { unref } from 'vue'
import type { Ref } from 'vue'
import { LOG_PATTERNS, UserConnectionStatus } from '@/constants/cs2'

type MaybeRef<T> = T | Ref<T>

interface LogReaderDeps {
  csgo2Path: MaybeRef<string>
  isLogReading: MaybeRef<boolean>
  userConnectionStatus: MaybeRef<UserConnectionStatus>
  isAutomatic: MaybeRef<boolean>
  automaticJoinConfig: MaybeRef<Api.Game.AutomaticJoinConfig>
  safeLog: (message: string, ...args: unknown[]) => void
  startAutomaticJoinServer: () => Promise<void>
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
    startAutomaticJoinServer,
  } = deps

  /** 防止 connection_failed 重复触发重试的标志 */
  let hasRetriedForThisConnection = false

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
        message: `正在加载地图: ${mapMatch[1]}`
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
        ;(userConnectionStatus as Ref<UserConnectionStatus>).value = logContent.status

        switch (logContent.status) {
          case 'in_game':
            safeLog('✅ 用户已成功进入游戏')
            hasRetriedForThisConnection = false
            break
          case 'connection_failed':
            safeLog('❌ 服务器已满员，连接被拒绝')
            if (unref(isAutomatic) && unref(automaticJoinConfig).joinServerAutoRetryValue && !hasRetriedForThisConnection) {
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
    if (!unref(csgo2Path)) {
      console.error('未配置 CS2 路径，无法开始读取日志')
      return
    }

    try {
      const result = await window.ipcRenderer.invoke('start-log-reader', unref(csgo2Path), delayMs)
      if (result.success) {
        ;(isLogReading as Ref<boolean>).value = true
        listenToConsoleLog()
        safeLog('开始读取日志')
      }
    } catch (error) {
      console.error('开始读取日志失败:', error)
    }
  }

  /** 停止读取游戏日志 */
  async function stopLogReading(): Promise<void> {
    if (!unref(isLogReading)) return

    try {
      await window.ipcRenderer.invoke('stop-log-reader')
      ;(isLogReading as Ref<boolean>).value = false
      ;(userConnectionStatus as Ref<UserConnectionStatus>).value = 'idle'
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