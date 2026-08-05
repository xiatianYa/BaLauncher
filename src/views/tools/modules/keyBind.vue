<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { NButton, NCard, NModal, NGrid, NGridItem, NInput } from 'naive-ui';
import { useGameStore } from '@/store/modules/game';
import { fetchGetMyKeyBinds, fetchAddKeyBind, fetchDeleteKeyBind, fetchUpdateKeyBind } from '@/service/api';
import { MdEditor } from 'md-editor-v3';
import dayjs from 'dayjs';
import {
    systemLibraryItems as systemLibraryItemsConst,
    GunLibaryCfgOption as GunLibaryCfgOptionConst,
    PropLibaryCfgOption as PropLibaryCfgOptionConst,
    ZELibaryCfgOption as ZELibaryCfgOptionConst
} from '@/constants/keyBind';
import { $t } from '@/locales';
import Command from '@/assets/imgs/tool/Command.png';

defineOptions({ name: 'keyBind' });

const emit = defineEmits<{ back: [] }>();

/* ===== 状态 ===== */

const gameStore = useGameStore();

const activeTab = ref<'library' | 'local' | 'user'>('library');
const selectedSystemConfig = ref<string | null>(null);
const showKeyCaptureModal = ref(false);
const localAutoexecCfg = ref('');
const capturedKey = ref('');
const wheelThrottleTimer = ref<number | null>(null);
const WHEEL_THROTTLE_MS = 300; // 滚轮事件节流（毫秒）

// 系统配置库
const systemLibraryItems = ref<Api.Game.SystemBindVO[]>(systemLibraryItemsConst);
const GunLibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>(GunLibaryCfgOptionConst);
const PropLibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>(PropLibaryCfgOptionConst);
const ZELibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>(ZELibaryCfgOptionConst);
// 用户个人配置库
const LocalConfigItems = ref<Api.Game.SystemBindCfgVO[]>([]);

// 根据选中的系统配置返回对应的配置选项
const currentCfgOptions = computed(() => {
    switch (selectedSystemConfig.value) {
        case '武器类':
            return GunLibaryCfgOption.value;
        case '道具类':
            return PropLibaryCfgOption.value;
        case 'ZE常用':
            return ZELibaryCfgOption.value;
        case '个人配置库':
            return LocalConfigItems.value;
        default:
            return [];
    }
});

// 用户已应用的按键绑定项（来自 gameStore）
const applyKeyBindItems = computed({
    get: () => gameStore.applyKeyBindItems,
    set: (items) => gameStore.setApplyKeyBindItems(items)
});

/* ===== 工具函数 ===== */

/** 替换编辑器中的按键占位符 */
const replaceKeyPlaceholders = (content: string, bindKey: string): string =>
    content.replace(/\[按键:[^\]]+\]/g, bindKey);

/** 构建配置写入日志头部 */
const buildLogHeader = (desc: string, key: string): string => {
    const writeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    return `// ========================================
// BaLauncher 按键绑定配置
// ${desc} - 绑定至 ${key}
// 生成时间: ${writeTime}
// ========================================`;
};

/** 拼接修饰键前缀（Ctrl/Shift/Alt） */
const buildKey = (e: KeyboardEvent | MouseEvent, key: string): string => {
    let result = '';
    if (e.ctrlKey) result += 'Ctrl+';
    if (e.shiftKey) result += 'Shift+';
    if (e.altKey) result += 'Alt+';
    return result + key;
};

/* ===== 配置管理 ===== */

