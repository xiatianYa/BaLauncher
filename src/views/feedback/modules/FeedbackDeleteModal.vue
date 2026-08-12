<script setup lang="ts">
import { ref } from 'vue';
import { NModal } from 'naive-ui';
import { fetchDeleteFeedback } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackDeleteModal' });

const props = defineProps<{
  show: boolean;
  /** 待删除的反馈行 */
  feedback: Api.System.SysFeedbackVo | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'deleted'): void;
}>();

const loading = ref(false);

const handleConfirm = async () => {
  if (!props.feedback) return;
  loading.value = true;
  try {
    const { error } = await fetchDeleteFeedback(props.feedback.id);
    if (error) {
      window.$message?.error(error.message || $t('feedback.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('feedback.messages.deleteSuccess'));
    emit('update:show', false);
    emit('deleted');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    class="delete-modal rounded-16px w-400px"
    :bordered="false"
    size="small"
    :closable="false"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="delete-modal-header">
        <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
        <span>{{ $t('feedback.deleteModal.title') }}</span>
      </div>
    </template>
    <div class="delete-modal-body">
      <p class="delete-modal-text">
        {{ $t('feedback.deleteModal.confirmPrefix') }}
        <span class="delete-modal-target">{{ feedback?.title }}</span>
        {{ $t('feedback.deleteModal.confirmSuffix') }}
      </p>
      <p class="delete-modal-tip">{{ $t('feedback.deleteModal.tip') }}</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="emit('update:show', false)">{{ $t('common.cancel') }}</button>
      <button class="action-btn danger" :disabled="loading" @click="handleConfirm">
        <SvgIcon icon="mdi:delete" />
        <span>{{ loading ? $t('feedback.deleteModal.deleting') : $t('feedback.deleteModal.delete') }}</span>
      </button>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.delete-modal {
  .delete-modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .delete-modal-icon {
      font-size: 20px;
      color: #f5576c;
    }
  }

  .delete-modal-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 0 16px;

    .delete-modal-text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: rgba(var(--app-rgb), 0.85);

      .delete-modal-target {
        font-weight: 600;
        color: #f5576c;
      }
    }

    .delete-modal-tip {
      margin: 0;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.5);
    }
  }

  .delete-modal-actions {
    display: flex;
    gap: 10px;

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 22px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.25s ease;

      &.cancel {
        color: rgba(var(--app-rgb), 0.5);
        background: rgba(var(--app-rgb), 0.06);

        &:hover {
          background: rgba(var(--app-rgb), 0.1);
        }
      }

      &.danger {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.12);

        &:hover:not(:disabled) {
          background: rgba(245, 87, 108, 0.22);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>
