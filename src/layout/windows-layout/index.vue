<script setup lang="ts">
import { onMounted } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { useAuthStore } from '@/store/modules/auth';
import WindowControls from '@/components/common/window-controls.vue';
import LoginDialog from '@/components/common/login-dialog.vue';
import BotBindModal from '@/components/tool/bot-bind-modal.vue';

const themeStore = useThemeStore();
const authStore = useAuthStore();

onMounted(() => {
  if (!authStore.isLogin) {
    authStore.loginModalVisibel = true;
  }
});

</script>

<template>
  <!-- 整体页面圆角：外层留 10px 边距，圆角直接加在各卡片外圈对应角（边框随圆角走，不被裁剪） -->
  <div class="flex flex-col w-full h-full">
    <WindowControls />
    <div class="flex h-full overflow-hidden">
      <NCard :class="['sidebar-card', themeStore.layout.mode === 'expand' ? 'expanded' : 'collapsed', 'rounded-bl-16px', 'h-full']"
        content-class="flex flex-col" content-style="padding:5px;">
        <WindowsMenu />
        <WindowsHeader />
        <WindowsFooter />
      </NCard>
      <NCard class="main-card overflow-hidden" content-class="flex-1 h-full">
        <RouterView />
      </NCard>
    </div>
    <LoginDialog />
    <BotBindModal />
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
  border-right: none;
  /* 高度约束：让内部 flex 列（菜单/头部/底部）在容器内排列，避免溢出挤压 */
  height: 100%;
  min-height: 0;
}

/* 主内容卡片：去掉顶边线，与顶部控制栏无缝衔接 */
.main-card {
  border-top: none;
}

/* 展开状态的宽度 */
.expanded {
  width: 250px;
}

/* 折叠状态的宽度 */
.collapsed {
  width: 120px;
}

/* 可选：为子元素添加过渡效果，使内容变化更平滑 */
:deep(.n-card-content) {
  transition: all 0.3s ease-in-out;
}

/* 侧边栏卡片内容区：min-height:0 允许收缩，使菜单区域能够在内部滚动，避免把头部/底部挤出页面 */
.sidebar-card :deep(.n-card-content) {
  min-height: 0;
  overflow: hidden;
}
</style>