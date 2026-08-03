<script setup lang="ts">
import { NConfigProvider, darkTheme, zhCN, dateZhCN, enUS, dateEnUS } from 'naive-ui';
import { computed } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { i18n } from '@/locales';

defineOptions({
  name: 'App'
});


const themeStore = useThemeStore();

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

/** naive-ui 组件语言跟随应用 i18n */
const naiveLocale = computed(() => (i18n.global.locale.value === 'zh-CN' ? zhCN : enUS));
const naiveDateLocale = computed(() => (i18n.global.locale.value === 'zh-CN' ? dateZhCN : dateEnUS));

const themeOverrides = computed(() => {
  return {
  };
});
</script>

<template>
  <NConfigProvider
    :theme="naiveDarkTheme"
    :theme-overrides="themeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
    class="h-full flex"
  >
    <AppProvider>
      <RouterView />
    </AppProvider>
  </NConfigProvider>
</template>

<style></style>
