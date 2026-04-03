import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    if (typeof codes === 'string') {
      return authStore.userInfo.buttons.includes(codes);
    }

    return codes.some(code => authStore.userInfo.buttons.includes(code));
  }

  function hasRole(roles: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    if (typeof roles === 'string') {
      return authStore.userInfo.roles.includes(roles);
    }

    return roles.some(role => authStore.userInfo.roles.includes(role));
  }

  return {
    hasAuth,
    hasRole
  };
}
