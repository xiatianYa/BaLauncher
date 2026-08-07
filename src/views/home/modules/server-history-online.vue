<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { i18n, $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useGameStore } from '@/store/modules/game';
import { useThemeStore } from '@/store/modules/theme';
import { useAuthStore } from '@/store/modules/auth';
import HomeEmptyState from './empty-state.vue';
import { fetchGetCommunityOnlineBar } from '@/service/api';
import { ECOption, useEcharts } from '@/hooks/common/echarts';
import type { BarSeriesOption } from 'echarts/charts';
import type { PieSeriesOption } from 'echarts/charts';

defineOptions({
  name: 'ServerHistoryOnline'
});

const gameStore = useGameStore();
const themeStore = useThemeStore();
const authStore = useAuthStore();

/* ===== 图表类型切换 ===== */

type ChartType = 'bar' | 'pie';
const chartType = ref<ChartType>('bar');

/** 选项存 key，模板内 $t 渲染，保证语言切换时文案同步更新 */
const CHART_TYPE_OPTIONS = [
  { labelKey: 'home.communityHistoryOnline', value: 'bar' as ChartType },
  { labelKey: 'home.communityRealtimeOnline', value: 'pie' as ChartType }
];

/* ===== 时间范围选择 ===== */

const HOUR_OPTIONS = [
  { labelKey: 'home.timeRangeOneDay', value: 24 },
  { labelKey: 'home.timeRangeThreeDays', value: 72 },
  { labelKey: 'home.timeRangeOneWeek', value: 168 }
];
const selectedHours = ref(24);

/* ===== 柱状图数据 ===== */

const loading = ref(false);
const error = ref('');
const chartData = ref<Api.Game.CommunityOnlineBarVo | null>(null);

/* ===== 饼图数据（实时汇总，无需 loading） ===== */

/** 各社区实时在线人数汇总 */
const pieData = computed(() => {
  const map = new Map<number, number>();
  gameStore.currentServerWsList.forEach(server => {
    const id = server.communityId;
    if (id == null) return;
    map.set(id, (map.get(id) ?? 0) + (server.numPlayers || 0));
  });

  return Array.from(map.entries())
    .map(([communityId, count]) => {
      const community = gameStore.communityList.find(c => c.id === communityId);
      return {
        name: community?.communityName ?? `#${communityId}`,
        value: count
      };
    })
    .sort((a, b) => b.value - a.value);
});

/* ===== 社区颜色板（明 → 暗渐变配色） ===== */

const SERIES_COLORS = [
  ['#8b9cf7', '#667eea'], // 紫
  ['#5df0a0', '#43e97b'], // 绿
  ['#f5b745', '#f0a020'], // 金
  ['#6ec0ff', '#4facfe'], // 蓝
  ['#f77a8a', '#f5576c'], // 红
  ['#9da7f9', '#7c8cf8'], // 浅紫
  ['#34d6d6', '#13c2c2'], // 青
  ['#fca540', '#fa8c16'], // 橙
  ['#f05ba8', '#eb2f96'], // 粉
  ['#8e4ae1', '#722ed1']  // 深紫
];

/** 时间轴标签最大显示数 */
const MAX_X_LABELS = 6;

/* ===== ECharts 柱状图配置 ===== */

