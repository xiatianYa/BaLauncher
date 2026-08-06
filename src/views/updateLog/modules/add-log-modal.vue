<script setup lang="ts">
import { ref } from 'vue';
import { NModal, NButton, NForm, NFormItem, NInput, NSelect, NSwitch, FormRules } from 'naive-ui';
import { $t } from '@/locales';

import { fetchSaveLog } from '@/service/api';
import { useDict } from '@/hooks/business/dict';

interface Emits {
    (e: 'update:showAddLogModal', value: boolean): void;
    (e: 'success'): void;
}

const props = defineProps<{
    showAddLogModal: boolean;
}>();

const emit = defineEmits<Emits>();

const { dictOptions } = useDict();

const loading = ref(false);
const formRef = ref();

const formData = ref<Api.System.SysUpdateLogAddDTO & { updateType: string | number | null }>({
    version: '',
    updateType: null,
    title: '',
    content: '',
    isTop: 0,
    status: 0
});

const rules: FormRules = {
    version: {
        required: true,
        message: () => $t('updateLog.form.version.required'),
        trigger: 'blur'
    },
    updateType: {
        required: true,
        message: () => $t('updateLog.form.updateType.required'),
        trigger: 'blur'
    },
    title: {
        required: true,
        message: () => $t('updateLog.form.title.required'),
        trigger: 'blur'
    },
    content: {
        required: true,
        message: () => $t('updateLog.form.content.required'),
        trigger: 'blur'
    }
};

const handleSubmit = async (): Promise<void> => {
    console.log('添加更新日志数据:', formData.value);

    try {
        await formRef.value?.validate();
    } catch {
        return;
    }

    loading.value = true;
    try {
        const submitData = {
            ...formData.value,
            updateType: formData.value.updateType ? Number(formData.value.updateType) : null
        };
        const { error } = await fetchSaveLog(submitData as Api.System.SysUpdateLogAddDTO);
        if (!error) {
            window.$message?.success($t('updateLog.addSuccess'));
            handleClose();
            emit('success');
        }
    } catch (error) {
        console.error('添加更新日志失败:', error);
    } finally {
        loading.value = false;
    }
};

const handleClose = (): void => {
    formRef.value?.restoreValidation();
    formData.value = {
        version: '',
        updateType: null,
        title: '',
        content: '',
        isTop: 0,
        status: 0
    };
    emit('update:showAddLogModal', false);
};
</script>

<template>
    <NModal v-model:show="props.showAddLogModal" @update:show="(value) => !value && handleClose()" preset="card"
        size="large" :bordered="false" class="log-modal w-760px rounded-12px" header-style="padding:16px 20px;"
        :closable="true">
        <template #header>
            <div class="modal-header">
                <div class="modal-icon-wrap">
                    <SvgIcon icon="mdi:plus" />
                </div>
                <span class="modal-title">{{ $t('updateLog.addUpdateLog') }}</span>
            </div>
        </template>
        <div class="modal-body">
            <NForm ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="90px"
                size="medium" class="log-form">
                <NFormItem :label="$t('updateLog.form.version.label')" path="version">
                    <NInput v-model:value="formData.version" :placeholder="$t('updateLog.form.version.placeholder')"
                        clearable />
                </NFormItem>
                <NFormItem :label="$t('updateLog.form.updateType.label')" path="updateType">
                    <NSelect v-model:value="formData.updateType" :options="dictOptions('sys_updateLog_type')"
                        :placeholder="$t('updateLog.form.updateType.placeholder')" clearable />
                </NFormItem>
                <NFormItem :label="$t('updateLog.form.title.label')" path="title">
                    <NInput v-model:value="formData.title" :placeholder="$t('updateLog.form.title.placeholder')"
                        clearable />
                </NFormItem>
                <div class="form-row">
                    <NFormItem :label="$t('updateLog.form.pinned.label')" path="isTop" class="inline-switch">
                        <NSwitch v-model:value="formData.isTop" :checked-value="1" :unchecked-value="0" />
                        <span class="switch-hint">{{ $t('updateLog.form.pinned.desc') }}</span>
                    </NFormItem>
                    <NFormItem :label="$t('updateLog.form.enabled.label')" path="status" class="inline-switch">
                        <NSwitch v-model:value="formData.status" :checked-value="1" :unchecked-value="0" />
                        <span class="switch-hint">{{ $t('updateLog.form.enabled.desc') }}</span>
                    </NFormItem>
                </div>
                <NFormItem :label="$t('updateLog.form.content.label')" path="content" class="content-item">
                    <CommonMdEditor v-model="formData.content" />
                </NFormItem>
            </NForm>
        </div>
        <template #footer>
            <div class="modal-footer">
                <button class="modal-btn cancel" @click="handleClose">
                    <SvgIcon icon="mdi:close" />
                    <span>{{ $t('common.cancel') }}</span>
                </button>
                <button class="modal-btn confirm" :class="{ loading: loading }" @click="handleSubmit">
                    <SvgIcon icon="mdi:check" />
                    <span>{{ $t('common.submit') }}</span>
                </button>
            </div>
        </template>
    </NModal>
