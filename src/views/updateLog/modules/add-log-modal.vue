<script setup lang="ts">
import { ref, computed } from 'vue';
import { NModal, NButton, NForm, NFormItem, NInput, NSelect, NSwitch, FormRules } from 'naive-ui';
import { MdEditor } from 'md-editor-v3';
import { $t } from '@/locales';

import { useThemeStore } from '@/store/modules/theme';
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

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

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
        size="large" :bordered="true" class="w-800px h-500px rounded-10px overflow-auto" header-style="padding:10px;"
        :closable="true">
        <template #header>
            <div class="flex items-center">
                <SvgIcon icon="mdi:plus" class="text-20px mr-2" />
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
                    <NSwitch v-model:value="formData.isTop" :checked-value="1" :unchecked-value="0" />
                    <span class="ml-2 text-sm text-gray-500">{{ $t('updateLog.form.pinned.desc') }}</span>
                </NFormItem>
                <NFormItem :label="$t('updateLog.form.enabled.label')" path="status">
                    <NSwitch v-model:value="formData.status" :checked-value="1" :unchecked-value="0" />
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
</style>
