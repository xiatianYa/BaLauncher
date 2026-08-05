<script setup lang="ts">
import { watch } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { ECOption, useEcharts } from '@/hooks/common/echarts';

defineOptions({
  name: 'LineChart'
});

const appStore = useAppStore();

// 在useEcharts中指定泛型类型
const { domRef, updateOptions } = useEcharts<ECOption>(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(50, 50, 50, 0.9)',
    borderColor: '#444',
    borderWidth: 1,
    textStyle: {
      color: '#e0e0e0'
    },
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: '#666',
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
      color: '#e0e0e0'
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
        color: '#444'
      }
    },
    axisLabel: {
      color: '#999'
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
      color: '#999'
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255,255,255,0.1)',
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