</template>

<style lang="scss">
.log-modal {
  --card-bg: rgba(40, 43, 50, 0.96);
  --card-border: rgba(var(--app-rgb), 0.08);
  --text-main: rgba(var(--app-rgb), 0.9);
  --text-secondary: rgba(var(--app-rgb), 0.55);
  --input-bg: rgba(var(--app-rgb), 0.04);
  --input-border: rgba(var(--app-rgb), 0.08);
  --btn-cancel-bg: rgba(var(--app-rgb), 0.06);
  --btn-cancel-border: rgba(var(--app-rgb), 0.1);
  --btn-cancel-text: rgba(var(--app-rgb), 0.7);
  --btn-confirm: #667eea;
  --btn-confirm-hover: #5a6fd6;
}

.log-modal.light-mode {
  --card-bg: #ffffff;
  --card-border: rgba(0, 0, 0, 0.06);
  --text-main: rgba(0, 0, 0, 0.88);
  --text-secondary: rgba(0, 0, 0, 0.55);
  --input-bg: rgba(0, 0, 0, 0.02);
  --input-border: rgba(0, 0, 0, 0.08);
  --btn-cancel-bg: transparent;
  --btn-cancel-border: rgba(0, 0, 0, 0.1);
  --btn-cancel-text: rgba(0, 0, 0, 0.7);
  --btn-confirm: #667eea;
  --btn-confirm-hover: #5a6fd6;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;

  .modal-icon-wrap {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(102, 126, 234, 0.12);
    color: #667eea;
    font-size: 18px;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
  }
}

.modal-body {
  padding: 0 20px;
  max-height: 60vh;
  overflow: auto;
}

.log-form {
  :deep(.n-form-item) {
    .n-form-item-label {
      color: var(--text-secondary);
      font-size: 13px;
    }

    .n-input,
    .n-base-selection {
      background: var(--input-bg);
      border-radius: 8px;
    }

    .n-input__input-el,
    .n-base-selection-label {
      color: var(--text-main);
    }

    .n-input__placeholder,
    .n-base-selection-placeholder {
      color: var(--text-secondary);
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.inline-switch {
  :deep(.n-form-item-blank) {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .switch-hint {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.content-item {
  :deep(.n-form-item-blank) {
    display: block;
  }
}

:deep(.n-card__footer) {
  padding: 0 !important;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 20px 20px;
}

.modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 2px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
  background: rgba(var(--app-rgb), 0.06);
  color: rgba(var(--app-rgb), 0.8);

  &:active {
    transform: scale(0.98);
  }

  &.loading {
    opacity: 0.7;
    pointer-events: none;
  }
}

.modal-btn.cancel:hover {
  background: rgba(245, 87, 108, 0.2);
  color: #f5576c;
  transform: translateY(-2px);
}

.modal-btn.confirm {
  background: rgba(102, 126, 234, 0.12);
  color: #667eea;

  &:hover {
    background: rgba(102, 126, 234, 0.22);
    transform: translateY(-2px);
  }
}
</style>
