import type {
  Router
} from 'vue-router';
import { useAuthStore } from '@/store/modules/auth';
import ServerWebsocket from '@/utils/ws/server';
import { useGameStore } from '@/store/modules/game';
import { useDictStore } from '@/store/modules/dict';
/**
 * create route guard
 *
 * @param router router instance
 */
// 初始化状态标志
let isInitialized = false;

export function createRouteGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const gameStore = useGameStore();
    const dictStore = useDictStore();

    if (!authStore.isLogin) {
      authStore.loginModalVisibel = true;
    }

    if (authStore.isLogin && !isInitialized) {
      // 开始监听用户是否运行CS2
      gameStore.startGameRunningCheck();
      await authStore.initUserInfo();
      await dictStore.init();
      await gameStore.initServerList();
      if (!ServerWebsocket.ServerWebsocket) {
        gameStore.initServerWebsocket();
      }
      isInitialized = true;
    }

    next();
  });
}
