<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';

const themeStore = useThemeStore();

const authStore = useAuthStore();

const showTrigger = ref<boolean>(true);

const icons: Record<UnionKey.ThemeScheme, string> = {
  light: 'material-symbols:sunny-outline',
  dark: 'material-symbols:nightlight-outline',
};

const icon = computed(() => icons[themeStore.themeScheme]);

const changeThemeLayout = () => {
  if (themeStore.layout.mode === 'expand') {
    themeStore.setThemeLayout('collapse')
  } else {
    themeStore.setThemeLayout('expand')
  }
}

type DropdownKey = 'logout' | 'login';

interface DropdownOption {
  key: DropdownKey;
  label: string;
  icon: string;
}

function logout() {
  window.$dialog?.info({
    title: $t('layout.footer.logout.title'),
    content: $t('layout.footer.logout.content'),
    positiveText: $t('layout.footer.logout.confirm'),
    negativeText: $t('layout.footer.logout.cancel'),
    onPositiveClick: () => {
      authStore.resetStore();
    }
  });
}

function handleDropdown(key: DropdownKey) {
  if (key === 'logout') {
    logout();
  } else if (key === 'login') {
    authStore.loginModalVisibel = true;
  }
}

// 根据登录状态动态生成菜单选项
const options = computed<DropdownOption[]>(() => {
  if (authStore.isLogin) {
    // 已登录：显示退出登录选项
    return [{ label: $t('layout.footer.logoutAction'), key: 'logout', icon: 'ph:sign-out' }];
  }
  // 未登录：显示登录选项
  return [{ label: $t('layout.footer.loginAction'), key: 'login', icon: 'ph:sign-in' }];
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
        <div v-if="menuVisible" class="footer-menu">
          <div v-for="option in options" :key="option.key" class="footer-menu-item"
            @click="handleOptionClick(option.key)">
            <SvgIcon :icon="option.icon" class="footer-menu-item-icon" />
            <span class="footer-menu-item-text">{{ option.label }}</span>
          </div>
        </div>
      </transition>
    </div>
    <button class="footer-btn" @click="themeStore.toggleThemeScheme">
      <SvgIcon :icon="icon" class="footer-btn-icon" />
    </button>
  </div>
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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
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

/* 自定义下拉菜单 */
.footer-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 120px;
  padding: 6px;
  border-radius: 10px;
  background: rgba(26, 30, 44, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
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

    .footer-menu-item-icon {
      font-size: 15px;
      color: #667eea;
      flex-shrink: 0;
    }

    .footer-menu-item-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      white-space: nowrap;
    }
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
</style>
