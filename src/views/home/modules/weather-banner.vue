<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'WeatherBanner'
});

/** 天气数据（主进程 fetchCurrentWeather 返回，weather 字段为 JSON 字符串需解析） */
const weather = ref<Api.Weather.Current | null>(null);
/** 当前定位城市 */
const city = ref('');
/** 加载中状态 */
const loading = ref(true);
/** 加载失败信息 */
const error = ref('');

/** 和风天气天气代码 → mdi 图标 */
const WEATHER_ICONS: Record<string, string> = {
  '100': 'mdi:weather-sunny', // 晴
  '101': 'mdi:weather-partly-cloudy', // 多云
  '102': 'mdi:weather-partly-cloudy', // 少云
  '103': 'mdi:weather-partly-cloudy', // 晴间多云
  '104': 'mdi:weather-cloudy', // 阴
  '150': 'mdi:weather-night', // 晴(夜晚)
  '151': 'mdi:weather-night-partly-cloudy', // 多云(夜晚)
  '152': 'mdi:weather-night-partly-cloudy', // 少云(夜晚)
  '153': 'mdi:weather-night-partly-cloudy', // 晴间多云(夜晚)
  '300': 'mdi:weather-rainy', // 阵雨
  '301': 'mdi:weather-pouring', // 强阵雨
  '302': 'mdi:weather-lightning-rainy', // 雷阵雨
  '303': 'mdi:weather-lightning-rainy', // 强雷阵雨
  '304': 'mdi:weather-hail', // 雷阵雨伴有冰雹
  '305': 'mdi:weather-rainy', // 小雨
  '306': 'mdi:weather-pouring', // 中雨
  '307': 'mdi:weather-pouring', // 大雨
  '308': 'mdi:weather-pouring', // 极端降雨
  '309': 'mdi:weather-rainy', // 毛毛雨/细雨
  '310': 'mdi:weather-pouring', // 暴雨
  '311': 'mdi:weather-pouring', // 大暴雨
  '312': 'mdi:weather-pouring', // 特大暴雨
  '313': 'mdi:weather-snowy-rainy', // 冻雨
  '314': 'mdi:weather-rainy', // 小到中雨
  '315': 'mdi:weather-pouring', // 中到大雨
  '316': 'mdi:weather-pouring', // 大到暴雨
  '317': 'mdi:weather-pouring', // 暴雨到大暴雨
  '318': 'mdi:weather-pouring', // 大暴雨到特大暴雨
  '399': 'mdi:weather-pouring', // 雨
  '400': 'mdi:weather-snowy', // 小雪
  '401': 'mdi:weather-snowy-heavy', // 中雪
  '402': 'mdi:weather-snowy-heavy', // 大雪
  '403': 'mdi:weather-snowy-heavy', // 暴雪
  '404': 'mdi:weather-snowy-rainy', // 雨夹雪
  '405': 'mdi:weather-snowy-rainy', // 雨雪天气
  '406': 'mdi:weather-snowy-rainy', // 阵雨夹雪
  '407': 'mdi:weather-snowy', // 阵雪
  '408': 'mdi:weather-snowy', // 小到中雪
  '409': 'mdi:weather-snowy-heavy', // 中到大雪
  '410': 'mdi:weather-snowy-heavy', // 大到暴雪
  '499': 'mdi:weather-snowy-heavy', // 雪
  '500': 'mdi:weather-fog', // 薄雾
  '501': 'mdi:weather-fog', // 雾
  '502': 'mdi:weather-haze', // 霾
  '503': 'mdi:weather-windy', // 扬沙
  '504': 'mdi:weather-windy', // 浮尘
  '507': 'mdi:weather-windy', // 强沙尘暴
  '508': 'mdi:weather-windy', // 沙尘暴
  '509': 'mdi:weather-fog', // 浓雾
  '510': 'mdi:weather-fog', // 强浓雾
  '511': 'mdi:weather-haze', // 中度霾
  '512': 'mdi:weather-haze', // 重度霾
  '513': 'mdi:weather-haze', // 严重霾
  '514': 'mdi:weather-fog', // 大雾
  '515': 'mdi:weather-fog', // 特强浓雾
  '900': 'mdi:weather-sunny-alert', // 热
  '901': 'mdi:snowflake', // 冷
  '999': 'mdi:help-circle-outline' // 未知
};

