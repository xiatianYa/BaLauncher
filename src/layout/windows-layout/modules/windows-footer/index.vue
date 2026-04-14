<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import expendFooter from './modules/expend-footer.vue';
import collapseFooter from './modules/collapse-footer.vue';

defineOptions({
  name: 'GlobalFooter'
});

const themeStore = useThemeStore();

const activeMenu = computed(() => {
  const menuMap: Record<UnionKey.ThemeLayoutMode, Component> = {
    'expand': expendFooter,
    'collapse': collapseFooter
  };

  return menuMap[themeStore.layout.mode];
});

</script>

<template>
  <component :is="activeMenu" />
</template>

<style scoped lang="scss"></style>