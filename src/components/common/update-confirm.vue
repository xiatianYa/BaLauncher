<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { NModal, NProgress } from 'naive-ui';
import { MdPreview } from 'md-editor-v3';
import { fetchGetLogByVersion } from '@/service/api';
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

const authStore = useAuthStore();

const updateLog = ref<Api.System.UpdateLogVo | null>(null);
const loadingUpdateLog = ref(false);
const latestVersion = ref<string>('V2.6.1');

/** 下载完成后自动重启倒计时（秒） */
const autoRestartCountdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

/** 清理自动重启倒计时 */
const clearCountdownTimer = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  autoRestartCountdown.value = 0;
};

const showUpdateConfirm = async () => {
  clearCountdownTimer();
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
    const { data, error } = await fetchGetLogByVersion(latestVersion.value);
    if (!error) {
      state.value.show = true;
      updateLog.value = data;
    }
  } catch (error) {
    console.error('加载更新日志失败:', error);
  } finally {
    loadingUpdateLog.value = false;
  }
};

const handleConfirmUpdate = () => {
  state.value.downloading = true;
  state.value.progress = 0;
  window.ipcRenderer.invoke('download-update');
};

const handleCancelUpdate = () => {
  clearCountdownTimer();
  state.value.show = false;
  state.value.downloading = false;
  state.value.downloaded = false;
  state.value.progress = 0;
  updateLog.value = null;
};

const handleInstallUpdate = async () => {
  clearCountdownTimer();
  await window.ipcRenderer.invoke('install-update');
};

