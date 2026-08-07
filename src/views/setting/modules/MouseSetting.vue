<script setup lang="ts">
import { computed } from 'vue'
import { NGrid, NGridItem, NText } from 'naive-ui'
import { useAppStore } from '@/store/modules/app'
import pointerImg from '@/assets/pointer/WangXiaoTaoPoint.png'

defineOptions({
  name: 'MouseSetting',
})

const appStore = useAppStore()

/** 鼠标主题选项（app 用指针 PNG 预览，system 用系统箭头图标） */
const cursorOptions = [
  { id: 'app' as UnionKey.MouseCursor, img: pointerImg, nameKey: 'settings.mouseThemeApp', descKey: 'settings.mouseThemeAppDesc' },
  { id: 'system' as UnionKey.MouseCursor, icon: 'mdi:cursor-default-outline', nameKey: 'settings.mouseThemeSystem', descKey: 'settings.mouseThemeSystemDesc' },
]

const currentCursor = computed(() => appStore.mouseCursor)

const selectCursor = (id: UnionKey.MouseCursor) => {
  appStore.setMouseCursor(id)
}
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="mdi:mouse" class="section-icon" />
        <NText>{{ $t('settings.mouseTheme') }}</NText>
      </div>
    </div>

    <div class="section-content">
      <NGrid :cols="2" :x-gap="12" :y-gap="12">
        <NGridItem v-for="opt in cursorOptions" :key="opt.id">
          <div class="cursor-item" :class="{ active: currentCursor === opt.id }" @click="selectCursor(opt.id)">
            <div class="cursor-preview">
              <img v-if="opt.img" :src="opt.img" :alt="opt.nameKey" class="cursor-preview-img" />
              <SvgIcon v-else :icon="opt.icon" class="cursor-preview-icon" />
            </div>
            <div class="cursor-info">
              <div class="cursor-name">{{ $t(opt.nameKey) }}</div>
              <div class="cursor-desc">{{ $t(opt.descKey) }}</div>
            </div>
          </div>
        </NGridItem>
      </NGrid>
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
}

.cursor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--n-color);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background-color: var(--n-border-color);
  }

  &.active {
    border-color: var(--primary-color, #18a058);
    background-color: var(--primary-color-suppl, rgba(24, 160, 88, 0.1));

    .cursor-name {
      color: var(--primary-color, #18a058);
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
    background-color: var(--n-border-color);

    .cursor-preview-img {
      height: 30px;
      width: auto;
    }

    .cursor-preview-icon {
      font-size: 26px;
      color: var(--primary-color, #18a058);
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
      color: var(--n-text-color-3);
    }
  }
}
</style>
