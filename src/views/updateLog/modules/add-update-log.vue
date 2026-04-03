<script setup lang="ts">
import { ref, computed } from 'vue';
import { NModal, NButton, NForm, NFormItem, NInput, NSelect, NSwitch, FormRules } from 'naive-ui';
import { MdEditor } from 'md-editor-v3';
import { $t } from '@/locales';

import { useThemeStore } from '@/store/modules/theme';
import { fetchSaveUpdateLog } from '@/service/api/system/updateLog';
import { useDict } from '@/hooks/business/dict';

/**
 * 组件事件定义
 */
interface Emits {
    /** 控制模态框显示状态更新 */
    (e: 'update:showAddUpdateLog', value: boolean): void;
    /** 添加成功事件 */
    (e: 'success'): void;
}

/**
 * 组件属性定义
 */
const props = defineProps<{
    /** 控制模态框显示 */
    showAddUpdateLog: boolean;
}>();

const emit = defineEmits<Emits>();

/**
 * 主题状态管理
 */
const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

/**
 * 字典选项
 * @description 从系统字典获取更新类型选项
 */
const { dictOptions } = useDict();

/**
 * 表单和加载状态
 */
const loading = ref(false);
const formRef = ref();

/**
 * 表单数据
 * @description 新建更新日志所需的完整数据结构
 */
const formData = ref<Api.System.SysUpdateLogAddDTO>({
    version: '',
    updateType: null,
    title: '',
    content: '',
    isTop: 0,
    status: 0
});

/**
 * 表单验证规则
 * @description 使用 Naive UI 的表单验证规则
 */
const rules: FormRules = {
    version: {
        required: true,
        message: () => $t('updateLog.form.version.required'),
        trigger: 'blur'
    },
    updateType: {
        required: true,
        type: 'number',
        message: () => $t('updateLog.form.updateType.required'),
        trigger: 'change'
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

/**
 * 提交更新日志
 * @async
 * @description 验证表单并提交数据到后端
 */
const handleSubmit = async (): Promise<void> => {
    console.log('提交更新日志数据:', formData.value);

    try {
        await formRef.value?.validate();
    } catch {
        return;
    }

    loading.value = true;
    try {
        const { error } = await fetchSaveUpdateLog(formData.value);
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

/**
 * 关闭模态框
 * @description 重置表单验证状态和表单数据
 */
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
    emit('update:showAddUpdateLog', false);
};
</script>

<template>
    <NModal v-model:show="props.showAddUpdateLog" @update:show="(value) => !value && handleClose()" preset="card"
        size="large" :bordered="true" class="w-800px h-500px rounded-10px overflow-auto" header-style="padding:10px;"
        :closable="true">
        <template #header>
            <div class="flex items-center">
                <SvgIcon icon="mdi:update" class="text-20px mr-2" />
                <span class="text-18px font-bold">{{ $t('updateLog.addUpdateLog') }}</span>
            </div>
        </template>
        <div class="p-5px">
            <NForm ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="100px"
                size="medium">
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
                <NFormItem :label="$t('updateLog.form.pinned.label')" path="isTop">
                    <NSwitch v-model:value="formData.isTop" :unchecked-value="0" />
                    <span class="ml-2 text-sm text-gray-500">{{ $t('updateLog.form.pinned.desc') }}</span>
                </NFormItem>
                <NFormItem :label="$t('updateLog.form.enabled.label')" path="status">
                    <NSwitch v-model:value="formData.status" :unchecked-value="0" />
                    <span class="ml-2 text-sm text-gray-500">{{ $t('updateLog.form.enabled.desc') }}</span>
                </NFormItem>
                <NFormItem :label="$t('updateLog.form.content.label')" path="content">
                    <MdEditor v-model="formData.content" :theme="isDarkMode ? 'dark' : 'light'" :toolbars="[
                        'bold',
                        'underline',
                        'italic',
                        'strikeThrough',
                        'title',
                        'sub',
                        'sup',
                        'quote',
                        'unorderedList',
                        'orderedList',
                        'codeRow',
                        'code',
                        'link',
                        'table',
                        'revoke',
                        'next'
                    ]" />
                </NFormItem>
            </NForm>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <NButton @click="handleClose" type="error" ghost strong>
                    <template #icon>
                        <SvgIcon icon="mdi:close" />
                    </template>
                    {{ $t('common.cancel') }}
                </NButton>
                <NButton @click="handleSubmit" type="success" ghost strong :loading="loading">
                    <template #icon>
                        <SvgIcon icon="mdi:check" />
                    </template>
                    {{ $t('common.submit') }}
                </NButton>
            </div>
        </template>
    </NModal>
</template>

<style scoped lang="scss">
/**
 * 组件样式
 * @description 使用全局样式，无需额外样式
 */
</style>
