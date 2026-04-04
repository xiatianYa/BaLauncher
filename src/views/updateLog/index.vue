<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { NCard, NSpin, NEmpty, NTag, NButton } from 'naive-ui';
import { MdPreview } from 'md-editor-v3';
import dayjs from 'dayjs';

import { useThemeStore } from '@/store/modules/theme';
import { fetchGetLatestUpdateLogList } from '@/service/api/system/updateLog';
import { useAuth } from '@/hooks/business/auth';
import AddUpdateLog from './modules/add-update-log.vue';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';

/**
 * 组件配置选项
 */
defineOptions({
    name: 'updateLog'
});

/**
 * 主题状态管理
 */
const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

/**
 * 字典选项
 */
const { dictType, dictLabel } = useDict();

/**
 * 权限控制
 */
const { hasRole } = useAuth();
const canAddUpdateLog = computed(() => hasRole(['R_SUPER', 'R_ADMIN']));

/**
 * 模态框显示状态
 */
const addModalVisible = ref(false);

/**
 * 分页和加载状态
 */
const loading = ref(false);
const loadingMore = ref(false);
const finished = ref(false);
const updateLogs = ref<Api.System.UpdateLogVo[]>([]);
const limit = ref(10);

/**
 * 用于动画跟踪的新日志ID集合
 */
const newLogIds = ref<Set<number>>(new Set());

/**
 * 格式化日期时间
 * @param dateStr - 日期字符串
 * @returns 格式化后的日期时间字符串
 * @example formatDateTime('2026-04-04T14:30:00') => '2026年04月04日 14时30分' or 'Apr 04, 2026 14:30'
 */
const formatDateTime = (dateStr: string): string => {
    return dayjs(dateStr).format('YYYY年MM月DD日');
};

/**
 * 加载更新日志列表
 * @async
 * @description 支持初始加载和更多加载两种模式
 */
