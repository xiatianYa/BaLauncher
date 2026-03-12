import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import { ref } from 'vue';
import { localStg } from '@/utils/storage';

// 导入音频资源
import audioYuuka from '@/assets/video/优香.mp3';
import audioHoshino from '@/assets/video/星野.mp3';
import audioYuzu from '@/assets/video/柚子.mp3';
import audioAris from '@/assets/video/爱丽丝.mp3';
import audioShiroko from '@/assets/video/白子.mp3';
import audioArona from '@/assets/video/阿罗纳.mp3';

// 导入主题图片
import themeYuuka from '@/assets/theme/优香.png';
import themeHoshino from '@/assets/theme/星野.png';
import themeYuzu from '@/assets/theme/柚子.png';
import themeAris from '@/assets/theme/爱丽丝.png';
import themeShiroko from '@/assets/theme/白子.png';
import themeArona from '@/assets/theme/阿罗娜.png';

export const useAppStore = defineStore(SetupStoreId.App, () => {
  // 当前主题，默认为 '阿罗娜'
  const currentTheme = ref<string>(localStg.get('theme') || '阿罗娜');

  // 音频映射
  const audioMap: Record<string, string> = {
    '优香': audioYuuka,
    '星野': audioHoshino,
    '柚子': audioYuzu,
    '爱丽丝': audioAris,
    '白子': audioShiroko,
    '阿罗娜': audioArona
  };

  // 主题列表
  const themes = [
    { name: '阿罗娜', img: themeArona, id: '阿罗娜' },
    { name: '优香', img: themeYuuka, id: '优香' },
    { name: '星野', img: themeHoshino, id: '星野' },
    { name: '柚子', img: themeYuzu, id: '柚子' },
    { name: '爱丽丝', img: themeAris, id: '爱丽丝' },
    { name: '白子', img: themeShiroko, id: '白子' },
  ];

  /**
   * 设置当前主题
   * @param theme 主题ID
   */
  function setTheme(theme: string) {
    currentTheme.value = theme;
    localStg.set('theme', theme);
  }

  return {
    currentTheme,
    audioMap,
    themes,
    setTheme
  };
});