const buildBarOptions = (data: Api.Game.CommunityOnlineBarVo): ECOption => {
  const { timeAxis, series } = data;
  const dataLength = timeAxis.length;
  const isDark = themeStore.darkMode;

  const labelInterval = (index: number) => {
    if (dataLength <= MAX_X_LABELS) return true;
    const step = Math.floor(dataLength / (MAX_X_LABELS - 1));
    return index % step === 0;
  };

  const barSeries: BarSeriesOption[] = series.map((s, i) => {
    const [light, dark] = SERIES_COLORS[i % SERIES_COLORS.length];
    return {
      name: s.communityName,
      type: 'bar',
      data: s.data,
      barGap: '30%',
      barCategoryGap: '40%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: light },
            { offset: 1, color: dark }
          ]
        }
      },
      emphasis: {
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: light },
              { offset: 1, color: dark }
            ]
          },
          shadowBlur: 12,
          shadowOffsetY: 3,
          shadowColor: 'rgba(0, 0, 0, 0.15)'
        }
      },
      barMaxWidth: 28
    };
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'
        }
      },
      backgroundColor: isDark ? 'rgba(28, 33, 48, 0.96)' : 'rgba(255, 255, 255, 0.96)',
      borderColor: isDark ? 'rgba(102, 126, 234, 0.25)' : 'rgba(102, 126, 234, 0.3)',
      borderWidth: 1,
      borderRadius: 10,
      padding: [10, 14],
      textStyle: { color: isDark ? '#e8ecf4' : '#2e2b26', fontSize: 12, fontWeight: 500 },
      extraCssText: isDark
        ? 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px);'
        : 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); backdrop-filter: blur(8px);'
    },
    legend: {
      type: 'scroll',
      bottom: 4,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { fontSize: 11 },
      pageIconColor: '#667eea',
      pageIconSize: 12,
      pageTextStyle: { fontSize: 11 }
    },
    grid: {
      left: 8,
      right: 16,
      top: 12,
      bottom: 44,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeAxis,
      axisLabel: {
        fontSize: 10,
        interval: labelInterval,
        rotate: dataLength > 12 ? 30 : 0
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: $t('home.onlineUser'),
      nameTextStyle: { fontSize: 10, fontWeight: 500 },
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: barSeries
  };
};

/* ===== ECharts 饼图配置 ===== */

const buildPieOptions = (): ECOption => {
  const data = pieData.value;
  const isDark = themeStore.darkMode;

  const pieSeries: PieSeriesOption = {
    type: 'pie',
    radius: ['50%', '80%'],
    center: ['50%', '48%'],
    avoidLabelOverlap: false,
    padAngle: 2,
    itemStyle: {
      borderRadius: 8,
      borderColor: isDark ? 'rgba(22, 26, 38, 0.6)' : 'rgba(250, 247, 242, 0.6)',
      borderWidth: 4
    },
    label: {
      show: true,
      position: 'outside',
      alignTo: 'labelLine',
      distanceToLabelLine: 4,
      formatter: (params: any) => {
        const pct = params.percent >= 1 ? params.percent.toFixed(0) : '<1';
        return `{name|${params.name}}\n{count|${params.value}${$t('home.people')} · ${pct}%}`;
      },
      rich: {
        name: {
          fontSize: 12,
          fontWeight: 600,
          color: 'inherit',
          lineHeight: 18
        },
        count: {
          fontSize: 11,
          fontWeight: 500,
          color: 'inherit',
          opacity: 0.65,
          lineHeight: 16
        }
      }
    },
    labelLine: {
      show: true,
      length: 16,
      length2: 20,
      lineStyle: {
        width: 1,
        type: 'solid'
      }
    },
    emphasis: {
      scale: true,
      scaleSize: 8,
      focus: 'self',
      itemStyle: {
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        shadowColor: 'rgba(0, 0, 0, 0.18)'
      },
      label: {
        fontSize: 14,
        fontWeight: 700
      }
    },
    data: data.map((d, i) => {
      const [light] = SERIES_COLORS[i % SERIES_COLORS.length];
      return {
        ...d,
        itemStyle: { color: light }
      };
    })
  };

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'rgba(28, 33, 48, 0.96)' : 'rgba(255, 255, 255, 0.96)',
      borderColor: isDark ? 'rgba(102, 126, 234, 0.25)' : 'rgba(102, 126, 234, 0.3)',
      borderWidth: 1,
      borderRadius: 10,
      padding: [10, 14],
      textStyle: { color: isDark ? '#e8ecf4' : '#2e2b26', fontSize: 12, fontWeight: 500 },
      formatter: (params: any) => {
        const pct = params.percent >= 0.1 ? params.percent.toFixed(2) : '<0.1';
        return `${params.marker} ${params.name}<br/>  ${$t('home.onlineUser')}: <b>${params.value}</b> (${pct}%)`;
      },
      extraCssText: isDark
        ? 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px);'
        : 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); backdrop-filter: blur(8px);'
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 8,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      textStyle: { fontSize: 11 },
      pageIconColor: '#667eea',
      pageIconSize: 12,
      pageTextStyle: { fontSize: 11 }
    },
    series: pieSeries
  };
};

