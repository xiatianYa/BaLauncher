<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/store/modules/game';

const gameStore = useGameStore();
const isTrayCollapsed = ref(false);

const emit = defineEmits(['restore']);

const toggleTray = (e: Event) => {
  e.stopPropagation();
  isTrayCollapsed.value = !isTrayCollapsed.value;
};

const handleRestore = () => {
  emit('restore');
};
</script>

<template>
  <!-- 挤服托盘：样式参考 botGroup.vue（rgba(app-rgb) 自适应背景 + 紫色主色 + 毛玻璃 + 绿色状态光晕） -->
  <div v-if="gameStore.isJoinServerTrayVisible && gameStore.isAutomatic"
    class="fixed right-0 bottom-20px z-999 flex items-center transition-transform duration-300 ease-in-out will-change-transform"
    :class="isTrayCollapsed ? 'translate-x-[calc(100%-40px)]' : 'translate-x-[-25px]'">

    <!-- 折叠/展开按钮 -->
    <div class="tray-toggle-btn" @click="toggleTray">
      <SvgIcon :icon="isTrayCollapsed ? 'material-symbols:chevron-left' : 'material-symbols:chevron-right'" />
    </div>

    <!-- 托盘主体 -->
    <div class="tray-card" @click="handleRestore">
      <div class="tray-icon">
        <SvgIcon icon="eos-icons:loading" class="tray-spinner" />
        <span class="tray-status-dot" />
      </div>
      <div class="tray-info">
        <span class="tray-running">{{ $t('serverJoin.trayRunning') }}</span>
        <span class="tray-restore">{{ $t('serverJoin.trayRestore') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* ==================== 挤服托盘（参照 botGroup 卡片风格） ==================== */

/* 折叠/展开按钮：毛玻璃小圆钮，hover 变紫色 */
.tray-toggle-btn {
  position: absolute;
  left: -16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 15px;
  cursor: pointer;
  z-index: 10;
  font-size: 20px;
  color: rgba(var(--app-rgb), 0.6);
  background: rgba(var(--app-rgb), 0.06);
  border: 1px solid rgba(var(--app-rgb), 0.12);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transition: all 0.25s ease;

  &:hover {
    color: #667eea;
    background: rgba(102, 126, 234, 0.15);
    border-color: rgba(102, 126, 234, 0.35);
    transform: scale(1.05);
  }
}

/* 托盘主体：毛玻璃卡片，hover 上浮 + 紫色描边 + 阴影 */
.tray-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 12px 14px;
  /* 左侧大圆角贴合屏幕右缘，右侧小圆角 */
  border-radius: 16px 12px 12px 16px;
  cursor: pointer;
  background: rgba(var(--app-rgb), 0.06);
  border: 1px solid rgba(var(--app-rgb), 0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.09);
    border-color: rgba(102, 126, 234, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
  }

  /* 旋转状态图标（紫色主色） */
  .tray-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(102, 126, 234, 0.12);
    border: 1px solid rgba(102, 126, 234, 0.25);

    .tray-spinner {
      font-size: 20px;
      color: #667eea;
      animation: tray-spin 1.2s linear infinite;
    }

    /* 运行状态绿点（同 botGroup 绑定状态光晕） */
    .tray-status-dot {
      position: absolute;
      top: -1px;
      right: -1px;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #43e97b;
      box-shadow: 0 0 6px rgba(67, 233, 123, 0.7);
      animation: tray-pulse 2s ease-in-out infinite;
    }
  }

  /* 文案区 */
  .tray-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 4px;
    white-space: nowrap;

    .tray-running {
      font-size: 13px;
      font-weight: 700;
      color: rgba(var(--app-rgb), 0.88);
    }

    .tray-restore {
      font-size: 11px;
      color: rgba(var(--app-rgb), 0.5);
    }
  }
}

/* 图标旋转动画 */
@keyframes tray-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* 状态点呼吸光晕动画 */
@keyframes tray-pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(67, 233, 123, 0.5);
  }

  50% {
    box-shadow: 0 0 0 5px rgba(67, 233, 123, 0);
  }
}
</style>
