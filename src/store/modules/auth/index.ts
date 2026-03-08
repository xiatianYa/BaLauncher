import { defineStore } from "pinia";
import { SetupStoreId } from "@/enum";
import { computed, reactive, ref } from "vue";
import { clearAuthStorage, getToken } from "./shared";
import { fetchGetUserInfo, fetchLogin, fetchLogout, fetchOAuthLogin } from "@/service/api/auth"
import { localStg } from "@/utils/storage";
import { useRouterPush } from "@/hooks/common/router";
import { useGameStore } from "@/store/modules/game";
import { useDictStore } from "@/store/modules/dict";

/** Auth store */
export const useAuthStore = defineStore(SetupStoreId.Auth, () => {

  const authStore = useAuthStore();

  const gameStore = useGameStore();

  const dictStore = useDictStore();

  const token = ref(getToken());

  const { redirectFromLogin, toHome } = useRouterPush(false);

  // 初始用户信息
  const initialUserInfo: Api.Auth.UserInfo = {
    userId: '',
    userName: '',
    avatar: '',
    roles: [],
    buttons: []
  };

  const userInfo: Api.Auth.UserInfo = reactive({ ...initialUserInfo });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** login modal show */
  const loginModalVisibel = ref<boolean>(false);

  /** 手动实现重置方法，替代$reset() */
  async function resetStore() {
    await fetchLogout();

    clearAuthStorage();

    token.value = '';

    recordUserId();

    Object.assign(userInfo, initialUserInfo);

    gameStore.closeServerWebsocket();

    toHome();

    loginModalVisibel.value = true;
  }

  /** Record the user ID of the previous login session */
  function recordUserId() {
    if (!userInfo.userId) {
      return;
    }
    localStg.set('lastLoginUserId', userInfo.userId);
  }

  /**
   * Login
   *
   * @param userName User name
   * @param password Password
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(userName: string, password: string, redirect = true) {
    const { data: loginToken, error } = await fetchLogin(userName, password);
    if (!error) {
      const pass = await loginByToken(loginToken);

      if (pass) {
        let needRedirect = redirect;

        // initialize the websocket
        gameStore.initServerWebsocket();
        // 开始监听用户是否运行CS2
        gameStore.startGameRunningCheck();
        // initialize the community list
        await gameStore.initServerList();
        // initialize the dict
        await dictStore.init();
        // initialize the user info
        await authStore.getUserInfo();

        loginModalVisibel.value = false;

        await redirectFromLogin(needRedirect);

        window.$notification?.success({
          title: "登陆成功",
          content: `欢迎回来,${userInfo.userName}!`,
          duration: 4500,
        });

        toHome();
      }
    } else {
      window.$notification?.error({
        title: "登陆失败",
        content: error.message,
        duration: 4500,
      });
      resetStore();
    }
  }

  /**
 * Login
 *
 * @param accessToken Access token
 * @param openId Open ID
 * @param type 0:QQ 1:微信
 * @param [redirect=true] Whether to redirect after login. Default is `true`
 */
  async function oAuthLogin({
    accessToken,
    openId,
    type,
    redirect = true
  }: {
    accessToken: string;
    openId: string;
    type: number;
    redirect?: boolean;
  }) {
    console.log(accessToken, openId, type);

    const { data: loginToken, error } = await fetchOAuthLogin(accessToken, openId, type);

    if (!error) {
      const pass = await loginByToken(loginToken);

      if (pass) {
        let needRedirect = redirect;

        // initialize the websocket
        gameStore.initServerWebsocket();
        // 开始监听用户是否运行CS2
        gameStore.startGameRunningCheck();
        // initialize the community list
        await gameStore.initServerList();
        // initialize the dict
        await dictStore.init();
        // initialize the user info
        await authStore.getUserInfo();

        loginModalVisibel.value = false;

        await redirectFromLogin(needRedirect);

        window.$notification?.success({
          title: "登陆成功",
          content: `欢迎回来,${userInfo.userName}!`,
          duration: 4500,
        });
      }
    } else {
      window.$notification?.error({
        title: "登陆失败",
        content: error.message,
        duration: 4500,
      });
      resetStore();
    }
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    // 1. 存储token到localStorage
    localStg.set("token", loginToken.token);
    localStg.set("refreshToken", loginToken.refreshToken);

    // 2. 获取用户信息
    const pass = await getUserInfo();

    if (pass) {
      token.value = loginToken.token;
      return true;
    }

    return false;
  }

  async function getUserInfo() {
    const { data: info, error } = await fetchGetUserInfo();

    if (!error) {
      // 更新用户信息
      Object.assign(userInfo, info);
      return true;
    }

    return false;
  }

  async function initUserInfo() {
    const hasToken = getToken()

    token.value = hasToken;

    if (hasToken) {
      const pass = await getUserInfo();
      if (!pass) {
        resetStore();
      }
    }
  }

  return {
    token,
    userInfo,
    isLogin,
    loginModalVisibel,
    oAuthLogin,
    resetStore,
    initUserInfo,
    loginByToken,
    login,
    getUserInfo
  };
});