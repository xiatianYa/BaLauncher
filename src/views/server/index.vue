<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import LoadingSpinner from '@/components/custom/loading-spinner.vue';
import { ref, onUnmounted, nextTick, onMounted } from 'vue';
import { animate } from 'animejs';
import { NEmpty } from 'naive-ui';
import { useDict } from '@/hooks/business/dict';
import OpenGameConfirm from '@/views/server/modules/open-game-confirm.vue';
import OpenGameJoin from '@/views/server/modules/open-game-join.vue';
import JoinServerTray from '@/views/server/modules/join-server-tray.vue';

defineOptions({
  name: 'server'
});

const gameStore = useGameStore();

const { dictOptions } = useDict();

// 服务器列表是否加载状态
const serverLoading = ref<boolean>(false);

// 是否显示打开游戏确认弹窗
const showOpenGameConfirm = ref<boolean>(false);

// 是否显示加入服务器确认弹窗
const showJoinServerConfirm = ref<boolean>(false);

// 刷新服务器列表倒计时
const countdownTextRef = ref<HTMLElement>();

// 刷新服务器列表进度环
const progressRingRef = ref<HTMLElement>();

// 刷新服务器列表倒计时值
const countdownValue = ref(20);

// 刷新服务器列表是否正在刷新状态
const isRefreshing = ref(false);

// 刷新服务器列表倒计时定时器
let countdownInterval: number | null = null;

// 切换社区
const selectCommunity = async (id: number) => {
  //点击相同社区 不进行加载
  if (gameStore.selectedCommunityId === id || serverLoading.value || isRefreshing.value) return;
  serverLoading.value = true;
  gameStore.selectedCommunityId = id;
  await queryServerInfos(true, true);
  serverLoading.value = false;
};

// 恢复挤服窗口
  const restoreJoinServerWindow = () => {
    gameStore.isJoinServerTrayVisible = false;
    showJoinServerConfirm.value = true;
  };
  
  // 根据地图名称获取地图信息
const getMapByMapName = (mapName: string) => {
  return gameStore.mapList.find(map => map.mapName === mapName);
};

// 获取 Ping 值对应的颜色类型
const getPingType = (ping?: number) => {
  if (ping === undefined || ping === null) return 'default';
  if (ping < 70) return 'success';
  if (ping < 100) return 'warning';
  return 'error';
};

// 格式化游戏时间计算进度颜色
const getOnLineColor = (server: Api.Game.InfoResponse) => {
  if (!server) return '';
  if (server.players <= 20) {
    return `background-color: #00f91a;width: ${(server.players / server.maxPlayers) * 100}%;`;
  } else if (server.players <= 40) {
    return `background-color: #5470ee;width: ${(server.players / server.maxPlayers) * 100}%;`;
  } else if (server.players <= 60) {
    return `background-color: #ffa325;width: ${(server.players / server.maxPlayers) * 100}%;`;
  } else if (server.players <= 80) {
    return `background-color: #ff4f00;width: ${(server.players / server.maxPlayers) * 100}%;`;
  }
  return `background-color: #ff0000;width: ${(server.players / server.maxPlayers) * 100}%;`;
};

const getPlayersChipBg = (server: Api.Game.InfoResponse): string | undefined => {
  const match = getOnLineColor(server).match(/background-color:\s*([^;]+);/);
  return match?.[1];
};

// 计算社区标签颜色
const getCommunityTagType = (playerNumber: number) => {
  if (playerNumber < 300) {
    return 'success';
  } else if (playerNumber < 500) {
    return 'warning';
  } else {
    return 'error';
  }
};

const startCountdown = (reset: boolean = true) => {
  isRefreshing.value = false;
  if (reset) {
    countdownValue.value = 20;
  }

  nextTick(() => {
    if (progressRingRef.value && reset) {
      progressRingRef.value.style.strokeDashoffset = '0';
    }

    if (progressRingRef.value && reset) {
      animate(progressRingRef.value, {
        strokeDashoffset: [0, 100.5],
        easing: 'linear',
        duration: 20000,
      });

      animateNumber(countdownValue.value);
    }
  });

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  countdownInterval = window.setInterval(() => {
    if (countdownValue.value > 0 && !isRefreshing.value) {
      countdownValue.value--;
      animateNumber(countdownValue.value);
    } else if (countdownValue.value <= 0 && !isRefreshing.value) {
      queryServerInfos(false, false);
    }
  }, 1000);
};

