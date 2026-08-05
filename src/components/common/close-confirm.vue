<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { NModal } from 'naive-ui';

const props = defineProps<{
  showCloseConfirm: boolean;
}>();

const emit = defineEmits<{
  // 关闭窗口
  (e: 'update:showCloseConfirm', value: boolean): void;
}>();

const gameStore = useGameStore();

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
  <NModal v-model:show="props.showCloseConfirm" preset="card" class="w-320px rounded-10px" size="small"
    :bordered="false" :closable="false" :onMaskClick="handleCancelExit">
    <div class="flex flex-col items-center p-4">
      <!-- 退出图标（使用naive-ui的NIcon组件） -->
      <div class="exit-icon">
        <SvgIcon icon="pepicons:leave" />
      </div>
      <!-- 确认文字 -->
      <p class="text-center text-base">{{ $t('closeConfirm.title') }}</p>
      <!-- 温馨提示 -->
      <p class="exit-hint">{{ $t('closeConfirm.hint') }}</p>
      <!-- 按钮 -->
      <div class="flex gap-4">
        <button class="dialog-btn cancel-btn" @click="handleCancelExit">
          <SvgIcon icon="ic:baseline-close" class="btn-icon" />
          {{ $t('closeConfirm.cancel') }}
        </button>
        <button class="dialog-btn confirm-btn" @click="handleConfirmExit">
          <SvgIcon icon="majesticons:door-exit-line" class="btn-icon" />
          {{ $t('closeConfirm.confirm') }}
        </button>
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

/* 温馨提示 */
.exit-hint {
  margin: 6px 0 24px;
  max-width: 230px;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
  color: var(--n-text-color-3);
}

/* 自定义卡片按钮（botGroup 风格） */
.dialog-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;

  .btn-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  /* 取消按钮：跟随主题，hover 品牌色 */
  &.cancel-btn {
    background: transparent;
    border: 1px solid var(--n-border-color);
    color: var(--n-text-color-2);

    &:hover {
      background: rgba(102, 126, 234, 0.08);
      border-color: #667eea;
      color: #667eea;
      transform: translateY(-1px);
    }
  }

  /* 确认退出按钮：红色警示 */
  &.confirm-btn {
    background: rgba(232, 17, 35, 0.1);
    border: 1px solid rgba(232, 17, 35, 0.35);
    color: #ff4757;

    &:hover {
      background: #ff4757;
      color: #fff;
      transform: translateY(-1px);
    }
  }
}
</style>
