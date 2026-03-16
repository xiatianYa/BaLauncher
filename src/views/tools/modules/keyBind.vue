<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import {
    NButton,
    NCard,
    NTabPane,
    NTabs,
    NList,
    NListItem,
    NInput,
    NModal,
    NForm,
    NFormItem,
    NInputGroup,
    NGrid,
    NGridItem
} from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import { EditorRuntimeOptions, MonacoEditor } from '@lascyb/monaco-editor-vue3';
import * as monaco from 'monaco-editor';
import {
    fetchAddKeyBind,
    fetchDeleteKeyBind,
    fetchGetAllSharedKeyBinds,
    fetchGetMyKeyBinds,
    fetchIncrementUseCount,
    fetchUpdateKeyBind
} from '@/service/api/game/keyBind';
import dayjs from 'dayjs';

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

/** UI 状态 */
const activeTab = ref<'library' | 'local' | 'user'>('library');
const showPreview = ref(false);
const showKeyCaptureModal = ref(false);
const showNewConfigModal = ref(false);

/** 编辑器相关 */
const editorRef = ref();
const monacoEditorInstance = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
const editorValue = ref('');

/** 按键绑定相关 */
type LocalKeyBindItem = { id: number; key: string; description: string; };
const keyBindItems = ref<LocalKeyBindItem[]>([]);
const currentEditItemId = ref<number | null>(null);
const capturedKey = ref('');

/** 配置库相关 */
const configLibraryItems = ref<Api.Game.KeyBindList>([]);
const localConfigItems = ref<Api.Game.KeyBindList>([]);
const selectedConfig = ref<Api.Game.KeyBindVO | null>(null);
const originalConfigContent = ref('');

/** 新建配置 */
const newConfig = ref<Api.Game.KeyBindAddParams>({
    configName: '',
    configDesc: '',
    keyConfigJson: '',
    shareStatus: 0
});

/** 编辑器选项 */
const editorOptions = ref<EditorRuntimeOptions>({
    theme: isDarkMode.value ? 'vs-dark' : 'vs',
    fontSize: 12,
    lineNumbers: 'off',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    readOnly: false,
    folding: false,
    cursorStyle: 'line',
    quickSuggestions: { other: true, comments: true, strings: true },
    overviewRulerBorder: false,
    renderLineHighlight: 'none',
    domReadOnly: false
});

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 构建配置写入日志头部
 */
const buildLogHeader = (): string => {
    const writeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    return `// ========================================
// BaLauncher 按键绑定配置
// 写入时间: ${writeTime}
// ========================================

`;
};

/**
 * 替换编辑器中的按键占位符
 */
const replaceKeyPlaceholders = (content: string): string => {
    let result = content;
    const sortedItems = [...keyBindItems.value].sort((a, b) => b.id - a.id);

    sortedItems.forEach(item => {
        if (item.key) {
            const regex = new RegExp(`\\[按键(${item.id}):[^\\]]+\\]`, 'g');
            result = result.replace(regex, item.key);
        }
    });

    return result;
};

// ============================================================================
// 配置管理
// ============================================================================

/**
 * 打开新建配置弹窗
 */
const openNewConfigModalFn = () => {
    newConfig.value = { configName: '', configDesc: '', keyConfigJson: '', shareStatus: 0 };
    showNewConfigModal.value = true;
};

/**
 * 关闭新建配置弹窗
 */
const closeNewConfigModalFn = () => {
    showNewConfigModal.value = false;
    newConfig.value = { configName: '', configDesc: '', keyConfigJson: '', shareStatus: 0 };
};

/**
 * 创建新配置
 */
const createNewConfigFn = async () => {
    if (!newConfig.value.configName.trim()) {
        window.$message?.warning('请输入配置名称');
        return;
    }

    newConfig.value.keyConfigJson = editorValue.value;
    const { error } = await fetchAddKeyBind(newConfig.value);

    if (!error) {
        window.$message?.success('创建成功');
        await Promise.all([fetchLocalConfigLibrary(), fetchConfigLibrary()]);
    }

    closeNewConfigModalFn();
};

