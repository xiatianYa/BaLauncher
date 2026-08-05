<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';

const authStore = useAuthStore();
</script>

<template>
  <div class="global-header-container" v-if="authStore.isLogin">
    <div class="avatar-card">
      <NAvatar round size="small" :src="authStore.userInfo.avatar" />
    </div>
  </div>
  <div class="global-header-container" v-else>
    <div class="login-icon-btn" @click="authStore.loginModalVisibel = true">
      <SvgIcon icon="mdi:login" class="login-icon" />
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

/* 头像卡片 */
.avatar-card {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 10px 0;
  border-radius: 12px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.07);
    border-color: rgba(102, 126, 234, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.18);
  }
}

/* 未登录登录图标按钮 */
.login-icon-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.07);
    border-color: rgba(102, 126, 234, 0.35);
  }

  .login-icon {
    font-size: 20px;
    color: #667eea;
  }
}
</style>
