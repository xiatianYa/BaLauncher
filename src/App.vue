<script setup lang="ts">
import { NConfigProvider, darkTheme, zhCN, dateZhCN, enUS, dateEnUS } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { i18n } from '@/locales';
import ThemeTransition from '@/components/common/theme-transition.vue';

defineOptions({
  name: 'App'
});


const themeStore = useThemeStore();

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

/** naive-ui 组件语言跟随应用 i18n */
const naiveLocale = computed(() => (i18n.global.locale.value === 'zh-CN' ? zhCN : enUS));
const naiveDateLocale = computed(() => (i18n.global.locale.value === 'zh-CN' ? dateZhCN : dateEnUS));

/** 主题切换遮罩状态：记录旧主题背景色，由 ThemeTransition 组件播放 X 光扫描过渡 */
const themeTransition = ref<string | null>(null);

/** 监听主题切换：瞬间切换主题，旧主题色遮罩以 X 光扫描线扫过，逐列揭出新主题 */
watch(
  () => themeStore.darkMode,
  isDark => {
    // 动画进行中忽略连续切换，避免遮罩重叠
    if (themeTransition.value) return;
    // 旧主题背景色作为遮罩填充，扫描线扫过后露出新主题
    themeTransition.value = isDark ? '#fbf1f1' : '#161a26';
  }
);

/** 动画播放完毕后移除覆盖层 */
function handleTransitionFinished() {
  themeTransition.value = null;
}

const themeOverrides = computed(() => {
  if (themeStore.darkMode) {
    // 深色模式：柔和的蓝灰夜色，避免纯黑刺眼
    return {
      common: {
        // 基础色
        bodyColor: '#161a26',
        cardColor: '#1c2130',
        modalColor: '#1c2130',
        popoverColor: '#1c2130',
        tableColor: '#1c2130',
        tableHeaderColor: '#202636',
        actionColor: '#202636',
        hoverColor: '#232a3b',
        // 主题色（项目主紫）
        primaryColor: '#667eea',
        primaryColorHover: '#7f93f0',
        primaryColorPressed: '#5568d8',
        primaryColorSuppl: '#667eea',
        // 文字
        textColorBase: '#e6e9f2',
        textColor1: '#e6e9f2',
        textColor2: '#a8b0c3',
        textColor3: '#70798e',
        textColorDisabled: '#4a5266',
        placeholderColor: '#5f687c',
        // 边框/分隔线
        borderColor: '#2c3344',
        borderColorHover: '#3d465c',
        dividerColor: '#262d3d',
        // 输入框
        inputColor: '#141824',
        inputColorDisabled: '#1a1f2c',
        inputColorFocus: '#141824',
        // 图标/关闭按钮
        iconColor: '#a8b0c3',
        iconColorHover: '#e6e9f2',
        iconColorPressed: '#e6e9f2',
        closeColorHover: '#2c3344',
        closeIconColorHover: '#e6e9f2',
        // 滚动条
        scrollbarColor: '#333b4e',
        scrollbarColorHover: '#3d465c',
        // 开关/复选轨道与底色
        trackColor: '#141824',
        railColor: '#141824',
        baseColor: '#141824',
        checkMarkColor: '#ffffff'
      }
    };
  }
  // 浅色模式：柔和的暖白，避免纯白刺眼
  return {
    common: {
      // 基础色
      bodyColor: '#fbf1f1',
      cardColor: '#faf7f2',
      modalColor: '#ffffff',
      popoverColor: '#ffffff',
      tableColor: '#faf7f2',
      tableHeaderColor: '#f4eee7',
      actionColor: '#f4eee7',
      hoverColor: '#f4ece6',
      // 主题色（项目主紫）
      primaryColor: '#667eea',
      primaryColorHover: '#7f93f0',
      primaryColorPressed: '#5568d8',
      primaryColorSuppl: '#667eea',
      // 文字
      textColorBase: '#2e2b26',
      textColor1: '#2e2b26',
      textColor2: '#6f685c',
      textColor3: '#a59d90',
      textColorDisabled: '#c4bcb0',
      placeholderColor: '#b0a99c',
      // 边框/分隔线
      borderColor: '#e7ded4',
      borderColorHover: '#d5c9ba',
      dividerColor: '#efe7de',
      // 输入框
      inputColor: '#fffdfa',
      inputColorDisabled: '#f7f0ea',
      inputColorFocus: '#fffdfa',
      // 图标/关闭按钮
      iconColor: '#a59d90',
      iconColorHover: '#2e2b26',
      iconColorPressed: '#2e2b26',
      closeColorHover: '#efe7de',
      closeIconColorHover: '#2e2b26',
      // 滚动条
      scrollbarColor: '#d8cdc0',
      scrollbarColorHover: '#c6b9a9',
      // 开关/复选轨道与底色
      trackColor: '#e7ddd2',
      railColor: '#e7ddd2',
      baseColor: '#ffffff',
      checkMarkColor: '#ffffff'
    }
  };
});
</script>

<template>
  <!-- 主题切换遮罩：X 光扫描线扫过，逐列揭出新主题 -->
  <ThemeTransition
    v-if="themeTransition"
    :color="themeTransition"
    @finished="handleTransitionFinished"
  />
  <NConfigProvider
    :theme="naiveDarkTheme"
    :theme-overrides="themeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
    class="h-full flex"
    :class="themeStore.darkMode ? 'theme-dark' : 'theme-light'"
  >
    <AppProvider>
      <RouterView />
    </AppProvider>
  </NConfigProvider>
</template>

<style>
/* 窗口整体背景跟随主题的柔和背景色，避免纯白/纯黑 */
.n-config-provider {
  background-color: var(--n-body-color);
}

/* 主题自适应颜色变量：--app-rgb 为"反色"三元组，配合透明度生成文字/边框/浅背景
   深色模式为白，浅色模式为暖黑，保证任意主题下文字可见 */
.theme-dark {
  --app-rgb: 255, 255, 255;
  color-scheme: dark;
}

.theme-light {
  --app-rgb: 40, 34, 28;
  color-scheme: light;
}
</style>
