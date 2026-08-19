<script setup lang="ts">
import { ref, computed } from 'vue';
import { NInput } from 'naive-ui';
import type { GamePlatform } from '@/constants/app';
import { useAppStore, type MinimizeBehavior } from '@/store/modules/app';
import { START_ITEMS } from '@/constants/startItems';
import { $t } from '@/locales';

const appStore = useAppStore();

const isDetectingSteam = ref(false);
const isDetectingCsgo = ref(false);

const GamePlatform = computed({
  get: () => appStore.gamePlatform,
  set: (val: GamePlatform) => appStore.setGamePlatform(val),
});

const csgo2Path = computed({
  get: () => appStore.csgo2Path,
  set: (val: string) => appStore.setCsgo2Path(val),
});

const steamPath = computed({
  get: () => appStore.steamPath,
  set: (val: string) => appStore.setSteamPath(val),
});

/** 最小化行为：taskbar 隐藏到任务栏 / tray 隐藏到系统托盘 */
const minimizeBehavior = computed({
  get: () => appStore.minimizeBehavior,
  set: (val: MinimizeBehavior) => appStore.setMinimizeBehavior(val),
});

/** 消息提示框显示位置（九宫格 key） */
const messagePosition = computed({
  get: () => appStore.messagePosition,
  set: (val: string) => appStore.setMessagePosition(val),
});

/* ===== 自定义启动项 ===== */

const customStartItem = ref('');

/** 当前选中的预设启动项中哪些是自定义的 */
const customSelectedItems = computed(() =>
  appStore.selectedStartItems.filter(
    value => !START_ITEMS.some(item => item.value === value)
  )
);

const addCustomStartItem = () => {
  const value = customStartItem.value.trim();
  if (!value) {
    window.$message?.warning($t('settings.messages.enterStartOption'));
    return;
  }
  if (appStore.selectedStartItems.includes(value)) {
    window.$message?.warning($t('settings.messages.startOptionExists'));
    return;
  }
  appStore.toggleStartItem(value);
  customStartItem.value = '';
  window.$message?.success($t('updateLog.addSuccess'));
};

/** 移除自定义启动项 */
const removeCustomStartItem = (value: string) => {
  appStore.toggleStartItem(value);
};

/* ===== 路径选择 ===== */

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
  } catch {
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
  } catch {
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
  <section class="setting-section">
    <div class="section-header">
      <div class="section-title">
        <SvgIcon icon="solar:gamepad-broken" class="section-icon" />
        <span class="section-text">{{ $t('settings.general') }}</span>
      </div>
    </div>

    <div class="section-content">
      <!-- 游戏平台 -->
      <div class="setting-card">
        <div class="card-label">{{ $t('settings.platform') }}</div>
        <div class="card-control row-flex">
          <button
            class="toggle-btn"
            :class="{ active: GamePlatform === 'international' }"
            @click="selectPlatform('international')"
          >
            <SvgIcon icon="mdi:steam" class="btn-icon" />
            <span>{{ $t('settings.international') }}</span>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: GamePlatform === 'perfect' }"
            @click="selectPlatform('perfect')"
          >
            <SvgIcon icon="mdi:earth" class="btn-icon" />
            <span>{{ $t('settings.perfect') }}</span>
          </button>
        </div>
      </div>

      <!-- 最小化行为 -->
      <div class="setting-card">
        <div class="card-label">{{ $t('settings.minimizeBehavior') }}</div>
        <div class="card-control row-flex">
          <button
            class="toggle-btn"
            :class="{ active: minimizeBehavior === 'taskbar' }"
            @click="minimizeBehavior = 'taskbar'"
          >
            <SvgIcon icon="mdi:window-minimize" class="btn-icon" />
            <span>{{ $t('settings.minimizeToTaskbar') }}</span>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: minimizeBehavior === 'tray' }"
            @click="minimizeBehavior = 'tray'"
          >
            <SvgIcon icon="mdi:application" class="btn-icon" />
            <span>{{ $t('settings.minimizeToTray') }}</span>
          </button>
        </div>
      </div>

      <!-- 消息提示框显示位置 -->
      <div class="setting-card align-start">
        <div class="card-label">{{ $t('settings.messageToastPosition') }}</div>
        <div class="card-control flex-col">
          <PositionPicker v-model="messagePosition" />
        </div>
      </div>

      <!-- CS2 路径 -->
      <div class="setting-card">
        <div class="card-label">{{ $t('settings.gamePath') }}</div>
        <div class="card-control row-flex">
          <NInput v-model:value="csgo2Path" :placeholder="$t('settings.inputCsgoPath')" disabled class="flex-1" />
          <button class="path-btn" @click="selectCsgo2Path">{{ $t('settings.selectPath') }}</button>
          <button class="path-btn" :disabled="isDetectingCsgo" @click="autoDetectCsgo2Path">
            <SvgIcon v-if="isDetectingCsgo" icon="mdi:loading" class="btn-icon spin" />
            <span>{{ $t('settings.autoDetect') }}</span>
          </button>
        </div>
      </div>

      <!-- Steam 路径 -->
      <div class="setting-card">
        <div class="card-label">{{ $t('settings.steamPath') }}</div>
        <div class="card-control row-flex">
          <NInput v-model:value="steamPath" :placeholder="$t('settings.inputSteamPath')" disabled class="flex-1" />
          <button class="path-btn" @click="selectSteamPath">{{ $t('settings.selectPath') }}</button>
          <button class="path-btn" :disabled="isDetectingSteam" @click="autoDetectSteamPath">
            <SvgIcon v-if="isDetectingSteam" icon="mdi:loading" class="btn-icon spin" />
            <span>{{ $t('settings.autoDetect') }}</span>
          </button>
        </div>
      </div>

      <!-- 启动项选择 -->
      <div class="setting-card align-start">
        <div class="card-label">{{ $t('settings.customStartOptions') }}</div>
        <div class="card-control flex-col">
          <!-- 预设启动项网格 -->
          <div class="start-item-grid">
            <button
              v-for="item in START_ITEMS"
              :key="item.value"
              class="start-item-btn"
              :class="{ active: appStore.selectedStartItems.includes(item.value) }"
              @click="appStore.toggleStartItem(item.value)"
            >
              <SvgIcon v-if="appStore.selectedStartItems.includes(item.value)" icon="mdi:check" class="btn-icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>

          <!-- 自定义启动项输入 -->
          <div class="custom-input-row">
            <NInput
              v-model:value="customStartItem"
              :placeholder="$t('settings.inputCustomStartOption')"
              @keyup.enter="addCustomStartItem"
              class="flex-1"
            />
            <button class="add-btn" @click="addCustomStartItem">
              <SvgIcon icon="mdi:plus" class="btn-icon" />
              <span>{{ $t('settings.add') }}</span>
            </button>
          </div>

          <!-- 已添加的自定义启动项（可删除） -->
          <div v-if="customSelectedItems.length" class="custom-items-row">
            <button
              v-for="item in customSelectedItems"
              :key="item"
              class="custom-chip"
              @click="removeCustomStartItem(item)"
            >
              <span>{{ item }}</span>
              <SvgIcon icon="mdi:close" class="chip-remove" />
            </button>
          </div>

          <!-- 提示 -->
          <div class="tip-row">
            <SvgIcon icon="material-symbols:lightbulb-2-outline" class="tip-icon" />
            <span>{{ $t('settings.customStartOptionTip') }}</span>
          </div>
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

