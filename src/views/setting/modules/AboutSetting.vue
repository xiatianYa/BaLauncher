<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NText } from 'naive-ui';
import { $t } from '@/locales';


const isCheckingUpdate = ref(false);
const appVersion = ref('1.0.0');

// 标记是否正在检查更新，防止重复点击
let isUpdateChecking = false;

const updateNotAvailableHandler = () => {
  if (!isUpdateChecking) return;
  window.$message?.success('当前已是最新版本');
  isUpdateChecking = false;
  isCheckingUpdate.value = false;
  // 清理监听器
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
  // 清理监听器
  window.ipcRenderer.off('update-not-available', updateNotAvailableHandler);
  window.ipcRenderer.off('update-error', updateErrorHandler);
};

const checkForUpdates = async () => {
  // 防止重复点击
  if (isUpdateChecking || isCheckingUpdate.value) {
    window.$message?.warning('正在检查更新中，请稍候...');
    return;
  }

  isUpdateChecking = true;
  isCheckingUpdate.value = true;

  try {
    window.$message?.info('正在检查更新...');

    // 先注册监听器
    window.ipcRenderer.on('update-not-available', updateNotAvailableHandler);
    window.ipcRenderer.on('update-error', updateErrorHandler);

    // 调用检查更新
    await window.ipcRenderer.invoke('check-update');
  } catch (error) {
    console.error('检查更新失败:', error);
    window.$message?.error('检查更新失败');
    isUpdateChecking = false;
    isCheckingUpdate.value = false;
    // 清理监听器
    window.ipcRenderer.off('update-not-available', updateNotAvailableHandler);
    window.ipcRenderer.off('update-error', updateErrorHandler);
  }
};

const getAppVersion = async () => {
  try {
    const version = await window.ipcRenderer.getAppVersion();
    appVersion.value = version;
  } catch (error) {
    console.error($t('settings.messages.versionFetchFailed'), error);
  }
};

defineExpose({
  getAppVersion
});
</script>

<template>
  <div class="game-info-box">
    <div class="game-info-title mb-10px">
      <div class="flex font-size-24px">
        <SvgIcon icon="solar:info-square-broken" />
      </div>
      <div class="ml-10px font-size-16px font-semibold">
        <NText>
          {{ $t('settings.about') }}
        </NText>
      </div>
    </div>
    <div class="game-info-content mt-15px">
      <div class="auth-info">
        <div class="auth-icon">
          <SvgIcon icon="material-symbols:account-circle" />
        </div>
        <div class="auth-text">
          <div class="license">{{ $t('settings.aboutInfo.developer') }}</div>
          <div class="auth">{{ $t('settings.aboutInfo.author') }}</div>
        </div>
      </div>
    </div>
    <div class="game-info-content mt-15px">
      <div class="version-info">
        <div class="version-icon">
          <SvgIcon icon="mdi:tag-multiple-outline" />
        </div>
        <div class="version-text">
          <div class="license">{{ $t('settings.version') }}</div>
          <div class="version">{{ appVersion }}</div>
        </div>
        <NButton type="primary" ghost @click="checkForUpdates" :loading="isCheckingUpdate">
          <template #icon>
            <SvgIcon icon="material-symbols:refresh" />
          </template>
          {{ isCheckingUpdate ? $t('settings.checking') : $t('settings.checkUpdate') }}
        </NButton>
      </div>
    </div>
    <div class="game-info-content mt-15px">
      <div class="copyright-info">
        <div class="copyright-icon">
          <SvgIcon icon="mingcute:safe-shield-line" />
        </div>
        <div class="copyright-text">
          <div class="license">{{ $t('settings.aboutInfo.license') }}</div>
          <div class="copyright">{{ $t('settings.aboutInfo.copyright') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.game-info-box {
  width: 100%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);

  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 6px 25px rgba(139, 92, 246, 0.2);
  }

  .game-info-title {
    display: flex;
    align-items: center;
  }

  .game-info-content {
    padding: 10px;

    .auth-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      background: rgba(165, 170, 1630, 0.2);
      border-radius: 10px;
      border-left: 2px solid #90cbfb;

      .auth-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .auth-text {
        flex: 1;

        .license {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #90cbfb;
          }
        }

        .auth {
          font-size: 13px;
          font-weight: 500;
        }
      }
    }

    .version-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      background: rgba(165, 170, 1630, 0.2);
      border-radius: 10px;
      border-left: 2px solid #90cbfb;

      .version-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .version-text {
        flex: 1;

        .license {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #90cbfb;
          }
        }

        .version {
          font-size: 13px;
          font-weight: 500;
        }
      }
    }

    .copyright-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      background: rgba(165, 170, 1630, 0.2);
      border-radius: 10px;
      border-left: 2px solid #90cbfb;

      .copyright-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .copyright-text {
        flex: 1;

        .license {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '';
            width: 6px;
            height: 6px;
            background: #90cbfb;
            border-radius: 50%;
          }
        }

        .copyright {
          font-size: 13px;
          font-weight: 500;
        }
      }
    }
  }

  .game-info-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}
</style>
