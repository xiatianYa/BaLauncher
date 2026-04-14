import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import { ref } from 'vue';
import { localStg } from '@/utils/storage';
import { APP_STORAGE_KEYS } from '@/constants/cache';

// 导入音频资源
import audioSystem from '@/assets/video/系统.mp3';
import audioYuuka from '@/assets/video/优香.mp3';
import audioHoshino from '@/assets/video/星野.mp3';
import audioYuzu from '@/assets/video/柚子.mp3';
import audioAris from '@/assets/video/爱丽丝.mp3';
import audioShiroko from '@/assets/video/白子.mp3';
import audioArona from '@/assets/video/阿罗纳.mp3';

// 导入主题图片
import themeSystem from '@/assets/theme/系统.png';
import themeYuuka from '@/assets/theme/优香.png';
import themeHoshino from '@/assets/theme/星野.png';
import themeYuzu from '@/assets/theme/柚子.png';
import themeAris from '@/assets/theme/爱丽丝.png';
import themeShiroko from '@/assets/theme/白子.png';
import themeArona from '@/assets/theme/阿罗娜.png';

export const useAppStore = defineStore(SetupStoreId.App, () => {
  // 当前主题，默认为 '阿罗娜'
  const currentTheme = ref<string>(localStg.get(APP_STORAGE_KEYS.THEME) || '阿罗娜');
  // 音量，从 localStorage 读取，默认为 1
  const volume = ref<number>(localStg.get(APP_STORAGE_KEYS.VOLUME) || 0.5);

  // 在线用户列表
  const onlineUserList = ref<Array<Api.System.OnLineUser>>([]);

  // 音频映射
  const audioMap: Record<string, string> = {
    '优香': audioYuuka,
    '星野': audioHoshino,
    '柚子': audioYuzu,
    '爱丽丝': audioAris,
    '系统': audioSystem,
    '白子': audioShiroko,
    '阿罗娜': audioArona,
  };

  /**
   * 设置音量
   * @param val 音量值 (0-1)
   */
  function setVolume(val: number) {
    volume.value = val;
    localStg.set(APP_STORAGE_KEYS.VOLUME, val);
  }

  // 主题列表
  const themes = [
    { name: '阿罗娜', img: themeArona, id: '阿罗娜' },
    { name: '优香', img: themeYuuka, id: '优香' },
    { name: '星野', img: themeHoshino, id: '星野' },
    { name: '柚子', img: themeYuzu, id: '柚子' },
    { name: '爱丽丝', img: themeAris, id: '爱丽丝' },
    { name: '白子', img: themeShiroko, id: '白子' },
    { name: '系统', img: themeSystem, id: '系统' },
  ];

  const locale = ref<App.I18n.LangType>(localStg.get(APP_STORAGE_KEYS.LANG) || 'zh-CN');

  /**
   * 设置当前主题
   * @param theme 主题ID
   */
  function setTheme(theme: string) {
    currentTheme.value = theme;
    localStg.set(APP_STORAGE_KEYS.THEME, theme);
  }

  return {
    currentTheme,
    audioMap,
    themes,
    locale,
    onlineUserList,
    volume,
    setTheme,
    setVolume
  };
});