/* ===== ECharts 实例 ===== */

const { domRef, updateOptions } = useEcharts<ECOption>(() => ({}), {
  onUpdated: instance => {
    instance.hideLoading();
  }
});

/* ===== 图表是否为空 ===== */

const isBarEmpty = computed(() => !chartData.value || chartData.value.series.length === 0);
const isPieEmpty = computed(() => pieData.value.length === 0);

/* ===== 数据获取 ===== */

const fetchBarData = async () => {
  if (!authStore.isLogin) {
    loading.value = false;
    error.value = '';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { data, error: err } = await fetchGetCommunityOnlineBar(selectedHours.value);
    if (err) {
      error.value = err.message || $t('home.serverHistoryFetchFailed');
      return;
    }
    if (!data || !data.series || data.series.length === 0) {
      chartData.value = null;
      return;
    }
    chartData.value = data;
  } catch (e) {
    console.error('[SERVER-HISTORY] 获取社区在线人数失败:', e);
    error.value = $t('home.serverHistoryFetchFailed');
  } finally {
    loading.value = false;
  }
};

/** 渲染当前图表 */
const renderChart = async () => {
  if (chartType.value === 'bar') {
    await fetchBarData();
    if (!chartData.value) return;
    await updateOptions(() => buildBarOptions(chartData.value!));
  } else {
    loading.value = false;
    error.value = '';
    if (isPieEmpty.value) return;
    await updateOptions(() => buildPieOptions());
  }
};

/** 切换时间范围 */
const handleHoursChange = (hours: number) => {
  if (selectedHours.value === hours) return;
  selectedHours.value = hours;
  fetchBarData().then(() => {
    if (chartData.value) {
      updateOptions(() => buildBarOptions(chartData.value!));
    }
  });
};

/** 切换图表类型 */
const handleChartTypeChange = (type: ChartType) => {
  if (chartType.value === type) return;
  chartType.value = type;
  renderChart();
};

/** 未登录时不发请求，登录后才加载数据（home 页面可能先于登录挂载） */
const loadChartData = async () => {
  if (!authStore.isLogin) return;
  await renderChart();
};

onMounted(loadChartData);

watch(
  () => authStore.isLogin,
  (v) => {
    if (v) loadChartData();
  }
);

// 主题切换时重新渲染图表，让 ECharts 的 dark/light 主题 + tooltip 配色同步生效
watch(() => themeStore.darkMode, () => {
  if (chartType.value === 'bar' && chartData.value) {
    updateOptions(() => buildBarOptions(chartData.value!));
  } else if (chartType.value === 'pie' && !isPieEmpty.value) {
    updateOptions(() => buildPieOptions());
  }
});

// 语言切换时重新渲染图表，让 y 轴名称 / tooltip / 图例等 $t 文案同步更新
watch(() => i18n.global.locale.value, () => {
  if (chartType.value === 'bar' && chartData.value) {
    updateOptions(() => buildBarOptions(chartData.value!));
  } else if (chartType.value === 'pie' && !isPieEmpty.value) {
    updateOptions(() => buildPieOptions());
  }
});
</script>