/** 读取本地 autoexec.cfg */
const loadLocalAutoexecCfg = async () => {
    try {
        const paths = await window.ipcRenderer.invoke('auto-detect-paths');
        if (!paths.csgo2Path) return;
        const result = await window.ipcRenderer.invoke('read-autoexec-cfg', paths.csgo2Path);
        if (result.success) {
            localAutoexecCfg.value = result.content || '';
        } else {
            window.$message?.error($t('keyBind.messages.readFailed') + ': ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Failed to read local config:', error);
        window.$message?.error($t('keyBind.messages.readLocalFailed'));
    }
};

const handleTabChange = async (value: 'library' | 'local' | 'user') => {
    activeTab.value = value;
    selectedSystemConfig.value = '';
    await loadLocalAutoexecCfg();
};

const handleUserConfigClick = (systemName: string | undefined) => {
    if (!systemName) return;
    selectedSystemConfig.value = systemName;
};

/** 检查配置项是否已应用 */
const isItemApplied = (systemName: string): boolean =>
    applyKeyBindItems.value.some(item => item.systemBindCfgVO?.systemName === systemName);

/** 移除已应用的绑定 */
const removeAppliedBinding = async (systemName: string | undefined) => {
    if (!systemName) return;
    const index = applyKeyBindItems.value.findIndex(item => item.systemBindCfgVO?.systemName === systemName);
    if (index === -1) return;
    const item = applyKeyBindItems.value[index];

    // 从 cfg 文件中移除配置
    const paths = await window.ipcRenderer.invoke('auto-detect-paths');
    if (paths.csgo2Path && item.renderKeyConfigJson) {
        const { success } = await window.ipcRenderer.invoke('remove-autoexec-cfg-content', paths.csgo2Path, item.renderKeyConfigJson);
        if (!success) {
            window.$message?.error($t('keyBind.messages.removeFromCfgFailed'));
            return;
        }
    }
    // 用 filter 创建新数组，触发计算属性 setter
    applyKeyBindItems.value = applyKeyBindItems.value.filter((_, i) => i !== index);
    window.$message?.success($t('keyBind.messages.bindingRemoved'));
};

/** 重置已应用的绑定按键 */
const resetAppliedBindingKey = async (systemName: string | undefined) => {
    if (!systemName) return;
    const item = applyKeyBindItems.value.find(i => i.systemBindCfgVO?.systemName === systemName);
    if (!item) {
        window.$message?.error($t('keyBind.messages.itemNotFound'));
        return;
    }
    currentResetItem.value = item;
    openResetKeyCapture();
};

/* ===== 按键捕获 ===== */

const currentResetItem = ref<Api.Game.ApplyKeyBindItem | null>(null);
const isCapturing = ref(false); // 防止重复触发
const currentSelectedItem = ref<Api.Game.SystemBindCfgVO | null>(null);
const isPersonalConfig = ref(false);
const showAddConfigModal = ref(false);
const isEditMode = ref(false);
const editingConfigId = ref<number | null>(null);
const newConfigName = ref('');
const newConfigJson = ref('');

/** 打开按键捕获弹窗 */
const openKeyCapture = (item: Api.Game.SystemBindCfgVO) => {
    currentSelectedItem.value = item;
    isPersonalConfig.value = selectedSystemConfig.value === '个人配置库';
    if (isPersonalConfig.value) {
        showKeyCaptureModal.value = true;
        return;
    }
    capturedKey.value = '';
    showKeyCaptureModal.value = true;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
};

/** 关闭按键捕获弹窗 */
const closeKeyCapture = () => {
    showKeyCaptureModal.value = false;
    capturedKey.value = '';
    currentSelectedItem.value = null;
    clearWheelThrottle();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mousedown', handleMouseDown);
};

/** 打开重新绑定弹窗 */
const openResetKeyCapture = () => {
    showKeyCaptureModal.value = true;
    capturedKey.value = '';
    isCapturing.value = false;
    window.addEventListener('keydown', handleKeyDownReset);
    window.addEventListener('mousedown', handleMouseDownReset);
    window.addEventListener('wheel', handleWheelReset, { passive: false });
};

/** 关闭重新绑定弹窗 */
const closeResetKeyCapture = () => {
    showKeyCaptureModal.value = false;
    capturedKey.value = '';
    isCapturing.value = false;
    currentResetItem.value = null;
    clearWheelThrottle();
    window.removeEventListener('keydown', handleKeyDownReset);
    window.removeEventListener('mousedown', handleMouseDownReset);
    window.removeEventListener('wheel', handleWheelReset);
};

/** 清理滚轮节流定时器 */
const clearWheelThrottle = () => {
    if (wheelThrottleTimer.value) {
        clearTimeout(wheelThrottleTimer.value);
        wheelThrottleTimer.value = null;
    }
};

/** 滚轮节流 */
const throttleWheel = () => {
    wheelThrottleTimer.value = window.setTimeout(() => {
        wheelThrottleTimer.value = null;
    }, WHEEL_THROTTLE_MS);
};

/** 检查按键是否已被其他配置使用，占用时给出提示 */
const isKeyInUse = (key: string, excludeName?: string | null): boolean => {
    const existingItem = applyKeyBindItems.value.find(
        item => item.key === key && item.systemBindCfgVO?.systemName !== excludeName
    );
    if (!existingItem) return false;
    window.$message?.warning($t('keyBind.messages.keyInUse', { key, name: existingItem.systemBindCfgVO?.systemName || '' }));
    return true;
};

/** 处理按键按下 */
const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    // 区分小键盘按键，CS2 配置格式为 KP_1、KP_2 等
    const key = e.code.startsWith('Numpad') ? e.code.replace('Numpad', 'kp_').toUpperCase() : e.key.toUpperCase();
    capturedKey.value = buildKey(e, key);
    saveAndCloseCapture();
};

/** 处理鼠标按下（不记录左右键） */
const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 0 || e.button === 2) return;
    const mouseKey = { 1: 'MOUSE3', 3: 'MOUSE4', 4: 'MOUSE5' }[e.button];
    if (!mouseKey) return;
    capturedKey.value = buildKey(e, mouseKey);
    saveAndCloseCapture();
};

/** 处理按键按下（重新绑定） */
const handleKeyDownReset = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    const key = e.code.startsWith('Numpad') ? e.code.replace('Numpad', 'kp_').toUpperCase() : e.key.toUpperCase();
    capturedKey.value = buildKey(e, key);
    saveResetKeyAndClose();
};

