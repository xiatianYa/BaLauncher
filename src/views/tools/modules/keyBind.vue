<script setup lang="ts">
import { ref, computed, onMounted, } from 'vue';
import {
    NButton,
    NCard,
    NModal,
    NGrid,
    NGridItem
} from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import { useGameStore } from '@/store/modules/game';
import {
    fetchGetAllSharedKeyBinds,
    fetchGetMyKeyBinds,
} from '@/service/api/game/keyBind';
import { MdEditor } from 'md-editor-v3';
import dayjs from 'dayjs';
import {
    systemLibraryItems as systemLibraryItemsConst,
    GunLibaryCfgOption as GunLibaryCfgOptionConst,
    PropLibaryCfgOption as PropLibaryCfgOptionConst,
    ZELibaryCfgOption as ZELibaryCfgOptionConst
} from '@/constants/keyBind';
import { $t } from '@/locales';


/**
 * 组件配置
 */
defineOptions({ name: 'keyBind' });

/**
 * 事件定义
 */
const emit = defineEmits<{ back: []; }>();

// ============================================================================
// 状态管理
// ============================================================================

/** 主题相关 */
const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

/** Game Store */
const gameStore = useGameStore();

/** UI 状态 */
const activeTab = ref<'library' | 'local' | 'user'>('library');
const selectedSystemConfig = ref<string | null>(null);
const showKeyCaptureModal = ref<boolean>(false);
const localAutoexecCfg = ref<string>('');

/**
* 监听编辑器内容变化，同步到编辑器实例
*/
/** 按键绑定相关 */
const capturedKey = ref<string>('');
/** 滚轮事件节流 */
const wheelThrottleTimer = ref<number | null>(null);
const WHEEL_THROTTLE_MS = 300; // 滚轮事件节流时间（毫秒）
/** 配置库相关 */
const systemLibraryItems = ref<Api.Game.SystemBindVO[]>(systemLibraryItemsConst);
//系统武器配置库
const GunLibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>(GunLibaryCfgOptionConst);
//系统道具配置库
const PropLibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>(PropLibaryCfgOptionConst);
// ZE配置库
const ZELibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>(ZELibaryCfgOptionConst);
// 根据选中的系统配置返回对应的配置选项
const currentCfgOptions = computed(() => {
    switch (selectedSystemConfig.value) {
        case '武器类':
            return GunLibaryCfgOption.value;
        case '道具类':
            return PropLibaryCfgOption.value;
        case 'ZE常用':
            return ZELibaryCfgOption.value;
        default:
            return [];
    }
});
// 公共数据库库配置
const configLibraryItems = ref<Api.Game.KeyBindList>([]);
// 引用的数据库配置
const localConfigItems = ref<Api.Game.KeyBindList>([]);
// 用户应用的按键绑定项 - 从 gameStore 获取
const applyKeyBindItems = computed({
    get: () => gameStore.applyKeyBindItems,
    set: (items) => gameStore.setApplyKeyBindItems(items)
});

// ============================================================================
// 工具函数
// ============================================================================
/**
 * 替换编辑器中的按键占位符
 */
const replaceKeyPlaceholders = (content: string, bindKey: string): string => {
    let result = content;
    const regex = new RegExp(`\\[按键:[^\\]]+\\]`, 'g');
    result = result.replace(regex, bindKey);
    return result;
};

/**
 * 构建配置写入日志头部
 */
const buildLogHeader = (desc: string, key: string): string => {
    const writeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    return `// ========================================
// BaLauncher 按键绑定配置
// ${desc} - 绑定至 ${key}
// 生成时间: ${writeTime}
// ========================================`;
};


