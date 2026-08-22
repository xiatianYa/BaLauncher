<script setup lang="ts">
import { createTextVNode, defineComponent, onMounted } from 'vue';
import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui';
import { useAppStore } from '@/store/modules/app';

defineOptions({
  name: 'AppProvider'
});

const appStore = useAppStore();

// 应用启动时将持久化的消息提示框位置同步给主进程（地图订阅等系统浮动通知窗口定位使用）
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
        <NMessageProvider>
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
