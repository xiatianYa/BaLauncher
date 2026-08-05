<!--
 * @component TimelineCard
 * @description 时间线面板 —— 三栏布局右侧主面板，以时间线形式展示地图游玩记录
 * @author BaLauncher
 * @design 使用 NInfiniteScroll 实现滚动触底自动加载，NTimeline 作为骨架，TimelineItem 渲染每条记录
 -->
<script setup lang="ts">
import { NCard, NEmpty, NSpin, NTimeline, NTimelineItem, NInfiniteScroll, NSelect } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';
import TimelineItem from './timeline-item.vue';
import { fetchGetMapList } from '@/service/api';
import { ref, onMounted, computed } from 'vue';

defineOptions({ name: 'TimelineCard' });

const props = defineProps<{
    /** 当前选中的服务器索引，null 表示未选择 */
    selectedServerIndex: number | null;
    /** 时间线数据列表 */
    timelineList: Api.Game.GameServerMapTimelineVo[];
    /** 是否正在加载数据 */
    timelineLoading: boolean;
    /** 是否已加载完全部数据 */
    timelineFinished: boolean;
}>();

const emit = defineEmits<{
    (e: 'load'): void;
    (e: 'searchMap', mapId: number | null): void;
}>();

const mapList = ref<Api.Game.Map[]>([]);
const selectedMapId = ref<number | null>(null);

const mapOptions = computed(() => {
    return mapList.value.map(map => ({
        label: map.mapLabel ? `${map.mapName}(${map.mapLabel})` : map.mapName,
        value: map.id
    }));
});

const loadMapList = async () => {
    const { data } = await fetchGetMapList();
    if (data) {
        mapList.value = data;
    }
};

const handleSearchMap = () => {
    emit('searchMap', selectedMapId.value);
};

const handleResetSearch = () => {
    selectedMapId.value = null;
    emit('searchMap', null);
};

onMounted(() => {
    loadMapList();
});
</script>

<template>
    <NCard size="small" :bordered="true" class="h-full timeline-card">
        <template #header>
            <div class="timeline-header">
                <div class="timeline-header-icon">
                    <SvgIcon icon="mdi:history" />
                </div>
                <span class="timeline-header-title">{{ $t('tools.mapTimeline') }}</span>
                <div class="timeline-header-search">
                    <NSelect
                        v-model:value="selectedMapId"
                        :options="mapOptions"
                        :filterable="true"
                        clearable
                        placeholder="搜索地图"
                        style="width: 180px"
                        size="small"
                    />
                    <button class="timeline-search-btn" @click="handleSearchMap">
                        <SvgIcon icon="mdi:magnify" />
                    </button>
                    <button class="timeline-reset-btn" @click="handleResetSearch">
                        <SvgIcon icon="mdi:refresh" />
                    </button>
                </div>
            </div>
        </template>
        <!-- 已选择服务器 → 展示时间线 -->
        <div v-if="selectedServerIndex !== null" class="timeline-wrapper mt-8px">
            <!-- 初始加载骨架屏 -->
            <div v-if="timelineLoading && timelineList.length === 0" class="timeline-skeleton">
                <div v-for="i in 5" :key="`timeline-skeleton-${i}`" class="timeline-skeleton-item">
                    <div class="timeline-skeleton-dot" />
                    <div class="timeline-skeleton-lines">
                        <div class="timeline-skeleton-line" />
                        <div class="timeline-skeleton-line short" />
                    </div>
                </div>
            </div>

            <NInfiniteScroll v-else-if="timelineList.length > 0" :distance="100" @load="emit('load')"
                class="timeline-scroll">
                <NTimeline class="custom-timeline">
                    <NTimelineItem v-for="(item, index) in timelineList" :key="index"
                        :type="index === 0 ? 'success' : 'default'" :title="item.mapLabel || item.mapName">
                        <template #header>
                            <TimelineItem :item="item" :index="index" />
                        </template>
                    </NTimelineItem>
                </NTimeline>
                <!-- 加载中指示器 -->
                <div v-if="timelineLoading" class="flex justify-center py-16px">
                    <NSpin size="small" />
                </div>
                <!-- 全部加载完毕提示 -->
                <div v-if="timelineFinished" class="timeline-finished">
                    - {{ $t('tools.allLoaded') }} -
                </div>
            </NInfiniteScroll>

            <!-- 有服务器但无时间线数据 -->
            <NEmpty v-else-if="!timelineLoading" :description="$t('tools.noTimelineData')" class="mt-40px" />
        </div>

        <!-- 未选择服务器 → 占位引导 -->
        <div v-else class="timeline-placeholder">
            <SvgIcon icon="mdi:cursor-pointer" class="placeholder-icon" />
            <p>{{ $t('tools.selectServerTip') }}</p>
        </div>
    </NCard>