/**
 * 切换标签页
 */
const handleTabChangeFn = async (value: 'library' | 'local' | 'user') => {
    activeTab.value = value;
    selectedConfig.value = null;
    showPreview.value = false;
    editorValue.value = '';
    keyBindItems.value = [];
    originalConfigContent.value = '';

    if (value === 'local') {
        try {
            const paths = await window.ipcRenderer.invoke('auto-detect-paths');
            if (paths.csgo2Path) {
                const result = await window.ipcRenderer.invoke('read-autoexec-cfg', paths.csgo2Path);
                if (result.success) {
                    editorValue.value = result.content;
                    showPreview.value = true;
                    selectedConfig.value = {
                        id: 0,
                        nickName: '',
                        avatar: '',
                        configName: '',
                        configDesc: '',
                        keyConfigJson: '',
                        shareStatus: 0,
                        shareCount: 0,
                        createBy: '',
                        createTime: '',
                        updateBy: '',
                        updateTime: '',
                        status: null
                    };
                }
            }
        } catch {
            // 静默处理错误
        }
    }
};

/**
 * 选择配置
 */
const handleConfigSelectFn = (config: Api.Game.KeyBindVO) => {
    selectedConfig.value = config;
    editorValue.value = config.keyConfigJson || '';
    showPreview.value = false;
    keyBindItems.value = [];
    nextTick(() => parseEditorValueFn());
};

/**
 * 删除配置
 */
const handleDeleteFn = (item: Api.Game.KeyBindVO) => {
    window.$dialog?.warning({
        title: '确认删除',
        content: `确定删除 ${item.configName} 吗？`,
        positiveText: '确认',
        negativeText: '取消',
        onPositiveClick: async () => {
            if (activeTab.value === 'library') {
                window.$message?.warning('公共配置库中的配置不能删除');
                return;
            }

            const { error } = await fetchDeleteKeyBind(item.id);
            if (!error) {
                window.$message?.success('删除成功');
                selectedConfig.value = null;
                editorValue.value = '';
                keyBindItems.value = [];
                showPreview.value = false;
                await fetchLocalConfigLibrary();
            }
        }
    });
};

/**
 * 分享配置
 */
const handleShareFn = async () => {
    if (!selectedConfig.value) {
        window.$message?.warning('请先选择配置');
        return;
    }

    if (keyBindItems.value.length === 0) {
        window.$message?.warning('请必须编写一个[按键序号:按键描述]绑定按键');
        return;
    }

    const { error } = await fetchUpdateKeyBind({
        id: selectedConfig.value.id,
        shareStatus: 1
    });

    if (!error) {
        selectedConfig.value.shareStatus = 1;
        window.$message?.success('分享成功');
        await Promise.all([fetchConfigLibrary(), fetchLocalConfigLibrary()]);
    }
};

/**
 * 保存配置
 */
const updateConfigFn = async () => {
    if (!selectedConfig.value) {
        window.$message?.warning('请选择要保存的配置');
        return;
    }

    const { error } = await fetchUpdateKeyBind({
        id: selectedConfig.value.id,
        keyConfigJson: getReplacedConfigFn()
    });

    if (!error) {
        window.$message?.success('保存成功');
        await Promise.all([fetchLocalConfigLibrary(), fetchConfigLibrary()]);
    }
};

// ============================================================================
// 编辑器管理
// ============================================================================

/**
 * 编辑器挂载回调
 */
const handleEditorMountFn = (editor: monaco.editor.IStandaloneCodeEditor) => {
    monacoEditorInstance.value = editor;
    nextTick(() => editor.layout());
};

/**
 * 编辑器内容变更回调
 */
const handleEditorChangeFn = (value: string) => {
    editorValue.value = value;
    parseEditorValueFn();
};

/**
 * 解析编辑器内容，提取按键绑定项
 */