/** 当前天气图标 */
const conditionIcon = computed(() => WEATHER_ICONS[weather.value?.condition.code ?? ''] ?? 'mdi:help-circle-outline');

/** 百分比显示（湿度/云量，0-1 → 0%-100%） */
const formatPercent = (value?: number): string => (value == null ? '-' : `${Math.round(value * 100)}%`);

/** 距离显示（能见度，米 → 公里） */
const formatVisibility = (value?: number): string => (value == null ? '-' : `${(value / 1000).toFixed(1)} km`);

/** UV 指数等级文案 */
const uvLevel = computed(() => {
  const uv = weather.value?.uvIndex ?? 0;
  if (uv <= 2) return $t('home.weatherUvLow');
  if (uv <= 5) return $t('home.weatherUvModerate');
  if (uv <= 7) return $t('home.weatherUvHigh');
  return $t('home.weatherUvVeryHigh');
});

/** UV 指数等级样式（用于文字配色） */
const uvClass = computed(() => {
  const uv = weather.value?.uvIndex ?? 0;
  if (uv <= 2) return 'safe';
  if (uv <= 5) return 'moderate';
  if (uv <= 7) return 'high';
  return 'danger';
});

/** 指标数据列表（精简：只展示重要信息，UV 已在顶部 hero 区展示故不重复） */
const metrics = computed(() => {
  const w = weather.value;
  if (!w) return [];
  return [
    {
      label: $t('home.weatherFeelsLike'),
      icon: 'mdi:thermometer',
      value: `${w.feelsLike?.value ?? '-'}${w.feelsLike?.unit ?? ''}`
    },
    {
      label: $t('home.weatherHumidity'),
      icon: 'mdi:water-percent',
      value: formatPercent(w.humidity)
    },
    {
      label: $t('home.weatherWind'),
      icon: 'mdi:weather-windy',
      value: `${w.wind?.direction?.compass ?? '-'} ${w.wind?.speed?.value ?? '-'}${w.wind?.speed?.unit ?? ''} ${w.wind?.scale ?? '-'}${$t('home.weatherWindLevel')}`
    },
    {
      label: $t('home.weatherVisibility'),
      icon: 'mdi:eye-outline',
      value: formatVisibility(w.visibility?.value)
    }
  ];
});

/** 获取并解析天气数据 */
const fetchWeather = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await window.ipcRenderer.fetchCurrentWeather();
    if (res?.weather) {
      weather.value = JSON.parse(res.weather) as Api.Weather.Current;
      city.value = res.city ?? '';
    } else {
      error.value = $t('home.weatherFetchFailed');
    }
  } catch (err) {
    console.error('[WEATHER] 获取天气失败:', err);
    error.value = $t('home.weatherFetchFailed');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchWeather);
</script>

<template>
  <div class="dash-card weather-card">
    <!-- 卡片头部：定位城市 + 实时徽章 -->
    <div class="card-header">
      <div class="card-title">
        <SvgIcon icon="mdi:map-marker-radius" class="card-title-icon" />
        <span>{{ city || $t('home.weather') }}</span>
      </div>
      <div class="header-right">
        <span class="live-badge">
          <span class="dot" />
          {{ $t('home.weatherRealtime') }}
        </span>
      </div>
    </div>

    <!-- 加载中：骨架屏 -->
    <div v-if="loading" class="weather-skeleton">
      <div class="skeleton-hero" />
      <div class="skeleton-grid">
        <div v-for="i in 6" :key="i" class="skeleton-item" />
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error || !weather" class="empty-state">
      <div class="empty-icon-wrap">
        <SvgIcon icon="mdi:weather-cloudy-alert" class="empty-icon" />
      </div>
      <p class="empty-title">{{ error || $t('home.weatherFetchFailed') }}</p>
    </div>

    <!-- 天气数据 -->
    <div v-else class="weather-body">
      <!-- hero：天气图标 + 温度 + 天气状况 + UV（纯排版，不设独立卡片背景） -->
      <div class="weather-hero">
        <SvgIcon :icon="conditionIcon" class="hero-icon" />
        <div class="hero-info">
          <div class="hero-temp">
            {{ weather.temperature.value }}<span class="hero-unit">{{ weather.temperature.unit }}</span>
          </div>
          <div class="hero-condition">{{ weather.condition.text }}</div>
        </div>
        <div class="hero-uv" :class="uvClass">
          <div class="hero-uv-value">{{ weather.uvIndex }}</div>
          <div class="hero-uv-level">{{ $t('home.weatherUVIndex') }} · {{ uvLevel }}</div>
        </div>
      </div>

      <!-- 指标网格（紧凑信息行，无背景无边框） -->
      <div class="weather-meta-grid">
        <div v-for="item in metrics" :key="item.label" class="meta-item">
          <SvgIcon :icon="item.icon" class="meta-icon" />
          <div class="meta-info">
            <span class="meta-label">{{ item.label }}</span>
            <span class="meta-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 外层唯一卡片 */
