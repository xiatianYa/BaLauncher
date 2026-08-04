<script setup lang="ts">
import { watch, computed } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { ECOption, useEcharts } from '@/hooks/common/echarts';

defineOptions({
  name: 'LineChart'
});

const appStore = useAppStore();
const themeStore = useThemeStore();

// 判断是否为深色模式
const isDarkMode = computed(() => themeStore.darkMode);

// 在useEcharts中指定泛型类型
const { domRef, updateOptions } = useEcharts<ECOption>(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDarkMode.value ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    borderColor: isDarkMode.value ? '#444' : '#ddd',
    borderWidth: 1,
    textStyle: {
      color: isDarkMode.value ? '#e0e0e0' : '#333'
    },
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: isDarkMode.value ? '#666' : '#999',
        width: 1
      }
    }
  },
  legend: {
    data: [],
    top: '2%',
    right: '2%',
    itemGap: 20,
    textStyle: {
      color: isDarkMode.value ? '#e0e0e0' : '#666'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisLine: {
      lineStyle: {
        color: isDarkMode.value ? '#444' : '#ddd'
      }
    },
    axisLabel: {
      color: isDarkMode.value ? '#999' : '#666'
    },
    axisTick: {
      show: false
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisLabel: {
      color: isDarkMode.value ? '#999' : '#666'
    },
    splitLine: {
      lineStyle: {
        color: isDarkMode.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        type: 'dashed'
      }
    }
  },
  series: [],
  animation: true,
  animationDuration: 800,
  animationEasing: 'cubicOut'
}));

function updateLocale() {
  updateOptions((opts, factory) => {
    const originOpts = factory();

    if (opts.legend && originOpts.legend) {
      const legend = opts.legend;
      if (legend && !Array.isArray(legend) && 'data' in legend) {
        legend.data = (originOpts.legend as { data?: (string | { name?: string; icon?: string; textStyle?: object })[] })?.data;
      }
    }
    if (opts.series && originOpts.series && Array.isArray(opts.series) && Array.isArray(originOpts.series) && opts.series.length >= 2 && originOpts.series.length >= 2) {
      const series0 = opts.series[0];
      const originSeries0 = originOpts.series[0];
      const series1 = opts.series[1];
      const originSeries1 = originOpts.series[1];
      if (series0 && originSeries0 && typeof series0 === 'object' && 'name' in series0) {
        series0.name = (originSeries0 as { name?: string }).name || series0.name;
      }
      if (series1 && originSeries1 && typeof series1 === 'object' && 'name' in series1) {
        series1.name = (originSeries1 as { name?: string }).name || series1.name;
      }
    }

    return opts;
  });
}

// 监听主题变化，更新图表颜色
watch(
  () => themeStore.darkMode,
  () => {
    updateOptions(opts => {
      const dark = isDarkMode.value;

      // 更新 title
      const title = opts.title;
      if (title && !Array.isArray(title) && title.textStyle) {
        title.textStyle.color = dark ? '#e0e0e0' : '#333';
      }

      // 更新 tooltip
      const tooltip = opts.tooltip;
      if (tooltip && !Array.isArray(tooltip)) {
        tooltip.backgroundColor = dark ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)';
        tooltip.borderColor = dark ? '#444' : '#ddd';
        if (tooltip.textStyle) {
          tooltip.textStyle.color = dark ? '#e0e0e0' : '#333';
        }
        if (tooltip.axisPointer?.lineStyle) {
          tooltip.axisPointer.lineStyle.color = dark ? '#666' : '#999';
        }
      }

      // 更新 legend
      const legend = opts.legend;
      if (legend && !Array.isArray(legend) && legend.textStyle) {
        legend.textStyle.color = dark ? '#e0e0e0' : '#666';
      }

      // 更新 xAxis
      const xAxis = opts.xAxis;
      if (xAxis) {
        const axis = Array.isArray(xAxis) ? xAxis[0] : xAxis;
        if (axis?.axisLine?.lineStyle) {
          axis.axisLine.lineStyle.color = dark ? '#444' : '#ddd';
        }
        if (axis?.axisLabel) {
          axis.axisLabel.color = dark ? '#999' : '#666';
        }
      }

      // 更新 yAxis
      const yAxis = opts.yAxis;
      if (yAxis) {
        const axis = Array.isArray(yAxis) ? yAxis[0] : yAxis;
        if (axis?.axisLabel) {
          axis.axisLabel.color = dark ? '#999' : '#666';
        }
        if (axis?.splitLine?.lineStyle) {
          axis.splitLine.lineStyle.color = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        }
      }

      return opts;
    });
  }
);

watch(
  () => appStore.locale,
  () => {
    updateLocale();
  }
);
</script>

<template>
  <NCard :bordered="true" class="card-wrapper chart-card">
    <div ref="domRef" class="h-360px overflow-hidden"></div>
  </NCard>
</template>

<style scoped lang="scss">
.chart-card {
  transition: all 0.3s ease;
}
</style>
