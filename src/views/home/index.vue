<script setup lang="ts">
import HeaderBanner from './modules/header-banner.vue';
import PieChart from './modules/pie-chart.vue';

defineOptions({
  name: 'home'
});

</script>

<template>
  <NCard class="w-full h-full rounded-none" content-class="flex flex-col h-full overflow-auto" :bordered="false">
    <NCard class="mb-20px">
      <HeaderBanner />
    </NCard>
    <NCard :bordered="true" class="w-full h-full rounded-none" content-class="flex h-full overflow-auto">
      <NCard :bordered="false" content-style="padding:0px" class="card-wrapper w50%">
        <PieChart />
      </NCard>
      <NCard :bordered="false" content-style="padding:0px" class="card-wrapper w50%">
      </NCard>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss"></style>