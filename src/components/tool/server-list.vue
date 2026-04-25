<!--
 * @component ServerList
 * @description 服务器列表面板 —— 展示当前社区下的服务器列表，支持单选高亮
 * @author BaLauncher
 * @design 三栏布局中间面板，承接社区选择后联动刷新的服务器数据
 -->
<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import { computed } from 'vue';
import { NCard, NEmpty } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';

defineOptions({ name: 'ServerList' });

const props = defineProps<{
    /** 当前社区下的服务器列表 */
    servers: Api.Game.Server[];
    /** 当前选中的服务器索引（基于 servers 数组下标） */
    selectedServerIndex: number | null;
}>();

const emit = defineEmits<{
    /** 点击服务器项时触发，携带数组下标 */
    (e: 'select', index: number): void;
}>();

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);
</script>

<template>
    <NCard size="small" :bordered="true" class="h-full server-card">
        <template #header>
            <div class="panel-header">
                <SvgIcon icon="mdi:server" class="panel-icon" />
                <span class="panel-title">{{ $t('server.list') }}</span>
            </div>
        </template>

        <!-- 服务器列表 -->
        <div class="server-list" v-if="servers.length > 0">
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
        padding: 12px 16px;
        border-bottom: 1px solid var(--n-border-color);
    }

    :deep(.n-card__content) {
        padding: 8px;
        overflow-y: auto;
        max-height: calc(100vh - 160px);
    }
}

.server-list {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .server-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.25s ease;
        border: 1.5px solid transparent;
        background: rgba(102, 126, 234, 0.02);

        &:hover {
            background: rgba(102, 126, 234, 0.08);
            border-color: rgba(102, 126, 234, 0.2);
            transform: translateX(3px);
        }

        &.server-item-selected {
            background: rgba(102, 126, 234, 0.12);
            border-color: rgba(102, 126, 234, 0.4);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .server-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .icon-svg {
                font-size: 18px;
                color: #fff;
            }
        }

        .server-info {
            flex: 1;
            min-width: 0;

            .server-name {
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--n-text-color);
            }

            .server-addr {
                font-size: 11px;
                color: var(--n-text-color-3);
                margin-top: 3px;
                font-family: monospace;
            }
        }

        .server-arrow {
            color: #667eea;
            font-size: 18px;
            animation: slideInRight 0.3s ease;
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

/** 选中箭头入场动画 */
@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(-5px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}
</style>
