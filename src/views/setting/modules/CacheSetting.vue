<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton } from 'naive-ui'
import { $t } from '@/locales'
import {
  clearLocalCache,
  formatBytes,
  getLocalStorageSize,
  getScopeStorageSize,
  type CacheScope,
} from '@/utils/cache'

const cacheSize = ref('0 KB')
const cacheModalVisible = ref(false)
const cacheUpdateTrigger = ref(0)

type CacheType = {
  label: string
  value: string
  key: string
  icon: string
  type: 'info' | 'primary' | 'warning' | 'success' | 'error'
}

const cacheTypes: CacheType[] = [
  { label: $t('settings.cache.types.gameSettings'), value: 'gameSettings', key: 'gameSettings', icon: 'mdi:gamepad-variant', type: 'success' },
  { label: $t('settings.cache.types.appSettings'), value: 'appSettings', key: 'appSettings', icon: 'mdi:cog', type: 'primary' },
  { label: $t('settings.cache.types.authData'), value: 'authData', key: 'authData', icon: 'mdi:shield-account', type: 'warning' },
  { label: $t('settings.cache.types.routeData'), value: 'routeData', key: 'routeData', icon: 'mdi:routes', type: 'info' },
  { label: $t('settings.cache.types.imageCache'), value: 'imageCache', key: 'imageCache', icon: 'mdi:image-multiple', type: 'info' },
]

/** 缓存类型 -> 清除范围（对应全局缓存清理函数 clearLocalCache 的 scope） */
const CACHE_TYPE_SCOPE: Record<string, CacheScope> = {
  gameSettings: 'game',
  appSettings: 'app',
  authData: 'auth',
  routeData: 'route',
  imageCache: 'image',
}

/** 图片磁盘缓存大小（通过 IPC 查询） */
const imageCacheSize = ref('0 KB')

/** 查询图片缓存大小 */
const loadImageCacheSize = async () => {
  try {
    const info = await window.ipcRenderer.getImageCacheInfo()
    imageCacheSize.value = formatBytes(info.totalSize)
  } catch {
    imageCacheSize.value = '0 KB'
  }
}

const getCacheTypeSize = (type: string) => {
  if (type === 'imageCache') return imageCacheSize.value
  // 其余类型按 scope 统一从 cache.ts 统计（localStorage 占用）
  const scope = CACHE_TYPE_SCOPE[type]
  return scope ? formatBytes(getScopeStorageSize(scope as Exclude<CacheScope, 'image'>)) : '0 B'
}

const selectedCacheTypes = ref<string[]>([])

const toggleCacheType = (type: string) => {
  const index = selectedCacheTypes.value.indexOf(type)
  if (index === -1) {
    selectedCacheTypes.value.push(type)
  } else {
    selectedCacheTypes.value.splice(index, 1)
  }
}

const calculateCacheSize = async () => {
  // localStorage 占用统一从 cache.ts 统计
  let size = getLocalStorageSize()

  // 加上图片磁盘缓存大小
  try {
    const info = await window.ipcRenderer.getImageCacheInfo()
    size += info.totalSize
  } catch {
    // 忽略 IPC 调用失败
  }

  cacheSize.value = formatBytes(size)
}

const clearCache = () => {
  selectedCacheTypes.value = []
  cacheUpdateTrigger.value++
  cacheModalVisible.value = true
}

const handleClearCache = async () => {
  if (selectedCacheTypes.value.length === 0) {
    window.$message?.warning($t('settings.cache.selectType'))
    return
  }

  try {
    // 统一走全局缓存清理函数，按所选类型映射为对应 scope
    const scopes = selectedCacheTypes.value.map((type) => CACHE_TYPE_SCOPE[type])
    await clearLocalCache(scopes)

    cacheModalVisible.value = false
    window.$message?.success($t('settings.cache.success'))

    cacheUpdateTrigger.value++
    calculateCacheSize()
    loadImageCacheSize()

    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    window.$message?.error($t('settings.messages.cacheClearFailed'))
  }
}

watch(() => cacheUpdateTrigger.value, async () => {
  await calculateCacheSize()
  await loadImageCacheSize()
})

// 初始化时加载图片缓存大小
loadImageCacheSize()

