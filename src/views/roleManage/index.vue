<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NCard, NGrid, NGridItem, NInput, NPagination, NModal, NSwitch, NCheckbox, NCheckboxGroup } from 'naive-ui';
import dayjs from 'dayjs';
import {
  fetchGetRolePageList,
  fetchSaveRole,
  fetchUpdateRole,
  fetchDeleteRole,
  fetchGetPermissionList,
  fetchGetRolePermissions
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';

defineOptions({ name: 'RoleManagePage' });

const { isSuperAdmin } = useAuth(); // 角色管理仅超级管理员可见

/* ===== 列表与分页 ===== */

const loading = ref(false);
const list = ref<Api.System.SysRoleVo[]>([]);
const pagination = reactive({
  roleName: '',
  current: 1,
  size: 6,
  total: 0
});

/** 日期格式化 */
const formatDate = (date?: string | null) => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

/** 状态文案 */
const getStatusText = (status?: string | null) => (status === '1' ? '启用' : '禁用');

/** 加载分页数据 */
const loadData = async () => {
  loading.value = true;
  try {
    const params: Api.System.SysRoleSearchDTO = {
      roleName: pagination.roleName || null,
      current: pagination.current,
      size: pagination.size
    };
    const { data, error } = await fetchGetRolePageList(params);
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

/** 分页切换 */
const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/* ===== 编辑 / 新增 ===== */

/** 编辑弹窗显示状态 */
const showEditModal = ref(false);
/** 编辑保存加载状态 */
const editLoading = ref(false);
/** 是否编辑模式（false 为新增） */
const isEditMode = ref(false);
/** 编辑表单 */
const editForm = reactive({
  id: '',
  roleName: '',
  roleCode: '',
  roleDesc: '',
  status: '1'
});

/** 全部按钮权限列表 */
const permissionList = ref<Api.System.SysPermissionVo[]>([]);
/** 权限加载状态 */
const permissionLoading = ref(false);
/** 当前角色已勾选的权限ID */
const checkedPermissionIds = ref<number[]>([]);

/** 加载全部按钮权限 */
const loadPermissions = async () => {
  permissionLoading.value = true;
  try {
    const { data, error } = await fetchGetPermissionList();
    if (!error && data) {
      permissionList.value = data || [];
    }
  } finally {
    permissionLoading.value = false;
  }
};

/** 打开新增弹窗 */
const handleCreate = () => {
  isEditMode.value = false;
  Object.assign(editForm, {
    id: '',
    roleName: '',
    roleCode: '',
    roleDesc: '',
    status: '1'
  });
  checkedPermissionIds.value = [];
  showEditModal.value = true;
};

/** 打开编辑弹窗 */
const handleEdit = async (row: Api.System.SysRoleVo) => {
  isEditMode.value = true;
  Object.assign(editForm, {
    id: String(row.id ?? ''),
    roleName: row.roleName || '',
    roleCode: row.roleCode || '',
    roleDesc: row.roleDesc || '',
    status: row.status === '1' ? '1' : '0'
  });
  checkedPermissionIds.value = [];
  showEditModal.value = true;
  // 加载角色已拥有的按钮权限ID列表
  const roleId = String(row.id ?? '');
  if (roleId) {
    const { data, error } = await fetchGetRolePermissions(roleId);
    if (!error && data) {
      checkedPermissionIds.value = data || [];
    }
  }
};

/** 保存（新增 / 修改） */
const handleEditSubmit = async () => {
  const roleName = editForm.roleName.trim();
  const roleCode = editForm.roleCode.trim();
  if (!roleName) {
    window.$message?.warning('请输入角色名称');
    return;
  }
  if (!roleCode) {
    window.$message?.warning('请输入角色编码');
    return;
  }
  // 勾选的权限ID列表
  const params: Api.System.SysRoleFormDTO = {
    id: isEditMode.value ? editForm.id : undefined,
    roleName,
    roleCode,
    roleDesc: editForm.roleDesc.trim(),
    status: editForm.status,
    permissionIds: checkedPermissionIds.value
  };
  editLoading.value = true;
  try {
    const { error } = isEditMode.value
      ? await fetchUpdateRole(params)
      : await fetchSaveRole(params);
    if (error) {
      window.$message?.error(error.message || (isEditMode.value ? '保存失败' : '新增失败'));
      return;
    }
    window.$message?.success(isEditMode.value ? '保存成功' : '新增成功');
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
/** 当前待删除角色 */
const currentDeleteRow = ref<Api.System.SysRoleVo | null>(null);

/** 打开删除确认弹窗 */
const handleDelete = (row: Api.System.SysRoleVo) => {
  currentDeleteRow.value = row;
  showDeleteModal.value = true;
};

/** 确认删除 */
const handleConfirmDelete = async () => {
  if (!currentDeleteRow.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchDeleteRole(String(currentDeleteRow.value.id));
    if (error) {
      window.$message?.error(error.message || '删除失败');
      return;
    }
    window.$message?.success('删除成功');
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
  if (isSuperAdmin.value) {
    loadData();
    loadPermissions();
  }
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true, footer: 'soft' }">
      <!-- 头部：标题 + 副标题（参考 tools/index.vue） -->
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:shield-account" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.roleManage') }}</h1>
              <span class="page-subtitle">管理系统角色与权限</span>
            </div>
          </div>
        </div>
      </template>

      <div class="role-manage-container">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-box">
            <SvgIcon icon="mdi:magnify" class="search-icon" />
            <NInput v-model:value="pagination.roleName" placeholder="搜索角色名称" clearable size="small"
              @keyup.enter="handleSearch" @clear="handleSearch" />
          </div>
          <button class="icon-btn primary" title="新增角色" @click="handleCreate">
            <SvgIcon icon="mdi:plus" />
          </button>
        </div>

        <!-- 无权限提示 -->
        <div v-if="!isSuperAdmin" class="no-permission">
          <SvgIcon icon="mdi:shield-lock" class="no-permission-icon" />
          <p>无权限访问角色管理</p>
        </div>

        <!-- 卡片列表 -->
        <div v-else class="card-list">
          <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
              <div class="role-card" :class="{ disabled: row.status !== '1' }"
                :style="{ '--delay': `${index * 0.04}s` }">
                <div class="card-header">
                  <div class="role-info">
                    <div class="role-icon-wrap">
                      <SvgIcon icon="mdi:shield-account" class="role-icon" />
                    </div>
                    <div class="role-title">
                      <span class="role-name" :title="row.roleName">{{ row.roleName || '未命名角色' }}</span>
                      <span class="role-code">{{ row.roleCode }}</span>
                    </div>
                  </div>
                  <div class="status-badge" :class="{ enabled: row.status === '1' }">
                    <span class="dot" />
                    {{ getStatusText(row.status) }}
                  </div>
                </div>

                <div class="role-desc">
                  <SvgIcon icon="mdi:text-box-outline" class="desc-icon" />
                  <span class="desc-text" :title="row.roleDesc">{{ row.roleDesc || '暂无描述' }}</span>
                </div>

                <div class="card-footer">
                  <div class="footer-item">
                    <SvgIcon icon="mdi:clock-outline" class="footer-icon" />
                    <span>创建时间：{{ formatDate(row.createTime) }}</span>
                  </div>
                  <div class="footer-actions">
                    <button class="footer-action-btn edit" title="编辑角色" @click="handleEdit(row)">
                      <SvgIcon icon="mdi:pencil" />
                    </button>
                    <button class="footer-action-btn delete" title="删除角色" @click="handleDelete(row)">
                      <SvgIcon icon="mdi:delete" />
                    </button>
                  </div>
                </div>
              </div>
            </NGridItem>

            <!-- 骨架屏 -->
            <NGridItem v-if="loading" v-for="i in 6" :key="`skeleton-${i}`" span="3 s:2 m:1 l:1">
              <div class="role-card skeleton">
                <div class="skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </NGridItem>
          </NGrid>

          <!-- 空状态 -->
          <div v-if="!loading && list.length === 0" class="empty-state">
            <SvgIcon icon="mdi:shield-off-outline" class="empty-icon" />
            <p>暂无角色数据</p>
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
            <span>{{ isEditMode ? '编辑角色' : '新增角色' }}</span>
          </div>
        </template>
        <div class="modal-form">
          <div class="form-item">
            <label class="form-label">角色名称</label>
            <NInput v-model:value="editForm.roleName" placeholder="请输入角色名称" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">角色编码</label>
            <NInput v-model:value="editForm.roleCode" placeholder="请输入角色编码" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">角色描述</label>
            <NInput v-model:value="editForm.roleDesc" type="textarea" :rows="3" placeholder="请输入角色描述" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">是否启用</label>
            <div class="switch-wrap">
              <NSwitch v-model:value="editForm.status" :checked-value="'1'" :unchecked-value="'0'" />
              <span class="switch-text">{{ editForm.status === '1' ? '启用' : '禁用' }}</span>
            </div>
          </div>
          <div class="form-item">
            <label class="form-label">按钮权限</label>
            <div class="permission-box">
              <div v-if="permissionLoading" class="permission-loading">权限加载中...</div>
              <div v-else-if="permissionList.length === 0" class="permission-loading">暂无权限数据</div>
              <NCheckboxGroup v-else v-model:value="checkedPermissionIds">
                <div v-for="perm in permissionList" :key="perm.id" class="permission-item">
                  <NCheckbox :value="Number(perm.id)">
                    <span class="permission-code">{{ perm.code }}</span>
                    <span class="permission-desc">{{ perm.description }}</span>
                  </NCheckbox>
                </div>
              </NCheckboxGroup>
            </div>
          </div>
          <div class="modal-actions">
            <button class="action-btn cancel" @click="showEditModal = false">取消</button>
            <button class="action-btn confirm" :disabled="editLoading" @click="handleEditSubmit">
              <SvgIcon icon="mdi:check" />
              <span>{{ editLoading ? '保存中...' : '保存' }}</span>
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
            <span>删除确认</span>
          </div>
        </template>
        <div class="delete-modal-body">
          <p class="delete-modal-text">
            确定要删除角色
            <span class="delete-modal-target">{{ currentDeleteRow?.roleName }}</span>
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
        color: rgba(255, 255, 255, 0.92);
      }

      .page-subtitle {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.45);
      }
    }
  }
}

.role-manage-container {
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
    gap: 12px;
    flex-shrink: 0;

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 260px;
      height: 36px;
      padding: 0 12px 0 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.25s ease;

      &:focus-within {
        border-color: rgba(102, 126, 234, 0.5);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .search-icon {
        position: absolute;
        left: 12px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.4);
      }

      :deep(.n-input) {
        background: transparent;
        --n-border: none !important;
        --n-border-focus: none !important;
        --n-border-hover: none !important;
        --n-box-shadow-focus: none !important;

        .n-input__input-el {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
        }

        .n-input__placeholder {
          color: rgba(255, 255, 255, 0.35);
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
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.75);
      cursor: pointer;
      font-size: 18px;
      transition: all 0.25s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
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
    color: rgba(255, 255, 255, 0.5);

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

  .role-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: cardIn 0.45s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
    box-sizing: border-box;

    &:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.07);
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

      .role-info {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;

        .role-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.12);
          flex-shrink: 0;

          .role-icon {
            font-size: 22px;
            color: #667eea;
          }
        }

        .role-title {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .role-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--n-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .role-code {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.45);
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
        color: rgba(255, 255, 255, 0.55);
        background: rgba(255, 255, 255, 0.06);
        white-space: nowrap;
        flex-shrink: 0;

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
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

    .role-desc {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      flex: 1;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
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
        color: rgba(255, 255, 255, 0.6);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      .footer-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.4);

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
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.06);
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
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%);
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
    color: rgba(255, 255, 255, 0.5);

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

/* ================================ 编辑 / 新增弹窗 ================================ */

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
      color: rgba(255, 255, 255, 0.75);
    }

    .switch-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 34px;

      .switch-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }
    }

    .permission-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 180px;
      overflow-y: auto;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);

      .permission-loading {
        padding: 20px 0;
        text-align: center;
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.45);
      }

      .permission-item {
        display: flex;
        align-items: center;
        padding: 5px 8px;
        border-radius: 8px;
        transition: background 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .permission-code {
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          font-family: 'JetBrains Mono', Consolas, monospace;
          margin-right: 8px;
        }

        .permission-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
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

      &.cancel {
        &:hover {
          background: rgba(255, 255, 255, 0.12);
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

      &.cancel {
        &:hover {
          background: rgba(255, 255, 255, 0.12);
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