<template>
  <div class="dash-card server-history-card">
    <!-- 卡片头部：图表类型切换 + 标题 / 时间范围 -->
    <div class="card-header">
      <div class="card-title">
        <SvgIcon icon="mdi:chart-bar" class="card-title-icon" />
        <span>{{ $t('home.serverHistoryOnline') }}</span>
      </div>
      <div class="header-actions">
        <!-- 图表类型切换 -->
        <div class="chart-type-selector">
          <button v-for="opt in CHART_TYPE_OPTIONS" :key="opt.value" class="chart-type-btn"
            :class="{ active: chartType === opt.value }" @click="handleChartTypeChange(opt.value)">
            {{ $t(opt.labelKey) }}
          </button>
        </div>
        <!-- 时间范围（仅柱状图） -->
        <div v-if="chartType === 'bar'" class="hours-selector">
          <button v-for="opt in HOUR_OPTIONS" :key="opt.value" class="hours-btn"
            :class="{ active: selectedHours === opt.value }" @click="handleHoursChange(opt.value)">
            {{ $t(opt.labelKey) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 柱状图：加载中骨架屏 -->
    <div v-if="chartType === 'bar' && loading" class="chart-skeleton">
      <div class="skeleton-bars">
        <div v-for="i in 6" :key="i" class="skeleton-bar" :style="{ height: `${20 + (i % 5) * 12}%` }" />
      </div>
    </div>

    <!-- 加载失败 -->
    <HomeEmptyState v-else-if="chartType === 'bar' && error" icon="mdi:chart-line-variant" :title="error" />

    <!-- 柱状图空数据 -->
    <HomeEmptyState v-else-if="chartType === 'bar' && isBarEmpty" icon="mdi:chart-line" :title="$t('home.noData')"
      :description="$t('home.underConstruction')" />

    <!-- 饼图空数据 -->
    <HomeEmptyState v-else-if="chartType === 'pie' && isPieEmpty" icon="mdi:chart-pie" :title="$t('home.noData')"
      :description="$t('home.underConstruction')" />

    <!-- 图表 -->
    <div v-else ref="domRef" class="chart-container" />
  </div>
</template>

<style scoped lang="scss">
.dash-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 14px;
  border-radius: 14px;
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
    gap: 6px;
    flex-shrink: 0;
    /* 兜底：窄卡片时允许按钮组换行，避免英文文案溢出变形 */
    flex-wrap: wrap;

    .card-title {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      /* 占满剩余空间，标题过长时收缩省略，避免挤压右侧按钮 */
      flex: 1;

      .card-title-icon {
        font-size: 17px;
        color: rgba(var(--app-rgb), 1);
        flex-shrink: 0;
      }

      span {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--n-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    /* 图表类型切换（参照 botGroup pill 按钮风格） */
    .chart-type-selector {
      display: flex;
      gap: 4px;
      padding: 2px;
      border-radius: 8px;
      background: rgba(var(--app-rgb), 0.05);
      border: 1px solid rgba(var(--app-rgb), 0.08);

      .chart-type-btn {
        padding: 3px 8px;
        border: none;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        color: rgba(var(--app-rgb), 0.5);
        background: transparent;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;

        &:hover {
          color: rgba(var(--app-rgb), 0.75);
          background: rgba(var(--app-rgb), 0.08);
        }

        &.active {
          color: #fff;
          background: linear-gradient(135deg, #667eea, #7c8cf8);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
      }
    }

    /* 时间范围选择器 */
    .hours-selector {
      display: flex;
      gap: 4px;
      padding: 2px;
      border-radius: 8px;
      background: rgba(var(--app-rgb), 0.05);
      border: 1px solid rgba(var(--app-rgb), 0.08);

      .hours-btn {
        padding: 3px 8px;
        border: none;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        color: rgba(var(--app-rgb), 0.5);
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          color: rgba(var(--app-rgb), 0.75);
          background: rgba(var(--app-rgb), 0.08);
        }

        &.active {
          color: #fff;
          background: linear-gradient(135deg, #667eea, #7c8cf8);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
      }
    }
  }

  /* 图表容器 */
  .chart-container {
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  /* 骨架屏 */
  .chart-skeleton {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: 0 4px;

    .skeleton-bars {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 100%;

      .skeleton-bar {
        flex: 1;
        border-radius: 4px 4px 0 0;
        background: linear-gradient(180deg, rgba(var(--app-rgb), 0.12) 0%, rgba(var(--app-rgb), 0.04) 100%);
        animation: skeletonPulse 1.5s ease-in-out infinite;
        animation-delay: calc(var(--delay, 0) * 1s);
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

  @keyframes skeletonPulse {

    0%,
    100% {
      opacity: 0.4;
    }

    50% {
      opacity: 0.8;
    }
  }
}
</style>
