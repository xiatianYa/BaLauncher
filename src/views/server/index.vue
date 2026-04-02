<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import LoadingSpinner from '@/components/custom/loading-spinner.vue';
import { ref, onUnmounted, nextTick, onMounted, computed } from 'vue';
import { animate } from 'animejs';
import OpenGameConfirm from '@/views/server/modules/open-game-confirm.vue';
import OpenGameJoin from '@/views/server/modules/open-game-join.vue';
import JoinServerTray from '@/views/server/modules/join-server-tray.vue';
import CommunityList from '@/views/server/modules/community-list.vue';
import ServerCardList from '@/views/server/modules/server-card-list.vue';
import ServerTableList from '@/views/server/modules/server-table-list.vue';
import { $t } from '@/locales';
import type { Component } from 'vue';
import { NModal, NInput, NButton, NTooltip } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'server'
});

const gameStore = useGameStore();

// 判断是否是自定义分类
const isCustomCategory = computed(() => {
  return gameStore.isCustomCategory(gameStore.selectedCommunityId!);
});

// 显示添加服务器弹窗
const showAddServerModal = ref(false);

// 服务器地址
const serverAddress = ref('');

// 服务器备注
const serverRemark = ref('');

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
const countdownValue = ref(10);

// 刷新服务器列表是否正在刷新状态
const isRefreshing = ref(false);

// 刷新服务器列表倒计时定时器
let countdownInterval: number | null = null;

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

  // 如果是自定义分类，直接获取本地存储的服务器列表
  if (gameStore.isCustomCategory(id)) {
    refreshCurrentServerList();
    await queryServerInfos(true, false);
    serverLoading.value = false;
    return;
  }

  await queryServerInfos(true, true);
  serverLoading.value = false;
};

// 恢复挤服窗口
const restoreJoinServerWindow = () => {
  gameStore.isJoinServerTrayVisible = false;
  showJoinServerConfirm.value = true;
};