const animateNumber = (num: number) => {
  if (countdownTextRef.value) {
    animate(countdownTextRef.value, {
      scale: [0.8, 1.2, 1],
      duration: 300,
      easing: 'easeOutElastic(1, .5)',
    });
  }
};

// 查询服务器列表 源服务器
const queryServerInfos = async (showAnimationFlag: boolean = true, isCache: boolean = false) => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  if (showAnimationFlag) {
    serverLoading.value = true;
  }

  try {
    await gameStore.countServerServerNumber();
    await gameStore.countServerPlayerNumber();
    if (gameStore.currentServerWsList.length > 0 && isCache) {
      await gameStore.queryWsServerInfosResponse();
    } else {
      await gameStore.queryServerInfosResponse();
    }
  } finally {
    if (showAnimationFlag) {
      serverLoading.value = false;
    }
    isRefreshing.value = false;

    startCountdown(true);
  }
};

// 查询服务器地图类型
const queryServerMapType = (mapName: string) => {
  return gameStore.mapList.find(map => map.mapName === mapName)?.type;
}

// 查询服务器地图标签
const queryServerMapTag = (mapName: string) => {
  return gameStore.mapList.find(map => map.mapName === mapName)?.tag;
}

// 加入服务器
const joinServer = async (server: Api.Game.InfoResponse) => {
  gameStore.joinServerInfo = server;
  if (!gameStore.isGameRunning) {
    showOpenGameConfirm.value = true;
  } else {
    console.log('游戏已启动，直接连接服务器');
    gameStore.sendUserGisJoinAddr();
    // 连接服务器
    gameStore.connectServerUsingSteamUrl();
  }
}

// 打开自动连接服务器窗口
const openAutoJoinServer = (server: Api.Game.InfoResponse) => {
  //如果正在挤服 则不能打开其他挤服窗口
  if (gameStore.isJoinServerTrayVisible) {
    window.$message?.error('正在挤服中，不能打开其他挤服窗口');
    return;
  }
  gameStore.joinServerInfo = server;
  gameStore.sendUserGisAddr();
  showJoinServerConfirm.value = true;
  gameStore.currentGisPlayerList = [];
}

// 复制服务器地址
const copyServerAddr = (server: Api.Game.InfoResponse) => {
  navigator.clipboard.writeText(`connect ${server.addr}`);
  window.$message?.success('复制成功!');
};

// 获取源服务器信息
const getSourceServerInfo = (server: Api.Game.InfoResponse): Api.Game.Server | undefined => {
  //查找源服务器
  const sourceServer = gameStore.serverDataList.find(sourceServer => sourceServer.connectStr === server.addr);
  if (sourceServer) return sourceServer;
};

// 刷新服务器信息
const refreshServerInfo = async (server: Api.Game.InfoResponse) => {
  // 如果已经在刷新列表了 则不进行刷新
  if (gameStore.refreshingServerAddrs.includes(server.addr)) return;
  // 刷新服务器信息时，添加到刷新列表中
  gameStore.refreshingServerAddrs.push(server.addr);
  console.log(gameStore.refreshingServerAddrs);
  await gameStore.queryServerInfoResponse(server);
  // 刷新服务器信息完成后，从刷新列表中移除
  const index = gameStore.refreshingServerAddrs.indexOf(server.addr);
  if (index > -1) {
    gameStore.refreshingServerAddrs.splice(index, 1);
  }
};

