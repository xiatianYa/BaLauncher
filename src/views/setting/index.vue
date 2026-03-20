<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useGameStore } from '@/store/modules/game';
import { useAppStore } from '@/store/modules/app';
import { localStg } from '@/utils/storage';
import { animate } from 'animejs';
import type { GamePlatform } from '@/constants/app';
import { NGrid, NGridItem, NSelect } from 'naive-ui';
import { setLocale } from '@/locales';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { START_ITEMS } from '@/constants/startItems';

defineOptions({
  name: 'setting'
});

const router = useRouter();
const { locale, t } = useI18n();
const gameStore = useGameStore();
const appStore = useAppStore();

const themes = computed(() => appStore.themes);

const currentTheme = computed(() => appStore.currentTheme);

const langOptions = computed(() => [
  { label: t('settings.langOptions.zhCN'), value: 'zh-CN' },
  { label: t('settings.langOptions.enUS'), value: 'en-US' }
]);

const handleLangChange = (val: App.I18n.LangType) => {
  setLocale(val);
};

const themeAudio = ref<HTMLAudioElement | null>(null);

const selectTheme = (themeId: string) => {
  appStore.setTheme(themeId);
  const audioSrc = appStore.audioMap[themeId] || appStore.audioMap['阿罗娜'];
  if (audioSrc) {
    if (!themeAudio.value) {
      themeAudio.value = new Audio(audioSrc);
    } else {
      themeAudio.value.pause();
      themeAudio.value.currentTime = 0;
      themeAudio.value.src = audioSrc;
    }
    themeAudio.value.volume = appStore.volume;
    themeAudio.value.play();
  }
};

const titleRef = ref<HTMLElement | null>(null);
const isDetectingSteam = ref(false);
const isDetectingCsgo = ref(false);
const isCheckingUpdate = ref(false);
const appVersion = ref('1.0.0');

const previewAudio = () => {
  const audioSrc = appStore.audioMap[currentTheme.value] || appStore.audioMap['阿罗娜'];
  if (audioSrc) {
    if (!themeAudio.value) {
      themeAudio.value = new Audio(audioSrc);
    } else {
      themeAudio.value.pause();
      themeAudio.value.currentTime = 0;
      themeAudio.value.src = audioSrc;
    }
    themeAudio.value.volume = appStore.volume;
    themeAudio.value.play();
  }
};

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
    console.error(t('settings.messages.versionFetchFailed'), error);
  }
};

const GamePlatform = computed({
  get: () => gameStore.GamePlatform,
  set: (val: GamePlatform) => gameStore.setGamePlatform(val)
});

const csgo2Path = computed({
  get: () => gameStore.csgo2Path,
  set: (val: string) => gameStore.setCsgo2Path(val)
});

const steamPath = computed({
  get: () => gameStore.steamPath,
  set: (val: string) => gameStore.setSteamPath(val)
});

const selectedStartItemsList = computed(() => {
  const presetItems = START_ITEMS.filter(item => gameStore.selectedStartItems.includes(item.value));
  const customValues = gameStore.selectedStartItems.filter(
    value => !START_ITEMS.some(item => item.value === value)
  );
  const customItems = customValues.map(value => ({ label: value, value }));
  return [...presetItems, ...customItems];
});

const customStartItem = ref('');

const addCustomStartItem = () => {
  const value = customStartItem.value.trim();
  if (!value) {
    window.$message?.warning('请输入启动选项');
    return;
  }
  if (gameStore.selectedStartItems.includes(value)) {
    window.$message?.warning('该启动选项已存在');
    return;
  }
  gameStore.toggleStartItem(value);
  customStartItem.value = '';
  window.$message?.success('添加成功');
};

const selectCsgo2Path = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', t('settings.messages.selectCsgoPath'));
  if (result) {
    csgo2Path.value = result;
    window.$message?.success(t('settings.messages.csgoPathSaved'));
  }
};

