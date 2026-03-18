<script setup lang="ts">
import { computed, watch } from 'vue';
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

// 渐变色配置
const gradientColors = [
  { start: '#667eea', end: '#764ba2' },
  { start: '#f093fb', end: '#f5576c' },
  { start: '#4facfe', end: '#00f2fe' },
  { start: '#43e97b', end: '#38f9d7' },
  { start: '#fa709a', end: '#fee140' },
  { start: '#30cfd0', end: '#330867' },
  { start: '#a8edea', end: '#fed6e3' },
  { start: '#ff9a9e', end: '#fecfef' }
];

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: isDarkMode.value ? 'rgba(30, 30, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderColor: 'transparent',
    borderWidth: 0,
    padding: [12, 16],
    textStyle: {
      color: isDarkMode.value ? '#fff' : '#333',
      fontSize: 13
    },
    formatter: (params: any) => {
      return `<div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${params.color.colorStops ? params.color.colorStops[0].color : params.color};"></span>
                <span>${params.value} 人 (${params.percent}%)</span>
              </div>`;
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
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 12,
        borderColor: isDarkMode.value ? '#1a1a2e' : '#fff',
        borderWidth: 3
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        scale: true,
        scaleSize: 10,
        label: {
          show: true,
          fontSize: 18,
          fontWeight: 'bold',
          color: isDarkMode.value ? '#fff' : '#333',
          formatter: '{b}'
        },
        itemStyle: {
          shadowBlur: 20,
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

  updateOptions(opts => {
    opts.series[0].data = (data ?? []).map((item, index) => {
      const colorPair = gradientColors[index % gradientColors.length];
      return {
        ...item,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: colorPair.start },
              { offset: 1, color: colorPair.end }
            ]
          },
          shadowColor: colorPair.start + '60',
          shadowBlur: 15
        }
      };
    });
    return opts;
  });
}

function updateLocale() {
  updateOptions((opts) => {
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

// 监听主题变化
watch(
  () => isDarkMode.value,
  () => {
    updateOptions(opts => {
      // 更新tooltip
      opts.tooltip.backgroundColor = isDarkMode.value ? 'rgba(30, 30, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      opts.tooltip.textStyle.color = isDarkMode.value ? '#fff' : '#333';
      // 更新legend
      opts.legend.textStyle.color = isDarkMode.value ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)';
      // 更新扇区边框
      opts.series[0].itemStyle.borderColor = isDarkMode.value ? '#1a1a2e' : '#fff';
      // 更新emphasis标签
      opts.series[0].emphasis.label.color = isDarkMode.value ? '#fff' : '#333';
      return opts;
    });
  }
);

// init
init();
</script>

<template>
  <NCard :bordered="false" class="card-wrapper">
    <div ref="domRef" class="h-360px overflow-hidden"></div>
  </NCard>
</template>

<style scoped></style>
