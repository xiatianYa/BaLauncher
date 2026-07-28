<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { NCard, NSpin, NEmpty, NTag, NButton } from 'naive-ui';
import { MdPreview } from 'md-editor-v3';
import dayjs from 'dayjs';
import { useThemeStore } from '@/store/modules/theme';
import { fetchGetLatestLogList } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import AddLogModal from './modules/add-log-modal.vue';
import UpdateLogModal from './modules/update-log-modal.vue';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';

defineOptions({
    name: 'updateLog'
});

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

const { dictType, dictLabel } = useDict();

const { hasRole } = useAuth();
const canAddUpdateLog = computed(() => hasRole(['R_SUPER', 'R_ADMIN']));

const addModalVisible = ref(false);
const editModalVisible = ref(false);
const editingLog = ref<Api.System.UpdateLogVo | null>(null);

const loading = ref(false);
const loadingMore = ref(false);
const finished = ref(false);
const updateLogs = ref<Api.System.UpdateLogVo[]>([]);
const limit = ref(10);

const newLogIds = ref<Set<number>>(new Set());

const formatDateTime = (dateStr: string): string => {
    return dayjs(dateStr).format('YYYY年MM月DD日');
};

const loadUpdateLogs = async (): Promise<void> => {
    if (loading.value || loadingMore.value) return;

    try {
        if (updateLogs.value.length === 0) {
            loading.value = true;
        } else {
            loadingMore.value = true;
        }

        const { data } = await fetchGetLatestLogList(limit.value);
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

const loadMore = (): void => {
    if (!finished.value && !loadingMore.value) {
        limit.value += 10;
        loadUpdateLogs();
    }
};

const handleSuccess = (): void => {
    updateLogs.value = [];
    limit.value = 10;
    finished.value = false;
    loadUpdateLogs();
};

const openEditModal = (log: Api.System.UpdateLogVo): void => {
    editingLog.value = log;
    editModalVisible.value = true;
};

const isNewLog = (id: number): boolean => {
    return newLogIds.value.has(id);
};

watch(editModalVisible, (newVal) => {
    if (!newVal) {
        editingLog.value = null;
    }
});

onMounted(() => {
    loadUpdateLogs();
});
</script>

<template>
    <NCard class="w-full h-full" :class="{ 'light-mode': !isDarkMode }" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
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
                                <div class="timeline-content">
                                    <div class="log-header">
                                        <div class="log-title-row">
                                            <h3 class="log-title">{{ log.title }}</h3>
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
                                            <NButton v-if="canAddUpdateLog" @click="openEditModal(log)" text
                                                size="small" class="edit-button">
                                                <template #icon>
                                                    <SvgIcon icon="mdi:pencil" />
                                                </template>
                                                {{ $t('updateLog.edit') }}
                                            </NButton>
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
                            <div class="finished-indicator">
                                {{ $t('updateLog.allLoaded') }} · {{ $t('updateLog.totalLogs', { count: updateLogs.length }) }}
                            </div>
                        </div>
                    </NInfiniteScroll>
                </NSpin>
            </div>
        </NCard>
    </NCard>
    <AddLogModal v-model:showAddLogModal="addModalVisible" @success="handleSuccess" />
    <UpdateLogModal v-model:showUpdateLogModal="editModalVisible" :edit-log="editingLog" @success="handleSuccess" />
</template>

<style scoped lang="scss">
.timeline {
  position: relative;
  padding: 4px 0;

  &::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background: rgba(255, 255, 255, 0.08);
  }

  :deep(.light-mode) &::before {
    background: rgba(0, 0, 0, 0.08);
  }
}

.timeline-item {
  position: relative;
  padding-left: 44px;
  margin-bottom: 20px;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.3s ease;

  &.new-item {
    opacity: 0;
    transform: translateY(8px);
    animation: fadeInUp 0.35s ease-out forwards;
  }
}

.timeline-dot {
  position: absolute;
  left: 13px;
  top: 10px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #667eea;
  border: 2px solid rgba(102, 126, 234, 0.2);
  z-index: 1;

  &.top-dot {
    background: #faad14;
    border-color: rgba(250, 173, 20, 0.25);
  }
}

.timeline-content {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: rgba(102, 126, 234, 0.25);
    background: rgba(255, 255, 255, 0.05);
  }

  :deep(.light-mode) & {
    background: #fff;
    border-color: rgba(0, 0, 0, 0.06);

    &:hover {
      border-color: rgba(102, 126, 234, 0.2);
      background: #fafafa;
    }
  }
}

.log-header {
  margin-bottom: 12px;
}

.log-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;

  .edit-button {
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .timeline-content:hover & .edit-button {
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
}

.log-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);

  :deep(.light-mode) & {
    color: rgba(0, 0, 0, 0.88);
  }
}

.log-body {
  .log-content {
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;

    :deep(.light-mode) & {
      color: rgba(0, 0, 0, 0.72);
    }

    p {
      margin: 6px 0;
    }

    ul,
    ol {
      margin: 10px 0;
      padding-left: 20px;
    }

    li {
      margin: 4px 0;
    }

    strong {
      color: rgba(255, 255, 255, 0.88);
      font-weight: 600;

      :deep(.light-mode) & {
        color: rgba(0, 0, 0, 0.85);
      }
    }

    code {
      background: rgba(102, 126, 234, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
  }
}

.finished-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);

  :deep(.light-mode) & {
    color: rgba(0, 0, 0, 0.35);
  }

  &::before,
  &::after {
    content: '';
    width: 40px;
    height: 1px;
    background: currentColor;
    opacity: 0.5;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