.dash-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: cardIn 0.45s ease-out forwards;
  box-sizing: border-box;
  overflow: hidden;

  &:hover {
    transform: translateY(-3px);
    background: rgba(var(--app-rgb), 0.07);
    border-color: rgba(var(--app-rgb), 0.35);
    box-shadow: 0 12px 28px rgba(var(--app-rgb), 0.12);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-shrink: 0;

    .card-title {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;

      .card-title-icon {
        font-size: 14px;
        color: #667eea;
        flex-shrink: 0;
      }

      span {
        font-size: 12px;
        font-weight: 700;
        color: var(--n-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;

      .live-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 500;
        color: #43e97b;
        background: rgba(67, 233, 123, 0.1);
        border: 1px solid rgba(67, 233, 123, 0.25);
        flex-shrink: 0;

        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #43e97b;
          box-shadow: 0 0 4px rgba(67, 233, 123, 0.6);
        }
      }
    }
  }

  /* 空状态 */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: rgba(var(--app-rgb), 0.4);

    .empty-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(var(--app-rgb), 0.08);

      .empty-icon {
        font-size: 22px;
        color: rgba(var(--app-rgb), 0.6);
      }
    }

    .empty-title {
      margin: 0;
      font-size: 12px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.7);
    }
  }

  /* 骨架屏 */
  .weather-skeleton {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .skeleton-hero,
    .skeleton-item {
      background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-hero {
      height: 44px;
      border-radius: 8px;
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;

      .skeleton-item {
        height: 28px;
        border-radius: 6px;
      }
    }
  }

  /* 天气内容：不设内部滚动，内容自适应卡片高度 */
  .weather-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    /* hero 小卡片 */
    .weather-hero {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 12px;
      background: rgba(var(--app-rgb), 0.04);
      border: 1px solid rgba(var(--app-rgb), 0.07);
      flex-shrink: 0;
      transition: all 0.25s ease;

      &:hover {
        border-color: rgba(var(--app-rgb), 0.5);
        box-shadow: 0 6px 16px rgba(var(--app-rgb), 0.12);
      }

      .hero-icon {
        font-size: 30px;
        color: #667eea;
        flex-shrink: 0;
      }

      .hero-info {
        flex: 1;
        min-width: 0;

        .hero-temp {
          font-size: 21px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--n-text-color);
          font-variant-numeric: tabular-nums;

          .hero-unit {
            font-size: 12px;
            font-weight: 500;
            margin-left: 2px;
            color: rgba(var(--app-rgb), 0.5);
          }
        }

        .hero-condition {
          margin-top: 1px;
          font-size: 11px;
          color: rgba(var(--app-rgb), 0.6);
        }
      }

      .hero-uv {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1px;
        flex-shrink: 0;

        &.safe {
          color: #43e97b;
        }

        &.moderate {
          color: #f0a020;
        }

        &.high {
          color: #fa8c16;
        }

        &.danger {
          color: #f5576c;
        }

        .hero-uv-value {
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
        }

        .hero-uv-level {
          font-size: 9.5px;
        }
      }
    }

    /* 指标网格：小卡片美化（参照 botGroup card-meta 风格） */
    .weather-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 9px;
        border-radius: 10px;
        background: rgba(var(--app-rgb), 0.03);
        border: 1px solid rgba(var(--app-rgb), 0.06);
        min-width: 0;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.07);
          border-color: rgba(var(--app-rgb), 0.35);
          transform: translateY(-1px);
        }

        .meta-icon {
          font-size: 14px;
          color: #667eea;
          flex-shrink: 0;
        }

        .meta-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;

          .meta-label {
            font-size: 9px;
            line-height: 1.2;
            color: rgba(var(--app-rgb), 0.4);
          }

          .meta-value {
            font-size: 11px;
            line-height: 1.2;
            color: rgba(var(--app-rgb), 0.85);
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
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

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
