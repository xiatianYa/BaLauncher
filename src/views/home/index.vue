<script setup lang="ts">
import { ref } from 'vue';
import HeaderBanner from './modules/header-banner.vue';

defineOptions({
  name: 'home'
});
</script>

<template>
  <NCard class="w-full h-full rounded-none" content-class="flex flex-col h-full overflow-auto" :bordered="false">
    <NCard>
      <HeaderBanner />
    </NCard>
  </NCard>
</template>

<style scoped lang="scss"></style>