<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/store/modules/game';

const gameStore = useGameStore();
const isTrayCollapsed = ref(false);

const emit = defineEmits(['restore']);

const toggleTray = (e: Event) => {
  e.stopPropagation();
  isTrayCollapsed.value = !isTrayCollapsed.value;
};

const handleRestore = () => {
  emit('restore');
};
</script>

<template>
  <div v-if="gameStore.isJoinServerTrayVisible && gameStore.isAutomatic"
    class="fixed right-0 bottom-20px z-999 flex items-center transition-transform duration-300 ease-in-out will-change-transform"
    :class="isTrayCollapsed ? 'translate-x-[calc(100%+20px)]' : 'translate-x-25px'">
    
    <!-- 折叠/展开按钮 -->
    <div 
      class="absolute left-[-16px] w-8 h-8 bg-white rounded-15px shadow-md flex items-center justify-center cursor-pointer border border-gray-100 z-10 hover:bg-gray-50 transition-colors duration-200"
      @click="toggleTray"
    >
      <SvgIcon 
        :icon="isTrayCollapsed ? 'material-symbols:chevron-left' : 'material-symbols:chevron-right'" 
        class="text-gray-600 text-20px transition-transform duration-300"
      />
    </div>

    <div 
      class="bg-white/80 backdrop-blur-md p-3 rounded-l-full shadow-lg border border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-white/90 transition-all duration-300"
      @click="handleRestore"
    >
      <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white relative shrink-0">
        <SvgIcon icon="eos-icons:loading" class="animate-spin text-20px" />
        <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      </div>
      <div class="flex flex-col pr-2 whitespace-nowrap">
        <span class="text-xs font-bold text-gray-700">{{ $t('serverJoin.trayRunning') }}</span>
        <span class="text-xs text-gray-500">{{ $t('serverJoin.trayRestore') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
