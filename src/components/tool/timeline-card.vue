<!--
 * @component TimelineCard
 * @description 时间线面板 —— 三栏布局右侧主面板，以时间线形式展示地图游玩记录
 * @author BaLauncher
 * @design 使用 NInfiniteScroll 实现滚动触底自动加载，NTimeline 作为骨架，TimelineItem 渲染每条记录
 -->
<script setup lang="ts">
import { NCard, NEmpty, NSpin, NTimeline, NTimelineItem, NInfiniteScroll, NSelect, NButton } from 'naive-ui';
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
    <NCard size="small" :bordered="true" class="h-full timeline-card p-5px">
        <template #header>
            <div class="flex items-center gap-3">
                <NSelect
                    v-model:value="selectedMapId"
                    :options="mapOptions"
                    :filterable="true"
                    clearable
                    placeholder="搜索地图"
                    style="width: 200px"
                />
                <NButton type="primary" size="small" @click="handleSearchMap">
                    <SvgIcon icon="mdi:magnify" class="mr-1" />
                    查询
                </NButton>
                <NButton size="small" @click="handleResetSearch">
                    <SvgIcon icon="mdi:refresh" class="mr-1" />
                    重置
                </NButton>
            </div>
        </template>
        <!-- 已选择服务器 → 展示时间线 -->
        <div v-if="selectedServerIndex !== null" class="timeline-wrapper">
            <NInfiniteScroll v-if="timelineList.length > 0" :distance="100" @load="emit('load')"
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
    :deep(.n-card-header) {
        padding: 12px 16px;
        border-bottom: 1px solid var(--n-border-color);
    }

    :deep(.n-card__content) {
        padding: 0;
        overflow: hidden;
    }
}

/** 时间线滚动容器 */
.timeline-wrapper {
    height: 100%;
    overflow: hidden;
}

.timeline-scroll {
    height: 100%;
    padding: 16px 20px;
}

/** 未选择服务器时的占位引导 */
.timeline-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 160px);
    color: var(--n-text-color-3);
    gap: 12px;

    .placeholder-icon {
        font-size: 48px;
        opacity: 0.5;
    }

    p {
        font-size: 14px;
    }
}

.custom-timeline {
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

/** 全部加载完毕提示 */
.timeline-finished {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: var(--n-text-color-3);
    font-size: 12px;
}
</style>
