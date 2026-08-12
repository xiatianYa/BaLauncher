<script setup lang="ts">
import { ref, computed } from 'vue';
import { NSlider } from 'naive-ui';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();

const themes = computed(() => appStore.themes);
const currentTheme = computed(() => appStore.currentTheme);

const themeAudio = ref<HTMLAudioElement | null>(null);

const selectTheme = (themeId: string) => {
  appStore.setTheme(themeId);
  const audioSrc = appStore.audioMap[themeId] || appStore.audioMap['阿罗娜'];
  if (!audioSrc) return;

  if (!themeAudio.value) {
    themeAudio.value = new Audio(audioSrc);
  } else {
    themeAudio.value.pause();
    themeAudio.value.currentTime = 0;
    themeAudio.value.src = audioSrc;
  }
  themeAudio.value.volume = appStore.volume;
  themeAudio.value.play();
};

const previewAudio = () => {
  const audioSrc = appStore.audioMap[currentTheme.value] || appStore.audioMap['阿罗娜'];
  if (!audioSrc) return;

  if (!themeAudio.value) {
    themeAudio.value = new Audio(audioSrc);
  } else {
    themeAudio.value.pause();
    themeAudio.value.currentTime = 0;
    themeAudio.value.src = audioSrc;
  }
  themeAudio.value.volume = appStore.volume;
  themeAudio.value.play();
};
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="unjs:theme-colors" class="section-icon" />
        <span class="section-text">{{ $t('settings.theme') }}</span>
      </div>
    </div>

    <div class="section-content">
      <!-- 主题网格 -->
      <div class="theme-grid">
        <div
          v-for="theme in themes"
          :key="theme.id"
          class="theme-item"
          :class="{ active: currentTheme === theme.id }"
          @click="selectTheme(theme.id)"
        >
          <div class="theme-img-wrapper">
            <img :src="theme.img" :alt="theme.name" class="theme-img" />
          </div>
          <div class="theme-name">{{ theme.name }}</div>
        </div>
      </div>

      <!-- 音量控制 -->
      <div class="setting-card">
        <div class="card-label">{{ $t('settings.volumeControl') }}</div>
        <div class="card-control row-flex">
          <NSlider
            class="volume-slider"
            :value="appStore.volume"
            :min="0"
            :max="1"
            :step="0.1"
            :marks="{ 0: '0', 0.5: '0.5', 1: '1' }"
            @update:value="appStore.setVolume"
          />
          <button class="preview-btn" @click="previewAudio">
            <SvgIcon icon="mdi:volume-high" class="btn-icon" />
            <span>{{ $t('settings.preview') }}</span>
          </button>
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

/* ===== 主题网格 ===== */

.theme-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 10px;
}

.theme-item {
  cursor: pointer;
  text-align: center;
  border-radius: 10px;
  padding: 8px;
  border: 1px solid rgba(var(--app-rgb), 0.07);
  background: rgba(var(--app-rgb), 0.025);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.05);
  }

  &.active {
    border-color: rgba(102, 126, 234, 0.3);
    background: rgba(102, 126, 234, 0.08);

    .theme-name {
      color: #667eea;
      font-weight: 600;
    }
  }

  .theme-img-wrapper {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 6px;
    margin-bottom: 8px;
    background: rgba(var(--app-rgb), 0.06);
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
}

/* ===== 音量卡片 ===== */

.setting-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--app-rgb), 0.025);
  border: 1px solid rgba(var(--app-rgb), 0.07);

  .card-label {
    flex: 0 0 auto;
    width: 70px;
    font-size: 13px;
    font-weight: 600;
    color: var(--n-text-color);
  }

  .card-control {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;

    &.row-flex {
      flex-direction: row;
    }
  }
}

.volume-slider {
  flex: 1;
}

.preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  transition: all 0.2s ease;
  white-space: nowrap;

  .btn-icon {
    font-size: 15px;
  }

  &:hover {
    background: rgba(102, 126, 234, 0.2);
  }
}
</style>