.section-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 卡片行 ===== */

.setting-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--app-rgb), 0.025);
  border: 1px solid rgba(var(--app-rgb), 0.07);

  &.align-start {
    align-items: flex-start;
  }

  .card-label {
    flex: 0 0 auto;
    width: 100px;
    font-size: 13px;
    font-weight: 600;
    color: var(--n-text-color);
    padding-top: 2px;
  }

  .card-control {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;

    &.row-flex {
      flex-direction: row;
    }

    &.flex-col {
      flex-direction: column;
      align-items: stretch;
    }
  }
}

/* ===== 平台切换按钮 ===== */

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border: 1px solid rgba(var(--app-rgb), 0.08);
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--app-rgb), 0.55);
  background: rgba(var(--app-rgb), 0.04);
  transition: all 0.25s ease;

  .btn-icon {
    font-size: 16px;
  }

  &:hover {
    color: rgba(var(--app-rgb), 0.7);
    background: rgba(var(--app-rgb), 0.08);
  }

  &.active {
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);
    border-color: rgba(102, 126, 234, 0.25);
  }
}

/* ===== 路径操作按钮 ===== */

.path-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border: 1px solid rgba(var(--app-rgb), 0.08);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(var(--app-rgb), 0.55);
  background: rgba(var(--app-rgb), 0.04);
  transition: all 0.2s ease;
  white-space: nowrap;

  .btn-icon {
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    color: rgba(var(--app-rgb), 0.7);
    background: rgba(var(--app-rgb), 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ===== 启动项网格按钮 ===== */

.start-item-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.start-item-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 9px 8px;
  border: 1px solid rgba(var(--app-rgb), 0.08);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(var(--app-rgb), 0.55);
  background: rgba(var(--app-rgb), 0.04);
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .btn-icon {
    font-size: 14px;
    flex-shrink: 0;
    color: #667eea;
  }

  &:hover {
    color: rgba(var(--app-rgb), 0.7);
    background: rgba(var(--app-rgb), 0.1);
  }

  &.active {
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.25);
  }
}

/* ===== 自定义输入行 ===== */

.custom-input-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;

  .flex-1 {
    flex: 1;
  }
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  transition: all 0.2s ease;
  white-space: nowrap;

  .btn-icon {
    font-size: 15px;
  }

  &:hover {
    background: rgba(102, 126, 234, 0.2);
  }
}

/* ===== 自定义启动项 chip ===== */

.custom-items-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.custom-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  transition: all 0.2s ease;

  .chip-remove {
    font-size: 13px;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  &:hover {
    background: rgba(102, 126, 234, 0.16);

    .chip-remove {
      opacity: 1;
    }
  }
}

/* ===== 提示行 ===== */

.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  color: rgba(var(--app-rgb), 0.4);

  .tip-icon {
    font-size: 14px;
    color: #f0a020;
    flex-shrink: 0;
  }
}

/* ===== 工具类 ===== */

.flex-1 {
  flex: 1;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