// ============================================================================
// 配置管理
// ============================================================================
// 读取本地配置文件
const loadLocalAutoexecCfg = async () => {
    try {
        const paths = await window.ipcRenderer.invoke('auto-detect-paths');
        if (paths.csgo2Path) {
            const result = await window.ipcRenderer.invoke('read-autoexec-cfg', paths.csgo2Path);
            if (result.success) {
                localAutoexecCfg.value = result.content || '';
            } else {
                window.$message?.error($t('keyBind.messages.readFailed') + ': ' + (result.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Failed to read local config:', error);
        window.$message?.error($t('keyBind.messages.readLocalFailed'));
    }
};

// 切换标签页
const handleTabChangeFn = async (value: 'library' | 'local' | 'user') => {
    activeTab.value = value;
    selectedSystemConfig.value = null;
    selectedSystemConfig.value = '';
    await loadLocalAutoexecCfg();
};

// 检查配置项是否已应用
const isItemApplied = (systemName: string): boolean => {
    return applyKeyBindItems.value.some(item => item.systemBindCfgVO?.systemName === systemName);
};

// 处理个人配置项点击
const handleUserConfigClickFn = (systemName: string | undefined) => {
    if (!systemName) return;
    selectedSystemConfig.value = systemName;
};

// 移除已应用的绑定
const removeAppliedBinding = async (systemName: string | undefined) => {
    if (!systemName) return;
    const index = applyKeyBindItems.value.findIndex(item => item.systemBindCfgVO?.systemName === systemName);
    if (index !== -1) {
        const item = applyKeyBindItems.value[index];

        // 从cfg文件中移除配置
        const paths = await window.ipcRenderer.invoke('auto-detect-paths');
        if (paths.csgo2Path && item.renderKeyConfigJson) {
            const { success } = await window.ipcRenderer.invoke('remove-autoexec-cfg-content', paths.csgo2Path, item.renderKeyConfigJson);
            if (!success) {
                window.$message?.error($t('keyBind.messages.removeFromCfgFailed'));
                return;
            }
        }
        // 使用 filter 创建新数组，触发计算属性 setter
        applyKeyBindItems.value = applyKeyBindItems.value.filter((_, i) => i !== index);
        window.$message?.success($t('keyBind.messages.bindingRemoved'));
    }
};

// 当前要重置的绑定项
const currentResetItem = ref<Api.Game.ApplyKeyBindItem | null>(null);

// 是否正在捕获按键（防止重复触发）
const isCapturing = ref<boolean>(false);

// 重置已应用的绑定按键
const resetAppliedBindingKey = async (systemName: string | undefined) => {
    if (!systemName) return;

    // 找到对应的绑定项
    const item = applyKeyBindItems.value.find(i => i.systemBindCfgVO?.systemName === systemName);
    if (!item) {
        window.$message?.error($t('keyBind.messages.itemNotFound'));
        return;
    }

    // 保存当前要重置的项
    currentResetItem.value = item;

    // 打开重新绑定弹窗
    openResetKeyCaptureFn();
};



// ============================================================================
// 按键捕获
// ============================================================================

// 处理按键按下事件
const handleKeyDownFn = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let key = '';
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.shiftKey) key += 'Shift+';
    if (e.altKey) key += 'Alt+';

    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        // 区分小键盘按键，CS2配置格式为 KP_1, KP_2 等
        if (e.code.startsWith('Numpad')) {
            const numpadKey = e.code.replace('Numpad', 'kp_');
            key += numpadKey.toUpperCase();
        } else {
            key += e.key.toUpperCase();
        }
        capturedKey.value = key;
        saveAndCloseCaptureFn();
    }
};

// 处理鼠标按下事件
const handleMouseDownFn = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 不记录鼠标左键(0)和右键(2)点击
    if (e.button === 0 || e.button === 2) {
        return;
    }

    let key = '';
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.shiftKey) key += 'Shift+';
    if (e.altKey) key += 'Alt+';

    switch (e.button) {
        case 1:
            key += 'MOUSE3';
            break;
        case 3:
            key += 'MOUSE4';
            break;
        case 4:
            key += 'MOUSE5';
            break;
        default:
            return;
    }

    capturedKey.value = key;
    saveAndCloseCaptureFn();
};

// 当前选中的配置项
const currentSelectedItem = ref<Api.Game.SystemBindCfgVO | null>(null);