// 开始倒计时
const startCountdown = (reset: boolean = true) => {
  isRefreshing.value = false;
  if (reset) {
    countdownValue.value = 10;
  }

  nextTick(() => {
    if (progressRingRef.value && reset) {
      progressRingRef.value.style.strokeDashoffset = '0';
    }
    if (progressRingRef.value && reset) {
      animate(progressRingRef.value, {
        strokeDashoffset: [0, 100.5],
        easing: 'linear',
        duration: 10000,
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

// 动画数字
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

// 加入服务器
const joinServer = async (server: Api.Game.InfoResponse) => {
  gameStore.joinServerInfo = server;
  if (!gameStore.isGameRunning) {
    showOpenGameConfirm.value = true;
  } else {
    gameStore.sendUserGisJoinAddr();
    // 连接服务器
    gameStore.connectServerUsingSteamUrl();
  }
}

// 打开自动连接服务器窗口
const openAutoJoinServer = (server: Api.Game.InfoResponse) => {
  //如果正在挤服 则不能打开其他挤服窗口
  if (gameStore.isJoinServerTrayVisible) {
    window.$message?.error($t('server.joinBusy'));
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
  window.$message?.success($t('server.copySuccess'));
};

// 刷新服务器信息
const refreshServerInfo = async (server: Api.Game.InfoResponse) => {
  // 如果已经在刷新列表了 则不进行刷新
  if (gameStore.refreshingServerAddrs.includes(server.addr)) return;
  // 刷新服务器信息时，添加到刷新列表中
  gameStore.refreshingServerAddrs.push(server.addr);
  await gameStore.queryServerInfoResponse(server);
  // 刷新服务器信息完成后，从刷新列表中移除
  const index = gameStore.refreshingServerAddrs.indexOf(server.addr);
  if (index > -1) {
    gameStore.refreshingServerAddrs.splice(index, 1);
  }
};


// 打开添加服务器弹窗
const openAddServerModal = () => {
  showAddServerModal.value = true;
  serverAddress.value = '';
  serverRemark.value = '';
};

// 关闭添加服务器弹窗
const closeAddServerModal = () => {
  showAddServerModal.value = false;
  serverAddress.value = '';
  serverRemark.value = '';
};

// 添加服务器
const saveAddServer = async () => {
  if (!serverAddress.value.trim()) {
    window.$message?.error($t('server.pleaseEnterServerAddress'));
    return;
  }

  const addrParts = serverAddress.value.trim().split(':');
  if (addrParts.length !== 2) {
    window.$message?.error($t('server.invalidServerAddressFormat'));
    return;
  }

  const ip = addrParts[0].trim();
  const port = addrParts[1].trim();

  if (!ip) {
    window.$message?.error($t('server.pleaseEnterServerAddress'));
    return;
  }

  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    window.$message?.error($t('server.invalidPort'));
    return;
  }

  const server: Api.Game.Server = {
    serverName: serverRemark.value.trim() || serverAddress.value.trim(),
    communityId: gameStore.selectedCommunityId!,
    ip: ip,
    port: port,
    sort: Date.now(),
    connectStr: serverAddress.value.trim()
  };
  gameStore.addServerToCategory(gameStore.selectedCommunityId!, server);
  window.$message?.success($t('server.serverAdded'));
  closeAddServerModal();
  await queryServerInfos(true, false);
};

// 刷新当前服务器列表
const refreshCurrentServerList = () => {
  if (gameStore.isCustomCategory(gameStore.selectedCommunityId!)) {
    const servers = gameStore.getCustomCategoryServers(gameStore.selectedCommunityId!);
    gameStore.currentServerList.splice(0, gameStore.currentServerList.length, ...servers);
  }
};

// 处理删除服务器
const handleDeleteServer = async () => {
  await queryServerInfos(true, false);
};

onMounted(async () => {
  await queryServerInfos(true, true);
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
    <NCard :class="['rounded-10px', gameStore.isFullscreen ? 'fixed inset-0 z-9999 m-0 rounded-none' : 'm-10px']"
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
          <NButton v-if="isCustomCategory" class="rounded-5px p-8px" type="primary" strong dashed
            @click="openAddServerModal()">
            <template #icon>
              <SvgIcon icon="material-symbols:add" />
            </template>
            {{ $t('server.addServer') }}
          </NButton>
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
              <circle class="countdown-progress" ref="progressRingRef" cx="20" cy="20" r="16" stroke-width="3"
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
        </div>
      </template>
      <component :is="activeModule.component" @back="gameStore.serverViewModule = 'cardModel'"
        :servers="gameStore.currentServerList" :map-list="gameStore.mapList"
        :source-server-list="gameStore.serverDataList" :refreshing-addrs="gameStore.refreshingServerAddrs"
        @join="joinServer" @copy="copyServerAddr" @auto-join="openAutoJoinServer" @refresh="refreshServerInfo"
        @delete="handleDeleteServer" />
    </NCard>
    <NCard class="m-10px rounded-10px" content-style="padding:10px;" content-class="h-full flex flex-col flex-1" v-else>
      <LoadingSpinner :loading="serverLoading" />
    </NCard>
    <CommunityList :selected-id="gameStore.selectedCommunityId" @select="selectCommunity" />
    <OpenGameConfirm v-model:showGameConfirm="showOpenGameConfirm" />
    <OpenGameJoin v-model:showJoinServer="showJoinServerConfirm" />
    <!-- 挤服悬浮托盘 -->
    <JoinServerTray @restore="restoreJoinServerWindow" />
    <!-- 添加服务器弹窗 -->
    <NModal v-model:show="showAddServerModal" :bordered="true" preset="card" class="w-500px rounded-10px"
      :closable="false" size="medium">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="text-lg font-bold">{{ $t('server.addServer') }}</div>
          <NButton quaternary size="tiny" @click="closeAddServerModal">
            <SvgIcon icon="material-symbols:close" />
          </NButton>
        </div>
      </template>
      <div class="pt-20px pb-20px pl-20px pr-20px">
        <div class="mb-20px">
          <div class="text-sm font-medium mb-5px">{{ $t('server.serverAddress') }}</div>
          <NInput v-model:value="serverAddress" :placeholder="$t('server.serverAddressPlaceholder')" clearable />
        </div>
        <div class="mb-20px">
          <div class="text-sm font-medium mb-5px">{{ $t('server.serverRemark') }}</div>
          <NInput v-model:value="serverRemark" :placeholder="$t('server.serverRemarkPlaceholder')" clearable
            maxlength="15" />
        </div>
      </div>
      <template #footer>
        <div class="flex flex-wrap gap-10px">
          <NButton type="warning" class="flex-1 rounded-8px" ghost @click="closeAddServerModal">
            <template #icon>
              <SvgIcon icon="material-symbols:close" />
            </template>
            {{ $t('server.cancel') }}
          </NButton>
          <NButton type="info" class="flex-1 rounded-8px" ghost @click="saveAddServer">
            <template #icon>
              <SvgIcon icon="material-symbols:check" />
            </template>
            {{ $t('server.add') }}
          </NButton>
        </div>
      </template>
    </NModal>
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
</style>
