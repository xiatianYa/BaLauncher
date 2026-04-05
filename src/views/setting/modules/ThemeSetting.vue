<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { useI18n } from 'vue-i18n';
import { NGrid, NGridItem, NSelect, NSlider, NButton, NText } from 'naive-ui';
import { setLocale } from '@/locales';

const { locale, t } = useI18n();
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
</script>

<template>
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
</template>

<style scoped lang="scss">
.game-theme-box {
  width: 100%;
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
</style>
