<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { NModal, NButton, NProgress, NSpin } from 'naive-ui';


import { useThemeStore } from '@/store/modules/theme';
import { fetchGetUpdateLogByVersion } from '@/service/api/system/updateLog';
import { useAuthStore } from '@/store/modules/auth';

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

const themeStore = useThemeStore();
const authStore = useAuthStore();
const isDarkMode = ref(themeStore.darkMode);

const updateLog = ref<Api.System.UpdateLogVo | null>(null);
const loadingUpdateLog = ref(false);
const latestVersion = ref<string>('V2.6.1');

const showUpdateConfirm = async () => {
  state.value.downloading = false;
  state.value.downloaded = false;
  state.value.progress = 0;
  state.value.speed = '0 KB/s';
  state.value.percent = '0%';

  await loadUpdateLog();
};

const loadUpdateLog = async () => {
  if (!latestVersion.value) return;
  loadingUpdateLog.value = true;
  try {
    const { data, error } = await fetchGetUpdateLogByVersion(latestVersion.value);
    console.log('加载更新日志:', data, error);
    if (!error) {
      updateLog.value = data;
    }
  } catch (error) {
    console.error('加载更新日志失败:', error);
  } finally {
    loadingUpdateLog.value = false;
    state.value.show = true;
  }
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
  updateLog.value = null;
};

const handleInstallUpdate = async () => {
  await window.ipcRenderer.invoke('install-update');
};

const updateAvailableHandler = (_: any, info: any) => {
  console.log("检测到新版本了!", info);
  if (info && info.version) {
    latestVersion.value = info.version;
  }
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

watch(() => themeStore.darkMode, (newVal) => {
  isDarkMode.value = newVal;
});

onMounted(() => {
  window.ipcRenderer.on('update-available', updateAvailableHandler);
  window.ipcRenderer.on('update-downloading', updateDownloadingHandler);
  window.ipcRenderer.on('update-downloaded', updateDownloadedHandler);
  showUpdateConfirm();
});

onUnmounted(() => {
  window.ipcRenderer.off('update-available', updateAvailableHandler);
  window.ipcRenderer.off('update-downloading', updateDownloadingHandler);
  window.ipcRenderer.off('update-downloaded', updateDownloadedHandler);
});
</script>

<template>
  <NModal v-model:show="state.show" preset="card" size="large" :bordered="false" :show-icon="false"
    class="w-600px rounded-10px" header-style="padding:10px;" :closable="false" v-if="authStore.isLogin">
    <template #header>
      <div class="flex items-center justify-between">
        <span>{{ $t('update.title') }}</span>
        <span v-if="updateLog" class="text-sm text-gray-500">
          v{{ updateLog.version }}
        </span>
      </div>
    </template>
    <div class="flex flex-col w-full p-10px">
      <div class="flex items-center justify-center mb-4">
        <div class="dowload-icon">
          <SvgIcon icon="material-symbols:download" />
        </div>
      </div>
      <div v-if="!state.downloading && !state.downloaded && updateLog" class="w-full mb-4 flex-1 overflow-auto">
        <div v-if="updateLog" class="update-log-content" :class="{ 'dark': isDarkMode, 'light': !isDarkMode }">
          <h3 class="update-log-title">{{ updateLog.title }}</h3>
          <div class="update-log-text">{{ updateLog.content }}</div>
        </div>
      </div>
      <p v-if="!updateLog" class="text-center mb-4 text-lg font-medium">
        {{ state.downloading ? $t('update.downloading') : state.downloaded ? $t('update.downloaded') :
          $t('update.confirm')
        }}
      </p>
      <div v-if="state.downloading || state.downloaded" class="w-full mb-4">
        <NProgress type="line" :percentage="state.progress" :show-indicator="false" class="mb-2 h-8px rounded-4px" />
        <div class="flex justify-between text-sm text-gray-500">
          <span>{{ state.percent }}</span>
          <span v-if="state.downloading">{{ state.speed }}</span>
        </div>
      </div>
      <div class="flex gap-4 justify-center">
        <NButton v-if="!state.downloading && !state.downloaded" @click="handleCancelUpdate" type="error" ghost strong>
          <template #icon>
            <SvgIcon icon="ic:baseline-close" />
          </template>
          {{ $t('update.cancel') }}
        </NButton>
        <NButton v-if="!state.downloading && !state.downloaded" @click="handleConfirmUpdate" type="success" ghost
          strong>
          <template #icon>
            <SvgIcon icon="material-symbols:download" />
          </template>
          {{ $t('update.updateNow') }}
        </NButton>
        <NButton v-if="state.downloaded" @click="handleInstallUpdate" type="success" ghost strong>
          <template #icon>
            <SvgIcon icon="material-symbols:deployed-code-update-outline" />
          </template>
          {{ $t('update.installNow') }}
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
  border-radius: 8px;
  background-color: rgba($color: #3b82f6, $alpha: 0.1);
  margin-bottom: 15px;
  color: #3b82f6;
}

.update-log-content {
  position: relative;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.7;
  max-height: 300px;
  overflow: auto;
  border: 1px solid;
}

.update-log-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.update-log-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

// 黑夜主题
.update-log-content.dark {
  background: #18181c;
  border-color: #333;
  color: #e0e0e0;

  .update-log-title {
    color: #f3f4f6;
  }

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #18181c;
  }

  &::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #444;
  }
}

// 白天主题
.update-log-content.light {
  background: #f8f9fa;
  border-color: #e2e8f0;
  color: #333;

  .update-log-title {
    color: #1f2937;
  }

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f8f9fa;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
}
</style>