const parseEditorValueFn = () => {
    const content = editorValue.value;
    const keyPattern = /\[(?:按键)?(\d+)(?::([^\]]+))?\]/g;
    const matches = [...content.matchAll(keyPattern)];

    const newKeyBindItems: LocalKeyBindItem[] = [];
    const usedIds = new Set<number>();

    matches.forEach((match) => {
        const keyNum = parseInt(match[1]);
        const description = match[2] || '';
        if (!usedIds.has(keyNum)) {
            usedIds.add(keyNum);
            newKeyBindItems.push({ id: keyNum, key: '', description });
        }
    });

    newKeyBindItems.sort((a, b) => a.id - b.id);

    const existingKeys = new Map(
        keyBindItems.value.map(item => [item.id, { key: item.key, description: item.description }])
    );

    newKeyBindItems.forEach(item => {
        const existing = existingKeys.get(item.id);
        if (existing) {
            item.key = existing.key;
            if (!item.description && existing.description) {
                item.description = existing.description;
            }
        }
    });

    keyBindItems.value = newKeyBindItems;
};

/**
 * 切换预览/编辑状态
 */
const handlePreviewToggleFn = () => {
    showPreview.value = !showPreview.value;
};

// ============================================================================
// 按键捕获
// ============================================================================

/**
 * 处理按键按下事件
 */
const handleKeyDownFn = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let key = '';
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.shiftKey) key += 'Shift+';
    if (e.altKey) key += 'Alt+';

    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        key += e.key.toUpperCase();
        capturedKey.value = key;

        if (currentEditItemId.value !== null) {
            const item = keyBindItems.value.find(i => i.id === currentEditItemId.value);
            if (item) {
                item.key = capturedKey.value;
            }
        }

        closeKeyCaptureFn();
    }
};

/**
 * 打开按键捕获弹窗
 */
const openKeyCaptureFn = (item: Api.Game.LocalKeyBindItem) => {
    currentEditItemId.value = item.id;
    capturedKey.value = item.key;
    showKeyCaptureModal.value = true;
    window.addEventListener('keydown', handleKeyDownFn);
};

/**
 * 关闭按键捕获弹窗
 */
const closeKeyCaptureFn = () => {
    showKeyCaptureModal.value = false;
    currentEditItemId.value = null;
    window.removeEventListener('keydown', handleKeyDownFn);
};

// ============================================================================
// 配置应用
// ============================================================================

/**
 * 生成替换后的最终配置
 */
const getReplacedConfigFn = (): string => {
    if (activeTab.value === 'local') {
        return editorValue.value;
    }

    const content = replaceKeyPlaceholders(editorValue.value);
    const logHeader = buildLogHeader();

    return originalConfigContent.value
        ? originalConfigContent.value + '\n' + logHeader + content
        : logHeader + content;
};

/**
 * 应用按键绑定配置
 */
