<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NDatePicker, FormRules } from 'naive-ui';
import dayjs from 'dayjs';
import { $t } from '@/locales';
import { useDict } from '@/hooks/business/dict';
import { fetchSaveNotice, fetchUpdateNotice, fetchGetAllUserNames, fetchGetAllRoles } from '@/service/api';

interface Emits {
    (e: 'update:showNoticeModal', value: boolean): void;
    (e: 'success'): void;
}

const props = defineProps<{
    showNoticeModal: boolean;
    /** 当前编辑的通知（null 表示新增） */
    editNotice?: Api.System.SysNoticeVo | null;
}>();

const emit = defineEmits<Emits>();

const { dictOptions } = useDict();

const loading = ref(false);
const formRef = ref();

/** 新增/编辑表单数据 */
const formData = ref<{
    id?: number;
    noticeType: number;
    title: string;
    content: string;
    priority: number;
    status: number;
    /** 接收类型 0=全体 1=指定用户 2=按角色（后端必填，否则空指针） */
    receiverType: number;
    /** 接收人ID(0=全体) */
    receiverId: number | null;
    /** 业务类型(如订单、系统、活动) */
    businessType: string;
    /** 关联业务ID */
    businessId: number | null;
    /** 跳转类型 */
    jumpType: string;
    /** 跳转参数(JSON 字符串，提交时解析) */
    jumpParams: string;
    /** 过期时间（时间戳，提交时转成日期字符串） */
    expireTime: number | null;
}>({
    id: undefined,
    noticeType: 1,
    title: '',
    content: '',
    priority: 0,
    status: 1,
    receiverType: 0,
    receiverId: null,
    businessType: '',
    businessId: null,
    jumpType: '',
    jumpParams: '',
    expireTime: null
});

const rules: FormRules = {
    noticeType: {
        required: true,
        // 数字类型必须显式声明，否则 async-validator 会按 string 校验导致数字值不通过
        type: 'number',
        message: () => $t('updateLog.noticeForm.noticeType.required'),
        trigger: 'change'
    },
    title: {
        required: true,
        message: () => $t('updateLog.noticeForm.title.required'),
        trigger: 'blur'
    },
    content: {
        required: true,
        message: () => $t('updateLog.noticeForm.content.required'),
        trigger: 'blur'
    },
    priority: {
        required: true,
        // 数字类型必须显式声明，否则 async-validator 会按 string 校验导致数字值不通过
        type: 'number',
        message: () => $t('updateLog.noticeForm.priority.required'),
        trigger: 'change'
    },
    status: {
        required: true,
        // 数字类型必须显式声明，否则 async-validator 会按 string 校验导致数字值不通过
        type: 'number',
        message: () => $t('updateLog.noticeForm.status.required'),
        trigger: 'change'
    },
    receiverType: {
        required: true,
        // 数字类型必须显式声明，否则 async-validator 会按 string 校验导致数字值不通过
        type: 'number',
        message: () => $t('updateLog.noticeForm.receiverType.required'),
        trigger: 'change'
    },
    receiverId: {
        // 仅指定接收人/角色（非全体）时需要填写接收人ID
        validator: (_rule, value) => {
            if (formData.value.receiverType !== 0 && (value === null || value === undefined || value === '')) {
                return new Error(
                    formData.value.receiverType === 2
                        ? $t('updateLog.noticeForm.receiverRole.required')
                        : $t('updateLog.noticeForm.receiverId.required')
                );
            }
            return true;
        },
        trigger: ['blur', 'change']
    }
};

/**
 * 把字典选项转成数字值选项
 *
 * 字典项 value 是字符串（如 '1'），而表单字段/校验/提交都用数字，
 * 统一在选项层转成 number，避免影响既有逻辑
 */
function numDictOptions(code: string) {
    return computed(() =>
        dictOptions(code).map(item => ({ label: item.label, value: Number(item.value) }))
    );
}

/** 通知类型选项（字典 sys_notice_type：1=公告 2=个人消息） */
const noticeTypeOptions = numDictOptions('sys_notice_type');

/** 优先级选项（字典 sys_notice_priority：0=普通 1=重要 2=紧急） */
const priorityOptions = numDictOptions('sys_notice_priority');

/** 状态选项（字典 sys_notice_status：0=草稿 1=已发布 2=已下线） */
const statusOptions = numDictOptions('sys_notice_status');

/** 接收类型选项（字典 sys_notice_receiver_type：0=全体 1=指定用户 2=按角色） */
const receiverTypeOptions = numDictOptions('sys_notice_receiver_type');