const clearCache = () => {
  try {
    // 只清理侧边栏路由缓存
    localStg.remove('sideNavRoutes');

    // 重新计算缓存大小
    calculateCacheSize();

    // 刷新页面以应用更改
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    window.$message?.error(t('settings.messages.cacheClearFailed'));
  }
};

const selectSteamPath = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', t('settings.messages.selectSteamPath'));
  if (result) {
    steamPath.value = result;
    window.$message?.success(t('settings.messages.steamPathSaved'));
  }
};

const autoDetectSteamPath = async () => {
  isDetectingSteam.value = true;
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths');
    if (result.steamPath) {
      steamPath.value = result.steamPath;
      window.$message?.success(t('settings.messages.autoDetectSteamSuccess'));
    } else {
      window.$message?.warning(t('settings.messages.autoDetectSteamMissing'));
    }
  } catch (error) {
    window.$message?.error(t('settings.messages.autoDetectFailed'));
  } finally {
    isDetectingSteam.value = false;
  }
};

const autoDetectCsgo2Path = async () => {
  isDetectingCsgo.value = true;
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths');
    if (result.csgo2Path) {
      csgo2Path.value = result.csgo2Path;
      window.$message?.success(t('settings.messages.autoDetectCsgoSuccess'));
    } else {
      window.$message?.warning(t('settings.messages.autoDetectCsgoMissing'));
    }
  } catch (error) {
    window.$message?.error(t('settings.messages.autoDetectFailed'));
  } finally {
    isDetectingCsgo.value = false;
  }
};

const selectPlatform = (platform: 'international' | 'perfect') => {
  GamePlatform.value = platform;
};

const cacheSize = ref('0 KB');