/** 处理鼠标按下（重新绑定，不记录左右键） */
const handleMouseDownReset = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 0 || e.button === 2) return;
    const mouseKey = { 1: 'MOUSE3', 3: 'MOUSE4', 4: 'MOUSE5' }[e.button];
    if (!mouseKey) return;
    capturedKey.value = buildKey(e, mouseKey);
    saveResetKeyAndClose();
};

/** 处理重置时的滚轮事件（带节流 + 按键占用检测） */
const handleWheelReset = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCapturing.value || wheelThrottleTimer.value) return;

    const wheelKey = e.deltaY < 0 ? 'MWHEELUP' : 'MWHEELDOWN';
    if (isKeyInUse(wheelKey, currentResetItem.value?.systemBindCfgVO?.systemName)) return;

    capturedKey.value = wheelKey;
    throttleWheel();
    isCapturing.value = true;
    saveResetKeyAndClose();
};

/** 保存重置的按键并关闭弹窗 */
const saveResetKeyAndClose = async () => {
    if (!currentResetItem.value || !capturedKey.value) {
        closeResetKeyCapture();
        return;
    }
    if (isKeyInUse(capturedKey.value, currentResetItem.value.systemBindCfgVO?.systemName)) return;

    const newRenderKeyConfigJson = replaceKeyPlaceholders(currentResetItem.value.keyConfigJson, capturedKey.value);
    const index = applyKeyBindItems.value.findIndex(
        item => item.systemBindCfgVO?.systemName === currentResetItem.value?.systemBindCfgVO?.systemName
    );
    if (index !== -1) {
        const oldItem = applyKeyBindItems.value[index];
        applyKeyBindItems.value[index] = {
            ...currentResetItem.value,
            key: capturedKey.value,
            renderKeyConfigJson: newRenderKeyConfigJson
        };

        // 将修改后的配置写入 cfg 文件
        const paths = await window.ipcRenderer.invoke('auto-detect-paths');
        if (paths.csgo2Path) {
            // 先移除旧配置，再写入新配置
            if (oldItem.renderKeyConfigJson) {
                await window.ipcRenderer.invoke('remove-autoexec-cfg-content', paths.csgo2Path, oldItem.renderKeyConfigJson);
            }
            const header = buildLogHeader(currentResetItem.value.systemBindCfgVO?.systemName || '', capturedKey.value);
            const { success } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, header + '\n' + newRenderKeyConfigJson);
            if (success) {
                window.$message?.success($t('keyBind.messages.resetSuccess'));
            } else {
                window.$message?.error($t('keyBind.messages.writeCfgFailed'));
            }
        } else {
            window.$message?.error($t('keyBind.messages.csgoPathNotFound'));
        }
    }
    closeResetKeyCapture();
};

/** 处理滚轮事件（带节流） */
const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (wheelThrottleTimer.value) return;
    if (e.deltaY < 0) {
        capturedKey.value = 'MWHEELUP';
    } else if (e.deltaY > 0) {
        capturedKey.value = 'MWHEELDOWN';
    }
    throttleWheel();
    saveAndCloseCapture();
};

/* ===== 个人配置弹窗 ===== */

/** 复制配置代码 */
const copyConfigCode = (code: string) => {
    navigator.clipboard.writeText(code);
    window.$message?.success($t('keyBind.messages.copySuccess'));
};

/** 复制个人配置 */
const copyPersonalConfig = () => {
    if (!currentSelectedItem.value) return;
    copyConfigCode(currentSelectedItem.value.keyConfigJson);
    showKeyCaptureModal.value = false;
};

const openAddConfigModal = () => {
    isEditMode.value = false;
    editingConfigId.value = null;
    newConfigName.value = '';
    newConfigJson.value = '';
    showAddConfigModal.value = true;
};

const openEditConfigModal = () => {
    if (!currentSelectedItem.value?.id) return;
    isEditMode.value = true;
    editingConfigId.value = currentSelectedItem.value.id;
    newConfigName.value = currentSelectedItem.value.systemName;
    newConfigJson.value = currentSelectedItem.value.keyConfigJson;
    showAddConfigModal.value = true;
    showKeyCaptureModal.value = false;
};

const closeAddConfigModal = () => {
    showAddConfigModal.value = false;
    isEditMode.value = false;
    editingConfigId.value = null;
    newConfigName.value = '';
    newConfigJson.value = '';
};

/** 保存配置（新增或编辑） */
const saveAddConfig = async () => {
    if (!newConfigName.value.trim()) {
        window.$message?.warning($t('keyBind.pleaseEnterConfigName'));
        return;
    }
    if (!newConfigJson.value.trim()) {
        window.$message?.warning($t('keyBind.pleaseEnterConfigContent'));
        return;
    }

    const configName = newConfigName.value.trim();
    const keyConfigJson = newConfigJson.value.trim();
    const { error } = isEditMode.value && editingConfigId.value
        ? await fetchUpdateKeyBind({ id: editingConfigId.value, configName, keyConfigJson })
        : await fetchAddKeyBind({ configName, keyConfigJson });
    if (error) return;
    window.$message?.success(isEditMode.value ? $t('keyBind.configUpdated') : $t('keyBind.configAdded'));
    closeAddConfigModal();
    await fetchLocalConfigLibrary();
};

