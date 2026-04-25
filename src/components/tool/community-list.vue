<!--
 * @component CommunityList
 * @description 社区列表面板 —— 展示当前游戏社区列表，支持单选高亮
 * @author BaLauncher
 * @design 三栏布局左侧面板，负责社区维度的数据筛选
 -->
<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import { useGameStore } from '@/store/modules/game';
import { computed } from 'vue';
import { NCard, NEmpty } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';

defineOptions({ name: 'CommunityList' });

const props = defineProps<{
    /** 当前选中的社区 ID，用于高亮标记 */
    selectedCommunityId: number | null;
}>();

const emit = defineEmits<{
    /** 点击社区项时触发，携带社区 ID */
    (e: 'select', id: number): void;
}>();

const themeStore = useThemeStore();
const gameStore = useGameStore();
const isDarkMode = computed(() => themeStore.darkMode);
</script>

<template>
    <NCard size="small" :bordered="true" class="h-full community-card">
        <template #header>
            <div class="panel-header">
                <SvgIcon icon="mdi:server-network" class="panel-icon" />
                <span class="panel-title">{{ $t('server.communityList') }}</span>
            </div>
        </template>

        <!-- 社区列表 -->
        <div class="community-list" v-if="gameStore.communityList.length > 0">
            <div v-for="community in gameStore.communityList" :key="community.id" class="community-item"
                :class="{ 'community-item-selected': selectedCommunityId === community.id }"
                @click="emit('select', community.id)">
                <!-- 社区 Logo -->
                <div class="community-logo" v-if="community.logo">
                    <img :src="community.logo" :alt="community.communityName" />
                </div>
                <!-- 社区信息 -->
                <div class="community-info" :class="{ 'no-logo': !community.logo }">
                    <div class="community-name">{{ community.communityName }}</div>
                    <div class="community-stats">
                        <span class="server-count">{{ $t('server.serverCount', {
                            count:
                                community.serverNumber
                        }) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 空状态兜底 -->
        <NEmpty v-else :description="$t('server.noCommunity')" class="mt-20px" />
    </NCard>
</template>

<style scoped lang="scss">
.community-card {
    :deep(.n-card-header) {
        padding: 12px 16px;
        border-bottom: 1px solid var(--n-border-color);
    }

    :deep(.n-card__content) {
        padding: 8px;
        overflow-y: auto;
        max-height: calc(100vh - 160px);
    }
}

.community-list {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .community-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.25s ease;
        border: 1.5px solid transparent;

        &:hover {
            background: rgba(102, 126, 234, 0.08);
            border-color: rgba(102, 126, 234, 0.2);
        }

        &.community-item-selected {
            background: rgba(102, 126, 234, 0.12);
            border-color: rgba(102, 126, 234, 0.4);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .community-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            background: rgba(102, 126, 234, 0.05);

            img {
                width: 40px;
                border-radius: 4px;
                object-fit: cover;
            }
        }

        .community-info {
            flex: 1;
            min-width: 0;

            &.no-logo {
                margin-left: 0;
            }

            .community-name {
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--n-text-color);
            }

            .community-stats {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 4px;

                .server-count {
                    font-size: 11px;
                    color: var(--n-text-color-3);
                }
            }
        }
    }
}

/** 面板通用头部样式 */
.panel-header {
    display: flex;
    align-items: center;
    gap: 8px;

    .panel-icon {
        font-size: 16px;
        color: #667eea;
    }

    .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--n-text-color);
    }
}
</style>
