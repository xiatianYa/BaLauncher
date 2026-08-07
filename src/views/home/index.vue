<script setup lang="ts">
import WelcomeBanner from './modules/welcome-banner.vue';
import ServerCurrentOnline from './modules/server-current-online.vue';
import ServerHistoryOnline from './modules/server-history-online.vue';
import OnlineBanner from './modules/on-line-banner.vue';
import MapPlayTime from './modules/map-play-time.vue';
import WeatherBanner from './modules/weather-banner.vue';

defineOptions({
  name: 'home'
});
</script>

<template>
  <div class="home-container">
    <!-- 欢迎提示（固定内容高度，不参与伸缩） -->
    <WelcomeBanner class="flex-shrink-0" />

    <!-- 服务器在线统计 -->
    <div class="grid grid-cols-2 gap-14px flex-2 max-h-250px">
      <ServerCurrentOnline />
      <ServerHistoryOnline />
    </div>

    <!-- 地图游玩排行 / 天气 -->
    <div class="grid grid-cols-2 gap-14px flex-1 min-h-0">
      <MapPlayTime />
      <WeatherBanner />
    </div>

    <!-- 在线玩家 -->
    <div class="flex-1 max-h-120px">
      <OnlineBanner />
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 2px;
}
</style>
