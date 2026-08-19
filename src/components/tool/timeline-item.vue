<script setup lang="ts">
import { NEllipsis } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import dayjs from 'dayjs';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MapTimelineChart from './map-timeline-chart.vue';

defineOptions({ name: 'TimelineItem' });

const props = defineProps<{
    /** 单条地图时间线数据 */
    item: Api.Game.GameServerMapTimelineVo;
    /** 在列表中的索引，用于首条特殊样式判断 */
    index: number;
    /** 该地图最后一条有比分的记录（取父级计算好的结果，无则 undefined） */
    score?: { ctScore: number; tscore: number };
}>();

const { locale } = useI18n();

/** 是否有比分数据（CT/T 双方比分均存在时展示） */
const hasScore = computed(() => props.score != null);

/**
 * 将 ISO 时间字符串格式化为年月日 时分（跟随当前语言）
 * @example zh: "2026年04月25日 14:30" / en: "2026-04-25 14:30"
 */
const formatFullTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const d = dayjs(timeStr);
    const isZh = locale.value === 'zh-CN' || locale.value === 'zh-TW';
    return isZh ? d.format('YYYY年MM月DD日 HH:mm') : d.format('YYYY-MM-DD HH:mm');
};
</script>

<template>
    <div>
        <!-- 完整时间标注 -->
        <div class="timeline-full-time mb-6px">
            {{ formatFullTime(item.firstPlayTime) }}
        </div>

        <!-- 卡片主体：封面 + 图表 -->
        <div class="timeline-card-item" :class="{ 'timeline-card-first': index === 0 }">
            <!-- 左侧：地图封面 -->
            <div class="timeline-card-left" :class="{ 'no-cover': !item.mapUrl }">
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
                        {{ $t('tools.playDuration', { count: item.totalPlayMinutes }) }}
                    </div>
                </div>
                <!-- 比分牌：CT vs T，取该地图最后一条有比分的记录 -->
                <div v-if="hasScore && score" class="timeline-score">
                    <div class="score-team ct">
                        <span class="team-name">CT</span>
                        <span class="team-points">{{ score.ctScore }}</span>
                    </div>
                    <div class="score-team t">
                        <span class="team-points">{{ score.tscore }}</span>
                        <span class="team-name">T</span>
                    </div>
                </div>
            </div>

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
    font-weight: 500;
}

.timeline-card-item {
    width: 100%;
    height: 130px;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    display: flex;
    gap: 10px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }

    .timeline-card-left {
        width: 35%;
        height: 100%;
        position: relative;
        flex-shrink: 0;
        border-radius: 12px;
        overflow: hidden;
        // 无封面图时的纯色占位背景
        background: #e3e5e9;

        // 无封面图时的地图网格纹理（有图时不移除该伪元素，避免盖在封面上）
        &.no-cover::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image:
                linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px);
            background-size: 24px 24px;
            mask-image: radial-gradient(75% 75% at 50% 35%, #000 0%, transparent 100%);
            -webkit-mask-image: radial-gradient(75% 75% at 50% 35%, #000 0%, transparent 100%);
            pointer-events: none;
        }
    }

    .map-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .timeline-card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.55) 100%);
    }

    /* 比分牌：电竞风格，CT 蓝 / T 橙 两个阵营块拼接，扁平无毛玻璃 */
    .timeline-score {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 2;
        display: inline-flex;
        overflow: hidden;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.14);
        line-height: 1;

        .score-team {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            font-size: 13px;
            font-weight: 700;
            color: #fff;

            .team-name {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.06em;
            }

            &.ct {
                background: rgba(79, 172, 254, 0.16);

                .team-name {
                    color: #4facfe;
                }
            }

            &.t {
                background: rgba(240, 160, 32, 0.16);

                .team-name {
                    color: #f0a020;
                }
            }
        }
    }

    .timeline-map-info {
        position: absolute;
        bottom: 0;
        left: 0;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;

        .map-name {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }

        .record-time {
            font-size: 12px;
            color: rgba(var(--app-rgb), 0.85);
            display: flex;
            align-items: center;
            gap: 4px;

            .time-icon {
                font-size: 12px;
            }
        }
    }
}
</style>
