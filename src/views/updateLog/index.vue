<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue';
import { NCard, NSpin, NTag, NButton } from 'naive-ui';
import dayjs from 'dayjs';
import { fetchGetLatestLogList, fetchRemoveLog, fetchGetNoticePageList, fetchRemoveNotice } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import AddLogModal from './modules/add-log-modal.vue';
import UpdateLogModal from './modules/update-log-modal.vue';
import NoticeEditModal from './modules/notice-edit-modal.vue';
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

/* ===== 视图切换（更新日志 / 通知日志，参考 roleManage 双视图） ===== */

/** 当前视图模式: log=更新日志, notice=通知日志 */
const viewMode = ref<'log' | 'notice'>('log');

/** 切换视图（普通用户仅可查看更新日志，通知日志仅管理员可见） */
const handleSwitchView = (mode: 'log' | 'notice') => {
  // 非管理员不允许切换到通知日志视图
  if (!isAdmin && mode === 'notice') return;
  viewMode.value = mode;
  // 首次切换到通知日志视图时加载分页数据
  if (mode === 'notice' && noticeList.value.length === 0 && !noticeLoading.value) {
    loadNoticeData();
  }
};

/* ===== 通知日志分页列表 ===== */

/** 通知分页加载状态 */
const noticeLoading = ref(false);
/** 通知分页列表 */
const noticeList = ref<Api.System.SysNoticeVo[]>([]);
/** 通知分页参数 */
const noticePagination = reactive({
  title: '',
  current: 1,
  size: 6,
  total: 0
});

/** 通知优先级展示信息（与 notice-panel 一致） */
const priorityInfo = (priority?: number) => {
  switch (priority) {
    case 1:
      return { label: $t('notice.priorityImportant'), color: '#f0a020' };
    case 2:
      return { label: $t('notice.priorityUrgent'), color: '#d03050' };
    default:
      return { label: $t('notice.priorityNormal'), color: '' };
  }
};

/** 通知类型文案 1=公告 2=个人消息 */
const getNoticeTypeText = (type?: number) => (type === 2 ? $t('notice.personal') : $t('notice.announce'));

/** 通知状态文案 0=草稿 1=已发布 2=已下线 */
const getNoticeStatusText = (status?: number) =>
  status === 0
    ? $t('updateLog.noticeStatusDraft')
    : status === 2
      ? $t('updateLog.noticeStatusOffline')
      : $t('updateLog.noticeStatusPublished');

/** 加载通知分页数据 */
const loadNoticeData = async () => {
  noticeLoading.value = true;
  try {
    const params: Api.System.SysNoticeSearchDTO = {
      title: noticePagination.title || null,
      current: noticePagination.current,
      size: noticePagination.size
    };
    const { data, error } = await fetchGetNoticePageList(params);
    if (!error && data) {
      noticeList.value = data.records || [];
      noticePagination.total = data.total || 0;
    }
  } finally {
    noticeLoading.value = false;
  }
};

/** 通知搜索：重置到第一页后重新查询 */
const handleNoticeSearch = () => {
  noticePagination.current = 1;
  loadNoticeData();
};

/** 通知分页切换 */
const handleNoticePageChange = (page: number) => {
  noticePagination.current = page;
  loadNoticeData();
};

/* ===== 通知删除确认 ===== */

/** 通知删除确认弹窗显示状态 */
const showNoticeDeleteModal = ref(false);
/** 通知删除加载状态 */
const noticeDeleteLoading = ref(false);
/** 当前待删除通知 */
const currentDeleteNotice = ref<Api.System.SysNoticeVo | null>(null);

/* ===== 通知新增 / 编辑 ===== */

/** 通知新增/编辑弹窗显示状态 */
const showNoticeModal = ref(false);
/** 当前编辑的通知（null 为新增） */
const editingNotice = ref<Api.System.SysNoticeVo | null>(null);

/** 打开新增通知弹窗 */
const handleNoticeCreate = () => {
  editingNotice.value = null;
  showNoticeModal.value = true;
};

/** 打开编辑通知弹窗 */
const handleNoticeEdit = (row: Api.System.SysNoticeVo) => {
  editingNotice.value = row;
  showNoticeModal.value = true;
};

/** 关闭弹窗后清空编辑对象 */
watch(showNoticeModal, (newVal) => {
  if (!newVal) {
    editingNotice.value = null;
  }
});

/** 打开通知删除确认弹窗 */
const handleNoticeDelete = (row: Api.System.SysNoticeVo) => {
  currentDeleteNotice.value = row;
  showNoticeDeleteModal.value = true;
};

