<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NCheckbox, NCheckboxGroup, NCard, NGrid, NGridItem, NInput, NPagination, NModal, NSwitch } from 'naive-ui';
import dayjs from 'dayjs';
import { fetchGetUserPageList, fetchSaveUser, fetchUpdateUser, fetchDeleteUser, fetchGetAllRoles } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';

defineOptions({ name: 'UserManagePage' });

const { isAdmin } = useAuth(); // 用户管理仅管理员可见
const { dictLabel, dictOptions } = useDict();

/* ===== 列表与分页 ===== */

const loading = ref(false);
const list = ref<Api.System.SysUserVo[]>([]);
const pagination = reactive({
  nickName: '',
  status: null as string | null,
  current: 1,
  size: 6,
  total: 0
});

/** 状态筛选选项（来自字典 status） */
const statusOptions = computed(() => dictOptions('status'));

/* ===== 自定义下拉（不使用组件） ===== */

/** 状态下拉展开状态 */
const statusMenuOpen = ref(false);

/** 选择状态（再次点击同一项则取消筛选，点击搜索按钮后生效） */
const handleStatusSelect = (value: string) => {
  pagination.status = pagination.status === value ? null : value;
  statusMenuOpen.value = false;
};

/** 日期格式化 */
const formatDate = (date?: string | null) => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

/** 状态文案（来自字典 status） */
const getStatusText = (status?: string | null) =>
  dictLabel('status', status || '') || (status === '1' ? $t('userManage.enabled') : $t('userManage.disabled'));

