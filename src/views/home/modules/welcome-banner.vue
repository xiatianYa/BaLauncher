<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'WelcomeBanner'
});

const appStore = useAppStore();
const { locale } = useI18n();

/** 当前时间（每秒刷新） */
const now = ref(dayjs());

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    now.value = dayjs();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

/** 当前时刻问候语 */
const greeting = computed(() => {
  const hour = now.value.hour();
  if (hour < 6) return $t('home.welcomeEvening');
  if (hour < 12) return $t('home.welcomeMorning');
  if (hour < 18) return $t('home.welcomeAfternoon');
  return $t('home.welcomeEvening');
});

/** 当前日期（dayjs 格式化 YYYY-MM-DD） */
const dateText = computed(() => now.value.format('YYYY-MM-DD'));
/** 当前时间（dayjs 格式化 HH:mm:ss） */
const timeText = computed(() => now.value.format('HH:mm:ss'));
/** 星期几（dayjs 按当前语言格式化 dddd） */
const weekText = computed(() => {
  const localeName = locale.value === 'zh-CN' ? 'zh-cn' : 'en';
  return now.value.locale(localeName).format('dddd');
});
</script>

<template>
  <div class="welcome-banner">
    <!-- 左侧：问候 + 欢迎语 -->
    <div class="welcome-left">
      <div class="greeting-row">
        <span class="greeting-text">{{ greeting }}</span>
        <SvgIcon icon="mdi:hand-wave" class="greeting-icon" />
      </div>
      <div class="welcome-title">{{ $t('home.welcome') }}</div>
      <div class="welcome-sub">{{ $t('home.greeting') }}</div>
    </div>

    <!-- 右侧：时间 + 日期 + 当前主题 -->
    <div class="welcome-right">
      <div class="time-block">
        <span class="time">{{ timeText }}</span>
        <span class="date">{{ dateText }} {{ weekText }}</span>
      </div>
      <div class="theme-badge">
        <SvgIcon icon="mdi:palette-outline" class="theme-badge-icon" />
        <span>{{ appStore.currentTheme }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  border-radius: 14px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: cardIn 0.45s ease-out forwards;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(var(--app-rgb), 0.45);
    box-shadow: 0 10px 24px rgba(var(--app-rgb), 0.12);
  }

  .welcome-left {
    min-width: 0;

    .greeting-row {
      display: flex;
      align-items: center;
      gap: 5px;

      .greeting-text {
        font-size: 12px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 1);
      }

      .greeting-icon {
        font-size: 16px;
        color: rgba(var(--app-rgb), 1);
      }
    }

    .welcome-title {
      margin-top: 2px;
      font-size: 18px;
      font-weight: 700;
      color: var(--n-text-color);
      letter-spacing: 0.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .welcome-sub {
      margin-top: 2px;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.55);
    }
  }

  .welcome-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .time-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;

      .time {
        font-size: 20px;
        font-weight: 700;
        line-height: 1.1;
        color: var(--n-text-color);
        font-variant-numeric: tabular-nums;
      }

      .date {
        font-size: 11.5px;
        color: rgba(var(--app-rgb), 0.5);
      }
    }

    .theme-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 8px;
      font-size: 12px;
      color: rgba(var(--app-rgb), 1);
      background: rgba(var(--app-rgb), 0.12);
      border: 1px solid rgba(var(--app-rgb), 0.2);

      .theme-badge-icon {
        font-size: 13px;
      }
    }
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