// 打开按键捕获弹窗
const openKeyCaptureFn = (item: Api.Game.SystemBindCfgVO) => {
    currentSelectedItem.value = item;
    capturedKey.value = '';
    showKeyCaptureModal.value = true;
    window.addEventListener('keydown', handleKeyDownFn);
    window.addEventListener('mousedown', handleMouseDownFn);
};

// 关闭按键捕获弹窗
const closeKeyCaptureFn = () => {
    showKeyCaptureModal.value = false;
    capturedKey.value = '';
    currentSelectedItem.value = null;
    // 清理滚轮节流定时器
    if (wheelThrottleTimer.value) {
        clearTimeout(wheelThrottleTimer.value);
        wheelThrottleTimer.value = null;
    }
    window.removeEventListener('keydown', handleKeyDownFn);
    window.removeEventListener('mousedown', handleMouseDownFn);
};

// 打开重新绑定弹窗
const openResetKeyCaptureFn = () => {
    showKeyCaptureModal.value = true;
    capturedKey.value = '';
    isCapturing.value = false;
    window.addEventListener('keydown', handleKeyDownResetFn);
    window.addEventListener('mousedown', handleMouseDownResetFn);
    window.addEventListener('wheel', handleWheelResetFn, { passive: false });
};

// 关闭重新绑定弹窗
const closeResetKeyCaptureFn = () => {
    showKeyCaptureModal.value = false;
    capturedKey.value = '';
    isCapturing.value = false;
    currentResetItem.value = null;
    // 清理滚轮节流定时器
    if (wheelThrottleTimer.value) {
        clearTimeout(wheelThrottleTimer.value);
        wheelThrottleTimer.value = null;
    }
    window.removeEventListener('keydown', handleKeyDownResetFn);
    window.removeEventListener('mousedown', handleMouseDownResetFn);
    window.removeEventListener('wheel', handleWheelResetFn);
};

// 处理重置时的鼠标滚轮事件（带节流）
const handleWheelResetFn = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 防止重复触发
    if (isCapturing.value) return;

    // 节流检查
    if (wheelThrottleTimer.value) {
        return;
    }

    // 检查滚轮按键是否已被其他配置使用
    const wheelKey = e.deltaY < 0 ? 'MWHEELUP' : 'MWHEELDOWN';
    const keyExistsIndex = applyKeyBindItems.value.findIndex(
        item => item.key === wheelKey && item.systemBindCfgVO?.systemName !== currentResetItem.value?.systemBindCfgVO?.systemName
    );
    if (keyExistsIndex !== -1) {
        const existingItem = applyKeyBindItems.value[keyExistsIndex];
        window.$message?.warning($t('keyBind.messages.keyInUse', { key: wheelKey, name: existingItem.systemBindCfgVO?.systemName || '' }));
        return;
    }

    if (e.deltaY < 0) {
        capturedKey.value = 'MWHEELUP';
    } else if (e.deltaY > 0) {
        capturedKey.value = 'MWHEELDOWN';
    }

    // 设置节流定时器
    wheelThrottleTimer.value = window.setTimeout(() => {
        wheelThrottleTimer.value = null;
    }, WHEEL_THROTTLE_MS);

    isCapturing.value = true;
    saveResetKeyAndCloseFn();
};

// 处理重置时的按键按下事件
const handleKeyDownResetFn = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let key = '';
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.shiftKey) key += 'Shift+';
    if (e.altKey) key += 'Alt+';

    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        // 区分小键盘按键，CS2配置格式为 KP_1, KP_2 等
        if (e.code.startsWith('Numpad')) {
            const numpadKey = e.code.replace('Numpad', 'kp_');
            key += numpadKey.toUpperCase();
        } else {
            key += e.key.toUpperCase();
        }
        capturedKey.value = key;
        saveResetKeyAndCloseFn();
    }
};

