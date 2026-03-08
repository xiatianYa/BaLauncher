import { createApp } from 'vue'
import './plugins/assets';
import 'animate.css';
import { setupRouter } from './router';
import { setupStore } from './store';
import App from './App.vue';
import { preloadIcons, commonIcons } from './utils/icon';

async function setupApp() {
  console.log('[App] 开始初始化应用...');

  const app = createApp(App);

  console.log('[App] 应用已挂载，开始预加载图标...');

  preloadIcons(commonIcons).then(() => {
    console.log('[App] 图标预加载完成');
  });

  setupStore(app);

  await setupRouter(app);

  app.mount('#app');

  window.postMessage({ payload: 'removeLoading' }, '*');
}

setupApp();