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
import M4A1 from '@/assets/imgs/weapon/M4A1.png';
import MAC10 from '@/assets/imgs/weapon/MAC-10.png';
import MP7 from '@/assets/imgs/weapon/MP7.png';
import P250 from '@/assets/imgs/weapon/P250.png';
import R8 from '@/assets/imgs/weapon/R8.png';
import SCAR20 from '@/assets/imgs/weapon/SCAR-20.png';
import SG556 from '@/assets/imgs/weapon/SG556.png';
import USP from '@/assets/imgs/weapon/USP.png';
import MP5SD from '@/assets/imgs/weapon/MP5SD.png';
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
import Nova from '@/assets/imgs/weapon/Nova.png';
import XM1014 from '@/assets/imgs/weapon/XM1014.png';
import Sawed from '@/assets/imgs/weapon/Sawed.png';
import CommonWeapon from '@/assets/imgs/weapon/CommonWeapon.png';
import MAG7 from '@/assets/imgs/weapon/MAG-7.png';


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
        systemName: 'MP5SD',
        systemIcon: MP5SD,
        keyConfigJson: 'bind "[按键:购买MP5]" "buy mp5sd"',
        configDesc: '购买MP5SD冲锋枪',
    },
    {
        systemName: 'MAC10',
        systemIcon: MAC10,
        keyConfigJson: 'bind "[按键:购买MAC10]" "buy mac10"',
        configDesc: '购买MAC-10冲锋枪',
    },
    {
        systemName: 'P90',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买P90]" "buy p90"',
        configDesc: '购买P90冲锋枪',
    },
    {
        systemName: '野牛(牛肉粉最爱)',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买野牛]" "buy bizon"',
        configDesc: '购买野牛冲锋枪',
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
        systemName: 'M4A4',
        systemIcon: M4A4,
        keyConfigJson: 'bind "[按键:购买M4A4]" "buy m4a4"',
        configDesc: '购买M4A4步枪',
    },
    {
        systemName: 'M4A1-S',
        systemIcon: M4A1,
        keyConfigJson: 'bind "[按键:购买M4A1-S]" "buy m4a1_silencer"',
        configDesc: '购买M4A1-S步枪',
    },
    {
        systemName: 'Famas',
        systemIcon: FAMAS,
        keyConfigJson: 'bind "[按键:购买Famas]" "buy famas"',
        configDesc: '购买Famas步枪',
    },
    {
        systemName: 'SG556',
        systemIcon: SG556,
        keyConfigJson: 'bind "[按键:购买SG553]" "buy sg556"',
        configDesc: '购买SG556步枪',
    },
    {
        systemName: 'AUG',
        systemIcon: AUG,
        keyConfigJson: 'bind "[按键:购买AUG]" "buy aug"',
        configDesc: '购买AUG步枪',
    },
    {
        systemName: 'Galilar',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买Galilar]" "buy galilar"',
        configDesc: '购买Galilar步枪',
    },
    {
        systemName: 'Nova',
        systemIcon: Nova,
        keyConfigJson: 'bind "[按键:购买新星]" "buy nova"',
        configDesc: '购买Nova喷子',
    },
    {
        systemName: 'XM1014',
        systemIcon: XM1014,
        keyConfigJson: 'bind "[按键:购买XM1014]" "buy xm1014"',
        configDesc: '购买XM1014连喷',
    },
    {
        systemName: '匪喷',
        systemIcon: Sawed,
        keyConfigJson: 'bind "[按键:购买匪喷]" "buy sawedoff"',
        configDesc: '购买匪喷',
    },
    {
        systemName: '警喷',
        systemIcon: MAG7,
        keyConfigJson: 'bind "[按键:购买警喷]" "buy mag7"',
        configDesc: '购买警喷',
    },
    {
        systemName: 'SSG08',
        systemIcon: Scout,
        keyConfigJson: 'bind "[按键:购买SSG08]" "buy ssg08"',
        configDesc: '购买SSG08狙击枪',
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
        keyConfigJson: 'bind "[按键:购买R8]" "buy revolver"',
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
        keyConfigJson: 'bind "[按键:购买双枪]" "buy elite"',
        configDesc: '购买双持贝瑞塔手枪',
    },
    {
        systemName: 'USP',
        systemIcon: USP,
        keyConfigJson: 'bind "[按键:购买USP]" "buy usp_sliencer"',
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
        keyConfigJson: 'bind "[按键:购买CZ-75]" "buy cz75a"',
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
                window.$message?.error('读取配置文件失败: ' + (result.error || '未知错误'));
            }
        }
    } catch (error) {
        console.error('读取本地配置失败:', error);
        window.$message?.error('读取本地配置失败');
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
                window.$message?.error('从配置文件移除失败');
                return;
            }
        }
        // 使用 filter 创建新数组，触发计算属性 setter
        applyKeyBindItems.value = applyKeyBindItems.value.filter((_, i) => i !== index);
        window.$message?.success('已移除绑定');
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
        window.$message?.error('未找到该绑定项');
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
    window.removeEventListener('keydown', handleKeyDownResetFn);
    window.removeEventListener('mousedown', handleMouseDownResetFn);
    window.removeEventListener('wheel', handleWheelResetFn);
};

