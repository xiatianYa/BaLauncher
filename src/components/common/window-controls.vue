<script setup lang="ts">
import { ref } from 'vue';
import SvgIcon from '@/components/custom/svg-icon.vue';

const showCloseConfirm = ref<boolean>(false);


const minimizeWindow = async () => {
  await window.ipcRenderer.invoke('window-minimize');
};

const closeWindow = () => {
  showCloseConfirm.value = true;
};

const toggleNotifications = () => {
  // 这里可以添加打开通知面板的逻辑
  console.log('Toggle notifications');
};
</script>

<template>
  <NCard content-class="h-52px flex justify-between items-center" content-style="padding: 5px;"
    class="rounded-t-12px window-drag-area">
    <img src="@/assets/imgs/bluearchive.png" class="app-logo ml-10px" alt="Blue Archive" />
    <div class="window-controls-group">
      <button class="window-control-btn" @click="toggleNotifications" :title="$t('windowControls.notifications')">
        <SvgIcon icon="mdi:bell-outline" class="window-control-icon" />
      </button>
      <button class="window-control-btn" @click="minimizeWindow" :title="$t('windowControls.minimize')">
        <SvgIcon icon="mdi:minus" class="window-control-icon" />
      </button>
      <button class="window-control-btn close-btn" @click="closeWindow" :title="$t('windowControls.close')">
        <SvgIcon icon="mdi:close" class="window-control-icon" />
      </button>
    </div>
    <CloseConfirm v-model:showCloseConfirm="showCloseConfirm" />
  </NCard>
</template>

<style scoped lang="scss">
.window-drag-area {
  -webkit-app-region: drag;
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
}
</style>