/** 指定用户（receiverType=1）下拉选项：用户名称列表 */
const userOptions = ref<{ label: string; value: number }[]>([]);
/** 按角色（receiverType=2）下拉选项：角色列表 */
const roleOptions = ref<{ label: string; value: number }[]>([]);
/** 接收人/角色选项加载状态 */
const loadingReceiverOptions = ref(false);

/** 加载全部用户名称（按需加载，选项已有则跳过） */
const loadUserOptions = async (): Promise<void> => {
    if (userOptions.value.length > 0) return;
    loadingReceiverOptions.value = true;
    try {
        const { data, error } = await fetchGetAllUserNames();
        if (!error && data) {
            userOptions.value = data.map(item => ({ label: item.label, value: Number(item.value) }));
        }
    } finally {
        loadingReceiverOptions.value = false;
    }
};

/** 加载全部角色（按需加载，选项已有则跳过） */
const loadRoleOptions = async (): Promise<void> => {
    if (roleOptions.value.length > 0) return;
    loadingReceiverOptions.value = true;
    try {
        const { data, error } = await fetchGetAllRoles();
        if (!error && data) {
            roleOptions.value = data.map(item => ({ label: item.roleName, value: Number(item.id) }));
        }
    } finally {
        loadingReceiverOptions.value = false;
    }
};

/** 切换接收类型时按需加载对应选项（编辑回填同样触发） */
watch(
    () => formData.value.receiverType,
    (v) => {
        if (v === 1) loadUserOptions();
        else if (v === 2) loadRoleOptions();
    }
);

/** 监听编辑对象，回填表单 */
watch(
    () => props.editNotice,
    (notice) => {
        if (notice) {
            // 后端可能返回字符串形式的数字，统一转成 number，避免类型校验不通过 / 下拉不回显
            formData.value = {
                id: notice.id ? Number(notice.id) : undefined,
                noticeType: Number(notice.noticeType ?? 1),
                title: notice.title || '',
                content: notice.content || '',
                priority: Number(notice.priority ?? 0),
                status: Number(notice.status ?? 1),
                receiverType: Number(notice.receiverType ?? 0),
                receiverId: notice.receiverId ? Number(notice.receiverId) : null,
                businessType: notice.businessType || '',
                businessId: notice.businessId ? Number(notice.businessId) : null,
                jumpType: notice.jumpType || '',
                // jumpParams 后端可能是对象，回填时统一转成 JSON 字符串便于编辑
                jumpParams: notice.jumpParams
                    ? typeof notice.jumpParams === 'string'
                        ? notice.jumpParams
                        : JSON.stringify(notice.jumpParams)
                    : '',
                // expireTime 日期字符串转成时间戳供日期选择器使用
                expireTime: notice.expireTime ? dayjs(notice.expireTime).valueOf() : null
            };
        }
    },
    { immediate: true }
);

/** 提交（新增 / 编辑） */
const handleSubmit = async (): Promise<void> => {
    try {
        await formRef.value?.validate();
    } catch {
        return;
    }

    loading.value = true;
    try {
        const isEdit = Boolean(formData.value.id);
        // jumpParams 输入的是 JSON 字符串，合法 JSON 转成对象提交，否则原样提交字符串
        let jumpParams: unknown = formData.value.jumpParams || null;
        if (typeof jumpParams === 'string' && jumpParams.trim()) {
            try {
                jumpParams = JSON.parse(jumpParams);
            } catch {
                jumpParams = formData.value.jumpParams;
            }
        }
        // 提交前统一转类型：数字字段转 number、过期时间转日期字符串
        const payload = {
            ...formData.value,
            noticeType: Number(formData.value.noticeType),
            priority: Number(formData.value.priority),
            status: Number(formData.value.status),
            receiverType: Number(formData.value.receiverType),
            receiverId: formData.value.receiverId === null ? 0 : Number(formData.value.receiverId),
            businessId: formData.value.businessId === null ? null : Number(formData.value.businessId),
            jumpParams,
            expireTime: formData.value.expireTime
                ? dayjs(formData.value.expireTime).format('YYYY-MM-DD HH:mm:ss')
                : null
        };
        const { error } = isEdit
            ? await fetchUpdateNotice(payload as Api.System.SysNoticeUpdateDTO)
            : await fetchSaveNotice(payload as Api.System.SysNoticeAddDTO);
        if (!error) {
            window.$message?.success(isEdit ? $t('updateLog.editSuccess') : $t('updateLog.addSuccess'));
            handleClose();
            emit('success');
        } else {
            window.$message?.error(error.message || $t('updateLog.saveFailed'));
        }
    } catch (error) {
        console.error('保存通知失败:', error);
        window.$message?.error($t('updateLog.saveFailed'));
    } finally {
        loading.value = false;
    }
};

