<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { localStg } from '@/utils/storage';
import { useI18n } from 'vue-i18n';
import { NModal, NGrid, NGridItem, NButton } from 'naive-ui';
import { ROUTE_STORAGE_KEYS, APP_STORAGE_KEYS, GAME_STORAGE_KEYS, AUTH_STORAGE_KEYS, ALL_STORAGE_KEYS } from '@/constants/cache';

const { t } = useI18n();
const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

const cacheSize = ref('0 KB');
const cacheModalVisible = ref(false);
const cacheUpdateTrigger = ref(0);

type CacheType = {
  label: string;
  value: string;
  key: string;
  icon: string;
  type: 'info' | 'primary' | 'warning' | 'success' | 'error';
}

const cacheTypes: CacheType[] = [
  { label: '游戏数据', value: 'gameSettings', key: 'gameSettings', icon: 'mdi:gamepad-variant', type: 'success' },
  { label: '系统数据', value: 'appSettings', key: 'appSettings', icon: 'mdi:cog', type: 'primary' },
  { label: '用户数据', value: 'authData', key: 'authData', icon: 'mdi:shield-account', type: 'warning' },
  { label: '路由数据', value: 'routeData', key: 'routeData', icon: 'mdi:routes', type: 'info' },
];

const getCacheTypeSize = (type: string) => {
  let size = 0;

  const getKeySize = (key: string) => {
    const value = localStg.get(key as keyof StorageType.Local);
    if (value) {
      size += (key.length + JSON.stringify(value).length) * 2;
    }
  };

  switch (type) {
    case 'gameSettings':
      Object.values(GAME_STORAGE_KEYS).forEach(getKeySize);
      break;
    case 'appSettings':
      Object.values(APP_STORAGE_KEYS).forEach(getKeySize);
      break;
    case 'authData':
      Object.values(AUTH_STORAGE_KEYS).forEach(getKeySize);
      break;
    case 'routeData':
      Object.values(ROUTE_STORAGE_KEYS).forEach(getKeySize);
      break;
  }

  if (size < 1024) {
    return `${size}B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)}KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)}MB`;
  }
};

const selectedCacheTypes = ref<string[]>([]);

const toggleCacheType = (type: string) => {
  const index = selectedCacheTypes.value.indexOf(type);
  if (index === -1) {
    selectedCacheTypes.value.push(type);
  } else {
    selectedCacheTypes.value.splice(index, 1);
  }
};

