<script setup lang="ts">
import { useAppStore } from '@/store/modules/app';

// 应用仓库
const appStore = useAppStore();

defineOptions({
  name: 'CreativityBanner'
});
</script>

<template>
  <NCard :bordered="true" size="small" class="card-wrapper h-400px"
    content-class="flex overflow-auto" content-style="padding:10px 10px 10px 10px"
    header-style="padding:5px 10px 5px 10px;">
    <NGrid cols="4 s:6 m:8 l:10 xl:12 2xl:14" responsive="screen">
      <NGridItem v-for="(user, index) in appStore.onlineUserList" :key="index">
        <NTooltip trigger="hover">
          <template #trigger>
            <img v-lazy="user.avatar" class="h-40px w-40px rounded-full" />
          </template>
          {{ user.nickName }}
        </NTooltip>
      </NGridItem>
    </NGrid>
  </NCard>
</template>

<style scoped></style>
