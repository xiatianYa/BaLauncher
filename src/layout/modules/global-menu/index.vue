<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import expendMenu from './modules/expend-menu.vue';
import collapseMenu from './modules/collapse-menu.vue';

defineOptions({
  name: 'GlobalMenu'
});

const themeStore = useThemeStore();

const activeMenu = computed(() => {
  const menuMap: Record<UnionKey.ThemeLayoutMode, Component> = {
    'expand': expendMenu,
    'collapse': collapseMenu
  };

  return menuMap[themeStore.layout.mode];
});

</script>

<template>
  <component :is="activeMenu" />
</template>

<style scoped lang="scss"></style>