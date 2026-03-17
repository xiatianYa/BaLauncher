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

import Gun from '@/assets/imgs/tool/Gun.png';
import Prop from '@/assets/imgs/tool/Prop.png';
import ZE from '@/assets/imgs/tool/ZE.png';
import Command from '@/assets/imgs/tool/Command.png';
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
import Smoke from '@/assets/imgs/weapon/Smoke.png';
import Fire from '@/assets/imgs/weapon/Fire.png';
import Grenade from '@/assets/imgs/weapon/Grenade.png';
import Flash from '@/assets/imgs/weapon/Flash.png';
import NightVision from '@/assets/imgs/weapon/NightVision.png';
import Needle from '@/assets/imgs/weapon/Needle.png';
import Armor from '@/assets/imgs/weapon/Armor.png';


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
const showTutorialModal = ref<boolean>(false);
const isEditMode = ref<boolean>(false);
const localAutoexecCfg = ref<string>('');

/** 编辑器相关 */
const editorRef = ref();
// 编辑器实例
const monacoEditorInstance = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
// 编辑器值
const editorValue = ref<string>('');

/** 按键绑定相关 */
const capturedKey = ref<string>('');
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
        systemIcon: Prop,
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
        keyConfigJson: 'bind "[按键:购买MP9]" "buy mp9"',
        configDesc: '购买MP9冲锋枪',
    },
    {
        systemName: 'MP7',
        systemIcon: MP7,
        keyConfigJson: 'bind "[按键:购买MP7]" "buy mp7"',
        configDesc: '购买MP7冲锋枪',
    },
    {
        systemName: 'MP5',
        systemIcon: MP5,
        keyConfigJson: 'bind "[按键:购买MP5]" "buy mp5"',
        configDesc: '购买MP5冲锋枪',
    },
    {
        systemName: 'MAC10',
        systemIcon: MAC10,
        keyConfigJson: 'bind "[按键:购买MAC10]" "buy mac10"',
        configDesc: '购买MAC-10冲锋枪',
    },
    {
        systemName: 'M249',
        systemIcon: M249,
        keyConfigJson: 'bind "[按键:购买M249]" "buy m249"',
        configDesc: '购买M249机枪',
    },
    {
        systemName: '内格夫',
        systemIcon: Negev,
        keyConfigJson: 'bind "[按键:购买内格夫]" "buy negev"',
        configDesc: '购买内格夫机枪',
    },
    {
        systemName: 'AK47',
        systemIcon: AK47,
        keyConfigJson: 'bind "[按键:购买AK47]" "buy ak47"',
        configDesc: '购买AK-47步枪',
    },
    {
        systemName: 'M4A1',
        systemIcon: M4A4,
        keyConfigJson: 'bind "[按键:购买M4A4]" "buy m4a4"',
        configDesc: '购买M4A4步枪',
    },
    {
        systemName: '法玛斯',
        systemIcon: FAMAS,
        keyConfigJson: 'bind "[按键:购买法玛斯]" "buy famas"',
        configDesc: '购买法玛斯步枪',
    },
    {
        systemName: 'SG553',
        systemIcon: SG553,
        keyConfigJson: 'bind "[按键:购买SG553]" "buy sg553"',
        configDesc: '购买SG553步枪',
    },
    {
        systemName: 'AUG',
        systemIcon: AUG,
        keyConfigJson: 'bind "[按键:购买AUG]" "buy aug"',
        configDesc: '购买AUG步枪',
    },
    {
        systemName: '鸟狙',
        systemIcon: Scout,
        keyConfigJson: 'bind "[按键:购买鸟狙]" "buy scout"',
        configDesc: '购买SSG08鸟狙',
    },
    {
        systemName: 'AWP',
        systemIcon: AWP,
        keyConfigJson: 'bind "[按键:购买AWP]" "buy awp"',
        configDesc: '购买AWP狙击枪',
    },
    {
        systemName: 'G3SG1',
        systemIcon: G3SG1,
        keyConfigJson: 'bind "[按键:购买G3SG1]" "buy g3sg1"',
        configDesc: '购买G3SG1自动狙击枪',
    },
    {
        systemName: 'SCAR20',
        systemIcon: SCAR20,
        keyConfigJson: 'bind "[按键:购买SCAR20]" "buy scar20"',
        configDesc: '购买SCAR-20自动狙击枪',
    },
    {
        systemName: '沙鹰',
        systemIcon: Deagle,
        keyConfigJson: 'bind "[按键:购买沙鹰]" "buy deagle"',
        configDesc: '购买沙漠之鹰手枪',
    },
    {
        systemName: 'R8',
        systemIcon: R8,
        keyConfigJson: 'bind "[按键:购买R8]" "buy r8"',
        configDesc: '购买R8左轮手枪',
    },
    {
        systemName: '格洛克',
        systemIcon: Glock,
        keyConfigJson: 'bind "[按键:购买格洛克]" "buy glock"',
        configDesc: '购买格洛克手枪',
    },
    {
        systemName: '双枪',
        systemIcon: DualBerettas,
        keyConfigJson: 'bind "[按键:购买双枪]" "buy dualberettas"',
        configDesc: '购买双持贝瑞塔手枪',
    },
    {
        systemName: 'USP',
        systemIcon: USP,
        keyConfigJson: 'bind "[按键:购买USP]" "buy usp"',
        configDesc: '购买USP-S手枪',
    },
    {
        systemName: 'P250',
        systemIcon: P250,
        keyConfigJson: 'bind "[按键:购买P250]" "buy p250"',
        configDesc: '购买P250手枪',
    },
    {
        systemName: 'CZ-75',
        systemIcon: CZ75,
        keyConfigJson: 'bind "[按键:购买CZ-75]" "buy cz75"',
        configDesc: '购买CZ75自动手枪',
    },
]);
//系统道具配置库
const PropLibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>([
    {
        systemName: '烟雾弹',
        systemIcon: Smoke,
        keyConfigJson: 'bind "[按键:购买烟雾弹]" "buy !smokegrenade"',

    },
    {
        systemName: '手雷',
        systemIcon: Grenade,
        keyConfigJson: 'bind [按键:购买手雷] "say !he"',
    },
    {
        systemName: '燃烧瓶',
        systemIcon: Fire,
        keyConfigJson: 'bind [按键:购买烟雾弹] "say !molotov"',

    },
    {
        systemName: '闪光弹',
        systemIcon: Flash,
        keyConfigJson: 'bind "[按键:购买闪光弹]" "buy !flashbang',

    },
    {
        systemName: '夜视仪',
        systemIcon: NightVision,
        keyConfigJson: 'bind  [按键:开关夜视仪]  toggle mat_fullbright 0 1',

    },
    {
        systemName: '血针',
        systemIcon: Needle,
        keyConfigJson: 'bind [按键:购买血针] "say !xz"',

    },
    {
        systemName: '护甲',
        systemIcon: Armor,
        keyConfigJson: 'bind [按键:购买护甲] "say !kevlar"',

    },
]);
// ZE配置库
const ZELibaryCfgOption = ref<Api.Game.SystemBindCfgVO[]>([
    {
        systemName: '第三人称',
        systemIcon: Command,
        keyConfigJson: `//freecam and tp 
//alias cam_setting_freecam "cam_idealyaw 0;cam_idealpitch 0;c_thirdpersonshoulder 0;c_thirdpersonshoulderheight 6;c_thirdpersonshoulderoffset 0;c_thirdpersonshoulderaimdist 0;cam_idealdist 0;"
alias cam_setting_tp "c_thirdpersonshoulder 1;c_thirdpersonshoulderheight 30;c_thirdpersonshoulderoffset 0;c_thirdpersonshoulderaimdist 999;cam_idealdist 180;cam_collision 0"

//freecam --> +tp
alias "cs_chasecam_freecam" "cs_aliasthird_freecam"
alias "cs_aliasthird_freecam" "thirdperson; cam_setting_tp; alias cs_chasecam_freecam ccs_aliasfirst_freecam"
alias "ccs_aliasfirst_freecam" "firstperson; alias cs_chasecam_freecam cs_aliasthird_freecam"

alias +tp_magnifier "cs_chasecam_freecam; _freecamup; _freecamdn; cam_collision 0"
alias -tp_magnifier "cs_chasecam_freecam; -keys_mouse"

//tp --> -tp
alias cs_chasecam_tp "cs_aliasthird_tp"
alias cs_aliasthird_tp "thirdperson;cam_setting_tp;alias cs_chasecam_tp cs_aliasfirst_tp"
alias cs_aliasfirst_tp "firstperson;alias cs_chasecam_tp cs_aliasthird_tp"

alias "+tp" "+tp_magnifier"
alias "-tp" "cs_chasecam_tp;-keys_mouse"
alias _freecamup "bind MWHEELUP incrementvar cam_idealdist -999999 999999 -100"
alias _freecamdn "bind MWHEELDOWN incrementvar cam_idealdist -999999 999999 100"
alias -keys_mouse  "bind "mwheelup" "+jump";bind mwheeldown "+jump""

bind [按键:开启第三人称] "+tp"
c_thirdpersonshoulder 1; cam_idealyaw 0; cam_idealpitch 0; cam_collision 0
c_mindistance -999999; c_maxdistance 999999`,

    },
    {
        systemName: '传送',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:传送到复活点] "say !ztele"',

    },
    {
        systemName: '地图滤镜',
        systemIcon: Command,
        keyConfigJson: 'bind  [按键:开关地图滤镜]  toggle r_csgo_postprocess_enable 0 1',
    },
    {
        systemName: '地图特效',
        systemIcon: Command,
        keyConfigJson: 'bind  [按键:开关地图特效]  toggle r_drawparticles 0 1',
    },
]);
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
// 用户应用的按键绑定项
const applyKeyBindItems = ref<Api.Game.ApplyKeyBindItem[]>([]);

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

