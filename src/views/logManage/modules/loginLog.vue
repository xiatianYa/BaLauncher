<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NDataTable,
  NEllipsis,
  NModal,
  NPagination,
  NTooltip,
  type DataTableBaseColumn,
  type DataTableColumns
} from 'naive-ui';
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

/* ==================== NDataTable 列定义 ==================== */

/** 列宽拖拽结果（按列 key 记录） */
const resizedWidths = ref<Record<string, number>>({});

/** NDataTable 列宽拖拽回调：记录调整后的宽度（受限后的宽度） */
const handleColumnResize = (_resizedWidth: number, limitedWidth: number, column: DataTableBaseColumn) => {
  const key = String(column.key);
  if (key) resizedWidths.value[key] = limitedWidth;
};

/** 行 key：保证行节点稳定复用 */
const rowKey = (row: Record<string, any>) => String(row.id ?? '');

/** 文本单元格：超出省略，悬停展示完整内容 */
const renderTextCell = (value: unknown) => {
  const text = value == null || value === '' ? '-' : String(value);
  return h(NEllipsis, { maxLine: 1, tooltip: { placement: 'top' } }, { default: () => text });
};

/** 登录状态：状态点 + 徽章（成功绿 / 失败红） */
const renderStatusCell = (row: Record<string, any>) =>
  h(
    'span',
    { class: ['status-badge', { success: isLoginSuccess(row.status) }] },
    [h('span', { class: 'dot' }), isLoginSuccess(row.status) ? $t('logManage.loginSuccess') : $t('logManage.loginFailed')]
  );

/** 创建时间：等宽字体日期展示 */
const renderTimeCell = (row: Record<string, any>) => h('span', { class: 'col-time' }, formatDate(row.createTime));

/** 操作：查看详情 / 删除 */
const renderActionCell = (row: Record<string, any>) =>
  h('div', { class: 'action-cell' }, [
    h(
      NTooltip,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () =>
          h(NButton, { size: 'small', class: 'row-action-btn view', onClick: () => handleDetail(row) }, { icon: () => h(SvgIcon, { icon: 'mdi:eye-outline' }) }),
        default: () => $t('logManage.detailTitle')
      }
    ),
    h(
      NTooltip,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () =>
          h(NButton, { size: 'small', class: 'row-action-btn delete', onClick: () => handleDelete(row) }, { icon: () => h(SvgIcon, { icon: 'mdi:delete' }) }),
        default: () => $t('logManage.delete')
      }
    )
  ]);

/** NDataTable 列定义 */
const columns = computed<DataTableColumns<Record<string, any>>>(() => [
  {
    key: 'userName',
    title: $t('logManage.table.userName'),
    width: resizedWidths.value['userName'] ?? 140,
    minWidth: 110,
    resizable: true,
    render: row => renderTextCell(row.userName)
  },
  {
    key: 'status',
    title: $t('logManage.table.status'),
    width: resizedWidths.value['status'] ?? 90,
    minWidth: 80,
    resizable: true,
    render: row => renderStatusCell(row)
  },
  {
    key: 'ip',
    title: $t('logManage.table.ip'),
    width: resizedWidths.value['ip'] ?? 130,
    minWidth: 100,
    resizable: true,
    render: row => renderTextCell(row.ip)
  },
  {
    key: 'ipAddr',
    title: $t('logManage.table.ipAddr'),
    width: resizedWidths.value['ipAddr'] ?? 130,
    minWidth: 100,
    resizable: true,
    render: row => renderTextCell(row.ipAddr)
  },
  {
    key: 'message',
    title: $t('logManage.table.message'),
    minWidth: 140,
    resizable: true,
    width: resizedWidths.value['message'],
    render: row => renderTextCell(row.message)
  },
  {
    key: 'createTime',
    title: $t('logManage.table.createTime'),
    width: resizedWidths.value['createTime'] ?? 160,
    minWidth: 140,
    resizable: true,
    render: row => renderTimeCell(row)
  },
  {
    key: 'actions',
    title: $t('logManage.table.actions'),
    width: resizedWidths.value['actions'] ?? 100,
    minWidth: 90,
    resizable: true,
    render: row => renderActionCell(row)
  }
]);

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

  <!-- 登录日志表格（NDataTable） -->
  <div class="custom-table-wrapper">
    <div class="custom-table">
      <NDataTable
        class="login-table"
        :columns="columns"
        :data="list"
        :loading="loading"
        :row-key="rowKey"
        :bordered="false"
        :single-line="false"
        table-layout="fixed"
        @unstable-column-resize="handleColumnResize"
      >
        <template #empty>
          <div class="log-empty">
            <SvgIcon icon="mdi:file-document-outline" class="empty-icon" />
            <p>{{ $t('logManage.empty') }}</p>
          </div>
        </template>
      </NDataTable>
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

