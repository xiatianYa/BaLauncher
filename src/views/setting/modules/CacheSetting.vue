<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NButton } from 'naive-ui'
import { useThemeStore } from '@/store/modules/theme'
import { localStg } from '@/utils/storage'
import { $t } from '@/locales'
import {
  ROUTE_STORAGE_KEYS,
  APP_STORAGE_KEYS,
  GAME_STORAGE_KEYS,
  AUTH_STORAGE_KEYS,
  ALL_STORAGE_KEYS,
} from '@/constants/cache'

const themeStore = useThemeStore()
const isDarkMode = computed(() => themeStore.darkMode)

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
  { label: '游戏数据', value: 'gameSettings', key: 'gameSettings', icon: 'mdi:gamepad-variant', type: 'success' },
  { label: '系统数据', value: 'appSettings', key: 'appSettings', icon: 'mdi:cog', type: 'primary' },
  { label: '用户数据', value: 'authData', key: 'authData', icon: 'mdi:shield-account', type: 'warning' },
  { label: '路由数据', value: 'routeData', key: 'routeData', icon: 'mdi:routes', type: 'info' },
]

const getCacheTypeSize = (type: string) => {
  let size = 0

  const getKeySize = (key: string) => {
    const value = localStg.get(key as keyof StorageType.Local)
    if (value) {
      size += (key.length + JSON.stringify(value).length) * 2
    }
  }

  switch (type) {
    case 'gameSettings':
      Object.values(GAME_STORAGE_KEYS).forEach(getKeySize)
      break
    case 'appSettings':
      Object.values(APP_STORAGE_KEYS).forEach(getKeySize)
      break
    case 'authData':
      Object.values(AUTH_STORAGE_KEYS).forEach(getKeySize)
      break
    case 'routeData':
      Object.values(ROUTE_STORAGE_KEYS).forEach(getKeySize)
      break
  }

  if (size < 1024) {
    return `${size}B`
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)}KB`
  }
  return `${(size / (1024 * 1024)).toFixed(2)}MB`
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

const calculateCacheSize = () => {
  let size = 0
  Object.values(ALL_STORAGE_KEYS).forEach((key) => {
    const value = localStg.get(key as keyof StorageType.Local)
    if (value) {
      size += (key.length + JSON.stringify(value).length) * 2
    }
  })

  if (size < 1024) {
    cacheSize.value = `${size} B`
  } else if (size < 1024 * 1024) {
    cacheSize.value = `${(size / 1024).toFixed(2)} KB`
  } else {
    cacheSize.value = `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
}

const clearCache = () => {
  selectedCacheTypes.value = []
  cacheUpdateTrigger.value++
  cacheModalVisible.value = true
}

const handleClearCache = () => {
  if (selectedCacheTypes.value.length === 0) {
    window.$message?.warning('请选择要清理的缓存类型')
    return
  }

  try {
    selectedCacheTypes.value.forEach((type) => {
      switch (type) {
        case 'gameSettings':
          Object.values(GAME_STORAGE_KEYS).forEach(key => localStg.remove(key))
          break
        case 'appSettings':
          Object.values(APP_STORAGE_KEYS).forEach(key => localStg.remove(key))
          break
        case 'authData':
          Object.values(AUTH_STORAGE_KEYS).forEach(key => localStg.remove(key))
          break
        case 'routeData':
          Object.values(ROUTE_STORAGE_KEYS).forEach(key => localStg.remove(key))
          break
      }
    })

    cacheModalVisible.value = false
    window.$message?.success('缓存清理成功')

    cacheUpdateTrigger.value++
    calculateCacheSize()

    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    window.$message?.error($t('settings.messages.cacheClearFailed'))
  }
}

watch(() => cacheUpdateTrigger.value, () => {
  calculateCacheSize()
})

defineExpose({
  calculateCacheSize,
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
    <div class="cache-modal" :class="{ 'light-mode': !isDarkMode }">
      <div class="cache-modal-header">
        <div class="cache-modal-title">
          <SvgIcon icon="mdi:broom" class="cache-modal-title-icon" />
          <span>清理缓存</span>
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
          <span>取消</span>
        </button>
        <button class="cache-btn cache-btn-confirm" @click="handleClearCache">
          <SvgIcon icon="material-symbols:delete-outline" />
          <span>确认清理</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.setting-section {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
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
