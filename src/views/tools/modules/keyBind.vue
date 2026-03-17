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
const selectedSystemConfig = ref<string | null>(null);
const showKeyCaptureModal = ref<boolean>(false);
const showNewConfigModal = ref<boolean>(false);
const showTutorialModal = ref<boolean>(false);

/** 编辑器相关 */
const editorRef = ref();
const monacoEditorInstance = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
const editorValue = ref<string>('');

/** 按键绑定相关 */
type LocalKeyBindItem = { id: number; key: string; description: string; };
const keyBindItems = ref<LocalKeyBindItem[]>([]);
const currentEditItemId = ref<number | null>(null);
const capturedKey = ref<string>('');

import Gun from '@/assets/imgs/tool/gun.png';
import Grenade from '@/assets/imgs/tool/grenade.png';
import ZE from '@/assets/imgs/weapon/ZE.png';
import AK47 from '@/assets/imgs/weapon/AK47.png';
import AUG from '@/assets/imgs/weapon/AUG.png';
import CZ75 from '@/assets/imgs/weapon/CZ75.png';
import FAMAS from '@/assets/imgs/weapon/FAMAS.png';
import G3SG1 from '@/assets/imgs/weapon/G3SG1.png';
import M249 from '@/assets/imgs/weapon/M249.png';
import M4A4 from '@/assets/imgs/weapon/M4A4.png';
import MAC10 from '@/assets/imgs/weapon/MAC-10.png';
import MP7 from '@/assets/imgs/weapon/MP7.png';
import P250 from '@/assets/imgs/weapon/P250.png';
import R8 from '@/assets/imgs/weapon/R8.png';
import SCAR20 from '@/assets/imgs/weapon/SCAR-20.png';
import SG553 from '@/assets/imgs/weapon/SG553.png';
import USP from '@/assets/imgs/weapon/USP.png';
import MP5 from '@/assets/imgs/weapon/mp5.png';
import Negev from '@/assets/imgs/weapon/内格夫.png';
import DualBerettas from '@/assets/imgs/weapon/双枪.png';
import Glock from '@/assets/imgs/weapon/格洛克.png';
import Deagle from '@/assets/imgs/weapon/沙鹰.png';
import Scout from '@/assets/imgs/weapon/鸟狙.png';
import MP9 from '@/assets/imgs/weapon/MP9.png';
import AWP from '@/assets/imgs/weapon/AWP.png';



