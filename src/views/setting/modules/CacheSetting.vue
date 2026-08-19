<script setup lang="ts">
import { ref, watch } from 'vue';
import { $t } from '@/locales';
import {
  clearLocalCache,
  formatBytes,
  getLocalStorageSize,
  getScopeStorageSize,
  type CacheScope,
} from '@/utils/cache';

const cacheSize = ref('0 KB');
const cacheModalVisible = ref(false);
const cacheUpdateTrigger = ref(0);

type CacheType = {
  label: string
  value: string
  key: string
  icon: string
  color: string
}

const cacheTypes: CacheType[] = [
  { label: $t('settings.cache.types.gameSettings'), value: 'gameSettings', key: 'gameSettings', icon: 'mdi:gamepad-variant', color: '#10b981' },
  { label: $t('settings.cache.types.appSettings'), value: 'appSettings', key: 'appSettings', icon: 'mdi:cog', color: '#667eea' },
  { label: $t('settings.cache.types.authData'), value: 'authData', key: 'authData', icon: 'mdi:shield-account', color: '#f0a020' },
  { label: $t('settings.cache.types.routeData'), value: 'routeData', key: 'routeData', icon: 'mdi:routes', color: '#3b82f6' },
  { label: $t('settings.cache.types.imageCache'), value: 'imageCache', key: 'imageCache', icon: 'mdi:image-multiple', color: '#3b82f6' },
];

/** 缓存类型 -> 清除范围 */
const CACHE_TYPE_SCOPE: Record<string, CacheScope> = {
  gameSettings: 'game',
  appSettings: 'app',
  authData: 'auth',
  routeData: 'route',
  imageCache: 'image',
};

const imageCacheSize = ref('0 KB');

const loadImageCacheSize = async () => {
  try {
    const info = await window.ipcRenderer.getImageCacheInfo();
    imageCacheSize.value = formatBytes(info.totalSize);
  } catch {
    imageCacheSize.value = '0 KB';
  }
};

