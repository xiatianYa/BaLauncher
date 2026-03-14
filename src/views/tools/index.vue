<script setup lang="ts">
import { NGrid, NGridItem, NCard } from 'naive-ui';
import { ref, computed } from 'vue';
import type { Component } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import KeyBind from './modules/keyBind.vue';
import MapOrder from './modules/mapOrder.vue';
import { $t } from '@/locales';

defineOptions({
  name: 'tools'
});

interface ToolModule {
  label: string;
  component: Component;
}

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

const moduleMap: Record<UnionKey.ToolModule, ToolModule> = {
  'keyBind': { label: $t('tools.keyBind'), component: KeyBind },
  'mapOrder': { label: $t('tools.mapOrder'), component: MapOrder },
};

const activeModuleKey = ref<UnionKey.ToolModule | null>(null);
const activeModule = computed(() => activeModuleKey.value ? moduleMap[activeModuleKey.value] : null);

interface ToolItem {
  id: UnionKey.ToolModule;
  icon: string;
  gradient: string;
  color: string;
  delay: number;
}

const tools = ref<ToolItem[]>([
  {
    id: 'keyBind',
    icon: 'material-symbols:keyboard-alt-outline',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea',
    delay: 0
  },
  {
    id: 'mapOrder',
    icon: 'material-symbols:map-outline',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#f5576c',
    delay: 0.1
  }
]);

const getToolTitle = (id: UnionKey.ToolModule) => {
  const keyMap: Record<UnionKey.ToolModule, string> = {
    'keyBind': 'tools.keyBindTitle',
    'mapOrder': 'tools.mapOrderTitle'
  };
  return $t(keyMap[id]);
};

const getToolDescription = (id: UnionKey.ToolModule) => {
  const keyMap: Record<UnionKey.ToolModule, string> = {
    'keyBind': 'tools.keyBindDesc',
    'mapOrder': 'tools.mapOrderDesc'
  };
  return $t(keyMap[id]);
};

const handleToolClick = (tool: ToolItem) => {
  activeModuleKey.value = tool.id;
};
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }" v-if="!activeModuleKey">
      <template #header>
        <div class="relative">
          <div class="flex items-center mb-5px">
            <h1 class="text-18px font-bold mr-2">{{ $t('tools.title') }}</h1>
            <SvgIcon icon="gg:toolbox" class="text-20px" />
          </div>
          <div class="text-12px color-#666 font-bold">{{ $t('tools.subtitle') }}</div>
        </div>
      </template>
      <!-- Tools Grid or Module View -->
      <div class="relative px-4 pb-4 overflow-y-auto flex-1">
        <!-- 工具卡片列表 -->
        <div class="tools-grid">
          <NGrid :x-gap="24" :y-gap="24" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="tool in tools" :key="tool.id" span="4 s:2 m:1 l:1">
              <div class="tool-card" :class="{ 'light-mode': !isDarkMode }" :style="{
                '--gradient': tool.gradient,
                '--color': tool.color,
                '--delay': `${tool.delay}s`
              }" @click="handleToolClick(tool)">
                <div class="card-content">
                  <div class="icon-wrapper font-size-18px">
                    <SvgIcon :icon="tool.icon" class="tool-icon" />
                  </div>
                  <div class="card-info">
                    <h3 class="tool-title">{{ getToolTitle(tool.id) }}</h3>
                    <p class="tool-description">{{ getToolDescription(tool.id) }}</p>
                  </div>
                  <div class="card-arrow">
                    <SvgIcon icon="mdi:arrow-right" />
                  </div>
                </div>
                <div class="card-bg-glow"></div>
                <div class="card-particles">
                  <span v-for="i in 3" :key="i" class="particle" :style="{ '--i': i }"></span>
                </div>
              </div>
            </NGridItem>
          </NGrid>
        </div>
      </div>
    </NCard>
    <NCard class="m-10px rounded-10px" content-style="padding:15px;" :bordered="false"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }" v-else-if="activeModule">
      <component :is="activeModule.component" />
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
.module-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-color-2);
  transition: color 0.3s ease;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:hover {
    color: var(--primary-color);
    background: rgba(255, 255, 255, 0.06);
  }
}

.module-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tool-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;

  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: var(--color);

    .card-bg-glow {
      opacity: 0.4;
      transform: scale(1.5);
    }

    .icon-wrapper {
      transform: scale(1.1) rotate(5deg);
      box-shadow: 0 0 30px var(--color);
    }

    .card-arrow {
      transform: translateX(8px);
      opacity: 1;
    }

    .particle {
      animation-play-state: running;
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--gradient);
    opacity: 0;
    transition: opacity 0.4s ease;
    border-radius: 16px;
    pointer-events: none;
  }

  &:hover::before {
    opacity: 0.1;
  }

  &.light-mode {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.08);

    &:hover {
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.1),
        0 0 30px rgba(0, 0, 0, 0.05),
        inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    }

    &:hover::before {
      opacity: 0.08;
    }

    .tool-title {
      color: #1a1a1a;
    }

    .tool-description {
      color: rgba(0, 0, 0, 0.6);
      //超出1行就省略
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-arrow {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.4);
    }
  }
}

.card-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.tool-icon {
  font-size: 32px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  transition: color 0.3s ease;
}

.tool-description {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
}

.card-arrow {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.4s ease;
  opacity: 0.5;
  font-size: 18px;
}

.card-bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  background: var(--gradient);
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5);
  transition: all 0.6s ease;
  z-index: 1;
}

.card-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--color);
  border-radius: 50%;
  opacity: 0;
  animation: floatParticle 3s ease-in-out infinite;
  animation-play-state: paused;
  animation-delay: calc(var(--i) * 0.3s);

  &:nth-child(1) {
    top: 20%;
    left: 20%;
  }

  &:nth-child(2) {
    top: 60%;
    left: 80%;
  }

  &:nth-child(3) {
    top: 80%;
    left: 40%;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes floatParticle {

  0%,
  100% {
    opacity: 0;
    transform: translateY(0) scale(1);
  }

  50% {
    opacity: 0.8;
    transform: translateY(-20px) scale(1.5);
  }
}
</style>
