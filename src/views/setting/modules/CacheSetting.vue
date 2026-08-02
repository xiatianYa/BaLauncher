<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NGrid, NGridItem, NButton } from 'naive-ui'
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

  <NModal v-model:show="cacheModalVisible" preset="card" class="cache-modal" :class="{ 'light-mode': !isDarkMode }"
    :closable="false" size="small">
    <template #header>
      <div class="modal-header">清理缓存</div>
    </template>

    <div class="modal-body">
      <p class="modal-tip">请选择要清理的缓存类型</p>
      <NGrid :cols="2" :x-gap="12" :y-gap="12">
        <NGridItem v-for="type in cacheTypes" :key="type.value">
          <NButton class="cache-type-btn" ghost :dashed="!selectedCacheTypes.includes(type.value)"
            :class="{ selected: selectedCacheTypes.includes(type.value) }" :type="type.type"
            @click="toggleCacheType(type.value)">
            <div class="cache-type-inner">
              <SvgIcon :icon="type.icon" class="cache-type-icon" />
              <span class="cache-type-label">{{ type.label }}</span>
              <span class="cache-type-size">{{ getCacheTypeSize(type.value) }}</span>
            </div>
          </NButton>
        </NGridItem>
      </NGrid>
    </div>

    <template #footer>
      <div class="modal-footer">
        <NButton ghost type="info" class="modal-footer-btn" @click="cacheModalVisible = false">
          <template #icon>
            <SvgIcon icon="mdi:close" />
          </template>
          取消
        </NButton>
        <NButton ghost type="error" class="modal-footer-btn" @click="handleClearCache">
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

.cache-modal {
  :deep(.n-card) {
    background-color: var(--n-color);
    border: 1px solid var(--n-border-color);
    border-radius: 12px;
    overflow: hidden;
  }

  :deep(.n-card__content) {
    padding: 16px 20px;
  }

  .modal-header {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color);
  }

  .modal-body {
    color: var(--n-text-color);

    .modal-tip {
      margin-bottom: 12px;
      text-align: center;
      font-size: 13px;
      color: var(--n-text-color-2);
    }
  }

  .modal-footer {
    display: flex;
    gap: 12px;

    .modal-footer-btn {
      flex: 1;
    }
  }
}

.cache-type-btn {
  width: 100%;
  height: auto;
  padding: 10px 12px;

  :deep(.n-button__content) {
    width: 100%;
  }

  &.selected {
    border-style: solid;
  }
}

.cache-type-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  .cache-type-icon {
    font-size: 18px;
  }

  .cache-type-label {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
  }

  .cache-type-size {
    font-size: 12px;
    opacity: 0.8;
  }
}
</style>
