<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import LoadingSpinner from '@/components/custom/loading-spinner.vue';
import { ref, onUnmounted, nextTick, onMounted, computed } from 'vue';
import OpenGameConfirm from '@/views/server/modules/open-game-confirm.vue';
import OpenGameJoin from '@/views/server/modules/open-game-join.vue';
import JoinServerTray from '@/views/server/modules/join-server-tray.vue';
import CommunityList from '@/views/server/modules/community-list.vue';
import ServerCardList from '@/views/server/modules/server-card-list.vue';
import ServerTableList from '@/views/server/modules/server-table-list.vue';
import { $t } from '@/locales';
import type { Component } from 'vue';
import { NButton, NTooltip } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'server'
});

const gameStore = useGameStore();

// 服务器列表是否加载状态
const serverLoading = ref<boolean>(false);

// 是否显示打开游戏确认弹窗
const showOpenGameConfirm = ref<boolean>(false);

// 是否显示加入服务器确认弹窗
const showJoinServerConfirm = ref<boolean>(false);

// 刷新服务器列表是否正在刷新状态
const isRefreshing = ref(false);

// 刷新服务器列表倒计时定时器
let countdownInterval: number | null = null;

// 用于重启 SVG 环形动画的 key
const countdownTick = ref(0);

interface ServerLayoutModule {
  label: string;
  component: Component;
}

const moduleMap: Record<UnionKey.ServerLayoutModule, ServerLayoutModule> = {
  'cardModel': { label: $t('tools.cardModel'), component: ServerCardList },
  'tableModal': { label: $t('tools.tableModal'), component: ServerTableList },
};

const activeModule = computed(() => moduleMap[gameStore.serverViewModule]);

// 切换社区
const selectCommunity = async (id: number) => {
  //点击相同社区 不进行加载
  if (gameStore.selectedCommunityId === id || serverLoading.value || isRefreshing.value) return;
  serverLoading.value = true;
  gameStore.setSelectedCommunityId(id);
  await queryServerInfos(true, true);
  serverLoading.value = false;
};

// 恢复挤服窗口
const restoreJoinServerWindow = () => {
  gameStore.isJoinServerTrayVisible = false;
  showJoinServerConfirm.value = true;
};

