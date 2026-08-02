<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NText } from 'naive-ui'
import { $t } from '@/locales'

const isCheckingUpdate = ref(false)
const appVersion = ref('1.0.0')

// 标记是否正在检查更新，防止重复点击
let isUpdateChecking = false

const updateNotAvailableHandler = () => {
  if (!isUpdateChecking) return
  window.$message?.success('当前已是最新版本')
  isUpdateChecking = false
  isCheckingUpdate.value = false
  // 清理监听器
  window.ipcRenderer.off('update-not-available', updateNotAvailableHandler)
  window.ipcRenderer.off('update-error', updateErrorHandler)
}

const updateErrorHandler = (_event: any, errorMsg?: string) => {
  if (!isUpdateChecking) return
  if (errorMsg) {
    window.$message?.error(errorMsg)
  }
  isUpdateChecking = false
  isCheckingUpdate.value = false
  // 清理监听器
  window.ipcRenderer.off('update-not-available', updateNotAvailableHandler)
  window.ipcRenderer.off('update-error', updateErrorHandler)
}

const checkForUpdates = async () => {
  // 防止重复点击
  if (isUpdateChecking || isCheckingUpdate.value) {
    window.$message?.warning('正在检查更新中，请稍候...')
    return
  }

  isUpdateChecking = true
  isCheckingUpdate.value = true

  try {
    window.$message?.info('正在检查更新...')

    // 先注册监听器
    window.ipcRenderer.on('update-not-available', updateNotAvailableHandler)
    window.ipcRenderer.on('update-error', updateErrorHandler)

    // 调用检查更新
    await window.ipcRenderer.invoke('check-update')
  } catch (error) {
    console.error('检查更新失败:', error)
    window.$message?.error('检查更新失败')
    isUpdateChecking = false
    isCheckingUpdate.value = false
    // 清理监听器
    window.ipcRenderer.off('update-not-available', updateNotAvailableHandler)
    window.ipcRenderer.off('update-error', updateErrorHandler)
  }
}

const getAppVersion = async () => {
  try {
    const version = await window.ipcRenderer.getAppVersion()
    appVersion.value = version
  } catch (error) {
    console.error($t('settings.messages.versionFetchFailed'), error)
  }
}

defineExpose({
  getAppVersion,
})
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="solar:info-square-broken" class="section-icon" />
        <NText>{{ $t('settings.about') }}</NText>
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
        <NButton type="primary" ghost :loading="isCheckingUpdate" @click="checkForUpdates">
          <template #icon>
            <SvgIcon icon="material-symbols:refresh" />
          </template>
          {{ isCheckingUpdate ? $t('settings.checking') : $t('settings.checkUpdate') }}
        </NButton>
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
  padding: 16px;
  border-radius: 12px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .section-icon {
      font-size: 20px;
      color: var(--primary-color, #18a058);
    }
  }
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--primary-color, #18a058);
  }

  .info-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    font-size: 20px;
    color: var(--primary-color, #18a058);
    background-color: var(--primary-color-suppl, rgba(24, 160, 88, 0.1));
  }

  .info-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--n-text-color-2);
    }

    .info-value {
      font-size: 13px;
      color: var(--n-text-color);
    }
  }
}
</style>
