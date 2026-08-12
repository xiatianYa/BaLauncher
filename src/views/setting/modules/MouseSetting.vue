<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/store/modules/app';
import pointerImg from '@/assets/pointer/WangXiaoTaoPoint.png';

defineOptions({ name: 'MouseSetting' });

const appStore = useAppStore();

/** 鼠标主题选项 */
const cursorOptions = [
  { id: 'app' as UnionKey.MouseCursor, img: pointerImg, nameKey: 'settings.mouseThemeApp', descKey: 'settings.mouseThemeAppDesc' },
  { id: 'system' as UnionKey.MouseCursor, icon: 'mdi:cursor-default-outline', nameKey: 'settings.mouseThemeSystem', descKey: 'settings.mouseThemeSystemDesc' },
];

const currentCursor = computed(() => appStore.mouseCursor);

const selectCursor = (id: UnionKey.MouseCursor) => {
  appStore.setMouseCursor(id);
};
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="mdi:mouse" class="section-icon" />
        <span class="section-text">{{ $t('settings.mouseTheme') }}</span>
      </div>
    </div>

    <div class="section-content">
      <div class="cursor-grid">
        <div
          v-for="opt in cursorOptions"
          :key="opt.id"
          class="cursor-item"
          :class="{ active: currentCursor === opt.id }"
          @click="selectCursor(opt.id)"
        >
          <div class="cursor-preview">
            <img v-if="opt.img" :src="opt.img" :alt="opt.nameKey" class="cursor-preview-img" />
            <SvgIcon v-else :icon="opt.icon" class="cursor-preview-icon" />
          </div>
          <div class="cursor-info">
            <div class="cursor-name">{{ $t(opt.nameKey) }}</div>
            <div class="cursor-desc">{{ $t(opt.descKey) }}</div>
          </div>
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

.cursor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.cursor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--app-rgb), 0.07);
  background: rgba(var(--app-rgb), 0.025);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.05);
  }

  &.active {
    border-color: rgba(102, 126, 234, 0.3);
    background: rgba(102, 126, 234, 0.08);

    .cursor-name {
      color: #667eea;
      font-weight: 600;
    }
  }

  .cursor-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 10px;
    background: rgba(var(--app-rgb), 0.06);

    .cursor-preview-img {
      height: 30px;
      width: auto;
    }

    .cursor-preview-icon {
      font-size: 26px;
      color: #667eea;
    }
  }

  .cursor-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;

    .cursor-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--n-text-color);
    }

    .cursor-desc {
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.4);
    }
  }
}
</style>
