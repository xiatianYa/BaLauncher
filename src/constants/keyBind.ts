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
import Dec from '@/assets/imgs/weapon/Dec.png';

/** 系统配置库列表 */
export const systemLibraryItems: Api.Game.SystemBindVO[] = [
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
];

/** 系统武器配置库 */
export const GunLibaryCfgOption: Api.Game.SystemBindCfgVO[] = [
    {
        systemName: 'MP9',
        systemIcon: MP9,
        keyConfigJson: 'bind "[按键:购买MP9]" "mp9"',
        configDesc: '购买MP9冲锋枪',
    },
    {
        systemName: 'MP7',
        systemIcon: MP7,
        keyConfigJson: 'bind "[按键:购买MP7]" "mp7"',
        configDesc: '购买MP7冲锋枪',
    },
    {
        systemName: 'MP5SD',
        systemIcon: MP5SD,
        keyConfigJson: 'bind "[按键:购买MP5]" "mp5sd"',
        configDesc: '购买MP5SD冲锋枪',
    },
    {
        systemName: 'MAC10',
        systemIcon: MAC10,
        keyConfigJson: 'bind "[按键:购买MAC10]" "mac10"',
        configDesc: '购买MAC-10冲锋枪',
    },
    {
        systemName: 'P90',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买P90]" "p90"',
        configDesc: '购买P90冲锋枪',
    },
    {
        systemName: '野牛(牛肉粉最爱)',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买野牛]" "bizon"',
        configDesc: '购买野牛冲锋枪',
    },
    {
        systemName: 'M249',
        systemIcon: M249,
        keyConfigJson: 'bind "[按键:购买M249]" "m249"',
        configDesc: '购买M249机枪',
    },
    {
        systemName: '内格夫',
        systemIcon: Negev,
        keyConfigJson: 'bind "[按键:购买内格夫]" "negev"',
        configDesc: '购买内格夫机枪',
    },
    {
        systemName: 'AK47',
        systemIcon: AK47,
        keyConfigJson: 'bind "[按键:购买AK47]" "ak47"',
        configDesc: '购买AK-47步枪',
    },
    {
        systemName: 'M4A4',
        systemIcon: M4A4,
        keyConfigJson: 'bind "[按键:购买M4A4]" "m4a4"',
        configDesc: '购买M4A4步枪',
    },
    {
        systemName: 'M4A1-S',
        systemIcon: M4A1,
        keyConfigJson: 'bind "[按键:购买M4A1-S]" "m4a1_silencer"',
        configDesc: '购买M4A1-S步枪',
    },
    {
        systemName: 'Famas',
        systemIcon: FAMAS,
        keyConfigJson: 'bind "[按键:购买Famas]" "famas"',
        configDesc: '购买Famas步枪',
    },
    {
        systemName: 'SG556',
        systemIcon: SG556,
        keyConfigJson: 'bind "[按键:购买SG553]" "sg556"',
        configDesc: '购买SG556步枪',
    },
    {
        systemName: 'AUG',
        systemIcon: AUG,
        keyConfigJson: 'bind "[按键:购买AUG]" "aug"',
        configDesc: '购买AUG步枪',
    },
    {
        systemName: 'Galilar',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买Galilar]" "galilar"',
        configDesc: '购买Galilar步枪',
    },
    {
        systemName: 'Nova',
        systemIcon: Nova,
        keyConfigJson: 'bind "[按键:购买新星]" "nova"',
        configDesc: '购买Nova喷子',
    },
    {
        systemName: 'XM1014',
        systemIcon: XM1014,
        keyConfigJson: 'bind "[按键:购买XM1014]" "xm1014"',
        configDesc: '购买XM1014连喷',
    },
    {
        systemName: '匪喷',
        systemIcon: Sawed,
        keyConfigJson: 'bind "[按键:购买匪喷]" "sawedoff"',
        configDesc: '购买匪喷',
    },
    {
        systemName: '警喷',
        systemIcon: MAG7,
        keyConfigJson: 'bind "[按键:购买警喷]" "mag7"',
        configDesc: '购买警喷',
    },
    {
        systemName: 'SSG08(86137用)',
        systemIcon: Scout,
        keyConfigJson: 'bind "[按键:购买SSG08]" "ssg08"',
        configDesc: '购买SSG08狙击枪',
    },
    {
        systemName: 'AWP',
        systemIcon: AWP,
        keyConfigJson: 'bind "[按键:购买AWP]" "awp"',
        configDesc: '购买AWP狙击枪',
    },
    {
        systemName: 'G3SG1',
        systemIcon: G3SG1,
        keyConfigJson: 'bind "[按键:购买G3SG1]" "g3sg1"',
        configDesc: '购买G3SG1自动狙击枪',
    },
    {
        systemName: 'SCAR20',
        systemIcon: SCAR20,
        keyConfigJson: 'bind "[按键:购买SCAR20]" "scar20"',
        configDesc: '购买SCAR-20自动狙击枪',
    },
    {
        systemName: '沙鹰',
        systemIcon: Deagle,
        keyConfigJson: 'bind "[按键:购买沙鹰]" "deagle"',
        configDesc: '购买沙漠之鹰手枪',
    },
    {
        systemName: 'R8(阿伟的最爱)',
        systemIcon: R8,
        keyConfigJson: 'bind "[按键:购买R8]" "revolver"',
        configDesc: '购买R8左轮手枪',
    },
    {
        systemName: '格洛克',
        systemIcon: Glock,
        keyConfigJson: 'bind "[按键:购买格洛克]" "glock"',
        configDesc: '购买格洛克手枪',
    },
    {
        systemName: '双枪',
        systemIcon: DualBerettas,
        keyConfigJson: 'bind "[按键:购买双枪]" "elite"',
        configDesc: '购买双持贝瑞塔手枪',
    },
    {
        systemName: 'USP',
        systemIcon: USP,
        keyConfigJson: 'bind "[按键:购买USP]" "usp_sliencer"',
        configDesc: '购买USP-S手枪',
    },
    {
        systemName: 'P250',
        systemIcon: P250,
        keyConfigJson: 'bind "[按键:购买P250]" "p250"',
        configDesc: '购买P250手枪',
    },
    {
        systemName: 'CZ-75',
        systemIcon: CZ75,
        keyConfigJson: 'bind "[按键:购买CZ-75]" "cz75a"',
        configDesc: '购买CZ75自动手枪',
    },
];

