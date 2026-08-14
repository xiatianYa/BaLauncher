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
        // 同步最新 WS 数据到当前展示列表：按 connectStr 实时合并人数/在线状态/地图信息，
        // 否则 WS 推送只更新 currentServerWsList，界面显示的人数一直不变化
        gameStore.applyWsServerList(data);
      }
    },

    // 地图订阅通知
    '203': (data) => {
      if (data && window.ipcRenderer) {
        // 播放地图订阅提示音（未配置或音频丢失时自动回退「系统」音频）
        appStore.playThemeAudio(appStore.currentTheme, 'subscribe');

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
