<script setup lang="ts">
import { computed, ref, VNode } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { useSvgIcon } from '@/hooks/common/icon';
import { useRouterPush } from '@/hooks/common/router';
import { useAuthStore } from '@/store/modules/auth';

const { SvgIconVNode } = useSvgIcon();

const themeStore = useThemeStore();

const authStore = useAuthStore();

const { toHome } = useRouterPush();

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

type DropdownOption =
  | {
    key: DropdownKey;
    label: string;
    icon?: () => VNode;
  }
  | {
    type: 'divider';
    key: string;
  };

function logout() {
  window.$dialog?.info({
    title: "提示",
    content: "确认退出登录吗？",
    positiveText: "确认",
    negativeText: "取消",
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

// 根据登录状态动态生成下拉选项
const options = computed<DropdownOption[]>(() => {
  const opts: DropdownOption[] = [];

  if (authStore.isLogin) {
    // 已登录：显示退出登录选项
    opts.push({
      label: "退出登陆",
      key: 'logout',
      icon: SvgIconVNode({ icon: 'ph:sign-out', fontSize: 18 }),
    });
  } else {
    // 未登录：显示登录选项
    opts.push({
      label: "登录",
      key: 'login',
      icon: SvgIconVNode({ icon: 'ph:sign-in', fontSize: 18 }),
    });
  }

  return opts;
});
</script>

<template>
  <div class="flex justify-between mb-5px global-footer">
    <ButtonIcon icon="solar:round-alt-arrow-left-outline" @click="changeThemeLayout()" class="flex-1"></ButtonIcon>
    <NDropdown placement="bottom" trigger="click" :options="options" @select="handleDropdown">
      <div v-show="showTrigger">
        <ButtonIcon icon="solar:settings-minimalistic-outline" class="w-full"></ButtonIcon>
      </div>
    </NDropdown>
    <ButtonIcon :icon="icon" @click="themeStore.toggleThemeScheme" class="flex-1"></ButtonIcon>
  </div>
</template>

<style scoped lang="scss">
.global-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(95, 92, 92, 0.3);
}
</style>