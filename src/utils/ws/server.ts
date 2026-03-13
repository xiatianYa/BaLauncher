import { useAuthStore } from '@/store/modules/auth';
import { useGameStore } from '@/store/modules/game';

// 连接地址
const wsUrl = process.env.NODE_ENV === 'development' ? 'ws://127.0.0.1:8080/ws/server/' : 'wss://www.bluearchive.top/websocket/ws/server/';

// 定义ServerWebsocket相关的类型
interface ServerWebsocketType {
  ServerWebsocket: WebSocket | null;
  reconnectTimer: NodeJS.Timeout | null;
  reconnectInterval: number;
  init(): void;
  onClose(): void;
  reconnect(): void;
  close(): void;
}

// 定义ServerWebsocket实例
const ServerWebsocket: ServerWebsocketType = {
  ServerWebsocket: null,
  reconnectTimer: null,
  reconnectInterval: 8000,

  // 建立ServerWebsocket连接
  init(): void {
    this.close();

    const authStore = useAuthStore();
    const gameStore = useGameStore();

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
        // 定义一个处理函数的映射对象
        const handlers: { [key: string]: (data: any) => void } = {
          '201': () => {
            gameStore.automaticInfo!.numPlayers = data.players ?? gameStore.automaticInfo!.numPlayers;
            gameStore.automaticInfo!.maxPlayers = data.maxPlayers ?? gameStore.automaticInfo!.maxPlayers;

            if (!gameStore.isAutomatic) return;

            if (!data.status) {
              gameStore.automaticCount += 1;
              setTimeout(() => {
                gameStore.sendJoinServer(gameStore.automaticInfo);
              }, 100);
              return;
            }
            gameStore.isAutomatic = false;
            gameStore.automaticCount = 0;
            const aLink = document.createElement('a');
            aLink.href = `steam://rungame/730/76561198977557298/+connect ${gameStore.automaticInfo?.connectStr}`;
            aLink.click();
          },
          '205': () => {
            if (Array.isArray(data)) {
              gameStore.currentServerWsList.splice(0, gameStore.currentServerWsList.length, ...data);
            }
          },
          '103': () => {
            gameStore.currentGisServerList.splice(0, gameStore.currentGisServerList.length, ...data);
          }
        };

        // 根据 data.code 调用相应的处理函数
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
  }
};

export default ServerWebsocket;