// 处理重置时的鼠标按下事件
const handleMouseDownResetFn = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 不记录鼠标左键(0)和右键(2)点击
    if (e.button === 0 || e.button === 2) {
        return;
    }

    let key = '';
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.shiftKey) key += 'Shift+';
    if (e.altKey) key += 'Alt+';

    switch (e.button) {
        case 1:
            key += 'MOUSE3';
            break;
        case 3:
            key += 'MOUSE4';
            break;
        case 4:
            key += 'MOUSE5';
            break;
        default:
            return;
    }

    capturedKey.value = key;
    saveResetKeyAndCloseFn();
};

// 保存重置的按键并关闭弹窗
const saveResetKeyAndCloseFn = async () => {
    if (currentResetItem.value && capturedKey.value) {
        // 检查按键是否已被其他配置使用
        const keyExistsIndex = applyKeyBindItems.value.findIndex(
            item => item.key === capturedKey.value && item.systemBindCfgVO?.systemName !== currentResetItem.value?.systemBindCfgVO?.systemName
        );
        if (keyExistsIndex !== -1) {
            const existingItem = applyKeyBindItems.value[keyExistsIndex];
            window.$message?.warning($t('keyBind.messages.keyInUse', { key: capturedKey.value, name: existingItem.systemBindCfgVO?.systemName || '' }));
            return;
        }

        // 生成新的配置
        const newRenderKeyConfigJson = replaceKeyPlaceholders(currentResetItem.value.keyConfigJson, capturedKey.value);

        // 更新绑定项
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
                // 先移除旧的配置
                if (oldItem.renderKeyConfigJson) {
                    await window.ipcRenderer.invoke('remove-autoexec-cfg-content', paths.csgo2Path, oldItem.renderKeyConfigJson);
                }
                // 写入新的配置
                const header = buildLogHeader(currentResetItem.value.systemBindCfgVO?.systemName || '', capturedKey.value);
                const cfgContent = header + '\n' + newRenderKeyConfigJson;
                const { success } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, cfgContent);
                if (success) {
                    window.$message?.success($t('keyBind.messages.resetSuccess'));
                } else {
                    window.$message?.error($t('keyBind.messages.writeCfgFailed'));
                }
            } else {
                window.$message?.error('未配置 CS2 路径，请在设置中配置');
            }
        }
    }
    closeResetKeyCaptureFn();
};

/**
 * 处理鼠标滚轮事件（带节流）
 */
const handleWheelFn = (e: WheelEvent) => {
    e.preventDefault();

    // 节流检查
    if (wheelThrottleTimer.value) {
        return;
    }

    if (e.deltaY < 0) {
        capturedKey.value = 'MWHEELUP';
    } else if (e.deltaY > 0) {
        capturedKey.value = 'MWHEELDOWN';
    }

    // 设置节流定时器
    wheelThrottleTimer.value = window.setTimeout(() => {
        wheelThrottleTimer.value = null;
    }, WHEEL_THROTTLE_MS);

    saveAndCloseCaptureFn();
};

/**
 * 保存按键并关闭弹窗
 */
