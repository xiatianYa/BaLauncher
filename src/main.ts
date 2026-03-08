import { createApp } from 'vue'
import './plugins/assets';
import 'animate.css';
import { setupRouter } from './router';
import { setupStore } from './store';
import App from './App.vue'

async function setupApp() {

  const app = createApp(App);
  
  setupStore(app);

  await setupRouter(app);
  
  app.mount('#app');

  // 通知 preload 脚本移除加载动画
  window.postMessage({ payload: 'removeLoading' }, '*')
}

setupApp();