<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NInput, NModal, NPagination, NSwitch } from 'naive-ui';
import dayjs from 'dayjs';
import {
  fetchGetMonSchedulerPageList,
  fetchSaveMonScheduler,
  fetchUpdateMonScheduler,
  fetchRemoveMonScheduler,
  fetchRunMonSchedulerOnce,
  fetchPauseMonScheduler,
  fetchResumeMonScheduler,
  fetchChangeMonSchedulerStatus
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useDict } from '@/hooks/business/dict';

defineOptions({ name: 'SchedulerManage' });

/** 字典：调度任务状态(0:停止,1:启动) / 运行状态(NONE/NORMAL/PAUSED/COMPLETE/ERROR/BLOCKED) */
const { dictLabel } = useDict();

/** 调度任务分页与查询条件 */
const schedulerPagination = reactive({
  current: 1,
  size: 10,
  total: 0,
  jobName: '',
  jobGroup: ''
});

const loading = ref(false);
const list = ref<Record<string, any>[]>([]);

/** 调度任务：启用状态为 '1' */
const isSchedulerEnabled = (status: unknown) => String(status ?? '') === '1';

/** 调度任务：是否处于暂停状态 */
const isSchedulerPaused = (state: unknown) => String(state ?? '') === 'PAUSED';

/** 加载当前页数据 */
const loadData = async () => {
  loading.value = true;
  try {
    const { data, error } = await fetchGetMonSchedulerPageList({
      jobName: schedulerPagination.jobName || undefined,
      jobGroup: schedulerPagination.jobGroup || undefined,
      current: schedulerPagination.current,
      size: schedulerPagination.size
    });
    if (!error && data) {
      list.value = (data.records || []) as unknown as Record<string, any>[];
      schedulerPagination.total = data.total || 0;
    }
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  schedulerPagination.current = 1;
  loadData();
};

const handleReset = () => {
  schedulerPagination.jobName = '';
  schedulerPagination.jobGroup = '';
  schedulerPagination.current = 1;
  loadData();
};

const handlePageChange = (page: number) => {
  schedulerPagination.current = page;
  loadData();
};

/* ==================== 调度任务表单弹窗 ==================== */

const showSchedulerModal = ref(false);
const schedulerSaving = ref(false);
const isEditScheduler = ref(false);
const schedulerForm = reactive<Api.Monitor.MonSchedulerEditParams>({});

/** 启用状态开关（将空值归零以适配 NSwitch） */
const schedulerStatus = computed({
  get: () => (schedulerForm.status ?? 0) as 0 | 1,
  set: val => {
    schedulerForm.status = Number(val) as 0 | 1;
  }
});

/** 清空表单字段 */
const resetSchedulerForm = () => {
  Object.keys(schedulerForm).forEach(key => delete (schedulerForm as Record<string, unknown>)[key]);
};

/** 打开新增弹窗 */
const openAddScheduler = () => {
  isEditScheduler.value = false;
  resetSchedulerForm();
  schedulerForm.status = 1;
  showSchedulerModal.value = true;
};

/** 打开编辑弹窗 */
const openEditScheduler = (row: Record<string, unknown>) => {
  isEditScheduler.value = true;
  resetSchedulerForm();
  const form = schedulerForm as Record<string, unknown>;
  ['jobName', 'jobGroup', 'triggerName', 'triggerGroup', 'jobData', 'triggerData', 'cron', 'jobClassName'].forEach(key => {
    form[key] = row[key] ?? '';
  });
  form.id = Number(row.id);
  form.status = isSchedulerEnabled(row.status) ? 1 : 0;
  showSchedulerModal.value = true;
};

const handleCloseSchedulerModal = () => {
  showSchedulerModal.value = false;
};

/** 保存（新增/修改）调度任务 */
const handleSchedulerSave = async () => {
  const form = schedulerForm as Record<string, unknown>;
  if (!form.jobName) {
    window.$message?.warning($t('logManage.scheduler.formRequired.jobName'));
    return;
  }
  if (!form.cron) {
    window.$message?.warning($t('logManage.scheduler.formRequired.cron'));
    return;
  }
  if (!form.jobClassName) {
    window.$message?.warning($t('logManage.scheduler.formRequired.jobClassName'));
    return;
  }
  schedulerSaving.value = true;
  try {
    const { error } = isEditScheduler.value
      ? await fetchUpdateMonScheduler({ ...schedulerForm })
      : await fetchSaveMonScheduler({ ...schedulerForm });
    if (error) {
      window.$message?.error(
        error.message || (isEditScheduler.value ? $t('logManage.scheduler.messages.updateFailed') : $t('logManage.scheduler.messages.saveFailed'))
      );
      return;
    }
    window.$message?.success(isEditScheduler.value ? $t('logManage.scheduler.messages.updateSuccess') : $t('logManage.scheduler.messages.saveSuccess'));
    showSchedulerModal.value = false;
    loadData();
  } finally {
    schedulerSaving.value = false;
  }
};

/* ==================== 调度任务行操作 ==================== */

/** 立即执行一次 */
const handleSchedulerRunOnce = async (row: Record<string, unknown>) => {
  const { error } = await fetchRunMonSchedulerOnce(Number(row.id));
  if (error) {
    window.$message?.error(error.message || $t('logManage.scheduler.messages.runOnceFailed'));
    return;
  }
  window.$message?.success($t('logManage.scheduler.messages.runOnceSuccess'));
};

/** 暂停 / 恢复 */
const handleSchedulerPauseResume = async (row: Record<string, unknown>) => {
  const paused = isSchedulerPaused(row.triggerState);
  const { error } = paused ? await fetchResumeMonScheduler(Number(row.id)) : await fetchPauseMonScheduler(Number(row.id));
  if (error) {
    window.$message?.error(error.message || (paused ? $t('logManage.scheduler.messages.resumeFailed') : $t('logManage.scheduler.messages.pauseFailed')));
    return;
  }
  window.$message?.success(paused ? $t('logManage.scheduler.messages.resumeSuccess') : $t('logManage.scheduler.messages.pauseSuccess'));
  loadData();
};

/** 启用 / 停用 */
const handleSchedulerChangeStatus = async (row: Record<string, unknown>) => {
  const enabled = isSchedulerEnabled(row.status);
  const { error } = await fetchChangeMonSchedulerStatus(Number(row.id), enabled ? 0 : 1);
  if (error) {
    window.$message?.error(error.message || $t('logManage.scheduler.messages.changeStatusFailed'));
    return;
  }
  window.$message?.success($t('logManage.scheduler.messages.changeStatusSuccess'));
  loadData();
};

/* ==================== 删除确认 ==================== */

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const currentDeleteId = ref<number | null>(null);
/** 删除目标展示文本：调度任务显示任务名称 */
const deleteTarget = ref('');

/** 打开删除确认弹窗 */
const handleSchedulerDelete = (row: Record<string, unknown>) => {
  currentDeleteId.value = Number(row.id);
  deleteTarget.value = String(row.jobName || row.id || '');
  showDeleteModal.value = true;
};

/** 确认删除（仅调度任务） */
const handleConfirmDelete = async () => {
  if (!currentDeleteId.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchRemoveMonScheduler(currentDeleteId.value);
    if (error) {
      window.$message?.error(error.message || $t('logManage.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('logManage.messages.deleteSuccess'));
    showDeleteModal.value = false;
    currentDeleteId.value = null;
    loadData();
  } finally {
    deleteLoading.value = false;
  }
};

const handleCloseDeleteModal = () => {
  showDeleteModal.value = false;
  currentDeleteId.value = null;
};

onMounted(loadData);
</script>

<template>
  <!-- 调度任务搜索栏 -->
  <div class="search-bar">
    <div class="search-box">
      <SvgIcon icon="mdi:account-search" class="search-icon" />
      <NInput v-model:value="schedulerPagination.jobName"
        :placeholder="$t('logManage.scheduler.search.jobNamePlaceholder')" clearable size="small" />
    </div>
    <div class="search-box">
      <SvgIcon icon="mdi:shape-outline" class="search-icon" />
      <NInput v-model:value="schedulerPagination.jobGroup"
        :placeholder="$t('logManage.scheduler.search.jobGroupPlaceholder')" clearable size="small" />
    </div>
    <button class="search-btn" @click="handleSearch">
      <SvgIcon icon="mdi:magnify" />
      <span>{{ $t('logManage.search.btn') }}</span>
    </button>
    <button class="search-btn reset" @click="handleReset">
      <SvgIcon icon="mdi:refresh" />
      <span>{{ $t('logManage.search.reset') }}</span>
    </button>
    <button class="icon-btn primary add-group-btn" @click="openAddScheduler">
      <SvgIcon icon="mdi:plus" />
      <span>{{ $t('logManage.scheduler.add') }}</span>
    </button>
  </div>

  <!-- 调度任务表格 -->
  <div class="log-table">
    <div class="log-table-header scheduler">
      <span class="s-col-name">{{ $t('logManage.scheduler.table.jobName') }}</span>
      <span class="s-col-group">{{ $t('logManage.scheduler.table.jobGroup') }}</span>
      <span class="s-col-trigger">{{ $t('logManage.scheduler.table.triggerName') }}</span>
      <span class="s-col-cron">{{ $t('logManage.scheduler.table.cron') }}</span>
      <span class="s-col-state">{{ $t('logManage.scheduler.table.triggerState') }}</span>
      <span class="s-col-status">{{ $t('logManage.scheduler.table.status') }}</span>
      <span class="s-col-next">{{ $t('logManage.scheduler.table.nextFireTime') }}</span>
      <span class="s-col-actions">{{ $t('logManage.scheduler.table.actions') }}</span>
    </div>
    <div class="log-table-body">
      <div v-for="row in list" :key="row.id" class="log-row scheduler">
        <span class="s-col-name cell-text" :title="row.jobName">{{ row.jobName || '-' }}</span>
        <span class="s-col-group cell-text" :title="row.jobGroup">{{ row.jobGroup || '-' }}</span>
        <span class="s-col-trigger cell-text" :title="row.triggerName">{{ row.triggerName || '-' }}</span>
        <span class="s-col-cron cell-text" :title="row.cron">{{ row.cron || '-' }}</span>
        <span class="s-col-state">
          <span class="state-badge" :class="String(row.triggerState || '').toLowerCase()">
            {{ dictLabel('mon_scheduler_trigger_state', String(row.triggerState ?? '')) || row.triggerState || '-' }}
          </span>
        </span>
        <span class="s-col-status">
          <span class="status-badge" :class="{ success: isSchedulerEnabled(row.status) }">
            <span class="dot" />
            {{ dictLabel('mon_scheduler_status', String(row.status ?? '')) || '-' }}
          </span>
        </span>
        <span class="s-col-next">{{ row.nextFireTime ? dayjs(String(row.nextFireTime)).format('YYYY-MM-DD HH:mm:ss') : '-' }}</span>
        <span class="s-col-actions">
          <button class="act-btn edit" :title="$t('logManage.scheduler.edit')" @click="openEditScheduler(row)">
            <SvgIcon icon="mdi:pencil" />
          </button>
          <button class="act-btn run" :title="$t('logManage.scheduler.runOnce')" @click="handleSchedulerRunOnce(row)">
            <SvgIcon icon="mdi:play" />
          </button>
          <button class="act-btn pause"
            :title="isSchedulerPaused(row.triggerState) ? $t('logManage.scheduler.resume') : $t('logManage.scheduler.pause')"
            @click="handleSchedulerPauseResume(row)">
            <SvgIcon :icon="isSchedulerPaused(row.triggerState) ? 'mdi:play' : 'mdi:pause'" />
          </button>
          <button class="act-btn power"
            :title="isSchedulerEnabled(row.status) ? $t('logManage.scheduler.disable') : $t('logManage.scheduler.enable')"
            @click="handleSchedulerChangeStatus(row)">
            <SvgIcon icon="mdi:power" />
          </button>
          <button class="act-btn delete" :title="$t('logManage.delete')" @click="handleSchedulerDelete(row)">
            <SvgIcon icon="mdi:delete" />
          </button>
        </span>
      </div>

      <!-- 加载骨架 -->
      <template v-if="loading">
        <div v-for="i in 6" :key="`scheduler-skeleton-${i}`" class="log-row skeleton-row">
          <span v-for="j in 8" :key="j" class="skeleton-cell" />
        </div>
      </template>

      <!-- 空状态 -->
      <div v-if="!loading && list.length === 0" class="log-empty">
        <SvgIcon icon="mdi:timeline-clock" class="empty-icon" />
        <p>{{ $t('logManage.scheduler.empty') }}</p>
      </div>
    </div>
  </div>

  <!-- 分页 -->
  <div v-if="schedulerPagination.total > 0" class="pagination-bar">
    <NPagination v-model:page="schedulerPagination.current" :item-count="schedulerPagination.total"
      :page-size="schedulerPagination.size" @update-page="handlePageChange" />
  </div>

  <!-- 删除确认弹窗 -->
  <NModal v-model:show="showDeleteModal" preset="card" class="delete-modal rounded-16px w-400px" :bordered="false"
    size="small" :closable="false">
    <template #header>
      <div class="delete-modal-header">
        <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
        <span>{{ $t('logManage.deleteModal.title') }}</span>
      </div>
    </template>
    <div class="delete-modal-body">
      <p class="delete-modal-text">
        {{ $t('logManage.scheduler.deleteModal.confirmPrefix') }}
        <span class="delete-modal-target">{{ deleteTarget }}</span>
        {{ $t('logManage.scheduler.deleteModal.confirmSuffix') }}
      </p>
      <p class="delete-modal-tip">{{ $t('logManage.scheduler.deleteModal.tip') }}</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="handleCloseDeleteModal">{{ $t('common.cancel') }}</button>
      <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
        <SvgIcon icon="mdi:delete" />
        <span>{{ deleteLoading ? $t('logManage.deleting') : $t('logManage.delete') }}</span>
      </button>
    </div>
  </NModal>

  <!-- 调度任务新增/编辑弹窗 -->
  <NModal v-model:show="showSchedulerModal" preset="card" class="scheduler-modal rounded-16px w-520px" :bordered="false"
    size="small" :closable="false">
    <template #header>
      <div class="modal-header">
        <SvgIcon :icon="isEditScheduler ? 'mdi:pencil' : 'mdi:plus'" class="modal-header-icon" />
        <span>{{ isEditScheduler ? $t('logManage.scheduler.edit') : $t('logManage.scheduler.add') }}</span>
      </div>
    </template>
    <div class="modal-form">
      <div class="form-item">
        <label class="form-label required">{{ $t('logManage.scheduler.form.jobName') }}</label>
        <NInput v-model:value="schedulerForm.jobName" :placeholder="$t('logManage.scheduler.formPlaceholder.jobName')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('logManage.scheduler.form.jobGroup') }}</label>
        <NInput v-model:value="schedulerForm.jobGroup" :placeholder="$t('logManage.scheduler.formPlaceholder.jobGroup')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('logManage.scheduler.form.triggerName') }}</label>
        <NInput v-model:value="schedulerForm.triggerName" :placeholder="$t('logManage.scheduler.formPlaceholder.triggerName')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('logManage.scheduler.form.triggerGroup') }}</label>
        <NInput v-model:value="schedulerForm.triggerGroup" :placeholder="$t('logManage.scheduler.formPlaceholder.triggerGroup')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label required">{{ $t('logManage.scheduler.form.cron') }}</label>
        <NInput v-model:value="schedulerForm.cron" :placeholder="$t('logManage.scheduler.formPlaceholder.cron')" size="small" />
        <div class="form-hint">
          <SvgIcon icon="mdi:clock-outline" class="form-hint-icon" />
          <span>{{ $t('logManage.scheduler.formHint.cron') }}</span>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label required">{{ $t('logManage.scheduler.form.jobClassName') }}</label>
        <NInput v-model:value="schedulerForm.jobClassName" :placeholder="$t('logManage.scheduler.formPlaceholder.jobClassName')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('logManage.scheduler.form.jobData') }}</label>
        <NInput v-model:value="schedulerForm.jobData" :placeholder="$t('logManage.scheduler.formPlaceholder.jobData')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('logManage.scheduler.form.triggerData') }}</label>
        <NInput v-model:value="schedulerForm.triggerData" :placeholder="$t('logManage.scheduler.formPlaceholder.triggerData')" size="small" />
      </div>
      <div class="form-item">
        <label class="form-label">{{ $t('logManage.scheduler.form.status') }}</label>
        <div class="switch-wrap">
          <NSwitch v-model:value="schedulerStatus" :checked-value="1" :unchecked-value="0" />
          <span class="switch-text">{{ schedulerForm.status === 1 ? $t('logManage.scheduler.enabled') : $t('logManage.scheduler.disabled') }}</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-btn cancel" @click="handleCloseSchedulerModal">{{ $t('common.cancel') }}</button>
        <button class="action-btn confirm" :disabled="schedulerSaving" @click="handleSchedulerSave">
          <SvgIcon :icon="isEditScheduler ? 'mdi:pencil' : 'mdi:plus'" />
          <span>{{ schedulerSaving ? $t('logManage.scheduler.saving') : $t('logManage.scheduler.save') }}</span>
        </button>
      </div>
    </div>
  </NModal>
</template>

<style lang="scss" scoped>
/* ============================================================
   logManage 日志/调度模块样式（内联，scoped 生效）
   注意：类名与其它页面可能有同名，务必保持 scoped，勿改为全局
   ============================================================ */

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
    width: 220px;
    height: 34px;
    padding: 0 10px 0 34px;
    border-radius: 9px;
    background: rgba(var(--app-rgb), 0.05);
    border: 1px solid rgba(var(--app-rgb), 0.08);
    transition: all 0.25s ease;

    &:focus-within {
      border-color: rgba(102, 126, 234, 0.5);
      background: rgba(var(--app-rgb), 0.08);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .search-icon {
      position: absolute;
      left: 11px;
      font-size: 15px;
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
        font-size: 12.5px;
      }

      .n-input__placeholder {
        color: rgba(var(--app-rgb), 0.35);
      }
    }
  }

  .search-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 500;
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);
    border: 1px solid rgba(102, 126, 234, 0.25);
    transition: all 0.2s ease;

    &:hover {
      background: rgba(102, 126, 234, 0.22);
    }

    &.reset {
      color: rgba(var(--app-rgb), 0.7);
      background: rgba(var(--app-rgb), 0.06);
      border-color: rgba(var(--app-rgb), 0.1);

      &:hover {
        color: rgba(var(--app-rgb), 0.9);
        background: rgba(var(--app-rgb), 0.12);
      }
    }

    &.danger {
      color: #f5576c;
      background: rgba(245, 87, 108, 0.1);
      border-color: rgba(245, 87, 108, 0.25);

      &:hover {
        background: rgba(245, 87, 108, 0.2);
      }
    }
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(var(--app-rgb), 0.08);
    background: rgba(var(--app-rgb), 0.05);
    color: rgba(var(--app-rgb), 0.75);
    cursor: pointer;
    font-size: 18px;
    transition: all 0.25s ease;

    &:hover {
      background: rgba(var(--app-rgb), 0.1);
      transform: translateY(-2px);
    }

    &.primary {
      color: #667eea;
      background: rgba(102, 126, 234, 0.12);
      border-color: rgba(102, 126, 234, 0.25);

      &:hover {
        background: rgba(102, 126, 234, 0.22);
      }
    }
  }

  .add-group-btn {
    width: auto;
    padding: 0 14px;
    gap: 6px;
    font-size: 13px;
    white-space: nowrap;

    span {
      font-weight: 500;
      line-height: 1;
    }
  }
}

