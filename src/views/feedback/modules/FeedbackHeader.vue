<script setup lang="ts">
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackHeader' });

defineProps<{
  /** 当前是否显示"我的反馈" */
  showMyFeedback: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-view', value: 'all' | 'my'): void;
  (e: 'create'): void;
}>();
</script>

<template>
  <div class="header-section">
    <div class="title-section">
      <SvgIcon icon="mdi:message-question-outline" class="title-icon" />
      <div class="title-group">
        <h1 class="page-title">{{ $t('routes.feedback') }}</h1>
        <span class="page-subtitle">{{ $t('feedback.listSubtitle') }}</span>
      </div>
    </div>
    <div class="header-actions">
      <div class="view-switcher">
        <button class="switch-btn" :class="{ active: !showMyFeedback }" @click="emit('toggle-view', 'all')">
          <SvgIcon icon="mdi:view-grid" class="switch-icon" />
          <span>{{ $t('feedback.allFeedback') }}</span>
        </button>
        <button class="switch-btn" :class="{ active: showMyFeedback }" @click="emit('toggle-view', 'my')">
          <SvgIcon icon="mdi:account-circle" class="switch-icon" />
          <span>{{ $t('feedback.myFeedback') }}</span>
        </button>
      </div>
      <button class="header-btn primary" @click="emit('create')">
        <SvgIcon icon="mdi:plus" />
        <span>{{ $t('feedback.addFeedback') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .title-section {
    display: flex;
    align-items: center;
    gap: 12px;

    .title-icon {
      font-size: 24px;
      color: #667eea;
    }

    .title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .page-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: var(--n-text-color);
        letter-spacing: 0.5px;
      }

      .page-subtitle {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.45);
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .view-switcher {
      display: flex;
      gap: 0;
      background: rgba(var(--app-rgb), 0.05);
      border-radius: 10px;
      padding: 3px;
      border: 1px solid rgba(var(--app-rgb), 0.07);

      .switch-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: rgba(var(--app-rgb), 0.5);
        background: transparent;
        transition: all 0.25s ease;
        white-space: nowrap;

        .switch-icon {
          font-size: 16px;
        }

        &.active {
          color: #667eea;
          background: rgba(102, 126, 234, 0.15);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }

        &:hover:not(.active) {
          color: rgba(var(--app-rgb), 0.7);
          background: rgba(var(--app-rgb), 0.04);
        }
      }
    }
  }
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--app-rgb), 0.55);
  background: rgba(var(--app-rgb), 0.05);
  transition: all 0.25s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(var(--app-rgb), 0.1);
    color: rgba(var(--app-rgb), 0.7);
  }

  &.primary {
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);

    &:hover {
      background: rgba(102, 126, 234, 0.22);
    }
  }
}
</style>
