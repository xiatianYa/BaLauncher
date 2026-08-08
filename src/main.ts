import { createApp } from 'vue'
import './plugins/assets';
import 'md-editor-v3/lib/style.css';
import 'animate.css';
import { setupRouter } from './router';
import { setupStore } from './store';
import { setupI18n } from './locales';
import App from './App.vue';
import { preloadIcons, commonIcons } from './utils/icon';
import VueLazyload from 'vue3-lazyload';

async function setupApp() {

  const app = createApp(App);

  preloadIcons(commonIcons);

  setupStore(app);

  setupI18n(app);

  await setupRouter(app);

  // 使用 vue3-lazyload 插件
  app.use(VueLazyload, {
    loading: 'https://www.bluearchive.top/statics/system/loading.gif',
    error: 'https://www.bluearchive.top/statics/system/error.gif'
  });

  // 应用初始化完成，通知加载动画结束（保证最短展示时长后淡出）
  window.__removeLoading__?.();
  // 等待加载动画完全结束（淡出移除）再挂载页面：加载层为纯透明背景，避免页面提前透出
  await window.__loadingDone__;

  app.mount('#app');
}

setupApp();