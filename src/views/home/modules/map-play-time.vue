<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchGetMapPlayCountList } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import SvgIcon from '@/components/custom/svg-icon.vue';
import HomeEmptyState from './empty-state.vue';
import { $t } from '@/locales';

const authStore = useAuthStore();
const mapPlayCountList = ref<Api.Game.GameMapPlayCountVo[]>([]);

const rankColors = ['#ff4d4f', '#faad14', '#52c41a', '#4096ff', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const formatPlayCount = (count: number): string => {
    if (count >= 10000) {
        const w = count / 10000;
        return $t('home.playCountWan', { count: w.toFixed(1) });
    } else if (count >= 1000) {
        const k = count / 1000;
        return $t('home.playCountK', { count: k.toFixed(1) });
    }
    return $t('home.playCount', { count });
};

/** 排行展示条数上限（卡片内滚动，控制初始渲染 DOM 数量） */
const DISPLAY_MAX = 50;

const sortedMapList = computed(() => {
    return [...mapPlayCountList.value]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, DISPLAY_MAX);
});

/** 空状态：无排行数据 */
const isEmpty = computed(() => sortedMapList.value.length === 0);

/** 未登录时不发请求，登录后才加载数据（home 页面可能先于登录挂载） */
const loadData = async () => {
    if (!authStore.isLogin) return;
    const { data, error } = await fetchGetMapPlayCountList();
    if (!error && data) {
        mapPlayCountList.value = data;
    }
};

onMounted(loadData);

watch(
    () => authStore.isLogin,
    (v) => {
        if (v) loadData();
    }
);
</script>

<template>
    <div class="dash-card map-play-card">
        <!-- 卡片头部：标题 -->
        <div class="card-header">
            <div class="card-title">
                <SvgIcon icon="mdi:map-marker-path" class="card-title-icon" />
                <span>{{ $t('home.mapPlayStats') }}</span>
            </div>
        </div>

        <!-- 空状态 -->
        <HomeEmptyState v-if="isEmpty" icon="mdi:map-outline" :title="$t('home.noData')" />

        <!-- 排行列表 -->
        <div v-else class="map-list">
            <div v-for="(item, index) in sortedMapList" :key="item.mapId || index" class="map-item">
                <div class="map-rank" :style="{
                    backgroundColor: index < 3 ? rankColors[index] : 'rgba(var(--app-rgb), 0.06)',
                    color: index < 3 ? '#fff' : 'rgba(var(--app-rgb), 0.4)'
                }">
                    <span v-if="index === 0" class="text-14px">🥇</span>
                    <span v-else-if="index === 1" class="text-14px">🥈</span>
                    <span v-else-if="index === 2" class="text-14px">🥉</span>
                    <span v-else>{{ index + 1 }}</span>
                </div>

                <div class="map-info">
                    <span class="map-name" :title="item.mapLabel || item.mapName">{{ item.mapLabel || item.mapName }}</span>
                    <span class="map-sub">
                        <SvgIcon icon="mdi:map-outline" class="map-sub-icon" />
                        {{ item.mapName }}
                    </span>
                </div>

                <div class="map-count" :style="{ color: rankColors[index] || 'rgba(var(--app-rgb), 0.7)' }">
                    {{ formatPlayCount(item.playCount || 0) }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.dash-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 14px;
    border-radius: 14px;
    background: rgba(var(--app-rgb), 0.04);
    border: 1px solid rgba(var(--app-rgb), 0.07);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: cardIn 0.45s ease-out forwards;
    box-sizing: border-box;
    overflow: hidden;

    &:hover {
        transform: translateY(-3px);
        background: rgba(var(--app-rgb), 0.07);
        border-color: rgba(var(--app-rgb), 0.35);
        box-shadow: 0 12px 28px rgba(var(--app-rgb), 0.12);
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-shrink: 0;

        .card-title {
            display: flex;
            align-items: center;
            gap: 7px;
            min-width: 0;

            .card-title-icon {
                font-size: 17px;
                color: #667eea;
                flex-shrink: 0;
            }

            span {
                font-size: 13.5px;
                font-weight: 700;
                color: var(--n-text-color);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    }

    .map-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 2px;

        &::-webkit-scrollbar {
            width: 4px;
        }

        &::-webkit-scrollbar-thumb {
            border-radius: 4px;
            background: rgba(var(--app-rgb), 0.12);
        }

        .map-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 10px;
            border-radius: 9px;
            background: rgba(var(--app-rgb), 0.03);
            border: 1px solid rgba(var(--app-rgb), 0.06);
            transition: all 0.25s ease;

            &:hover {
                background: rgba(var(--app-rgb), 0.07);
                border-color: rgba(var(--app-rgb), 0.35);
                transform: translateX(2px);
            }

            .map-rank {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 700;
                flex-shrink: 0;
                font-variant-numeric: tabular-nums;
            }

            .map-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 1px;

                .map-name {
                    font-size: 12.5px;
                    font-weight: 600;
                    color: rgba(var(--app-rgb), 0.88);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .map-sub {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 10.5px;
                    color: rgba(var(--app-rgb), 0.4);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;

                    .map-sub-icon {
                        font-size: 11px;
                        flex-shrink: 0;
                    }
                }
            }

            .map-count {
                font-size: 12.5px;
                font-weight: 700;
                flex-shrink: 0;
                font-variant-numeric: tabular-nums;
            }
        }
    }
}

@keyframes cardIn {
    from {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}
</style>