const applyKeyBindsFn = async () => {
    const emptyKeyItem = keyBindItems.value.find(item => !item.key || item.key.trim() === '');
    if (emptyKeyItem) {
        const label = emptyKeyItem.description || `按键${emptyKeyItem.id}`;
        window.$message?.warning(`请先设置 [${label}] 的按键`);
        return;
    }

    try {
        const paths = await window.ipcRenderer.invoke('auto-detect-paths');
        if (!paths.csgo2Path) {
            window.$message?.error('未找到 CS2 路径，请先在设置中配置');
            return;
        }

        originalConfigContent.value = '';
        if (activeTab.value !== 'local') {
            const readResult = await window.ipcRenderer.invoke('read-autoexec-cfg', paths.csgo2Path);
            if (readResult.success) {
                originalConfigContent.value = readResult.content;
            }
        }

        const content = getReplacedConfigFn();
        const result = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, content);

        if (result.success) {
            if (activeTab.value === 'library' && selectedConfig.value) {
                await fetchIncrementUseCount(selectedConfig.value.id);
                await Promise.all([fetchConfigLibrary(), fetchLocalConfigLibrary()]);
            }
            window.$message?.success('保存成功');
        } else {
            window.$message?.error('保存失败');
        }
    } catch {
        window.$message?.error('配置写入失败');
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
 * 监听编辑器内容变化，同步到编辑器实例
 */
watch(editorValue, (newValue) => {
    if (monacoEditorInstance.value) {
        const currentValue = monacoEditorInstance.value.getValue();
        if (currentValue !== newValue) {
            monacoEditorInstance.value.setValue(newValue);
        }
    }
});

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
                <SvgIcon icon="material-symbols:keyboard-alt-outline" class="title-icon" />
                <h1 class="page-title">按键绑定配置</h1>
            </div>
            <div class="back-btn" @click="handleBackFn">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>返回工具箱</span>
            </div>
        </div>

        <div class="main-content">
            <div class="left-panel">
                <NCard class="panel-card" content-style="padding: 0;" content-class="overflow-y-auto" :bordered="false">
                    <NTabs v-model:value="activeTab" type="line" @update:value="handleTabChangeFn">
                        <NTabPane name="library" tab="配置库">
                            <div class="config-list">
                                <NList>
                                    <NListItem v-for="item in configLibraryItems" :key="item.id"
                                        :class="{ 'config-item': true, 'active': selectedConfig?.id === item.id }"
                                        @click="handleConfigSelectFn(item)">
                                        <div class="config-item-content">
                                            <div class="config-avatar">
                                                <img :src="item.avatar" :alt="item.nickName" />
                                            </div>
                                            <div class="config-info">
                                                <div class="config-name">{{ item.configName }}</div>
                                                <div class="config-meta-row">
                                                    <div class="config-meta-item">
                                                        <SvgIcon icon="material-symbols:person" class="meta-icon" />
                                                        <span>{{ item.nickName }}</span>
                                                    </div>
                                                    <div class="config-meta-item">
                                                        <SvgIcon icon="material-symbols:download" class="meta-icon" />
                                                        <span>{{ item.shareCount }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </NListItem>
                                </NList>
                            </div>
                        </NTabPane>

                        <NTabPane name="user" tab="个人配置">
                            <div class="config-list">
                                <div class="add-config-btn">
                                    <NButton type="primary" ghost block @click="openNewConfigModalFn">
                                        <template #icon>
                                            <SvgIcon icon="material-symbols:add" />
                                        </template>
                                        新建配置
                                    </NButton>
                                </div>
                                <NList>
                                    <NListItem v-for="item in localConfigItems" :key="item.id"
                                        :class="{ 'config-item': true, 'active': selectedConfig?.id === item.id }"
                                        @click="handleConfigSelectFn(item)">
                                        <div class="config-item-content">
                                            <div class="config-avatar">
                                                <img :src="item.avatar" :alt="item.nickName" />
                                            </div>
                                            <div class="config-info">
                                                <div class="config-name">{{ item.configName }}</div>
                                                <div class="config-meta-row">
                                                    <div class="config-meta-item">
                                                        <SvgIcon icon="material-symbols:schedule" class="meta-icon" />
                                                        <span>{{ dayjs(item.updateTime).format('MM-DD HH:mm:ss')
                                                            }}</span>
                                                    </div>
                                                    <div class="config-meta-item">
                                                        <SvgIcon icon="material-symbols:download" class="meta-icon" />
                                                        <span>{{ item.shareCount }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="config-actions" @click.stop="handleDeleteFn(item)">
                                                <SvgIcon icon="material-symbols:delete-outline" class="more-icon" />
                                            </div>
                                        </div>
                                    </NListItem>
                                </NList>
                            </div>
                        </NTabPane>

                        <NTabPane name="local" tab="本地预览" />
                    </NTabs>
                </NCard>
            </div>

            <div class="right-panel">
                <NCard class="panel-card editor-card" content-style="padding: 20px;" content-class="overflow-y-auto"
                    :bordered="false">
                    <div class="editor-header">
                        <div class="editor-title font-size-20px">
                            <SvgIcon icon="material-symbols:edit-square-outline" class="editor-icon" />
                            <span class="font-size-16px">配置编辑器</span>
                        </div>

                        <div class="flex" v-if="selectedConfig">
                            <NButton class="mr-5px" size="small" ghost @click="handlePreviewToggleFn"
                                v-show="showPreview">
                                <template #icon>
                                    <SvgIcon icon="material-symbols:visibility" />
                                </template>
                                预览
                            </NButton>

                            <NButton class="mr-5px" size="small" ghost @click="handlePreviewToggleFn"
                                v-show="!showPreview">
                                <template #icon>
                                    <SvgIcon icon="material-symbols:edit-square-outline" />
                                </template>
                                编辑
                            </NButton>

                            <NButton class="mr-5px" size="small" ghost @click="handleShareFn"
                                v-show="!showPreview && selectedConfig && activeTab === 'user' && selectedConfig.shareStatus === 0">
                                <template #icon>
                                    <SvgIcon icon="material-symbols:share" />
                                </template>
                                分享
                            </NButton>

                            <NButton class="mr-5px" type="info" size="small" ghost @click="updateConfigFn"
                                v-show="activeTab === 'user' && selectedConfig">
                                <template #icon>
                                    <SvgIcon icon="material-symbols:save" />
                                </template>
                                保存
                            </NButton>

                            <NButton v-show="selectedConfig || activeTab === 'local'" class="mr-5px" type="primary"
                                size="small" ghost @click="applyKeyBindsFn">
                                <template #icon>
                                    <SvgIcon icon="material-symbols:check-circle-outline" />
                                </template>
                                应用
                            </NButton>
                        </div>
                    </div>

                    <div class="editor-content">
                        <div class="editor-placeholder" v-if="!selectedConfig && activeTab !== 'local'">
                            <SvgIcon icon="material-symbols:arrow-downward" class="placeholder-icon" />
                            <p>请从左侧选择一个配置进行编辑</p>
                        </div>

                        <div class="editor-active" v-else>
                            <div v-show="!showPreview && activeTab !== 'local'" class="key-bind-section">
                                <NGrid x-gap="12" y-gap="12" :cols="3">
                                    <NGridItem v-for="item in keyBindItems" :key="item.id">
                                        <div class="key-bind-card">
                                            <div class="key-bind-card-header">
                                                <div class="key-label">
                                                    <SvgIcon icon="material-symbols:keyboard-alt-outline"
                                                        class="key-label-icon" />
                                                    <span>{{ item.description || `按键${item.id}` }}</span>
                                                </div>
                                            </div>
                                            <div class="key-bind-card-body ">
                                                <NButton ghost type="info" class="rounded-5px"
                                                    @click="openKeyCaptureFn(item)">
                                                    <span>{{ item.key || '点击设置' }}</span>
                                                </NButton>
                                            </div>
                                        </div>
                                    </NGridItem>
                                </NGrid>
                            </div>
                            <div v-if="showPreview" class="monaco-editor">
                                <MonacoEditor ref="editorRef" style="height: 100%; width: 100%;"
                                    :options="editorOptions" :model-value="editorValue" @mount="handleEditorMountFn"
                                    @update:model-value="handleEditorChangeFn" />
                            </div>
                        </div>
                    </div>
                </NCard>
            </div>
        </div>

        <NModal v-model:show="showKeyCaptureModal" preset="card" class="w-420px rounded-20px" :bordered="false"
            :closable="false" size="small">
            <div class="key-capture-modal">
                <div class="capture-instruction">请按下要设置的按键</div>
                <div class="capture-display font-size-24px" :class="{ 'capturing': showKeyCaptureModal }">
                    <SvgIcon icon="material-symbols:keyboard-alt-outline" class="capture-icon" />
                    <span class="capture-key font-size-12px">{{ capturedKey || '等待按键...' }}</span>
                </div>
                <div class="capture-hint">支持组合键：Ctrl+、Shift+、Alt+</div>
            </div>
        </NModal>

        <NModal v-model:show="showNewConfigModal" preset="card" class="w-460px rounded-10px" :bordered="false"
            :closable="false" size="small">
            <template #header>
                <div class="flex items-center font-size-18px">
                    <svg-icon icon="material-symbols:add" class="mr-5px" />
                    <div class="font-size-16px">新建配置</div>
                </div>
            </template>
            <NForm>
                <NFormItem label="配置名称" required>
                    <NInput v-model:value="newConfig.configName" placeholder="请输入配置名称" />
                </NFormItem>
                <NFormItem label="配置描述">
                    <NInput v-model:value="newConfig.configDesc" type="textarea" placeholder="请输入配置描述（可选）" :rows="3" />
                </NFormItem>
            </NForm>
            <template #footer>
                <NButton class="mr-20px rounded-10px" ghost @click="closeNewConfigModalFn">取消</NButton>
                <NButton class="rounded-10px" type="info" @click="createNewConfigFn">创建</NButton>
            </template>
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

    &.light-mode {
        .page-title {
            color: #1a1a1a;
            font-size: 20px;
        }

        .back-btn {
            color: #666;
            background: rgba(0, 0, 0, 0.03);
            border: 1px solid rgba(0, 0, 0, 0.08);

            &:hover {
                color: #667eea;
                background: rgba(102, 126, 234, 0.08);
            }
        }

        .panel-card {
            background: #ffffff;
        }

        .config-item {
            background: rgba(0, 0, 0, 0.02);
            border-color: rgba(0, 0, 0, 0.06);

            &:hover {
                background: rgba(102, 126, 234, 0.05);
            }

            &.active {
                background: rgba(102, 126, 234, 0.1);
                border-color: #667eea;
            }

            .config-name {
                color: #1a1a1a;
            }

            .config-desc {
                color: #666;
            }

            .config-meta {
                color: #888;
            }

            .config-meta-item {
                color: #666;
            }

            .meta-icon {
                color: #999;
            }
        }

        .editor-title {
            span {
                color: #1a1a1a;
            }
        }

        .editor-placeholder {
            font-size: 18px;

            p {
                color: #888;
            }
        }

        .placeholder-icon {
            color: #ccc;
        }

        .key-label {
            color: #1a1a1a;
        }

        .key-btn {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(0, 0, 0, 0.1);
            color: #1a1a1a;

            &:hover {
                background: rgba(102, 126, 234, 0.1);
                border-color: #667eea;
            }
        }

        .key-bind-card {
            background: #ffffff;
            border-color: rgba(0, 0, 0, 0.08);

            &:hover {
                background: #f8f9ff;
                border-color: #667eea;
            }

            &.deleting {
                border-color: #f5576c;
            }
        }

        .key-bind-card-header {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .key-label {
            color: #1a1a1a;
        }

        .key-capture-modal {
            .capture-instruction {
                color: #333;
            }

            .capture-display {
                background: #f5f5f5;
                border-color: rgba(0, 0, 0, 0.1);
            }

            .capture-key {
                color: #1a1a1a;
            }

            .capture-hint {
                color: #888;
            }
        }
    }
}

.header-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
}

.back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 10px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;

    &:hover {
        color: #667eea;
        background: rgba(102, 126, 234, 0.15);
        transform: translateX(-4px);
    }

    .back-icon {
        font-size: 20px;
    }
}

.title-section {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
}

.title-icon {
    font-size: 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.page-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.main-content {
    display: flex;
    flex: 1;
    gap: 16px;
    min-height: 0;
}

.left-panel {
    width: 300px;
    display: flex;
    flex-direction: column;
}

.right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.panel-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    overflow: hidden;

    :deep(.n-tabs) {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    :deep(.n-tabs-nav) {
        padding: 16px 20px 8px;
    }

    :deep(.n-tab-pane) {
        flex: 1;
        overflow: hidden;
        padding: 0 !important;
    }
}

.config-list {
    height: 100%;
    overflow-y: auto;
    padding: 10px;

    :deep(.n-list) {
        padding: 0;
        background: transparent !important;
    }

    :deep(.n-list-item) {
        padding: 0;
        margin-bottom: 10px;
    }

    :deep(.n-list-item__divider) {
        display: none;
    }
}

.config-item {
    border-radius: 12px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
    background: rgba(255, 255, 255, 0.03);

    &:hover {
        background: rgba(102, 126, 234, 0.1);
    }

    &.active {
        background: rgba(102, 126, 234, 0.15);
        border-color: #667eea;
    }
}

.config-item-content {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px;
}

.config-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .n-icon {
        font-size: 24px;
        color: white;
    }
}

.config-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.config-info {
    flex: 1;
    min-width: 0;
}

.config-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
}

