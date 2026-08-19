<script setup lang="ts">
import { createTextVNode, defineComponent, computed, onMounted } from 'vue';
import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui';
import { useAppStore } from '@/store/modules/app';

defineOptions({
  name: 'AppProvider'
});

const appStore = useAppStore();

/** 九宫格位置 key → naive message placement（中列/中排无对应值，就近映射到最近的对齐位置） */
const MESSAGE_PLACEMENT_MAP: Record<string, 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'> = {
  'top-left': 'top-left',
  'top-center': 'top',
  'top-right': 'top-right',
  'middle-left': 'top-left',
  center: 'top',
  'middle-right': 'top-right',
  'bottom-left': 'bottom-left',
  'bottom-center': 'bottom',
  'bottom-right': 'bottom-right'
};

/** 消息提示框显示位置（未匹配时回退到顶部） */
const messagePlacement = computed(() => MESSAGE_PLACEMENT_MAP[appStore.messagePosition] ?? 'top');

// 应用启动时将持久化的消息提示框位置同步给主进程（地图订阅等系统通知窗口定位使用）
onMounted(() => {
  window.ipcRenderer?.updateNotificationPosition(appStore.messagePosition);
});

const ContextHolder = defineComponent({
  name: 'ContextHolder',
  setup() {
    function register() {
      window.$loadingBar = useLoadingBar();
      window.$dialog = useDialog();
      window.$message = useMessage();
      window.$notification = useNotification();
    }

    register();

    return () => createTextVNode();
  }
});
</script>

<template>
  <NLoadingBarProvider>
    <NDialogProvider>
      <NNotificationProvider>
        <NMessageProvider :placement="messagePlacement">
          <ContextHolder />
          <LoginDialog />
          <UpdateConfirm />
          <slot></slot>
        </NMessageProvider>
      </NNotificationProvider>
    </NDialogProvider>
  </NLoadingBarProvider>
</template>

<style scoped lang="scss"></style>