const loadUpdateLogs = async (): Promise<void> => {
    if (loading.value || loadingMore.value) return;

    try {
        if (updateLogs.value.length === 0) {
            loading.value = true;
        } else {
            loadingMore.value = true;
        }

        const { data } = await fetchGetLatestUpdateLogList(limit.value);
        if (data) {
            if (updateLogs.value.length === 0) {
                updateLogs.value = data;
            } else {
                const existingIds = new Set(updateLogs.value.map(log => log.id));
                const newLogs = data.filter(log => !existingIds.has(log.id));

                newLogIds.value = new Set(newLogs.map(log => log.id));

                updateLogs.value = [...updateLogs.value, ...newLogs];

                nextTick(() => {
                    setTimeout(() => {
                        newLogIds.value.clear();
                    }, 800);
                });
            }

            if (data.length < limit.value) {
                finished.value = true;
            }
        }
    } catch (error) {
        console.error('加载更新日志失败:', error);
        window.$message?.error('加载更新日志失败');
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

/**
 * 加载更多更新日志
 * @description 无限滚动触发，增加加载数量并重新请求
 */
const loadMore = (): void => {
    if (!finished.value && !loadingMore.value) {
        limit.value += 10;
        loadUpdateLogs();
    }
};

/**
 * 添加更新日志成功回调
 * @description 重置列表状态并重新加载
 */
const handleAddSuccess = (): void => {
    updateLogs.value = [];
    limit.value = 10;
    finished.value = false;
    loadUpdateLogs();
};

/**
 * 判断是否为新加载的日志
 * @param id - 日志ID
 * @returns 是否需要显示动画
 */
const isNewLog = (id: number): boolean => {
    return newLogIds.value.has(id);
};

/**
 * 组件挂载初始化
 */
onMounted(() => {
    loadUpdateLogs();
});
</script>

<template>
    <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
        <NCard class="m-10px rounded-10px" content-style="padding:20px 25px 20px 25px;"
            content-class="h-full flex flex-col flex-1 overflow-auto" header-style="padding:10px" :segmented="{
                content: true,
                footer: 'soft',
            }">
            <template #header>
                <div class="flex items-center justify-between">
                    <div>
                        <div class="flex items-center mb-5px">
                            <h1 class="text-20px font-bold mr-2">{{ $t('updateLog.title') }}</h1>
                            <SvgIcon icon="mdi:update" class="text-24px" />
                        </div>
                        <div class="text-12px text-gray-500 font-bold">{{ $t('updateLog.subtitle') }}</div>
                    </div>
                    <NButton v-if="canAddUpdateLog" @click="addModalVisible = true" class="rounded-8px" type="primary"
                        ghost strong>
                        <template #icon>
                            <SvgIcon icon="mdi:plus" />
                        </template>
                        {{ $t('updateLog.addLog') }}
                    </NButton>
                </div>
            </template>
            <div class="relative flex-1">
                <NSpin :show="loading">
                    <div v-if="updateLogs.length === 0 && !loading" class="flex items-center justify-center h-full">
                        <NEmpty :description="$t('updateLog.noLogs')" />
                    </div>
                    <NInfiniteScroll v-else @load="loadMore">
                        <div class="timeline">
                            <div v-for="(log, index) in updateLogs" :key="log.id" class="timeline-item"
                                :class="{ 'new-item': isNewLog(log.id) }">
                                <div class="timeline-dot" :class="{ 'top-dot': index === 0 }"></div>
                                <div class="timeline-content" :class="{ 'light-mode': !isDarkMode }">
                                    <div class="log-header">
                                        <div class="log-title-row">
                                            <h3 class="log-title" :class="{ 'light-mode': !isDarkMode }">{{ log.title }}
                                            </h3>
                                            <NTag type="info" size="small" :bordered="false" class="rounded-5px">
                                                <template #icon>
                                                    <SvgIcon icon="lucide:tag" class="mr-5px" />
                                                </template>
                                                v{{ log.version }}
                                            </NTag>
                                            <NTag type="info" size="small" :bordered="false" class="rounded-5px">
                                                <template #icon>
                                                    <SvgIcon icon="lucide:calendar-1" class="mr-5px" />
                                                </template>
                                                {{ formatDateTime(log.createTime) }}
                                            </NTag>
                                            <NTag :type="dictType('sys_updateLog_type', log.updateType)" size="small"
                                                :bordered="false" class="rounded-5px">
                                                {{ dictLabel('sys_updateLog_type', log.updateType) }}
                                            </NTag>
                                            <NTag v-if="log.isTop === 1" type="warning" size="small" class="rounded-5px"
                                                :bordered="false">
                                                <template #icon>
                                                    <SvgIcon icon="solar:pin-line-duotone" class="mr-5px" />
                                                </template>
                                                {{ $t('updateLog.pinned') }}
                                            </NTag>
                                        </div>
                                    </div>

                                    <div class="log-body">
                                        <div v-if="log.content" class="log-content">
                                            <MdPreview class="p-10px rounded-10px"
                                                :theme="isDarkMode ? 'dark' : 'light'" :modelValue="log.content" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="loadingMore" class="flex justify-center py-20px">
                            <NSpin size="small" />
                        </div>
                        <div v-if="finished && updateLogs.length > 0" class="flex justify-center py-10px">
                            <div class="finished-indicator" :class="{ 'light-mode': !isDarkMode }">
                                <div class="indicator-content">
                                    <div class="indicator-icon">
                                        <SvgIcon icon="mdi:check-circle" />
                                    </div>
                                    <div class="indicator-text">
                                        <span class="text-main">{{ $t('updateLog.allLoaded') }}</span>
                                        <span class="text-sub" :class="{ 'light-mode': !isDarkMode }">{{
                                            $t('updateLog.totalLogs', {
                                                count: updateLogs.length
                                            }) }}</span>
                                    </div>
                                </div>
                                <div class="indicator-decoration">
                                    <div class="decoration-line left"></div>
                                    <div class="decoration-line right"></div>
                                </div>
                            </div>
                        </div>
                    </NInfiniteScroll>
                </NSpin>
            </div>
        </NCard>
    </NCard>
    <AddUpdateLog v-model:showAddUpdateLog="addModalVisible" @success="handleAddSuccess" />
</template>

<style scoped lang="scss">
/**
 * 时间线容器样式
 */
.timeline {
    position: relative;
    padding: 10px 0;

    &::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 10px;
        bottom: 10px;
        width: 2px;
        background: linear-gradient(180deg, #667eea 0%, #764ba2 50%, rgba(102, 126, 234, 0.3) 100%);
    }
}

/**
 * 时间线单个项目样式
 */
.timeline-item {
    position: relative;
    padding-left: 50px;
    margin-bottom: 24px;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);

    &.new-item {
        opacity: 0;
        transform: translateY(30px);
        animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
}

/**
 * 时间线节点样式
 */
.timeline-dot {
    position: absolute;
    left: 12px;
    top: 8px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 3px solid rgba(102, 126, 234, 0.3);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    z-index: 1;

    &.top-dot {
        background: linear-gradient(135deg, #faad14 0%, #ff7a45 100%);
        border-color: rgba(250, 173, 20, 0.3);
        box-shadow: 0 0 0 4px rgba(250, 173, 20, 0.1);
    }
}

/**
 * 时间线内容卡片样式
 */
.timeline-content {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover {
        border-color: rgba(102, 126, 234, 0.4);
        background: rgba(255, 255, 255, 0.08);
    }

    &.light-mode {
        background: rgba(0, 0, 0, 0.02);
        border-color: rgba(0, 0, 0, 0.06);

        &:hover {
            background: rgba(102, 126, 234, 0.05);
            border-color: rgba(102, 126, 234, 0.2);
        }
    }
}

/**
 * 日志头部区域
 */
.log-header {
    margin-bottom: 16px;
}

.log-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

/**
 * 日志主体区域
 */
.log-body {
    .log-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: rgba(255, 255, 255, 0.9);

        &.light-mode {
            color: rgba(0, 0, 0, 0.85);
        }
    }
}

/**
 * 日志内容区域
 */
.log-content {
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;

    &.light-mode {
        color: rgba(0, 0, 0, 0.7);
    }

    p {
        margin: 8px 0;
    }

    ul,
    ol {
        margin: 12px 0;
        padding-left: 24px;
    }

    li {
        margin: 6px 0;
    }

    strong {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;

        &.light-mode {
            color: rgba(0, 0, 0, 0.85);
        }
    }

    code {
        background: rgba(102, 126, 234, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 13px;
    }
}

/**
 * 加载完成指示器
 */
.finished-indicator {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;

    .indicator-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        border-radius: 10px;
        border: 1px solid rgba(102, 126, 234, 0.2);
        backdrop-filter: blur(10px);
        animation: fadeInUp 0.5s ease-out;
        z-index: 1;
    }

    .indicator-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        color: #fff;
        font-size: 18px;
        animation: pulse 2s ease-in-out infinite;
    }

    .indicator-text {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .text-main {
            font-size: 14px;
            font-weight: 600;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .text-sub {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);

            &.light-mode {
                color: rgba(0, 0, 0, 0.4);
            }
        }
    }

    .indicator-decoration {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        pointer-events: none;

        .decoration-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent);
        }

        .decoration-line.left {
            margin-right: 140px;
        }

        .decoration-line.right {
            margin-left: 140px;
        }
    }

    &.light-mode {
        .indicator-content {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border-color: rgba(102, 126, 234, 0.15);
        }

        .indicator-decoration {
            .decoration-line {
                background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.2), transparent);
            }
        }
    }
}

/**
 * 动画定义
 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {

    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
    }

    50% {
        box-shadow: 0 0 0 8px rgba(102, 126, 234, 0);
    }
}
</style>
