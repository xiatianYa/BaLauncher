<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { useAppStore } from '@/store/modules/app';
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
const appStore = useAppStore();

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

const activeModule = computed(() => moduleMap[appStore.serverViewModule]);

// 切换社区
const selectCommunity = async (id: number) => {
  // 点击相同社区不进行加载；搜索/刷新进行中也允许切换社区，
  // 过期查询的结果会在写入前按社区一致性校验丢弃（见 useServerQuery），不会覆盖新社区数据
  if (appStore.selectedCommunityId === id) return;
  appStore.setSelectedCommunityId(id);
  // 递增查询序号，使旧查询（如 10 秒自动搜索）收尾时不再重复重启倒计时，避免 SVG 圆环动画抖动
  querySeq++;
  // 切换社区优先用 WS 实时数据即时回显并重启倒计时：
  // 避免 10 秒自动搜索（慢速 HTTP 查询）进行中切换时被旧查询拖住/走慢速接口
  if (!serverLoading.value) {
    await gameStore.queryWsServerInfosResponse();
    startCountdown(true);
  } else {
    // 加载中（如手动刷新进行中）时走常规查询，由查询收尾统一关闭加载态
    await queryServerInfos(true, true);
  }
};

// 恢复挤服窗口
const restoreJoinServerWindow = () => {
  gameStore.isJoinServerTrayVisible = false;
  showJoinServerConfirm.value = true;
};

// 开始倒计时（仅保留 15 秒一次的数据刷新定时器，动画交给 CSS/SVG）
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

  // 每 15 秒触发一次服务器信息刷新，不再每秒更新 Vue 响应式状态
  countdownInterval = window.setInterval(() => {
    if (!isRefreshing.value) {
      queryServerInfos(false, false);
    }
  }, 15000);
};

// 查询服务器列表 源服务器
// 进行中的查询计数 + 最新查询序号：
// 1) 搜索/刷新进行中允许再次发起查询（如切换社区），queryCount 防止较早查询提前收尾导致加载态卡死；
// 2) 仅最新一次查询负责收尾（关闭加载态/重启倒计时）：切社区等更新操作会递增 querySeq，
//    使旧查询（如 15 秒自动搜索）收尾失效，避免倒计时被连续重启两次导致 SVG 圆环动画抖动
let queryCount = 0;
let querySeq = 0;
const queryServerInfos = async (showAnimationFlag: boolean = true, isCache: boolean = false) => {
  const seq = ++querySeq;
  queryCount++;
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
    queryCount--;
    if (queryCount <= 0) queryCount = 0;
    // 仅最新一次查询负责收尾：旧查询（如切社区前发起的搜索）收尾时不再重启倒计时，避免动画抖动
    if (seq === querySeq) {
      serverLoading.value = false;
      isRefreshing.value = false;

      startCountdown(true);
    }
  }
};

