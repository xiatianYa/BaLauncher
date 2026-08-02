import { useAuthStore } from '@/store/modules/auth';
import { updateServerGameData } from './data-updater';
import { createMessageHandlers } from './handlers';
import type { ServerWebsocketType } from './types';

// 连接地址
const wsUrl = process.env.NODE_ENV === 'development' ? 'ws://127.0.0.1:8080/ws/server/' : 'wss://www.bluearchive.top/websocket/ws/server/';

// 定义ServerWebsocket实例
const ServerWebsocket: ServerWebsocketType = {
  ServerWebsocket: null,
  reconnectTimer: null,
  reconnectInterval: 8000,

  /**
   * 更新服务器游戏实时数据（委托给 data-updater 模块）
   */
  updateServerGameData,

  // 建立ServerWebsocket连接
  init(): void {
    this.close();

    const authStore = useAuthStore();
    if (!authStore.isLogin) return;

    this.ServerWebsocket = new WebSocket(wsUrl + authStore.token);

    // 连接成功
    this.ServerWebsocket.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    // 监听服务器返回的数据
    this.ServerWebsocket.onmessage = (e: MessageEvent) => {
      try {
        const { code, data } = JSON.parse(e.data);
        const handlers = createMessageHandlers();
        const handler = handlers[code];
        if (handler) {
          handler(data);
        }
      } catch (error) {
        window.$message?.error(`消息异常:${error}`);
      }
    };

    // 连接断开时触发
    this.ServerWebsocket.onclose = () => {
      if (!authStore.isLogin) return;
      this.onClose();
    };

    this.ServerWebsocket.onerror = (e) => {
      console.error('WebSocket error:', e);
    };
  },

  // 处理断开连接操作
  onClose(): void {
    this.reconnect();
  },

  // 重新连接
  reconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.init();
      this.reconnectTimer = null;
    }, this.reconnectInterval);
  },

  // 关闭ServerWebsocket连接
  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ServerWebsocket) {
      this.ServerWebsocket.onclose = null;
      this.ServerWebsocket.close();
      this.ServerWebsocket = null;
    }
  },

  // 发送消息
  send(type: string, data: string): boolean {
    if (!this.ServerWebsocket || this.ServerWebsocket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket 未连接，无法发送消息:', { type, data });
      return false;
    }
    const message = JSON.stringify({ type, data });
    this.ServerWebsocket.send(message);
    return true;
  },
};

export default ServerWebsocket;
