// WebSocket 服务端连接实例类型
export interface ServerWebsocketType {
  ServerWebsocket: WebSocket | null;
  reconnectTimer: NodeJS.Timeout | null;
  reconnectInterval: number;
  updateServerGameData(data: Api.Game.ServerGameDataVo, incremental: boolean): void;
  init(): void;
  onClose(): void;
  reconnect(): void;
  close(): void;
  send(type: string, data: any): boolean;
}

// 消息处理函数类型
export type MessageHandler = (data: any) => void;

// 消息 handlers 映射类型
export type MessageHandlers = Record<string, MessageHandler>;