/** 确认删除通知 */
const handleConfirmNoticeDelete = async () => {
  if (!currentDeleteNotice.value) return;
  noticeDeleteLoading.value = true;
  try {
    const { error } = await fetchRemoveNotice(String(currentDeleteNotice.value.id));
    if (error) {
      window.$message?.error(error.message || $t('updateLog.deleteFailed'));
      return;
    }
    window.$message?.success($t('updateLog.deleteSuccess'));
    showNoticeDeleteModal.value = false;
    currentDeleteNotice.value = null;
    loadNoticeData();
  } finally {
    noticeDeleteLoading.value = false;
  }
};

/** 关闭通知删除确认弹窗 */
const handleCloseNoticeDeleteModal = () => {
  showNoticeDeleteModal.value = false;
  currentDeleteNotice.value = null;
};

const formatDateTime = (dateStr: string): string => {
  return dayjs(dateStr).format($t('updateLog.dateFormat'));
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
    window.$message?.error($t('updateLog.loadFailed'));
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
      window.$message?.error(error.message || $t('updateLog.deleteFailed'));
      return;
    }
    window.$message?.success($t('updateLog.deleteSuccess'));
    showDeleteModal.value = false;
    currentDeleteLog.value = null;
    handleSuccess();
  } catch (error) {
    console.error('删除更新日志失败:', error);
    window.$message?.error($t('updateLog.deleteFailed'));
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
              <h1 class="page-title">{{ viewMode === 'log' ? $t('updateLog.title') : $t('updateLog.noticeView') }}</h1>
              <span class="page-subtitle">{{ viewMode === 'log' ? $t('updateLog.subtitle') : $t('updateLog.noticeSubtitle') }}</span>
            </div>
          </div>
          <div class="header-right">
            <div class="view-switcher">
              <button class="switch-btn" :class="{ active: viewMode === 'log' }" @click="handleSwitchView('log')">
                <SvgIcon icon="mdi:update" class="switch-icon" />
                <span>{{ $t('updateLog.title') }}</span>
              </button>
              <button v-if="isAdmin" class="switch-btn" :class="{ active: viewMode === 'notice' }"
                @click="handleSwitchView('notice')">
                <SvgIcon icon="mdi:bell-outline" class="switch-icon" />
                <span>{{ $t('updateLog.noticeView') }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 更新日志视图（底部含添加栏，参照通知视图） -->
      <div v-if="viewMode === 'log'" class="log-view-container">
        <!-- 更新日志列表 -->
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
                <button class="icon-btn ghost" :title="$t('updateLog.edit')" @click="openEditModal(log)">
                  <SvgIcon icon="mdi:pencil" />
                </button>
                <button class="icon-btn ghost danger" :title="$t('updateLog.delete')" @click="handleDelete(log)">
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
              <span v-if="index === 0" class="meta-tag latest">{{ $t('updateLog.latest') }}</span>
            </div>

            <div class="log-card-body" v-if="log.content">
              <!-- 使用 CommonMdEditor 内置样式（preview-only 只读预览） -->
              <CommonMdEditor preview-only :model-value="log.content" />
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

        <!-- 底部添加栏（参照通知视图：操作区域放到底部） -->
        <div v-if="canAddUpdateLog" class="log-add-bar">
          <button class="log-add-btn" @click="addModalVisible = true">
            <SvgIcon icon="mdi:plus" />
            <span>{{ $t('updateLog.addNewLog') }}</span>
          </button>
        </div>
      </div>

      <!-- 通知日志视图（参考 roleManage：搜索 + 卡片网格 + 分页） -->
      <div v-else class="notice-manage-container">
        <!-- 搜索栏 -->
        <div class="notice-search-bar">
          <div class="notice-search-box">
            <SvgIcon icon="mdi:magnify" class="notice-search-icon" />
            <NInput v-model:value="noticePagination.title" :placeholder="$t('updateLog.noticeSearchPlaceholder')"
              clearable size="small" @keyup.enter="handleNoticeSearch" @clear="handleNoticeSearch" />
          </div>
          <button class="notice-search-btn" @click="handleNoticeSearch">
            <SvgIcon icon="mdi:magnify" />
            <span>{{ $t('updateLog.noticeSearch') }}</span>
          </button>
        </div>

        <!-- 通知卡片列表 -->
        <div class="notice-card-list">
          <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="(item, index) in noticeList" :key="item.id" span="3 s:2 m:1 l:1">
              <div class="notice-card" :class="{ offline: item.status === 2 }"
                :style="{ '--delay': `${index * 0.04}s` }">
                <div class="notice-card-header">
                  <div class="notice-card-title-row">
                    <SvgIcon icon="mdi:bell-outline" class="notice-card-icon" />
                    <span class="notice-card-title" :title="item.title">{{ item.title }}</span>
                  </div>
                  <div class="notice-card-badges">
                    <span class="notice-type-tag" :class="{ personal: item.noticeType === 2 }">
                      {{ getNoticeTypeText(item.noticeType) }}
                    </span>
                    <span v-if="item.priority && item.priority > 0" class="notice-priority-tag"
                      :style="{ color: priorityInfo(item.priority).color, borderColor: priorityInfo(item.priority).color }">
                      {{ priorityInfo(item.priority).label }}
                    </span>
                  </div>
                </div>

                <p class="notice-card-content" :title="item.content">{{ item.content }}</p>

                <div class="notice-card-footer">
                  <div class="notice-card-meta">
                    <span class="notice-status-tag" :class="`status-${item.status ?? 1}`">
                      {{ getNoticeStatusText(item.status) }}
                    </span>
                    <span class="notice-time">
                      <SvgIcon icon="mdi:clock-outline" class="notice-time-icon" />
                      {{ formatDateTime(item.createTime) }}
                    </span>
                  </div>
                  <div v-if="canAddUpdateLog" class="notice-card-actions">
                    <button class="footer-action-btn edit" :title="$t('updateLog.noticeEdit')"
                      @click="handleNoticeEdit(item)">
                      <SvgIcon icon="mdi:pencil" />
                    </button>
                    <button class="footer-action-btn delete"
                      :title="$t('updateLog.delete')" @click="handleNoticeDelete(item)">
                      <SvgIcon icon="mdi:delete" />
                    </button>
                  </div>
                </div>
              </div>
            </NGridItem>

            <!-- 骨架屏 -->
            <NGridItem v-if="noticeLoading" v-for="i in 6" :key="`notice-skeleton-${i}`" span="3 s:2 m:1 l:1">
              <div class="notice-card skeleton">
                <div class="skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </NGridItem>
          </NGrid>

          <!-- 空状态 -->
          <div v-if="!noticeLoading && noticeList.length === 0" class="notice-empty-state">
            <SvgIcon icon="mdi:bell-outline" class="notice-empty-icon" />
            <p>{{ $t('updateLog.noNotices') }}</p>
          </div>
        </div>

        <!-- 通知分页 -->
        <div v-if="noticePagination.total > 0" class="notice-pagination-bar">
          <NPagination v-model:value="noticePagination.current" :total="noticePagination.total"
            :page-size="noticePagination.size" @update-page="handleNoticePageChange" />
        </div>

        <!-- 底部添加栏（与更新日志视图保持一致） -->
        <div v-if="canAddUpdateLog" class="log-add-bar">
          <button class="log-add-btn" @click="handleNoticeCreate">
            <SvgIcon icon="mdi:plus" />
            <span>{{ $t('updateLog.noticeAdd') }}</span>
          </button>
        </div>
      </div>
    </NCard>
  </NCard>

  <AddLogModal v-model:showAddLogModal="addModalVisible" @success="handleSuccess" />
  <UpdateLogModal v-model:showUpdateLogModal="editModalVisible" :edit-log="editingLog" @success="handleSuccess" />
  <NoticeEditModal v-model:showNoticeModal="showNoticeModal" :edit-notice="editingNotice" @success="loadNoticeData" />

  <!-- 删除确认弹窗 -->
  <NModal v-model:show="showDeleteModal" preset="card" class="delete-modal rounded-16px w-360px"
    :bordered="false" size="small" :closable="false">
    <template #header>
      <div class="delete-modal-header">
        <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
        <span>{{ $t('updateLog.deleteConfirm') }}</span>
      </div>
    </template>
    <div class="delete-modal-body">
      <p class="delete-modal-text">
        {{ $t('updateLog.deleteConfirmPrefix') }}
        <span class="delete-modal-target">{{ currentDeleteLog?.title }}</span>
        {{ $t('updateLog.deleteConfirmSuffix') }}
      </p>
      <p class="delete-modal-tip">{{ $t('updateLog.deleteConfirmTip') }}</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="handleCloseDeleteModal">{{ $t('common.cancel') }}</button>
      <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
        <SvgIcon icon="mdi:delete" />
        <span>{{ deleteLoading ? $t('updateLog.deleting') : $t('updateLog.delete') }}</span>
      </button>
    </div>
  </NModal>

  <!-- 通知删除确认弹窗 -->
  <NModal v-model:show="showNoticeDeleteModal" preset="card" class="delete-modal rounded-16px w-360px"
    :bordered="false" size="small" :closable="false">
    <template #header>
      <div class="delete-modal-header">
        <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
        <span>{{ $t('updateLog.deleteConfirm') }}</span>
      </div>
    </template>
    <div class="delete-modal-body">
      <p class="delete-modal-text">
        {{ $t('updateLog.noticeDeleteConfirmPrefix') }}
        <span class="delete-modal-target">{{ currentDeleteNotice?.title }}</span>
        {{ $t('updateLog.noticeDeleteConfirmSuffix') }}
      </p>
      <p class="delete-modal-tip">{{ $t('updateLog.noticeDeleteConfirmTip') }}</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="handleCloseNoticeDeleteModal">{{ $t('common.cancel') }}</button>
      <button class="action-btn danger" :disabled="noticeDeleteLoading" @click="handleConfirmNoticeDelete">
        <SvgIcon icon="mdi:delete" />
        <span>{{ noticeDeleteLoading ? $t('updateLog.deleting') : $t('updateLog.delete') }}</span>
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
        color: rgba(var(--app-rgb), 0.92);
      }

      .page-subtitle {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.45);
      }
    }
  }

  /* 右侧：视图切换 + 操作按钮（参考 roleManage view-switcher） */
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;

    .view-switcher {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
      border-radius: 10px;
      background: rgba(var(--app-rgb), 0.04);
      border: 1px solid rgba(var(--app-rgb), 0.07);

      .switch-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 14px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 500;
        color: rgba(var(--app-rgb), 0.55);
        background: transparent;
        transition: all 0.25s ease;

        .switch-icon {
          font-size: 15px;
        }

        &:hover {
          color: rgba(var(--app-rgb), 0.85);
        }

        &.active {
          color: #667eea;
          background: rgba(102, 126, 234, 0.15);
        }
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
  border: 1px solid rgba(var(--app-rgb), 0.08);
  background: rgba(var(--app-rgb), 0.04);
  color: rgba(var(--app-rgb), 0.7);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--app-rgb), 0.08);
    color: rgba(var(--app-rgb), 0.9);
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