/* ===== 日志表格 ===== */
.log-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid rgba(var(--app-rgb), 0.08);
  overflow-x: auto;

  .log-table-header {
    display: grid;
    grid-template-columns: minmax(160px, 1.4fr) 80px minmax(180px, 1.6fr) 110px 120px 80px 150px 84px;
    gap: 8px;
    align-items: center;
    padding: 10px 14px;
    background: rgba(var(--app-rgb), 0.05);
    border-bottom: 1px solid rgba(var(--app-rgb), 0.08);
    font-size: 12px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.55);
    flex-shrink: 0;

    &.login {
      grid-template-columns: 130px 90px 120px 120px minmax(160px, 1fr) 150px 84px;
    }

    &.error {
      grid-template-columns: minmax(140px, 1.2fr) minmax(160px, 1.4fr) 160px 70px 110px 150px 84px;
    }

    &.scheduler {
      grid-template-columns: minmax(110px, 1.1fr) minmax(80px, 1fr) minmax(90px, 1fr) minmax(130px, 1.5fr) 90px 80px 140px 190px;
    }
  }

  .log-table-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    .log-row {
      display: grid;
      grid-template-columns: minmax(160px, 1.4fr) 80px minmax(180px, 1.6fr) 110px 120px 80px 150px 84px;
      gap: 8px;
      align-items: center;
      padding: 9px 14px;
      border-bottom: 1px solid rgba(var(--app-rgb), 0.05);
      transition: background 0.2s ease;

      &:hover {
        background: rgba(var(--app-rgb), 0.04);
      }

      &.login {
        grid-template-columns: 130px 90px 120px 120px minmax(160px, 1fr) 150px 84px;
      }

      &.error {
        grid-template-columns: minmax(140px, 1.2fr) minmax(160px, 1.4fr) 160px 70px 110px 150px 84px;
      }

      &.file {
        grid-template-columns: minmax(90px, 0.8fr) minmax(100px, 1fr) minmax(180px, 1.8fr) 90px 100px 150px 84px;
      }

      &.scheduler {
        grid-template-columns: minmax(110px, 1.1fr) minmax(80px, 1fr) minmax(90px, 1fr) minmax(130px, 1.5fr) 90px 80px 140px 190px;
      }

      /* 文件日志：路径列（缩略图 + 文本） */
      .f-col-url {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        .file-thumb {
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(var(--app-rgb), 0.08);
        }

        .file-type-icon {
          flex-shrink: 0;
          font-size: 22px;
          color: rgba(var(--app-rgb), 0.4);
        }

        .cell-text {
          flex: 1;
          min-width: 0;
        }
      }

      .cell-text {
        font-size: 12.5px;
        color: rgba(var(--app-rgb), 0.85);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .col-time {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.5);
        font-family: 'JetBrains Mono', Consolas, monospace;
      }

      .col-cost {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.65);
        font-family: 'JetBrains Mono', Consolas, monospace;
      }

      .col-line {
        font-size: 12.5px;
        color: rgba(var(--app-rgb), 0.65);
      }

      .method-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 500;
        color: #f5576c;
        background: rgba(245, 87, 108, 0.1);
        border: 1px solid rgba(245, 87, 108, 0.2);
        white-space: nowrap;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f5576c;
        }

        &.success {
          color: #43e97b;
          background: rgba(67, 233, 123, 0.1);
          border-color: rgba(67, 233, 123, 0.2);

          .dot {
            background: #43e97b;
            box-shadow: 0 0 4px rgba(67, 233, 123, 0.6);
          }
        }
      }

      .state-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        color: #8b93a7;
        background: rgba(139, 147, 167, 0.1);
        border: 1px solid rgba(139, 147, 167, 0.2);

        &.normal {
          color: #43e97b;
          background: rgba(67, 233, 123, 0.1);
          border-color: rgba(67, 233, 123, 0.2);
        }

        &.paused {
          color: #ffa325;
          background: rgba(255, 163, 37, 0.1);
          border-color: rgba(255, 163, 37, 0.2);
        }

        &.error {
          color: #f5576c;
          background: rgba(245, 87, 108, 0.1);
          border-color: rgba(245, 87, 108, 0.2);
        }

        &.blocked {
          color: #a78bfa;
          background: rgba(167, 139, 250, 0.1);
          border-color: rgba(167, 139, 250, 0.2);
        }

        &.complete {
          color: #36adff;
          background: rgba(54, 173, 255, 0.1);
          border-color: rgba(54, 173, 255, 0.2);
        }
      }

      .col-actions {
        display: flex;
        align-items: center;
        gap: 6px;

        .row-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          padding: 0;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          font-size: 14px;
          color: rgba(var(--app-rgb), 0.5);
          background: rgba(var(--app-rgb), 0.06);
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
          }

          &.view:hover {
            color: #667eea;
            background: rgba(102, 126, 234, 0.18);
          }

          &.delete:hover {
            color: #f5576c;
            background: rgba(245, 87, 108, 0.18);
          }

          &.run:hover {
            color: #43e97b;
            background: rgba(67, 233, 123, 0.18);
          }

          &.pause:hover {
            color: #ffa325;
            background: rgba(255, 163, 37, 0.18);
          }

          &.power:hover {
            color: #667eea;
            background: rgba(102, 126, 234, 0.18);
          }
        }
      }

      /* 调度任务行操作：语义色图标按钮 */
      .s-col-actions {
        display: flex;
        align-items: center;
        gap: 6px;

        .act-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 8px;
          border: 1px solid transparent;
          background: rgba(var(--app-rgb), 0.05);
          color: rgba(var(--app-rgb), 0.55);
          cursor: pointer;
          font-size: 15px;
          transition: all 0.2s ease;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          }

          &.edit {
            color: #667eea;
            background: rgba(102, 126, 234, 0.12);
            border-color: rgba(102, 126, 234, 0.25);

            &:hover {
              background: rgba(102, 126, 234, 0.22);
            }
          }

          &.run {
            color: #43e97b;
            background: rgba(67, 233, 123, 0.12);
            border-color: rgba(67, 233, 123, 0.25);

            &:hover {
              background: rgba(67, 233, 123, 0.22);
            }
          }

          &.pause {
            color: #ffa325;
            background: rgba(255, 163, 37, 0.12);
            border-color: rgba(255, 163, 37, 0.25);

            &:hover {
              background: rgba(255, 163, 37, 0.22);
            }
          }

          &.power {
            color: #a78bfa;
            background: rgba(167, 139, 250, 0.12);
            border-color: rgba(167, 139, 250, 0.25);

            &:hover {
              background: rgba(167, 139, 250, 0.22);
            }
          }

          &.delete {
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

    .skeleton-row {
      pointer-events: none;

      .skeleton-cell {
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
    }

    .log-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 80px 20px;
      color: rgba(var(--app-rgb), 0.5);

      .empty-icon {
        font-size: 48px;
        opacity: 0.4;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
    }
  }
}

