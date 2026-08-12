<script setup lang="ts">
import { ref } from 'vue';
import { $t } from '@/locales';

const isCheckingUpdate = ref(false);
const appVersion = ref('1.0.0');

let isUpdateChecking = false;

const updateNotAvailableHandler = () => {
  if (!isUpdateChecking) return;
  window.$message?.success($t('settings.messages.alreadyLatest'));
  isUpdateChecking = false;
  isCheckingUpdate.value = false;
  window.ipcRenderer.off('update-not-available', updateNotAvailableHandler);
  window.ipcRenderer.off('update-error', updateErrorHandler);
};

const updateErrorHandler = (_event: any, errorMsg?: string) => {
  if (!isUpdateChecking) return;
  if (errorMsg) {
    window.$message?.error(errorMsg);
  }
  isUpdateChecking = false;
  isCheckingUpdate.value = false;
  window.ipcRenderer.off('update-not-available', updateNotAvailableHandler);
  window.ipcRenderer.off('update-error', updateErrorHandler);
};

const checkForUpdates = async () => {
  if (isUpdateChecking || isCheckingUpdate.value) {
    window.$message?.warning($t('settings.messages.checkingUpdateInProgress'));
    return;
  }

  isUpdateChecking = true;
  isCheckingUpdate.value = true;

  try {
    window.$message?.info($t('settings.messages.checkingUpdate'));
    window.ipcRenderer.on('update-not-available', updateNotAvailableHandler);
    window.ipcRenderer.on('update-error', updateErrorHandler);
    await window.ipcRenderer.invoke('check-update');
  } catch {
    window.$message?.error($t('settings.messages.checkUpdateFailed'));
    isUpdateChecking = false;
    isCheckingUpdate.value = false;
    window.ipcRenderer.off('update-not-available', updateNotAvailableHandler);
    window.ipcRenderer.off('update-error', updateErrorHandler);
  }
};

const getAppVersion = async () => {
  try {
    const version = await window.ipcRenderer.getAppVersion();
    appVersion.value = version;
  } catch {
    console.error($t('settings.messages.versionFetchFailed'));
  }
};

defineExpose({ getAppVersion });
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="solar:info-square-broken" class="section-icon" />
        <span class="section-text">{{ $t('settings.about') }}</span>
      </div>
    </div>

    <div class="section-content">
      <div class="info-card">
        <div class="info-icon">
          <SvgIcon icon="material-symbols:account-circle" />
        </div>
        <div class="info-text">
          <div class="info-label">{{ $t('settings.aboutInfo.developer') }}</div>
          <div class="info-value">{{ $t('settings.aboutInfo.author') }}</div>
        </div>
      </div>

      <div class="info-card">
        <div class="info-icon">
          <SvgIcon icon="mdi:tag-multiple-outline" />
        </div>
        <div class="info-text">
          <div class="info-label">{{ $t('settings.version') }}</div>
          <div class="info-value">{{ appVersion }}</div>
        </div>
        <button class="check-update-btn" :disabled="isCheckingUpdate" @click="checkForUpdates">
          <SvgIcon :icon="isCheckingUpdate ? 'mdi:loading' : 'material-symbols:refresh'" class="btn-icon" :class="{ spin: isCheckingUpdate }" />
          <span>{{ isCheckingUpdate ? $t('settings.checking') : $t('settings.checkUpdate') }}</span>
        </button>
      </div>

      <div class="info-card">
        <div class="info-icon">
          <SvgIcon icon="mingcute:safe-shield-line" />
        </div>
        <div class="info-text">
          <div class="info-label">{{ $t('settings.aboutInfo.license') }}</div>
          <div class="info-value">{{ $t('settings.aboutInfo.copyright') }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.setting-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;

    .section-icon {
      font-size: 20px;
      color: #667eea;
    }

    .section-text {
      font-size: 15px;
      font-weight: 600;
      color: var(--n-text-color);
    }
  }
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(var(--app-rgb), 0.025);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(102, 126, 234, 0.2);
  }

  .info-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 9px;
    font-size: 20px;
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
    flex-shrink: 0;
  }

  .info-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;

    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(var(--app-rgb), 0.5);
    }

    .info-value {
      font-size: 13px;
      color: var(--n-text-color);
    }
  }
}

.check-update-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: 1px solid rgba(var(--app-rgb), 0.08);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(var(--app-rgb), 0.55);
  background: rgba(var(--app-rgb), 0.04);
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;

  .btn-icon {
    font-size: 15px;
  }

  &:hover:not(:disabled) {
    color: rgba(var(--app-rgb), 0.7);
    background: rgba(var(--app-rgb), 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
