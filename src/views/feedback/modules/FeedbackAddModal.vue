<script setup lang="ts">
import { reactive, ref } from 'vue';
import { NModal, NInput, NUpload } from 'naive-ui';
import type { UploadCustomRequestOptions } from 'naive-ui';
import { fetchAddFeedback, fetchUploadFile } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackAddModal' });

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'submitted'): void;
}>();

const loading = ref(false);
const imageUploadLoading = ref(false);
const addForm = reactive({
  feedbackType: 0,
  title: '',
  content: '',
  priority: 0,
  images: ''
});

const types = [
  { value: 0, icon: 'mdi:alert-circle', label: $t('feedback.type0') },
  { value: 1, icon: 'mdi:lightbulb-on', label: $t('feedback.type1') },
  { value: 2, icon: 'mdi:bug', label: $t('feedback.type2') },
  { value: 3, icon: 'mdi:dots-horizontal', label: $t('feedback.type3') }
];

const priorities = [
  { value: 0, label: $t('feedback.priority0') },
  { value: 1, label: $t('feedback.priority1') },
  { value: 2, label: $t('feedback.priority2') },
  { value: 3, label: $t('feedback.priority3') }
];

/** 重置表单 */
const resetForm = () => {
  Object.assign(addForm, { feedbackType: 0, title: '', content: '', priority: 0, images: '' });
};

/** 上传截图 */
const handleUploadImage = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  imageUploadLoading.value = true;
  try {
    const { data, error } = await fetchUploadFile(file.file as File);
    if (error || !data) {
      window.$message?.error($t('feedback.form.imagesUploadFailed'));
      onError();
      return;
    }
    addForm.images = addForm.images ? `${addForm.images},${data.url}` : data.url;
    window.$message?.success($t('feedback.form.imagesUploadSuccess'));
    onFinish();
  } finally {
    imageUploadLoading.value = false;
  }
};

/** 提交 */
const handleSubmit = async () => {
  if (!addForm.title.trim()) {
    window.$message?.warning($t('feedback.messages.titleRequired'));
    return;
  }
  if (!addForm.content.trim()) {
    window.$message?.warning($t('feedback.messages.contentRequired'));
    return;
  }
  loading.value = true;
  try {
    const { error } = await fetchAddFeedback({
      feedbackType: addForm.feedbackType,
      title: addForm.title.trim(),
      content: addForm.content.trim(),
      priority: addForm.priority,
      images: addForm.images || undefined
    });
    if (error) {
      window.$message?.error(error.message || $t('feedback.messages.addFailed'));
      return;
    }
    window.$message?.success($t('feedback.messages.addSuccess'));
    emit('update:show', false);
    emit('submitted');
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  emit('update:show', false);
};

/** 弹窗打开时重置表单 */
const handleAfterEnter = () => {
  resetForm();
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
    @after-enter="handleAfterEnter"
  >
    <template #header>
      <div class="modal-header">
        <SvgIcon icon="mdi:plus-circle" class="modal-header-icon" />
        <span>{{ $t('feedback.addFeedback') }}</span>
      </div>
    </template>

    <div class="modal-form">
      <!-- 反馈类型 -->
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.form.typeLabel') }}</label>
        <div class="type-radio-group">
          <button
            v-for="t in types"
            :key="t.value"
            class="type-radio-btn"
            :class="{ active: addForm.feedbackType === t.value }"
            @click="addForm.feedbackType = t.value"
          >
            <SvgIcon :icon="t.icon" class="type-radio-icon" />
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- 标题 -->
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.form.titleLabel') }} <span class="required">*</span></label>
        <NInput v-model:value="addForm.title" :placeholder="$t('feedback.form.titlePlaceholder')" />
      </div>

      <!-- 内容 -->
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.form.contentLabel') }} <span class="required">*</span></label>
        <NInput
          type="textarea"
          v-model:value="addForm.content"
          :placeholder="$t('feedback.form.contentPlaceholder')"
          :autosize="{ minRows: 4, maxRows: 10 }"
        />
      </div>

      <!-- 优先级 -->
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.form.priorityLabel') }}</label>
        <div class="priority-radio-group">
          <button
            v-for="p in priorities"
            :key="p.value"
            class="priority-radio"
            :class="{ active: addForm.priority === p.value }"
            @click="addForm.priority = p.value"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- 截图上传 -->
      <div class="form-item">
        <label class="form-label">{{ $t('feedback.form.imagesLabel') }}</label>
        <NUpload
          :custom-request="handleUploadImage"
          :max="5"
          :show-file-list="false"
          accept="image/*"
        >
          <div class="image-upload-trigger">
            <SvgIcon icon="mdi:image-plus" class="upload-icon" />
            <span>{{ imageUploadLoading ? $t('common.uploading') : $t('feedback.form.imagesUpload') }}</span>
          </div>
        </NUpload>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-actions">
        <button class="action-btn cancel" @click="handleClose">{{ $t('common.cancel') }}</button>
        <button class="action-btn confirm" :disabled="loading" @click="handleSubmit">
          <SvgIcon icon="mdi:send" />
          <span>{{ loading ? $t('feedback.form.submitting') : $t('feedback.form.submit') }}</span>
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

      .required {
        color: #ef4444;
      }
    }
  }

  .type-radio-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .type-radio-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 8px 14px;
      border: 1px solid rgba(var(--app-rgb), 0.12);
      border-radius: 10px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.5);
      background: rgba(var(--app-rgb), 0.03);
      transition: all 0.25s ease;

      .type-radio-icon {
        font-size: 15px;
      }

      &:hover {
        border-color: rgba(var(--app-rgb), 0.2);
        color: rgba(var(--app-rgb), 0.65);
      }

      &.active {
        color: #667eea;
        border-color: rgba(102, 126, 234, 0.35);
        background: rgba(102, 126, 234, 0.1);
      }
    }
  }

  .priority-radio-group {
    display: flex;
    gap: 8px;

    .priority-radio {
      padding: 7px 16px;
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

  .image-upload-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    border: 1px dashed rgba(var(--app-rgb), 0.15);
    border-radius: 12px;
    cursor: pointer;
    font-size: 13px;
    color: rgba(var(--app-rgb), 0.45);
    transition: all 0.25s ease;

    &:hover {
      border-color: rgba(102, 126, 234, 0.4);
      color: #667eea;
      background: rgba(102, 126, 234, 0.04);
    }

    .upload-icon {
      font-size: 20px;
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
