<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';

const themeStore = useThemeStore();

const icons: Record<UnionKey.ThemeScheme, string> = {
  light: 'material-symbols:sunny-outline',
  dark: 'material-symbols:nightlight-outline',
};


const changeThemeLayout = () => {
  if (themeStore.layout.mode === 'expand') {
    themeStore.setThemeLayout('collapse')
  } else {
    themeStore.setThemeLayout('expand')
  }
}
</script>

<template>
  <div class="flex justify-center mb-5px global-footer">
    <ButtonIcon icon="solar:round-alt-arrow-right-outline" @click="changeThemeLayout()" class="w-full"></ButtonIcon>
  </div>
</template>

<style scoped lang="scss">
.global-footer {
  width: 100%;    
  display: flex;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(95, 92, 92, 0.3);
}
</style>