.pagination-bar {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

/* ===== 详情弹窗 ===== */
.modal-header,
.delete-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);
}

.modal-header-icon {
  font-size: 18px;
  color: #667eea;
}

.delete-modal-icon {
  font-size: 20px;
  color: #f5576c;
}

.clear-modal-icon {
  font-size: 20px;
  color: #ffa325;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
  padding: 4px 0;

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(var(--app-rgb), 0.035);
    border: 1px solid rgba(var(--app-rgb), 0.06);
    transition: border-color 0.2s ease;

    &:hover {
      border-color: rgba(var(--app-rgb), 0.12);
    }

    &.full {
      grid-column: 1 / -1;
    }

    .detail-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.6px;
      color: rgba(var(--app-rgb), 0.45);

      &::before {
        content: '';
        width: 3px;
        height: 10px;
        border-radius: 2px;
        background: #667eea;
        opacity: 0.7;
      }
    }

    .detail-value {
      padding: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: rgba(var(--app-rgb), 0.88);
      word-break: break-all;
      white-space: pre-wrap;
      max-height: 120px;
      overflow-y: auto;

      &.mono {
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 12px;
      }
    }

    &.stack .detail-value {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      max-height: 200px;
      padding: 8px 10px;
      color: rgba(var(--app-rgb), 0.82);
      background: rgba(var(--app-rgb), 0.05);
      border: 1px solid rgba(var(--app-rgb), 0.08);
      border-radius: 6px;
    }

    .detail-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: rgba(var(--app-rgb), 0.6);
      background: rgba(var(--app-rgb), 0.06);

      .tag-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      &.success {
        color: #43e97b;
        background: rgba(67, 233, 123, 0.12);
      }

      &.danger {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.12);
      }

      &.m-GET {
        color: #43e97b;
        background: rgba(67, 233, 123, 0.12);
      }

      &.m-POST {
        color: #36adff;
        background: rgba(54, 173, 255, 0.12);
      }

      &.m-PUT {
        color: #ffa325;
        background: rgba(255, 163, 37, 0.12);
      }

      &.m-DELETE {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.12);
      }
    }
  }
}

/* ===== 删除 / 清空确认弹窗 ===== */
.delete-modal {
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
  }
}

/* 通用操作按钮 */
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

/* ===== 调度任务新增/编辑弹窗 ===== */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .form-label {
      font-size: 12.5px;
      font-weight: 600;
      color: rgba(var(--app-rgb), 0.75);

      &.required::before {
        content: '* ';
        color: #f5576c;
      }
    }

    .form-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.65);
      background: rgba(102, 126, 234, 0.06);
      border: 1px dashed rgba(102, 126, 234, 0.3);

      .form-hint-icon {
        font-size: 14px;
        color: #667eea;
        flex-shrink: 0;
      }
    }

    .switch-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 34px;

      .switch-text {
        font-size: 13px;
        color: rgba(var(--app-rgb), 0.6);
      }
    }
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;

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

      &.confirm {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.25);

        &:hover {
          background: rgba(102, 126, 234, 0.22);
        }
      }
    }
  }
}
</style>