defineExpose({
  calculateCacheSize,
  loadImageCacheSize,
})
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="octicon:cache-24" class="section-icon" />
        <NText>{{ $t('settings.cache.title') }}</NText>
      </div>
    </div>

    <div class="section-content">
      <div class="cache-row">
        <div class="cache-info">
          <div class="cache-label">{{ $t('settings.cache.size') }}</div>
          <div class="cache-value">{{ cacheSize }}</div>
        </div>
        <NButton type="error" ghost @click="clearCache">
          <template #icon>
            <SvgIcon icon="material-symbols:delete-outline" />
          </template>
          {{ $t('settings.cache.clear') }}
        </NButton>
      </div>
    </div>
  </section>

  <div v-if="cacheModalVisible" class="cache-modal-overlay" @click.self="cacheModalVisible = false">
    <div class="cache-modal">
      <div class="cache-modal-header">
        <div class="cache-modal-title">
          <SvgIcon icon="mdi:broom" class="cache-modal-title-icon" />
          <span>{{ $t('settings.cache.clear') }}</span>
        </div>
        <div class="cache-modal-close" @click="cacheModalVisible = false">
          <SvgIcon icon="mdi:close" />
        </div>
      </div>

      <div class="cache-modal-body">
        <div class="cache-type-grid">
          <div v-for="type in cacheTypes" :key="type.value" class="cache-type-card"
            :class="{ selected: selectedCacheTypes.includes(type.value), [type.type]: true }"
            @click="toggleCacheType(type.value)">
            <SvgIcon :icon="type.icon" class="cache-type-card-icon" />
            <span class="cache-type-card-label">{{ type.label }}</span>
            <span class="cache-type-card-size">{{ getCacheTypeSize(type.value) }}</span>
          </div>
        </div>
      </div>

      <div class="cache-modal-footer">
        <button class="cache-btn cache-btn-cancel" @click="cacheModalVisible = false">
          <SvgIcon icon="mdi:close" />
          <span>{{ $t('common.cancel') }}</span>
        </button>
        <button class="cache-btn cache-btn-confirm" @click="handleClearCache">
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
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .section-icon {
      font-size: 20px;
      color: var(--primary-color, #18a058);
    }
  }
}

.cache-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);

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
      color: var(--n-text-color-3);
    }
  }
}

.cache-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.cache-modal {
  width: 420px;
  max-width: 90vw;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.cache-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--n-border-color);
}

.cache-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--n-text-color);

  .cache-modal-title-icon {
    font-size: 20px;
    color: var(--primary-color, #18a058);
  }
}

.cache-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--n-text-color-3);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--n-text-color);
    background-color: var(--n-close-color-hover, rgba(128, 128, 128, 0.12));
  }
}

.cache-modal-body {
  padding: 20px;
  color: var(--n-text-color);
}

.cache-type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.cache-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 1px dashed var(--n-border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &.info { --type-color: #2080f0; --type-rgb: 32, 128, 240; }
  &.primary { --type-color: #18a058; --type-rgb: 24, 160, 88; }
  &.warning { --type-color: #f0a020; --type-rgb: 240, 160, 32; }
  &.success { --type-color: #18a058; --type-rgb: 24, 160, 88; }
  &.error { --type-color: #d03050; --type-rgb: 208, 48, 80; }

  &:hover {
    border-color: var(--type-color);
    background-color: rgba(var(--type-rgb), 0.06);
  }

  &.selected {
    border-style: solid;
    border-color: var(--type-color);
    background-color: rgba(var(--type-rgb), 0.12);
  }

  .cache-type-card-icon {
    font-size: 26px;
    color: var(--type-color);
  }

  .cache-type-card-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color);
  }

  .cache-type-card-size {
    font-size: 12px;
    color: var(--n-text-color-3);
  }
}

.cache-modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 20px 20px;
}

.cache-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    line-height: 1;
  }
}

.cache-btn-cancel {
  color: var(--n-text-color);
  background-color: transparent;
  border: 1px solid var(--n-border-color);

  &:hover {
    background-color: var(--n-close-color-hover, rgba(128, 128, 128, 0.12));
  }
}

.cache-btn-confirm {
  color: #fff;
  background-color: #d03050;

  &:hover {
    background-color: #b92542;
  }
}
</style>
