<!--
 * @component TimelineItem
 * @description 时间线单条记录 —— 左侧地图封面 + 右侧在线人数折线图
 * @author BaLauncher
 * @design 采用 flex 横向布局，35% 封面区 + 65% 图表区，封面叠加渐变遮罩展示地图名称与游玩时长
 -->
<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import { computed } from 'vue';
import { NCard, NEllipsis } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import dayjs from 'dayjs';
import MapTimelineChart from './map-timeline-chart.vue';

defineOptions({ name: 'TimelineItem' });

const props = defineProps<{
    /** 单条地图时间线数据 */
    item: Api.Game.GameServerMapTimelineVo;
    /** 在列表中的索引，用于首条特殊样式判断 */
    index: number;
}>();

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

/** 中文星期映射表 */
const WEEKDAY_MAP = ['日', '一', '二', '三', '四', '五', '六'] as const;

/**
 * 将 ISO 时间字符串格式化为可读的完整时间
 * @example "2026-04-25T14:30:00" → "2026年04月25日 14时:30分 周五"
 */
const formatFullTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const d = dayjs(timeStr);
    return `${d.format('YYYY年MM月DD日 HH时:mm分')} 周${WEEKDAY_MAP[d.day()]}`;
};
</script>

<template>
    <div>
        <!-- 完整时间标注 -->
        <div class="timeline-full-time mb-5px">
            {{ formatFullTime(item.firstPlayTime) }}
        </div>

        <!-- 卡片主体：封面 + 图表 -->
        <div class="timeline-card-item" :class="{ 'timeline-card-first': index === 0 }">
            <!-- 左侧：地图封面 -->
            <NCard size="small" :bordered="true" class="timeline-card-left rounded-8px overflow-hidden">
                <img v-if="item.mapUrl" :src="item.mapUrl" :alt="item.mapLabel || item.mapName" class="map-image" />
                <!-- 渐变遮罩层 -->
                <div class="timeline-card-overlay"></div>
                <!-- 地图信息叠加层 -->
                <div class="timeline-map-info">
                    <NEllipsis :line-clamp="1">
                        <span class="map-name">
                            {{ item.mapLabel || item.mapName }}
                        </span>
                    </NEllipsis>
                    <div class="record-time">
                        <SvgIcon icon="mdi:clock-outline" class="time-icon" />
                        游玩时长 : {{ item.totalPlayMinutes }}分钟
                    </div>
                </div>
            </NCard>

            <!-- 右侧：在线人数折线图 -->
            <MapTimelineChart :time-axis="item.timeAxis" :player-count-axis="item.playerCountAxis" />
        </div>
    </div>
</template>

<style scoped lang="scss">
.timeline-full-time {
    font-size: 12px;
    color: var(--n-text-color-3);
    margin-top: 4px;
}

.timeline-card-item {
    width: 100%;
    height: 130px;
    border-radius: 12px;
    overflow: visible;
    position: relative;
    transition: all 0.3s ease;
    display: flex;
    gap: 12px;

    /** 左侧封面区 */
    .timeline-card-left {
        width: 35%;
        height: 100%;
        position: relative;
        flex-shrink: 0;
        padding: 0;

        :deep(.n-card) {
            height: 100%;
            padding: 0;
        }

        :deep(.n-card__content) {
            height: 100%;
            padding: 0;
        }
    }

    .map-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    /** 从左到右的渐变遮罩，保证文字可读性 */
    .timeline-card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.1) 100%);
    }

    /** 信息叠加层，绝对定位于封面之上 */
    .timeline-map-info {
        position: absolute;
        top: 0;
        left: 0;
        padding: 5px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
        height: 100%;

        .map-name {
            font-size: 14px;
            font-weight: bold;
            color: #fff;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .record-time {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.85);
            display: flex;
            align-items: center;
            gap: 6px;

            .time-icon {
                font-size: 14px;
            }
        }
    }
}
</style>
