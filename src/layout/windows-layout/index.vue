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
  <!-- 整体页面圆角：窗口四个外角（顶栏上两角、侧边栏左下角、主内容右下角）统一 12px 圆角；卡片相互衔接处一律直角，保证边框无缝连接 -->
  <div class="flex flex-col w-full h-full">
    <WindowControls />
    <div class="flex h-full overflow-hidden">
      <NCard :class="['sidebar-card', themeStore.layout.mode === 'expand' ? 'expanded' : 'collapsed', 'h-full']"
        content-class="flex flex-col" content-style="padding:5px;">
        <WindowsMenu />
        <WindowsHeader />
        <WindowsFooter />
      </NCard>
      <NCard class="main-card" content-class="flex-1 h-full">
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
  /* 衔接处一律直角：与顶栏、主内容卡片贴合无缝；仅左下角保留窗口外圆角（与主卡片右下角统一 12px） */
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 0;
  /* 高度约束：让内部 flex 列（菜单/头部/底部）在容器内排列，避免溢出挤压 */
  height: 100%;
  min-height: 0;
}

/* 主内容卡片：去掉顶边线，与顶部控制栏无缝衔接 */
.main-card {
  border-top: none;
  /* 衔接处一律直角：与顶栏、侧边栏贴合无缝；仅右下角保留窗口外圆角（与侧边栏左下角统一 12px） */
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 12px;
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