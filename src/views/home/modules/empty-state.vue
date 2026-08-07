<script setup lang="ts">
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'HomeEmptyState'
});

defineProps<{
  /** 空状态图标（mdi 等图标名） */
  icon: string;
  /** 主标题文案 */
  title: string;
  /** 辅助说明文案（可选） */
  description?: string;
}>();
</script>

<template>
  <div class="home-empty">
    <div class="home-empty-icon">
      <SvgIcon :icon="icon" class="home-empty-svg" />
    </div>
    <div class="home-empty-title">{{ title }}</div>
    <div v-if="description" class="home-empty-desc">{{ description }}</div>
  </div>
</template>

<style scoped lang="scss">
.home-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  min-height: 0;

  .home-empty-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: radial-gradient(circle at 32% 28%, rgba(102, 126, 234, 0.22), rgba(102, 126, 234, 0.06) 70%);
    border: 1px dashed rgba(102, 126, 234, 0.4);

    // 外层装饰虚环
    &::before {
      content: '';
      position: absolute;
      inset: -7px;
      border-radius: 50%;
      border: 1px dashed rgba(102, 126, 234, 0.18);
    }

    .home-empty-svg {
      font-size: 30px;
      color: #667eea;
      filter: drop-shadow(0 2px 6px rgba(102, 126, 234, 0.35));
    }
  }

  .home-empty-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.3px;
    color: rgba(var(--app-rgb), 0.72);
  }

  .home-empty-desc {
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.42);
  }
}
</style>