/** 删除个人配置 */
const removePersonalConfig = async () => {
    if (!currentSelectedItem.value?.id) return;
    const { error } = await fetchDeleteKeyBind(currentSelectedItem.value.id);
    if (error) return;
    window.$message?.success($t('keyBind.configDeleted'));
    showKeyCaptureModal.value = false;
    await fetchLocalConfigLibrary();
};

/** 保存按键并关闭弹窗 */
const saveAndCloseCapture = () => {
    if (currentSelectedItem.value && capturedKey.value) {
        // 系统配置库
        if (selectedSystemConfig.value === '武器类' || selectedSystemConfig.value === '道具类' || selectedSystemConfig.value === 'ZE常用') {
            // 同一配置项已存在时忽略
            if (applyKeyBindItems.value.some(item => item.systemBindCfgVO?.systemName === currentSelectedItem.value?.systemName)) return;
            // 按键已被其他配置占用
            if (isKeyInUse(capturedKey.value)) return;

            const renderKeyConfigJson = replaceKeyPlaceholders(currentSelectedItem.value.keyConfigJson, capturedKey.value);
            const newBindItem: Api.Game.ApplyKeyBindItem = {
                key: capturedKey.value,
                keyConfigJson: currentSelectedItem.value.keyConfigJson,
                renderKeyConfigJson,
                configType: 'system',
                systemBindCfgVO: {
                    systemName: currentSelectedItem.value.systemName,
                    systemIcon: currentSelectedItem.value.systemIcon,
                    keyConfigJson: currentSelectedItem.value.keyConfigJson
                }
            };
            // 用展开运算符创建新数组，触发计算属性 setter
            applyKeyBindItems.value = [...applyKeyBindItems.value, newBindItem];

            const header = buildLogHeader(currentSelectedItem.value.configDesc || currentSelectedItem.value.systemName, capturedKey.value);
            applyKeyBinds(header + '\n' + renderKeyConfigJson);
        }
    } else {
        // 使用自定义配置
        applyKeyBinds('');
    }
    closeKeyCapture();
};

/* ===== 配置应用 ===== */

/** 写入 Cfg 文件 */
const applyKeyBinds = async (content: string) => {
    const paths = await window.ipcRenderer.invoke('auto-detect-paths');
    if (!paths.csgo2Path) {
        window.$message?.error($t('keyBind.messages.csgoPathNotFound'));
        return;
    }
    const { error } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, content);
    if (!error) {
        window.$message?.success($t('keyBind.messages.applySuccess'));
    } else {
        window.$message?.error($t('keyBind.messages.applyFailed'));
    }
};

/** 保存本地 autoexec.cfg（覆盖整个文件） */
const saveLocalAutoexecCfg = async () => {
    const paths = await window.ipcRenderer.invoke('auto-detect-paths');
    if (!paths.csgo2Path) {
        window.$message?.error($t('keyBind.messages.csgoPathNotFound'));
        return;
    }
    const { success } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, localAutoexecCfg.value, true);
    if (success) {
        window.$message?.success($t('keyBind.messages.saveSuccess'));
    } else {
        window.$message?.error($t('keyBind.messages.saveFailed'));
    }
};

/* ===== 数据获取 ===== */

/** 获取个人配置库 */
const fetchLocalConfigLibrary = async () => {
    const { error, data } = await fetchGetMyKeyBinds();
    if (error || !data) return;
    LocalConfigItems.value = data.map(item => ({
        id: item.id,
        systemName: item.configName,
        systemIcon: Command,
        keyConfigJson: item.keyConfigJson,
        configDesc: '用户个人配置库'
    }));
};

const handleBack = () => emit('back');

/* ===== 监听与生命周期 ===== */

/** 监听弹窗关闭，确保移除所有事件监听（ESC / 蒙层 / v-model 关闭时不会主动调用 close） */
watch(showKeyCaptureModal, (visible) => {
    if (!visible) {
        closeKeyCapture();
        closeResetKeyCapture();
    }
});

onMounted(() => {
    fetchLocalConfigLibrary();
});
</script>