/** 关闭并重置表单 */
const handleClose = (): void => {
    formRef.value?.restoreValidation();
    formData.value = {
        id: undefined,
        noticeType: 1,
        title: '',
        content: '',
        priority: 0,
        status: 1,
        receiverType: 0,
        receiverId: null,
        businessType: '',
        businessId: null,
        jumpType: '',
        jumpParams: '',
        expireTime: null
    };
    emit('update:showNoticeModal', false);
};
</script>

<template>
    <NModal v-model:show="props.showNoticeModal" @update:show="(value) => !value && handleClose()" preset="card"
        size="large" :bordered="false" class="log-modal w-760px rounded-12px" header-style="padding:16px 20px;"
        :closable="true">
        <template #header>
            <div class="modal-header">
                <div class="modal-icon-wrap">
                    <SvgIcon :icon="props.editNotice ? 'mdi:pencil' : 'mdi:plus'" />
                </div>
                <span class="modal-title">{{ props.editNotice ? $t('updateLog.noticeEdit') : $t('updateLog.noticeAdd') }}</span>
            </div>
        </template>
        <div class="modal-body">
            <NForm ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="90px"
                size="medium" class="log-form">
                <NFormItem :label="$t('updateLog.noticeForm.noticeType.label')" path="noticeType">
                    <NSelect v-model:value="formData.noticeType" :options="noticeTypeOptions"
                        :placeholder="$t('updateLog.noticeForm.noticeType.placeholder')" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.title.label')" path="title">
                    <NInput v-model:value="formData.title" :placeholder="$t('updateLog.noticeForm.title.placeholder')"
                        clearable />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.priority.label')" path="priority">
                    <NSelect v-model:value="formData.priority" :options="priorityOptions"
                        :placeholder="$t('updateLog.noticeForm.priority.placeholder')" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.status.label')" path="status">
                    <NSelect v-model:value="formData.status" :options="statusOptions"
                        :placeholder="$t('updateLog.noticeForm.status.placeholder')" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.expireTime.label')" path="expireTime">
                    <NDatePicker v-model:value="formData.expireTime" type="datetime" clearable
                        :placeholder="$t('updateLog.noticeForm.expireTime.placeholder')" class="w-full" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.receiverType.label')" path="receiverType">
                    <NSelect v-model:value="formData.receiverType" :options="receiverTypeOptions"
                        :placeholder="$t('updateLog.noticeForm.receiverType.placeholder')" />
                </NFormItem>
                <NFormItem v-if="formData.receiverType !== 0"
                    :label="formData.receiverType === 2 ? $t('updateLog.noticeForm.receiverRole.label') : $t('updateLog.noticeForm.receiverId.label')"
                    path="receiverId">
                    <!-- 指定用户：用户名称搜索下拉 -->
                    <NSelect v-if="formData.receiverType === 1" v-model:value="formData.receiverId"
                        :options="userOptions" filterable clearable :loading="loadingReceiverOptions"
                        :placeholder="$t('updateLog.noticeForm.receiverId.placeholder')" />
                    <!-- 按角色：角色搜索下拉 -->
                    <NSelect v-else v-model:value="formData.receiverId" :options="roleOptions" filterable clearable
                        :loading="loadingReceiverOptions"
                        :placeholder="$t('updateLog.noticeForm.receiverRole.placeholder')" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.businessType.label')" path="businessType">
                    <NInput v-model:value="formData.businessType"
                        :placeholder="$t('updateLog.noticeForm.businessType.placeholder')" clearable />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.businessId.label')" path="businessId">
                    <NInputNumber v-model:value="formData.businessId" :min="1" clearable class="w-full"
                        :placeholder="$t('updateLog.noticeForm.businessId.placeholder')" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.jumpType.label')" path="jumpType">
                    <NInput v-model:value="formData.jumpType"
                        :placeholder="$t('updateLog.noticeForm.jumpType.placeholder')" clearable />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.jumpParams.label')" path="jumpParams">
                    <NInput v-model:value="formData.jumpParams" type="textarea" :rows="2"
                        :placeholder="$t('updateLog.noticeForm.jumpParams.placeholder')" />
                </NFormItem>
                <NFormItem :label="$t('updateLog.noticeForm.content.label')" path="content" class="content-item">
                    <NInput v-model:value="formData.content" type="textarea" :rows="6"
                        :placeholder="$t('updateLog.noticeForm.content.placeholder')" />
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
