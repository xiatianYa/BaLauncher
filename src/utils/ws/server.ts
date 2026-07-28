import { useAppStore } from '@/store/modules/app';
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
  send(type: string, data: any): boolean;
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
    const appStore = useAppStore();

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
            // 在线用户数据
            appStore.onlineUserList = data;
          },
          '202': () => {
            // 服务器列表数据
            if (Array.isArray(data)) {
              gameStore.currentServerWsList.splice(0, gameStore.currentServerWsList.length, ...data);
              console.log('服务器列表数据:', gameStore.currentServerWsList);
            }
          },
          '203': () => {
            // 地图订阅通知
            if (data && window.ipcRenderer) {
              // 播放连接成功音效
              const currentTheme = appStore.currentTheme
              const audioSrc = appStore.audioMap[currentTheme] || appStore.audioMap['阿罗娜']
              const audio = new Audio(audioSrc)
              audio.volume = appStore.volume
              audio.play()
              window.ipcRenderer.showMapOrderNotification({
                title: '地图订阅提醒',
                message: `您订阅的服务器地图已更新`,
                serverName: data.serverName,
                connectStr: data.connectStr,
                mapName: data.gameMap?.name || data.gameMap?.mapName,
                mapChineseName: data.gameMap?.mapLabel,
                mapImage: data.gameMap?.mapUrl
              });
            }
          },
          '204': () => {

          },
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
  }
};

export default ServerWebsocket;