</template>

<style scoped lang="scss">
.timeline-card {
    height: 100%;
    border-radius: 12px;
    overflow-y: auto;

    :deep(.n-card-header) {
        padding: 12px 14px;
        border-bottom: 1px solid var(--n-border-color);
        background: var(--n-color-embedded);
    }

    :deep(.n-card__content) {
        padding: 0;
        overflow: hidden;
    }
}

.timeline-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;

    .timeline-header-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 9px;
        font-size: 17px;
        flex-shrink: 0;
        color: var(--n-primary-color);
        background: var(--n-primary-color-suppl);
    }

    .timeline-header-title {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--n-text-color);
    }

    .timeline-header-search {
        display: flex;
        align-items: center;
        gap: 8px;

        // 图标按钮：统一 28px 高（与 NSelect small 对齐），8px 圆角，半透明灰底 + 描边，hover 变主色
        .timeline-search-btn,
        .timeline-reset-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            padding: 0;
            border: 1px solid var(--n-border-color);
            border-radius: 8px;
            background: rgba(var(--app-rgb), 0.05);
            cursor: pointer;
            font-size: 16px;
            color: var(--n-text-color-2);
            transition: all 0.2s ease;
            flex-shrink: 0;

            &:hover {
                color: var(--n-primary-color);
                border-color: var(--n-primary-color);
                background: var(--n-primary-color-suppl);
            }

            &:active {
                transform: scale(0.95);
            }

            svg {
                font-size: inherit;
            }
        }
    }
}

.timeline-wrapper {
    height: 100%;
    overflow: hidden;
}

.timeline-skeleton {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    pointer-events: none;

    .timeline-skeleton-item {
        display: flex;
        gap: 14px;
        padding-bottom: 22px;
        position: relative;

        &::before {
            content: '';
            position: absolute;
            left: 4px;
            top: 16px;
            bottom: 0;
            width: 2px;
            background: rgba(var(--app-rgb), 0.06);
        }

        &:last-child::before {
            display: none;
        }

        .timeline-skeleton-dot,
        .timeline-skeleton-line {
            background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 6px;
        }

        .timeline-skeleton-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-top: 4px;
            flex-shrink: 0;
            z-index: 1;
        }

        .timeline-skeleton-lines {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .timeline-skeleton-line {
                height: 14px;
                width: 100%;

                &.short {
                    width: 60%;
                    height: 11px;
                }
            }
        }
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

.timeline-scroll {
    height: 100%;
    padding: 16px 20px;
}

.timeline-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 160px);
    color: var(--n-text-color-3);
    gap: 10px;

    .placeholder-icon {
        font-size: 28px;
        opacity: 0.4;
    }

    p {
        font-size: 13px;
        margin: 0;
    }
}

.custom-timeline {
    :deep(.n-timeline-item-content) {
        padding-bottom: 20px;
    }

    .timeline-item-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 4px;

        .timeline-map-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--n-text-color);
        }
    }
}

.timeline-finished {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    color: var(--n-text-color-3);
    font-size: 12px;
}
</style>
