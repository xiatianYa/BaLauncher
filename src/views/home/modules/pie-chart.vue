<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { fetchGetPieChart } from '@/service/api';
import { useThemeStore } from '@/store/modules/theme';

defineOptions({
  name: 'PieChart'
});

const appStore = useAppStore();

/** 主题相关 */
const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

// 缓存数据避免重复计算
const cachedData = ref<{ name: string; value: number; itemStyle: any }[] | null>(null);

// 渐变色配置 - 柔和的配色方案
const gradientColors = [
  { start: '#a8c0ff', end: '#3f2b96' },
  { start: '#ffecd2', end: '#fcb69f' },
  { start: '#a1c4fd', end: '#c2e9fb' },
  { start: '#d4fc79', end: '#96e6a1' },
  { start: '#fbc2eb', end: '#a6c1ee' },
  { start: '#e0c3fc', end: '#8ec5fc' },
  { start: '#f6d365', end: '#fda085' },
  { start: '#84fab0', end: '#8fd3f4' }
];

// 预计算颜色避免重复创建对象
const getItemStyle = (index: number, dark: boolean) => {
  const colorPair = gradientColors[index % gradientColors.length];
  return {
    color: {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 1,
      y2: 1,
      colorStops: [
        { offset: 0, color: colorPair.start },
        { offset: 1, color: colorPair.end }
      ]
    },
    borderRadius: 8,
    borderColor: dark ? '#1a1a2e' : '#fff',
    borderWidth: 2,
    shadowColor: colorPair.start + '40',
    shadowBlur: 10
  };
};

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: isDarkMode.value ? 'rgba(30, 30, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderColor: 'transparent',
    borderWidth: 0,
    padding: [5, 5],
    textStyle: {
      color: isDarkMode.value ? '#fff' : '#333',
      fontSize: 13
    },
    // 使用简单的 formatter 提升性能
    formatter: (params: any) => {
      return `${params.name}<br/>${params.value} 人 (${params.percent}%)`;
    }
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    itemStyle: {
      borderWidth: 0
    },
    textStyle: {
      color: isDarkMode.value ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
      fontSize: 12
    },
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 12
  },
  series: [
    {
      name: $t('page.home.pieChart'),
      type: 'pie' as const,
      radius: ['45%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      // 禁用动画提升性能
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
      // 减少渲染负担
      hoverAnimation: true,
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        scale: true,
        scaleSize: 8,
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold' as const,
          color: isDarkMode.value ? '#fff' : '#333',
          formatter: '{b}'
        },
        itemStyle: {
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      },
      labelLine: {
        show: false
      },
      data: [] as { name: string; value: number; itemStyle: any }[]
    }
  ]
}));

async function mockData() {
  const { data } = await fetchGetPieChart();
  if (!data) return;

  // 预计算数据并缓存
  const processedData = data.map((item, index) => ({
    name: item.name,
    value: item.value,
    itemStyle: getItemStyle(index, isDarkMode.value)
  }));

  cachedData.value = processedData;

  updateOptions(opts => {
    if (opts.series && opts.series[0]) {
      opts.series[0].data = processedData;
    }
    return opts;
  });
}

function updateLocale() {
  updateOptions((opts) => {
    if (opts.series && opts.series[0]) {
      opts.series[0].name = $t('page.home.pieChart');
    }
    return opts;
  });
}

async function init() {
  mockData();
}

watch(
  () => appStore.locale,
  () => {
    updateLocale();
  }
);

// 监听主题变化 - 使用缓存数据避免重新请求
watch(
  () => isDarkMode.value,
  (dark) => {
    if (!cachedData.value) return;

    // 只更新颜色相关的样式
    const updatedData = cachedData.value.map((item, index) => ({
      ...item,
      itemStyle: getItemStyle(index, dark)
    }));

    updateOptions(opts => {
      if (!opts.tooltip || Array.isArray(opts.tooltip)) return opts;

      // 更新 tooltip
      opts.tooltip.backgroundColor = dark ? 'rgba(30, 30, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      if (opts.tooltip.textStyle) {
        opts.tooltip.textStyle.color = dark ? '#fff' : '#333';
      }

      // 更新 legend
      if (opts.legend && !Array.isArray(opts.legend) && opts.legend.textStyle) {
        opts.legend.textStyle.color = dark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)';
      }

      // 更新 series 数据
      if (opts.series && opts.series[0]) {
        const series = opts.series[0];
        series.data = updatedData;

        // 更新 emphasis 标签颜色
        if (series.emphasis?.label) {
          series.emphasis.label.color = dark ? '#fff' : '#333';
        }
      }

      return opts;
    });
  }
);

// init
init();
</script>

<template>
  <NCard :bordered="false" class="card-wrapper chart-card">
    <div ref="domRef" class="h-360px overflow-hidden"></div>
  </NCard>
</template>

<style scoped lang="scss">
.chart-card {
  transition: all 0.3s ease;
}
</style>
