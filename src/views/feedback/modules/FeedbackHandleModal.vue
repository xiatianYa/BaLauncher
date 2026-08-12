<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { NModal, NInput } from 'naive-ui';
import { fetchUpdateFeedback } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackHandleModal' });

const props = defineProps<{
  show: boolean;
  /** 待处理的反馈行 */
  feedback: Api.System.SysFeedbackVo | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'submitted'): void;
}>();

const loading = ref(false);
const handleForm = reactive({ status: 0, handleRemark: '' });

const getStatusText = (status?: number) => {
  const map: Record<number, string> = { 0: 'status0', 1: 'status1', 2: 'status2', 3: 'status3', 4: 'status4' };
  return status != null ? $t(`feedback.${map[status] || 'status0'}`) : '-';
};

/** 打开时根据传入反馈初始化表单 */
watch(
  () => props.show,
  (val) => {
    if (val && props.feedback) {
      handleForm.status = props.feedback.status ?? 0;
      handleForm.handleRemark = props.feedback.handleRemark || '';
    }
  }
);

const handleSubmit = async () => {
  if (!props.feedback) return;
  loading.value = true;
  try {
    const { error } = await fetchUpdateFeedback({
      id: props.feedback.id,
      status: handleForm.status,
      handleRemark: handleForm.handleRemark || undefined
    });
    if (error) {
      window.$message?.error(error.message || $t('feedback.messages.updateFailed'));
      return;
    }
    window.$message?.success($t('feedback.messages.updateSuccess'));
    emit('update:show', false);
    emit('submitted');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <NModal
    :show="show"
    preset="card"
    class="w-480px rounded-16px"
    :bordered="false"
    size="small"
    :closable="true"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-header">
        <SvgIcon icon="mdi:pencil" class="modal-header-icon" />
        <span>{{ $t('feedback.handleTitle') }}</span>
      </div>
    </template>

    <div class="modal-form">
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.handleForm.statusLabel') }}</label>
        <div class="status-btn-group">
          <button
            v-for="s in [0, 1, 2, 3, 4]"
            :key="s"
            class="status-btn"
            :class="{ active: handleForm.status === s }"
            @click="handleForm.status = s"
          >
            {{ getStatusText(s) }}
          </button>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.handleForm.remarkLabel') }}</label>
        <NInput
          type="textarea"
          v-model:value="handleForm.handleRemark"
          :placeholder="$t('feedback.handleForm.remarkPlaceholder')"
          :autosize="{ minRows: 3, maxRows: 6 }"
        />
      </div>
      <div class="modal-actions">
        <button class="action-btn cancel" @click="emit('update:show', false)">{{ $t('common.cancel') }}</button>
        <button class="action-btn confirm" :disabled="loading" @click="handleSubmit">
          <SvgIcon icon="mdi:check" />
          <span>{{ loading ? $t('feedback.handleForm.saving') : $t('feedback.handleForm.save') }}</span>
        </button>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);

  .modal-header-icon {
    font-size: 20px;
    color: #667eea;
  }
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 18px;

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.65);
    }
  }

  .status-btn-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .status-btn {
      padding: 7px 14px;
      border: 1px solid rgba(var(--app-rgb), 0.12);
      border-radius: 10px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.5);
      background: rgba(var(--app-rgb), 0.03);
      transition: all 0.25s ease;

      &:hover {
        border-color: rgba(var(--app-rgb), 0.2);
      }

      &.active {
        color: #667eea;
        border-color: rgba(102, 126, 234, 0.35);
        background: rgba(102, 126, 234, 0.1);
      }
    }
  }
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 8px;

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

    &.confirm {
      color: #667eea;
      background: rgba(102, 126, 234, 0.12);

      &:hover:not(:disabled) {
        background: rgba(102, 126, 234, 0.22);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}
</style>