.config-name {
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
}

.config-desc {
    font-size: 13px;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.8);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.config-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
}

.config-meta-row {
    display: flex;
    gap: 16px;
    align-items: center;
}

.config-meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
}

.meta-icon {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.5);
}

.favorite-icon {
    font-size: 22px;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        transform: scale(1.2);
    }

    &.active {
        color: #fbbf24;
    }
}

.more-icon {
    font-size: 22px;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        color: rgba(255, 255, 255, 0.7);
    }
}

.add-config-btn {
    padding: 0px 5px 10px 5px;
}

.editor-card {
    display: flex;
    flex-direction: column;
}

.editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.editor-title {
    display: flex;
    align-items: center;
    gap: 10px;

    .editor-icon {
        font-size: 24px;
        color: #667eea;
    }

    span {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
    }
}

.editor-content {
    height: 100%;
    flex: 1;
}

.editor-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    gap: 16px;

    .placeholder-icon {
        font-size: 64px;
        color: rgba(255, 255, 255, 0.15);
        animation: bounce 2s infinite;
    }

    p {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
    }
}

.editor-active {
    width: 100%;
    height: 100%;
}

.key-bind-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.key-bind-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.key-bind-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.3s ease;
    overflow: hidden;

    &:hover {
        background: rgba(102, 126, 234, 0.08);
        border-color: rgba(102, 126, 234, 0.3);
    }

    &.deleting {
        border-color: #f5576c !important;
        animation: deletePulse 0.3s ease-in-out;
    }
}

