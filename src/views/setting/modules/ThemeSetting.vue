<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NGrid, NGridItem, NSelect, NSlider, NButton, NText } from 'naive-ui'
import { useAppStore } from '@/store/modules/app'
import { setLocale } from '@/locales'

const { locale, t } = useI18n()
const appStore = useAppStore()

const themes = computed(() => appStore.themes)
const currentTheme = computed(() => appStore.currentTheme)

const langOptions = computed(() => [
  { label: t('settings.langOptions.zhCN'), value: 'zh-CN' },
  { label: t('settings.langOptions.enUS'), value: 'en-US' },
])

const handleLangChange = (val: App.I18n.LangType) => {
  setLocale(val)
}

const themeAudio = ref<HTMLAudioElement | null>(null)

const selectTheme = (themeId: string) => {
  appStore.setTheme(themeId)
  const audioSrc = appStore.audioMap[themeId] || appStore.audioMap['阿罗娜']
  if (!audioSrc) return

  if (!themeAudio.value) {
    themeAudio.value = new Audio(audioSrc)
  } else {
    themeAudio.value.pause()
    themeAudio.value.currentTime = 0
    themeAudio.value.src = audioSrc
  }
  themeAudio.value.volume = appStore.volume
  themeAudio.value.play()
}

const previewAudio = () => {
  const audioSrc = appStore.audioMap[currentTheme.value] || appStore.audioMap['阿罗娜']
  if (!audioSrc) return

  if (!themeAudio.value) {
    themeAudio.value = new Audio(audioSrc)
  } else {
    themeAudio.value.pause()
    themeAudio.value.currentTime = 0
    themeAudio.value.src = audioSrc
  }
  themeAudio.value.volume = appStore.volume
  themeAudio.value.play()
}
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="unjs:theme-colors" class="section-icon" />
        <NText>{{ $t('settings.theme') }}</NText>
      </div>
      <div class="section-extra">
        <NSelect v-model:value="locale" :options="langOptions" @update:value="handleLangChange" size="small" />
      </div>
    </div>

    <div class="section-content">
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

      <div class="volume-row">
        <NText class="volume-label">{{ $t('settings.volumeControl') }}</NText>
        <NSlider class="volume-slider" :value="appStore.volume" :min="0" :max="1" :step="0.1"
          :marks="{ 0: '0', 0.5: '0.5', 1: '1' }" @update:value="appStore.setVolume" />
        <NButton size="small" type="primary" ghost @click="previewAudio">
          {{ $t('settings.preview') }}
        </NButton>
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
  justify-content: space-between;
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

  .section-extra {
    width: 120px;
  }
}

.section-content {
  .theme-item {
    cursor: pointer;
    text-align: center;
    border-radius: 8px;
    padding: 8px;
    border: 1px solid transparent;
    background-color: var(--n-color);
    transition: background-color 0.2s ease, border-color 0.2s ease;

    &:hover {
      background-color: var(--n-border-color);
    }

    &.active {
      border-color: var(--primary-color, #18a058);
      background-color: var(--primary-color-suppl, rgba(24, 160, 88, 0.1));

      .theme-name {
        color: var(--primary-color, #18a058);
        font-weight: 600;
      }
    }
  }

  .theme-img-wrapper {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 6px;
    margin-bottom: 8px;
    background-color: var(--n-border-color);
  }

  .theme-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .theme-name {
    font-size: 13px;
    color: var(--n-text-color);
  }

  .volume-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    padding: 12px;
    border-radius: 8px;
    background-color: var(--n-color);
    border: 1px solid var(--n-border-color);

    .volume-label {
      flex: 0 0 auto;
      width: 70px;
      font-size: 13px;
      font-weight: 600;
      color: var(--n-text-color);
    }

    .volume-slider {
      flex: 1;
    }
  }
}
</style>