<template>
    <div class="key-bind-container">
        <div class="header-section">
            <div class="title-section">
                <SvgIcon icon="material-symbols:keyboard-alt-outline" />
                <h1 class="page-title">{{ $t('keyBind.title') }}</h1>
            </div>
            <div class="back-btn" @click="handleBack">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>{{ $t('keyBind.back') }}</span>
            </div>
        </div>
        <div class="main-content">
            <NCard class="left-panel" content-class="h-full overflow-auto" content-style="padding:10px;">
                <div class="flex flex-col gap-10px">
                    <div class="tab-switch">
                        <button class="tab-btn" :class="{ active: activeTab === 'library' }"
                            @click="activeTab = 'library'; handleTabChange('library')">
                            {{ $t('keyBind.tabs.library') }}
                        </button>
                        <button class="tab-btn" :class="{ active: activeTab === 'user' }"
                            @click="activeTab = 'user'; handleTabChange('user')">
                            {{ $t('keyBind.tabs.user') }}
                        </button>
                        <button class="tab-btn" :class="{ active: activeTab === 'local' }"
                            @click="activeTab = 'local'; handleTabChange('local')">
                            {{ $t('keyBind.tabs.local') }}
                        </button>
                    </div>
                    <div v-show="activeTab === 'library'">
                        <NGrid :y-gap="10" :cols="1">
                            <NGridItem v-for="systemConfig in systemLibraryItems" :key="systemConfig.systemName">
                                <div class="config-card"
                                    :class="{ 'selected': selectedSystemConfig === systemConfig.systemName }"
                                    @click="selectedSystemConfig = systemConfig.systemName">
                                    <div class="config-card-content-img">
                                        <img :src="systemConfig.systemIcon">
                                    </div>
                                    <div class="config-card-text">
                                        <div class="config-card-title">{{ systemConfig.systemName }}</div>
                                        <div class="config-card-desc">{{ systemConfig.configDesc }}</div>
                                    </div>
                                </div>
                            </NGridItem>
                        </NGrid>
                    </div>

                    <div v-show="activeTab === 'user'">
                        <NGrid x-gap="10" y-gap="10" :cols="1">
                            <NGridItem v-for="item in applyKeyBindItems" :key="item.systemBindCfgVO?.systemName"
                                @click="handleUserConfigClick(item.systemBindCfgVO?.systemName)">
                                <div class="applied-binding-item"
                                    :class="{ 'selected': selectedSystemConfig === item.systemBindCfgVO?.systemName }">
                                    <div class="applied-binding-img">
                                        <img :src="item.systemBindCfgVO?.systemIcon" />
                                    </div>
                                    <div class="applied-binding-text">
                                        <div class="applied-binding-name">{{ item.systemBindCfgVO?.systemName }}</div>
                                        <div class="applied-binding-key">{{ $t('keyBind.bindingKey') }}: {{ item.key }}
                                        </div>
                                    </div>
                                </div>
                            </NGridItem>
                        </NGrid>
                    </div>
                </div>
            </NCard>
            <NCard class="right-panel" content-style="padding:10px;"
                content-class="h-full flex flex-col flex-1 overflow-auto" header-style="padding:0px">
                <template #header v-if="activeTab === 'local'">
                    <div class="pl-20px pr-20px pb-5px flex justify-between">
                        <div class="flex items-center">
                            <div class="font-size-24px">
                                <SvgIcon icon="material-symbols:folder-code-outline" class="w-24px h-24px mr-10px" />
                            </div>
                            <div class="font-size-14px font-bold">
                                {{ $t('keyBind.cfgFileName') }}
                            </div>
                        </div>
                    </div>
                </template>
                <NGrid x-gap="10" y-gap="10" :cols="4" v-if="activeTab === 'library'">
                    <NGridItem v-if="selectedSystemConfig === '个人配置库'" class="add-config-grid-item">
                        <NCard class="rounded-10px add-config-card cursor-pointer" content-style="padding:10px"
                            content-class="flex flex-col items-center justify-center" @click="openAddConfigModal">
                            <SvgIcon icon="material-symbols:add" class="w-48px h-48px text-gray-400 mb-8px" />
                            <span class="text-12px text-gray-400">{{ $t('keyBind.addConfig') }}</span>
                        </NCard>
                    </NGridItem>
                    <NGridItem v-for="item in currentCfgOptions" :key="item.systemName"
                        @click="!isItemApplied(item.systemName) && openKeyCapture(item)">
                        <NCard class="rounded-10px"
                            :class="{ 'applied': isItemApplied(item.systemName), 'selected': selectedSystemConfig === item.systemName }"
                            content-style="padding:10px"
                            :content-class="isItemApplied(item.systemName) ? 'flex flex-col items-center justify-center' : 'cursor-pointer flex flex-col items-center justify-center'">
                            <img :src="item.systemIcon || Command" class="w-48px h-48px object-contain mb-8px" />
                            <span class="text-12px">{{ item.systemName }}</span>
                            <button class="config-copy-btn" @click.stop="copyConfigCode(item.keyConfigJson)">
                                <SvgIcon icon="mdi:content-copy" />
                                <span>{{ $t('keyBind.copyCommand') }}</span>
                            </button>
                        </NCard>
                    </NGridItem>
                </NGrid>
                <div v-show="activeTab === 'user'">
                    <NCollapse>
                        <NCollapseItem v-for="(item) in applyKeyBindItems" :key="item.systemBindCfgVO?.systemName"
                            :name="item.systemBindCfgVO?.systemName">
                            <template #header>
                                <NCard class="rounded-10px" content-class="flex" content-style="padding:10px;">
                                    <div class="w-200px flex justify-center">
                                        <img :src="item.systemBindCfgVO?.systemIcon" class="h-75px mr-20px" />
                                    </div>
                                    <div class="flex-1 flex flex-col align-center justify-between">
                                        <span class="text-14px font-bold">{{ $t('keyBind.configName') }} : {{
                                            item.systemBindCfgVO?.systemName
                                        }}</span>
                                        <span class="text-12px text-gray-500">{{ $t('keyBind.bindingKey') }} : {{
                                            item.key }}</span>
                                    </div>
                                    <div class="flex flex-col items-center justify-center w-150px gap-10px">
                                        <NButton class="rounded-10px" type="info" ghost
                                            @click.stop="resetAppliedBindingKey(item.systemBindCfgVO?.systemName)">{{
                                                $t('keyBind.resetKey') }}
                                        </NButton>
                                        <NButton class="rounded-10px" type="warning" ghost
                                            @click.stop="removeAppliedBinding(item.systemBindCfgVO?.systemName)">{{
                                                $t('keyBind.removeBinding') }}
                                        </NButton>
                                    </div>
                                </NCard>
                            </template>
                            <div class="config-code-block">
                                <NButton class="copy-btn" size="tiny" quaternary
                                    @click="copyConfigCode(item.renderKeyConfigJson)">
                                    <template #icon>
                                        <SvgIcon icon="mdi:content-copy" />
                                    </template>
                                </NButton>
                                <pre><code>{{ item.renderKeyConfigJson }}</code></pre>
                            </div>
                        </NCollapseItem>
                    </NCollapse>
                </div>
                <div v-show="activeTab === 'local'" class="h-full">
                    <MdEditor v-model="localAutoexecCfg" :preview="false"
                        :toolbars="['revoke', 'next', 'save']" @onSave="saveLocalAutoexecCfg" />
                </div>
            </NCard>
        </div>
        <!-- 按键绑定配置弹窗 -->
        <NModal v-model:show="showKeyCaptureModal" :bordered="true" preset="card"
            class="w-400px rounded-20px key-capture-wrapper" :closable="false"
            size="small">
            <template #header>
                {{ $t('keyBind.keyBindConfig') }}
            </template>
            <template #header-extra>
                <div class="flex items-center justify-between font-size-18px">
                    <NButton quaternary size="tiny" @click="closeKeyCapture">
                        <SvgIcon icon="material-symbols:close" />
                    </NButton>
                </div>
            </template>
            <div v-if="!isPersonalConfig" class="key-capture-modal-new pt-20px pb-20px pl-20px pr-20px"
                @wheel="handleWheel" @mousedown="handleMouseDown">
                <!-- 顶部装饰区域 -->
                <div class="capture-header mb-20px">
                    <div class="character-image">
                        <img src="@/assets/imgs/menu/942302.png" alt="character" />
                    </div>
                    <div class="header-glow"></div>
                </div>
                <!-- 配置名称 -->
                <div class="config-name text-18px font-bold mb-20px text-center">
                    {{ currentSelectedItem?.systemName }}
                </div>
                <!-- 按键显示区域 -->
                <div class="capture-display-area mb-20px" :class="{ 'has-key': capturedKey }">
                    <div class="key-display-box">
                        <span v-if="capturedKey" class="captured-key-text">{{ capturedKey }}</span>
                        <span v-else class="waiting-text">
                            <span class="dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </span>
                    </div>
                </div>
                <!-- 提示信息 -->
                <div class="capture-tips mb-20px">
                    <div class="tip-item">
                        <SvgIcon icon="material-symbols:keyboard" class="tip-icon" />
                        <span class="tip-text">{{ $t('keyBind.capture.keyboard') }}</span>
                    </div>
                    <div class="tip-item">
                        <SvgIcon icon="material-symbols:mouse" class="tip-icon" />
                        <span class="tip-text">{{ $t('keyBind.capture.mouse') }}</span>
                    </div>
                    <div class="tip-item">
                        <SvgIcon icon="material-symbols:swap-vert" class="tip-icon" />
                        <span class="tip-text">{{ $t('keyBind.capture.wheel') }}</span>
                    </div>
                </div>
            </div>
            <div v-else class="key-capture-modal-new pt-20px pb-20px pl-20px pr-20px">
                <!-- 顶部装饰区域 -->
                <div class="capture-header mb-20px">
                    <div class="character-image">
                        <img src="@/assets/imgs/menu/942302.png" alt="character" />
                    </div>
                    <div class="header-glow"></div>
                </div>
                <div class="config-name text-18px font-bold mb-20px text-center">
                    {{ currentSelectedItem?.systemName }}
                </div>
                <div class="capture-tips">
                    <div class="tip-item cursor-pointer" @click="copyPersonalConfig">
                        <SvgIcon icon="mdi:content-copy" class="tip-icon" />
                        <span class="tip-text">{{ $t('keyBind.copyConfig') }}</span>
                    </div>
                    <div class="tip-item cursor-pointer" @click="openEditConfigModal">
                        <SvgIcon icon="material-symbols:edit-square-outline" class="tip-icon" />
                        <span class="tip-text">{{ $t('keyBind.editConfig') }}</span>
                    </div>
                    <div class="tip-item cursor-pointer" @click="removePersonalConfig">
                        <SvgIcon icon="material-symbols:delete-outline" class="tip-icon" />
                        <span class="tip-text">{{ $t('keyBind.deleteConfig') }}</span>
                    </div>
                </div>
            </div>
        </NModal>
        <!-- 新增/编辑配置弹框 -->
        <NModal v-model:show="showAddConfigModal" :bordered="true" preset="card"
            class="w-600px h-500px rounded-20px key-capture-wrapper overflow-auto"
            :closable="false" size="medium">
            <template #header>
                <div class="flex items-center justify-between font-size-18px">
                    <div class="font-size-16px">{{ isEditMode ? $t('keyBind.editPersonalConfig') :
                        $t('keyBind.addPersonalConfig') }}</div>
                    <NButton quaternary size="tiny" @click="closeAddConfigModal">
                        <SvgIcon icon="material-symbols:close" />
                    </NButton>
                </div>
            </template>
            <div class="pt-20px pb-20px pl-20px pr-20px">
                <div class="mb-20px">
                    <div class="text-sm font-medium mb-5px">{{ $t('keyBind.configName') }}</div>
                    <NInput v-model:value="newConfigName" :placeholder="$t('keyBind.configNamePlaceholder')" />
                </div>
                <div class="mb-20px">
                    <div class="text-sm font-medium mb-5px">{{ $t('keyBind.configContent') }}</div>
                    <MdEditor v-model="newConfigJson" :preview="false"
                        :toolbars="['revoke', 'next']" />
                </div>
            </div>
            <template #footer>
                <div class="flex flex-wrap gap-10px">
                    <NButton type="warning" class="flex-1 rounded-5px" ghost @click="closeAddConfigModal">
                        <template #icon>
                            <SvgIcon icon="material-symbols:close" />
                        </template>
                        {{ $t('keyBind.cancel') }}
                    </NButton>
                    <NButton type="info" class="flex-1 rounded-5px" ghost @click="saveAddConfig">
                        <template #icon>
                            <SvgIcon icon="material-symbols:check" />
                        </template>
                        {{ isEditMode ? $t('keyBind.saveChanges') : $t('keyBind.addConfig') }}
                    </NButton>
                </div>
            </template>
        </NModal>
    </div>
