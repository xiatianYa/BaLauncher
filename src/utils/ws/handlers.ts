import { useAppStore } from '@/store/modules/app';
import { useGameStore } from '@/store/modules/game';
import { updateServerGameData } from './data-updater';
import type { MessageHandlers } from './types';

/**
 * 构建 WebSocket 消息处理函数映射
 * code 对应关系:
 *   201 在线用户数据
 *   202 服务器列表数据
 *   203 地图订阅通知
 *   204 全量推送服务器游戏实时数据
 *   205 增量推送服务器游戏实时数据
 */
export function createMessageHandlers(): MessageHandlers {
  const appStore = useAppStore();
  const gameStore = useGameStore();

  return {
    // 在线用户数据
    '201': (data) => {
      appStore.onlineUserList = data;
    },

    // 服务器列表数据
    '202': (data) => {
      if (Array.isArray(data)) {
        gameStore.currentServerWsList.splice(0, gameStore.currentServerWsList.length, ...data);
      }
    },

    // 地图订阅通知
    '203': (data) => {
      if (data && window.ipcRenderer) {
        // 播放连接成功音效
        const currentTheme = appStore.currentTheme;
        const audioSrc = appStore.audioMap[currentTheme] || appStore.audioMap['阿罗娜'];
        const audio = new Audio(audioSrc);
        audio.volume = appStore.volume;
        audio.play();

        window.ipcRenderer.showMapOrderNotification({
          title: '地图订阅提醒',
          message: '您订阅的服务器地图已更新',
          serverName: data.serverName,
          connectStr: data.connectStr,
          mapName: data.mapName,
          mapChineseName: data.mapLabel,
          mapImage: data.mapUrl,
        });
      }
    },

    // 全量推送服务器游戏实时数据
    '204': (data) => {
      updateServerGameData(data, false);
    },

    // 增量推送服务器游戏实时数据
    '205': (data) => {
      updateServerGameData(data, true);
    },
  };
}
