<!--
 * @page ServerMapRecord
 * @description 地图游玩记录页面 —— 三栏布局：社区列表 → 服务器列表 → 时间线面板
 * @author BaLauncher
 * @architecture 容器组件模式：本页面负责状态管理与数据流编排，子组件仅负责 UI 渲染与事件上报
 * @dataflow  社区选择 → 过滤服务器列表 → 选择服务器 → 分页加载时间线 → NInfiniteScroll 触底加载更多
 -->
<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import { useGameStore } from '@/store/modules/game';
import { computed, ref, onMounted } from 'vue';
import { fetchGetServerMapTimeline } from '@/service/api';
import { $t } from '@/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import SvgIcon from '@/components/custom/svg-icon.vue';

// 初始化 dayjs 中文 locale 与插件
dayjs.extend(localeData);
dayjs.extend(weekday);
dayjs.locale('zh-cn');

defineOptions({ name: 'ServerMapRecordPage' });

const emit = defineEmits<{
    /** 返回上一级页面 */
    (e: 'back'): void;
}>();

const themeStore = useThemeStore();
const gameStore = useGameStore();
const isDarkMode = computed(() => themeStore.darkMode);

// ==================== 选择状态 ====================

/** 当前选中的社区 ID */
const selectedCommunityId = ref<number | null>(null);
/** 当前选中的服务器索引（基于 communityServers 数组下标） */
const selectedServerIndex = ref<number | null>(null);
/** 当前选中的服务器 ID，用于接口请求 */
const selectedServerId = ref<number | null>(null);

// ==================== 时间线分页状态 ====================

/** 时间线数据列表 */
const timelineList = ref<Api.Game.GameServerMapTimelineVo[]>([]);
const searchMapId = ref<number | null>(null);
/** 是否正在请求接口 */
const timelineLoading = ref(false);
/** 是否已加载完全部数据 */
const timelineFinished = ref(false);
/** 当前分页页码 */
const timelinePage = ref(1);
/** 每页数据条数 */
const TIMELINE_PAGE_SIZE = 20;
/** 服务端返回的总条数，用于判断是否加载完毕 */
const timelineTotal = ref(0);

// ==================== 计算属性 ====================

/**
 * 根据当前选中的社区 ID 过滤服务器列表
 * 社区切换时自动联动刷新
 */
const communityServers = computed(() => {
    if (!selectedCommunityId.value) return [];
    return gameStore.serverDataList.filter(s => s.communityId === selectedCommunityId.value);
});

// ==================== 交互逻辑 ====================

/**
 * 选择社区
 * 切换社区时重置服务器选择与时间线状态
 */
const selectCommunity = (id: number) => {
    if (selectedCommunityId.value === id) return;
    selectedCommunityId.value = id;
    selectedServerIndex.value = null;
    selectedServerId.value = null;
    resetTimeline();
};

/**
 * 选择服务器
 * 切换服务器时重置时间线状态并立即加载首页数据
 */
const selectServerByIndex = async (index: number) => {
    if (selectedServerIndex.value === index) return;
    const server = communityServers.value[index];
    if (!server) return;
    selectedServerIndex.value = index;
    selectedServerId.value = server.id;
    resetTimeline();
    await loadTimeline();
};

/**
 * 搜索地图
 */
const handleSearchMap = async (mapId: number | null) => {
    searchMapId.value = mapId;
    resetTimeline();
    await loadTimeline();
};

// ==================== 数据加载 ====================

/**
 * 重置时间线分页状态
 * 在社区/服务器切换时调用，确保数据从第一页重新加载
 */
const resetTimeline = () => {
    timelineList.value = [];
    timelineFinished.value = false;
    timelinePage.value = 1;
};

/**
 * 加载时间线数据（分页）
 * 采用"追加"策略，新数据 push 到已有列表末尾
 * 加载完毕判断：列表长度 ≥ 服务端总条数时标记 finished
 */
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

// ==================== 生命周期 ====================

/**
 * 页面挂载时自动选中第一个社区
 * 避免用户进入页面后看到空白状态
 */
onMounted(() => {
    if (gameStore.communityList.length > 0 && !selectedCommunityId.value) {
        selectCommunity(gameStore.communityList[0].id);
    }
});
</script>

<template>
    <div class="server-map-record-container" :class="{ 'light-mode': !isDarkMode }">
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
                <CommunityList :selected-community-id="selectedCommunityId" @select="selectCommunity" />
            </div>

            <!-- 中栏：服务器列表 -->
            <div class="server-panel">
                <ServerList :servers="communityServers" :selected-server-index="selectedServerIndex"
                    @select="selectServerByIndex" />
            </div>

            <!-- 右栏：时间线面板 -->
            <div class="timeline-panel">
                <TimelineCard :selected-server-index="selectedServerIndex" :timeline-list="timelineList"
                    :timeline-loading="timelineLoading" :timeline-finished="timelineFinished" @load="loadTimeline" @search-map="handleSearchMap" />
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
    animation: fadeIn 0.4s ease-out;

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
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;

            &:hover {
                color: #667eea;
                background: rgba(102, 126, 234, 0.3);
            }

            .back-icon {
                font-size: 20px;
            }
        }

        .page-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    }

    /** 三栏弹性布局 */
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

/** 页面入场动画 */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/** 浅色模式覆盖 */
.light-mode {
    .header-section {
        .back-btn {
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(0, 0, 0, 0.06);
        }
    }
}
</style>
