import { ref, computed, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import { $t } from '@/locales';
import { fetchGetLogByVersion } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useDict } from '@/hooks/business/dict';

/* ===== 类型定义 ===== */

interface UpdateState {
  show: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  speed: string;
  percent: string;
}

/* ===== Hook ===== */

export function useAppUpdate() {
  const authStore = useAuthStore();
  const { dictLabel } = useDict();

  // ========== 响应式状态 ==========

  const state = ref<UpdateState>({
    show: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    speed: '0 KB/s',
    percent: '0%'
  });

  const updateLog = ref<Api.System.UpdateLogVo | null>(null);
  const loadingUpdateLog = ref(false);
  const latestVersion = ref<string>('');
  const autoRestartCountdown = ref(0);

  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  // ========== 计算属性 ==========

  /** 更新类型文案（来自字典 sys_updateLog_type） */
  const updateTypeLabel = computed(() => {
    const updateType = updateLog.value?.updateType;
    return updateType ? dictLabel('sys_updateLog_type', updateType) : '';
  });

  // ========== 工具函数 ==========

  /** 格式化更新时间 */
  const formatDateTime = (dateStr?: string): string =>
    dateStr ? dayjs(dateStr).format($t('updateLog.dateFormat')) : '';

  /** 清理自动重启倒计时 */
  const clearCountdownTimer = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    autoRestartCountdown.value = 0;
  };

  // ========== 数据加载 ==========

  const loadUpdateLog = async () => {
    if (!latestVersion.value) {
      console.log('[useAppUpdate] loadUpdateLog 跳过: latestVersion 为空');
      return;
    }
    console.log('[useAppUpdate] loadUpdateLog 开始, version:', latestVersion.value);
    loadingUpdateLog.value = true;
    try {
      const { data, error } = await fetchGetLogByVersion(latestVersion.value);
      console.log('[useAppUpdate] fetchGetLogByVersion 返回:', { data, error });
      if (!error) {
        state.value.show = true;
        updateLog.value = data;
        console.log('[useAppUpdate] 弹窗已打开, updateLog:', data);
      } else {
        console.warn('[useAppUpdate] fetchGetLogByVersion 返回错误, 弹窗未打开');
      }
    } catch (error) {
      console.error('[useAppUpdate] 加载更新日志失败:', error);
    } finally {
      loadingUpdateLog.value = false;
    }
  };

  // ========== 业务方法 ==========

  const showUpdateConfirm = async () => {
    clearCountdownTimer();
    state.value.downloading = false;
    state.value.downloaded = false;
    state.value.progress = 0;
    state.value.speed = '0 KB/s';
    state.value.percent = '0%';

    await loadUpdateLog();
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

  // ========== IPC 事件处理 ==========

  const updateAvailableHandler = (_: any, info: any) => {
    console.log('[useAppUpdate] 收到 update-available 事件:', info);
    if (info && info.version) {
      latestVersion.value = info.version;
    }
    showUpdateConfirm();
  };

  const updateDownloadingHandler = (_: any, info: any) => {
    console.log('[useAppUpdate] 收到 update-downloading 事件:', info);
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
    console.log('[useAppUpdate] 收到 update-downloaded 事件');
    state.value.downloading = false;
    state.value.downloaded = true;
    state.value.progress = 100;
    state.value.percent = '100%';
    startAutoRestartCountdown();
  };

  /** 更新出错：关闭弹窗并提示用户 */
  const updateErrorHandler = (_: any, error: any) => {
    console.error('[useAppUpdate] 收到 update-error 事件:', error);
    const msg = error?.message || $t('update.error');
    clearCountdownTimer();
    state.value.show = false;
    updateLog.value = null;
    window.$message?.error(msg);
  };

  // ========== 生命周期 ==========

  onMounted(() => {
    console.log('[useAppUpdate] onMounted: 注册 IPC 监听器');
    window.ipcRenderer.on('update-available', updateAvailableHandler);
    window.ipcRenderer.on('update-downloading', updateDownloadingHandler);
    window.ipcRenderer.on('update-downloaded', updateDownloadedHandler);
    window.ipcRenderer.on('update-error', updateErrorHandler);

    // 主动触发主进程检查更新
    console.log('[useAppUpdate] 主动触发 check-update IPC');
    window.ipcRenderer.invoke('check-update').catch((err) => {
      console.error('[useAppUpdate] check-update IPC 调用失败:', err);
    });
  });

  onUnmounted(() => {
    console.log('[useAppUpdate] onUnmounted: 清理 IPC 监听器');
    clearCountdownTimer();
    window.ipcRenderer.off('update-available', updateAvailableHandler);
    window.ipcRenderer.off('update-downloading', updateDownloadingHandler);
    window.ipcRenderer.off('update-downloaded', updateDownloadedHandler);
    window.ipcRenderer.off('update-error', updateErrorHandler);
  });

  // ========== 导出 ==========

  return {
    /** 全局状态 */
    state,
    /** 更新日志数据 */
    updateLog,
    /** 是否正在加载更新日志 */
    loadingUpdateLog,
    /** 最新版本号 */
    latestVersion,
    /** 自动重启倒计时秒数 */
    autoRestartCountdown,
    /** 更新类型标签文本 */
    updateTypeLabel,
    /** 格式化时间戳 */
    formatDateTime,
    /** 确认更新 */
    handleConfirmUpdate,
    /** 取消更新 */
    handleCancelUpdate,
    /** 立即安装 */
    handleInstallUpdate
  };
}
