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
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <div class="setting-header">
          <SvgIcon icon="ic:twotone-settings" class="setting-icon" />
          <div class="setting-title-group">
            <h1 class="setting-title">
              <NText>
                {{ $t('routes.setting') }}
              </NText>
            </h1>
            <span class="setting-subtitle">应用参数与偏好设置</span>
          </div>
        </div>
      </template>

      <!-- 设置内容 -->
      <div class="setting-body">
        <ThemeSetting class="setting-section" style="--delay: 0s" />
        <GeneralSetting class="setting-section" style="--delay: 0.08s" />
        <CacheSetting ref="cacheSettingRef" class="setting-section" style="--delay: 0.16s" />
        <AboutSetting ref="aboutSettingRef" class="setting-section" style="--delay: 0.24s" />
      </div>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
.setting-header {
  display: flex;
  align-items: center;
  gap: 10px;

  .setting-icon {
    font-size: 22px;
    color: var(--primary-color, #18a058);
  }

  .setting-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .setting-title {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.3;
      color: var(--n-text-color);
    }

    .setting-subtitle {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.45);
    }
  }
}

.setting-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
}

.setting-section {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  // 进入动画：错落淡入上浮
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
