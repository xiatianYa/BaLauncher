<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { NModal } from 'naive-ui';
import { fetchUpdateFeedback } from '@/service/api';
import { $t } from '@/locales';
import { useDict } from '@/hooks/business/dict';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackHandleModal' });

const props = defineProps<{
  show: boolean;
  /** 待处理的反馈 */
  feedback: Api.System.SysFeedbackVo | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'submitted'): void;
}>();

const { dictOptions, dictType } = useDict();

const loading = ref(false);

const handleForm = reactive({
  status: 0
});

/** NaiveUI 主题色 → 选中态配色（文字色 + 淡背景） */
const TONE_MAP: Record<NaiveUI.ThemeColor, { color: string; bg: string }> = {
  default: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' },
  primary: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  info: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  success: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
};

/** 处理状态选项（字典渲染，选中配色取自字典 type 字段） */
const statusOptions = computed(() =>
  dictOptions('sys_feedback_status').map(item => ({
    value: Number(item.value),
    label: item.label,
    tone: TONE_MAP[dictType('sys_feedback_status', item.value)] || TONE_MAP.default
  }))
);

/** 弹窗打开时回填当前反馈状态 */
watch(
  () => props.show,
  (val) => {
    if (val && props.feedback) {
      handleForm.status = props.feedback.status ?? 0;
    }
  }
);

const handleClose = () => {
  emit('update:show', false);
};

/** 提交处理 */
const handleSubmit = async () => {
  if (!props.feedback?.id || loading.value) return;
  loading.value = true;
  try {
    const { error } = await fetchUpdateFeedback({
      id: props.feedback.id,
      status: handleForm.status
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
    class="w-560px rounded-16px"
    :bordered="false"
    size="medium"
    :closable="true"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-header">
        <SvgIcon icon="mdi:clipboard-check-outline" class="modal-header-icon" />
        <span>{{ $t('feedback.handleTitle') }}</span>
      </div>
    </template>

    <div class="modal-form">
      <!-- 反馈标题摘要 -->
      <div class="feedback-summary">
        <SvgIcon icon="mdi:message-text-outline" class="summary-icon" />
        <span class="summary-text" :title="feedback?.title">{{ feedback?.title || '-' }}</span>
      </div>

      <!-- 处理状态 -->
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.handleForm.statusLabel') }}</label>
        <div class="status-radio-group">
          <button
            v-for="s in statusOptions"
            :key="s.value"
            class="status-radio"
            :class="{ active: handleForm.status === s.value }"
            :style="{ '--st-color': s.tone.color, '--st-bg': s.tone.bg }"
            @click="handleForm.status = s.value"
          >
            <span>{{ s.label }}</span>
            <SvgIcon v-if="handleForm.status === s.value" icon="mdi:check" class="radio-check" />
          </button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-actions">
        <button class="action-btn cancel" @click="handleClose">{{ $t('common.cancel') }}</button>
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

  .feedback-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(var(--app-rgb), 0.04);
    border: 1px solid rgba(var(--app-rgb), 0.07);
    min-width: 0;

    .summary-icon {
      font-size: 16px;
      color: rgba(var(--app-rgb), 0.4);
      flex-shrink: 0;
    }

    .summary-text {
      font-size: 13px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.75);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

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

  .status-radio-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .status-radio {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 8px 14px;
      border: 1px solid rgba(var(--app-rgb), 0.2);
      border-radius: 10px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.6);
      background: rgba(var(--app-rgb), 0.03);
      transition: all 0.2s ease;

      .radio-check {
        font-size: 14px;
      }

      &:hover {
        border-color: rgba(var(--app-rgb), 0.32);
        color: rgba(var(--app-rgb), 0.8);
        background: rgba(var(--app-rgb), 0.05);
      }

      /* 选中态配色由字典 type 字段驱动（--st-color/--st-bg 由 style 绑定注入） */
      &.active {
        color: var(--st-color);
        border-color: var(--st-color);
        background: var(--st-bg);
        font-weight: 600;
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
