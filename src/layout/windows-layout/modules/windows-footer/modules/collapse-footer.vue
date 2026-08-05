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
    <button class="footer-btn" @click="changeThemeLayout()">
      <SvgIcon icon="solar:round-alt-arrow-right-outline" class="footer-btn-icon" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.global-footer {
  width: 100%;
  display: flex;
  gap: 6px;
}

/* 自定义工具按钮 */
.footer-btn {
  flex: 1;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(102, 126, 234, 0.4);
    color: #667eea;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  .footer-btn-icon {
    font-size: 17px;
  }
}
</style>
