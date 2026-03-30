<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { NModal, NButton } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  showCloseConfirm: boolean;
}>();

const emit = defineEmits<{
  // 关闭窗口
  (e: 'update:showCloseConfirm', value: boolean): void;
}>();

const gameStore = useGameStore();
const { t } = useI18n();

// 取消退出：关闭弹窗
const handleCancelExit = () => {
  emit('update:showCloseConfirm', false);  
};

// 确认退出：触发父组件的退出逻辑 + 关闭弹窗
const handleConfirmExit = async () => {
  //停止监听
  await gameStore.stopGameRunningCheck();
  await gameStore.removeGsiDataListener();
  await window.ipcRenderer.invoke('window-close');
  emit('update:showCloseConfirm', false);
};
</script>

<template>
  <NModal v-model:show="props.showCloseConfirm" preset="card" class="w-320px rounded-10px" size="small" :bordered="false"
    :closable="false" :onMaskClick="handleCancelExit">
    <div class="flex flex-col items-center p-4">
      <!-- 退出图标（使用naive-ui的NIcon组件） -->
      <div class="exit-icon">
        <SvgIcon icon="pepicons:leave" />
      </div>
      <!-- 确认文字 -->
      <p class="text-center mb-6 text-base">{{ $t('closeConfirm.title') }}</p>
      <!-- 按钮 -->
      <div class="flex gap-4">
        <NButton @click="handleCancelExit" type="default" ghost strong class="rounded-6px">
          <template #icon>
            <SvgIcon icon="ic:baseline-close" />
          </template>
          {{ $t('closeConfirm.cancel') }}
        </NButton>
        <NButton @click="handleConfirmExit" type="error" ghost strong class="rounded-6px">
          <template #icon>
            <SvgIcon icon="majesticons:door-exit-line" />
          </template>
          {{ $t('closeConfirm.confirm') }}
        </NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.exit-icon {
  font-size: 32px;
  border: 0.5px solid rgba($color: #ef4444, $alpha: 0.2);
  padding: 12px;
  border-radius: 10px;
  background-color: rgba($color: #ef4444, $alpha: 0.1);
  margin-bottom: 15px;
  color: #ef4444;
}
</style>