/** 加载分页数据 */
const loadData = async () => {
  loading.value = true;
  try {
    const params: Api.System.SysUserSearchDTO = {
      nickName: pagination.nickName || null,
      status: pagination.status || null,
      current: pagination.current,
      size: pagination.size
    };
    const { data, error } = await fetchGetUserPageList(params);
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

/** 重置查询条件 */
const handleReset = () => {
  pagination.nickName = '';
  pagination.status = null;
  pagination.current = 1;
  loadData();
};

/** 分页切换 */
const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/* ===== 新增 / 编辑 ===== */

/** 编辑弹窗显示状态 */
const showEditModal = ref(false);
/** 编辑保存加载状态 */
const editLoading = ref(false);
/** 是否编辑模式（false 为新增） */
const isEditMode = ref(true);
/** 编辑表单 */
const editForm = reactive({
  id: '',
  nickName: '',
  status: '1',
  /** 已选角色编码列表 */
  userRoles: []
});

/** 全部角色选项（来自 /sysRole/getAllRoles） */
const roleOptions = ref<Api.System.SysRoleOptionVo[]>([]);
/** 角色加载状态 */
const roleLoading = ref(false);

/** 加载全部角色 */
const loadRoleOptions = async () => {
  roleLoading.value = true;
  try {
    const { data, error } = await fetchGetAllRoles();
    if (!error && data) {
      roleOptions.value = data || [];
    }
  } finally {
    roleLoading.value = false;
  }
};

/** 打开新增弹窗 */
const handleCreate = () => {
  isEditMode.value = false;
  Object.assign(editForm, {
    id: '',
    nickName: '',
    status: '1',
    userRoles: []
  });
  showEditModal.value = true;
};

/** 打开编辑弹窗 */
const handleEdit = (row: Api.System.SysUserVo) => {
  isEditMode.value = true;
  Object.assign(editForm, {
    id: String(row.id ?? ''),
    nickName: row.nickName || '',
    status: row.status === '1' ? '1' : '0',
    userRoles: [...(row.userRoles || [])]
  });
  showEditModal.value = true;
};

/** 保存（新增 / 修改） */
const handleEditSubmit = async () => {
  const nickName = editForm.nickName.trim();
  if (!nickName) {
    window.$message?.warning($t('userManage.messages.pleaseEnterNickName'));
    return;
  }
  const params: Api.System.SysUserFormDTO = {
    id: isEditMode.value ? editForm.id : undefined,
    nickName,
    status: editForm.status,
    userRoles: editForm.userRoles
  };
  editLoading.value = true;
  try {
    const { error } = isEditMode.value
      ? await fetchUpdateUser(params)
      : await fetchSaveUser(params);
    if (error) {
      window.$message?.error(error.message || (isEditMode.value ? $t('userManage.messages.saveFailed') : $t('userManage.messages.addFailed')));
      return;
    }
    window.$message?.success(isEditMode.value ? $t('userManage.messages.saveSuccess') : $t('userManage.messages.addSuccess'));
    showEditModal.value = false;
    loadData();
  } finally {
    editLoading.value = false;
  }
};

/* ===== 删除确认 ===== */

/** 删除确认弹窗显示状态 */
const showDeleteModal = ref(false);
/** 删除加载状态 */
const deleteLoading = ref(false);
/** 当前待删除用户 */
const currentDeleteRow = ref<Api.System.SysUserVo | null>(null);

/** 打开删除确认弹窗 */
const handleDelete = (row: Api.System.SysUserVo) => {
  currentDeleteRow.value = row;
  showDeleteModal.value = true;
};

/** 确认删除 */
const handleConfirmDelete = async () => {
  if (!currentDeleteRow.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchDeleteUser(String(currentDeleteRow.value.id));
    if (error) {
      window.$message?.error(error.message || $t('userManage.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('userManage.messages.deleteSuccess'));
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

onMounted(() => {
  if (isAdmin.value) {
    loadData();
    loadRoleOptions();
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
            <SvgIcon icon="tabler:users" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.userManage') }}</h1>
              <span class="page-subtitle">{{ $t('userManage.subtitle') }}</span>
            </div>
          </div>
          <button class="icon-btn primary" :title="$t('userManage.addUser')" @click="handleCreate">
            <SvgIcon icon="mdi:plus" />
          </button>
        </div>
      </template>

      <div class="user-manage-container">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-field">
            <span class="field-label">{{ $t('userManage.nickName') }}</span>
            <div class="search-box">
              <NInput v-model:value="pagination.nickName" :placeholder="$t('userManage.nickNamePlaceholder')" clearable size="small" />
            </div>
          </div>
          <div class="search-field">
            <span class="field-label">{{ $t('userManage.status') }}</span>
            <div class="custom-select" :class="{ open: statusMenuOpen }">
              <div class="select-trigger" @click.stop="statusMenuOpen = !statusMenuOpen">
                <span class="select-value" :class="{ placeholder: !pagination.status }">
                  {{ pagination.status ? (dictLabel('status', pagination.status) || $t('userManage.all')) : $t('userManage.all') }}
                </span>
                <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
              </div>
              <transition name="select-fade">
                <div v-if="statusMenuOpen" class="select-menu">
                  <div v-for="opt in statusOptions" :key="opt.value" class="select-option"
                    :class="{ active: pagination.status === opt.value }" @click="handleStatusSelect(opt.value)">
                    <span>{{ opt.label }}</span>
                    <SvgIcon v-if="pagination.status === opt.value" icon="mdi:check" class="option-check" />
                  </div>
                </div>
              </transition>
            </div>
          </div>
          <button class="search-btn" @click="handleSearch">
            <SvgIcon icon="mdi:magnify" />
            <span>{{ $t('userManage.search') }}</span>
          </button>
          <button class="search-btn reset" @click="handleReset">
            <SvgIcon icon="mdi:refresh" />
            <span>{{ $t('userManage.reset') }}</span>
          </button>
        </div>

        <!-- 无权限提示 -->
        <div v-if="!isAdmin" class="no-permission">
          <SvgIcon icon="mdi:shield-lock" class="no-permission-icon" />
          <p>{{ $t('userManage.noPermission') }}</p>
        </div>

        <!-- 用户卡片列表 -->
        <div v-else class="card-list">
          <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
              <div class="user-card" :class="{ disabled: row.status !== '1' }"
                :style="{ '--delay': `${index * 0.04}s` }">
                <div class="card-header">
                  <div class="user-info">
                    <div class="user-icon-wrap">
                      <img v-if="row.avatar" :src="row.avatar" class="user-avatar" alt="avatar" />
                      <SvgIcon v-else icon="mdi:account" class="user-icon" />
                    </div>
                    <div class="user-title">
                      <span class="user-name" :title="row.nickName">{{ row.nickName || $t('userManage.noNickName') }}</span>
                    </div>
                  </div>
                  <div class="status-badge" :class="{ enabled: row.status === '1' }">
                    <span class="dot" />
                    {{ getStatusText(row.status) }}
                  </div>
                </div>

                <div class="user-roles">
                  <template v-if="row.userRoles && row.userRoles.length">
                    <span v-for="role in row.userRoles" :key="role" class="role-tag">{{ role }}</span>
                  </template>
                  <span v-else class="no-role">{{ $t('userManage.noRole') }}</span>
                </div>

                <div class="user-bindings">
                  <span class="bind-item" :class="{ bound: !!row.qqOpenId }">
                    <SvgIcon icon="mdi:qqchat" class="bind-icon" />
                    {{ row.qqOpenId ? $t('userManage.qqBound') : $t('userManage.qqNotBound') }}
                  </span>
                  <span class="bind-item" :class="{ bound: !!row.steamOpenId }">
                    <SvgIcon icon="mdi:steam" class="bind-icon" />
                    {{ row.steamOpenId ? $t('userManage.steamBound') : $t('userManage.steamNotBound') }}
                  </span>
                </div>

                <div class="card-footer">
                  <div class="footer-info">
                    <div class="footer-item">
                      <SvgIcon icon="mdi:login" class="footer-icon" />
                      <span>{{ $t('userManage.lastLogin', { time: formatDate(row.lastLoginTime) }) }}</span>
                    </div>
                    <div class="footer-item">
                      <SvgIcon icon="mdi:clock-outline" class="footer-icon" />
                      <span>{{ $t('userManage.createTime', { time: formatDate(row.createTime) }) }}</span>
                    </div>
                  </div>
                  <div class="footer-actions">
                    <button class="footer-action-btn edit" :title="$t('userManage.editUser')" @click="handleEdit(row)">
                      <SvgIcon icon="mdi:pencil" />
                    </button>
                    <button class="footer-action-btn delete" :title="$t('userManage.deleteUser')" @click="handleDelete(row)">
                      <SvgIcon icon="mdi:delete" />
                    </button>
                  </div>
                </div>
              </div>
            </NGridItem>

            <!-- 骨架屏 -->
            <NGridItem v-if="loading" v-for="i in 6" :key="`skeleton-${i}`" span="3 s:2 m:1 l:1">
              <div class="user-card skeleton">
                <div class="skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </NGridItem>
          </NGrid>

          <!-- 空状态 -->
          <div v-if="!loading && list.length === 0" class="empty-state">
            <SvgIcon icon="mdi:account-off-outline" class="empty-icon" />
            <p>{{ $t('userManage.empty') }}</p>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > 0" class="pagination-bar">
          <NPagination v-model:value="pagination.current" :total="pagination.total" :item-count="pagination.total"
            :page-size="pagination.size" @update-page="handlePageChange" />
        </div>
      </div>

      <!-- 编辑 / 新增弹窗 -->
      <NModal v-model:show="showEditModal" preset="card" class="w-480px rounded-16px" :bordered="false" size="small"
        :closable="true">
        <template #header>
          <div class="modal-header">
            <SvgIcon :icon="isEditMode ? 'mdi:pencil' : 'mdi:plus'" class="modal-header-icon" />
            <span>{{ isEditMode ? $t('userManage.editUser') : $t('userManage.addUser') }}</span>
          </div>
        </template>
        <div class="modal-form">
          <div class="form-item">
            <label class="form-label">{{ $t('userManage.nickName') }}</label>
            <NInput v-model:value="editForm.nickName" :placeholder="$t('userManage.nickNamePlaceholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('userManage.userRole') }}</label>
            <div class="role-box">
              <div v-if="roleLoading" class="role-loading">{{ $t('userManage.roleLoading') }}</div>
              <div v-else-if="roleOptions.length === 0" class="role-loading">{{ $t('userManage.noRoleData') }}</div>
              <NCheckboxGroup v-else v-model:value="editForm.userRoles">
                <div v-for="role in roleOptions" :key="role.id" class="role-item">
                  <NCheckbox :value="role.roleCode">
                    <span class="role-name">{{ role.roleName }}</span>
                    <span class="role-code">{{ role.roleCode }}</span>
                  </NCheckbox>
                </div>
              </NCheckboxGroup>
            </div>
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('userManage.isEnabled') }}</label>
            <div class="switch-wrap">
              <NSwitch v-model:value="editForm.status" :checked-value="'1'" :unchecked-value="'0'" />
              <span class="switch-text">{{ editForm.status === '1' ? $t('userManage.enabled') : $t('userManage.disabled') }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="action-btn cancel" @click="showEditModal = false">{{ $t('userManage.cancel') }}</button>
            <button class="action-btn confirm" :disabled="editLoading" @click="handleEditSubmit">
              <SvgIcon icon="mdi:check" />
              <span>{{ editLoading ? $t('userManage.saving') : $t('userManage.save') }}</span>
            </button>
          </div>
        </div>
      </NModal>

      <!-- 删除确认弹窗 -->
      <NModal v-model:show="showDeleteModal" preset="card" class="delete-modal rounded-16px w-400px" :bordered="false"
        size="small" :closable="false">
        <template #header>
          <div class="delete-modal-header">
            <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
            <span>{{ $t('userManage.deleteConfirmTitle') }}</span>
          </div>
        </template>
        <div class="delete-modal-body">
          <p class="delete-modal-text">
            {{ $t('userManage.deleteConfirmPrefix') }}
            <span class="delete-modal-target">{{ currentDeleteRow?.nickName }}</span>
            {{ $t('userManage.deleteConfirmSuffix') }}
          </p>
          <p class="delete-modal-tip">{{ $t('userManage.deleteConfirmTip') }}</p>
        </div>
        <div class="delete-modal-actions">
          <button class="action-btn cancel" @click="handleCloseDeleteModal">{{ $t('userManage.cancel') }}</button>
          <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
            <SvgIcon icon="mdi:delete" />
            <span>{{ deleteLoading ? $t('userManage.deleting') : $t('userManage.delete') }}</span>
          </button>
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

.user-manage-container {
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
    flex-wrap: wrap;
    gap: 10px;
    flex-shrink: 0;

    .search-field {
      display: flex;
      align-items: center;
      gap: 6px;

      .field-label {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.5);
        white-space: nowrap;
      }
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 168px;
      height: 34px;
      padding: 0 8px;
      border-radius: 8px;
      background: rgba(var(--app-rgb), 0.05);
      border: 1px solid rgba(var(--app-rgb), 0.08);
      transition: all 0.25s ease;

      &:focus-within {
        border-color: rgba(102, 126, 234, 0.5);
        background: rgba(var(--app-rgb), 0.08);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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

    .custom-select {
      position: relative;
      width: 168px;

      .select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        height: 34px;
        padding: 0 10px;
        border-radius: 8px;
        background: rgba(var(--app-rgb), 0.05);
        border: 1px solid rgba(var(--app-rgb), 0.08);
        cursor: pointer;
        transition: all 0.25s ease;
        box-sizing: border-box;

        &:hover {
          background: rgba(var(--app-rgb), 0.08);
        }

        .select-value {
          flex: 1;
          font-size: 13px;
          color: rgba(var(--app-rgb), 0.9);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &.placeholder {
            color: rgba(var(--app-rgb), 0.35);
          }
        }

        .select-arrow {
          font-size: 14px;
          color: rgba(var(--app-rgb), 0.4);
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }
      }

      &.open {
        .select-trigger {
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(var(--app-rgb), 0.08);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .select-arrow {
          transform: rotate(180deg);
        }
      }

      .select-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        z-index: 10;
        padding: 4px;
        border-radius: 10px;
        background: rgba(28, 32, 44, 0.98);
        border: 1px solid rgba(var(--app-rgb), 0.1);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);

        .select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: rgba(var(--app-rgb), 0.8);
          transition: all 0.2s ease;

          &:hover {
            background: rgba(102, 126, 234, 0.15);
            color: #667eea;
          }

          &.active {
            color: #667eea;
            font-weight: 600;
          }

          .option-check {
            font-size: 14px;
            color: #667eea;
          }
        }
      }
    }

    .search-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 34px;
      padding: 0 16px;
      border: none;
      border-radius: 8px;
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

      &.reset {
        color: rgba(var(--app-rgb), 0.75);
        background: rgba(var(--app-rgb), 0.06);
        border-color: rgba(var(--app-rgb), 0.1);

        &:hover {
          background: rgba(var(--app-rgb), 0.12);
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

  .user-card {
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

    &.disabled {
      border-color: rgba(245, 87, 108, 0.2);
      opacity: 0.85;

      &:hover {
        border-color: rgba(245, 87, 108, 0.4);
      }

      .status-badge {
        background: rgba(245, 87, 108, 0.12);
        color: #f5576c;
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;

        .user-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.12);
          flex-shrink: 0;
          overflow: hidden;

          .user-icon {
            font-size: 22px;
            color: #667eea;
          }

          .user-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .user-title {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .user-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--n-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        color: rgba(var(--app-rgb), 0.55);
        background: rgba(var(--app-rgb), 0.06);
        white-space: nowrap;
        flex-shrink: 0;

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(var(--app-rgb), 0.3);
        }

        &.enabled {
          color: #43e97b;
          background: rgba(67, 233, 123, 0.1);
          border: 1px solid rgba(67, 233, 123, 0.2);

          .dot {
            background: #43e97b;
            box-shadow: 0 0 4px rgba(67, 233, 123, 0.6);
          }
        }
      }
    }

    .user-roles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      flex: 1;
      align-content: flex-start;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(var(--app-rgb), 0.03);
      min-height: 42px;
      box-sizing: border-box;

      .role-tag {
        display: inline-flex;
        align-items: center;
        padding: 3px 9px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 500;
        color: #7c8cf8;
        background: rgba(124, 140, 248, 0.12);
        border: 1px solid rgba(124, 140, 248, 0.2);
      }

      .no-role {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.35);
      }
    }

    .user-bindings {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      .bind-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11.5px;
        color: rgba(var(--app-rgb), 0.35);

        .bind-icon {
          font-size: 14px;
          color: rgba(var(--app-rgb), 0.35);
        }

        &.bound {
          color: #43e97b;

          .bind-icon {
            color: #43e97b;
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

      .footer-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

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

/* 下拉菜单展开/收起过渡 */
.select-fade-enter-active,
.select-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.select-fade-enter-from,
.select-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ================================ 编辑弹窗 ================================ */

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);

  .modal-header-icon {
    font-size: 18px;
    color: #667eea;
  }
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

    .role-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 180px;
      overflow-y: auto;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(var(--app-rgb), 0.08);
      background: rgba(var(--app-rgb), 0.03);

      .role-loading {
        padding: 20px 0;
        text-align: center;
        font-size: 12.5px;
        color: rgba(var(--app-rgb), 0.45);
      }

      .role-item {
        display: flex;
        align-items: center;
        padding: 5px 8px;
        border-radius: 8px;
        transition: background 0.2s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.05);
        }

        .role-name {
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(var(--app-rgb), 0.85);
          margin-right: 8px;
        }

        .role-code {
          font-size: 12px;
          color: rgba(var(--app-rgb), 0.45);
          font-family: 'JetBrains Mono', Consolas, monospace;
        }
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

      &.cancel {
        &:hover {
          background: rgba(var(--app-rgb), 0.12);
        }
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

/* ================================ 删除确认弹窗 ================================ */

.delete-modal {
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

      &.cancel {
        &:hover {
          background: rgba(var(--app-rgb), 0.12);
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
  }
}
</style>
