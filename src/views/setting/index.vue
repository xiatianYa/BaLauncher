<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { animate } from 'animejs';
import { NCard, NText } from 'naive-ui';
import ThemeSetting from './modules/ThemeSetting.vue';
import GeneralSetting from './modules/GeneralSetting.vue';
import CacheSetting from './modules/CacheSetting.vue';
import AboutSetting from './modules/AboutSetting.vue';

defineOptions({
  name: 'setting'
});

const titleRef = ref<HTMLElement | null>(null);
const cacheSettingRef = ref();
const aboutSettingRef = ref();

onMounted(() => {
  if (cacheSettingRef.value) {
    cacheSettingRef.value.calculateCacheSize();
  }
  if (aboutSettingRef.value) {
    aboutSettingRef.value.getAppVersion();
  }

  nextTick(() => {
    if (titleRef.value) {
      const text = titleRef.value.textContent || '';
      titleRef.value.innerHTML = '';

      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.className = 'title-char';
        span.style.opacity = '0';
        span.style.transform = 'translateY(-30px) rotate(-10deg)';
        titleRef.value!.appendChild(span);
      });

      animate(titleRef.value, {
        targets: '.title-char',
        translateY: [-30, 0],
        rotate: [-10, 0],
        opacity: [0, 1],
        delay: 80,
        duration: 800,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  });
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:10px;"
      content-class="h-full flex flex-col flex-1 overflow-y-auto" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <div class="title-container">
          <div class="flex items-center">
            <div class="setting-icon">⚙️</div>
          </div>
          <h1 class="title-text text-20px font-bold bg-gradient-to-r bg-clip-text text-transparent ml-5px">
            <NText>
              {{ $t('routes.setting') }}
            </NText>
          </h1>
        </div>
      </template>
      <ThemeSetting />
      <GeneralSetting />
      <CacheSetting ref="cacheSettingRef" />
      <AboutSetting ref="aboutSettingRef" />
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
.title-container {
  display: flex;
  align-items: center;
  position: relative;

  .setting-icon {
    font-size: 24px;
    animation: rotate 10s linear infinite;
    display: inline-block;
  }

  .title-text {
    height: 100%;
    display: inline-flex;
    letter-spacing: 0.05em;

    .title-char {
      display: inline-block;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
