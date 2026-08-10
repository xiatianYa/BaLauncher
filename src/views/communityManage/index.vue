<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NCard, NGrid, NGridItem, NInput, NInputNumber, NPagination, NModal, NSwitch, NUpload } from 'naive-ui';
import type { UploadCustomRequestOptions } from 'naive-ui';
import dayjs from 'dayjs';
import {
  fetchGetCommunityPage,
  fetchInsertCommunity,
  fetchUpdateCommunity,
  fetchDeleteCommunityById,
  fetchGetServerList,
  fetchInsertServer,
  fetchUpdateServer,
  fetchDeleteServerById,
  fetchUploadFile
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';

defineOptions({ name: 'CommunityManagePage' });

/* ==================== 基础 ==================== */

const { isAdmin } = useAuth(); // 社区管理仅管理员可见

/** 日期格式化 */
const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

/* ==================== 社区列表与分页 ==================== */

const loading = ref(false);
const list = ref<Api.Game.Community[]>([]);
/** 分页查询条件 */
const pagination = reactive({
  communityName: '',
  current: 1,
  size: 9,
  total: 0
});

/** 加载社区分页 */
const loadData = async () => {
  loading.value = true;
  try {
    const params: Api.Game.CommunitySearchParams = {
      communityName: pagination.communityName || null,
      current: pagination.current,
      size: pagination.size
    };
    const { data, error } = await fetchGetCommunityPage(params);
    if (!error && data) {
      list.value = data.records || [];
      pagination.total = data.total || 0;
    }
  } finally {
    loading.value = false;
  }
};

/** 搜索 */
const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

/** 重置搜索条件 */
const handleReset = () => {
  Object.assign(pagination, { communityName: '', current: 1 });
  loadData();
};

/** 分页切换 */
const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/* ==================== 社区新增 / 编辑 ==================== */

const showEditModal = ref(false);
const editLoading = ref(false);
const logoUploadLoading = ref(false);
const isEditMode = ref(false); // false 为新增
/** 社区编辑表单 */
const editForm = reactive({
  id: '',
  communityName: '',
  logo: '',
  website: ''
});

/** 重置编辑表单 */
const resetEditForm = () => {
  Object.assign(editForm, { id: '', communityName: '', logo: '', website: '' });
};

/** 打开新增弹窗 */
const handleCreate = () => {
  isEditMode.value = false;
  resetEditForm();
  showEditModal.value = true;
};

/** 打开编辑弹窗 */
const handleEdit = (row: Api.Game.Community) => {
  isEditMode.value = true;
  Object.assign(editForm, {
    id: String(row.id ?? ''),
    communityName: row.communityName || '',
    logo: row.logo || '',
    website: row.website || ''
  });
  showEditModal.value = true;
};

/** 上传社区图标（参考 mapOrder 地图图片上传） */
const handleUploadLogo = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  logoUploadLoading.value = true;
  try {
    const { data, error } = await fetchUploadFile(file.file as File);
    if (error || !data) {
      window.$message?.error($t('communityManage.form.logoUploadFailed'));
      onError();
      return;
    }
    editForm.logo = data.url;
    window.$message?.success($t('communityManage.form.logoUploadSuccess'));
    onFinish();
  } finally {
    logoUploadLoading.value = false;
  }
};

/** 保存社区（新增 / 修改） */
const handleEditSubmit = async () => {
  const communityName = editForm.communityName.trim();
  if (!communityName) {
    window.$message?.warning($t('communityManage.messages.nameRequired'));
    return;
  }
  const params: Api.Game.CommunityParams = {
    communityName,
    logo: editForm.logo.trim(),
    website: editForm.website.trim()
  };
  if (isEditMode.value) {
    params.id = Number(editForm.id);
  }
  editLoading.value = true;
  try {
    const { error } = isEditMode.value ? await fetchUpdateCommunity(params) : await fetchInsertCommunity(params);
    if (error) {
      window.$message?.error(error.message || (isEditMode.value ? $t('communityManage.messages.saveFailed') : $t('communityManage.messages.addFailed')));
      return;
    }
    window.$message?.success(isEditMode.value ? $t('communityManage.messages.saveSuccess') : $t('communityManage.messages.addSuccess'));
    showEditModal.value = false;
    loadData();
  } finally {
    editLoading.value = false;
  }
};