/** 配置库相关 */
const systemLibraryItems = ref<Api.Game.SystemBindVO[]>([
    {
        systemName: '武器类',
        systemIcon: Gun,
        configName: '武器类',
        configDesc: 'CSGO2 通用武器配置cfg',
    },
    {
        systemName: '道具类',
        systemIcon: Grenade,
        configName: '道具类',
        configDesc: 'CSGO2 通用道具配置cfg',
    },
    {
        systemName: 'ZE常用',
        systemIcon: ZE,
        configName: 'ZE常用',
        configDesc: 'CSGO2 通用ZE配置cfg',
    }
]);
//系统武器配置库
const GunLibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>([
    {
        systemName: 'MP9',
        systemIcon: MP9,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'MP7',
        systemIcon: MP7,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'MP5',
        systemIcon: MP5,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'MAC10',
        systemIcon: MAC10,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'M249',
        systemIcon: M249,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '内格夫',
        systemIcon: Negev,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'AK47',
        systemIcon: AK47,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'M4A1',
        systemIcon: M4A4,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '法玛斯',
        systemIcon: FAMAS,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'SG553',
        systemIcon: SG553,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'AUG',
        systemIcon: AUG,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '鸟狙',
        systemIcon: Scout,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'AWP',
        systemIcon: AWP,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'G3SG1',
        systemIcon: G3SG1,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'SCAR20',
        systemIcon: SCAR20,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '沙鹰',
        systemIcon: Deagle,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'R8',
        systemIcon: R8,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '格洛克',
        systemIcon: Glock,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '双枪',
        systemIcon: DualBerettas,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'USP',
        systemIcon: USP,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: '格洛克',
        systemIcon: Glock,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'P250',
        systemIcon: P250,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
    {
        systemName: 'CZ-75',
        systemIcon: CZ75,
        keyConfigJson: '',
        keyReplaceJson: '',
    },
]);
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
    // 主题适配暗黑/亮色模式
    theme: isDarkMode.value ? 'vs-dark' : 'vs',
    // 字体大小调大一点，长时间编辑更舒适
    fontSize: 14,
    // 显示行号（cfg文件调试时行号很重要）
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    // cfg文件通常是单行命令，关闭自动换行
    wordWrap: 'off',
    // CS2 cfg标准缩进为4个空格
    tabSize: 4,
    insertSpaces: true,
    readOnly: false,
    // 开启代码折叠（cfg文件可以按区块折叠）
    folding: true,
    cursorStyle: 'line',
    // 增强自动提示（对cfg命令补全很有用）
    quickSuggestions: { other: true, comments: true, strings: true },
    overviewRulerBorder: false,
    // 高亮当前行（方便定位）
    renderLineHighlight: 'line',
    domReadOnly: false,
    // ========== CS2 CFG 专属配置 ==========
    // 优化行高，提升可读性
    lineHeight: 20,
    // 触发字符时显示建议（如输入bind时）
    suggestOnTriggerCharacters: true,
    // 匹配括号高亮（cfg中的{} []）
    matchBrackets: 'always',
    // 括号对颜色区分
    bracketPairColorization: { enabled: true },
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
 * 打开教程弹窗
 */
const openTutorialModalFn = () => {
    showTutorialModal.value = true;
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

    let cleanOriginalContent = originalConfigContent.value || '';

    if (cleanOriginalContent) {
        const logPattern = /\/\/ ========================================[\s\S]*?\/\/ ========================================\s*/;
        cleanOriginalContent = cleanOriginalContent.replace(logPattern, '').trim();
    }

    return cleanOriginalContent
        ? logHeader + content + '\n\n' + cleanOriginalContent
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
                <SvgIcon icon="material-symbols:keyboard-alt-outline" />
                <h1 class="page-title">按键绑定配置</h1>
                <div class="cursor-pointer font-size-24px" @click="openTutorialModalFn">
                    <SvgIcon icon="line-md:question-circle" />
                </div>
            </div>
            <div class="back-btn" @click="handleBackFn">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>返回工具箱</span>
            </div>
        </div>

        <div class="main-content">
            <NCard class="left-panel" content-style="padding:0px;">
                <div class="flex flex-col gap-10px">
                    <div class="flex justify-center gap-5px">
                        <NButton :type="activeTab === 'library' ? 'primary' : 'default'"
                            @click="activeTab = 'library'; handleTabChangeFn('library')">
                            <span class="text-12px">配置库</span>
                        </NButton>
                        <NButton :type="activeTab === 'user' ? 'primary' : 'default'"
                            @click="activeTab = 'user'; handleTabChangeFn('user')">
                            <span class="text-12px">个人配置</span>
                        </NButton>
                        <NButton :type="activeTab === 'local' ? 'primary' : 'default'"
                            @click="activeTab = 'local'; handleTabChangeFn('local')">
                            <span class="text-12px">本地预览</span>
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
                        <!-- 个人配置内容 -->
                    </div>

                    <div v-show="activeTab === 'local'">
                        <!-- 本地预览内容 -->
                    </div>
                </div>
            </NCard>
            <NCard class="right-panel" content-class="overflow-auto" content-style="padding:10px;">
                <NGrid x-gap="10" y-gap="10" :cols="4">
                    <NGridItem v-for="gun in GunLibaryCfgOption" :key="gun.systemName">
                        <div class="flex flex-col items-center p-10px rounded-8px bg-#f8fafc border-1px border-solid border-#e2e8f0 hover:border-#667eea hover:shadow-md transition-all-200 cursor-pointer">
                            <img :src="gun.systemIcon" class="w-48px h-48px object-contain mb-8px" />
                            <span class="text-12px text-gray-700">{{ gun.systemName }}</span>
                        </div>
                    </NGridItem>
                </NGrid>
            </NCard>
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

        <NModal v-model:show="showTutorialModal" preset="card" class="w-600px rounded-10px" :bordered="false">
            <template #header>
                <div class="flex items-center font-size-18px">
                    <SvgIcon icon="material-symbols:help-outline" class="mr-5px" />
                    <div class="font-size-16px">使用教程</div>
                </div>
            </template>
            <div class="tutorial-content">
                <div class="tutorial-section">
                    <div class="tutorial-title">
                        <SvgIcon icon="material-symbols:edit-square-outline" class="tutorial-icon mr-5px" />
                        1. 编写配置
                    </div>
                    <div class="tutorial-text">在编辑器中编写 CS2 的配置文件，可以使用按键占位符。</div>
                </div>

                <div class="tutorial-section">
                    <div class="tutorial-title">
                        <SvgIcon icon="material-symbols:keyboard-alt-outline" class="tutorial-icon mr-5px" />
                        2. 使用占位符
                    </div>
                    <div class="tutorial-text">在配置中使用格式 <code>[按键序号:描述]</code> 来定义按键绑定，例如：</div>
                    <div class="tutorial-code">bind [按键1:笑声] "say !he"</div>
                </div>

                <div class="tutorial-section">
                    <div class="tutorial-title">
                        <SvgIcon icon="material-symbols:touch-double-outline" class="tutorial-icon mr-5px" />
                        3. 设置按键
                    </div>
                    <div class="tutorial-text">点击下方的按键卡片，按下你想要绑定的按键即可。支持组合键（Ctrl+、Shift+、Alt+）。</div>
                </div>

                <div class="tutorial-section">
                    <div class="tutorial-title">
                        <SvgIcon icon="ic:outline-check-circle" class="tutorial-icon mr-5px" />
                        4. 应用配置
                    </div>
                    <div class="tutorial-text">点击「应用」按钮，配置将写入 autoexec.cfg 文件。日志会自动添加在文件开头。</div>
                </div>
            </div>
            <template #footer>
                <NButton type="info" @click="showTutorialModal = false">我知道了</NButton>
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
        }
    }
}

.tutorial-content {
    .tutorial-section {
        margin-bottom: 20px;

        .tutorial-title {
            display: flex;
            align-items: center;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;

            .tutorial-icon {
                margin-right: 8px;
                font-size: 20px;
            }
        }

        .tutorial-text {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 8px;

            code {
                background: var(--bg-content);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', monospace;
            }
        }

        .tutorial-code {
            background: var(--bg-content);
            padding: 12px;
            border-radius: 6px;
            font-family: 'Consolas', 'Monaco', monospace;
            color: var(--text-secondary);
            margin-top: 8px;
        }
    }
}
</style>