/* 更新日志视图容器（列表 + 底部添加栏） */
.log-view-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 16px 16px;
}

/* 底部添加栏（参照通知视图：操作区域放到底部） */
.log-add-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 0 16px 16px;
}

.log-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 20px;
  border: 1px dashed rgba(102, 126, 234, 0.4);
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(102, 126, 234, 0.16);
    border-style: solid;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: rgba(var(--app-rgb), 0.4);

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
    background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
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
  background: rgba(var(--app-rgb), 0.03);
  border: 1px solid rgba(var(--app-rgb), 0.06);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  // 进入动画：错落淡入上浮（与工具箱卡片一致）
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;

  &:hover {
    background: rgba(var(--app-rgb), 0.05);
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
      color: rgba(var(--app-rgb), 0.9);
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
    color: rgba(var(--app-rgb), 0.55);
    background: rgba(var(--app-rgb), 0.05);
    border: 1px solid rgba(var(--app-rgb), 0.06);

    svg {
      font-size: 13px;
    }

    &.version {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      border-color: rgba(102, 126, 234, 0.18);
    }

    &.date {
      color: rgba(var(--app-rgb), 0.5);
    }

    &.latest {
      color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.18);
    }
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
      color: rgba(var(--app-rgb), 0.85);

      .delete-modal-target {
        font-weight: 600;
        color: #f5576c;
      }
    }

    .delete-modal-tip {
      margin: 0;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.5);
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
      border: 1px solid rgba(var(--app-rgb), 0.08);
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      background: rgba(var(--app-rgb), 0.06);
      color: rgba(var(--app-rgb), 0.8);

      &:hover {
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      &.cancel:hover {
        background: rgba(var(--app-rgb), 0.12);
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
  color: rgba(var(--app-rgb), 0.35);

  &::before,
  &::after {
    content: '';
    width: 40px;
    height: 1px;
    background: currentColor;
    opacity: 0.5;
  }
}

/* ==================== 通知日志视图（参考 roleManage 卡片网格） ==================== */
.notice-manage-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 25px;
  box-sizing: border-box;

  /* 搜索栏 */
  .notice-search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .notice-search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 300px;
      height: 36px;
      padding: 0 12px 0 36px;
      border-radius: 10px;
      background: rgba(var(--app-rgb), 0.05);
      border: 1px solid rgba(var(--app-rgb), 0.08);
      transition: all 0.25s ease;

      &:focus-within {
        border-color: rgba(102, 126, 234, 0.5);
        background: rgba(var(--app-rgb), 0.08);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .notice-search-icon {
        position: absolute;
        left: 12px;
        font-size: 16px;
        color: rgba(var(--app-rgb), 0.4);
      }

      :deep(.n-input) {
        background: transparent;
        --n-border: none !important;
        --n-border-focus: none !important;
        --n-border-hover: none !important;
        --n-box-shadow-focus: none !important;

        .n-input__input-el {
          color: rgba(var(--app-rgb), 0.9);
          font-size: 13px;
        }

        .n-input__placeholder {
          color: rgba(var(--app-rgb), 0.35);
        }
      }
    }

    .notice-search-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 36px;
      padding: 0 16px;
      border: 1px solid rgba(102, 126, 234, 0.25);
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #667eea;
      background: rgba(102, 126, 234, 0.12);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(102, 126, 234, 0.22);
      }
    }
  }

  /* 卡片列表 */
  .notice-card-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 2px;

    .n-grid {
      width: 100%;
    }
  }

  /* 通知卡片 */
  .notice-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 16px;
    border-radius: 14px;
    background: rgba(var(--app-rgb), 0.04);
    border: 1px solid rgba(var(--app-rgb), 0.07);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: cardIn 0.45s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
    box-sizing: border-box;

    &:hover {
      transform: translateY(-4px);
      background: rgba(var(--app-rgb), 0.07);
      border-color: rgba(102, 126, 234, 0.35);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    }

    &.offline {
      border-color: rgba(245, 87, 108, 0.2);
      opacity: 0.85;

      &:hover {
        border-color: rgba(245, 87, 108, 0.4);
      }
    }

    .notice-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      .notice-card-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        .notice-card-icon {
          font-size: 16px;
          color: #667eea;
          flex-shrink: 0;
        }

        .notice-card-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--n-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .notice-card-badges {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;

        .notice-type-tag {
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.18);
          white-space: nowrap;

          &.personal {
            color: #43e97b;
            background: rgba(67, 233, 123, 0.1);
            border-color: rgba(67, 233, 123, 0.2);
          }
        }

        .notice-priority-tag {
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          border: 1px solid;
          white-space: nowrap;
        }
      }
    }

    .notice-card-content {
      flex: 1;
      margin: 0;
      font-size: 12.5px;
      line-height: 1.6;
      color: rgba(var(--app-rgb), 0.6);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .notice-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid rgba(var(--app-rgb), 0.06);

      .notice-card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        .notice-status-tag {
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          color: rgba(var(--app-rgb), 0.55);
          background: rgba(var(--app-rgb), 0.06);
          border: 1px solid rgba(var(--app-rgb), 0.08);
          white-space: nowrap;

          &.status-0 {
            color: #f0a020;
            background: rgba(240, 160, 32, 0.1);
            border-color: rgba(240, 160, 32, 0.2);
          }

          &.status-2 {
            color: #f5576c;
            background: rgba(245, 87, 108, 0.1);
            border-color: rgba(245, 87, 108, 0.2);
          }
        }

        .notice-time {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: rgba(var(--app-rgb), 0.4);

          .notice-time-icon {
            font-size: 13px;
          }
        }
      }

      /* 卡片操作按钮组（编辑 / 删除） */
      .notice-card-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .footer-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        color: rgba(var(--app-rgb), 0.5);
        background: rgba(var(--app-rgb), 0.06);
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
        }

        &.edit:hover {
          color: #667eea;
          background: rgba(102, 126, 234, 0.18);
        }

        &.delete:hover {
          color: #f5576c;
          background: rgba(245, 87, 108, 0.18);
        }
      }
    }
  }

  /* 骨架屏（与 roleManage 一致） */
  .skeleton {
    pointer-events: none;

    .skeleton-title,
    .skeleton-line {
      background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }

    .skeleton-title {
      height: 42px;
      width: 70%;
      border-radius: 12px;
    }

    .skeleton-line {
      height: 48px;
      width: 100%;

      &.short {
        height: 20px;
        width: 60%;
      }
    }
  }

  /* 空状态 */
  .notice-empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 80px 20px;
    color: rgba(var(--app-rgb), 0.5);

    .notice-empty-icon {
      font-size: 56px;
      opacity: 0.4;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  /* 分页 */
  .notice-pagination-bar {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
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

  .finished-indicator {
    color: rgba(0, 0, 0, 0.35);
  }
}
</style>