const saveAndCloseCaptureFn = () => {
    if (currentSelectedItem.value && capturedKey.value) {
        //保存系统配置
        if (selectedSystemConfig.value === '武器类' || selectedSystemConfig.value === '道具类' || selectedSystemConfig.value === 'ZE常用') {
            // 检查是否已存在相同配置项的绑定
            const existingIndex = applyKeyBindItems.value.findIndex(
                item => item.systemBindCfgVO?.systemName === currentSelectedItem.value?.systemName
            );
            if (existingIndex != -1) return;

            // 检查按键是否已被其他配置使用
            const keyExistsIndex = applyKeyBindItems.value.findIndex(
                item => item.key === capturedKey.value
            );
            if (keyExistsIndex !== -1) {
                const existingItem = applyKeyBindItems.value[keyExistsIndex];
                window.$message?.warning($t('keyBind.messages.keyInUse', { key: capturedKey.value, name: existingItem.systemBindCfgVO?.systemName || '' }));
                return;
            }

            const renderKeyConfigJson = replaceKeyPlaceholders(currentSelectedItem.value.keyConfigJson, capturedKey.value);

            const newBindItem: Api.Game.ApplyKeyBindItem = {
                key: capturedKey.value,
                keyConfigJson: currentSelectedItem.value.keyConfigJson,
                renderKeyConfigJson: renderKeyConfigJson,
                configType: 'system',
                systemBindCfgVO: {
                    systemName: currentSelectedItem.value.systemName,
                    systemIcon: currentSelectedItem.value.systemIcon,
                    keyConfigJson: currentSelectedItem.value.keyConfigJson
                }
            };

            // 使用展开运算符创建新数组，触发计算属性 setter
            applyKeyBindItems.value = [...applyKeyBindItems.value, newBindItem];

            // 构建cfg内容：头部 + 渲染后的配置
            const header = buildLogHeader(currentSelectedItem.value.configDesc || currentSelectedItem.value.systemName, capturedKey.value);
            const cfgContent = header + '\n' + renderKeyConfigJson;
            applyKeyBindsFn(cfgContent);
        }
    } else {
        //使用自定义配置
        applyKeyBindsFn("");
    }
    closeKeyCaptureFn();
};

// ============================================================================
// 配置应用
// ============================================================================

/**
 * 写入Cfg文件
 */
const applyKeyBindsFn = async (content: string) => {
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

/**
 * 保存本地配置
 */
const saveLocalAutoexecCfg = async () => {
    const paths = await window.ipcRenderer.invoke('auto-detect-paths');
    if (!paths.csgo2Path) {
        window.$message?.error($t('keyBind.messages.csgoPathNotFound'));
        return;
    }
    // 传入 true 表示覆盖整个文件
    const { success } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, localAutoexecCfg.value, true);
    if (success) {
        window.$message?.success($t('keyBind.messages.saveSuccess'));
    } else {
        window.$message?.error($t('keyBind.messages.saveFailed'));
    }
};



// ============================================================================
// 数据获取
// ============================================================================

/**
 * 获取公共配置库
 */
const fetchConfigLibrary = async () => {
    const { error, data } = await fetchGetAllSharedKeyBinds();
    if (!error) {
        configLibraryItems.value = data || [];
    }
};

/**
 * 获取个人配置库
 */
const fetchLocalConfigLibrary = async () => {
    const { error, data } = await fetchGetMyKeyBinds();
    if (!error) {
        localConfigItems.value = data || [];
    }
};

/**
 * 返回工具箱
 */
const handleBackFn = () => emit('back');

// ============================================================================
// 监听与生命周期
// ============================================================================

/**
 * 组件挂载时初始化
 */
onMounted(() => {
    Promise.all([fetchConfigLibrary(), fetchLocalConfigLibrary()]);
});
</script>

