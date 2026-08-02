<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NText } from 'naive-ui'
import ThemeSetting from './modules/ThemeSetting.vue'
import GeneralSetting from './modules/GeneralSetting.vue'
import CacheSetting from './modules/CacheSetting.vue'
import AboutSetting from './modules/AboutSetting.vue'

defineOptions({
  name: 'setting',
})

const cacheSettingRef = ref<InstanceType<typeof CacheSetting>>()
const aboutSettingRef = ref<InstanceType<typeof AboutSetting>>()

onMounted(() => {
  cacheSettingRef.value?.calculateCacheSize()
  aboutSettingRef.value?.getAppVersion()
})
</script>

<template>
  <div class="setting-page">
    <div class="setting-card">
      <!-- 页面标题 -->
      <div class="setting-header">
        <SvgIcon icon="ic:twotone-settings" class="setting-icon" />
        <h1 class="setting-title">
          <NText>
            {{ $t('routes.setting') }}
          </NText>
        </h1>
      </div>

      <!-- 设置内容 -->
      <div class="setting-body">
        <ThemeSetting />
        <GeneralSetting />
        <CacheSetting ref="cacheSettingRef" />
        <AboutSetting ref="aboutSettingRef" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.setting-page {
  width: 100%;
  height: 100%;
  padding: 12px;
  overflow: hidden;
  background-color: var(--n-color);
  color: var(--n-text-color);
}

.setting-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background-color: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--n-divider-color);

  .setting-icon {
    font-size: 22px;
    color: var(--primary-color, #18a058);
  }

  .setting-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1;
    color: var(--n-text-color);
  }
}

.setting-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
}
</style>
