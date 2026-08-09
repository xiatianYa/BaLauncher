<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { NModal } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useThemeStore } from '@/store/modules/theme';
import { useAuthStore } from '@/store/modules/auth';
import { $t, setLocale } from '@/locales';
import { clearLocalCache } from '@/utils/cache';

const themeStore = useThemeStore();

const authStore = useAuthStore();

const { locale } = useI18n();

const showTrigger = ref<boolean>(true);

const icons: Record<UnionKey.ThemeScheme, string> = {
  light: 'material-symbols:sunny-outline',
  dark: 'material-symbols:nightlight-outline',
};

const icon = computed(() => icons[themeStore.themeScheme]);

/** 下拉菜单阴影：浅色主题下减淡，避免过重 */
const menuShadow = computed(() =>
  themeStore.darkMode ? '0 12px 32px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(31, 41, 55, 0.12)'
);

const changeThemeLayout = () => {
  if (themeStore.layout.mode === 'expand') {
    themeStore.setThemeLayout('collapse')
  } else {
    themeStore.setThemeLayout('expand')
  }
}

type DropdownKey = 'logout' | 'login' | App.I18n.LangType;

interface DropdownOption {
  key: DropdownKey;
  label: string;
  icon: string;
}

/** 语言切换选项（computed 保证切换语言后文案实时更新） */
const langOptions = computed<DropdownOption[]>(() => [
  { label: $t('settings.langOptions.zhCN'), key: 'zh-CN', icon: 'mdi:translate' },
  { label: $t('settings.langOptions.enUS'), key: 'en-US', icon: 'mdi:translate' }
]);

/** 退出登录确认弹窗显示状态 */
const logoutVisible = ref(false);

async function handleConfirmLogout() {
  logoutVisible.value = false;
  // 退出登录：清除本地所有缓存，保留地图资源（图片磁盘缓存）
  await clearLocalCache(['game', 'app', 'auth', 'route']);
  await authStore.resetStore();
  // 重载页面，刷新系统界面状态（参考设置页清除缓存的刷新方式）
  window.location.reload();
}

function handleDropdown(key: DropdownKey) {
  if (key === 'logout') {
    logoutVisible.value = true;
  } else if (key === 'login') {
    authStore.loginModalVisibel = true;
  } else if (key === 'zh-CN' || key === 'en-US') {
    setLocale(key);
  }
}

// 根据登录状态动态生成菜单选项（语言选项置顶，账号操作置底）
const options = computed<DropdownOption[]>(() => {
  const authOption: DropdownOption = authStore.isLogin
    ? { label: $t('layout.footer.logoutAction'), key: 'logout', icon: 'ph:sign-out' }
    : { label: $t('layout.footer.loginAction'), key: 'login', icon: 'ph:sign-in' };
  return [...langOptions.value, authOption];
});

/* ===== 自定义下拉菜单 ===== */

/** 菜单展开状态 */
const menuVisible = ref(false);
/** 菜单容器引用（用于点击外部关闭） */
const menuWrapRef = ref<HTMLElement | null>(null);

/** 切换菜单显示 */
const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
};

/** 选择菜单项 */
const handleOptionClick = (key: DropdownKey) => {
  menuVisible.value = false;
  handleDropdown(key);
};