const calculateCacheSize = () => {
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('BA_')) {
      const value = localStorage.getItem(key);
      if (value) {
        size += (key.length + value.length) * 2; // JS strings are UTF-16
      }
    }
  }

  if (size < 1024) {
    cacheSize.value = `${size} B`;
  } else if (size < 1024 * 1024) {
    cacheSize.value = `${(size / 1024).toFixed(2)} KB`;
  } else {
    cacheSize.value = `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};

onMounted(() => {
  calculateCacheSize();
  getAppVersion();

  nextTick(() => {
    if (titleRef.value) {
      const text = titleRef.value.textContent || '';
      titleRef.value.innerHTML = '';

      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.className = 'title-char';
        span.style.opacity = '0';
        span.style.transform = 'translateY(-30px) rotate(-10deg)';
        titleRef.value!.appendChild(span);
      });

      animate(titleRef.value, {
        targets: '.title-char',
        translateY: [-30, 0],
        rotate: [-10, 0],
        opacity: [0, 1],
        delay: 80,
        duration: 800,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  });
});

</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:10px;"
      content-class="h-full flex flex-col flex-1 overflow-y-auto" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <div class="title-container">
          <div class="flex items-center">
            <div class="setting-icon">⚙️</div>
          </div>
          <h1 class="title-text text-20px font-bold bg-gradient-to-r bg-clip-text text-transparent ml-5px">
            <NText>
              {{ $t('routes.setting') }}
            </NText>
          </h1>
        </div>
      </template>
      <div class="game-theme-box">
        <div class="game-theme-title mb-10px justify-between">
          <div class="flex items-center">
            <div class="flex font-size-24px">
              <SvgIcon icon="unjs:theme-colors" />
            </div>
            <div class="ml-10px font-size-16px font-semibold">
              <NText>
                {{ $t('settings.theme') }}
              </NText>
            </div>
          </div>
          <div class="w-120px">
            <NSelect v-model:value="locale" :options="langOptions" @update:value="handleLangChange" size="small" />
          </div>
        </div>
        <div class="theme-list">
          <NGrid :cols="5" :x-gap="12" :y-gap="12">
            <NGridItem v-for="theme in themes" :key="theme.id">
              <div class="theme-item" :class="{ active: currentTheme === theme.id }" @click="selectTheme(theme.id)">
                <div class="theme-img-wrapper">
                  <img :src="theme.img" :alt="theme.name" class="theme-img" />
                </div>
                <div class="theme-name">{{ theme.name }}</div>
              </div>
            </NGridItem>
          </NGrid>
        </div>
        <div class="flex items-center pl-20px pr-20px">
          <NText class="w-80px font-bold">
            {{ $t('settings.volumeControl') }}
          </NText>
          <NSlider class="flex-1" :value="appStore.volume" :min="0" :max="1" :step="0.1"
            :marks="{ 0: '0', 0.1: '0.1', 0.2: '0.2', 0.3: '0.3', 0.4: '0.4', 0.5: '0.5', 0.6: '0.6', 0.7: '0.7', 0.8: '0.8', 0.9: '0.9', 1: '1' }"
            @update:value="appStore.setVolume" />
          <NButton class="ml-10px rounded-5px" size="small" type="info" ghost @click="previewAudio">
            {{ $t('settings.preview') }}
          </NButton>
        </div>
      </div>
      <div class="game-setting-box">
        <div class="game-setting-title">
          <div class="flex font-size-24px">
            <SvgIcon icon="solar:gamepad-broken" />
          </div>
          <div class="ml-10px font-size-16px font-semibold">
            <NText>
              {{ $t('settings.general') }}
            </NText>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold">
            <NText>
              {{ $t('settings.platform') }}
            </NText>
          </div>
          <div class="flex-1 ml-10px">
            <NButton class="mr-10px rounded-8px" :color="GamePlatform === 'international' ? '#18a058' : '#a5aaa3'" ghost
              size="large" @click="selectPlatform('international')">
              <template #icon>
                <SvgIcon icon="mdi:steam" />
              </template>
              {{ $t('settings.international') }}
            </NButton>
            <NButton class="rounded-8px" :color="GamePlatform === 'perfect' ? '#18a058' : '#a5aaa3'" ghost size="large"
              @click="selectPlatform('perfect')">
              <template #icon>
                <SvgIcon icon="mdi:earth" />
              </template>
              {{ $t('settings.perfect') }}
            </NButton>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold">
            <NText>
              {{ $t('settings.gamePath') }}
            </NText>
          </div>
          <div class="flex-1 ml-10px">
            <NInput v-model:value="csgo2Path" :placeholder="$t('settings.inputCsgoPath')" :disabled="true" />
          </div>
          <div class="ml-10px">
            <NButton class="rounded-8px mr-10px" ghost @click="selectCsgo2Path">
              {{ $t('settings.selectPath') }}
            </NButton>
            <NButton class="rounded-8px" ghost @click="autoDetectCsgo2Path">
              {{ $t('settings.autoDetect') }}
            </NButton>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold">
            <NText>
              {{ $t('settings.steamPath') }}
            </NText>
          </div>
          <div class="flex-1 ml-10px">
            <NInput v-model:value="steamPath" :placeholder="$t('settings.inputSteamPath')" :disabled="true" />
          </div>
          <div class="ml-10px">
            <NButton class="rounded-8px mr-10px" ghost @click="selectSteamPath">
              {{ $t('settings.selectPath') }}
            </NButton>
            <NButton class="rounded-8px" ghost @click="autoDetectSteamPath">
              {{ $t('settings.autoDetect') }}
            </NButton>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold mr-5px w-120px">
            <NText class="w-150px">
              {{ $t('settings.customStartOptions') }}
            </NText>
          </div>
          <div>
            <NGrid :cols="3" :x-gap="12" :y-gap="12">
              <NGridItem v-for="item in START_ITEMS" :key="item.value">
                <NButton class="rounded-5px font-size-12px w-full" ghost
                  :type="gameStore.selectedStartItems.includes(item.value) ? 'primary' : 'tertiary'"
                  @click="gameStore.toggleStartItem(item.value)">
                  <template #icon>
                    <SvgIcon v-if="gameStore.selectedStartItems.includes(item.value)" icon="ic:sharp-clear" />
                  </template>
                  {{ item.label }}
                </NButton>
              </NGridItem>
            </NGrid>
            <div class="flex mt-10px">
              <NInput v-model:value="customStartItem" class="rounded-5px mr-10px"
                :placeholder="$t('settings.inputCustomStartOption')" @keyup.enter="addCustomStartItem" />
              <NButton class="rounded-5px" type="info" @click="addCustomStartItem">{{ $t('settings.add') }}</NButton>
            </div>
            <div class="flex items-center mt-5px font-size-12px">
              <SvgIcon icon="material-symbols:lightbulb-2-outline" class="color-#f0a020 mr-5px" />
              {{ $t('settings.customStartOptionTip') }}
            </div>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold mr-5px w-120px">
            <NText class="w-150px">
              {{ $t('settings.currentSelectedItems') }}
            </NText>
          </div>
          <NGrid :cols="3" :x-gap="12" :y-gap="12">
            <NGridItem v-for="item in selectedStartItemsList" :key="item.value">
              <NButton class="rounded-5px font-size-12px w-full" ghost type="warning">
                {{ item.label }}
              </NButton>
            </NGridItem>
          </NGrid>
        </div>
      </div>
      <div class="game-cache-box">
        <div class="game-cache-title mb-10px">
          <div class="flex font-size-24px">
            <SvgIcon icon="octicon:cache-24" />
          </div>
          <div class="ml-10px font-size-16px font-semibold">
            <NText>
              {{ $t('settings.cache.title') }}
            </NText>
          </div>
        </div>
        <div class="game-cache-item justify-between">
          <div class="flex flex-col">
            <div class="text-gray-600 font-bold">{{ $t('settings.cache.size') }}</div>
            <div class="text-12px text-gray-400 mt-2px">{{ $t('settings.cache.size') }} ({{ cacheSize }})</div>
          </div>
          <NButton type="error" ghost @click="clearCache">
            <template #icon>
              <SvgIcon icon="material-symbols:delete-outline" />
            </template>
            {{ $t('settings.cache.clear') }}
          </NButton>
        </div>
      </div>
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
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
.title-container {
  display: flex;
  align-items: center;
  position: relative;

  .setting-icon {
    font-size: 24px;
    animation: rotate 10s linear infinite;
    display: inline-block;
  }

  .title-text {
    height: 100%;
    display: inline-flex;
    letter-spacing: 0.05em;

    .title-char {
      display: inline-block;
    }
  }
}

.game-setting-box {
  width: full;
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

  .game-setting-title {
    display: flex;
    align-items: center;
  }

  .game-setting-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}

.game-info-box {
  width: full;
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

.game-cache-box {
  width: full;
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

  .game-cache-title {
    display: flex;
    align-items: center;
  }

  .game-cache-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}

.game-theme-box {
  width: full;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);

  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 6px 25px rgba(139, 92, 246, 0.2);
  }

  .game-theme-title {
    display: flex;
    align-items: center;
  }
}

.theme-list {
  padding: 10px 0;

  .theme-item {
    cursor: pointer;
    text-align: center;
    border-radius: 8px;
    padding: 8px;
    transition: all 0.3s;
    border: 2px solid transparent;

    &:hover {
      background-color: rgba(139, 92, 246, 0.1);
    }

    &.active {
      border-color: #8b5cf6;
      background-color: rgba(139, 92, 246, 0.15);

      .theme-name {
        color: #8b5cf6;
        font-weight: bold;
      }
    }

    .theme-img-wrapper {
      width: 100%;
      aspect-ratio: 16/9;
      overflow: hidden;
      border-radius: 6px;
      margin-bottom: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .theme-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    &:hover .theme-img {
      transform: scale(1.05);
    }

    .theme-name {
      font-size: 14px;
      color: #666;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
