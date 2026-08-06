import { unref } from 'vue'
import type { Ref } from 'vue'
import { sendPlayerJoin } from '@/utils/ws/server'

type MaybeRef<T> = T | Ref<T>

interface PlayerActionDeps {
  serverDataList: MaybeRef<Api.Game.Server[]>
}

/**
 * 玩家动作管理
 * 负责通过WebSocket发送玩家动作
 */
export function usePlayerAction(deps: PlayerActionDeps) {
  const { serverDataList } = deps

  /**
   * 根据服务器ID连接服务器
   * 通过 WebSocket 发送 type=101 消息通知服务器
   * @param serverId 服务器ID
   * @returns 是否成功发送消息
   */
  function connectToServerById(serverId: number) {

    const success = sendPlayerJoin(serverId)

    if (!success) {
      window.$message?.warning('WebSocket 未连接，请稍后重试')
    }

  }

  return {
    connectToServerById,
  }
}
