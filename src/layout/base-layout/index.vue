<script setup lang="ts">
import { onMounted } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { useAuthStore } from '@/store/modules/auth';
import WindowControls from '@/components/common/window-controls.vue';
import LoginDialog from '@/components/common/login-dialog.vue';
import UpdateConfirm from '@/components/common/update-confirm.vue';

const themeStore = useThemeStore();
const authStore = useAuthStore();

onMounted(() => {
  if (!authStore.isLogin) {
    authStore.loginModalVisibel = true;
  }
});

</script>

<template>
  <div class="flex flex-col w-full h-full">
    <WindowControls />
    <div class="flex flex-1 overflow-hidden">
      <NCard :class="['sidebar-card', themeStore.layout.mode === 'expand' ? 'expanded' : 'collapsed', 'rounded-none']"
        content-class="flex flex-col" content-style="padding:5px;">
        <GlobalMenu />
        <GlobalHeader />
        <GlobalFooter />
      </NCard>
      <NCard class="rounded-none" content-class="flex-1 h-full" :bordered="false">
        <RouterView class="animate__animated animate__fadeInRight animate__faster" />
      </NCard>
    </div>
    <LoginDialog />
    <UpdateConfirm />
  </div>
</template>

<style scoped lang="scss">
.sidebar-card {
  transition:
    width 0.3s ease-in-out,
    background-color 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    fill 0.3s ease,
    stroke 0.3s ease !important;
  border-top: none;
}

/* 展开状态的宽度 */
.expanded {
  width: 230px;
}

/* 折叠状态的宽度 */
.collapsed {
  width: 120px;
}

/* 可选：为子元素添加过渡效果，使内容变化更平滑 */
:deep(.n-card-content) {
  transition: all 0.3s ease-in-out;
}
</style>