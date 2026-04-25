<!--
 * @component MapTimelineChart
 * @description 地图在线人数折线图 —— 基于 ECharts 封装，展示单张地图在时间维度上的玩家数量变化
 * @author BaLauncher
 * @design 使用 useEcharts hook 管理图表生命周期，支持深色/浅色主题自适应切换
 *         x 轴标签最多显示 8 个，使用 dayjs 格式化为 HH:mm
 -->
<script setup lang="ts">
import { watch, computed, nextTick } from 'vue';
import dayjs from 'dayjs';
import { useThemeStore } from '@/store/modules/theme';
import { ECOption, useEcharts } from '@/hooks/common/echarts';

defineOptions({
    name: 'MapTimelineChart'
});

const props = defineProps<{
    /** x 轴时间数据（ISO 时间字符串数组） */
    timeAxis?: string[];
    /** y 轴在线人数数据 */
    playerCountAxis?: number[];
}>();

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

/** 主题色板 —— 与全局设计语言保持一致 */
const COLOR_PALETTE = {
    line: '#667eea',
    areaStart: 'rgba(102, 126, 234, 0.3)',
    areaEnd: 'rgba(102, 126, 234, 0.01)'
} as const;

/** x 轴标签最大显示数量 */
const MAX_X_LABELS = 8;

/**
 * 计算 x 轴标签显示间隔
 * 当数据点 ≤ MAX_X_LABELS 时全部显示，否则按步长均匀采样
 */
const computeLabelInterval = (index: number, dataLength: number): boolean => {
    if (dataLength <= MAX_X_LABELS) return true;
    const step = Math.floor(dataLength / (MAX_X_LABELS - 1));
    return index % step === 0;
};

/**
 * 将 ISO 时间字符串格式化为 HH:mm
 */
const formatTimeLabel = (value: string): string => dayjs(value).format('HH:mm');

/** 初始化 ECharts 实例与默认配置 */
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
    grid: {
        left: '5%',
        right: '5%',
        top: '8%',
        bottom: '5%',
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
            color: isDarkMode.value ? '#999' : '#666',
            fontSize: 10,
            rotate: 30,
            formatter: formatTimeLabel,
            interval: (index: number) => computeLabelInterval(index, props.timeAxis?.length || 0)
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
            color: isDarkMode.value ? '#999' : '#666',
            fontSize: 10
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

/**
 * 响应数据变化，更新图表 series 与 xAxis
 * 采用增量更新策略，仅刷新数据相关配置，避免全量重绘
 */
function updateChartData() {
    if (!props.timeAxis || !props.playerCountAxis) return;

    const newSeries = [{
        name: '在线人数',
        type: 'line' as const,
        data: props.playerCountAxis,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
            width: 2,
            color: COLOR_PALETTE.line
        },
        areaStyle: {
            opacity: 0.8,
            color: {
                type: 'linear' as const,
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                    { offset: 0, color: COLOR_PALETTE.areaStart },
                    { offset: 1, color: COLOR_PALETTE.areaEnd }
                ]
            }
        }
    }];

    updateOptions((opts) => {
        const xAxis = opts.xAxis;
        if (xAxis && !Array.isArray(xAxis) && 'data' in xAxis) {
            xAxis.data = props.timeAxis || [];
            if (xAxis.axisLabel) {
                const dataLength = props.timeAxis?.length || 0;
                xAxis.axisLabel.formatter = formatTimeLabel;
                xAxis.axisLabel.interval = (index: number) => computeLabelInterval(index, dataLength);
            }
        }
        opts.series = newSeries;
        return opts;
    });
}

/**
 * 监听主题切换，热更新图表配色
 * 仅修改颜色相关属性，保留数据与布局不变
 */
watch(
    () => themeStore.darkMode,
    () => {
        updateOptions(opts => {
            const dark = isDarkMode.value;

            // 更新 tooltip 配色
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

            // 更新 x 轴配色
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

            // 更新 y 轴配色
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

/**
 * 监听数据变化，触发图表更新
 * immediate: true 确保组件初始化时即渲染首次数据
 * deep: true 确保数组内部元素变化也能被捕获
 */
watch(
    [() => props.timeAxis, () => props.playerCountAxis],
    async () => {
        await nextTick();
        updateChartData();
    },
    { deep: true, immediate: true }
);
</script>

<template>
    <NCard :bordered="true" class="card-wrapper chart-card timeline-card-right rounded-8px overflow-hidden"
        content-class="w-full h-full" content-style="padding:0px">
        <div ref="domRef" class="w-full h-full"></div>
    </NCard>
</template>

<style scoped lang="scss">
.map-timeline-chart {
    width: 100%;
    height: 100%;
}
</style>