const getCacheTypeSize = (type: string) => {
  if (type === 'imageCache') return imageCacheSize.value;
  const scope = CACHE_TYPE_SCOPE[type];
  return scope ? formatBytes(getScopeStorageSize(scope as Exclude<CacheScope, 'image'>)) : '0 B';
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

const calculateCacheSize = async () => {
  let size = getLocalStorageSize();
  try {
    const info = await window.ipcRenderer.getImageCacheInfo();
    size += info.totalSize;
  } catch {
    // ignore
  }
  cacheSize.value = formatBytes(size);
};

const clearCache = () => {
  selectedCacheTypes.value = [];
  cacheUpdateTrigger.value++;
  cacheModalVisible.value = true;
};

const handleClearCache = async () => {
  if (selectedCacheTypes.value.length === 0) {
    window.$message?.warning($t('settings.cache.selectType'));
    return;
  }

  try {
    const scopes = selectedCacheTypes.value.map(type => CACHE_TYPE_SCOPE[type]);
    await clearLocalCache(scopes);
    cacheModalVisible.value = false;
    window.$message?.success($t('settings.cache.success'));

    cacheUpdateTrigger.value++;
    calculateCacheSize();
    loadImageCacheSize();

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch {
    window.$message?.error($t('settings.messages.cacheClearFailed'));
  }
};

watch(() => cacheUpdateTrigger.value, async () => {
  await calculateCacheSize();
  await loadImageCacheSize();
});

loadImageCacheSize();

defineExpose({ calculateCacheSize, loadImageCacheSize });
</script>

<template>
  <!-- 组件有多个根节点（section + 弹窗），无法自动继承父级传入的 class/style，需手动绑定 $attrs，
       使设置页下发的 setting-section 卡片样式与 --delay 错落动画生效；弹窗保持独立根节点，
       避免被根节点的 transform 动画影响 fixed 定位 -->
  <section class="setting-section" v-bind="$attrs">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="octicon:cache-24" class="section-icon" />
        <span class="section-text">{{ $t('settings.cache.title') }}</span>
      </div>
    </div>

    <div class="section-content">
      <div class="setting-card">
        <div class="cache-info">
          <div class="cache-label">{{ $t('settings.cache.size') }}</div>
          <div class="cache-value">{{ cacheSize }}</div>
        </div>
        <button class="clear-btn" @click="clearCache">
          <SvgIcon icon="material-symbols:delete-outline" class="btn-icon" />
          <span>{{ $t('settings.cache.clear') }}</span>
        </button>
      </div>
    </div>
  </section>

  <!-- 清除缓存弹窗 -->
  <div v-if="cacheModalVisible" class="cache-modal-overlay" @click.self="cacheModalVisible = false">
    <div class="cache-modal">
      <div class="cache-modal-header">
        <div class="cache-modal-title">
          <SvgIcon icon="mdi:broom" class="cache-modal-title-icon" />
          <span>{{ $t('settings.cache.clear') }}</span>
        </div>
        <button class="cache-modal-close" @click="cacheModalVisible = false">
          <SvgIcon icon="mdi:close" />
        </button>
      </div>

      <div class="cache-modal-body">
        <div class="cache-type-grid">
          <div
            v-for="type in cacheTypes"
            :key="type.value"
            class="cache-type-card"
            :class="{ selected: selectedCacheTypes.includes(type.value) }"
            :style="{ '--type-color': type.color }"
            @click="toggleCacheType(type.value)"
          >
            <SvgIcon :icon="type.icon" class="cache-type-card-icon" />
            <span class="cache-type-card-label">{{ type.label }}</span>
            <span class="cache-type-card-size">{{ getCacheTypeSize(type.value) }}</span>
          </div>
        </div>
      </div>

      <div class="cache-modal-footer">
        <button class="cache-btn cancel" @click="cacheModalVisible = false">
          <SvgIcon icon="mdi:close" />
          <span>{{ $t('common.cancel') }}</span>
        </button>
        <button class="cache-btn confirm" @click="handleClearCache">
          <SvgIcon icon="material-symbols:delete-outline" />
          <span>{{ $t('settings.cache.confirmClear') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.setting-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;

    .section-icon {
      font-size: 20px;
      color: #667eea;
    }

    .section-text {
      font-size: 15px;
      font-weight: 600;
      color: var(--n-text-color);
    }
  }
}

/* ===== 主卡片 ===== */

.setting-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--app-rgb), 0.025);
  border: 1px solid rgba(var(--app-rgb), 0.07);

  .cache-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .cache-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--n-text-color);
    }

    .cache-value {
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.4);
    }
  }
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  transition: all 0.2s ease;
  white-space: nowrap;

  .btn-icon {
    font-size: 15px;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
}

/* ===== 弹窗 ===== */

.cache-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.cache-modal {
  width: 420px;
  max-width: 90vw;
  background: var(--n-color);
  border: 1px solid rgba(var(--app-rgb), 0.1);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.cache-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--app-rgb), 0.06);
}

.cache-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);

  .cache-modal-title-icon {
    font-size: 20px;
    color: #667eea;
  }
}

.cache-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  color: rgba(var(--app-rgb), 0.4);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: rgba(var(--app-rgb), 0.8);
    background: rgba(var(--app-rgb), 0.1);
  }
}

.cache-modal-body {
  padding: 20px;
}

.cache-type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.cache-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 1px solid rgba(var(--app-rgb), 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: rgba(var(--app-rgb), 0.03);
  }

  &.selected {
    border-color: var(--type-color);
    background: rgba(var(--type-color), 0.08);

    .cache-type-card-label {
      color: var(--type-color);
    }
  }

  .cache-type-card-icon {
    font-size: 26px;
    color: var(--type-color);
  }

  .cache-type-card-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--n-text-color);
  }

  .cache-type-card-size {
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.4);
  }
}

.cache-modal-footer {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px;
}

.cache-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &.cancel {
    color: rgba(var(--app-rgb), 0.55);
    background: rgba(var(--app-rgb), 0.06);
    border: 1px solid rgba(var(--app-rgb), 0.08);

    &:hover {
      background: rgba(var(--app-rgb), 0.12);
    }
  }

  &.confirm {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);

    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  }
}
</style>
