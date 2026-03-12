import { defineStore } from "pinia";
import { SetupStoreId } from "@/enum";
import { router as globalRouter } from "@/router";
import { RouteLocationRaw } from "vue-router";
import { reactive } from "vue";
import { localStg } from "@/utils/storage";
import icon940326 from '@/assets/imgs/menu/940326.png';
import icon939940 from '@/assets/imgs/menu/939940.png';
import icon911476 from '@/assets/imgs/menu/911476.png';
import icon207977 from '@/assets/imgs/menu/207977.png';


export const useRouteStore = defineStore(SetupStoreId.Route, () => {
  const router = globalRouter;
  const route = globalRouter.currentRoute;

  const routerPush = router.push;

  const routerBack = router.back;

  // 默认导航配置
  const DEFAULT_SIDE_NAV_ROUTES: Api.Route.SideNavItem[] = [
    {
      name: "首页",
      key: "home",
      icon: "material-symbols:home-outline-rounded",
      img: icon940326,
      isPersistent: true
    },
    {
      name: "服务器列表",
      key: "server",
      icon: "tabler:server",
      img: icon939940,
      isPersistent: true
    },
    {
      name:"工具箱",
      key:"tools",
      icon:"gg:toolbox",
      img: icon911476,
      isPersistent:true
    },
    {
      name: "系统设置",
      key: "setting",
      icon: "tabler:settings",
      img: icon207977,
      isPersistent: true
    },
  ];

  const storedRoutes = localStg.get('sideNavRoutes');
  const SideNavRoutes: Api.Route.SideNavItem[] = reactive(
    storedRoutes !== null ? storedRoutes : DEFAULT_SIDE_NAV_ROUTES
  );

  async function routerPushByKey(key: string, options?: App.Global.RouterPushOptions) {
    const { query, params } = options || {};

    const routeLocation: RouteLocationRaw = {
      name: key
    };

    if (Object.keys(query || {}).length) {
      routeLocation.query = query;
    }

    if (Object.keys(params || {}).length) {
      routeLocation.params = params;
    }

    return routerPush(routeLocation);
  }

  async function toHome() {
    return routerPushByKey('root');
  }

  /** Reset store */
  async function resetStore() {
    const routeStore = useRouteStore();

    routeStore.$reset();
  }

  /**
  * Navigate to login page
  *
  * @param loginModule The login module
  * @param redirectUrl The redirect url, if not specified, it will be the current route fullPath
  */
  async function toLogin(loginModule?: UnionKey.LoginModule, redirectUrl?: string) {
    const module = loginModule || 'pwd-login';

    const options: App.Global.RouterPushOptions = {
      params: {
        module
      }
    };

    const redirect = redirectUrl || route.value.fullPath;

    options.query = {
      redirect
    };

    return routerPushByKey('login', options);
  }

  /**
  * Redirect from login
  *
  * @param [needRedirect=true] Whether to redirect after login. Default is `true`
  */
  async function redirectFromLogin(needRedirect = true) {
    const redirect = route.value.query?.redirect as string;

    if (needRedirect && redirect) {
      await routerPush(redirect);
    } else {
      await toHome();
    }
  }

  return {
    route,
    router,
    SideNavRoutes,
    resetStore,
    routerPush,
    routerBack,
    routerPushByKey,
    toLogin,
    redirectFromLogin
  };
});
