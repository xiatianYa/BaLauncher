<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import expendHeader from './modules/expend-header.vue';
import collapHeader from './modules/collapse-header.vue';

defineOptions({
    name: 'GlobalHeader'
});

const themeStore = useThemeStore();

const activeMenu = computed(() => {
    const menuMap: Record<UnionKey.ThemeLayoutMode, Component> = {
        'expand': expendHeader,
        'collapse': collapHeader
    };

    return menuMap[themeStore.layout.mode];
});

</script>

<template>
    <component :is="activeMenu" />
</template>

<style scoped lang="scss"></style>