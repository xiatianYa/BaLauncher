<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { NCard, NSpin, NTag, NButton } from 'naive-ui';
import { MdPreview } from 'md-editor-v3';
import dayjs from 'dayjs';
import { fetchGetLatestLogList, fetchRemoveLog } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import AddLogModal from './modules/add-log-modal.vue';
import UpdateLogModal from './modules/update-log-modal.vue';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';

defineOptions({
  name: 'updateLog'
});

const { dictType, dictLabel } = useDict();

const { isAdmin } = useAuth();
const canAddUpdateLog = isAdmin;

const addModalVisible = ref(false);
const editModalVisible = ref(false);
const editingLog = ref<Api.System.UpdateLogVo | null>(null);

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const currentDeleteLog = ref<Api.System.UpdateLogVo | null>(null);

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

const handleDelete = (log: Api.System.UpdateLogVo): void => {
  currentDeleteLog.value = log;
  showDeleteModal.value = true;
};

const handleConfirmDelete = async (): Promise<void> => {
  if (!currentDeleteLog.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchRemoveLog(currentDeleteLog.value.id);
    if (error) {
      window.$message?.error(error.message || '删除失败');
      return;
    }
    window.$message?.success('删除成功');
    showDeleteModal.value = false;
    currentDeleteLog.value = null;
    handleSuccess();
  } catch (error) {
    console.error('删除更新日志失败:', error);
    window.$message?.error('删除失败');
  } finally {
    deleteLoading.value = false;
  }
};

const handleCloseDeleteModal = (): void => {
  showDeleteModal.value = false;
  currentDeleteLog.value = null;
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
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:update" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('updateLog.title') }}</h1>
              <span class="page-subtitle">{{ $t('updateLog.subtitle') }}</span>
            </div>
          </div>
          <button v-if="canAddUpdateLog" class="icon-btn primary" title="新增更新日志" @click="addModalVisible = true">
            <SvgIcon icon="mdi:plus" />
          </button>
        </div>
      </template>

      <!-- 日志列表 -->
      <div class="card-list">
        <!-- 骨架屏：初次加载接口较慢时显示（与 userManage 一致） -->
        <div v-if="loading && updateLogs.length === 0" class="skeleton-list">
          <div v-for="i in 3" :key="`skeleton-${i}`" class="log-card skeleton">
            <div class="skeleton-title" />
            <div class="skeleton-meta" />
            <div class="skeleton-content" />
          </div>
        </div>

        <template v-else>
          <div v-if="updateLogs.length === 0" class="empty-state">
            <SvgIcon icon="mdi:file-document-outline" class="empty-icon" />
            <p>{{ $t('updateLog.noLogs') }}</p>
          </div>

          <NInfiniteScroll v-else @load="loadMore">
            <div class="log-card" v-for="(log, index) in updateLogs" :key="log.id"
              :class="{ 'new-item': isNewLog(log.id), pinned: log.isTop === 1 }"
              :style="{ '--delay': `${Math.min(index * 0.05, 0.4)}s` }">
            <div class="log-card-header">
              <div class="log-title-wrap">
                <h3 class="log-title" :title="log.title">{{ log.title }}</h3>
                <span v-if="log.isTop === 1" class="pin-tag">
                  <SvgIcon icon="solar:pin-line-duotone" />
                  <span>{{ $t('updateLog.pinned') }}</span>
                </span>
              </div>
              <div v-if="canAddUpdateLog" class="log-actions">
                <button class="icon-btn ghost" title="编辑" @click="openEditModal(log)">
                  <SvgIcon icon="mdi:pencil" />
                </button>
                <button class="icon-btn ghost danger" title="删除" @click="handleDelete(log)">
                  <SvgIcon icon="mdi:delete" />
                </button>
              </div>
            </div>

            <div class="log-card-meta">
              <span class="meta-tag version">
                <SvgIcon icon="lucide:tag" />
                <span>v{{ log.version }}</span>
              </span>
              <span class="meta-tag date">
                <SvgIcon icon="lucide:calendar-1" />
                <span>{{ formatDateTime(log.createTime) }}</span>
              </span>
              <span class="meta-tag type" :class="log.updateType">
                <SvgIcon icon="mdi:shape-outline" />
                <span>{{ dictLabel('sys_updateLog_type', log.updateType) }}</span>
              </span>
              <span v-if="index === 0" class="meta-tag latest">最新</span>
            </div>

            <div class="log-card-body" v-if="log.content">
              <MdPreview class="log-markdown" :modelValue="log.content" />
            </div>
          </div>

          <div v-if="loadingMore" class="load-more">
            <NSpin size="small" />
          </div>
          <div v-if="finished && updateLogs.length > 0" class="finished-indicator">
            {{ $t('updateLog.allLoaded') }} · {{ $t('updateLog.totalLogs', { count: updateLogs.length }) }}
          </div>
          </NInfiniteScroll>
        </template>
      </div>
    </NCard>
  </NCard>

  <AddLogModal v-model:showAddLogModal="addModalVisible" @success="handleSuccess" />
  <UpdateLogModal v-model:showUpdateLogModal="editModalVisible" :edit-log="editingLog" @success="handleSuccess" />

  <!-- 删除确认弹窗 -->
  <NModal v-model:show="showDeleteModal" preset="card" class="delete-modal rounded-16px w-360px"
    :bordered="false" size="small" :closable="false">
    <template #header>
      <div class="delete-modal-header">
        <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
        <span>删除确认</span>
      </div>
    </template>
    <div class="delete-modal-body">
      <p class="delete-modal-text">
        确定要删除更新日志
        <span class="delete-modal-target">{{ currentDeleteLog?.title }}</span>
        吗？
      </p>
      <p class="delete-modal-tip">删除后数据将无法恢复，请谨慎操作。</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="handleCloseDeleteModal">取消</button>
      <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
        <SvgIcon icon="mdi:delete" />
        <span>{{ deleteLoading ? '删除中...' : '删除' }}</span>
      </button>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.update-log-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.n-card) {
  background: transparent;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  .title-section {
    display: flex;
    align-items: center;
    gap: 12px;

    .title-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(102, 126, 234, 0.12);
      color: #667eea;
      font-size: 20px;
    }

    .title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .page-title {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
        color: rgba(255, 255, 255, 0.92);
      }

      .page-subtitle {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.45);
      }
    }
  }
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }

  &:active {
    transform: scale(0.97);
  }

  &.primary {
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.22);

    &:hover {
      background: rgba(102, 126, 234, 0.18);
    }
  }

  &.ghost {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    font-size: 14px;

    &.danger:hover {
      background: rgba(245, 87, 108, 0.15);
      color: #f5576c;
      border-color: rgba(245, 87, 108, 0.25);
    }
  }
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.card-list {
  flex: 1;
  overflow: auto;
  padding: 0 16px 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);

  .empty-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  p {
    font-size: 14px;
  }
}