// 开始倒计时（仅保留 10 秒一次的数据刷新定时器，动画交给 CSS/SVG）
const startCountdown = (reset: boolean = true) => {
  isRefreshing.value = false;

  nextTick(() => {
    if (reset) {
      // 通过改变 key 强制 SVG 圆环重新挂载，从而重启 CSS 动画
      countdownTick.value++;
    }
  });

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // 每 10 秒触发一次服务器信息刷新，不再每秒更新 Vue 响应式状态
  countdownInterval = window.setInterval(() => {
    if (!isRefreshing.value) {
      queryServerInfos(false, false);
    }
  }, 10000);
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

// 加入服务器
const joinServer = async (server: Api.Game.SeverVo) => {
  gameStore.joinServerInfo = server;
  if (!gameStore.isGameRunning) {
    showOpenGameConfirm.value = true;
  } else {
    // 连接服务器
    gameStore.connectServerUsingSteamUrl();
  }
}

// 打开自动连接服务器窗口
const openAutoJoinServer = (server: Api.Game.SeverVo) => {
  //如果正在挤服 则不能打开其他挤服窗口
  if (gameStore.isJoinServerTrayVisible) {
    window.$message?.error($t('server.joinBusy'));
    return;
  }
  gameStore.joinServerInfo = server;
  showJoinServerConfirm.value = true;
}

// 复制服务器地址
const copyServerAddr = (server: Api.Game.SeverVo) => {
  navigator.clipboard.writeText(`connect ${server.connectStr}`);
  window.$message?.success($t('server.copySuccess'));
};

// 刷新服务器信息
const refreshServerInfo = async (server: Api.Game.SeverVo) => {
  // 如果已经在刷新列表了 则不进行刷新
  if (gameStore.refreshingServerAddrs.includes(server.connectStr)) return;
  // 刷新服务器信息时，添加到刷新列表中
  gameStore.refreshingServerAddrs.push(server.connectStr);
  await gameStore.queryServerSeverVo(server);
  // 刷新服务器信息完成后，从刷新列表中移除
  const index = gameStore.refreshingServerAddrs.indexOf(server.connectStr);
  if (index > -1) {
    gameStore.refreshingServerAddrs.splice(index, 1);
  }
};

onMounted(async () => {
  await queryServerInfos(true, true);
  startCountdown(false);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    //停止自动挤服
    if (gameStore.isAutomatic) {
      gameStore.isJoinServerTrayVisible = false;
      gameStore.stopAutomaticJoinServer();
    }
  }
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full w-full" content-style="padding:0px;" :bordered="false">
    <NCard :class="['rounded-10px', gameStore.isFullscreen ? 'fixed inset-0 z-999 m-0px rounded-10px' : 'm-10px']"
      content-style="padding:10px;" content-class="h-full flex flex-col flex-1 overflow-hidden"
      header-style="padding:10px 20px 10px 20px" v-if="!serverLoading" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <h3 class="text-lg font-bold flex align-center">{{ $t('server.list') }}</h3>
      </template>
      <template #header-extra>
        <div class="flex items-center gap-10px">
          <NButton v-if="!gameStore.isGameRunning" class="rounded-5px p-8px" type="tertiary" strong dashed
            :loading="gameStore.isGameLaunching" @click="gameStore.startGame()">
            <template #icon>
              <SvgIcon icon="hugeicons:start-up-02" />
            </template>
            {{ $t('server.openGame.start') }}
          </NButton>
          <NButton v-else class="rounded-5px p-8px" type="success" strong disabled dashed>
            <template #icon>
              <SvgIcon icon="ix:success" />
            </template>
            {{ $t('server.openGame.gameStarted') }}
          </NButton>
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton class="rounded-5px p-8px" type="default" strong dashed
                @click="gameStore.toggleServerViewModule()">
                <template #icon>
                  <SvgIcon icon="material-symbols:view-list" />
                </template>
              </NButton>
            </template>
            {{ $t('server.switchView') }}
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton class="rounded-5px p-8px" type="default" strong dashed @click="gameStore.toggleFullscreen()">
                <template #icon>
                  <SvgIcon :icon="gameStore.isFullscreen ? 'iconamoon:screen-normal' : 'iconamoon:screen-full'" />
                </template>
              </NButton>
            </template>
            {{ gameStore.isFullscreen ? $t('server.exitFullscreen') : $t('server.fullscreen') }}
          </NTooltip>
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
              <circle class="countdown-progress" :key="countdownTick" cx="20" cy="20" r="16" stroke-width="3"
                fill="none" stroke-dasharray="100.5" stroke-dashoffset="0" transform="rotate(-90 20 20)" />
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
            <div class="countdown-text"></div>

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
        </div>
      </template>
      <component :is="activeModule.component" @back="gameStore.serverViewModule = 'cardModel'"
        :servers="gameStore.currentServerList" :map-list="gameStore.mapList"
        :source-server-list="gameStore.serverDataList" :refreshing-addrs="gameStore.refreshingServerAddrs"
        @join="joinServer" @copy="copyServerAddr" @auto-join="openAutoJoinServer" @refresh="refreshServerInfo" />
    </NCard>
    <NCard class="m-10px rounded-10px" content-style="padding:10px;" content-class="h-full flex flex-col flex-1" v-else>
      <LoadingSpinner :loading="serverLoading" />
    </NCard>
    <CommunityList :selected-id="gameStore.selectedCommunityId" @select="selectCommunity" />
    <OpenGameConfirm v-model:showGameConfirm="showOpenGameConfirm" />
    <OpenGameJoin v-model:showJoinServer="showJoinServerConfirm" />
    <!-- 挤服悬浮托盘 -->
    <JoinServerTray @restore="restoreJoinServerWindow" />
  </NCard>
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
  // 10 秒环形进度动画，由 CSS 驱动，不触发 Vue 重新渲染
  animation: countdownProgress 10s linear infinite;
}

@keyframes countdownProgress {
  from {
    stroke-dashoffset: 0;
  }

  to {
    stroke-dashoffset: 100.5;
  }
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

  &::before {
    content: '10';
    animation: countdownNumber 10s steps(10) infinite;
  }
}

@keyframes countdownNumber {
  0% {
    content: '10';
  }

  10% {
    content: '9';
  }

  20% {
    content: '8';
  }

  30% {
    content: '7';
  }

  40% {
    content: '6';
  }

  50% {
    content: '5';
  }

  60% {
    content: '4';
  }

  70% {
    content: '3';
  }

  80% {
    content: '2';
  }

  90% {
    content: '1';
  }

  100% {
    content: '1';
  }
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
  // 速度线静态显示，不再左右滑动
  opacity: 1;
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
</style>
