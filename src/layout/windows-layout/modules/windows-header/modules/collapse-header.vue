<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';

const authStore = useAuthStore();
</script>

<template>
  <div class="golobal-header-logo mb-5px cursor-pointer p-10px" v-if="authStore.isLogin">
    <NAvatar round size="small" :src="authStore.userInfo.avatar" />
  </div>
  <div class="golobal-header-logo mb-5px p-10px" v-else>
    <NText class="text-sm font-bold">{{ $t('layout.header.loginPrompt') }}</NText>
  </div>
</template>

<style scoped lang="scss">
.golobal-header-logo {
  width: 100%;
  display: flex;
  justify-content: center;
  border-radius: 12px;
  padding: 10px 20px;
  border: 1px solid rgba(95, 92, 92, 0.3);
}
</style>