onMounted(() => {
  startCountdown(false);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:10px;"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      v-if="!serverLoading" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <h3 class="text-lg font-bold flex align-center">{{ $t('server.list') }}</h3>
      </template>
      <template #header-extra>
        <div class="countdown-container cursor-pointer" @click="queryServerInfos(true, false)" v-if="!isRefreshing">
          <svg v-if="!isRefreshing" class="countdown-svg" width="40" height="40">
            <defs>
              <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6366f1" />
                <stop offset="50%" style="stop-color:#8b5cf6" />
                <stop offset="100%" style="stop-color:#a855f7" />
              </linearGradient>
            </defs>
            <circle class="countdown-bg" cx="20" cy="20" r="16" stroke-width="3" fill="none" />
            <circle class="countdown-progress" ref="progressRingRef" cx="20" cy="20" r="16" stroke-width="3" fill="none"
              stroke-dasharray="100.5" stroke-dashoffset="0" transform="rotate(-90 20 20)" />
          </svg>
          <svg v-else class="speed-svg" width="40" height="40" viewBox="0 0 40 40">
            <defs>
              <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6366f1" />
                <stop offset="50%" style="stop-color:#8b5cf6" />
                <stop offset="100%" style="stop-color:#a855f7" />
              </linearGradient>
            </defs>
            <g class="speed-group">
              <path class="speed-line-1" d="M8 20 L32 20" stroke="url(#speedGradient)" stroke-width="3"
                stroke-linecap="round" />
              <path class="speed-line-2" d="M12 14 L32 14" stroke="url(#speedGradient)" stroke-width="2.5"
                stroke-linecap="round" />
              <path class="speed-line-3" d="M12 26 L32 26" stroke="url(#speedGradient)" stroke-width="2.5"
                stroke-linecap="round" />
              <path class="speed-line-4" d="M16 8 L32 8" stroke="url(#speedGradient)" stroke-width="2"
                stroke-linecap="round" />
              <path class="speed-line-5" d="M16 32 L32 32" stroke="url(#speedGradient)" stroke-width="2"
                stroke-linecap="round" />
            </g>
          </svg>
          <div class="countdown-text" ref="countdownTextRef">
            <span v-if="!isRefreshing">{{ countdownValue }}</span>
          </div>
        </div>
        <div class="countdown-container cursor-pointer" v-else>
          <svg class="spinner-svg" width="40" height="40" viewBox="0 0 40 40">
            <defs>
              <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6366f1" />
                <stop offset="50%" style="stop-color:#8b5cf6" />
                <stop offset="100%" style="stop-color:#a855f7" />
              </linearGradient>
            </defs>
            <circle class="spinner-bg" cx="20" cy="20" r="16" stroke-width="3" fill="none" />
            <circle class="spinner-progress" cx="20" cy="20" r="16" stroke-width="3" fill="none"
              stroke-dasharray="30 70" stroke-linecap="round" />
          </svg>
        </div>
      </template>
      <div class="h-full overflow-auto p-5px relative">
        <NGrid :x-gap="12" :y-gap="12" :cols="2" v-if="gameStore.currentServerList">
          <NGridItem v-for="server, index in gameStore.currentServerList" :key="index">
            <div class="sercer-card overflow-hidden flex flex-col"
              v-if="server.isOnline && getSourceServerInfo(server)?.serverName">
              <img v-if="getMapByMapName(server.map)" class="server-card-bg"
                :src="getMapByMapName(server.map)?.mapUrl" />
              <div class="z-9 server-online" :style="`${getOnLineColor(server)}`"></div>
              <div class="server-card-mask"></div>
              <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
                {{
                  server.name
                }}
              </div>
              <div class="flex justify-between">
                <NEllipsis
                  class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
                  {{
                    `${server.map}`
                  }}
                </NEllipsis>
                <div class="stat-chip chip-players mr-5px" :style="{ '--chip-players-bg': getPlayersChipBg(server) }">
                  <SvgIcon icon="mdi:account-group" class="chip-icon" />
                  <span class="chip-text">{{ `${server.players}/${server.maxPlayers}` }}</span>
                </div>
              </div>
              <div
                class="mt-6px ml-5px font-size-13px flex items-center justify-between position-relative color-#fff font-bold">
                <div class="flex items-center justify-center">
                  <SvgIcon icon="tdesign:translate" class="mr-5px font-size-18px" />
                  {{
                    getMapByMapName(server.map)?.mapLabel ? getMapByMapName(server.map)?.mapLabel : '暂无译名'
                  }}
                </div>
                <div class="stat-chip chip-score mr-5px" v-show="server.mapPhase">
                  <span class="team team-ct">CT {{ server.CTScore || '0' }}</span>
                  <SvgIcon icon="mdi:scoreboard-outline" class="chip-icon" />
                  <span class="team team-t">T {{ server.TScore || '0' }}</span>
                </div>
              </div>
              <div class="flex-y-center ml-5px mt-6px position-relative font-bold">
                <NTag size="small" round class="mr-3px" ghost
                  :type="dictOptions('game_type').find((item: any) => item.value === queryServerMapType(server.map))?.type"
                  v-show="queryServerMapType(server.map)">
                  {{dictOptions('game_type').find((item: any) => item.value === queryServerMapType(server.map))?.label}}
                </NTag>
                <NTag v-for="(tag, index) in queryServerMapTag(server.map)" :key="index" size="small" round
                  class="mr-3px" type="success" v-show="queryServerMapType(server.map)">
                  {{dictOptions('game_tag').find((item: any) => item.value === tag)?.label}}
                </NTag>
                <NTag size="small" round class="mr-3px" ghost :type="getPingType(server.ping)" v-show="server.ping">
                  {{ server.ping }}ms
                </NTag>
              </div>
              <div class="server-card-button mt-6px">
                <div class="one-btn h-30px" @click="joinServer(server)">
                  <SvgIcon icon="iconamoon:enter" class="text-22px" />
                </div>
                <div class="two-btn h-30px" @click="copyServerAddr(server)">
                  <SvgIcon icon="solar:copy-outline" class="text-22px" />
                </div>
                <div class="three-btn h-30px" @click="openAutoJoinServer(server)">
                  <SvgIcon icon="material-symbols:alarm-smart-wake-outline" class="text-22px" />
                </div>
              </div>
            </div>
            <div v-else class="sercer-card overflow-hidden flex flex-col">
              <div class="server-offline-bg"></div>
              <div class="z-9 server-offline"></div>
              <div class="server-card-mask"></div>
              <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
                <SvgIcon icon="material-symbols:cloud-off" class="mr-5px font-size-18px text-yellow-400" />
                {{ getSourceServerInfo(server)?.serverName }}
              </div>
              <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
                <SvgIcon icon="mdi:server-off" class="mr-5px font-size-16px text-gray-400" />
                服务器离线
              </div>
              <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#a0a0a0 font-bold">
                等待服务器上线...
              </div>
              <div class="server-card-button mt-6px">
                <div class="two-btn h-30px" @click="copyServerAddr(server)">
                  <SvgIcon icon="solar:copy-outline" class="text-22px" />
                </div>
                <div class="three-btn h-30px" @click="refreshServerInfo(server)">
                  <div :class="{ 'refresh-icon-spinning': gameStore.refreshingServerAddrs.includes(server.addr) }">
                    <SvgIcon icon="material-symbols:refresh" class="text-22px" />
                  </div>
                </div>
              </div>
            </div>
          </NGridItem>
        </NGrid>
        <NEmpty description="未查询到服务器信息..." v-else>
          <template #extra>
            <NButton type="warning" ghost>
              <template #icon>
                <SvgIcon icon="ic:round-refresh" />
              </template>
              刷新
            </NButton>
          </template>
        </NEmpty>
      </div>
    </NCard>
    <NCard class="m-10px rounded-10px" content-style="padding:10px;" content-class="h-full flex flex-col flex-1" v-else>
      <LoadingSpinner :loading="serverLoading" />
    </NCard>
    <NCard class="m-10px w-40% rounded-10px" content-style="padding:10px;" content-class="h-full flex flex-col">
      <template header>
        <h3 class="text-lg font-bold mb-10px">社区列表</h3>
      </template>
      <div class="space-y-8px h-full overflow-auto pr-5px">
        <div v-for="community in gameStore.communityList" :key="community.id" class="community-box"
          :class="{ 'community-box-selected': gameStore.selectedCommunityId === community.id }"
          @click="selectCommunity(community.id)">
          <div class="community-image">
            <img :src="community.logo" :alt="community.communityName" v-if="community.logo" />
          </div>
          <div class="community-info">
            <div class="community-name">{{ community.communityName }}</div>
            <div class="community-stats">{{ community.serverNumber }}个服务器</div>
          </div>
          <div class="community-online">
            <NTag :type="getCommunityTagType(community.playerNumber)" class="rounded-md" size="small">
              {{ community.playerNumber }}个玩家
            </NTag>
          </div>
        </div>
      </div>
    </NCard>
  </NCard>
  <OpenGameConfirm v-model:showGameConfirm="showOpenGameConfirm" />
  <OpenGameJoin v-model:showJoinServer="showJoinServerConfirm" />
  <!-- 挤服悬浮托盘 -->
  <JoinServerTray @restore="restoreJoinServerWindow" />
</template>

<style scoped lang="scss">
.countdown-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.countdown-svg {
  position: absolute;
  top: 0;
  left: 0;
}

.countdown-bg {
  stroke: rgba(99, 102, 241, 0.2);
}

.countdown-progress {
  stroke: url(#countdownGradient);
  stroke-linecap: round;
  transition: stroke 0.3s ease;
}

.countdown-refresh {
  stroke: url(#countdownGradient);
  stroke-linecap: round;
  stroke-dasharray: 30 70;
}

.countdown-svg::before {
  content: '';
}

.countdown-text {
  position: relative;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  z-index: 1;
}

.speed-svg {
  position: absolute;
  top: 0;
  left: 0;
}

.speed-line-1,
.speed-line-2,
.speed-line-3,
.speed-line-4,
.speed-line-5 {
  opacity: 0;
  animation: speedLine 0.8s ease-in-out infinite;
}

.speed-line-1 {
  animation-delay: 0s;
}

.speed-line-2 {
  animation-delay: 0.1s;
}

.speed-line-3 {
  animation-delay: 0.1s;
}

.speed-line-4 {
  animation-delay: 0.2s;
}

.speed-line-5 {
  animation-delay: 0.2s;
}

@keyframes speedLine {
  0% {
    opacity: 0;
    transform: translateX(-10px);
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateX(10px);
  }
}

.spinner-svg {
  position: absolute;
  top: 0;
  left: 0;
  animation: spinnerRotate 1s linear infinite;
}

.spinner-bg {
  stroke: rgba(99, 102, 241, 0.2);
}

.spinner-progress {
  stroke: url(#spinnerGradient);
  stroke-linecap: round;
}

@keyframes spinnerRotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.community-box {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: rgba(133, 133, 133, 0.1);
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(133, 133, 133, 0.2);
  }

  &:hover {
    border-color: rgba(99, 102, 241, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.community-box-selected {
    background-color: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
}

.community-image {
  flex-shrink: 0;
  margin-right: 12px;

  img {
    width: 40px;
    border-radius: 4px;
    object-fit: cover;
  }
}

.community-info {
  flex: 1;
  min-width: 0;
}

.community-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.community-stats {
  font-size: 10px;
  color: #666;
  font-weight: bold;
}

.community-online {
  flex-shrink: 0;
  text-align: center;
  margin-left: 12px;
}

.sercer-card {
  position: relative;
  width: 100%;
  height: 155px;
  border-radius: 10px;
  background-color: #a5aaa3;
  font-family: 'SimHei';
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .server-card-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  .server-online {
    height: 5px;
    width: 100%;
    position: absolute;
  }

  .server-offline {
    height: 5px;
    width: 100%;
    position: absolute;
    background: linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%);
  }

  .server-offline-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%);
    z-index: 0;
  }

  .refresh-icon-spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  /* 遮罩层样式 */
  .server-card-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 1;
    transition: opacity 0.2s ease;
  }

  .server-card-button {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: end;
    position: sticky;
    width: 100%;
    color: #ffffff;

    /* 改为列方向布局 */
    .one-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 3;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(34, 197, 94, 0.7);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }

    .two-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-grow: 2;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(59, 130, 246, 0.7);

      &:hover {
        background-color: rgba(150, 150, 150, 0.5);
      }
    }

    .three-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 3;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(249, 115, 22, 0.7);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &:hover {
    box-shadow: 0 1px 2px -2px rgba(0, 0, 0, .08), 0 3px 6px 0 rgba(0, 0, 0, .06), 0 5px 12px 4px rgba(0, 0, 0, .04);
  }

  &:hover .server-card-mask {
    opacity: 0.5;
  }
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(6px);
}

.chip-icon {
  font-size: 16px;
  opacity: 0.9;
}

.chip-text {
  line-height: 1;
}

.chip-players {
  background: var(--chip-players-bg, linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%));
}

.chip-score {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #ef4444 100%);
}

.team {
  display: flex;
  align-items: center;
  gap: 4px;
}

.team-ct::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #60a5fa;
  display: inline-block;
}

.team-t::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  display: inline-block;
}
</style>
