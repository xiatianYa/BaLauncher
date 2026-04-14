<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/store/modules/game';
import { NGrid, NGridItem, NButton, NInput, NText } from 'naive-ui';
import type { GamePlatform } from '@/constants/app';
import { START_ITEMS } from '@/constants/startItems';
import { $t } from '@/locales';

const gameStore = useGameStore();

const isDetectingSteam = ref(false);
const isDetectingCsgo = ref(false);

const GamePlatform = computed({
  get: () => gameStore.GamePlatform,
  set: (val: GamePlatform) => gameStore.setGamePlatform(val)
});

const csgo2Path = computed({
  get: () => gameStore.csgo2Path,
  set: (val: string) => gameStore.setCsgo2Path(val)
});

const steamPath = computed({
  get: () => gameStore.steamPath,
  set: (val: string) => gameStore.setSteamPath(val)
});

const selectedStartItemsList = computed(() => {
  const presetItems = START_ITEMS.filter((item: { value: string; }) => gameStore.selectedStartItems.includes(item.value));
  const customValues = gameStore.selectedStartItems.filter(
    value => !START_ITEMS.some((item: { value: string; }) => item.value === value)
  );
  const customItems = customValues.map(value => ({ label: value, value }));
  return [...presetItems, ...customItems];
});

const customStartItem = ref('');

const addCustomStartItem = () => {
  const value = customStartItem.value.trim();
  if (!value) {
    window.$message?.warning('请输入启动选项');
    return;
  }
  if (gameStore.selectedStartItems.includes(value)) {
    window.$message?.warning('该启动选项已存在');
    return;
  }
  gameStore.toggleStartItem(value);
  customStartItem.value = '';
  window.$message?.success('添加成功');
};

const selectCsgo2Path = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', $t('settings.messages.selectCsgoPath'));
  if (result) {
    csgo2Path.value = result;
    window.$message?.success($t('settings.messages.csgoPathSaved'));
  }
};

const selectSteamPath = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', $t('settings.messages.selectSteamPath'));
  if (result) {
    steamPath.value = result;
    window.$message?.success($t('settings.messages.steamPathSaved'));
  }
};

const autoDetectSteamPath = async () => {
  isDetectingSteam.value = true;
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths');
    if (result.steamPath) {
      steamPath.value = result.steamPath;
      window.$message?.success($t('settings.messages.autoDetectSteamSuccess'));
    } else {
      window.$message?.warning($t('settings.messages.autoDetectSteamMissing'));
    }
  } catch (error) {
    window.$message?.error($t('settings.messages.autoDetectFailed'));
  } finally {
    isDetectingSteam.value = false;
  }
};

const autoDetectCsgo2Path = async () => {
  isDetectingCsgo.value = true;
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths');
    if (result.csgo2Path) {
      csgo2Path.value = result.csgo2Path;
      window.$message?.success($t('settings.messages.autoDetectCsgoSuccess'));
    } else {
      window.$message?.warning($t('settings.messages.autoDetectCsgoMissing'));
    }
  } catch (error) {
    window.$message?.error($t('settings.messages.autoDetectFailed'));
  } finally {
    isDetectingCsgo.value = false;
  }
};

const selectPlatform = (platform: 'international' | 'perfect') => {
  GamePlatform.value = platform;
};
</script>

