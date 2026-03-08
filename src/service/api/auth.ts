import { request } from '@/service/request';
/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    data: {
      userName,
      password
    }
  });
}

/**
 * Login
 *
 * @param accessToken accessToken
 * @param openId openId
 * @param type LoginType 0:QQ 1:Steam
 */
export function fetchOAuthLogin(accessToken: string, openId: string, type: number) {
  return request<Api.Auth.LoginToken>({
    url:'/auth/oauth2/login',
    method: 'post',
    data: {
      accessToken,
      openId,
      type
    }
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/auth/getUserInfo' });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}

/** Logout */
export function fetchLogout() {
  return request<string>({
    url: '/auth/logout',
    method: 'post'
  });
}