const calculateCacheSize = () => {
  let size = 0;
  Object.values(ALL_STORAGE_KEYS).forEach((key) => {
    const value = localStg.get(key as keyof StorageType.Local);
    if (value) {
      size += (key.length + JSON.stringify(value).length) * 2;
    }
  });

  if (size < 1024) {
    cacheSize.value = `${size} B`;
  } else if (size < 1024 * 1024) {
    cacheSize.value = `${(size / 1024).toFixed(2)} KB`;
  } else {
    cacheSize.value = `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};

const clearCache = () => {
  selectedCacheTypes.value = [];
  cacheUpdateTrigger.value++;
  cacheModalVisible.value = true;
};

const handleClearCache = () => {
  if (selectedCacheTypes.value.length === 0) {
    window.$message?.warning('请选择要清理的缓存类型');
    return;
  }

  try {
    selectedCacheTypes.value.forEach((type) => {
      switch (type) {
        case 'gameSettings':
          Object.values(GAME_STORAGE_KEYS).forEach(key => localStg.remove(key));
          break;
        case 'appSettings':
          Object.values(APP_STORAGE_KEYS).forEach(key => localStg.remove(key));
          break;
        case 'authData':
          Object.values(AUTH_STORAGE_KEYS).forEach(key => localStg.remove(key));
          break;
        case 'routeData':
          Object.values(ROUTE_STORAGE_KEYS).forEach(key => localStg.remove(key));
          break;
      }
    });

    cacheModalVisible.value = false;
    window.$message?.success('缓存清理成功');

    cacheUpdateTrigger.value++;
    calculateCacheSize();

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    window.$message?.error(t('settings.messages.cacheClearFailed'));
  }
};

watch(() => cacheUpdateTrigger.value, () => {
  calculateCacheSize();
});

defineExpose({
  calculateCacheSize
});
</script>

<template>
  <div class="game-cache-box">
    <div class="game-cache-title mb-10px">
      <div class="flex font-size-24px">
        <SvgIcon icon="octicon:cache-24" />
      </div>
      <div class="ml-10px font-size-16px font-semibold">
        <NText>
          {{ $t('settings.cache.title') }}
        </NText>
      </div>
    </div>
    <div class="game-cache-item justify-between">
      <div class="flex flex-col">
        <div class="text-gray-600 font-bold">{{ $t('settings.cache.size') }}</div>
        <div class="text-12px text-gray-400 mt-2px">{{ $t('settings.cache.size') }} ({{ cacheSize }})</div>
      </div>
      <NButton type="error" ghost @click="clearCache">
        <template #icon>
          <SvgIcon icon="material-symbols:delete-outline" />
        </template>
        {{ $t('settings.cache.clear') }}
      </NButton>
    </div>
  </div>

  <NModal v-model:show="cacheModalVisible" :bordered="true" preset="card"
    class="w-450px rounded-20px cache-modal-wrapper" :class="{ 'light-mode': !isDarkMode }" :closable="false"
    size="small">
    <template #header>
      <div class="flex items-center font-size-18px">
        <div class="font-size-16px">清理缓存</div>
      </div>
    </template>
    <div class="cache-modal-content">
      <div class="capture-header">
        <div class="character-image">
          <img src="@/assets/imgs/setting/538397.png" alt="character" />
        </div>
        <div class="header-glow"></div>
      </div>
      <div class="cache-select-area">
        <p class="mb-10px text-center">请选择要清理的缓存类型</p>
        <NGrid :cols="2" :x-gap="12" :y-gap="12">
          <NGridItem v-for="type in cacheTypes" :key="type.value">
            <NButton class="w-full flex flex-col rounded-5px relative" ghost
              :dashed="!selectedCacheTypes.includes(type.value)"
              :class="{ 'selected': selectedCacheTypes.includes(type.value) }" :type="type.type"
              @click="toggleCacheType(type.value)">
              <div class="flex items-center gap-2">
                <SvgIcon :icon="type.icon" class="text-xl" />
                <span class="text-sm font-medium">{{ type.label }}</span>
              </div>
              <span class="font-size-12px ml-10px w-40px">{{ getCacheTypeSize(type.value) }}</span>
            </NButton>
          </NGridItem>
        </NGrid>
      </div>
    </div>
    <template #footer>
      <div class="w-full flex">
        <NButton class="flex-1 mr-20px rounded-10px" ghost type="info" @click="cacheModalVisible = false">
          <template #icon>
            <SvgIcon icon="mdi:close" />
          </template>
          取消
        </NButton>
        <NButton class="flex-1 ml-20px rounded-10px" ghost type="error" @click="handleClearCache">
          <template #icon>
            <SvgIcon icon="material-symbols:delete-outline" />
          </template>
          确认清理
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.game-cache-box {
  width: 100%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);

  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 6px 25px rgba(139, 92, 246, 0.2);
  }

  .game-cache-title {
    display: flex;
    align-items: center;
  }

  .game-cache-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}

.cache-modal-wrapper {
  :deep(.n-card) {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: none;
    overflow: hidden;
  }

  &.light-mode {
    :deep(.n-card) {
      background: linear-gradient(135deg, #f8f9fc 0%, #eef0f5 100%);
    }

    .cache-modal-content {
      color: #333;

      .capture-header {
        .character-image {
          border-color: rgba(102, 126, 234, 0.6);
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }

        .header-glow {
          background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
        }
      }
    }
  }
}

.cache-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 16px 0;
  color: #fff;
  position: relative;

  .capture-header {
    position: relative;
    width: 100%;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    margin-bottom: 12px;

    .character-image {
      position: relative;
      z-index: 2;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid rgba(102, 126, 234, 0.5);
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .header-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
      z-index: 1;
    }
  }
}
</style>