<template>
    <div class="key-bind-container" :class="{ 'light-mode': !isDarkMode }">
        <div class="header-section">
            <div class="title-section">
                <SvgIcon icon="material-symbols:keyboard-alt-outline" />
                <h1 class="page-title">{{ $t('keyBind.title') }}</h1>
            </div>
            <div class="back-btn" @click="handleBackFn">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>{{ $t('keyBind.back') }}</span>
            </div>
        </div>

        <div class="main-content">
            <NCard class="left-panel" content-class="h-full overflow-auto" content-style="padding:10px;">
                <div class="flex flex-col gap-10px">
                    <div class="flex justify-center gap-5px">
                        <NButton :type="activeTab === 'library' ? 'primary' : 'default'"
                            @click="activeTab = 'library'; handleTabChangeFn('library')">
                            <span class="text-12px">{{ $t('keyBind.tabs.library') }}</span>
                        </NButton>
                        <NButton :type="activeTab === 'user' ? 'primary' : 'default'"
                            @click="activeTab = 'user'; handleTabChangeFn('user')">
                            <span class="text-12px">{{ $t('keyBind.tabs.user') }}</span>
                        </NButton>
                        <NButton :type="activeTab === 'local' ? 'primary' : 'default'"
                            @click="activeTab = 'local'; handleTabChangeFn('local')">
                            <span class="text-12px">{{ $t('keyBind.tabs.local') }}</span>
                        </NButton>
                    </div>
                    <div v-show="activeTab === 'library'">
                        <NGrid :y-gap="10" :cols="1">
                            <NGridItem v-for="systemConfig in systemLibraryItems" :key="systemConfig.systemName">
                                <NCard class="config-card" content-style="padding:10px;"
                                    :class="{ 'selected': selectedSystemConfig === systemConfig.systemName }"
                                    @click="selectedSystemConfig = systemConfig.systemName">
                                    <div class="config-card-content">
                                        <div class="w-64px h-64px config-card-content-img">
                                            <img class="w-48px h-48px" :src="systemConfig.systemIcon">
                                        </div>
                                        <div class="flex-1">
                                            <div class="font-size-16px font-bold">{{ systemConfig.systemName }}
                                            </div>
                                            <div class="font-size-12px">{{ systemConfig.configDesc }}</div>
                                        </div>
                                    </div>
                                </NCard>
                            </NGridItem>
                        </NGrid>
                    </div>

                    <div v-show="activeTab === 'user'">
                        <NGrid x-gap="10" y-gap="10" :cols="1">
                            <NGridItem v-for="item in applyKeyBindItems" :key="item.systemBindCfgVO?.systemName"
                                @click="handleUserConfigClickFn(item.systemBindCfgVO?.systemName)">
                                <NCard class="applied-binding-item rounded-10px cursor-pointer"
                                    content-style="padding:10px">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-10px">
                                            <img :src="item.systemBindCfgVO?.systemIcon"
                                                class="w-48px h-48px object-contain" />
                                            <div class="flex flex-col">
                                                <span class="text-14px font-bold">{{ item.systemBindCfgVO?.systemName
                                                }}</span>
                                                <span class="text-12px text-gray-500">{{ $t('keyBind.bindingKey') }}: {{
                                                    item.key }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </NCard>
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
                    <NGridItem v-for="item in currentCfgOptions" :key="item.systemName"
                        @click="!isItemApplied(item.systemName) && openKeyCaptureFn(item)">
                        <NCard class="rounded-10px"
                            :class="{ 'applied': isItemApplied(item.systemName), 'selected': selectedSystemConfig === item.systemName }"
                            content-style="padding:10px"
                            :content-class="isItemApplied(item.systemName) ? 'flex flex-col items-center justify-center' : 'cursor-pointer flex flex-col items-center justify-center'">
                            <img :src="item.systemIcon" class="w-48px h-48px object-contain mb-8px" />
                            <span class="text-12px">{{ item.systemName }}</span>
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
                            <div class="config-code-block" :class="{ 'dark': isDarkMode, 'light': !isDarkMode }">
                                <pre><code>{{ item.systemBindCfgVO?.keyConfigJson }}</code></pre>
                            </div>
                        </NCollapseItem>
                    </NCollapse>
                </div>
                <div v-show="activeTab === 'local'" class="h-full">
                    <MdEditor v-model="localAutoexecCfg" :theme="isDarkMode ? 'dark' : 'light'" :preview="false"
                        :toolbars="['revoke', 'next', 'save']" @onSave="saveLocalAutoexecCfg" />
                </div>
            </NCard>
        </div>

        <NModal v-model:show="showKeyCaptureModal" :bordered="true" preset="card"
            class="w-400px rounded-20px key-capture-wrapper" :class="{ 'light-mode': !isDarkMode }" :closable="false"
            size="small">
            <template #header>
                <div class="flex items-center font-size-18px">
                    <div class="font-size-16px">{{ $t('keyBind.tutorial.title') }}</div>
                </div>
            </template>
            <div class="key-capture-modal-new" @wheel="handleWheelFn" @mousedown="handleMouseDownFn">
                <!-- 顶部装饰区域 -->
                <div class="capture-header">
                    <div class="character-image">
                        <img src="@/assets/imgs/menu/942302.png" alt="character" />
                    </div>
                    <div class="header-glow"></div>
                </div>
                <!-- 按键显示区域 -->
                <div class="capture-display-area" :class="{ 'has-key': capturedKey }">
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
                <div class="capture-tips">
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
        </NModal>
    </div>
</template>

<style scoped lang="scss">
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
            color: #667eea;
            background: rgba(102, 126, 234, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;

            &:hover {
                color: #667eea;
                background: rgba(102, 126, 234, 0.3);
            }

            .back-icon {
                font-size: 20px;
            }
        }


        .page-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
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
            padding: 16px;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;

            .config-card {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 84px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;

                .config-card-content {
                    display: flex;
                    align-items: center;

                    .config-card-content-img {
                        padding: 8px;
                        border-radius: 6px;
                        margin-right: 12px;
                    }
                }

                &:hover {
                    border-color: #667eea;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                    transform: translateY(-1px);
                }

                &.selected {
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
                    background: rgba(102, 126, 234, 0.05);
                }
            }

            .applied-binding-item {
                transition: all 0.2s ease;
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
                    border: 2px solid #667eea;
                    box-shadow: 0 0 10px rgba(102, 126, 234, 0.4);
                }

                &.selected {
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
                    background: rgba(102, 126, 234, 0.05);
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

    &.light-mode {
        :deep(.n-card) {
            background: linear-gradient(135deg, #f8f9fc 0%, #eef0f5 100%);
        }

        .key-capture-modal-new {
            color: #333;

            .capture-header {
                .character-image {
                    border-color: rgba(102, 126, 234, 0.6);
                    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
                }

                .header-glow {
                    background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
                }
            }

            .capture-display-area {
                .key-display-box {
                    background: rgba(102, 126, 234, 0.05);
                    border-color: rgba(102, 126, 234, 0.3);

                    .captured-key-text {
                        color: #667eea;
                        text-shadow: none;
                    }

                    .waiting-text .dots span {
                        background: #667eea;
                    }
                }

                &.has-key .key-display-box {
                    background: rgba(102, 126, 234, 0.1);
                    border-color: #667eea;
                    box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
                }
            }

            .capture-tips {
                .tip-item {
                    background: rgba(102, 126, 234, 0.05);
                    border-color: rgba(102, 126, 234, 0.15);

                    .tip-icon {
                        color: #667eea;
                    }

                    .tip-text {
                        color: rgba(0, 0, 0, 0.6);
                    }
                }
            }
        }
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
            border: 3px solid rgba(102, 126, 234, 0.5);
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);

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
            background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
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
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-radius: 12px;
            padding: 0 20px;
            transition: all 0.3s ease;

            .captured-key-text {
                font-size: 24px;
                font-weight: 700;
                color: #667eea;
                text-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
            }

            .waiting-text {
                .dots {
                    display: flex;
                    gap: 6px;

                    span {
                        width: 10px;
                        height: 10px;
                        background: #667eea;
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
                background: rgba(102, 126, 234, 0.1);
                border-color: #667eea;
                box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
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
                background: rgba(102, 126, 234, 0.1);
                border-color: rgba(102, 126, 234, 0.3);
            }

            .tip-icon {
                font-size: 22px;
                color: #667eea;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;

            &:hover:not(:disabled) {
                background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
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
    border-radius: 8px;
    padding: 12px 16px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    max-height: 300px;
    overflow: auto;
    border: 1px solid;

    pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    code {
        font-family: inherit;
        white-space: pre-wrap;
    }

    // 黑夜主题
    &.dark {
        background: #18181c;
        border-color: #333;
        color: #e0e0e0;

        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        &::-webkit-scrollbar-track {
            background: #18181c;
        }

        &::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
        }

        &::-webkit-scrollbar-thumb:hover {
            background: #444;
        }
    }

    // 白天主题
    &.light {
        background: #f8f9fa;
        border-color: #e2e8f0;
        color: #333;

        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        &::-webkit-scrollbar-track {
            background: #f8f9fa;
        }

        &::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }

        &::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
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