/** 系统道具配置库 */
export const PropLibaryCfgOption: Api.Game.SystemBindCfgVO[] = [
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
        systemName: '电圈雷',
        systemIcon: Dec,
        keyConfigJson: 'bind [按键:购买电圈雷] "say !dec"',
    },
    {
        systemName: '闪光弹',
        systemIcon: Flash,
        keyConfigJson: 'bind "[按键:购买闪光弹]" "buy !flashbang"',
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
];

/** ZE配置库 */
export const ZELibaryCfgOption: Api.Game.SystemBindCfgVO[] = [
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

bind [按键:开启第三人称] "+tp"
c_thirdpersonshoulder 1; cam_idealyaw 0; cam_idealpitch 0; cam_collision 0
c_mindistance -999999; c_maxdistance 999999`,
    },
    {
        systemName: '灵魂出窍',
        systemIcon: Command,
        keyConfigJson: `// 灵魂出窍
alias cam_settings_soul "cam_idealyaw 0; cam_idealpitch 0; cam_ideallag 0; c_thirdpersonshoulder 0;cam_idealdist 0;c_mindistance -50000; c_maxdistance 50000;"
alias cs_aliasthird_soul "thirdperson; cam_settings_soul; alias cs_chasecam_soul cs_aliasfirst_soul"
alias cs_aliasfirst_soul "firstperson; alias cs_chasecam_soul cs_aliasthird_soul"
alias cs_chasecam_soul cs_aliasthird_soul
// 按下按键后可以使用滚轮进行镜头的缩进和拉远
bind CAPSLOCK +cam_soul
alias +cam_soul "cs_chasecam_soul; bindZoom; cam_collision 0"
alias -cam_soul "cs_chasecam_soul; bindNormal"
alias bindZoom "bind MWHEELUP incrementvar cam_idealdist -50000 50000 -100; bind MWHEELDOWN incrementvar cam_idealdist -50000 50000 100"
// 在这里你需要把“+jump”替换你自己原本使用的指令
alias bindNormal "unbind MWHEELUP; bind MWHEELDOWN [按键:关闭灵魂出窍]" `,
    },
    {
        systemName: '传送',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:传送到复活点] "say !ztele"',

    },
    {
        systemName: '地图滤镜',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:开关地图滤镜]  toggle r_csgo_postprocess_enable 0 1',
    },
    {
        systemName: '地图特效',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:开关地图特效]  toggle r_drawparticles 0 1',
    },
    {
        systemName: '画面亮度调整',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:画面亮度调整] "toggle r_fullscreen_gamma 1 1.5 2 2.5 3"',
    },
    {
        systemName: '隐藏腿部模型',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:隐藏腿部模型] "say !hidebody"',
    },
    {
        systemName: '跳跃',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:跳跃] "+jump"',
    },
];