.key-bind-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.key-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
}

.key-label-icon {
    font-size: 20px;
    color: #667eea;
}

.key-delete {
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 6px;
    border-radius: 8px;

    &:hover {
        background: rgba(245, 87, 108, 0.15);

        .delete-icon {
            color: #f5576c;
            transform: scale(1.1);
        }
    }
}

.key-bind-card-body {
    display: flex;
    justify-content: center;
    padding: 20px;
}

.delete-icon {
    font-size: 22px;
    color: rgba(255, 255, 255, 0.4);
    transition: all 0.3s ease;
}

.monaco-editor {
    width: 100%;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;

    :deep(.custom-monaco-editor) {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
    }

    :deep(.monaco-editor) {
        outline: none !important;
        box-shadow: none !important;
    }

    :deep(.monaco-editor:focus),
    :deep(.monaco-editor:focus-within),
    :deep(.custom-monaco-editor:focus),
    :deep(.custom-monaco-editor:focus-within) {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
    }

    :deep(.monaco-editor *) {
        box-shadow: none !important;
        outline: none !important;
    }
}

.key-capture-modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 20px 0;
}

.capture-instruction {
    font-size: 15px;
    font-weight: 500;
}

.capture-display {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 48px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;

    &.capturing {
        border-color: #667eea;
        animation: pulse 1.5s infinite;
    }
}

.capture-icon {
    font-size: 28px;
    color: #667eea;
}

.capture-key {
    font-size: 20px;
    font-weight: 600;
    min-width: 120px;
    text-align: center;
}

.capture-hint {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.7;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes bounce {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-10px);
    }
}

@keyframes deletePulse {
    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}
</style>
