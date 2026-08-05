<script setup lang="ts">
import { ref, computed } from 'vue'
import { NGrid, NGridItem, NButton, NInput, NText } from 'naive-ui'
import type { GamePlatform } from '@/constants/app'
import { useGameStore } from '@/store/modules/game'
import { START_ITEMS } from '@/constants/startItems'
import { $t } from '@/locales'

const gameStore = useGameStore()

const isDetectingSteam = ref(false)
const isDetectingCsgo = ref(false)

const GamePlatform = computed({
  get: () => gameStore.GamePlatform,
  set: (val: GamePlatform) => gameStore.setGamePlatform(val),
})

const csgo2Path = computed({
  get: () => gameStore.csgo2Path,
  set: (val: string) => gameStore.setCsgo2Path(val),
})

const steamPath = computed({
  get: () => gameStore.steamPath,
  set: (val: string) => gameStore.setSteamPath(val),
})

const selectedStartItemsList = computed(() => {
  const presetItems = START_ITEMS.filter((item: { value: string }) =>
    gameStore.selectedStartItems.includes(item.value),
  )
  const customValues = gameStore.selectedStartItems.filter(
    value => !START_ITEMS.some((item: { value: string }) => item.value === value),
  )
  const customItems = customValues.map(value => ({ label: value, value }))
  return [...presetItems, ...customItems]
})

const customStartItem = ref('')

const addCustomStartItem = () => {
  const value = customStartItem.value.trim()
  if (!value) {
    window.$message?.warning('请输入启动选项')
    return
  }
  if (gameStore.selectedStartItems.includes(value)) {
    window.$message?.warning('该启动选项已存在')
    return
  }
  gameStore.toggleStartItem(value)
  customStartItem.value = ''
  window.$message?.success('添加成功')
}

const selectCsgo2Path = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', $t('settings.messages.selectCsgoPath'))
  if (result) {
    csgo2Path.value = result
    window.$message?.success($t('settings.messages.csgoPathSaved'))
  }
}

const selectSteamPath = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', $t('settings.messages.selectSteamPath'))
  if (result) {
    steamPath.value = result
    window.$message?.success($t('settings.messages.steamPathSaved'))
  }
}

const autoDetectSteamPath = async () => {
  isDetectingSteam.value = true
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths')
    if (result.steamPath) {
      steamPath.value = result.steamPath
      window.$message?.success($t('settings.messages.autoDetectSteamSuccess'))
    } else {
      window.$message?.warning($t('settings.messages.autoDetectSteamMissing'))
    }
  } catch (error) {
    window.$message?.error($t('settings.messages.autoDetectFailed'))
  } finally {
    isDetectingSteam.value = false
  }
}

const autoDetectCsgo2Path = async () => {
  isDetectingCsgo.value = true
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths')
    if (result.csgo2Path) {
      csgo2Path.value = result.csgo2Path
      window.$message?.success($t('settings.messages.autoDetectCsgoSuccess'))
    } else {
      window.$message?.warning($t('settings.messages.autoDetectCsgoMissing'))
    }
  } catch (error) {
    window.$message?.error($t('settings.messages.autoDetectFailed'))
  } finally {
    isDetectingCsgo.value = false
  }
}

const selectPlatform = (platform: 'international' | 'perfect') => {
  GamePlatform.value = platform
}
</script>

