<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';
import { ThemeColor } from '@/constants/app';
import { $t } from '@/locales';

const authStore = useAuthStore();
interface RoleInfo {
  label: string;
  type: ThemeColor;
}

const getRoleInfo = (role: string) : RoleInfo => {
  switch (role) {
    case 'R_SUPER':
      //返回RoleInfo
      return { label: $t('layout.header.roles.superAdmin'), type: 'error' };
    case 'R_ADMIN':
      //返回RoleInfo
      return { label: $t('layout.header.roles.admin'), type: 'warning' };
    case 'R_USER':
      //返回RoleInfo
      return { label: $t('layout.header.roles.user'), type: 'info' };
    default:
      //返回RoleInfo
      return { label: role || $t('layout.header.roles.guest'), type: 'default' }; 
  }
};
</script>

<template>
  <div class="global-header-container" v-if="authStore.isLogin">
    <div class="user-info-card">
      <NAvatar round size="large" :src="authStore.userInfo.avatar" class="user-avatar" />
      <div class="user-info">
        <NEllipsis :max="1" class="user-name">{{ authStore.userInfo.userName }}</NEllipsis>
        <NTag :type="getRoleInfo(authStore.userInfo.roles?.[0]).type" size="small" ghost class="user-role-tag">
          {{ getRoleInfo(authStore.userInfo.roles?.[0]).label }}
        </NTag>
      </div>
    </div>
  </div>
  <div class="global-header-container" v-else>
    <div class="login-prompt" @click="authStore.loginModalVisibel = true">
      <SvgIcon icon="mdi:login" class="login-prompt-icon" />
      <span class="login-prompt-text">{{ $t('layout.header.login') }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.global-header-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

/* 用户信息卡片 */
.user-info-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(102, 126, 234, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.18);
  }

  .user-avatar {
    flex-shrink: 0;
  }

  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;

    .user-name {
      width: 100%;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      color: rgba(255, 255, 255, 0.9);
    }

    .user-role-tag {
      border-radius: 6px;
    }
  }
}

/* 未登录登录引导 */
.login-prompt {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(102, 126, 234, 0.35);
  }

  .login-prompt-icon {
    font-size: 18px;
    color: #667eea;
    flex-shrink: 0;
  }

  .login-prompt-text {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
  }
}
</style>
