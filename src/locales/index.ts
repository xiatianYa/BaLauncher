import type { App } from 'vue';
import { createI18n } from 'vue-i18n';
import { localStg } from '@/utils/storage';
import zhCN from './lang/zh-CN';
import zhTW from './lang/zh-TW';
import enUS from './lang/en-US';
import jaJP from './lang/ja-JP';
import koKR from './lang/ko-KR';
import ruRU from './lang/ru-RU';

const messages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'ru-RU': ruRU,
};

const i18n = createI18n({
  legacy: false,
  locale: localStg.get('lang') || 'zh-CN',
  fallbackLocale: 'en-US',
  messages,
});

export { i18n };

export function setupI18n(app: App) {
  app.use(i18n);
}

export const $t = i18n.global.t;

export function setLocale(locale: App.I18n.LangType) {
  i18n.global.locale.value = locale;
}
