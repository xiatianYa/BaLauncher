import { computed } from 'vue';
import { useAuthStore } from '@/store/modules/auth';

// 管理员角色：超管、管理员
const ADMIN_ROLES = ['R_SUPER', 'R_ADMIN'];

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

  // 是否为管理员
  const isAdmin = computed(() => hasRole(ADMIN_ROLES));

  // 是否为超级管理员
  const isSuperAdmin = computed(() => hasRole('R_SUPER'));

  return {
    hasAuth,
    hasRole,
    isAdmin,
    isSuperAdmin
  };
}