<template>
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="solar:gamepad-broken" class="section-icon" />
        <NText>{{ $t('settings.general') }}</NText>
      </div>
    </div>

    <div class="section-content">
      <!-- 游戏平台 -->
      <div class="setting-row">
        <div class="row-label">{{ $t('settings.platform') }}</div>
        <div class="row-control">
          <NButton class="platform-btn" :type="GamePlatform === 'international' ? 'primary' : 'default'" ghost
            size="large" @click="selectPlatform('international')">
            <template #icon>
              <SvgIcon icon="mdi:steam" />
            </template>
            {{ $t('settings.international') }}
          </NButton>
          <NButton class="platform-btn" :type="GamePlatform === 'perfect' ? 'primary' : 'default'" ghost size="large"
            @click="selectPlatform('perfect')">
            <template #icon>
              <SvgIcon icon="mdi:earth" />
            </template>
            {{ $t('settings.perfect') }}
          </NButton>
        </div>
      </div>

      <!-- CS2 路径 -->
      <div class="setting-row">
        <div class="row-label">{{ $t('settings.gamePath') }}</div>
        <div class="row-control path-control">
          <NInput v-model:value="csgo2Path" :placeholder="$t('settings.inputCsgoPath')" disabled />
          <NButton ghost @click="selectCsgo2Path">{{ $t('settings.selectPath') }}</NButton>
          <NButton ghost :loading="isDetectingCsgo" @click="autoDetectCsgo2Path">{{ $t('settings.autoDetect') }}</NButton>
        </div>
      </div>

      <!-- Steam 路径 -->
      <div class="setting-row">
        <div class="row-label">{{ $t('settings.steamPath') }}</div>
        <div class="row-control path-control">
          <NInput v-model:value="steamPath" :placeholder="$t('settings.inputSteamPath')" disabled />
          <NButton ghost @click="selectSteamPath">{{ $t('settings.selectPath') }}</NButton>
          <NButton ghost :loading="isDetectingSteam" @click="autoDetectSteamPath">{{ $t('settings.autoDetect') }}</NButton>
        </div>
      </div>

      <!-- 启动项选择 -->
      <div class="setting-row align-start">
        <div class="row-label fixed-label">{{ $t('settings.customStartOptions') }}</div>
        <div class="row-control flex-col">
          <NGrid :cols="3" :x-gap="12" :y-gap="12">
            <NGridItem v-for="item in START_ITEMS" :key="item.value">
              <NButton class="w-full" ghost
                :type="gameStore.selectedStartItems.includes(item.value) ? 'primary' : 'default'"
                @click="gameStore.toggleStartItem(item.value)">
                <template #icon>
                  <SvgIcon v-if="gameStore.selectedStartItems.includes(item.value)" icon="ic:sharp-clear" />
                </template>
                {{ item.label }}
              </NButton>
            </NGridItem>
          </NGrid>

          <div class="custom-input-row">
            <NInput v-model:value="customStartItem" :placeholder="$t('settings.inputCustomStartOption')"
              @keyup.enter="addCustomStartItem" />
            <NButton type="primary" @click="addCustomStartItem">{{ $t('settings.add') }}</NButton>
          </div>

          <div class="tip-row">
            <SvgIcon icon="material-symbols:lightbulb-2-outline" class="tip-icon" />
            <span>{{ $t('settings.customStartOptionTip') }}</span>
          </div>
        </div>
      </div>

      <!-- 已选启动项 -->
      <div class="setting-row align-start">
        <div class="row-label fixed-label">{{ $t('settings.currentSelectedItems') }}</div>
        <div class="row-control">
          <NGrid :cols="3" :x-gap="12" :y-gap="12">
            <NGridItem v-for="item in selectedStartItemsList" :key="item.value">
              <NButton class="w-full" ghost type="warning">{{ item.label }}</NButton>
            </NGridItem>
          </NGrid>
        </div>
      </div>
    </div>
  </section>
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

.section-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);

  &.align-start {
    align-items: flex-start;
  }

  .row-label {
    flex: 0 0 auto;
    width: 100px;
    font-size: 13px;
    font-weight: 600;
    color: var(--n-text-color);
  }

  .row-label.fixed-label {
    padding-top: 6px;
  }

  .row-control {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;

    &.path-control {
      .n-input {
        flex: 1;
      }
    }

    &.flex-col {
      flex-direction: column;
      align-items: stretch;
    }
  }
}

.platform-btn {
  min-width: 120px;
}

.custom-input-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;

  .n-input {
    flex: 1;
  }
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);

  .tip-icon {
    font-size: 14px;
    color: #f0a020;
  }
}
</style>
