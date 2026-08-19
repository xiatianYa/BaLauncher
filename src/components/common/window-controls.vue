<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { fetchGetNoticeUnreadCount } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useAppStore } from '@/store/modules/app';

const authStore = useAuthStore();
const appStore = useAppStore();

const showCloseConfirm = ref<boolean>(false);
/** 通知面板显示状态 */
const showNoticePanel = ref<boolean>(false);
/** 未读通知数量 */
const unreadCount = ref(0);

/** 轮询定时器 */
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** 最小化窗口：按设置决定最小化到任务栏（默认）或隐藏到系统托盘 */
const minimizeWindow = async () => {
  await window.ipcRenderer.invoke('window-minimize', appStore.minimizeBehavior);
};

const closeWindow = () => {
  showCloseConfirm.value = true;
};

/** 切换通知面板 */
const toggleNotifications = () => {
  showNoticePanel.value = !showNoticePanel.value;
};

/** 刷新未读数量（未登录不请求，登录后由 watch 触发） */
const loadUnreadCount = async () => {
  if (!authStore.isLogin) {
    unreadCount.value = 0;
    return;
  }
  try {
    const { data, error } = await fetchGetNoticeUnreadCount();
    if (!error && typeof data === 'number') {
      unreadCount.value = data;
    }
  } catch {
    // 忽略请求异常
  }
};

/** 通知面板未读变化：直接采用面板按列表统计的未读数，保持图标徽标与面板列表一致 */
const handleUnreadCountChanged = (count: number) => {
  unreadCount.value = count;
};

onMounted(() => {
  loadUnreadCount();
  // 定时轮询未读数（60s）
  pollTimer = setInterval(loadUnreadCount, 60000);
});

// 组件常驻挂载，登录后立即刷新一次未读数（未登录时挂载请求无数据）
watch(
  () => authStore.isLogin,
  (v) => {
    if (v) loadUnreadCount();
  }
);

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<template>
  <NCard content-class="h-52px flex justify-between items-center" content-style="padding: 5px;"
    class="rounded-t-12px window-drag-area">
    <img src="@/assets/imgs/bluearchive.png" class="app-logo ml-10px" alt="Blue Archive" />
    <div class="window-controls-group">
      <button class="window-control-btn notice-btn" @click="toggleNotifications" :title="$t('windowControls.notifications')">
        <SvgIcon icon="mdi:bell-outline" class="window-control-icon" />
        <span v-if="unreadCount > 0" class="notice-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>
      <button class="window-control-btn" @click="minimizeWindow" :title="$t('windowControls.minimize')">
        <SvgIcon icon="mdi:minus" class="window-control-icon" />
      </button>
      <button class="window-control-btn close-btn" @click="closeWindow" :title="$t('windowControls.close')">
        <SvgIcon icon="mdi:close" class="window-control-icon" />
      </button>
    </div>
    <!-- 通知面板 + 点击外部关闭遮罩 -->
    <div v-if="showNoticePanel" class="notice-mask" @click="showNoticePanel = false" />
    <NoticePanel v-if="showNoticePanel" class="notice-panel-wrap" @changed="handleUnreadCountChanged" />
    <CloseConfirm v-model:showCloseConfirm="showCloseConfirm" />
  </NCard>
</template>

<style scoped lang="scss">
.window-drag-area {
  -webkit-app-region: drag;
  /* 仅保留顶部两角圆角，底部与内容卡片衔接处为直角，避免圆角对不上产生缺口 */
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.app-logo {
  height: 38px;
  width: auto;
  -webkit-app-region: no-drag;
}

.window-controls-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
}

.window-control-btn {
  position: relative;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--n-text-color-3);
  transition: all 0.25s ease;
  -webkit-app-region: no-drag;

  .window-control-icon {
    font-size: 16px;
  }

  &:hover {
    background-color: rgba(102, 126, 234, 0.12);
    border-color: #667eea;
    color: #667eea;
    transform: translateY(-1px);
  }

  &.close-btn:hover {
    background-color: #ff4757;
    border-color: #ff4757;
    color: white;
  }

  /* 未读通知徽标 */
  .notice-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #ff4757;
    border: 1.5px solid var(--n-color);
    color: #fff;
    font-size: 10px;
    line-height: 13px;
    text-align: center;
    box-sizing: content-box;
  }
}

/* 通知面板定位（铃铛右下方） */
.notice-panel-wrap {
  position: fixed;
  top: 52px;
  right: 56px;
  z-index: 2000;
}

/* 点击外部关闭遮罩 */
.notice-mask {
  position: fixed;
  inset: 0;
  z-index: 1999;
  background: transparent;
}
</style>