/* 骨架屏（与 userManage 一致）：初次加载接口较慢时显示 */
.skeleton-list {
  padding: 0 16px 16px;
}

.log-card.skeleton {
  pointer-events: none;

  .skeleton-title,
  .skeleton-meta,
  .skeleton-content {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }

  .skeleton-title {
    height: 20px;
    width: 55%;
    margin-bottom: 10px;
  }

  .skeleton-meta {
    height: 26px;
    width: 45%;
    margin-bottom: 12px;
  }

  .skeleton-content {
    height: 90px;
    width: 100%;
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

.log-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  // 进入动画：错落淡入上浮（与工具箱卡片一致）
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(102, 126, 234, 0.25);
  }

  &.pinned {
    border-color: rgba(250, 173, 20, 0.25);

    &:hover {
      border-color: rgba(250, 173, 20, 0.4);
    }
  }

}

.log-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  .log-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;

    .log-title {
      font-size: 15px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pin-tag {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 5px;
      font-size: 11px;
      color: #faad14;
      background: rgba(250, 173, 20, 0.1);
      border: 1px solid rgba(250, 173, 20, 0.2);
    }
  }
}

.log-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .meta-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);

    svg {
      font-size: 13px;
    }

    &.version {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      border-color: rgba(102, 126, 234, 0.18);
    }

    &.date {
      color: rgba(255, 255, 255, 0.5);
    }

    &.latest {
      color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.18);
    }
  }
}

.log-card-body {
  .log-markdown {
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.68);
  }
}

/* 删除确认弹窗（teleport 到 body，需全局样式） */
.delete-modal {
  width: 360px;

  .delete-modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .delete-modal-icon {
      font-size: 20px;
      color: #f5576c;
    }
  }

  .delete-modal-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 0 16px;

    .delete-modal-text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);

      .delete-modal-target {
        font-weight: 600;
        color: #f5576c;
      }
    }

    .delete-modal-tip {
      margin: 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .delete-modal-actions {
    display: flex;
    gap: 10px;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex: 1;
      padding: 9px 2px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.8);

      &:hover {
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      &.cancel:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      &.danger {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.12);
        border-color: rgba(245, 87, 108, 0.25);

        &:hover {
          background: rgba(245, 87, 108, 0.22);
        }
      }
    }
  }
}

.light-mode {
  .delete-modal-body {
    .delete-modal-text {
      color: rgba(0, 0, 0, 0.85);
    }

    .delete-modal-tip {
      color: rgba(0, 0, 0, 0.45);
    }
  }
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.finished-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);

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

// 白天主题
.update-log-container.light-mode {
  .header-section {
    .title-section {
      .title-icon {
        background: rgba(102, 126, 234, 0.1);
        color: #667eea;
      }

      .title-group {
        .page-title {
          color: rgba(0, 0, 0, 0.88);
        }

        .page-subtitle {
          color: rgba(0, 0, 0, 0.45);
        }
      }
    }
  }

  .icon-btn {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.06);
    color: rgba(0, 0, 0, 0.65);

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      color: rgba(0, 0, 0, 0.88);
    }

    &.primary {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      border-color: rgba(102, 126, 234, 0.22);

      &:hover {
        background: rgba(102, 126, 234, 0.18);
      }
    }
  }

  .empty-state {
    color: rgba(0, 0, 0, 0.4);
  }

  .log-card {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.05);

    &:hover {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(102, 126, 234, 0.3);
    }

    &.pinned {
      border-color: rgba(250, 173, 20, 0.25);

      &:hover {
        border-color: rgba(250, 173, 20, 0.4);
      }
    }
  }

  .log-card-header {
    .log-title-wrap {
      .log-title {
        color: rgba(0, 0, 0, 0.88);
      }
    }
  }

  .log-card-meta {
    .meta-tag {
      color: rgba(0, 0, 0, 0.55);
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.06);

      &.version {
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        border-color: rgba(102, 126, 234, 0.18);
      }

      &.date {
        color: rgba(0, 0, 0, 0.5);
      }

      &.latest {
        color: #16a34a;
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.18);
      }
    }
  }

  .log-card-body {
    .log-markdown {
      background: rgba(0, 0, 0, 0.03);
      color: rgba(0, 0, 0, 0.68);
    }
  }

  .finished-indicator {
    color: rgba(0, 0, 0, 0.35);
  }
}
</style>
