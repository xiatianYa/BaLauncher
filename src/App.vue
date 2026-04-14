<script setup lang="ts">
import { NConfigProvider, darkTheme } from 'naive-ui';
import { computed } from 'vue';
import { useThemeStore } from '@/store/modules/theme';

defineOptions({
  name: 'App'
});


const themeStore = useThemeStore();

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

const themeOverrides = computed(() => {
  return {
  };
});
</script>

<template>
  <NConfigProvider :theme="naiveDarkTheme" :theme-overrides="themeOverrides" class="h-full flex">
    <AppProvider>
      <RouterView />
    </AppProvider>
  </NConfigProvider>
</template>

<style></style>
