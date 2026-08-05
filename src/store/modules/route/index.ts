import { defineStore } from "pinia";
import { SetupStoreId } from "@/enum";
import { router as globalRouter } from "@/router";
import { RouteLocationRaw } from "vue-router";
import { computed, reactive } from "vue";
import { localStg } from "@/utils/storage";
import { ROUTE_STORAGE_KEYS } from '@/constants/cache';
import { useAuthStore } from '@/store/modules/auth';
import iconHome from '@/assets/imgs/menu/menu-home.png';
import iconServer from '@/assets/imgs/menu/menu-server.png';
import iconTools from '@/assets/imgs/menu/menu-tools.png';
import iconSetting from '@/assets/imgs/menu/menu-setting.png';
import iconUpdateLog from '@/assets/imgs/menu/menu-update-log.png';
import iconHall from '@/assets/imgs/menu/menu-hall.png';
import iconRole from '@/assets/imgs/menu/menu-role.png';
import iconUser from '@/assets/imgs/menu/menu-user.png';


export const useRouteStore = defineStore(SetupStoreId.Route, () => {
  const router = globalRouter;
  const route = globalRouter.currentRoute;

  const authStore = useAuthStore();

  // 需要超级管理员权限才能显示的菜单 key
  const SUPER_ADMIN_ONLY_MENU_KEYS = ['roleManage'];

  // 需要管理员权限才能显示的菜单 key
  const ADMIN_ONLY_MENU_KEYS = ['userManage'];

  // 是否为超级管理员
  const isSuperAdmin = computed(() => authStore.userInfo.roles.includes('R_SUPER'));

  // 是否为管理员（超管或管理员）
  const isAdmin = computed(() =>
    authStore.userInfo.roles.some(role => ['R_SUPER', 'R_ADMIN'].includes(role))
  );

  const routerPush = router.push;

  const routerBack = router.back;

  const normalizeNavItemName = (name: string) => {
    const map: Record<string, string> = {
      '首页': 'routes.home',
      '服务器': 'routes.server',
      '工具箱': 'routes.tools',
      '角色管理': 'routes.roleManage',
      '用户管理': 'routes.userManage',
      '设置': 'routes.setting',
    };
    return map[name] ?? name;
  };

  const normalizeNavItem = (item: Api.Route.SideNavItem) => ({
    ...item,
    name: normalizeNavItemName(item.name),
  });

  // 默认导航配置
  const DEFAULT_SIDE_NAV_ROUTES: Api.Route.SideNavItem[] = [
    {
      name: "routes.home",
      key: "home",
      icon: "material-symbols:home-outline-rounded",
      img: iconHome,
      isPersistent: true
    },
    {
      name: "routes.server",
      key: "server",
      icon: "tabler:server",
      img: iconServer,
      isPersistent: true
    },
    {
      name: "routes.tools",
      key: "tools",
      icon: "gg:toolbox",
      img: iconTools,
      isPersistent: true
    },
    {
      name: "routes.updateLog",
      key: "updateLog",
      icon: "tabler:history",
      img: iconUpdateLog,
      isPersistent: true
    },
    {
      name: "routes.setting",
      key: "setting",
      icon: "tabler:settings",
      img: iconSetting,
      isPersistent: true
    },
  ];

  const storedRoutes = localStg.get(ROUTE_STORAGE_KEYS.SIDE_NAV_ROUTES);
  // 合并默认菜单：保证新增的默认菜单（如角色管理）在已保存过的旧配置中也能出现
  const initialRoutes: Api.Route.SideNavItem[] = Array.isArray(storedRoutes)
    ? DEFAULT_SIDE_NAV_ROUTES.reduce(
      (acc, def) => (acc.some(item => item.key === def.key) ? acc : [...acc, def]),
      [...storedRoutes]
    )
    : DEFAULT_SIDE_NAV_ROUTES;
  const SideNavRoutes: Api.Route.SideNavItem[] = reactive(initialRoutes.map(normalizeNavItem));

  // 侧边菜单（按权限过滤：超管专属菜单仅超管可见，管理员专属菜单仅管理员可见）
  const menuRoutes = computed(() =>
    SideNavRoutes.filter(item => {
      if (SUPER_ADMIN_ONLY_MENU_KEYS.includes(item.key)) {
        return isSuperAdmin.value;
      }
      if (ADMIN_ONLY_MENU_KEYS.includes(item.key)) {
        return isAdmin.value;
      }
      return true;
    })
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
    menuRoutes,
    resetStore,
    routerPush,
    routerBack,
    routerPushByKey,
    toLogin,
    redirectFromLogin
  };
});