/* ==================== 社区删除确认 ==================== */

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const currentDeleteRow = ref<Api.Game.Community | null>(null);

/** 打开删除确认弹窗 */
const handleDelete = (row: Api.Game.Community) => {
  currentDeleteRow.value = row;
  showDeleteModal.value = true;
};

/** 确认删除社区 */
const handleConfirmDelete = async () => {
  if (!currentDeleteRow.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchDeleteCommunityById(Number(currentDeleteRow.value.id));
    if (error) {
      window.$message?.error(error.message || $t('communityManage.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('communityManage.messages.deleteSuccess'));
    showDeleteModal.value = false;
    currentDeleteRow.value = null;
    loadData();
  } finally {
    deleteLoading.value = false;
  }
};

/** 关闭删除确认弹窗 */
const handleCloseDeleteModal = () => {
  showDeleteModal.value = false;
  currentDeleteRow.value = null;
};

/* ==================== 服务器管理（按社区） ==================== */

const showServerModal = ref(false);
const currentCommunity = ref<Api.Game.Community | null>(null);

const serverLoading = ref(false);
const serverList = ref<Api.Game.Server[]>([]);

/** 打开服务器管理弹窗（按当前社区过滤服务器列表） */
const handleOpenServer = (row: Api.Game.Community) => {
  currentCommunity.value = row;
  showServerModal.value = true;
  loadServerData();
};

/** 加载当前社区下的服务器（全量列表按社区 ID 过滤） */
const loadServerData = async () => {
  if (!currentCommunity.value) return;
  serverLoading.value = true;
  try {
    const { data, error } = await fetchGetServerList();
    if (!error && data) {
      const communityId = Number(currentCommunity.value.id);
      serverList.value = data.filter(server => Number(server.communityId) === communityId);
    }
  } finally {
    serverLoading.value = false;
  }
};

/** 是否统计 / 查询 文案 */
const getYesNoText = (flag?: string) =>
  flag === '1' ? $t('communityManage.server.yes') : $t('communityManage.server.no');

/* ==================== 服务器新增 / 编辑 ==================== */

const showServerEditModal = ref(false);
const serverEditLoading = ref(false);
const isServerEditMode = ref(false); // false 为新增
/** 服务器编辑表单 */
const serverEditForm = reactive({
  id: '',
  serverName: '',
  ip: '',
  port: '',
  sort: 0,
  isStatistics: '1',
  isQuery: '1',
  connectStr: ''
});

/** 重置服务器编辑表单 */
const resetServerEditForm = () => {
  Object.assign(serverEditForm, {
    id: '',
    serverName: '',
    ip: '',
    port: '',
    sort: 0,
    isStatistics: '1',
    isQuery: '1',
    connectStr: ''
  });
};

/** 打开服务器新增弹窗 */
const handleServerCreate = () => {
  isServerEditMode.value = false;
  resetServerEditForm();
  showServerEditModal.value = true;
};

/** 打开服务器编辑弹窗 */
const handleServerEdit = (row: Api.Game.Server) => {
  isServerEditMode.value = true;
  Object.assign(serverEditForm, {
    id: String(row.id ?? ''),
    serverName: row.serverName || '',
    ip: row.ip || '',
    port: row.port || '',
    sort: row.sort ?? 0,
    isStatistics: row.isStatistics === '1' ? '1' : '0',
    isQuery: row.isQuery === '1' ? '1' : '0',
    connectStr: row.connectStr || ''
  });
  showServerEditModal.value = true;
};

/** 保存服务器（新增 / 修改，社区 ID 取自 currentCommunity） */
const handleServerEditSubmit = async () => {
  if (!currentCommunity.value) return;
  const serverName = serverEditForm.serverName.trim();
  const ip = serverEditForm.ip.trim();
  if (!serverName || !ip) {
    window.$message?.warning(!serverName ? $t('communityManage.server.messages.nameRequired') : $t('communityManage.server.messages.ipRequired'));
    return;
  }
  const params: Api.Game.ServerParams = {
    serverName,
    communityId: String(currentCommunity.value.id),
    ip,
    port: serverEditForm.port.trim(),
    sort: serverEditForm.sort ?? 0,
    isStatistics: serverEditForm.isStatistics,
    isQuery: serverEditForm.isQuery,
    connectStr: serverEditForm.connectStr.trim()
  };
  if (isServerEditMode.value) {
    params.id = Number(serverEditForm.id);
  }
  serverEditLoading.value = true;
  try {
    const { error } = isServerEditMode.value ? await fetchUpdateServer(params) : await fetchInsertServer(params);
    if (error) {
      window.$message?.error(error.message || (isServerEditMode.value ? $t('communityManage.server.messages.saveFailed') : $t('communityManage.server.messages.addFailed')));
      return;
    }
    window.$message?.success(isServerEditMode.value ? $t('communityManage.server.messages.saveSuccess') : $t('communityManage.server.messages.addSuccess'));
    showServerEditModal.value = false;
    loadServerData();
  } finally {
    serverEditLoading.value = false;
  }
};

/* ==================== 服务器删除确认 ==================== */

const showServerDeleteModal = ref(false);
const serverDeleteLoading = ref(false);
const currentDeleteServer = ref<Api.Game.Server | null>(null);

/** 打开服务器删除确认弹窗 */
const handleServerDelete = (row: Api.Game.Server) => {
  currentDeleteServer.value = row;
  showServerDeleteModal.value = true;
};

/** 确认删除服务器 */
const handleConfirmServerDelete = async () => {
  if (!currentDeleteServer.value) return;
  serverDeleteLoading.value = true;
  try {
    const { error } = await fetchDeleteServerById(Number(currentDeleteServer.value.id));
    if (error) {
      window.$message?.error(error.message || $t('communityManage.server.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('communityManage.server.messages.deleteSuccess'));
    showServerDeleteModal.value = false;
    currentDeleteServer.value = null;
    loadServerData();
  } finally {
    serverDeleteLoading.value = false;
  }
};

/** 关闭服务器删除确认弹窗 */
const handleCloseServerDeleteModal = () => {
  showServerDeleteModal.value = false;
  currentDeleteServer.value = null;
};

/* ==================== 生命周期 ==================== */

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
      <!-- 头部：标题 + 副标题（参考 dictManager） -->
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:account-supervisor-outline" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.communityManage') }}</h1>
              <span class="page-subtitle">{{ $t('communityManage.subtitle') }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="community-manage-container">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-box">
            <SvgIcon icon="mdi:magnify" class="search-icon" />
            <NInput v-model:value="pagination.communityName" :placeholder="$t('communityManage.search.name')" clearable
              size="small" @keyup.enter="handleSearch" />
          </div>
          <button class="search-btn" :title="$t('communityManage.search.btn')" @click="handleSearch">
            <SvgIcon icon="mdi:magnify" />
            <span>{{ $t('communityManage.search.btn') }}</span>
          </button>
          <button class="reset-btn" :title="$t('communityManage.search.resetTitle')" @click="handleReset">
            <SvgIcon icon="mdi:refresh" />
            <span>{{ $t('communityManage.search.reset') }}</span>
          </button>
          <button class="icon-btn primary" :title="$t('communityManage.search.add')" @click="handleCreate">
            <SvgIcon icon="mdi:plus" />
          </button>
        </div>

        <!-- 无权限提示 -->
        <div v-if="!isAdmin" class="no-permission">
          <SvgIcon icon="mdi:shield-lock" class="no-permission-icon" />
          <p>{{ $t('communityManage.noPermission') }}</p>
        </div>

        <!-- 社区卡片列表 -->
        <div v-else class="card-list">
          <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
              <div class="community-card" :style="{ '--delay': `${index * 0.04}s` }">
                <div class="card-header">
                  <div class="community-info">
                    <div class="community-logo-wrap">
                      <img v-if="row.logo" v-lazy="row.logo" class="community-logo" alt="logo" />
                      <SvgIcon v-else icon="mdi:account-group" class="community-logo fallback" />
                    </div>
                    <div class="community-title">
                      <span class="community-name" :title="row.communityName">{{ row.communityName || $t('communityManage.unnamed') }}</span>
                      <span class="community-id">#{{ row.id }}</span>
                    </div>
                  </div>
                </div>

                <div class="community-desc">
                  <SvgIcon icon="mdi:earth" class="desc-icon" />
                  <a v-if="row.website" :href="row.website" target="_blank" rel="noopener noreferrer"
                    class="desc-text website" :title="row.website">{{ row.website }}</a>
                  <span v-else class="desc-text">{{ $t('communityManage.noWebsite') }}</span>
                </div>

                <div class="card-footer">
                  <div class="footer-item">
                    <SvgIcon icon="mdi:clock-outline" class="footer-icon" />
                    <span>{{ $t('communityManage.createTime') }}{{ formatDate(row.createTime) }}</span>
                  </div>
                  <div class="footer-actions">
                    <button class="footer-action-btn item" :title="$t('communityManage.manageServers')"
                      @click="handleOpenServer(row)">
                      <SvgIcon icon="mdi:server" />
                    </button>
                    <button class="footer-action-btn edit" :title="$t('communityManage.edit')" @click="handleEdit(row)">
                      <SvgIcon icon="mdi:pencil" />
                    </button>
                    <button class="footer-action-btn delete" :title="$t('communityManage.delete')" @click="handleDelete(row)">
                      <SvgIcon icon="mdi:delete" />
                    </button>
                  </div>
                </div>
              </div>
            </NGridItem>

            <!-- 骨架屏 -->
            <NGridItem v-if="loading" v-for="i in 6" :key="`skeleton-${i}`" span="3 s:2 m:1 l:1">
              <div class="community-card skeleton">
                <div class="skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </NGridItem>
          </NGrid>

          <!-- 空状态 -->
          <div v-if="!loading && list.length === 0" class="empty-state">
            <SvgIcon icon="mdi:account-group-outline" class="empty-icon" />
            <p>{{ $t('communityManage.empty') }}</p>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > 0" class="pagination-bar">
          <NPagination v-model:page="pagination.current" :item-count="pagination.total"
            :page-size="pagination.size" @update-page="handlePageChange" />
        </div>
      </div>

      <!-- 社区新增 / 编辑弹窗 -->
      <NModal v-model:show="showEditModal" preset="card" class="w-480px rounded-16px" :bordered="false" size="small"
        :closable="true">
        <template #header>
          <div class="modal-header">
            <SvgIcon :icon="isEditMode ? 'mdi:pencil' : 'mdi:plus'" class="modal-header-icon" />
            <span>{{ isEditMode ? $t('communityManage.form.editTitle') : $t('communityManage.form.addTitle') }}</span>
          </div>
        </template>
        <div class="modal-form">
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.form.nameLabel') }}</label>
            <NInput v-model:value="editForm.communityName" :placeholder="$t('communityManage.form.namePlaceholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.form.logoLabel') }}</label>
            <NUpload accept="image/*" :max="1" :show-file-list="false" :custom-request="handleUploadLogo">
              <div class="logo-upload-trigger">
                <img v-if="editForm.logo" :src="editForm.logo" class="logo-upload-preview" alt="logo" />
                <div v-else class="logo-upload-placeholder">
                  <SvgIcon icon="material-symbols:add-photo-alternate-outline" class="placeholder-icon" />
                  <span>{{ logoUploadLoading ? $t('communityManage.form.logoUploading') : $t('communityManage.form.logoUploadTip') }}</span>
                </div>
              </div>
            </NUpload>
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.form.websiteLabel') }}</label>
            <NInput v-model:value="editForm.website" :placeholder="$t('communityManage.form.websitePlaceholder')" clearable />
          </div>
          <div class="modal-actions">
            <button class="action-btn cancel" @click="showEditModal = false">{{ $t('common.cancel') }}</button>
            <button class="action-btn confirm" :disabled="editLoading" @click="handleEditSubmit">
              <SvgIcon icon="mdi:check" />
              <span>{{ editLoading ? $t('communityManage.form.saving') : $t('communityManage.form.save') }}</span>
            </button>
          </div>
        </div>
      </NModal>

      <!-- 社区删除确认弹窗 -->
      <NModal v-model:show="showDeleteModal" preset="card" class="delete-modal rounded-16px w-400px" :bordered="false"
        size="small" :closable="false">
        <template #header>
          <div class="delete-modal-header">
            <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
            <span>{{ $t('communityManage.deleteModal.title') }}</span>
          </div>
        </template>
        <div class="delete-modal-body">
          <p class="delete-modal-text">
            {{ $t('communityManage.deleteModal.confirmPrefix') }}
            <span class="delete-modal-target">{{ currentDeleteRow?.communityName }}</span>
            {{ $t('communityManage.deleteModal.confirmSuffix') }}
          </p>
          <p class="delete-modal-tip">{{ $t('communityManage.deleteModal.tip') }}</p>
        </div>
        <div class="delete-modal-actions">
          <button class="action-btn cancel" @click="handleCloseDeleteModal">{{ $t('common.cancel') }}</button>
          <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
            <SvgIcon icon="mdi:delete" />
            <span>{{ deleteLoading ? $t('communityManage.deleteModal.deleting') : $t('communityManage.deleteModal.delete') }}</span>
          </button>
        </div>
      </NModal>

      <!-- 服务器管理弹窗（按社区） -->
      <NModal v-model:show="showServerModal" preset="card" class="w-900px rounded-16px" :bordered="false" size="large"
        :closable="true">
        <template #header>
          <div class="modal-header">
            <SvgIcon icon="mdi:server" class="modal-header-icon" />
            <span>{{ $t('communityManage.server.manageTitle', { name: currentCommunity?.communityName }) }}</span>
          </div>
        </template>
        <div class="server-manage">
          <!-- 工具栏：新增按钮 -->
          <div class="server-toolbar">
            <button class="server-btn add" :title="$t('communityManage.server.add')" @click="handleServerCreate">
              <SvgIcon icon="mdi:plus" />
              <span>{{ $t('communityManage.server.add') }}</span>
            </button>
          </div>

          <!-- 服务器表格 -->
          <div class="server-table">
            <div class="server-table-header">
              <span class="col-name">{{ $t('communityManage.server.column.name') }}</span>
              <span class="col-ip">{{ $t('communityManage.server.column.ip') }}</span>
              <span class="col-port">{{ $t('communityManage.server.column.port') }}</span>
              <span class="col-sort">{{ $t('communityManage.server.column.sort') }}</span>
              <span class="col-stat">{{ $t('communityManage.server.column.statistics') }}</span>
              <span class="col-query">{{ $t('communityManage.server.column.query') }}</span>
              <span class="col-connect">{{ $t('communityManage.server.column.connect') }}</span>
              <span class="col-actions">{{ $t('communityManage.server.column.actions') }}</span>
            </div>
            <div class="server-table-body">
              <div v-for="server in serverList" :key="server.id" class="server-row">
                <span class="col-name cell-text" :title="server.serverName">{{ server.serverName }}</span>
                <span class="col-ip cell-text" :title="server.ip">{{ server.ip || '-' }}</span>
                <span class="col-port cell-text" :title="server.port">{{ server.port || '-' }}</span>
                <span class="col-sort">{{ server.sort ?? 0 }}</span>
                <span class="col-stat">
                  <span class="server-flag-badge" :class="{ enabled: server.isStatistics === '1' }">
                    <span class="dot" />
                    {{ getYesNoText(server.isStatistics) }}
                  </span>
                </span>
                <span class="col-query">
                  <span class="server-flag-badge" :class="{ enabled: server.isQuery === '1' }">
                    <span class="dot" />
                    {{ getYesNoText(server.isQuery) }}
                  </span>
                </span>
                <span class="col-connect cell-text" :title="server.connectStr">{{ server.connectStr || '-' }}</span>
                <span class="col-actions">
                  <button class="server-action-btn edit" :title="$t('communityManage.server.editBtnTitle')"
                    @click="handleServerEdit(server)">
                    <SvgIcon icon="mdi:pencil" />
                  </button>
                  <button class="server-action-btn delete" :title="$t('communityManage.server.deleteBtnTitle')"
                    @click="handleServerDelete(server)">
                    <SvgIcon icon="mdi:delete" />
                  </button>
                </span>
              </div>

              <!-- 加载骨架 -->
              <template v-if="serverLoading">
                <div v-for="i in 4" :key="`server-skeleton-${i}`" class="server-row skeleton-row">
                  <span v-for="j in 8" :key="j" class="skeleton-cell" />
                </div>
              </template>

              <!-- 空状态 -->
              <div v-if="!serverLoading && serverList.length === 0" class="server-empty">
                <SvgIcon icon="mdi:server-off" class="empty-icon" />
                <p>{{ $t('communityManage.server.empty') }}</p>
              </div>
            </div>
          </div>
        </div>
      </NModal>

      <!-- 服务器新增 / 编辑弹窗 -->
      <NModal v-model:show="showServerEditModal" preset="card" class="w-480px rounded-16px" :bordered="false" size="small"
        :closable="true">
        <template #header>
          <div class="modal-header">
            <SvgIcon :icon="isServerEditMode ? 'mdi:pencil' : 'mdi:plus'" class="modal-header-icon" />
            <span>{{ isServerEditMode ? $t('communityManage.server.form.editTitle') : $t('communityManage.server.form.addTitle') }}</span>
          </div>
        </template>
        <div class="modal-form">
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.server.form.nameLabel') }}</label>
            <NInput v-model:value="serverEditForm.serverName" :placeholder="$t('communityManage.server.form.namePlaceholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.server.form.ipLabel') }}</label>
            <NInput v-model:value="serverEditForm.ip" :placeholder="$t('communityManage.server.form.ipPlaceholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.server.form.portLabel') }}</label>
            <NInput v-model:value="serverEditForm.port" :placeholder="$t('communityManage.server.form.portPlaceholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.server.form.sortLabel') }}</label>
            <NInputNumber v-model:value="serverEditForm.sort" min="0" class="w-full" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('communityManage.server.form.connectLabel') }}</label>
            <NInput v-model:value="serverEditForm.connectStr" :placeholder="$t('communityManage.server.form.connectPlaceholder')" clearable />
          </div>
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">{{ $t('communityManage.server.form.statisticsLabel') }}</label>
              <div class="switch-wrap">
                <NSwitch v-model:value="serverEditForm.isStatistics" :checked-value="'1'" :unchecked-value="'0'" />
                <span class="switch-text">{{ getYesNoText(serverEditForm.isStatistics) }}</span>
              </div>
            </div>
            <div class="form-item">
              <label class="form-label">{{ $t('communityManage.server.form.queryLabel') }}</label>
              <div class="switch-wrap">
                <NSwitch v-model:value="serverEditForm.isQuery" :checked-value="'1'" :unchecked-value="'0'" />
                <span class="switch-text">{{ getYesNoText(serverEditForm.isQuery) }}</span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="action-btn cancel" @click="showServerEditModal = false">{{ $t('common.cancel') }}</button>
            <button class="action-btn confirm" :disabled="serverEditLoading" @click="handleServerEditSubmit">
              <SvgIcon icon="mdi:check" />
              <span>{{ serverEditLoading ? $t('communityManage.server.form.saving') : $t('communityManage.server.form.save') }}</span>
            </button>
          </div>
        </div>
      </NModal>

      <!-- 服务器删除确认弹窗 -->
      <NModal v-model:show="showServerDeleteModal" preset="card" class="delete-modal rounded-16px w-400px" :bordered="false"
        size="small" :closable="false">
        <template #header>
          <div class="delete-modal-header">
            <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
            <span>{{ $t('communityManage.server.deleteModal.title') }}</span>
          </div>
        </template>
        <div class="delete-modal-body">
          <p class="delete-modal-text">
            {{ $t('communityManage.server.deleteModal.confirmPrefix') }}
            <span class="delete-modal-target">{{ currentDeleteServer?.serverName }}</span>
            {{ $t('communityManage.server.deleteModal.confirmSuffix') }}
          </p>
          <p class="delete-modal-tip">{{ $t('communityManage.server.deleteModal.tip') }}</p>
        </div>
        <div class="delete-modal-actions">
          <button class="action-btn cancel" @click="handleCloseServerDeleteModal">{{ $t('common.cancel') }}</button>
          <button class="action-btn danger" :disabled="serverDeleteLoading" @click="handleConfirmServerDelete">
            <SvgIcon icon="mdi:delete" />
            <span>{{ serverDeleteLoading ? $t('communityManage.server.deleteModal.deleting') : $t('communityManage.server.deleteModal.delete') }}</span>
          </button>
        </div>
      </NModal>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
/* 头部（参考 dictManager） */
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

.community-manage-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 14px;
  padding: 0 25px;
  box-sizing: border-box;

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

      .search-icon {
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

    .search-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 36px;
      padding: 0 16px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #667eea;
      background: rgba(102, 126, 234, 0.12);
      border: 1px solid rgba(102, 126, 234, 0.25);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(102, 126, 234, 0.22);
      }
    }

    .reset-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 36px;
      padding: 0 16px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.7);
      background: rgba(var(--app-rgb), 0.06);
      border: 1px solid rgba(var(--app-rgb), 0.1);
      transition: all 0.2s ease;

      &:hover {
        color: rgba(var(--app-rgb), 0.9);
        background: rgba(var(--app-rgb), 0.12);
        transform: translateY(-1px);
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
  }

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

  .card-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 2px;

    .n-grid {
      width: 100%;
    }
  }

  .community-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
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

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      .community-info {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;

        .community-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.12);
          flex-shrink: 0;
          overflow: hidden;

          .community-logo {
            width: 100%;
            height: 100%;
            object-fit: cover;

            &.fallback {
              font-size: 22px;
              color: #667eea;
            }
          }
        }

        .community-title {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .community-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--n-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .community-id {
            font-size: 11px;
            color: rgba(var(--app-rgb), 0.45);
            font-family: 'JetBrains Mono', Consolas, monospace;
          }
        }
      }
    }

    .community-desc {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      flex: 1;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(var(--app-rgb), 0.03);
      min-width: 0;

      .desc-icon {
        font-size: 15px;
        color: #7c8cf8;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .desc-text {
        font-size: 12.5px;
        line-height: 1.5;
        color: rgba(var(--app-rgb), 0.6);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.website {
          color: #667eea;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid rgba(var(--app-rgb), 0.06);

      .footer-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        color: rgba(var(--app-rgb), 0.4);

        .footer-icon {
          font-size: 13px;
        }
      }

      .footer-actions {
        display: flex;
        align-items: center;
        gap: 6px;

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

          &.item:hover {
            color: #36adff;
            background: rgba(54, 173, 255, 0.18);
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
  }

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

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 80px 20px;
    color: rgba(var(--app-rgb), 0.5);

    .empty-icon {
      font-size: 56px;
      opacity: 0.4;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  .pagination-bar {
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

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

/* ================================ 弹窗通用 ================================ */

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

  .form-row {
    display: flex;
    gap: 14px;

    .form-item {
      flex: 1;
    }
  }

  /* 社区图标上传（参考 mapOrder 地图图片上传） */
  .logo-upload-trigger {
    width: 120px;
    height: 120px;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    border: 1px dashed rgba(102, 126, 234, 0.4);
    background: rgba(102, 126, 234, 0.04);
    transition: border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: rgba(102, 126, 234, 0.7);
      background: rgba(102, 126, 234, 0.08);
    }

    .logo-upload-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .logo-upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 100%;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.55);

      .placeholder-icon {
        font-size: 28px;
      }
    }
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }
}

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

  &.danger {
    color: #f5576c;
    background: rgba(245, 87, 108, 0.12);
    border-color: rgba(245, 87, 108, 0.25);

    &:hover {
      background: rgba(245, 87, 108, 0.22);
    }
  }
}

