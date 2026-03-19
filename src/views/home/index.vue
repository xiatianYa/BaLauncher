<script setup lang="ts">
import HeaderBanner from './modules/header-banner.vue';
import PieChart from './modules/pie-chart.vue';
import LineChart from './modules/line-chart.vue';
import OnlineBanner from './modules/on-line-banner.vue';

defineOptions({
  name: 'home'
});

</script>

<template>
  <NCard class="w-full h-full" content-class="flex flex-col h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="mb-20px">
      <HeaderBanner />
    </NCard>
    <NCard class="mb-20px">
      <NGrid :cols="2" x-gap="10">
        <NGridItem>
          <NTabs type="segment" animated>
            <NTabPane name="Line Chart" tab="社区历史在线">
              <LineChart />
            </NTabPane>
            <NTabPane name="Pie Chart" tab="社区实时在线">
              <PieChart />
            </NTabPane>
            <NTabPane name="Map Chart" tab="地图游玩统计">
            </NTabPane>
          </NTabs>
        </NGridItem>
        <NGridItem>
          <OnlineBanner />
        </NGridItem>
      </NGrid>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss"></style>