/** 点击外部关闭菜单 */
const handleClickOutside = (e: MouseEvent) => {
  if (menuWrapRef.value && !menuWrapRef.value.contains(e.target as Node)) {
    menuVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="flex justify-between mb-5px global-footer">
    <button class="footer-btn" @click="changeThemeLayout()">
      <SvgIcon icon="solar:round-alt-arrow-left-outline" class="footer-btn-icon" />
    </button>
    <div class="menu-wrap" ref="menuWrapRef">
      <button v-show="showTrigger" class="footer-btn" @click.stop="toggleMenu">
        <SvgIcon icon="solar:settings-minimalistic-outline" class="footer-btn-icon" />
      </button>

      <!-- 自定义下拉菜单 -->
      <transition name="menu-fade">
        <div v-if="menuVisible" class="footer-menu" :style="{ boxShadow: menuShadow }">
          <template v-for="option in options" :key="option.key">
            <div v-if="option.key === 'logout' || option.key === 'login'" class="footer-menu-divider" />
            <div class="footer-menu-item mt-5px" :class="{ active: locale === option.key }"
              @click="handleOptionClick(option.key)">
              <SvgIcon :icon="option.icon" class="footer-menu-item-icon" />
              <span class="footer-menu-item-text">{{ option.label }}</span>
              <SvgIcon v-if="locale === option.key" icon="mdi:check" class="footer-menu-item-check" />
            </div>
          </template>
        </div>
      </transition>
    </div>
    <button class="footer-btn" @click="themeStore.toggleThemeScheme">
      <SvgIcon :icon="icon" class="footer-btn-icon" />
    </button>
  </div>

  <!-- 退出登录确认弹窗 -->
  <NModal v-model:show="logoutVisible" preset="card" class="logout-modal rounded-16px w-400px"
    :bordered="false" size="small" :closable="false">
    <template #header>
      <div class="logout-modal-header">
        <SvgIcon icon="ph:sign-out" class="logout-modal-icon" />
        <span>{{ $t('layout.footer.logout.title') }}</span>
      </div>
    </template>
    <div class="logout-modal-body">
      <p class="logout-modal-text">{{ $t('layout.footer.logout.content') }}</p>
    </div>
    <div class="logout-modal-actions">
      <button class="action-btn cancel" @click="logoutVisible = false">{{ $t('layout.footer.logout.cancel') }}</button>
      <button class="action-btn danger" @click="handleConfirmLogout">
        <SvgIcon icon="ph:sign-out" />
        <span>{{ $t('layout.footer.logout.confirm') }}</span>
      </button>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.global-footer {
  width: 100%;
  display: flex;
  gap: 6px;
}

/* 自定义工具按钮 */
.footer-btn {
  flex: 1;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  color: rgba(var(--app-rgb), 0.6);
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.07);
    border-color: rgba(102, 126, 234, 0.4);
    color: #667eea;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  .footer-btn-icon {
    font-size: 17px;
  }
}

/* 下拉菜单容器 */
.menu-wrap {
  position: relative;
  flex: 1;

  .footer-btn {
    width: 100%;
  }
}

/* 自定义下拉菜单：背景/边框/文字跟随主题（naive 注入的 CSS 变量） */
.footer-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 120px;
  padding: 6px;
  border-radius: 10px;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  z-index: 20;

  .footer-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(102, 126, 234, 0.15);
    }

    &.active {
      background: rgba(102, 126, 234, 0.12);
    }

    .footer-menu-item-icon {
      font-size: 15px;
      color: #667eea;
      flex-shrink: 0;
    }

    .footer-menu-item-text {
      flex: 1;
      font-size: 13px;
      color: var(--n-text-color);
      white-space: nowrap;
    }

    .footer-menu-item-check {
      font-size: 14px;
      color: #667eea;
      flex-shrink: 0;
    }
  }

  .footer-menu-divider {
    height: 1px;
    margin: 4px 2px;
    background: rgba(var(--app-rgb), 0.08);
  }
}

/* 下拉展开/收起动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.2s ease;
  transform-origin: bottom;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px) scale(0.96);
}

/* 退出登录确认弹窗（teleport 到 body，参考 botGroup 删除确认弹窗卡片风格） */
.logout-modal {
  .logout-modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .logout-modal-icon {
      font-size: 20px;
      color: #f5576c;
    }
  }

  .logout-modal-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 0 16px;

    .logout-modal-text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--n-text-color);
      opacity: 0.85;
    }
  }

  .logout-modal-actions {
    display: flex;
    gap: 10px;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex: 1;
      padding: 9px 2px;
      border: 1px solid rgba(128, 128, 128, 0.25);
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      background: rgba(128, 128, 128, 0.08);
      color: var(--n-text-color);

      &:hover {
        transform: translateY(-1px);
      }

      &.cancel {
        &:hover {
          background: rgba(128, 128, 128, 0.16);
        }
      }

      &.danger {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.12);
        border-color: rgba(245, 87, 108, 0.25);

        &:hover {
          background: rgba(245, 87, 108, 0.22);
        }
      }
    }
  }
}
</style>
