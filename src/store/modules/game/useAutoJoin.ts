import { unref } from 'vue'
import type { Ref } from 'vue'

interface AutoJoinDeps {
  joinServerInfo: Ref<Api.Game.SeverVo | undefined>
  automaticJoinConfig: Ref<Api.Game.AutomaticJoinConfig>
  isAutomatic: Ref<boolean>
  isAutomaticRetry: Ref<boolean>
  automaticCount: Ref<number>
  safeLog: (message: string, ...args: unknown[]) => void
  ensureGameStartReady: () => Promise<boolean>
  connectServerUsingSteamUrl: () => Promise<void>
  resetRetryFlag: () => void
  /** 上报玩家操作动态（CODE_PLAYER_ACTION）：参数为操作内容，服务器ID取自 joinServerInfo */
  reportPlayerAction: (actionContent: string) => void
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
    reportPlayerAction,
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

    isAutomatic.value = true
    automaticCount.value = 0
    resetRetryFlag()

    try {
      const automaticJoinConfigValue = unref(automaticJoinConfig)
      const result = await window.ipcRenderer.invoke('start-automatic-join', {
        serverAddr: joinInfo.connectStr,
        maxPlayers: automaticJoinConfigValue.joinServerPersonValue,
        threadCount: automaticJoinConfigValue.joinServerCountValue,
        joinDelay: automaticJoinConfigValue.joinServerDelayValue,
      })

      if (result.success && result.found) {
        isAutomaticRetry.value = true

        if (automaticJoinConfigValue.joinServerAutoRetryValue) {
          connectServerUsingSteamUrl()
          reportPlayerAction('加入服务器')

          if (connectionCheckTimer) {
            clearTimeout(connectionCheckTimer)
            connectionCheckTimer = null
          }

          // 发起连接后 10s 内未收到连接成功消息（GSI 地图匹配会清掉此定时器），则重新开始挤服
          connectionCheckTimer = setTimeout(() => {
            if (unref(isAutomaticRetry) && unref(isAutomatic)) {
              safeLog('⏰ 10 秒内未连接成功，重新挤服...')
              startAutomaticJoinServer()
            }
          }, 10000)
        } else {
          isAutomatic.value = false
          isAutomaticRetry.value = false
          connectServerUsingSteamUrl()
          reportPlayerAction('加入服务器')
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
    isAutomaticRetry.value = false
  }

  /** 停止自动挤服 */
  async function stopAutomaticJoinServer(): Promise<void> {
    isAutomaticRetry.value = false

    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer)
      connectionCheckTimer = null
    }

    try {
      if (unref(isAutomatic)) {
        await window.ipcRenderer.invoke('stop-automatic-join')
        isAutomatic.value = false
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
