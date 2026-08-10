import { sendPlayerJoin } from '@/utils/ws/server'

/**
 * 玩家动作管理
 * 负责通过 WebSocket 发送玩家动作
 */
export function usePlayerAction() {
  /**
   * 根据服务器ID连接服务器
   * 通过 WebSocket 发送 type=101 消息通知服务器
   * @param serverId 服务器ID
   */
  function connectToServerById(serverId: number): void {
    const success = sendPlayerJoin(serverId)
    if (!success) {
      window.$message?.warning('WebSocket 未连接，请稍后重试')
    }
  }

  return {
    connectToServerById,
  }
}