const updateAvailableHandler = (_: any, info: any) => {
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

/** 下载完成：进度条读满后，3 秒后自动关闭应用完成更新 */
const updateDownloadedHandler = () => {
  state.value.downloading = false;
  state.value.downloaded = true;
  state.value.progress = 100;
  state.value.percent = '100%';
  startAutoRestartCountdown();
};

/** 启动 3 秒自动重启倒计时 */
const startAutoRestartCountdown = () => {
  clearCountdownTimer();
  autoRestartCountdown.value = 3;
  countdownTimer = setInterval(() => {
    autoRestartCountdown.value -= 1;
    if (autoRestartCountdown.value <= 0) {
      clearCountdownTimer();
      handleInstallUpdate();
    }
  }, 1000);
};

onMounted(() => {
  window.ipcRenderer.on('update-available', updateAvailableHandler);
  window.ipcRenderer.on('update-downloading', updateDownloadingHandler);
  window.ipcRenderer.on('update-downloaded', updateDownloadedHandler);
  showUpdateConfirm();
});

onUnmounted(() => {
  clearCountdownTimer();
  window.ipcRenderer.off('update-available', updateAvailableHandler);
  window.ipcRenderer.off('update-downloading', updateDownloadingHandler);
  window.ipcRenderer.off('update-downloaded', updateDownloadedHandler);
});
</script>

<template>
  <NModal v-model:show="state.show" preset="card" class="update-modal w-480px rounded-16px"
    :bordered="false" :closable="false" v-if="authStore.isLogin">
    <template #header>
      <div class="update-modal-header">
        <div class="update-modal-icon-wrap">
          <SvgIcon icon="mdi:cloud-download-outline" class="update-modal-icon" />
        </div>
        <span>{{ $t('update.title') }}</span>
        <span v-if="updateLog" class="update-version-badge">
          <SvgIcon icon="mdi:tag-outline" />
          v{{ updateLog.version }}
        </span>
      </div>
    </template>

    <div class="update-modal-body">
      <!-- 顶部图标 -->
      <div class="update-hero">
        <div class="update-hero-icon" :class="{ active: state.downloading || state.downloaded }">
          <SvgIcon
            :icon="state.downloaded
              ? 'mdi:restart'
              : state.downloading
                ? 'mdi:progress-download'
                : 'mdi:cloud-download-outline'" />
        </div>
      </div>

      <!-- 更新日志 -->
      <div v-if="!state.downloading && !state.downloaded" class="update-log-box">
        <div v-if="updateLog" class="update-log">
          <h3 class="update-log-title">
            <SvgIcon icon="mdi:note-text-outline" class="log-title-icon" />
            {{ updateLog.title }}
          </h3>
          <MdPreview class="log-markdown" :modelValue="updateLog.content" />
        </div>
        <div v-else-if="loadingUpdateLog" class="update-log-loading">
          <SvgIcon icon="mdi:loading" class="loading-icon" />
          <span>正在加载更新日志...</span>
        </div>
        <p v-else class="update-tip">{{ $t('update.confirm') }}</p>
      </div>

      <!-- 下载进度 -->
      <div v-if="state.downloading || state.downloaded" class="download-section">
        <div class="download-progress">
          <NProgress type="line" :percentage="state.progress" :show-indicator="false" :height="8"
            class="progress-bar" />
          <div class="progress-info">
            <span class="progress-percent">{{ state.percent }}</span>
            <span v-if="state.downloading" class="progress-speed">
              <SvgIcon icon="mdi:speedometer" />
              {{ state.speed }}
            </span>
          </div>
        </div>

        <!-- 自动重启倒计时提示 -->
        <div v-if="state.downloaded" class="auto-restart-tip">
          <SvgIcon icon="mdi:restart" class="restart-icon" />
          <span>更新下载完成，<b>{{ autoRestartCountdown }}</b> 秒后自动重启应用...</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="update-actions">
        <button v-if="!state.downloading && !state.downloaded" class="action-btn cancel"
          @click="handleCancelUpdate">
          <SvgIcon icon="mdi:close" />
          <span>{{ $t('update.cancel') }}</span>
        </button>
        <button v-if="!state.downloading && !state.downloaded" class="action-btn confirm"
          @click="handleConfirmUpdate">
          <SvgIcon icon="mdi:download" />
          <span>{{ $t('update.updateNow') }}</span>
        </button>
        <button v-if="state.downloaded" class="action-btn confirm" @click="handleInstallUpdate">
          <SvgIcon icon="mdi:restart" />
          <span>{{ $t('update.installNow') }}</span>
        </button>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
/* ================================ 更新确认弹窗（teleport 到 body） ================================ */

.update-modal {
  .update-modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .update-modal-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: rgba(102, 126, 234, 0.12);

      .update-modal-icon {
        font-size: 18px;
        color: #667eea;
      }
    }

    .update-version-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      color: #43e97b;
      background: rgba(67, 233, 123, 0.1);

      svg {
        font-size: 13px;
      }
    }
  }

  .update-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 6px 2px 0;
  }

  /* ---------- 顶部图标 ---------- */
  .update-hero {
    display: flex;
    justify-content: center;

    .update-hero-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      font-size: 32px;
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.25);
      transition: all 0.3s ease;

      &.active {
        animation: heroPulse 1.6s ease-in-out infinite;
      }
    }
  }

  /* ---------- 更新日志 ---------- */
  .update-log-box {
    min-height: 100px;
    max-height: 240px;
    border-radius: 12px;
    background: rgba(var(--app-rgb), 0.04);
    border: 1px solid rgba(var(--app-rgb), 0.07);
    overflow: hidden;

    .update-log {
      padding: 14px 16px;
      max-height: 240px;
      overflow-y: auto;

      .update-log-title {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 0.9);

        .log-title-icon {
          font-size: 15px;
          color: #667eea;
        }
      }

      .log-markdown {
        /* md-editor-v3 根容器透明化，沿用外层 update-log 盒子 */
        :deep(.md-editor),
        :deep(.md-editor-content),
        :deep(.md-editor-preview-wrapper),
        :deep(.md-editor-preview) {
          background: transparent;
        }

        :deep(.md-editor-preview-wrapper) {
          padding: 0;
        }

        :deep(.md-editor-preview) {
          font-size: 12.5px;
          line-height: 1.8;
          color: rgba(var(--app-rgb), 0.7);

          &::-webkit-scrollbar {
            width: 4px;
          }

          &::-webkit-scrollbar-thumb {
            border-radius: 4px;
            background: rgba(var(--app-rgb), 0.12);
          }
        }

        /* 标题 */
        :deep(.md-editor-preview h1),
        :deep(.md-editor-preview h2),
        :deep(.md-editor-preview h3),
        :deep(.md-editor-preview h4),
        :deep(.md-editor-preview h5),
        :deep(.md-editor-preview h6) {
          margin: 12px 0 6px;
          font-weight: 600;
          line-height: 1.45;
          color: rgba(var(--app-rgb), 0.92);

          &:first-child {
            margin-top: 0;
          }
        }

        :deep(.md-editor-preview h1) {
          font-size: 16px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(var(--app-rgb), 0.08);
        }

        :deep(.md-editor-preview h2) {
          font-size: 15px;
        }

        :deep(.md-editor-preview h3) {
          font-size: 14px;
        }

        :deep(.md-editor-preview h4),
        :deep(.md-editor-preview h5),
        :deep(.md-editor-preview h6) {
          font-size: 13px;
        }

        /* 段落 / 强调 */
        :deep(.md-editor-preview p) {
          margin: 6px 0;
          color: rgba(var(--app-rgb), 0.72);
        }

        :deep(.md-editor-preview strong) {
          font-weight: 600;
          color: rgba(var(--app-rgb), 0.95);
        }

        :deep(.md-editor-preview em) {
          color: rgba(var(--app-rgb), 0.85);
        }

        /* 链接 */
        :deep(.md-editor-preview a) {
          color: #667eea;
          text-decoration: none;
          border-bottom: 1px solid rgba(102, 126, 234, 0.35);

          &:hover {
            color: #764ba2;
            border-bottom-color: #764ba2;
          }
        }

        /* 列表 */
        :deep(.md-editor-preview ul),
        :deep(.md-editor-preview ol) {
          margin: 6px 0;
          padding-left: 20px;
          color: rgba(var(--app-rgb), 0.72);
        }

        :deep(.md-editor-preview li) {
          margin: 3px 0;
        }

        /* 行内代码 */
        :deep(.md-editor-preview code) {
          font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 5px;
          background: rgba(102, 126, 234, 0.12);
          color: #764ba2;
          word-break: break-all;
        }

        /* 代码块 */
        :deep(.md-editor-preview pre) {
          margin: 10px 0;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(var(--app-rgb), 0.08);
          overflow-x: auto;
          line-height: 1.6;

          code {
            padding: 0;
            background: transparent;
            color: #c9d1f9;
          }
        }

        /* 引用 */
        :deep(.md-editor-preview blockquote) {
          margin: 8px 0;
          padding: 8px 14px;
          border-left: 3px solid #667eea;
          border-radius: 0 8px 8px 0;
          background: rgba(102, 126, 234, 0.08);
          color: rgba(var(--app-rgb), 0.7);

          p {
            margin: 4px 0;
          }
        }

        /* 表格 */
        :deep(.md-editor-preview table) {
          width: 100%;
          margin: 10px 0;
          border-collapse: collapse;
          font-size: 12px;

          th,
          td {
            padding: 7px 12px;
            border: 1px solid rgba(var(--app-rgb), 0.1);
            text-align: left;
          }

          th {
            background: rgba(var(--app-rgb), 0.05);
            font-weight: 600;
            color: rgba(var(--app-rgb), 0.85);
          }

          tr:nth-child(even) td {
            background: rgba(var(--app-rgb), 0.02);
          }
        }

        /* 分割线 / 图片 */
        :deep(.md-editor-preview hr) {
          margin: 14px 0;
          border: none;
          border-top: 1px solid rgba(var(--app-rgb), 0.1);
        }

        :deep(.md-editor-preview img) {
          max-width: 100%;
          border-radius: 8px;
        }
      }

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background: rgba(var(--app-rgb), 0.12);
      }
    }

    .update-log-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 100px;
      font-size: 13px;
      color: rgba(var(--app-rgb), 0.45);

      .loading-icon {
        font-size: 18px;
        color: #667eea;
        animation: spin 1s linear infinite;
      }
    }

    .update-tip {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100px;
      margin: 0;
      font-size: 14px;
      color: rgba(var(--app-rgb), 0.6);
    }
  }

  /* ---------- 下载进度 ---------- */
  .download-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border-radius: 12px;
    background: rgba(var(--app-rgb), 0.04);
    border: 1px solid rgba(var(--app-rgb), 0.07);

    .download-progress {
      .progress-bar {
        :deep(.n-progress-graph-line) {
          border-radius: 4px;
        }

        :deep(.n-progress-graph-line-fill) {
          border-radius: 4px;
        }
      }

      .progress-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
        font-size: 12px;

        .progress-percent {
          font-weight: 600;
          color: #667eea;
        }

        .progress-speed {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: rgba(var(--app-rgb), 0.45);

          svg {
            font-size: 13px;
          }
        }
      }
    }

    .auto-restart-tip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      border-radius: 8px;
      font-size: 12.5px;
      color: #43e97b;
      background: rgba(67, 233, 123, 0.08);
      border: 1px solid rgba(67, 233, 123, 0.2);

      .restart-icon {
        font-size: 15px;
      }

      b {
        font-size: 14px;
      }
    }
  }

  /* ---------- 操作按钮 ---------- */
  .update-actions {
    display: flex;
    gap: 10px;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex: 1;
      padding: 9px 2px;
      border: 1px solid rgba(var(--app-rgb), 0.08);
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.8);
      background: rgba(var(--app-rgb), 0.06);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
      }

      &.cancel {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.1);
        border-color: rgba(245, 87, 108, 0.25);

        &:hover {
          background: rgba(245, 87, 108, 0.22);
        }
      }

      &.confirm {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.25);

        &:hover {
          background: rgba(102, 126, 234, 0.22);
        }
      }
    }
  }
}

@keyframes heroPulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.3);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 8px rgba(102, 126, 234, 0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
