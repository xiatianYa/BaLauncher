import { useAuthStore } from '@/store/modules/auth';
import { useGameStore } from '@/store/modules/game';

// 连接地址
const wsUrl = process.env.NODE_ENV === 'development' ? 'ws://127.0.0.1:8080/ws/gis/' : 'wss://www.bluearchive.top/websocket/ws/gis/';

interface GisWebsocketType {
  GisWebsocket: WebSocket | null;
  reconnectTimer: NodeJS.Timeout | null;
  reconnectInterval: number;
  init(): void;
  onClose(): void;
  reconnect(): void;
  close(): void;
}

const GisWebsocket: GisWebsocketType = {
  GisWebsocket: null,
  reconnectTimer: null,
  reconnectInterval: 8000,

  init(): void {
    this.close();

    const authStore = useAuthStore();

    const gameStore = useGameStore();

    if (!authStore.isLogin) return;

    this.GisWebsocket = new WebSocket(`${wsUrl}${authStore.token}`);

    this.GisWebsocket.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.GisWebsocket.onmessage = (e: MessageEvent) => {
      try {
        const { code, data } = JSON.parse(e.data);
        // 定义一个处理函数的映射对象
        const handlers: { [key: string]: (data: any) => void } = {
          '201': () => {
            gameStore.currentGisPlayerList = data;
            console.log("GIS玩家数据", gameStore.currentGisPlayerList);
          }
        }
        // 根据 data.code 调用相应的处理函数
        const handler = handlers[code];
        if (handler) {
          handler(data);
        }
      } catch (error) {
        window.$message?.error(`消息异常:${error}`);
      }
    };

    this.GisWebsocket.onclose = () => {
      if (!authStore.isLogin) return;

      this.onClose();
    };

    this.GisWebsocket.onerror = (e) => {
      console.error('WebSocket error:', e);
    };
  },

  onClose() {
    this.reconnect();
  },

  reconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.init();
      this.reconnectTimer = null;
    }, this.reconnectInterval);
  },

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.GisWebsocket) {
      this.GisWebsocket.onclose = null;
      this.GisWebsocket.close();
      this.GisWebsocket = null;
    }
  }
};

export default GisWebsocket;
