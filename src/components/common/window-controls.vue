<script setup lang="ts">
import { ref } from 'vue';

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
    class="rounded-none window-drag-area">
    <img src="@/assets/imgs/bluearchive.png" class="app-logo ml-10px" alt="Blue Archive" />
    <div class="window-controls-group">
      <button class="window-control-btn" @click="toggleNotifications" :title="$t('windowControls.notifications')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </button>
      <button class="window-control-btn" @click="minimizeWindow" :title="$t('windowControls.minimize')">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <button class="window-control-btn close-btn" @click="closeWindow" :title="$t('windowControls.close')">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M2 2L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
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
