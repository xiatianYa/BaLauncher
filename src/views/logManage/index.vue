<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NImage, NInput, NModal, NPagination, NSwitch } from 'naive-ui';
import dayjs from 'dayjs';
import {
  fetchGetMonLogsOperationPageList,
  fetchRemoveMonLogsOperation,
  fetchClearMonLogsOperation,
  fetchGetMonLogsLoginPageList,
  fetchRemoveMonLogsLogin,
  fetchClearMonLogsLogin,
  fetchGetMonLogsErrorPageList,
  fetchRemoveMonLogsError,
  fetchClearMonLogsError,
  fetchGetMonLogsFilePageList,
  fetchRemoveMonLogsFile,
  fetchClearMonLogsFile,
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
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';

defineOptions({ name: 'LogManagePage' });

const { isAdmin } = useAuth(); // 日志管理仅管理员可见
const { dictLabel } = useDict();

/* ==================== 标签页 ==================== */

type LogTabKey = 'operation' | 'login' | 'error' | 'file' | 'scheduler';

const activeTab = ref<LogTabKey>('operation');

const tabOptions: { key: LogTabKey; label: string; icon: string }[] = [
  { key: 'operation', label: 'logManage.tabs.operation', icon: 'mdi:history' },
  { key: 'login', label: 'logManage.tabs.login', icon: 'mdi:login' },
  { key: 'error', label: 'logManage.tabs.error', icon: 'mdi:alert-decagram' },
  { key: 'file', label: 'logManage.tabs.file', icon: 'mdi:file-upload-outline' },
  { key: 'scheduler', label: 'logManage.schedulerTab', icon: 'mdi:timeline-clock' }
];

/* ==================== 列表与分页 ==================== */

const loading = ref(false);
/** 行数据统一使用可空记录类型，便于按标签页复用同一套渲染 */
const operationList = ref<Record<string, any>[]>([]);
const loginList = ref<Record<string, any>[]>([]);
const errorList = ref<Record<string, any>[]>([]);
const fileList = ref<Record<string, any>[]>([]);
const schedulerList = ref<Record<string, any>[]>([]);

/** 分页查询条件（当前标签页复用同一组条件） */
const pagination = reactive({
  /** 操作/异常日志：按操作用户ID搜索；登录日志：按用户名称搜索 */
  keyword: '',
  current: 1,
  size: 10,
  total: 0
});

/** 调度任务分页与查询条件 */
const schedulerPagination = reactive({
  current: 1,
  size: 10,
  total: 0,
  jobName: '',
  jobGroup: ''
});

/** 日期格式化 */
const formatDate = (date: unknown) => (date ? dayjs(String(date)).format('YYYY-MM-DD HH:mm:ss') : '-');

/** 图片扩展名 */
const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'];

/** 判断是否为图片文件 */
const isImageFile = (url: unknown) => {
  const str = String(url || '').toLowerCase();
  const idx = str.lastIndexOf('.');
  if (idx === -1) return false;
  const ext = str.slice(idx + 1).split('?')[0];
  return imageExts.includes(ext);
};

/** 请求方式色值 */
const methodColorMap: Record<string, string> = {
  GET: '#43e97b',
  POST: '#36adff',
  PUT: '#ffa325',
  DELETE: '#f5576c'
};
const getMethodColor = (method: unknown) => methodColorMap[String(method || '').toUpperCase()] || '#8b93a7';

/** 登录状态：1 成功 / 0 失败 */
const isLoginSuccess = (status: unknown) => status === '1';

/** 详情字段标签的语义色（请求方法色 / 状态色） */
const getDetailTagClass = (field: { key: string }, row: Record<string, any>) => {
  if (field.key === 'requestMethod') {
    return `m-${String(row.requestMethod || '').toUpperCase()}`;
  }
  if (field.key === 'status') {
    return isLoginSuccess(row.status) ? 'success' : 'danger';
  }
  return '';
};

/** 加载当前标签页数据 */
const loadData = async () => {
  if (!isAdmin.value) return;
  loading.value = true;
  try {
    const keyword = pagination.keyword || null;
    if (activeTab.value === 'operation') {
      const { data, error } = await fetchGetMonLogsOperationPageList({
        createUser: keyword ? Number(keyword) : undefined,
        current: pagination.current,
        size: pagination.size
      });
      if (!error && data) {
        operationList.value = (data.records || []) as unknown as Record<string, any>[];
        pagination.total = data.total || 0;
      }
    } else if (activeTab.value === 'login') {
      const { data, error } = await fetchGetMonLogsLoginPageList({
        userName: keyword,
        current: pagination.current,
        size: pagination.size
      });
      if (!error && data) {
        loginList.value = (data.records || []) as unknown as Record<string, any>[];
        pagination.total = data.total || 0;
      }
    } else if (activeTab.value === 'error') {
      const { data, error } = await fetchGetMonLogsErrorPageList({
        createUser: keyword ? Number(keyword) : undefined,
        current: pagination.current,
        size: pagination.size
      });
      if (!error && data) {
        errorList.value = (data.records || []) as unknown as Record<string, any>[];
        pagination.total = data.total || 0;
      }
    } else if (activeTab.value === 'file') {
      const { data, error } = await fetchGetMonLogsFilePageList({
        userName: keyword ? Number(keyword) : undefined,
        current: pagination.current,
        size: pagination.size
      });
      if (!error && data) {
        fileList.value = (data.records || []) as unknown as Record<string, any>[];
        pagination.total = data.total || 0;
      }
    } else {
      const { data, error } = await fetchGetMonSchedulerPageList({
        jobName: schedulerPagination.jobName || undefined,
        jobGroup: schedulerPagination.jobGroup || undefined,
        current: schedulerPagination.current,
        size: schedulerPagination.size
      });
      if (!error && data) {
        schedulerList.value = (data.records || []) as unknown as Record<string, any>[];
        schedulerPagination.total = data.total || 0;
      }
    }
  } finally {
    loading.value = false;
  }
};

/** 当前标签页行数据 */
const currentList = computed(() => {
  if (activeTab.value === 'operation') return operationList.value;
  if (activeTab.value === 'login') return loginList.value;
  if (activeTab.value === 'error') return errorList.value;
  if (activeTab.value === 'file') return fileList.value;
  return schedulerList.value;
});

/** 切换标签页 */
const handleTabChange = (key: LogTabKey) => {
  if (activeTab.value === key) return;
  activeTab.value = key;
  pagination.keyword = '';
  pagination.current = 1;
  schedulerPagination.jobName = '';
  schedulerPagination.jobGroup = '';
  schedulerPagination.current = 1;
  loadData();
};

/** 日志搜索 */
const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

/** 日志重置 */
const handleReset = () => {
  pagination.keyword = '';
  pagination.current = 1;
  loadData();
};

/** 调度任务搜索 */
const handleSchedulerSearch = () => {
  schedulerPagination.current = 1;
  loadData();
};

/** 调度任务重置 */
const handleSchedulerReset = () => {
  schedulerPagination.jobName = '';
  schedulerPagination.jobGroup = '';
  schedulerPagination.current = 1;
  loadData();
};

/** 分页切换 */
const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/* ==================== 详情弹窗 ==================== */

const showDetailModal = ref(false);
const detailLoading = ref(false);
/** 详情行（统一使用可空结构） */
const detailRow = ref<Record<string, unknown> | null>(null);

/** 详情字段描述 */
const detailFields = computed(() => {
  const base: { key: string; label: string; type?: 'tag' | 'time' | 'number' }[] = [];
  if (activeTab.value === 'operation') {
    base.push(
      { key: 'id', label: 'logManage.detail.id' },
      { key: 'operation', label: 'logManage.detail.operation' },
      { key: 'requestMethod', label: 'logManage.detail.requestMethod', type: 'tag' },
      { key: 'requestUri', label: 'logManage.detail.requestUri' },
      { key: 'contentType', label: 'logManage.detail.contentType' },
      { key: 'methodName', label: 'logManage.detail.methodName' },
      { key: 'methodParams', label: 'logManage.detail.methodParams' },
      { key: 'createUser', label: 'logManage.detail.createUser' },
      { key: 'createUserId', label: 'logManage.detail.createUserId', type: 'number' },
      { key: 'ip', label: 'logManage.detail.ip' },
      { key: 'ipAddr', label: 'logManage.detail.ipAddr' },
      { key: 'userAgent', label: 'logManage.detail.userAgent' },
      { key: 'useTime', label: 'logManage.detail.useTime', type: 'number' },
      { key: 'createTime', label: 'logManage.detail.createTime', type: 'time' },
      { key: 'requestId', label: 'logManage.detail.requestId' }
    );
  } else if (activeTab.value === 'login') {
    base.push(
      { key: 'id', label: 'logManage.detail.id' },
      { key: 'userId', label: 'logManage.detail.userId', type: 'number' },
      { key: 'userName', label: 'logManage.detail.userName' },
      { key: 'status', label: 'logManage.detail.status', type: 'tag' },
      { key: 'message', label: 'logManage.detail.message' },
      { key: 'ip', label: 'logManage.detail.ip' },
      { key: 'ipAddr', label: 'logManage.detail.ipAddr' },
      { key: 'userAgent', label: 'logManage.detail.userAgent' },
      { key: 'createTime', label: 'logManage.detail.createTime', type: 'time' }
    );
  } else if (activeTab.value === 'file') {
    base.push(
      { key: 'id', label: 'logManage.detail.id' },
      { key: 'userId', label: 'logManage.detail.userId', type: 'number' },
      { key: 'userName', label: 'logManage.detail.userName' },
      { key: 'fileUrl', label: 'logManage.detail.fileUrl' },
      { key: 'fileSize', label: 'logManage.detail.fileSize' },
      { key: 'status', label: 'logManage.detail.status', type: 'tag' },
      { key: 'createTime', label: 'logManage.detail.createTime', type: 'time' }
    );
  } else if (activeTab.value === 'error') {
    base.push(
      { key: 'id', label: 'logManage.detail.id' },
      { key: 'operation', label: 'logManage.detail.operation' },
      { key: 'requestMethod', label: 'logManage.detail.requestMethod', type: 'tag' },
      { key: 'requestUri', label: 'logManage.detail.requestUri' },
      { key: 'exceptionMessage', label: 'logManage.detail.exceptionMessage' },
      { key: 'exceptionClass', label: 'logManage.detail.exceptionClass' },
      { key: 'line', label: 'logManage.detail.line', type: 'number' },
      { key: 'createUser', label: 'logManage.detail.createUser' },
      { key: 'ip', label: 'logManage.detail.ip' },
      { key: 'ipAddr', label: 'logManage.detail.ipAddr' },
      { key: 'useTime', label: 'logManage.detail.useTime', type: 'number' },
      { key: 'createTime', label: 'logManage.detail.createTime', type: 'time' },
      { key: 'requestId', label: 'logManage.detail.requestId' }
    );
  }
  return base;
});

/** 打开详情弹窗 */
const handleDetail = (row: Record<string, unknown>) => {
  detailRow.value = { ...row };
  showDetailModal.value = true;
};

/** 详情值渲染 */
const renderDetailValue = (field: { key: string; label: string; type?: string }, row: Record<string, unknown>) => {
  const value = row[field.key];
  if (value === null || value === undefined || value === '') return '-';
  if (field.type === 'tag') {
    if (activeTab.value === 'operation' && field.key === 'status') {
      return dictLabel('operation_status', String(value)) || String(value);
    }
    if (activeTab.value === 'login' && field.key === 'status') {
      return dictLabel('login_status', String(value)) || String(value);
    }
    if (activeTab.value === 'file' && field.key === 'status') {
      return isLoginSuccess(value as string) ? $t('logManage.uploadSuccess') : $t('logManage.uploadFailed');
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
/** 删除目标展示文本（日志显示 #id，调度任务显示任务名称） */
const deleteTarget = ref('');

/** 打开删除确认弹窗（日志） */
const handleDelete = (row: Record<string, unknown>) => {
  currentDeleteId.value = Number(row.id);
  deleteTarget.value = row.id != null ? `#${row.id}` : '';
  showDeleteModal.value = true;
};

/** 删除确认文案（调度任务与日志区分，目标高亮） */
const deleteModalConfirmPrefix = computed(() =>
  activeTab.value === 'scheduler' ? $t('logManage.scheduler.deleteModal.confirmPrefix') : $t('logManage.deleteModal.confirmPrefix')
);

const deleteModalConfirmSuffix = computed(() =>
  activeTab.value === 'scheduler' ? $t('logManage.scheduler.deleteModal.confirmSuffix') : $t('logManage.deleteModal.confirmSuffix')
);

const deleteModalTipText = computed(() =>
  activeTab.value === 'scheduler' ? $t('logManage.scheduler.deleteModal.tip') : $t('logManage.deleteModal.tip')
);

/** 确认删除 */
const handleConfirmDelete = async () => {
  if (!currentDeleteId.value) return;
  deleteLoading.value = true;
  try {
    const id = currentDeleteId.value;
    const { error } =
      activeTab.value === 'operation'
        ? await fetchRemoveMonLogsOperation(id)
        : activeTab.value === 'login'
          ? await fetchRemoveMonLogsLogin(id)
          : activeTab.value === 'error'
            ? await fetchRemoveMonLogsError(id)
            : await fetchRemoveMonScheduler(id);
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

/** 确认清空 */
const handleConfirmClear = async () => {
  clearLoading.value = true;
  try {
    const { error } =
      activeTab.value === 'operation'
        ? await fetchClearMonLogsOperation()
        : activeTab.value === 'login'
          ? await fetchClearMonLogsLogin()
          : activeTab.value === 'file'
            ? await fetchClearMonLogsFile()
            : await fetchClearMonLogsError();
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

/* ==================== 调度任务管理 ==================== */

/** 调度任务：启用状态为 '1' */
const isSchedulerEnabled = (status: unknown) => String(status ?? '') === '1';

/** 调度任务：是否处于暂停状态 */
const isSchedulerPaused = (state: unknown) => String(state ?? '') === 'PAUSED';

/** 调度任务运行状态 i18n key（未知状态回退显示原文） */
const getTriggerStateKey = (state: unknown) => {
  const map: Record<string, string> = {
    NONE: 'logManage.scheduler.triggerStates.NONE',
    NORMAL: 'logManage.scheduler.triggerStates.NORMAL',
    PAUSED: 'logManage.scheduler.triggerStates.PAUSED',
    COMPLETE: 'logManage.scheduler.triggerStates.COMPLETE',
    ERROR: 'logManage.scheduler.triggerStates.ERROR',
    BLOCKED: 'logManage.scheduler.triggerStates.BLOCKED'
  };
  return map[String(state ?? '')];
};

/** 调度任务表单弹窗状态 */
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

/** 调度任务删除（复用删除确认弹窗） */
const handleSchedulerDelete = (row: Record<string, unknown>) => {
  currentDeleteId.value = Number(row.id);
  deleteTarget.value = String(row.jobName || row.id || '');
  showDeleteModal.value = true;
};

/** 调度任务分页切换 */
const handleSchedulerPageChange = (page: number) => {
  schedulerPagination.current = page;
  loadData();
};

onMounted(() => {
  if (isAdmin.value) {
    loadData();
  }
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true, footer: 'soft' }">
      <!-- 头部：标题 + 副标题 -->
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:file-document-outline" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.logManage') }}</h1>
              <span class="page-subtitle">{{ $t('logManage.subtitle') }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="log-manage-container">
        <!-- 无权限提示 -->
        <div v-if="!isAdmin" class="no-permission">
          <SvgIcon icon="mdi:shield-lock" class="no-permission-icon" />
          <p>{{ $t('logManage.noPermission') }}</p>
        </div>

        <template v-else>
          <!-- 标签页切换 -->
          <div class="tab-bar">
            <button v-for="tab in tabOptions" :key="tab.key" class="tab-btn"
              :class="{ active: activeTab === tab.key }" @click="handleTabChange(tab.key)">
              <SvgIcon :icon="tab.icon" class="tab-icon" />
              <span>{{ $t(tab.label) }}</span>
            </button>
          </div>

          <!-- 日志搜索栏 -->
          <div v-if="activeTab !== 'scheduler'" class="search-bar">
            <div class="search-box">
              <SvgIcon icon="mdi:account-search" class="search-icon" />
              <NInput v-model:value="pagination.keyword"
                :placeholder="activeTab === 'login' ? $t('logManage.search.loginPlaceholder') : $t('logManage.search.operationPlaceholder')"
                clearable size="small" />
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

          <!-- 调度任务搜索栏 -->
          <div v-else class="search-bar">
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
            <button class="search-btn" @click="handleSchedulerSearch">
              <SvgIcon icon="mdi:magnify" />
              <span>{{ $t('logManage.search.btn') }}</span>
            </button>
            <button class="search-btn reset" @click="handleSchedulerReset">
              <SvgIcon icon="mdi:refresh" />
              <span>{{ $t('logManage.search.reset') }}</span>
            </button>
            <button class="icon-btn primary add-group-btn" @click="openAddScheduler">
              <SvgIcon icon="mdi:plus" />
              <span>{{ $t('logManage.scheduler.add') }}</span>
            </button>
          </div>

          <!-- 操作日志表格 -->
          <div v-if="activeTab === 'operation'" class="log-table">
            <div class="log-table-header">
              <span class="col-operation">{{ $t('logManage.table.operation') }}</span>
              <span class="col-method">{{ $t('logManage.table.requestMethod') }}</span>
              <span class="col-uri">{{ $t('logManage.table.requestUri') }}</span>
              <span class="col-user">{{ $t('logManage.table.createUser') }}</span>
              <span class="col-ip">{{ $t('logManage.table.ip') }}</span>
              <span class="col-cost">{{ $t('logManage.table.useTime') }}</span>
              <span class="col-time">{{ $t('logManage.table.createTime') }}</span>
              <span class="col-actions">{{ $t('logManage.table.actions') }}</span>
            </div>
            <div class="log-table-body">
              <div v-for="row in currentList" :key="row.id" class="log-row">
                <span class="col-operation cell-text" :title="row.operation">{{ row.operation || '-' }}</span>
                <span class="col-method">
                  <span class="method-badge" :style="{ color: getMethodColor(row.requestMethod), borderColor: `${getMethodColor(row.requestMethod)}55`, background: `${getMethodColor(row.requestMethod)}14` }">
                    {{ row.requestMethod || '-' }}
                  </span>
                </span>
                <span class="col-uri cell-text" :title="row.requestUri">{{ row.requestUri || '-' }}</span>
                <span class="col-user cell-text" :title="row.createUser">{{ row.createUser || '-' }}</span>
                <span class="col-ip cell-text" :title="row.ip">{{ row.ip || '-' }}</span>
                <span class="col-cost">{{ row.useTime != null ? `${row.useTime}ms` : '-' }}</span>
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
                <div v-for="i in 6" :key="`op-skeleton-${i}`" class="log-row skeleton-row">
                  <span v-for="j in 8" :key="j" class="skeleton-cell" />
                </div>
              </template>

              <!-- 空状态 -->
              <div v-if="!loading && currentList.length === 0" class="log-empty">
                <SvgIcon icon="mdi:file-document-outline" class="empty-icon" />
                <p>{{ $t('logManage.empty') }}</p>
              </div>
            </div>
          </div>

          <!-- 登录日志表格 -->
          <div v-else-if="activeTab === 'login'" class="log-table">
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
              <div v-for="row in currentList" :key="row.id" class="log-row login">
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
              <div v-if="!loading && currentList.length === 0" class="log-empty">
                <SvgIcon icon="mdi:file-document-outline" class="empty-icon" />
                <p>{{ $t('logManage.empty') }}</p>
              </div>
            </div>
          </div>

          <!-- 异常日志表格 -->
          <div v-else-if="activeTab === 'error'" class="log-table">
            <div class="log-table-header error">
              <span class="col-operation">{{ $t('logManage.table.operation') }}</span>
              <span class="col-exception">{{ $t('logManage.table.exceptionMessage') }}</span>
              <span class="col-class">{{ $t('logManage.table.exceptionClass') }}</span>
              <span class="col-line">{{ $t('logManage.table.line') }}</span>
              <span class="col-user">{{ $t('logManage.table.createUser') }}</span>
              <span class="col-time">{{ $t('logManage.table.createTime') }}</span>
              <span class="col-actions">{{ $t('logManage.table.actions') }}</span>
            </div>
            <div class="log-table-body">
              <div v-for="row in currentList" :key="row.id" class="log-row error">
                <span class="col-operation cell-text" :title="row.operation">{{ row.operation || '-' }}</span>
                <span class="col-exception cell-text" :title="row.exceptionMessage">{{ row.exceptionMessage || '-' }}</span>
                <span class="col-class cell-text" :title="row.exceptionClass">{{ row.exceptionClass || '-' }}</span>
                <span class="col-line">{{ row.line ?? '-' }}</span>
                <span class="col-user cell-text" :title="row.createUser">{{ row.createUser || '-' }}</span>
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
                <div v-for="i in 6" :key="`error-skeleton-${i}`" class="log-row skeleton-row">
                  <span v-for="j in 7" :key="j" class="skeleton-cell" />
                </div>
              </template>

              <!-- 空状态 -->
              <div v-if="!loading && currentList.length === 0" class="log-empty">
                <SvgIcon icon="mdi:file-document-outline" class="empty-icon" />
                <p>{{ $t('logManage.empty') }}</p>
              </div>
            </div>
          </div>

          <!-- 文件日志表格 -->
          <div v-else-if="activeTab === 'file'" class="log-table">
            <div class="log-table-header file">
              <span class="f-col-userid">{{ $t('logManage.table.userId') }}</span>
              <span class="f-col-user">{{ $t('logManage.table.userName') }}</span>
              <span class="f-col-url">{{ $t('logManage.table.fileUrl') }}</span>
              <span class="f-col-size">{{ $t('logManage.table.fileSize') }}</span>
              <span class="f-col-status">{{ $t('logManage.table.status') }}</span>
              <span class="col-time">{{ $t('logManage.table.createTime') }}</span>
              <span class="col-actions">{{ $t('logManage.table.actions') }}</span>
            </div>
            <div class="log-table-body">
              <div v-for="row in currentList" :key="row.id" class="log-row file">
                <span class="f-col-userid">{{ row.userId ?? '-' }}</span>
                <span class="f-col-user cell-text" :title="row.userName">{{ row.userName || '-' }}</span>
                <span class="f-col-url">
                  <NImage v-if="isImageFile(row.fileUrl)" :src="row.fileUrl" class="file-thumb" width="34" height="34"
                    :img-props="{ style: 'border-radius: 8px; object-fit: cover;' }" />
                  <SvgIcon v-else icon="mdi:file-document-outline" class="file-type-icon" />
                  <span class="cell-text" :title="row.fileUrl">{{ row.fileUrl || '-' }}</span>
                </span>
                <span class="f-col-size">{{ row.fileSize || '-' }}</span>
                <span class="f-col-status">
                  <span class="status-badge" :class="{ success: isLoginSuccess(row.status) }">
                    <span class="dot" />
                    {{ isLoginSuccess(row.status) ? $t('logManage.uploadSuccess') : $t('logManage.uploadFailed') }}
                  </span>
                </span>
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
                <div v-for="i in 6" :key="`file-skeleton-${i}`" class="log-row skeleton-row">
                  <span v-for="j in 7" :key="j" class="skeleton-cell" />
                </div>
              </template>

              <!-- 空状态 -->
              <div v-if="!loading && currentList.length === 0" class="log-empty">
                <SvgIcon icon="mdi:file-upload-outline" class="empty-icon" />
                <p>{{ $t('logManage.empty') }}</p>
              </div>
            </div>
          </div>

          <!-- 调度任务表格 -->
          <div v-else class="log-table">
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
              <div v-for="row in currentList" :key="row.id" class="log-row scheduler">
                <span class="s-col-name cell-text" :title="row.jobName">{{ row.jobName || '-' }}</span>
                <span class="s-col-group cell-text" :title="row.jobGroup">{{ row.jobGroup || '-' }}</span>
                <span class="s-col-trigger cell-text" :title="row.triggerName">{{ row.triggerName || '-' }}</span>
                <span class="s-col-cron cell-text" :title="row.cron">{{ row.cron || '-' }}</span>
                <span class="s-col-state">
                  <span class="state-badge" :class="String(row.triggerState || '').toLowerCase()">
                    {{ $t(getTriggerStateKey(row.triggerState) || row.triggerState || '-') }}
                  </span>
                </span>
                <span class="s-col-status">
                  <span class="status-badge" :class="{ success: isSchedulerEnabled(row.status) }">
                    <span class="dot" />
                    {{ isSchedulerEnabled(row.status) ? $t('logManage.scheduler.enabled') : $t('logManage.scheduler.disabled') }}
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
              <div v-if="!loading && currentList.length === 0" class="log-empty">
                <SvgIcon icon="mdi:timeline-clock" class="empty-icon" />
                <p>{{ $t('logManage.scheduler.empty') }}</p>
              </div>
            </div>
          </div>

          <!-- 分页（日志） -->
          <div v-if="activeTab !== 'scheduler' && pagination.total > 0" class="pagination-bar">
            <NPagination v-model:page="pagination.current" :item-count="pagination.total"
              :page-size="pagination.size" @update-page="handlePageChange" />
          </div>

          <!-- 分页（调度任务） -->
          <div v-if="activeTab === 'scheduler' && schedulerPagination.total > 0" class="pagination-bar">
            <NPagination v-model:page="schedulerPagination.current" :item-count="schedulerPagination.total"
              :page-size="schedulerPagination.size" @update-page="handleSchedulerPageChange" />
          </div>
        </template>
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
            {{ deleteModalConfirmPrefix }}
            <span class="delete-modal-target">{{ deleteTarget }}</span>
            {{ deleteModalConfirmSuffix }}
          </p>
          <p class="delete-modal-tip">{{ deleteModalTipText }}</p>
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
          <p class="delete-modal-text">{{ $t('logManage.clearModal.confirm', { type: $t(tabOptions.find(t => t.key === activeTab)?.label || '') }) }}</p>
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
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
/* 头部（参考 tools/index.vue） */
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
}

.log-manage-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
  padding: 0 25px;
  box-sizing: border-box;

  .no-permission {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(var(--app-rgb), 0.5);

    .no-permission-icon {
      font-size: 56px;
      opacity: 0.4;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  /* ===== 标签页 ===== */
  .tab-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid rgba(var(--app-rgb), 0.08);
      background: rgba(var(--app-rgb), 0.04);
      color: rgba(var(--app-rgb), 0.6);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;

      .tab-icon {
        font-size: 16px;
      }

      &:hover {
        background: rgba(var(--app-rgb), 0.08);
        color: rgba(var(--app-rgb), 0.85);
      }

      &.active {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.3);
      }
    }
  }

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

<style lang="scss">
/* ===== 调度任务弹窗滚动 =====
   NModal 默认 teleport 到 body，scoped 样式无法作用于 naive-ui 内部的 .n-card 结构，
   故在全局样式中处理卡片布局与滚动。 */
.scheduler-modal {
  display: flex;
  flex-direction: column;
  max-height: 80vh;

  .n-card-header {
    flex-shrink: 0;
  }

  .n-card-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: color-mix(in srgb, var(--n-text-color) 18%, transparent);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--n-text-color) 30%, transparent);
    }
  }
}
</style>
