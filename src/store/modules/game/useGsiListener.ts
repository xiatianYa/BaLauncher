import { unref } from 'vue'
import type { Ref } from 'vue'
import { useAppStore } from '../app'

type MaybeRef<T> = T | Ref<T>

interface GsiListenerDeps {
  isGsiRunning: MaybeRef<boolean>
  gameServerInfo: MaybeRef<Api.Game.ServerInfoData>
  gamePlayerInfo: MaybeRef<Api.Game.CsgoPlayer>
  joinServerInfo: MaybeRef<Api.Game.SeverVo | undefined>
  isAutomatic: MaybeRef<boolean>
  isJoinServerTrayVisible: MaybeRef<boolean>
  currentAutomaticPlayerDynamicList: MaybeRef<string[]>
  currentGisPlayerList: MaybeRef<Api.Game.CsgoPlayer[]>
  safeLog: (message: string, ...args: unknown[]) => void
  stopAutomaticJoinServer: () => Promise<void>
  sendPlayerData: (player: Api.Game.CsgoPlayer) => void
  sendServerData: (server: Api.Game.ServerInfoData) => void
}

/**
 * GSI 数据监听相关逻辑
 * 负责监听和处理 CS2 GSI（Game State Integration）事件
 */
export function useGsiListener(deps: GsiListenerDeps) {
  const {
    isGsiRunning,
    gameServerInfo,
    gamePlayerInfo,
    joinServerInfo,
    isAutomatic,
    isJoinServerTrayVisible,
    currentAutomaticPlayerDynamicList,
    safeLog,
    stopAutomaticJoinServer,
    sendPlayerData,
    sendServerData,
  } = deps

  /** GSI数据事件处理器 */
  let gsiDataHandler: ((_event: unknown, res: unknown) => void) | null = null

  /** 监听GSI数据 */
  function listenToGsiData(): void {
    safeLog('开始监听 GSI 数据')
    ;(isGsiRunning as Ref<boolean>).value = true

    gsiDataHandler = (_event, res: any) => {
      const { eventName, data } = res

      switch (eventName) {
        case 'map:nameChanged':
          safeLog('🗺️ [Map:地图名称变更] - 当前游戏地图已切换', {
            '原地图': data.previous || '无',
            '当前地图': data.current,
            '目标服务器地图': unref(joinServerInfo)?.mapName || '未设置'
          })
          const targetMap = unref(joinServerInfo)?.mapName
          const currentMap = data.current
          if (targetMap && currentMap && (targetMap.includes(currentMap) || currentMap.includes(targetMap)) && unref(isAutomatic)) {
            safeLog('✅ 用户已成功连接到目标服务器')
            ;(isJoinServerTrayVisible as Ref<boolean>).value = false
            const dynamicList = unref(currentAutomaticPlayerDynamicList)
            dynamicList.splice(0, dynamicList.length)
            stopAutomaticJoinServer()

            const appStore = useAppStore()
            const currentTheme = appStore.currentTheme
            const audioSrc = appStore.audioMap[currentTheme] || appStore.audioMap['阿罗娜']
            const audio = new Audio(audioSrc)
            audio.volume = appStore.volume
            audio.play()
            window.$message?.success('连接成功')
          }
          break

        case 'map:phaseChanged':
          safeLog('🎯 [Map:阶段变更] - 游戏阶段已更新', data.current, data.previous)
          unref(gameServerInfo).mapPhase = data.current
          sendServerData(unref(gameServerInfo))
          break

        case 'map:roundChanged':
          safeLog('🔄 [Map:回合变更] - 回合数已更新', data.current, data.previous)
          unref(gameServerInfo).round = data.current
          sendServerData(unref(gameServerInfo))
          break

        case 'map:teamCTScoreChanged':
          safeLog('🔵 [Map:CT分数变更] - CT阵营分数已更新', data.current, data.previous)
          unref(gameServerInfo).CTScore = data.current
          sendServerData(unref(gameServerInfo))
          break

        case 'map:teamTScoreChanged':
          safeLog('🟠 [Map:T分数变更] - T阵营分数已更新', data.current, data.previous)
          unref(gameServerInfo).TScore = data.current
          sendServerData(unref(gameServerInfo))
          break
        case 'round:phaseChanged':
          safeLog('🎯 [Round:阶段变更] - 游戏回合阶段已更新', data.current, data.previous)
          unref(gameServerInfo).mapPhase = data.current
          sendServerData(unref(gameServerInfo))
          break
        case 'round:started':
          safeLog('⏱️ [Round:开始] - 游戏回合已开始', data.current, data.previous)
          unref(gameServerInfo).mapPhase = data.current
          sendServerData(unref(gameServerInfo))
          break
        case 'round:ended':
          safeLog('⏱️ [Round:结束] - 游戏回合已结束', data.current, data.previous)
          unref(gameServerInfo).mapPhase = data.current
          sendServerData(unref(gameServerInfo))
          break

        case 'player:teamChanged':
          safeLog('👥 [Player:阵营变更] - 玩家所属阵营已切换', data.current, data.previous)
          unref(gamePlayerInfo).team = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:hpChanged':
          safeLog('❤️ [Player:生命值变更] - 玩家生命值已更新', data.current, data.previous)
          unref(gamePlayerInfo).health = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:armorChanged':
          safeLog('🛡️ [Player:护甲值变更] - 玩家护甲值已更新', data.current, data.previous)
          unref(gamePlayerInfo).armor = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:helmetChanged':
          safeLog('⛑️ [Player:头盔变更] - 玩家头盔状态已更新', data.current, data.previous)
          unref(gamePlayerInfo).helmet = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:moneyChanged':
          safeLog('💰 [Player:金钱变更] - 玩家金钱已更新', data.current, data.previous)
          unref(gamePlayerInfo).money = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:equipmentValueChanged':
          safeLog('💎 [Player:装备价值变更] - 玩家装备价值已更新', data.current, data.previous)
          unref(gamePlayerInfo).equipValue = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:weaponChanged':
          safeLog('🔫 [Player:武器变更] - 玩家武器已更新', data.current, data.previous)
          unref(gamePlayerInfo).weapon = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:ammoClipChanged':
          safeLog('📦 [Player:弹夹弹药变更] - 玩家弹夹弹药已更新', data.current, data.previous)
          unref(gamePlayerInfo).clipAmmo = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:ammoReserveChanged':
          safeLog('🎒 [Player:备用弹药变更] - 玩家备用弹药已更新', data.current, data.previous)
          unref(gamePlayerInfo).reserveAmmo = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:killsChanged':
          safeLog('💀 [Player:击杀数变更] - 玩家击杀数已更新', data.current, data.previous)
          unref(gamePlayerInfo).kills = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'player:scoreChanged':
          safeLog('📊 [Player:分数变更] - 玩家分数已更新', data.current, data.previous)
          unref(gamePlayerInfo).score = data.current
          sendPlayerData(unref(gamePlayerInfo))
          break

        case 'provider:timestampChanged':
          safeLog('⏰ [Provider:时间戳变更] - 更新服务器时间戳', data.current, data.previous)
          break
        default:
          safeLog('❓ [未知事件]', { eventName, data })
      }
    }

    window.ipcRenderer.on('cs2-gsi-data', gsiDataHandler)
  }

  /** 移除GSI数据监听 */
  function removeGsiDataListener(): void {
    if (gsiDataHandler) {
      window.ipcRenderer.off('cs2-gsi-data', gsiDataHandler)
      safeLog('✅ GSI 数据监听已移除')
      gsiDataHandler = null
    }
  }

  return {
    listenToGsiData,
    removeGsiDataListener,
  }
}