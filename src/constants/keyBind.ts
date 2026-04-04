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
    },
    {
        systemName: '个人配置库',
        systemIcon: Command,
        configName: '个人配置库',
        configDesc: '用户个人配置库',
    },
];

/** 系统武器配置库 */
export const GunLibaryCfgOption: Api.Game.SystemBindCfgVO[] = [
    {
        systemName: 'MP9(傲丙初最爱)',
        systemIcon: MP9,
        keyConfigJson: 'bind "[按键:购买MP9]" "mp9;c_mp9;ms_mp9;sm_mp9"',
        configDesc: '购买MP9冲锋枪',
    },
    {
        systemName: 'MP7',
        systemIcon: MP7,
        keyConfigJson: 'bind "[按键:购买MP7]" "mp7;c_mp7;ms_mp7;sm_mp7"',
        configDesc: '购买MP7冲锋枪',
    },
    {
        systemName: 'MP5SD',
        systemIcon: MP5SD,
        keyConfigJson: 'bind "[按键:购买MP5SD]" "mp5sd;c_mp5sd;ms_mp5sd;sm_mp5sd"',
        configDesc: '购买MP5SD冲锋枪',
    },
    {
        systemName: 'MAC10',
        systemIcon: MAC10,
        keyConfigJson: 'bind "[按键:购买MAC10]" "mac10;c_mac10;ms_mac10;sm_mac10"',
        configDesc: '购买MAC-10冲锋枪',
    },
    {
        systemName: 'P90',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买P90]" "p90;c_p90;ms_p90;sm_p90"',
        configDesc: '购买P90冲锋枪',
    },
    {
        systemName: '野牛(牛肉粉最爱)',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买野牛]" "bizon;c_bizon;ms_bizon;sm_bizon"',
        configDesc: '购买野牛冲锋枪',
    },
    {
        systemName: 'M249',
        systemIcon: M249,
        keyConfigJson: 'bind "[按键:购买M249]" "m249;c_m249;ms_m249;sm_m249"',
        configDesc: '购买M249机枪',
    },
    {
        systemName: '内格夫',
        systemIcon: Negev,
        keyConfigJson: 'bind "[按键:购买内格夫]" "negev;c_negev;ms_negev;sm_negev"',
        configDesc: '购买内格夫机枪',
    },
    {
        systemName: 'AK47',
        systemIcon: AK47,
        keyConfigJson: 'bind "[按键:购买AK47]" "ak47;c_ak47;ms_ak47;sm_ak47"',
        configDesc: '购买AK-47步枪',
    },
    {
        systemName: 'M4A4',
        systemIcon: M4A4,
        keyConfigJson: 'bind "[按键:购买M4A4]" "m4a4;c_m4a4;ms_m4a4;sm_m4a4"',
        configDesc: '购买M4A4步枪',
    },
    {
        systemName: 'M4A1-S',
        systemIcon: M4A1,
        keyConfigJson: 'bind "[按键:购买M4A1-S]" "m4a1_silencer;c_m4a1_silencer;ms_m4a1_silencer;sm_m4a1_silencer"',
        configDesc: '购买M4A1-S步枪',
    },
    {
        systemName: 'Famas',
        systemIcon: FAMAS,
        keyConfigJson: 'bind "[按键:购买Famas]" "famas;c_famas;ms_famas;sm_famas"',
        configDesc: '购买Famas步枪',
    },
    {
        systemName: 'SG556',
        systemIcon: SG556,
        keyConfigJson: 'bind "[按键:购买SG556]" "sg556;c_sg556;ms_sg556;sm_sg556"',
        configDesc: '购买SG556步枪',
    },
    {
        systemName: 'AUG',
        systemIcon: AUG,
        keyConfigJson: 'bind "[按键:购买AUG]" "aug;c_aug;ms_aug;sm_aug"',
        configDesc: '购买AUG步枪',
    },
    {
        systemName: 'Galilar',
        systemIcon: CommonWeapon,
        keyConfigJson: 'bind "[按键:购买Galilar]" "galilar;c_galilar;ms_galilar;sm_galilar"',
        configDesc: '购买Galilar步枪',
    },
    {
        systemName: 'Nova',
        systemIcon: Nova,
        keyConfigJson: 'bind "[按键:购买新星]" "nova;c_nova;ms_nova;sm_nova"',
        configDesc: '购买Nova喷子',
    },
    {
        systemName: 'XM1014',
        systemIcon: XM1014,
        keyConfigJson: 'bind "[按键:购买XM1014]" "xm1014;c_xm1014;ms_xm1014;sm_xm1014"',
        configDesc: '购买XM1014连喷',
    },
    {
        systemName: '匪喷',
        systemIcon: Sawed,
        keyConfigJson: 'bind "[按键:购买匪喷]" "sawedoff;c_sawedoff;ms_sawedoff;sm_sawedoff"',
        configDesc: '购买匪喷',
    },
    {
        systemName: '警喷',
        systemIcon: MAG7,
        keyConfigJson: 'bind "[按键:购买警喷]" "mag7;c_mag7;ms_mag7;sm_mag7"',
        configDesc: '购买警喷',
    },
    {
        systemName: 'SSG08(86137用)',
        systemIcon: Scout,
        keyConfigJson: 'bind "[按键:购买SSG08]" "ssg08;c_ssg08;ms_ssg08;sm_ssg08"',
        configDesc: '购买SSG08狙击枪',
    },
    {
        systemName: 'AWP',
        systemIcon: AWP,
        keyConfigJson: 'bind "[按键:购买AWP]" "awp;c_awp;ms_awp;sm_awp"',
        configDesc: '购买AWP狙击枪',
    },
    {
        systemName: 'G3SG1',
        systemIcon: G3SG1,
        keyConfigJson: 'bind "[按键:购买G3SG1]" "g3sg1;c_g3sg1;ms_g3sg1;sm_g3sg1"',
        configDesc: '购买G3SG1自动狙击枪',
    },
    {
        systemName: 'SCAR20',
        systemIcon: SCAR20,
        keyConfigJson: 'bind "[按键:购买SCAR20]" "scar20;c_scar20;ms_scar20;sm_scar20"',
        configDesc: '购买SCAR-20自动狙击枪',
    },
    {
        systemName: '沙鹰',
        systemIcon: Deagle,
        keyConfigJson: 'bind "[按键:购买沙鹰]" "deagle;c_deagle;ms_deagle;sm_deagle"',
        configDesc: '购买沙漠之鹰手枪',
    },
    {
        systemName: 'R8(阿伟的最爱)',
        systemIcon: R8,
        keyConfigJson: 'bind "[按键:购买R8]" "revolver;c_revolver;ms_revolver;sm_revolver"',
        configDesc: '购买R8左轮手枪',
    },
    {
        systemName: '格洛克',
        systemIcon: Glock,
        keyConfigJson: 'bind "[按键:购买格洛克]" "glock;c_glock;ms_glock;sm_glock"',
        configDesc: '购买格洛克手枪',
    },
    {
        systemName: '双枪',
        systemIcon: DualBerettas,
        keyConfigJson: 'bind "[按键:购买双枪]" "elite;c_elite;ms_elite;sm_elite"',
        configDesc: '购买双持贝瑞塔手枪',
    },
    {
        systemName: 'USP',
        systemIcon: USP,
        keyConfigJson: 'bind "[按键:购买USP]" "usp_sliencer;c_usp_sliencer;ms_usp_sliencer;sm_usp_sliencer"',
        configDesc: '购买USP-S手枪',
    },
    {
        systemName: 'P250',
        systemIcon: P250,
        keyConfigJson: 'bind "[按键:购买P250]" "p250;c_p250;ms_p250;sm_p250"',
        configDesc: '购买P250手枪',
    },
    {
        systemName: 'CZ-75',
        systemIcon: CZ75,
        keyConfigJson: 'bind "[按键:购买CZ-75]" "cz75a;c_cz75a;ms_cz75a;sm_cz75a"',
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
        keyConfigJson: 'bind  [按键:开关夜视仪]  toggle mat_fullbright',
    },
    {
        systemName: '血针',
        systemIcon: Needle,
        keyConfigJson: 'bind [按键:购买血针] "xz;c_xz;ms_health;sm_xz"',
    },
    {
        systemName: '护甲',
        systemIcon: Armor,
        keyConfigJson: 'bind [按键:购买护甲] "kevlar;c_kevlar;ms_kevlar;sm_kevlar"',
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
        keyConfigJson: 'bind [按键:开关地图滤镜]  toggle r_csgo_postprocess_enable',
    },
    {
        systemName: '地图特效',
        systemIcon: Command,
        keyConfigJson: 'bind [按键:开关地图特效]  toggle r_drawparticles',
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
