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
  <NCard class="w-full h-full" content-class="flex flex-col" content-style="padding:0px;" :bordered="false">
    <NCard class="mb-20px">
      <HeaderBanner />
    </NCard>
    <NCard class="mb-20px">
      <NGrid :cols="2" x-gap="10">
        <NGridItem>
          <NTabs type="segment" animated>
            <NTabPane name="Line Chart" :tab="$t('home.communityHistoryOnline')">
              <LineChart />
            </NTabPane>
            <NTabPane name="Pie Chart" :tab="$t('home.communityRealtimeOnline')">
              <PieChart />
            </NTabPane>
            <NTabPane name="Map Chart" :tab="$t('home.mapPlayStats')">
            </NTabPane>
          </NTabs>
        </NGridItem>
        <NGridItem>
          <NTabs type="segment" animated>
            <NTabPane name="onLine Games" :tab="$t('home.onlinePlayers')">
              <OnlineBanner />
            </NTabPane>
          </NTabs>
        </NGridItem>
      </NGrid>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss"></style>