// 打开教程弹窗
const openTutorialModalFn = () => {
    showTutorialModal.value = true;
};


// 切换标签页
const handleTabChangeFn = async (value: 'library' | 'local' | 'user') => {
    activeTab.value = value;
    isEditMode.value = false;
    selectedSystemConfig.value = null;
    selectedSystemConfig.value = '';
};

// 检查配置项是否已应用
const isItemApplied = (systemName: string): boolean => {
    return applyKeyBindItems.value.some(item => item.systemBindCfgVO?.systemName === systemName);
};

// 处理个人配置项点击
const handleUserConfigClickFn = (systemName: string | undefined) => {
    console.log('点击了个人配置项:', systemName);
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
                window.$message?.error('从配置文件移除失败');
                return;
            }
        }
        applyKeyBindItems.value.splice(index, 1);
        window.$message?.success('已移除绑定');
    }
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
        key += e.key.toUpperCase();
        capturedKey.value = key;
        saveAndCloseCaptureFn();
    }
};

// 处理鼠标按下事件
const handleMouseDownFn = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let key = '';
    if (e.ctrlKey) key += 'Ctrl+';
    if (e.shiftKey) key += 'Shift+';
    if (e.altKey) key += 'Alt+';

    switch (e.button) {
        case 0:
            key += 'MOUSE1';
            break;
        case 1:
            key += 'MOUSE3';
            break;
        case 2:
            key += 'MOUSE2';
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
    window.removeEventListener('keydown', handleKeyDownFn);
    window.removeEventListener('mousedown', handleMouseDownFn);
};

