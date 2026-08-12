/**
 * 游戏客户端本地类型命名空间
 *
 * 存放非后端接口的客户端本地类型（如挤服日志等）
 */
declare namespace GameStore {
  /** 本地挤服日志条目（客户端本地记录，不依赖 WS 推送） */
  interface AutoJoinLogItem {
    /** 日志时间戳（毫秒） */
    time: number
    /** 日志内容 */
    content: string
  }
}
