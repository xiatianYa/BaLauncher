import { useAuthStore } from '@/store/modules/auth';
import { useGameStore } from '@/store/modules/game';

// 连接地址
// const wsUrl = process.env.NODE_ENV === 'development' ? 'ws://127.0.0.1:8080/ws/server/' : 'wss://www.bluearchive.top/websocket/ws/server/';
const wsUrl = 'wss://www.bluearchive.top/websocket/ws/server/';

// 定义ServerWebsocket相关的类型
interface ServerWebsocketType {
  ServerWebsocket: WebSocket | null;
  connectURL: string;
  reconnectTimer: NodeJS.Timeout | null;
  reconnectInterval: number;
  notification: any;
  init(): void;
  onClose(): void;
  reconnect(): void;
  close(): void;
}

// 定义ServerWebsocket实例
const ServerWebsocket: ServerWebsocketType = {
  ServerWebsocket: null,
  connectURL: wsUrl,
  reconnectTimer: null,
  reconnectInterval: 8000,
  notification: null,

  // 建立ServerWebsocket连接
  init(): void {
    const authStore = useAuthStore();

    const gameStore = useGameStore();

    if (!authStore.isLogin) return;

    ServerWebsocket.ServerWebsocket = new WebSocket(wsUrl + authStore.token);

    // 监听服务器返回的数据
    ServerWebsocket.ServerWebsocket.onmessage = (e: MessageEvent) => {
      try {
        const { code, data } = JSON.parse(e.data);
        // 定义一个处理函数的映射对象
        const handlers: { [key: string]: (data: any) => void } = {
          '200': () => {
          },
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

            window.$notification?.success({
              content: '连接成功',
              duration: 1000,
              keepAliveOnHover: true
            });
          },
          '202': () => {
            gameStore.gameServerData = data;
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
    ServerWebsocket.ServerWebsocket.onclose = () => {
      if (!authStore.isLogin) return;

      window.$notification?.warning({
        content: '服务器连接断开',
        meta: '自动尝试重新连接中 或 刷新浏览器!',
        duration: 4000,
        keepAliveOnHover: true
      });

      ServerWebsocket.onClose();
    };

    // 连接成功
    ServerWebsocket.ServerWebsocket.onopen = () => {
      clearTimeout(ServerWebsocket.reconnectTimer as NodeJS.Timeout);
      ServerWebsocket.reconnectTimer = null;
    };
  },

  // 处理断开连接操作
  onClose(): void {
    if (!ServerWebsocket.reconnectTimer) {
      ServerWebsocket.reconnectTimer = setInterval(() => {
        ServerWebsocket.reconnect();
      }, ServerWebsocket.reconnectInterval);
    }
  },

  // 重新连接
  reconnect(): void {
    ServerWebsocket.init();
  },

  // 关闭ServerWebsocket连接
  close(): void {
    if (ServerWebsocket.ServerWebsocket) {
      ServerWebsocket.ServerWebsocket.close();
    }

    clearTimeout(ServerWebsocket.reconnectTimer as NodeJS.Timeout);
    ServerWebsocket.reconnectTimer = null;
  }
};

export default ServerWebsocket;
