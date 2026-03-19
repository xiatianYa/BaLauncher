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

  app.mount('#app');

  window.postMessage({ payload: 'removeLoading' }, '*');
}

setupApp();