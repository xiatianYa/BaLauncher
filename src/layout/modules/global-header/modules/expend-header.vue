<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';
import { ThemeColor } from '@/constants/app';

const authStore = useAuthStore();

interface RoleInfo {
  label: string;
  type: ThemeColor;
}

const getRoleInfo = (role: string) : RoleInfo => {
  switch (role) {
    case 'R_SUPER':
      //返回RoleInfo
      return { label: '超级管理员', type: 'error' };
    case 'R_ADMIN':
      //返回RoleInfo
      return { label: '管理员', type: 'warning' };
    case 'R_USER':
      //返回RoleInfo
      return { label: 'LV 1', type: 'info' };
    default:
      //返回RoleInfo
      return { label: role || 'LV 0', type: 'default' };
  }
};
</script>

<template>
  <div class="golobal-header-container overflow-hidden mb-10px p-10px" v-if="authStore.isLogin">
    <div class="user-info-box mb-5px">
      <NAvatar round size="large" :src="authStore.userInfo.avatar" class="user-avatar" />
      <div class="user-info overflow-hidden">
        <NEllipsis :max="1">{{ authStore.userInfo.userName }}</NEllipsis>
        <NTag :type="getRoleInfo(authStore.userInfo.roles?.[0]).type" size="small" ghost class="rounded-5px">
          {{ getRoleInfo(authStore.userInfo.roles?.[0]).label }}
        </NTag>
      </div>
    </div>
  </div>
  <div class="golobal-header-login mb-5px cursor-pointer" v-else>
    <NText class="text-sm font-bold">登陆</NText>
  </div>
</template>

<style scoped lang="scss">
.golobal-header-container {
  width: 100%;
  display: flex;
  justify-content: center;

  .user-info-box {
    width: 100%;
    display: flex;
    align-items: center;
    border-radius: 12px;
    padding: 10px 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(95, 92, 92, 0.3);

    &:hover {
      background-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
  }

  .user-avatar {
    margin-right: 12px;
    flex-shrink: 0;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .user-name {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .user-role {
    font-size: 12px;
  }
}

.golobal-header-login {
  width: 100%;
  display: flex;
  justify-content: center;
  border-radius: 12px;
  padding: 10px;
  border: 1px solid rgba(95, 92, 92, 0.3);
}
</style>