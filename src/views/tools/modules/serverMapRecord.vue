<!-- 地图游玩记录：社区 → 服务器 → 时间线 三栏布局 -->
<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { computed, ref, onMounted } from 'vue';
import { fetchGetServerMapTimeline } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'ServerMapRecordPage' });

const emit = defineEmits<{ back: [] }>();

const gameStore = useGameStore();

/* ===== 选择状态 ===== */

const selectedCommunityId = ref<number | null>(null);
const selectedServerIndex = ref<number | null>(null);
const selectedServerId = ref<number | null>(null);

/* ===== 时间线分页状态 ===== */

const TIMELINE_PAGE_SIZE = 20;
const timelineList = ref<Api.Game.GameServerMapTimelineVo[]>([]);
const searchMapId = ref<number | null>(null);
const timelineLoading = ref(false);
const timelineFinished = ref(false);
const timelinePage = ref(1);
const timelineTotal = ref(0);

/* ===== 计算属性 ===== */

/** 根据选中的社区 ID 过滤服务器列表 */
const communityServers = computed(() => {
    if (!selectedCommunityId.value) return [];
    return gameStore.serverDataList.filter(s => s.communityId === selectedCommunityId.value);
});

/** 社区/服务器数据加载中（store 数据未就绪时显示骨架屏） */
const communityLoading = computed(() => gameStore.communityList.length === 0);
const serverLoading = computed(() => gameStore.serverDataList.length === 0);

/* ===== 交互逻辑 ===== */

const selectCommunity = (id: number) => {
    if (selectedCommunityId.value === id) return;
    selectedCommunityId.value = id;
    selectedServerIndex.value = null;
    selectedServerId.value = null;
    resetTimeline();
};

const selectServerByIndex = async (index: number) => {
    if (selectedServerIndex.value === index) return;
    const server = communityServers.value[index];
    if (!server) return;
    selectedServerIndex.value = index;
    selectedServerId.value = server.id;
    resetTimeline();
    await loadTimeline();
};

const handleSearchMap = async (mapId: number | null) => {
    searchMapId.value = mapId;
    resetTimeline();
    await loadTimeline();
};

/* ===== 数据加载 ===== */

const resetTimeline = () => {
    timelineList.value = [];
    timelineFinished.value = false;
    timelinePage.value = 1;
};

/** 分页加载时间线，追加到列表末尾，加载完毕时标记 finished */
const loadTimeline = async () => {
    if (!selectedServerId.value || timelineLoading.value || timelineFinished.value) return;

    timelineLoading.value = true;
    try {
        const { data, error } = await fetchGetServerMapTimeline(selectedServerId.value, {
            current: timelinePage.value,
            size: TIMELINE_PAGE_SIZE
        }, searchMapId.value ?? undefined);

        if (!error && data) {
            const records = data.records || [];
            timelineTotal.value = data.total || 0;

            if (records.length === 0) {
                timelineFinished.value = true;
            } else {
                timelineList.value.push(...records);
                timelinePage.value++;
                if (timelineList.value.length >= timelineTotal.value) {
                    timelineFinished.value = true;
                }
            }
        }
    } finally {
        timelineLoading.value = false;
    }
};

/* ===== 生命周期 ===== */

/** 挂载后自动选中第一个社区，避免进入页面时空白 */
onMounted(() => {
    if (gameStore.communityList.length > 0 && !selectedCommunityId.value) {
        selectCommunity(gameStore.communityList[0].id);
    }
});
</script>

<template>
    <div class="server-map-record-container">
        <!-- 页面头部：标题 + 返回按钮 -->
        <div class="header-section">
            <div class="title-section">
                <SvgIcon icon="mdi:timeline-clock" class="title-icon" />
                <h1 class="page-title">{{ $t('tools.serverMapRecordTitle') }}</h1>
            </div>
            <div class="back-btn" @click="emit('back')">
                <SvgIcon icon="mdi:arrow-left" class="back-icon" />
                <span>{{ $t('keyBind.back') }}</span>
            </div>
        </div>

        <!-- 三栏主内容区 -->
        <div class="main-content">
            <!-- 左栏：社区列表 -->
            <div class="community-panel">
                <CommunityList :selected-community-id="selectedCommunityId" :loading="communityLoading"
                    @select="selectCommunity" />
            </div>

            <!-- 中栏：服务器列表 -->
            <div class="server-panel">
                <ServerList :servers="communityServers" :selected-server-index="selectedServerIndex"
                    :loading="serverLoading" @select="selectServerByIndex" />
            </div>

            <!-- 右栏：时间线面板 -->
            <div class="timeline-panel">
                <TimelineCard :selected-server-index="selectedServerIndex" :timeline-list="timelineList"
                    :timeline-loading="timelineLoading" :timeline-finished="timelineFinished" @load="loadTimeline"
                    @search-map="handleSearchMap" />
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.server-map-record-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 12px;

    .header-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;

        .title-section {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
        }

        .back-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-radius: 10px;
            cursor: pointer;
            color: #667eea;
            background: rgba(102, 126, 234, 0.15);
            border: 1px solid rgba(var(--app-rgb), 0.1);
            transition: all 0.3s ease;

            &:hover {
                color: #667eea;
                background: rgba(102, 126, 234, 0.3);
            }

            .back-icon {
                font-size: 20px;
            }
        }

        .title-icon {
            font-size: 24px;
            color: #667eea;
        }

        .page-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            color: var(--n-text-color);
            letter-spacing: 0.5px;
        }
    }

    .main-content {
        display: flex;
        flex: 1;
        gap: 12px;
        min-height: 0;
        overflow: hidden;

        .community-panel {
            width: 220px;
            flex-shrink: 0;
            height: 100%;
        }

        .server-panel {
            width: 260px;
            flex-shrink: 0;
            height: 100%;
        }

        .timeline-panel {
            flex: 1;
            min-width: 0;
            height: 100%;
        }
    }
}
</style>