<template>
  <div class="game-setting-box">
    <div class="game-setting-title">
      <div class="flex font-size-24px">
        <SvgIcon icon="solar:gamepad-broken" />
      </div>
      <div class="ml-10px font-size-16px font-semibold">
        <NText>
          {{ $t('settings.general') }}
        </NText>
      </div>
    </div>
    <div class="game-setting-item mt-10px">
      <div class="font-size-14px font-semibold">
        <NText>
          {{ $t('settings.platform') }}
        </NText>
      </div>
      <div class="flex-1 ml-10px">
        <NButton class="mr-10px rounded-8px" :color="GamePlatform === 'international' ? '#18a058' : '#a5aaa3'" ghost
          size="large" @click="selectPlatform('international')">
          <template #icon>
            <SvgIcon icon="mdi:steam" />
          </template>
          {{ $t('settings.international') }}
        </NButton>
        <NButton class="rounded-8px" :color="GamePlatform === 'perfect' ? '#18a058' : '#a5aaa3'" ghost size="large"
          @click="selectPlatform('perfect')">
          <template #icon>
            <SvgIcon icon="mdi:earth" />
          </template>
          {{ $t('settings.perfect') }}
        </NButton>
      </div>
    </div>
    <div class="game-setting-item mt-10px">
      <div class="font-size-14px font-semibold">
        <NText>
          {{ $t('settings.gamePath') }}
        </NText>
      </div>
      <div class="flex-1 ml-10px">
        <NInput v-model:value="csgo2Path" :placeholder="$t('settings.inputCsgoPath')" :disabled="true" />
      </div>
      <div class="ml-10px">
        <NButton class="rounded-8px mr-10px" ghost @click="selectCsgo2Path">
          {{ $t('settings.selectPath') }}
        </NButton>
        <NButton class="rounded-8px" ghost @click="autoDetectCsgo2Path" :loading="isDetectingCsgo">
          {{ $t('settings.autoDetect') }}
        </NButton>
      </div>
    </div>
    <div class="game-setting-item mt-10px">
      <div class="font-size-14px font-semibold">
        <NText>
          {{ $t('settings.steamPath') }}
        </NText>
      </div>
      <div class="flex-1 ml-10px">
        <NInput v-model:value="steamPath" :placeholder="$t('settings.inputSteamPath')" :disabled="true" />
      </div>
      <div class="ml-10px">
        <NButton class="rounded-8px mr-10px" ghost @click="selectSteamPath">
          {{ $t('settings.selectPath') }}
        </NButton>
        <NButton class="rounded-8px" ghost @click="autoDetectSteamPath" :loading="isDetectingSteam">
          {{ $t('settings.autoDetect') }}
        </NButton>
      </div>
    </div>
    <div class="game-setting-item mt-10px">
      <div class="font-size-14px font-semibold mr-5px w-120px">
        <NText class="w-150px">
          {{ $t('settings.customStartOptions') }}
        </NText>
      </div>
      <div>
        <NGrid :cols="3" :x-gap="12" :y-gap="12">
          <NGridItem v-for="item in START_ITEMS" :key="item.value">
            <NButton class="rounded-5px font-size-12px w-full" ghost
              :type="gameStore.selectedStartItems.includes(item.value) ? 'primary' : 'tertiary'"
              @click="gameStore.toggleStartItem(item.value)">
              <template #icon>
                <SvgIcon v-if="gameStore.selectedStartItems.includes(item.value)" icon="ic:sharp-clear" />
              </template>
              {{ item.label }}
            </NButton>
          </NGridItem>
        </NGrid>
        <div class="flex mt-10px">
          <NInput v-model:value="customStartItem" class="rounded-5px mr-10px"
            :placeholder="$t('settings.inputCustomStartOption')" @keyup.enter="addCustomStartItem" />
          <NButton class="rounded-5px" type="info" @click="addCustomStartItem">{{ $t('settings.add') }}</NButton>
        </div>
        <div class="flex items-center mt-5px font-size-12px">
          <SvgIcon icon="material-symbols:lightbulb-2-outline" class="color-#f0a020 mr-5px" />
          {{ $t('settings.customStartOptionTip') }}
        </div>
      </div>
    </div>
    <div class="game-setting-item mt-10px">
      <div class="font-size-14px font-semibold mr-5px w-120px">
        <NText class="w-150px">
          {{ $t('settings.currentSelectedItems') }}
        </NText>
      </div>
      <NGrid :cols="3" :x-gap="12" :y-gap="12">
        <NGridItem v-for="item in selectedStartItemsList" :key="item.value">
          <NButton class="rounded-5px font-size-12px w-full" ghost type="warning">
            {{ item.label }}
          </NButton>
        </NGridItem>
      </NGrid>
    </div>
  </div>
</template>

<style scoped lang="scss">
.game-setting-box {
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

  .game-setting-title {
    display: flex;
    align-items: center;
  }

  .game-setting-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}
</style>