// 处理重置时的鼠标滚轮事件
const handleWheelResetFn = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 防止重复触发
    if (isCapturing.value) return;

    // 检查滚轮按键是否已被其他配置使用
    const wheelKey = e.deltaY < 0 ? 'MWHEELUP' : 'MWHEELDOWN';
    const keyExistsIndex = applyKeyBindItems.value.findIndex(
        item => item.key === wheelKey && item.systemBindCfgVO?.systemName !== currentResetItem.value?.systemBindCfgVO?.systemName
    );
    if (keyExistsIndex !== -1) {
        const existingItem = applyKeyBindItems.value[keyExistsIndex];
        window.$message?.warning(`按键 ${wheelKey} 已被 ${existingItem.systemBindCfgVO?.systemName} 使用，请更换按键`);
        return;
    }

    if (e.deltaY < 0) {
        capturedKey.value = 'MWHEELUP';
    } else if (e.deltaY > 0) {
        capturedKey.value = 'MWHEELDOWN';
    }

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
        key += e.key.toUpperCase();
        capturedKey.value = key;
        saveResetKeyAndCloseFn();
    }
};

// 处理重置时的鼠标按下事件
const handleMouseDownResetFn = (e: MouseEvent) => {
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
            window.$message?.warning(`按键 ${capturedKey.value} 已被 ${existingItem.systemBindCfgVO?.systemName} 使用，请更换按键`);
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
                    window.$message?.success('按键重置成功并已写入配置');
                } else {
                    window.$message?.error('写入配置文件失败');
                }
            } else {
                window.$message?.success('按键重置成功');
            }
        }
    }
    closeResetKeyCaptureFn();
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
        window.$message?.error('未找到 CS2 路径，请先在设置中配置');
        return;
    }
    const { error } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, content);
    if (!error) {
        window.$message?.success('应用成功');
    } else {
        window.$message?.error('应用失败');
    }
};

/**
 * 保存本地配置
 */
const saveLocalAutoexecCfg = async () => {
    const paths = await window.ipcRenderer.invoke('auto-detect-paths');
    if (!paths.csgo2Path) {
        window.$message?.error('未找到 CS2 路径，请先在设置中配置');
        return;
    }
    // 传入 true 表示覆盖整个文件
    const { success } = await window.ipcRenderer.invoke('write-autoexec-cfg', paths.csgo2Path, localAutoexecCfg.value, true);
    if (success) {
        window.$message?.success('保存成功');
    } else {
        window.$message?.error('保存失败');
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
                <h1 class="page-title">按键绑定配置</h1>
            </div>
            <div class="back-btn" @click="handleBackFn">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>返回工具箱</span>
            </div>
        </div>

        <div class="main-content">
            <NCard class="left-panel" content-class="h-full overflow-auto" content-style="padding:10px;">
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
                            <span class="text-12px">本地配置</span>
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
                content-class="h-full flex flex-col flex-1 overflow-auto" header-style="padding:0px">
                <template #header v-if="activeTab === 'local'">
                    <div class="pl-20px pr-20px pb-5px flex justify-between">
                        <div class="flex items-center">
                            <div class="font-size-24px">
                                <SvgIcon icon="material-symbols:folder-code-outline" class="w-24px h-24px mr-10px" />
                            </div>
                            <div class="font-size-14px font-bold">
                                autoexec.cfg
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
                                        <span class="text-14px font-bold">配置库名称 : {{ item.systemBindCfgVO?.systemName
                                        }}</span>
                                        <span class="text-12px text-gray-500">绑定按键 : {{ item.key }}</span>
                                    </div>
                                    <div class="flex flex-col items-center justify-center w-150px gap-10px">
                                        <NButton class="rounded-10px" type="info" ghost
                                            @click.stop="resetAppliedBindingKey(item.systemBindCfgVO?.systemName)">重置按键
                                        </NButton>
                                        <NButton class="rounded-10px" type="warning" ghost
                                            @click.stop="removeAppliedBinding(item.systemBindCfgVO?.systemName)">取消应用
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