</template>

<style scoped lang="scss">
// ==================== 页面主色 ====================
// 清爽天蓝色系（对应 Blue Archive 品牌色），替代紫色系 AI 味配色   
$accent: #4b9ef8; // 主色（天蓝）
$accent-deep: #3a86e0; // 主色深（渐变末端 / hover）
$accent-hover: #3f8fe8; // hover 渐变起点
$accent-hover-deep: #2e72c4; // hover 渐变末端

.key-bind-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 16px;
    animation: fadeIn 0.4s ease-out;

    .header-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;

        .title-section {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
        }

        .back-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-radius: 10px;
            cursor: pointer;
            color: $accent;
            background: rgba($accent, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;

            &:hover {
                color: $accent;
                background: rgba($accent, 0.3);
            }

            .back-icon {
                font-size: 20px;
            }
        }


        .page-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            color: var(--n-text-color);
            letter-spacing: 0.5px;
        }
    }

    .main-content {
        display: flex;
        flex: 1;
        gap: 16px;
        min-height: 0;

        .left-panel {
            width: 300px;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid var(--n-border-color);
            background: var(--n-color);
            transition: all 0.2s ease;

            // 分段式 Tab 切换器
            .tab-switch {
                display: flex;
                gap: 4px;
                padding: 4px;
                margin-bottom: 4px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);

                .tab-btn {
                    flex: 1;
                    padding: 7px 0;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12.5px;
                    font-weight: 500;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.55);

                    &:hover {
                        color: rgba(255, 255, 255, 0.9);
                    }

                    &.active {
                        background: linear-gradient(135deg, $accent 0%, $accent-deep 100%);
                        color: #fff;
                        box-shadow: 0 4px 12px rgba($accent, 0.35);
                    }
                }
            }

            .config-card,
            .applied-binding-item {
                display: flex;
                align-items: center;
                width: 100%;
                height: 74px;
                border-radius: 14px;
                cursor: pointer;
                pointer-events: auto;
                transition: all 0.25s ease;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.04);
                position: relative;
                overflow: hidden;
                padding: 10px;
                gap: 12px;

                &::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: transparent;
                    transition: background 0.2s ease;
                }

                &:hover {
                    background: rgba(255, 255, 255, 0.07);
                    border-color: rgba($accent, 0.35);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                }

                &.selected {
                    background: rgba($accent, 0.08);
                    border-color: rgba($accent, 0.6);
                    box-shadow: 0 8px 24px rgba($accent, 0.2);
                    transform: translateY(-2px);

                    &::before {
                        background: $accent;
                    }
                }

                .config-card-content-img,
                .applied-binding-img {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    padding: 8px;
                    border-radius: 10px;
                    margin-left: 3px;
                    background: rgba(255, 255, 255, 0.05);
                    flex-shrink: 0;
                    transition: all 0.2s ease;

                    img {
                        width: 32px;
                        height: 32px;
                        object-fit: contain;
                    }
                }

                .config-card-text,
                .applied-binding-text {
                    flex: 1;
                    min-width: 0;

                    .config-card-title,
                    .applied-binding-name {
                        font-size: 14px;
                        font-weight: 600;
                        color: #fff;
                        line-height: 1.4;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        transition: color 0.2s ease;
                    }

                    .config-card-desc,
                    .applied-binding-key {
                        font-size: 11px;
                        color: rgba(255, 255, 255, 0.5);
                        line-height: 1.4;
                        margin-top: 2px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                }

                &.selected {

                    .config-card-content-img,
                    .applied-binding-img {
                        background: rgba($accent, 0.15);
                        box-shadow: 0 0 0 1px rgba($accent, 0.25);
                    }

                    .config-card-title,
                    .applied-binding-name {
                        color: $accent;
                    }
                }
            }
        }

        .right-panel {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 16px;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;

            :deep(.n-card) {
                &.applied {
                    border: 2px solid $accent;
                    box-shadow: 0 0 10px rgba($accent, 0.4);
                }

                &.selected {
                    border-color: $accent;
                    box-shadow: 0 0 0 2px rgba($accent, 0.2);
                    background: rgba($accent, 0.05);
                }
            }

            // 配置卡片复制按钮（参考 botGroup 的 action-btn 风格）
            .config-copy-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                width: 100%;
                margin-top: 8px;
                padding: 7px 2px;
                border: none;
                border-radius: 9px;
                cursor: pointer;
                font-size: 12.5px;
                font-weight: 500;
                white-space: nowrap;
                transition: all 0.2s ease;
                background: rgba(255, 255, 255, 0.06);
                color: rgba(255, 255, 255, 0.8);

                svg {
                    font-size: 14px;
                    flex-shrink: 0;
                }

                &:hover {
                    background: rgba($accent, 0.2);
                    color: $accent;
                    transform: translateY(-2px);
                }
            }

            .empty-bindings {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: rgba(255, 255, 255, 0.5);

                .empty-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }

                .empty-text {
                    font-size: 14px;
                }
            }
        }
    }
}