/**
 * 处理鼠标滚轮事件
 */
const handleWheelFn = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
        capturedKey.value = 'MWHEELUP';
    } else if (e.deltaY > 0) {
        capturedKey.value = 'MWHEELDOWN';
    }
    saveAndCloseCaptureFn();
};

/**
 * 保存按键并关闭弹窗
 */
const saveAndCloseCaptureFn = () => {
    if (currentSelectedItem.value && capturedKey.value) {
        //保存系统配置
        if (selectedSystemConfig.value === '武器类' || selectedSystemConfig.value === '道具累' || selectedSystemConfig.value === 'ZE常用') {
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
                window.$message?.warning(`按键 ${capturedKey.value} 已被 ${existingItem.systemBindCfgVO?.systemName} 使用，请更换按键`);
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

            applyKeyBindItems.value.push(newBindItem);

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
        window.$message?.error('未找到 CS2 路径，请先在设置中配置');
        return;
    }
    const { success } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, content);
    if (success) {
        window.$message?.success('应用成功');
    } else {
        window.$message?.error('应用失败');
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
                                    :class="{ 'selected': selectedSystemConfig === item.systemBindCfgVO?.systemName }"
                                    content-style="padding:10px">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-10px">
                                            <img :src="item.systemBindCfgVO?.systemIcon"
                                                class="w-48px h-48px object-contain" />
                                            <div class="flex flex-col">
                                                <span class="text-14px font-bold">{{ item.systemBindCfgVO?.systemName
                                                }}</span>
                                                <span class="text-12px text-gray-500">绑定按键: {{ item.key }}</span>
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
                content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:0px" :segmented="{
                    content: true,
                    footer: 'soft',
                }">
                <template #header v-if="activeTab === 'user'">
                    <div class="mb-10px pl-20px pr-20px pb-5px flex justify-between">
                        <div class="flex items-center">
                            <div class="font-size-24px">
                                <SvgIcon icon="material-symbols:folder-code-outline" class="w-24px h-24px mr-10px" />
                            </div>
                            <div class="font-size-14px font-bold">
                                autoexec.cfg
                            </div>
                        </div>
                        <div class="flex items-center">
                            <NSwitch class="mr-15px" size="large" :round="false" v-model:value="isEditMode">
                                <template #checked-icon>
                                    <SvgIcon icon="akar-icons:shipping-box-01" />
                                </template>
                                <template #unchecked-icon>
                                    <SvgIcon icon="akar-icons:file" />
                                </template>
                            </NSwitch>
                            <div class="font-size-22px cursor-pointer mr-15px cursor-pointer">
                                <SvgIcon icon="material-symbols:content-copy-outline" />
                            </div>
                            <div class="font-size-22px cursor-pointer cursor-pointer">
                                <SvgIcon icon="material-symbols:folder-copy-outline" />
                            </div>
                        </div>
                    </div>
                </template>
                <NGrid x-gap="10" y-gap="10" :cols="4" v-if="activeTab === 'library'">
                    <NGridItem v-for="item in currentCfgOptions" :key="item.systemName"
                        @click="!isItemApplied(item.systemName) && openKeyCaptureFn(item)">
                        <NCard class="rounded-10px"
                            :class="{ 'applied': isItemApplied(item.systemName), 'selected': selectedSystemConfig === item.systemName }"
                            content-style="padding:15px"
                            :content-class="isItemApplied(item.systemName) ? 'flex flex-col items-center justify-center' : 'cursor-pointer flex flex-col items-center justify-center'">
                            <img :src="item.systemIcon" class="w-48px h-48px object-contain mb-8px" />
                            <span class="text-12px">{{ item.systemName }}</span>
                        </NCard>
                    </NGridItem>
                </NGrid>
                <div v-if="activeTab === 'user' && !isEditMode">
                    <NCollapse>
                        <NCollapseItem v-for="(item, index) in applyKeyBindItems"
                            :key="item.systemBindCfgVO?.systemName" :name="index">
                            <template #header>
                                <NCard class="rounded-10px" content-class="flex" content-style="padding:10px;">
                                    <div class="w-200px">
                                        <img :src="item.systemBindCfgVO?.systemIcon" class="h-75px mr-20px" />
                                    </div>
                                    <div class="flex flex-col align-center justify-between">
                                        <span class="text-14px font-bold">配置库名称 : {{ item.systemBindCfgVO?.systemName
                                            }}</span>
                                        <span class="text-12px text-gray-500">绑定按键 : {{ item.key }}</span>
                                    </div>
                                </NCard>
                            </template>
                            <div v-if="item.systemBindCfgVO?.keyConfigJson"
                                class="rounded-10px overflow-hidden max-h-500px">
                                <MonacoEditor ref="editorRef" class="w-full h-full" :options="editorOptions"
                                    :model-value="item.systemBindCfgVO?.keyConfigJson" />
                            </div>
                        </NCollapseItem>
                    </NCollapse>
                </div>
                <div v-if="activeTab === 'user' && isEditMode" class="w-full h-full">
                    <MonacoEditor ref="editorRef" class="w-full min-h-full max-h-full" :options="editorOptions"
                        :model-value="localAutoexecCfg" />
                </div>
            </NCard>
        </div>

        <NModal v-model:show="showKeyCaptureModal" :bordered="true" preset="card"
            class="w-400px rounded-20px key-capture-wrapper" :class="{ 'light-mode': !isDarkMode }" :closable="false"
            size="small">
            <div class="key-capture-modal-new" @wheel="handleWheelFn">
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
                        <span class="tip-text">键盘按键</span>
                    </div>
                    <div class="tip-item">
                        <SvgIcon icon="material-symbols:mouse" class="tip-icon" />
                        <span class="tip-text">鼠标按键</span>
                    </div>
                    <div class="tip-item">
                        <SvgIcon icon="material-symbols:swap-vert" class="tip-icon" />
                        <span class="tip-text">滚轮</span>
                    </div>
                </div>
            </div>
        </NModal>

        <NModal v-model:show="showTutorialModal" :bordered="true" preset="card" class="w-600px rounded-10px">
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

            .applied-binding-item {
                transition: all 0.2s ease;

                &:hover {
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
                    background: rgba(102, 126, 234, 0.05);
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
