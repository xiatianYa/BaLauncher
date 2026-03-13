<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { NModal, NButton } from 'naive-ui';
import { onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  showGameConfirm: boolean;
}>();

const emit = defineEmits<{
  // 关闭窗口
  (e: 'update:showGameConfirm', value: boolean): void;
}>();

const gameStore = useGameStore();
const { t } = useI18n();

// 取消退出：关闭弹窗
const handleCancelExit = () => {
  emit('update:showGameConfirm', false);
};

// 确认打开游戏
const handleConfirmOpen = async () => {
  const success = await gameStore.startGame();
  if (success) {
    gameStore.connectServerUsingSteamUrl();
    emit('update:showGameConfirm', false);
  }
};

onUnmounted(() => {
  gameStore.isGameLaunching = false;
});
</script>

<template>
  <NModal v-model:show="props.showGameConfirm" preset="card" class="w-320px rounded-md" size="small" :bordered="false"
    :closable="false" :mask-closable="!gameStore.isGameLaunching" :close-on-esc="!gameStore.isGameLaunching">
    <div class="flex flex-col items-center p-4">
      <!-- 退出图标（使用naive-ui的NIcon组件） -->
      <div class="exit-icon">
        <SvgIcon icon="streamline:desktop-game" />
      </div>
      <!-- 确认文字 -->
      <p class="text-center mb-4 text-base">{{ $t('server.openGame.title') }}</p>
      <!-- 按钮 -->
      <div class="flex gap-4">
        <NButton @click="handleCancelExit" type="error" ghost strong class="rounded-6px"
          :disabled="gameStore.isGameLaunching">
          <template #icon>
            <SvgIcon icon="ic:baseline-close" />
          </template>
          {{ $t('server.openGame.cancel') }}
        </NButton>
        <NButton type="success" ghost strong class="rounded-6px" @click="handleConfirmOpen"
          :loading="gameStore.isGameLaunching">
          <template #icon>
            <SvgIcon icon="hugeicons:start-up-02" />
          </template>
          {{ gameStore.isGameLaunching ? t('server.openGame.launching') : t('server.openGame.start') }}
        </NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.exit-icon {
  font-size: 32px;
  border: 0.5px solid rgba($color: #90cbfb, $alpha: 0.7);
  padding: 12px;
  border-radius: 10px;
  background-color: rgba($color: #90cbfb, $alpha: 0.1);
  margin-bottom: 15px;
  color: #90cbfb;
}
</style>
