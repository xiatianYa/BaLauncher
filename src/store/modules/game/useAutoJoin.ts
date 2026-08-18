import type { Ref } from 'vue'
import type { UserConnectionStatus } from '@/constants/cs2'

interface AutoJoinDeps {
  joinServerInfo: Ref<Api.Game.SeverVo | undefined>
  automaticJoinConfig: Ref<Api.Game.AutomaticJoinConfig>
  isAutomatic: Ref<boolean>
  isAutomaticRetry: Ref<boolean>
  /** 当前用户连接服务器状态（connecting/map_loading/in_game 视为连接进行中或已成功） */
  userConnectionStatus: Ref<UserConnectionStatus>
  safeLog: (message: string, ...args: unknown[]) => void
  /** 追加一条本地挤服日志（右侧挤服日志面板展示） */
  pushAutoJoinLog: (content: string) => void
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
    userConnectionStatus,
    safeLog,
    pushAutoJoinLog,
    ensureGameStartReady,
    connectServerUsingSteamUrl,
    resetRetryFlag,
    reportPlayerAction,
  } = deps

  /** 连接检测定时器 */
  let connectionCheckTimer: ReturnType<typeof setTimeout> | null = null

  /** 开始自动挤服 */
  async function startAutomaticJoinServer(): Promise<void> {
    // 先清除可能挂起的连接检测定时器，避免旧定时器与新挤服循环重复触发
    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer)
      connectionCheckTimer = null
    }

    const joinInfo = joinServerInfo.value
    if (!joinInfo) {
      window.$message?.error('请先选择要加入的服务器')
      return
    }

    const ready = await ensureGameStartReady()
    if (!ready) return

    isAutomatic.value = true
    resetRetryFlag()
    pushAutoJoinLog('开始自动挤服')

    try {
      const automaticJoinConfigValue = automaticJoinConfig.value
      const result = await window.ipcRenderer.invoke('start-automatic-join', {
        serverAddr: joinInfo.connectStr,
        maxPlayers: automaticJoinConfigValue.joinServerPersonValue,
        threadCount: automaticJoinConfigValue.joinServerCountValue,
        joinDelay: automaticJoinConfigValue.joinServerDelayValue,
      })

      if (result.success && result.found) {
        // 将挤服轮询获取的最新人数写回 joinServerInfo，供界面展示实时人数
        if (joinInfo && result.serverInfo) {
          joinServerInfo.value = {
            ...joinInfo,
            numPlayers: result.serverInfo.players ?? joinInfo.numPlayers,
            maxPlayers: result.serverInfo.maxPlayers ?? joinInfo.maxPlayers,
          }
        }
        isAutomaticRetry.value = true

        if (automaticJoinConfigValue.joinServerAutoRetryValue) {
          pushAutoJoinLog('发现空位，正在连接服务器')
          connectServerUsingSteamUrl()
          reportPlayerAction('加入服务器')

          // 发起连接后 30s 内未收到连接成功消息（GSI 地图匹配/日志 in_game 会清掉此定时器），则重新开始挤服；
          // 连接成功/人满重试由双通道与 connection_failed 日志路径驱动，这里只做兜底
          if (connectionCheckTimer) {
            clearTimeout(connectionCheckTimer)
            connectionCheckTimer = null
          }
          connectionCheckTimer = setTimeout(() => {
            connectionCheckTimer = null
            if (!isAutomaticRetry.value || !isAutomatic.value) return
            if (userConnectionStatus.value === 'in_game') return
            pushAutoJoinLog('30 秒内未连接成功，重新挤服')
            safeLog('⏰ 30 秒内未连接成功，重新挤服...')
            startAutomaticJoinServer()
          }, 30000)
        } else {
          isAutomatic.value = false
          isAutomaticRetry.value = false
          pushAutoJoinLog('发现空位，正在连接服务器')
          connectServerUsingSteamUrl()
          reportPlayerAction('加入服务器')
        }
      } else if (result.stopped) {
        // 仅当挤服循环确实已结束（用户手动/系统停止）时才提示；
        // 内部重启（60s 兜底、人满 3s 重试）会替换旧循环并让旧 invoke 返回 stopped，此时 isAutomaticRetry 仍为 true，不弹提示
        if (!isAutomaticRetry.value) {
          pushAutoJoinLog('已停止自动挤服')
          window.$message?.info('已停止自动挤服')
        }
      } else if (!result.success) {
        pushAutoJoinLog(`自动挤服失败：${result.error || '未知错误'}`)
        window.$message?.error(result.error || '自动挤服失败')
      }
    } catch (error) {
      console.error('自动挤服失败:', error)
      pushAutoJoinLog('自动挤服失败')
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
      if (isAutomatic.value) {
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
