<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';

defineOptions({
  name: 'HeaderBanner'
});

const authStore = useAuthStore();

</script>

<template>
  <NCard :bordered="false" content-style="padding:0px;">
    <NGrid :x-gap="0" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 s:24 m:18">
        <div class="flex items-center">
          <div v-show="authStore.isLogin">
            <NAvatar :src="authStore.userInfo.avatar" round :size="48" />
          </div>
          <div class="pl-12px">
            <h3 class="text-18px font-semibold">
              今天又是充满活力的一天!
            </h3>
            <p class="text-#999 leading-30px">欢迎光临蔚蓝档案登录器！🌈</p>
          </div>
        </div>
      </NGi>
    </NGrid>
  </NCard>
</template>

<style scoped></style>