// 新的按键捕获弹窗样式 - 适配黑白主题
.key-capture-wrapper {
    :deep(.n-card) {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: none;
        overflow: hidden;
    }
}

.key-capture-modal-new {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0 16px 0;
    color: #fff;
    position: relative;

    .capture-header {
        position: relative;
        width: 100%;
        height: 100px;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        margin-bottom: 12px;

        .character-image {
            position: relative;
            z-index: 2;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid rgba($accent, 0.5);
            box-shadow: 0 0 20px rgba($accent, 0.4);

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        .header-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba($accent, 0.3) 0%, transparent 70%);
            z-index: 1;
        }
    }

    .capture-display-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 16px;

        .key-display-box {
            min-width: 160px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba($accent, 0.3);
            border-radius: 12px;
            padding: 0 20px;
            transition: all 0.3s ease;

            .captured-key-text {
                font-size: 24px;
                font-weight: 700;
                color: $accent;
                text-shadow: 0 0 20px rgba($accent, 0.5);
            }

            .waiting-text {
                .dots {
                    display: flex;
                    gap: 6px;

                    span {
                        width: 10px;
                        height: 10px;
                        background: $accent;
                        border-radius: 50%;
                        animation: dotPulse 1.4s ease-in-out infinite;

                        &:nth-child(2) {
                            animation-delay: 0.2s;
                        }

                        &:nth-child(3) {
                            animation-delay: 0.4s;
                        }
                    }
                }
            }
        }

        &.has-key {
            .key-display-box {
                background: rgba($accent, 0.1);
                border-color: $accent;
                box-shadow: 0 0 20px rgba($accent, 0.3);
            }
        }
    }

    .capture-tips {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;

        .tip-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 70px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s ease;
            gap: 4px;

            &:hover {
                background: rgba($accent, 0.1);
                border-color: rgba($accent, 0.3);
            }

            .tip-icon {
                font-size: 22px;
                color: $accent;
            }

            .tip-text {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
            }
        }
    }

    .capture-buttons {
        display: flex;
        gap: 12px;
        width: 100%;
        margin-top: 8px;

        .cancel-btn,
        .apply-btn {
            flex: 1;
            height: 40px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
        }

        .cancel-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
            }
        }

        .apply-btn {
            background: linear-gradient(135deg, $accent 0%, $accent-deep 100%);
            border: none;
            color: white;

            &:hover:not(:disabled) {
                background: linear-gradient(135deg, $accent-hover 0%, $accent-hover-deep 100%);
                box-shadow: 0 4px 15px rgba($accent, 0.4);
            }

            &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        }
    }
}

// 配置代码块样式
.config-code-block {
    position: relative;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    max-height: 300px;
    overflow: auto;
    border: 1px solid;

    .copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    &:hover .copy-btn {
        opacity: 1;
    }

    pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    code {
        font-family: inherit;
        white-space: pre-wrap;
    }


}

@keyframes dotPulse {

    0%,
    100% {
        opacity: 0.3;
        transform: scale(0.8);
    }

    50% {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
