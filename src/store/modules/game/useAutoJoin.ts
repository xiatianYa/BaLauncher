import { unref } from 'vue'
import type { Ref } from 'vue'

type MaybeRef<T> = T | Ref<T>

interface AutoJoinDeps {
  joinServerInfo: MaybeRef<Api.Game.SeverVo | undefined>
  automaticJoinConfig: MaybeRef<Api.Game.AutomaticJoinConfig>
  isAutomatic: MaybeRef<boolean>
  isAutomaticRetry: MaybeRef<boolean>
  automaticCount: MaybeRef<number>
  safeLog: (message: string, ...args: unknown[]) => void
  ensureGameStartReady: () => Promise<boolean>
  connectServerUsingSteamUrl: () => Promise<void>
  resetRetryFlag: () => void
}

/**
 * 自动挤服相关逻辑
 * 负责多线程挤服、监控服务器空位等
 */
export function useAutoJoin(deps: AutoJoinDeps) {
  const {
    joinServerInfo,
    automaticJoinConfig,
    isAutomatic,
    isAutomaticRetry,
    automaticCount,
    safeLog,
    ensureGameStartReady,
    connectServerUsingSteamUrl,
    resetRetryFlag,
  } = deps

  /** 连接检测定时器 */
  let connectionCheckTimer: ReturnType<typeof setTimeout> | null = null

  /** 开始自动挤服 */
  async function startAutomaticJoinServer(): Promise<void> {
    const joinInfo = unref(joinServerInfo)
    if (!joinInfo) {
      window.$message?.error('请先选择要加入的服务器')
      return
    }

    const ready = await ensureGameStartReady()
    if (!ready) return

    ;(isAutomatic as Ref<boolean>).value = true
    ;(automaticCount as Ref<number>).value = 0
    resetRetryFlag()

    try {
      const automaticJoinConfigValue = unref(automaticJoinConfig)
      const result = await window.ipcRenderer.invoke('start-automatic-join', {
        serverAddr: joinInfo.connectStr,
        maxPlayers: automaticJoinConfigValue.joinServerPersonValue,
        threadCount: automaticJoinConfigValue.joinServerCountValue,
        joinDelay: automaticJoinConfigValue.joinServerDelayValue
      })

      if (result.success && result.found) {
        ;(isAutomaticRetry as Ref<boolean>).value = true

        if (automaticJoinConfigValue.joinServerAutoRetryValue) {
          connectServerUsingSteamUrl()

          if (connectionCheckTimer) {
            clearTimeout(connectionCheckTimer)
            connectionCheckTimer = null
          }

          connectionCheckTimer = setTimeout(() => {
            if (unref(isAutomaticRetry) && unref(isAutomatic)) {
              safeLog('⏰ 连接超时，重新尝试连接...')
              startAutomaticJoinServer()
            }
          }, 60000)
        } else {
          ;(isAutomatic as Ref<boolean>).value = false
          ;(isAutomaticRetry as Ref<boolean>).value = false
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

  /** 暂停自动挤服（仅清除连接检测定时器） */
  function pauseAutomaticJoinServer(): void {
    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer)
      connectionCheckTimer = null
    }
    ;(isAutomaticRetry as Ref<boolean>).value = false
  }

  /** 停止自动挤服 */
  async function stopAutomaticJoinServer(): Promise<void> {
    ;(isAutomaticRetry as Ref<boolean>).value = false

    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer)
      connectionCheckTimer = null
    }

    try {
      if (unref(isAutomatic)) {
        await window.ipcRenderer.invoke('stop-automatic-join')
        ;(isAutomatic as Ref<boolean>).value = false
      }
    } catch (error) {
      console.error('停止自动挤服失败:', error)
    }
  }

  return {
    startAutomaticJoinServer,
    pauseAutomaticJoinServer,
    stopAutomaticJoinServer,
  }
}