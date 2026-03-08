<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { NModal, NButton, NProgress } from 'naive-ui';

interface UpdateState {
  show: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  speed: string;
  percent: string;
}

const state = ref<UpdateState>({
  show: false,
  downloading: false,
  downloaded: false,
  progress: 0,
  speed: '0 KB/s',
  percent: '0%'
});

const showUpdateConfirm = () => {
  state.value.show = true;
  state.value.downloading = false;
  state.value.downloaded = false;
  state.value.progress = 0;
  state.value.speed = '0 KB/s';
  state.value.percent = '0%';
};

const handleConfirmUpdate = () => {
  state.value.downloading = true;
  state.value.progress = 0;
  window.ipcRenderer.invoke('download-update');
};

const handleCancelUpdate = () => {
  state.value.show = false;
  state.value.downloading = false;
  state.value.downloaded = false;
  state.value.progress = 0;
};

const handleInstallUpdate = async () => {
  state.value.show = false;
  await window.ipcRenderer.invoke('install-update');
};

const updateAvailableHandler = () => {
  showUpdateConfirm();
};

const updateDownloadingHandler = (_: any, info: any) => {
  if (info.percent) {
    state.value.progress = Math.min(Math.max(info.percent, 0), 100);
    state.value.percent = `${state.value.progress.toFixed(2)}%`;
  }
  if (info.bytesPerSecond) {
    const speedInKB = info.bytesPerSecond / 1024;
    if (speedInKB > 1024) {
      state.value.speed = `${(speedInKB / 1024).toFixed(2)} MB/s`;
    } else {
      state.value.speed = `${speedInKB.toFixed(2)} KB/s`;
    }
  }
};

const updateDownloadedHandler = () => {
  state.value.downloading = false;
  state.value.downloaded = true;
  state.value.progress = 100;
  state.value.percent = '100%';
};

onMounted(() => {
  window.ipcRenderer.on('update-available', updateAvailableHandler);
  window.ipcRenderer.on('update-downloading', updateDownloadingHandler);
  window.ipcRenderer.on('update-downloaded', updateDownloadedHandler);
});

onUnmounted(() => {
  window.ipcRenderer.off('update-available', updateAvailableHandler);
  window.ipcRenderer.off('update-downloading', updateDownloadingHandler);
  window.ipcRenderer.off('update-downloaded', updateDownloadedHandler);
});
</script>

<template>
  <NModal v-model:show="state.show" preset="card" size="medium" :bordered="false" :show-icon="false" class="w-300px"
    header-style="padding:10px;">
    <template #header>
      发现新版本
    </template>
    <div class="flex flex-col items-center w-full p-10px">
      <div class="dowload-icon">
        <SvgIcon icon="material-symbols:download" />
      </div>
      <p class="text-center mb-4 text-lg font-medium">
        {{ state.downloading ? '正在下载更新...' : state.downloaded ? '更新已下载完成' : '是否更新?' }}
      </p>
      <div v-if="state.downloading || state.downloaded" class="w-full mb-4">
        <NProgress type="line" :percentage="state.progress" :show-indicator="false" class="mb-2 h-8px rounded-4px" />
        <div class="flex justify-between text-sm text-gray-500">
          <span>{{ state.percent }}</span>
          <span v-if="state.downloading">{{ state.speed }}</span>
        </div>
      </div>
      <div class="flex gap-4">
        <NButton v-if="!state.downloading && !state.downloaded" @click="handleCancelUpdate" type="error" ghost strong>
          <template #icon>
            <SvgIcon icon="ic:baseline-close" />
          </template>
          取消
        </NButton>
        <NButton v-if="!state.downloading && !state.downloaded" @click="handleConfirmUpdate" type="success" ghost
          strong>
          <template #icon>
            <SvgIcon icon="material-symbols:download" />
          </template>
          立即更新
        </NButton>
        <NButton v-if="state.downloaded" @click="handleInstallUpdate" type="success" ghost strong>
          <template #icon>
            <SvgIcon icon="material-symbols:deployed-code-update-outline" />
          </template>
          立即安装
        </NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.dowload-icon {
  font-size: 32px;
  border: 0.5px solid rgba($color: #3b82f6, $alpha: 0.2);
  padding: 12px;
  border-radius: 10px;
  background-color: rgba($color: #3b82f6, $alpha: 0.1);
  margin-bottom: 15px;
  color: #3b82f6;
}
</style>
