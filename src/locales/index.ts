import type { App } from 'vue';
import { createI18n } from 'vue-i18n';
import { localStg } from '@/utils/storage';
import zhCN from './lang/zh-CN';
import enUS from './lang/en-US';

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const i18n = createI18n({
  legacy: false,
  locale: localStg.get('lang') || 'zh-CN',
  fallbackLocale: 'en',
  messages,
});

export function setupI18n(app: App) {
  app.use(i18n);
}

export const $t = i18n.global.t;

export function setLocale(locale: App.I18n.LangType) {
  i18n.global.locale.value = locale;
}
