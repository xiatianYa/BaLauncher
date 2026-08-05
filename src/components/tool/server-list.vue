<!--
 * @component ServerList
 * @description 服务器列表面板 —— 展示当前社区下的服务器列表，支持单选高亮
 * @author BaLauncher
 * @design 三栏布局中间面板，承接社区选择后联动刷新的服务器数据
 -->
<script setup lang="ts">
import { NCard, NEmpty } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';

defineOptions({ name: 'ServerList' });

const props = defineProps<{
    /** 当前社区下的服务器列表 */
    servers: Api.Game.Server[];
    /** 当前选中的服务器索引（基于 servers 数组下标） */
    selectedServerIndex: number | null;
    /** 数据加载中，显示骨架屏 */
    loading?: boolean;
}>();

const emit = defineEmits<{
    /** 点击服务器项时触发，携带数组下标 */
    (e: 'select', index: number): void;
}>();

</script>

<template>
    <NCard size="small" :bordered="true" class="h-full server-card">
        <template #header>
            <div class="panel-header">
                <SvgIcon icon="mdi:server" class="panel-icon" />
                <span class="panel-title">{{ $t('server.list') }}</span>
            </div>
        </template>

        <!-- 加载骨架屏 -->
        <div v-if="loading" class="server-skeleton">
            <div v-for="i in 6" :key="`server-skeleton-${i}`" class="skeleton-item">
                <div class="skeleton-avatar" />
                <div class="skeleton-lines">
                    <div class="skeleton-line" />
                    <div class="skeleton-line short" />
                </div>
            </div>
        </div>

        <!-- 服务器列表 -->
        <div class="server-list" v-else-if="servers.length > 0">
            <div v-for="(server, sIndex) in servers" :key="sIndex" class="server-item"
                :class="{ 'server-item-selected': selectedServerIndex === sIndex }"
                @click="emit('select', sIndex)">
                <!-- 服务器图标 -->
                <div class="server-icon">
                    <SvgIcon icon="mdi:server" class="icon-svg" />
                </div>
                <!-- 服务器信息 -->
                <div class="server-info">
                    <div class="server-name">{{ server.serverName }}</div>
                    <div class="server-addr">{{ server.ip }}:{{ server.port }}</div>
                </div>
                <!-- 选中态箭头指示 -->
                <div class="server-arrow" v-if="selectedServerIndex === sIndex">
                    <SvgIcon icon="mdi:chevron-right" />
                </div>
            </div>
        </div>

        <!-- 空状态兜底 -->
        <NEmpty v-else :description="$t('server.noServer')" class="mt-20px" />
    </NCard>
</template>

<style scoped lang="scss">
.server-card {
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

.server-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;

    .server-item {
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

        &.server-item-selected {
            border-color: var(--n-primary-color);
            background: var(--n-primary-color-suppl);

            .server-name {
                color: var(--n-primary-color);
            }
        }

        .server-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            background: var(--n-color);
            border: 1px solid var(--n-border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .icon-svg {
                font-size: 16px;
                color: var(--n-text-color-2);
            }
        }

        .server-info {
            flex: 1;
            min-width: 0;

            .server-name {
                font-size: 13px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--n-text-color);
            }

            .server-addr {
                font-size: 11px;
                color: var(--n-text-color-3);
                margin-top: 2px;
                font-family: monospace;
            }
        }

        .server-arrow {
            color: var(--n-text-color-3);
            font-size: 16px;
        }
    }
}

.server-skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
    pointer-events: none;

    .skeleton-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(var(--app-rgb), 0.07);

        .skeleton-avatar,
        .skeleton-line {
            background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 6px;
        }

        .skeleton-avatar {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            flex-shrink: 0;
        }

        .skeleton-lines {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;

            .skeleton-line {
                height: 12px;
                width: 70%;

                &.short {
                    width: 45%;
                    height: 10px;
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

@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}
</style>