// 加入服务器
const joinServer = async (server: Api.Game.SeverVo) => {
  // 如果正在挤服 则不能加入
  if (gameStore.isJoinServerTrayVisible) {
    window.$message?.error($t('server.joinBusy'));
    return;
  }
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
    <NCard :class="['rounded-10px flex-1 min-w-0', appStore.isFullscreen ? 'fixed inset-0 z-999 m-0px rounded-10px' : 'm-10px']"
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
          <!-- GSI 服务状态 -->
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton class="rounded-5px p-8px" type="tertiary" strong dashed>
                <template #icon>
                  <span class="w-8px h-8px rounded-full inline-block"
                    :class="gameStore.isGsiRunning ? 'bg-green-400' : 'bg-gray-300'" />
                </template>
                {{ $t('server.gsiService') }}
              </NButton>
            </template>
            {{ gameStore.isGsiRunning ? $t('server.gsiRunning') : $t('server.gsiStopped') }}
          </NTooltip>
          <!-- 日志监听状态 -->
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton class="rounded-5px p-8px" type="tertiary" strong dashed>
                <template #icon>
                  <span class="w-8px h-8px rounded-full inline-block"
                    :class="gameStore.isLogReading ? 'bg-green-400' : 'bg-gray-300'" />
                </template>
                {{ $t('server.logReader') }}
              </NButton>
            </template>
            {{ gameStore.isLogReading ? $t('server.logRunning') : $t('server.logStopped') }}
          </NTooltip>
          <NTooltip placement="bottom" class="cursor-pointer">
            <template #trigger>
              <!-- primary secondary：确保边界清晰、hover/点击有明确反馈（default 类型在暗色主题下几乎不可见） -->
              <NButton class="rounded-5px p-8px" type="primary" secondary strong dashed
                @click="appStore.toggleServerViewModule()">
                <template #icon>
                  <SvgIcon
                    :icon="appStore.serverViewModule === 'tableModal' ? 'material-symbols:view-quilt' : 'material-symbols:view-list'" />
                </template>
              </NButton>
            </template>
            {{ $t('server.switchView') }}
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton class="rounded-5px p-8px" type="primary" secondary strong dashed
                @click="appStore.toggleFullscreen()">
                <template #icon>
                  <SvgIcon :icon="appStore.isFullscreen ? 'iconamoon:screen-normal' : 'iconamoon:screen-full'" />
                </template>
              </NButton>
            </template>
            {{ appStore.isFullscreen ? $t('server.exitFullscreen') : $t('server.fullscreen') }}
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
            <div class="countdown-text" :key="countdownTick"></div>

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
      <component :is="activeModule.component" @back="appStore.serverViewModule = 'cardModel'"
        :servers="gameStore.currentServerList" :map-list="gameStore.mapList"
        :source-server-list="gameStore.serverDataList" :refreshing-addrs="gameStore.refreshingServerAddrs"
        @join="joinServer" @copy="copyServerAddr" @auto-join="openAutoJoinServer" @refresh="refreshServerInfo"
        @select-community="selectCommunity" />
    </NCard>
    <NCard class="m-10px rounded-10px flex-1 min-w-0" content-style="padding:10px;" content-class="h-full flex flex-col flex-1" v-else>
      <LoadingSpinner :loading="serverLoading" />
    </NCard>
    <CommunityList :selected-id="appStore.selectedCommunityId" @select="selectCommunity" />
    <OpenGameConfirm v-model:showGameConfirm="showOpenGameConfirm" />
    <OpenGameJoin v-model:showJoinServer="showJoinServerConfirm" />
    <!-- 挤服悬浮托盘 -->
    <JoinServerTray @restore="restoreJoinServerWindow" />
  </NCard>
</template>

<style scoped lang="scss">
// 全屏时主卡片头部会覆盖到窗口控制栏（-webkit-app-region: drag 拖拽区域）上方，
// 必须显式标记 no-drag，否则 Electron 的拖拽区域会拦截头部按钮的悬停与点击（悬停无反馈、点击失效）
:deep(.n-card-header) {
  -webkit-app-region: no-drag;
}

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
  // 15 秒环形进度动画，由 CSS 驱动，不触发 Vue 重新渲染
  animation: countdownProgress 15s linear infinite;
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
    content: '15';
    animation: countdownNumber 15s steps(15) infinite;
  }
}

@keyframes countdownNumber {
  0% {
    content: '15';
  }

  6.67% {
    content: '14';
  }

  13.33% {
    content: '13';
  }

  20% {
    content: '12';
  }

  26.67% {
    content: '11';
  }

  33.33% {
    content: '10';
  }

  40% {
    content: '9';
  }

  46.67% {
    content: '8';
  }

  53.33% {
    content: '7';
  }

  60% {
    content: '6';
  }

  66.67% {
    content: '5';
  }

  73.33% {
    content: '4';
  }

  80% {
    content: '3';
  }

  86.67% {
    content: '2';
  }

  93.33% {
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