/* ===== 登录日志表格（NDataTable） ===== */
.custom-table-wrapper {
  flex: 1;
  min-height: 0;
  padding: 4px 10px 10px;
  overflow: auto;

  .custom-table {
    display: flex;
    flex-direction: column;
    // 关键：确保表格按完整列宽渲染，不随容器宽度收缩
    min-width: 900px;
  }
}

/* 空状态（NDataTable #empty 插槽） */
.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
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

/* ===== NDataTable 内部样式覆写（行卡片化，视觉与旧表格一致） ===== */
.login-table {
  /* 去掉默认底色 */
  :deep(.n-data-table) {
    background: transparent;
  }

  /* 行间距：表头与首行、行与行之间留出 10px */
  :deep(.n-data-table-table) {
    border-collapse: separate !important;
    border-spacing: 0 10px;
  }

  /* ===== 表头 ===== */
  :deep(.n-data-table-th) {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(var(--app-rgb), 0.08);
    padding: 8px 12px;
  }

  :deep(.n-data-table-th__title-wrapper) {
    font-size: 13px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.6);
    white-space: nowrap;
  }

  /* ===== 表体（行卡片化：圆角 + 主题背景 + hover 加深） ===== */
  :deep(.n-data-table-td) {
    border: none;
    padding: 12px;
    background: rgba(var(--app-rgb), 0.03);
    overflow: hidden;
    transition: background 0.25s ease;
  }

  /* 每行四角圆角：首列左圆角、末列右圆角 */
  :deep(.n-data-table-td:first-child) {
    border-radius: 12px 0 0 12px;
  }

  :deep(.n-data-table-td:last-child) {
    border-radius: 0 12px 12px 0;
  }

  :deep(.n-data-table-tr:hover .n-data-table-td) {
    background: rgba(var(--app-rgb), 0.06);
  }

  /* 加载中遮罩透明化，避免遮住卡片底色 */
  :deep(.n-data-table__loading) {
    background: transparent;
  }

  /* ===== 文本单元格（省略号，悬停展示完整内容） ===== */
  :deep(.n-ellipsis) {
    font-size: 12.5px;
    color: rgba(var(--app-rgb), 0.85);
  }

  /* 创建时间：等宽字体 */
  :deep(.col-time) {
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.5);
    font-family: 'JetBrains Mono', Consolas, monospace;
    white-space: nowrap;
  }

  /* ===== 登录状态徽章（状态点 + 语义色） ===== */
  :deep(.status-badge) {
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

  /* ===== 操作按钮 ===== */
  :deep(.action-cell) {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  :deep(.row-action-btn) {
    min-width: 26px;
    width: 26px;
    height: 26px;
    padding: 0;
    border-radius: 7px;
    font-size: 14px;
    transition: all 0.2s ease;

    &.view {
      color: #667eea;
      background: rgba(102, 126, 234, 0.12);
      border-color: rgba(102, 126, 234, 0.25);

      &:hover {
        background: rgba(102, 126, 234, 0.22);
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

.pagination-bar {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
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