/* ================================ 删除确认弹窗 ================================ */

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

/* ================================ 服务器管理 ================================ */

.server-manage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 420px;

  .server-toolbar {
    display: flex;
    align-items: center;
    flex-shrink: 0;

    .server-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 34px;
      padding: 0 14px;
      border-radius: 9px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      color: #43e97b;
      background: rgba(67, 233, 123, 0.1);
      border: 1px solid rgba(67, 233, 123, 0.25);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(67, 233, 123, 0.18);
      }
    }
  }

  .server-table {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    border: 1px solid rgba(var(--app-rgb), 0.08);
    overflow: hidden;

    .server-table-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(var(--app-rgb), 0.05);
      border-bottom: 1px solid rgba(var(--app-rgb), 0.08);
      font-size: 12px;
      font-weight: 600;
      color: rgba(var(--app-rgb), 0.55);
      flex-shrink: 0;

      .col-name { flex: 1.2; }
      .col-ip { flex: 0.9; }
      .col-port { flex: 0.6; }
      .col-sort { flex: 0.5; }
      .col-stat { flex: 0.7; }
      .col-query { flex: 0.7; }
      .col-connect { flex: 1.2; }
      .col-actions { flex: 0.8; }
    }

    .server-table-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      max-height: 340px;

      .server-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        border-bottom: 1px solid rgba(var(--app-rgb), 0.05);
        transition: background 0.2s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.04);
        }

        .col-name { flex: 1.2; }
        .col-ip { flex: 0.9; }
        .col-port { flex: 0.6; }
        .col-sort { flex: 0.5; }
        .col-stat { flex: 0.7; }
        .col-query { flex: 0.7; }
        .col-connect { flex: 1.2; }
        .col-actions { flex: 0.8; }

        .col-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cell-text {
          font-size: 12.5px;
          color: rgba(var(--app-rgb), 0.85);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .col-sort {
          font-size: 12.5px;
          color: rgba(var(--app-rgb), 0.55);
        }

        .server-flag-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 500;
          color: rgba(var(--app-rgb), 0.55);
          background: rgba(var(--app-rgb), 0.06);
          white-space: nowrap;

          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(var(--app-rgb), 0.3);
          }

          &.enabled {
            color: #43e97b;
            background: rgba(67, 233, 123, 0.1);

            .dot {
              background: #43e97b;
              box-shadow: 0 0 4px rgba(67, 233, 123, 0.6);
            }
          }
        }

        .server-action-btn {
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

      .skeleton-row {
        pointer-events: none;

        .skeleton-cell {
          flex: 1;
          height: 14px;
          border-radius: 4px;
          background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      }

      .server-empty {
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
    }
  }
}
</style>
