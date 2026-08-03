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
        padding: 10px 14px;
        border-bottom: 1px solid var(--n-border-color);
    }

    :deep(.n-card__content) {
        padding: 6px;
        overflow-y: auto;
        max-height: calc(100vh - 160px);
    }
}

.community-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;

    .community-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid var(--n-border-color);
        background: var(--n-color);

        &:hover {
            border-color: var(--n-border-color-hover);
            background: var(--n-color-hover);
        }

        &.community-item-selected {
            border-color: var(--n-primary-color);
            background: var(--n-primary-color-suppl);

            .community-name {
                color: var(--n-primary-color);
            }
        }

        .community-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            background: var(--n-color);
            border: 1px solid var(--n-border-color);

            img {
                width: 28px;
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
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--n-text-color);
            }

            .community-stats {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 2px;

                .server-count {
                    font-size: 11px;
                    color: var(--n-text-color-3);
                }
            }
        }
    }
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 6px;

    .panel-icon {
        font-size: 14px;
        color: var(--n-text-color-2);
    }

    .panel-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--n-text-color);
    }
}
</style>
