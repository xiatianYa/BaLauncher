<script setup lang="ts">
import { NConfigProvider, darkTheme, zhCN, dateZhCN, enUS, dateEnUS } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useThemeStore } from '@/store/modules/theme';
import { useAppStore } from '@/store/modules/app';
import { i18n } from '@/locales';
import ThemeTransition from '@/components/common/theme-transition.vue';

defineOptions({
  name: 'App'
});


const themeStore = useThemeStore();
const appStore = useAppStore();

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

/** naive-ui 组件语言跟随应用 i18n */
const naiveLocale = computed(() => (i18n.global.locale.value === 'zh-CN' ? zhCN : enUS));
const naiveDateLocale = computed(() => (i18n.global.locale.value === 'zh-CN' ? dateZhCN : dateEnUS));

/** 主题切换遮罩状态：记录旧主题背景色，由 ThemeTransition 组件播放 X 光扫描过渡 */
const themeTransition = ref<string | null>(null);

/** 遮罩 key：每次切换递增，强制 ThemeTransition 重挂载，保证动画播放中再次切换也能重新播放扫描动画 */
const themeTransitionKey = ref(0);

/** 监听主题切换：瞬间切换主题，旧主题色遮罩以 X 光扫描线扫过，逐列揭出新主题 */
watch(
  () => themeStore.darkMode,
  isDark => {
    // 旧主题背景色作为遮罩填充，扫描线扫过后露出新主题
    themeTransition.value = isDark ? '#fbf1f1' : '#161a26';
    // key 递增强制重挂载遮罩：动画播放中连续切换时，主题变色也不会丢掉过渡动画
    themeTransitionKey.value += 1;
  }
);

/** 监听鼠标主题：在 html 上标记 data-cursor，global.css 据此切换默认/自定义光标 */
watch(
  () => appStore.mouseCursor,
  cursor => {
    document.documentElement.dataset.cursor = cursor;
  },
  { immediate: true }
);

/** 软件启动即自动探测并保存 Steam/CS2 路径（未配置时，永久存储），随后创建 GSI 配置文件 */
onMounted(async () => {
  await appStore.autoDetectAndSaveGamePaths();
  window.ipcRenderer.createGsiConfig(appStore.csgo2Path, appStore.steamPath);
});

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
  // 浅色模式：暖米白底 + 柔和灰蓝主色，长时间阅读不累
  return {
    common: {
      // 基础色
      bodyColor: '#faf6f0',
      cardColor: '#fffdf9',
      modalColor: '#ffffff',
      popoverColor: '#ffffff',
      tableColor: '#fffdf9',
      tableHeaderColor: '#f5f0e8',
      actionColor: '#f5f0e8',
      hoverColor: '#f0ebe0',
      // 主题色（柔和灰蓝）
      primaryColor: '#8b96b5',
      primaryColorHover: '#a1aec9',
      primaryColorPressed: '#7883a0',
      primaryColorSuppl: '#8b96b5',
      // 文字
      textColorBase: '#2c2a26',
      textColor1: '#2c2a26',
      textColor2: '#4d4840',
      textColor3: '#5e5850',
      textColorDisabled: '#90887a',
      placeholderColor: '#706960',
      // 边框/分隔线
      borderColor: '#d5cec3',
      borderColorHover: '#b8ae9e',
      dividerColor: '#e0d9ce',
      // 输入框
      inputColor: '#fffefc',
      inputColorDisabled: '#f8f5f0',
      inputColorFocus: '#fffefc',
      // 图标/关闭按钮
      iconColor: '#7d7568',
      iconColorHover: '#2c2a26',
      iconColorPressed: '#2c2a26',
      closeColorHover: '#e5ded3',
      closeIconColorHover: '#2c2a26',
      // 滚动条
      scrollbarColor: '#d5cec3',
      scrollbarColorHover: '#c0b8ab',
      // 开关/复选轨道与底色
      trackColor: '#e5ded3',
      railColor: '#e5ded3',
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
    :key="themeTransitionKey"
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

/* 模态遮罩跟随窗口圆角：主窗口为透明圆角（12px），遮罩默认铺满矩形会盖住透明四角，
   导致打开弹窗时窗口四角变成方形，这里给遮罩同款圆角让四角透出 */
.n-modal-mask {
  border-radius: 12px;
}
</style>
