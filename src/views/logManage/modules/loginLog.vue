<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NModal, NPagination } from 'naive-ui';
import dayjs from 'dayjs';
import { fetchGetMonLogsLoginPageList, fetchRemoveMonLogsLogin, fetchClearMonLogsLogin } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useDict } from '@/hooks/business/dict';

defineOptions({ name: 'LoginLog' });

/** 清空确认弹窗中的日志类型名称（i18n key） */
const MODULE_LABEL_KEY = 'logManage.tabs.login';

const { dictLabel } = useDict();

/* ==================== 列表与分页 ==================== */

const loading = ref(false);
const list = ref<Record<string, any>[]>([]);
const pagination = reactive({ keyword: '', current: 1, size: 10, total: 0 });

/** 日期格式化 */
const formatDate = (date: unknown) => (date ? dayjs(String(date)).format('YYYY-MM-DD HH:mm:ss') : '-');

/** 登录状态：1 成功 / 0 失败 */
const isLoginSuccess = (status: unknown) => status === '1';

/** 加载当前页数据 */
const loadData = async () => {
  loading.value = true;
  try {
    const { data, error } = await fetchGetMonLogsLoginPageList({
      userName: pagination.keyword || null,
      current: pagination.current,
      size: pagination.size
    });
    if (!error && data) {
      list.value = (data.records || []) as unknown as Record<string, any>[];
      pagination.total = data.total || 0;
    }
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

const handleReset = () => {
  pagination.keyword = '';
  pagination.current = 1;
  loadData();
};

const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/* ==================== 详情弹窗 ==================== */

const showDetailModal = ref(false);
const detailRow = ref<Record<string, unknown> | null>(null);

/** 详情字段描述 */
const detailFields: { key: string; label: string; type?: 'tag' | 'time' | 'number' }[] = [
  { key: 'id', label: 'logManage.detail.id' },
  { key: 'userId', label: 'logManage.detail.userId', type: 'number' },
  { key: 'userName', label: 'logManage.detail.userName' },
  { key: 'status', label: 'logManage.detail.status', type: 'tag' },
  { key: 'message', label: 'logManage.detail.message' },
  { key: 'ip', label: 'logManage.detail.ip' },
  { key: 'ipAddr', label: 'logManage.detail.ipAddr' },
  { key: 'userAgent', label: 'logManage.detail.userAgent' },
  { key: 'createTime', label: 'logManage.detail.createTime', type: 'time' }
];

/** 打开详情弹窗 */
const handleDetail = (row: Record<string, unknown>) => {
  detailRow.value = { ...row };
  showDetailModal.value = true;
};

/** 详情字段标签的语义色（登录状态色） */
const getDetailTagClass = (field: { key: string }, row: Record<string, unknown>) => {
  if (field.key === 'status') {
    return isLoginSuccess(row.status) ? 'success' : 'danger';
  }
  return '';
};

/** 详情值渲染 */
const renderDetailValue = (field: { key: string; label: string; type?: string }, row: Record<string, unknown>) => {
  const value = row[field.key];
  if (value === null || value === undefined || value === '') return '-';
  if (field.type === 'tag') {
    if (field.key === 'status') {
      return dictLabel('login_status', String(value)) || String(value);
    }
    return String(value);
  }
  if (field.type === 'time') return formatDate(value as string);
  return String(value);
};

/* ==================== 删除确认 ==================== */

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const currentDeleteId = ref<number | null>(null);
const deleteTarget = ref('');

/** 打开删除确认弹窗 */
const handleDelete = (row: Record<string, unknown>) => {
  currentDeleteId.value = Number(row.id);
  deleteTarget.value = row.id != null ? `#${row.id}` : '';
  showDeleteModal.value = true;
};

/** 确认删除（仅登录日志） */
const handleConfirmDelete = async () => {
  if (!currentDeleteId.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchRemoveMonLogsLogin(currentDeleteId.value);
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

/* ==================== 清空确认 ==================== */

const showClearModal = ref(false);
const clearLoading = ref(false);

/** 打开清空确认弹窗 */
const handleClear = () => {
  showClearModal.value = true;
};

/** 确认清空（仅登录日志） */
const handleConfirmClear = async () => {
  clearLoading.value = true;
  try {
    const { error } = await fetchClearMonLogsLogin();
    if (error) {
      window.$message?.error(error.message || $t('logManage.messages.clearFailed'));
      return;
    }
    window.$message?.success($t('logManage.messages.clearSuccess'));
    showClearModal.value = false;
    pagination.current = 1;
    loadData();
  } finally {
    clearLoading.value = false;
  }
};

const handleCloseClearModal = () => {
  showClearModal.value = false;
};

onMounted(loadData);
</script>

<template>
  <!-- 日志搜索栏 -->
  <div class="search-bar">
    <div class="search-box">
      <SvgIcon icon="mdi:account-search" class="search-icon" />
      <NInput v-model:value="pagination.keyword" :placeholder="$t('logManage.search.loginPlaceholder')" clearable size="small" />
    </div>
    <button class="search-btn" @click="handleSearch">
      <SvgIcon icon="mdi:magnify" />
      <span>{{ $t('logManage.search.btn') }}</span>
    </button>
    <button class="search-btn reset" @click="handleReset">
      <SvgIcon icon="mdi:refresh" />
      <span>{{ $t('logManage.search.reset') }}</span>
    </button>
    <button class="search-btn danger" :title="$t('logManage.clear')" @click="handleClear">
      <SvgIcon icon="mdi:broom" />
      <span>{{ $t('logManage.clear') }}</span>
    </button>
  </div>

  <!-- 登录日志表格 -->
  <div class="log-table">
    <div class="log-table-header login">
      <span class="col-user">{{ $t('logManage.table.userName') }}</span>
      <span class="col-status">{{ $t('logManage.table.status') }}</span>
      <span class="col-ip">{{ $t('logManage.table.ip') }}</span>
      <span class="col-addr">{{ $t('logManage.table.ipAddr') }}</span>
      <span class="col-message">{{ $t('logManage.table.message') }}</span>
      <span class="col-time">{{ $t('logManage.table.createTime') }}</span>
      <span class="col-actions">{{ $t('logManage.table.actions') }}</span>
    </div>
    <div class="log-table-body">
      <div v-for="row in list" :key="row.id" class="log-row login">
        <span class="col-user cell-text" :title="row.userName">{{ row.userName || '-' }}</span>
        <span class="col-status">
          <span class="status-badge" :class="{ success: isLoginSuccess(row.status) }">
            <span class="dot" />
            {{ isLoginSuccess(row.status) ? $t('logManage.loginSuccess') : $t('logManage.loginFailed') }}
          </span>
        </span>
        <span class="col-ip cell-text" :title="row.ip">{{ row.ip || '-' }}</span>
        <span class="col-addr cell-text" :title="row.ipAddr">{{ row.ipAddr || '-' }}</span>
        <span class="col-message cell-text" :title="row.message">{{ row.message || '-' }}</span>
        <span class="col-time">{{ formatDate(row.createTime) }}</span>
        <span class="col-actions">
          <button class="row-action-btn view" :title="$t('logManage.detailTitle')" @click="handleDetail(row)">
            <SvgIcon icon="mdi:eye-outline" />
          </button>
          <button class="row-action-btn delete" :title="$t('logManage.delete')" @click="handleDelete(row)">
            <SvgIcon icon="mdi:delete" />
          </button>
        </span>
      </div>

      <!-- 加载骨架 -->
      <template v-if="loading">
        <div v-for="i in 6" :key="`login-skeleton-${i}`" class="log-row skeleton-row">
          <span v-for="j in 7" :key="j" class="skeleton-cell" />
        </div>
      </template>

      <!-- 空状态 -->
      <div v-if="!loading && list.length === 0" class="log-empty">
        <SvgIcon icon="mdi:file-document-outline" class="empty-icon" />
        <p>{{ $t('logManage.empty') }}</p>
      </div>
    </div>
  </div>

  <!-- 分页 -->
  <div v-if="pagination.total > 0" class="pagination-bar">
    <NPagination v-model:page="pagination.current" :item-count="pagination.total"
      :page-size="pagination.size" @update-page="handlePageChange" />
  </div>

  <!-- 详情弹窗 -->
  <NModal v-model:show="showDetailModal" preset="card" class="w-680px rounded-16px" :bordered="false" size="small"
    :closable="true">
    <template #header>
      <div class="modal-header">
        <SvgIcon icon="mdi:eye-outline" class="modal-header-icon" />
        <span>{{ $t('logManage.detailTitle') }}</span>
      </div>
    </template>
    <div v-if="detailRow" class="detail-grid">
      <div v-for="field in detailFields" :key="field.key" class="detail-item"
        :class="{ full: field.key === 'stackTrace' || field.key === 'methodParams', stack: field.key === 'stackTrace' }">
        <span class="detail-label">{{ $t(field.label) }}</span>
        <span v-if="field.type === 'tag'" class="detail-tag" :class="getDetailTagClass(field, detailRow)">
          <span class="tag-dot" />
          {{ renderDetailValue(field, detailRow) }}
        </span>
        <span v-else class="detail-value" :class="{ mono: field.key === 'requestId' || field.key === 'stackTrace' }">
          {{ renderDetailValue(field, detailRow) }}
        </span>
      </div>
    </div>
  </NModal>

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
        {{ $t('logManage.deleteModal.confirmPrefix') }}
        <span class="delete-modal-target">{{ deleteTarget }}</span>
        {{ $t('logManage.deleteModal.confirmSuffix') }}
      </p>
      <p class="delete-modal-tip">{{ $t('logManage.deleteModal.tip') }}</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="handleCloseDeleteModal">{{ $t('common.cancel') }}</button>
      <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
        <SvgIcon icon="mdi:delete" />
        <span>{{ deleteLoading ? $t('logManage.deleting') : $t('logManage.delete') }}</span>
      </button>
    </div>
  </NModal>

  <!-- 清空确认弹窗 -->
  <NModal v-model:show="showClearModal" preset="card" class="delete-modal rounded-16px w-400px" :bordered="false"
    size="small" :closable="false">
    <template #header>
      <div class="delete-modal-header">
        <SvgIcon icon="mdi:broom" class="clear-modal-icon" />
        <span>{{ $t('logManage.clearModal.title') }}</span>
      </div>
    </template>
    <div class="delete-modal-body">
      <p class="delete-modal-text">{{ $t('logManage.clearModal.confirm', { type: $t(MODULE_LABEL_KEY) }) }}</p>
      <p class="delete-modal-tip">{{ $t('logManage.clearModal.tip') }}</p>
    </div>
    <div class="delete-modal-actions">
      <button class="action-btn cancel" @click="handleCloseClearModal">{{ $t('common.cancel') }}</button>
      <button class="action-btn danger" :disabled="clearLoading" @click="handleConfirmClear">
        <SvgIcon icon="mdi:broom" />
        <span>{{ clearLoading ? $t('logManage.clearing') : $t('logManage.clear') }}</span>
      </button>
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
