<script setup lang="ts">
import { watch } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';

defineOptions({
  name: 'PieChart'
});

const appStore = useAppStore();

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(30, 30, 40, 0.95)',
    borderColor: 'transparent',
    borderWidth: 0,
    padding: [5, 5],
    textStyle: {
      color: '#fff',
      fontSize: 13
    },
    // 使用简单的 formatter 提升性能
    formatter: (params: any) => {
      return `${params.name}<br/>${params.value} ${$t('home.people')} (${params.percent}%)`;
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
      fontSize: 12
    },
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 12
  },
  series: [
    {
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
          color: '#fff',
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

function updateLocale() {
  updateOptions((opts) => {
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
