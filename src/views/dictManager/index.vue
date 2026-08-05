<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { NCard, NGrid, NGridItem, NInput, NInputNumber, NPagination, NModal, NSwitch } from 'naive-ui';
import dayjs from 'dayjs';
import {
  fetchGetDictPageList,
  fetchAddDict,
  fetchUpdateDict,
  fetchDeleteDict,
  fetchGetDictItemPageList,
  fetchAddDictItem,
  fetchUpdateDictItem,
  fetchDeleteDictItem
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';

defineOptions({ name: 'DictManagePage' });

/* ==================== 基础 ==================== */

const { isSuperAdmin } = useAuth(); // 字典管理仅超级管理员可见
const { dictOptions, dictLabel } = useDict();

/** 日期格式化 */
const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

/** 字典类型色值映射（1:系统字典 2:业务字典） */
const dictTypeColorMap: Record<string, string> = { '1': '#667eea', '2': '#43e97b' };
const getDictTypeColor = (type?: string | null) => dictTypeColorMap[type || '1'] || '#667eea';

/* ==================== 字典选项（来自后端字典） ==================== */

/** 字典类型选项（dict_type） */
const typeOptions = computed(() => dictOptions('dict_type'));

/** 状态选项（status） */
const statusOptions = computed(() => dictOptions('status'));

/** 字典类型文案（优先取字典标签，兜底本地映射） */
const getTypeText = (type?: string | null) =>
  dictLabel('dict_type', type || '') || (type === '2' ? $t('dict.type.business') : $t('dict.type.system'));

/** 状态文案（优先取字典标签，兜底本地映射） */
const getStatusText = (status?: string | null) =>
  dictLabel('status', status || '') || (status === '1' ? $t('dict.status.enabled') : $t('dict.status.disabled'));

/* ==================== 字典列表与分页 ==================== */

const loading = ref(false);
const list = ref<Api.System.Dict[]>([]);
/** 分页查询条件（参数与后端 SysDictSearchDTO 对应） */
const pagination = reactive({
  name: '',
  code: '',
  type: '',
  description: '',
  status: '',
  current: 1,
  size: 6,
  total: 0
});

/** 加载字典分页 */
const loadData = async () => {
  loading.value = true;
  try {
    const params: Api.System.DictSearchParams = {
      name: pagination.name || null,
      code: pagination.code || null,
      type: (pagination.type as Api.System.DictType) || null,
      description: pagination.description || null,
      status: (pagination.status as Api.System.Dict['status']) || null,
      current: pagination.current,
      size: pagination.size
    };
    const { data, error } = await fetchGetDictPageList(params);
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
  Object.assign(pagination, { name: '', code: '', type: '', description: '', status: '', current: 1 });
  loadData();
};

/** 分页切换 */
const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/* ==================== 自定义下拉（类型 / 状态筛选） ==================== */

/** 当前打开的下拉：'type' | 'status' | null */
const activeDropdown = ref<'type' | 'status' | null>(null);

/** 切换下拉开合 */
const toggleDropdown = (key: 'type' | 'status') => {
  activeDropdown.value = activeDropdown.value === key ? null : key;
};

/** 选择字典类型 */
const selectType = (value: string) => {
  pagination.type = value;
  activeDropdown.value = null;
};

/** 选择启用状态 */
const selectStatus = (value: string) => {
  pagination.status = value;
  activeDropdown.value = null;
};

/** 点击外部任意处关闭下拉（触发器和选项内已用 .stop 阻止冒泡） */
const handleDocumentClick = () => {
  activeDropdown.value = null;
};

/* ==================== 字典新增 / 编辑 ==================== */

const showEditModal = ref(false);
const editLoading = ref(false);
const isEditMode = ref(false); // false 为新增
/** 字典编辑表单 */
const editForm = reactive({
  id: '',
  name: '',
  code: '',
  type: '1',
  sort: 0,
  description: '',
  status: '1'
});

/** 重置编辑表单 */
const resetEditForm = () => {
  Object.assign(editForm, { id: '', name: '', code: '', type: '1', sort: 0, description: '', status: '1' });
};

/** 打开新增弹窗 */
const handleCreate = () => {
  isEditMode.value = false;
  resetEditForm();
  showEditModal.value = true;
};

/** 打开编辑弹窗 */
const handleEdit = (row: Api.System.Dict) => {
  isEditMode.value = true;
  Object.assign(editForm, {
    id: String(row.id ?? ''),
    name: row.name || '',
    code: row.code || '',
    type: row.type === '2' ? '2' : '1',
    sort: row.sort ?? 0,
    description: row.description || '',
    status: row.status === '1' ? '1' : '0'
  });
  showEditModal.value = true;
};

/** 保存字典（新增 / 修改） */
const handleEditSubmit = async () => {
  const name = editForm.name.trim();
  const code = editForm.code.trim();
  if (!name || !code) {
    window.$message?.warning(!name ? $t('dict.messages.nameRequired') : $t('dict.messages.codeRequired'));
    return;
  }
  const params: Api.System.DictEdit = {
    name,
    code,
    type: editForm.type as Api.System.DictType,
    sort: editForm.sort ?? 0,
    description: editForm.description.trim(),
    status: editForm.status
  };
  if (isEditMode.value) {
    params.id = Number(editForm.id);
  }
  editLoading.value = true;
  try {
    const { error } = isEditMode.value ? await fetchUpdateDict(params) : await fetchAddDict(params);
    if (error) {
      window.$message?.error(error.message || (isEditMode.value ? $t('dict.messages.saveFailed') : $t('dict.messages.addFailed')));
      return;
    }
    window.$message?.success(isEditMode.value ? $t('dict.messages.saveSuccess') : $t('dict.messages.addSuccess'));
    showEditModal.value = false;
    loadData();
  } finally {
    editLoading.value = false;
  }
};

/* ==================== 字典删除确认 ==================== */

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const currentDeleteRow = ref<Api.System.Dict | null>(null);

/** 打开删除确认弹窗（系统字典不可删除） */
const handleDelete = (row: Api.System.Dict) => {
  if (row.type === '1') {
    window.$message?.warning($t('dict.messages.systemDictNotDeletable'));
    return;
  }
  currentDeleteRow.value = row;
  showDeleteModal.value = true;
};

/** 确认删除字典 */
const handleConfirmDelete = async () => {
  if (!currentDeleteRow.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchDeleteDict({ ids: [Number(currentDeleteRow.value.id)] });
    if (error) {
      window.$message?.error(error.message || $t('dict.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('dict.messages.deleteSuccess'));
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

/* ==================== 子字典（子项）列表 ==================== */

const showItemModal = ref(false);
const currentDict = ref<Api.System.Dict | null>(null); // 当前父字典

const itemLoading = ref(false);
const itemList = ref<Api.System.DictItem[]>([]);
/** 子项分页查询条件（参数与后端 SysDictItemSearchDTO 对应） */
const itemPagination = reactive({
  value: '',
  zhCn: '',
  enUs: '',
  description: '',
  current: 1,
  size: 8,
  total: 0
});

/** 主题色类型选项（前端渲染类型） */
const itemTypeOptions = [
  { label: $t('dict.item.typeOptions.primary'), value: 'primary' },
  { label: $t('dict.item.typeOptions.success'), value: 'success' },
  { label: $t('dict.item.typeOptions.info'), value: 'info' },
  { label: $t('dict.item.typeOptions.warning'), value: 'warning' },
  { label: $t('dict.item.typeOptions.error'), value: 'error' }
];

/** 主题色类型色值映射 */
const itemTypeColorMap: Record<string, string> = {
  primary: '#667eea',
  success: '#43e97b',
  info: '#36adff',
  warning: '#ffa325',
  error: '#f5576c'
};

/** 获取渲染类型色值 */
const getItemTypeColor = (type?: string | null) => itemTypeColorMap[type || 'primary'] || '#667eea';

/** 获取渲染类型文案 */
const getItemTypeLabel = (type?: string | null) =>
  itemTypeOptions.find(opt => opt.value === type)?.label || type || $t('dict.item.typeOptions.primary');

/** 打开子项管理弹窗 */
const handleOpenItem = (row: Api.System.Dict) => {
  currentDict.value = row;
  Object.assign(itemPagination, { value: '', zhCn: '', enUs: '', description: '', current: 1 });
  showItemModal.value = true;
  loadItemData();
};

/** 加载子项分页（按父字典 ID 查询） */
const loadItemData = async () => {
  if (!currentDict.value) return;
  itemLoading.value = true;
  try {
    const params: Api.System.DictItemSearchParams = {
      dictId: Number(currentDict.value.id),
      value: itemPagination.value || null,
      zhCn: itemPagination.zhCn || null,
      enUs: itemPagination.enUs || null,
      description: itemPagination.description || null,
      current: itemPagination.current,
      size: itemPagination.size
    };
    const { data, error } = await fetchGetDictItemPageList(params);
    if (!error && data) {
      itemList.value = data.records || [];
      itemPagination.total = data.total || 0;
    }
  } finally {
    itemLoading.value = false;
  }
};

/** 子项搜索 */
const handleItemSearch = () => {
  itemPagination.current = 1;
  loadItemData();
};

/** 子项重置 */
const handleItemReset = () => {
  Object.assign(itemPagination, { value: '', zhCn: '', enUs: '', description: '', current: 1 });
  loadItemData();
};

/** 子项分页切换 */
const handleItemPageChange = (page: number) => {
  itemPagination.current = page;
  loadItemData();
};

/* ==================== 子字典新增 / 编辑 ==================== */

const showItemEditModal = ref(false);
const itemEditLoading = ref(false);
const isItemEditMode = ref(false); // false 为新增
/** 子项编辑表单 */
const itemEditForm = reactive({
  id: '',
  value: '',
  zhCn: '',
  enUs: '',
  type: 'primary',
  sort: 0,
  description: '',
  status: '1'
});

/** 重置子项编辑表单 */
const resetItemEditForm = () => {
  Object.assign(itemEditForm, {
    id: '',
    value: '',
    zhCn: '',
    enUs: '',
    type: 'primary',
    sort: 0,
    description: '',
    status: '1'
  });
};

/** 打开子项新增弹窗 */
const handleItemCreate = () => {
  isItemEditMode.value = false;
  resetItemEditForm();
  showItemEditModal.value = true;
};

/** 打开子项编辑弹窗 */
const handleItemEdit = (row: Api.System.DictItem) => {
  isItemEditMode.value = true;
  Object.assign(itemEditForm, {
    id: String(row.id ?? ''),
    value: row.value || '',
    zhCn: row.zhCn || '',
    enUs: row.enUs || '',
    type: row.type || 'primary',
    sort: row.sort ?? 0,
    description: row.description || '',
    status: row.status === '1' ? '1' : '0'
  });
  showItemEditModal.value = true;
};

/** 保存子项（新增 / 修改，父字典 ID / 编码取自 currentDict） */
const handleItemEditSubmit = async () => {
  if (!currentDict.value) return;
  const value = itemEditForm.value.trim();
  const zhCn = itemEditForm.zhCn.trim();
  if (!value || !zhCn) {
    window.$message?.warning(!value ? $t('dict.item.messages.valueRequired') : $t('dict.item.messages.zhCnRequired'));
    return;
  }
  const params: Api.System.DictItemEdit = {
    dictId: Number(currentDict.value.id),
    dictCode: currentDict.value.code,
    value,
    zhCn,
    enUs: itemEditForm.enUs.trim(),
    type: itemEditForm.type,
    sort: itemEditForm.sort ?? 0,
    description: itemEditForm.description.trim(),
    status: itemEditForm.status
  };
  if (isItemEditMode.value) {
    params.id = Number(itemEditForm.id);
  }
  itemEditLoading.value = true;
  try {
    const { error } = isItemEditMode.value ? await fetchUpdateDictItem(params) : await fetchAddDictItem(params);
    if (error) {
      window.$message?.error(error.message || (isItemEditMode.value ? $t('dict.item.messages.saveFailed') : $t('dict.item.messages.addFailed')));
      return;
    }
    window.$message?.success(isItemEditMode.value ? $t('dict.item.messages.saveSuccess') : $t('dict.item.messages.addSuccess'));
    showItemEditModal.value = false;
    loadItemData();
  } finally {
    itemEditLoading.value = false;
  }
};

/* ==================== 子字典删除确认 ==================== */

const showItemDeleteModal = ref(false);
const itemDeleteLoading = ref(false);
const currentDeleteItem = ref<Api.System.DictItem | null>(null);

/** 打开子项删除确认弹窗 */
const handleItemDelete = (row: Api.System.DictItem) => {
  currentDeleteItem.value = row;
  showItemDeleteModal.value = true;
};

/** 确认删除子项 */
const handleConfirmItemDelete = async () => {
  if (!currentDeleteItem.value) return;
  itemDeleteLoading.value = true;
  try {
    const { error } = await fetchDeleteDictItem({ ids: [Number(currentDeleteItem.value.id)] });
    if (error) {
      window.$message?.error(error.message || $t('dict.item.messages.deleteFailed'));
      return;
    }
    window.$message?.success($t('dict.item.messages.deleteSuccess'));
    showItemDeleteModal.value = false;
    currentDeleteItem.value = null;
    loadItemData();
  } finally {
    itemDeleteLoading.value = false;
  }
};

/** 关闭子项删除确认弹窗 */
const handleCloseItemDeleteModal = () => {
  showItemDeleteModal.value = false;
  currentDeleteItem.value = null;
};

/* ==================== 生命周期 ==================== */

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  if (isSuperAdmin.value) {
    loadData();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
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
            <SvgIcon icon="mdi:book-open-outline" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.dictManage') }}</h1>
              <span class="page-subtitle">{{ $t('dict.subtitle') }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="dict-manage-container">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-box">
            <SvgIcon icon="mdi:form-textbox" class="search-icon" />
            <NInput v-model:value="pagination.name" :placeholder="$t('dict.search.name')" clearable size="small" />
          </div>
          <div class="search-box">
            <SvgIcon icon="mdi:key-outline" class="search-icon" />
            <NInput v-model:value="pagination.code" :placeholder="$t('dict.search.code')" clearable size="small" />
          </div>
          <div class="custom-select">
            <button class="select-trigger" :class="{ open: activeDropdown === 'type' }"
              @click.stop="toggleDropdown('type')">
              <SvgIcon icon="mdi:shape-outline" class="search-icon" />
              <span class="select-label" :class="{ placeholder: !pagination.type }">
                {{ pagination.type ? getTypeText(pagination.type) : $t('dict.search.type') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="chevron-icon" :class="{ open: activeDropdown === 'type' }" />
            </button>
            <div v-if="activeDropdown === 'type'" class="select-options">
              <div v-for="opt in typeOptions" :key="opt.value" class="select-option"
                :class="{ selected: pagination.type === opt.value }" @click.stop="selectType(opt.value)">
                <span>{{ opt.label }}</span>
                <SvgIcon v-if="pagination.type === opt.value" icon="mdi:check" class="check-icon" />
              </div>
            </div>
          </div>
          <div class="search-box">
            <SvgIcon icon="mdi:text-box-outline" class="search-icon" />
            <NInput v-model:value="pagination.description" :placeholder="$t('dict.search.description')" clearable size="small" />
          </div>
          <div class="custom-select">
            <button class="select-trigger" :class="{ open: activeDropdown === 'status' }"
              @click.stop="toggleDropdown('status')">
              <SvgIcon icon="mdi:power" class="search-icon" />
              <span class="select-label" :class="{ placeholder: !pagination.status }">
                {{ pagination.status ? getStatusText(pagination.status) : $t('dict.search.status') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="chevron-icon" :class="{ open: activeDropdown === 'status' }" />
            </button>
            <div v-if="activeDropdown === 'status'" class="select-options">
              <div v-for="opt in statusOptions" :key="opt.value" class="select-option"
                :class="{ selected: pagination.status === opt.value }" @click.stop="selectStatus(opt.value)">
                <span>{{ opt.label }}</span>
                <SvgIcon v-if="pagination.status === opt.value" icon="mdi:check" class="check-icon" />
              </div>
            </div>
          </div>
          <button class="search-btn" :title="$t('dict.search.btn')" @click="handleSearch">
            <SvgIcon icon="mdi:magnify" />
            <span>{{ $t('dict.search.btn') }}</span>
          </button>
          <button class="reset-btn" :title="$t('dict.search.resetTitle')" @click="handleReset">
            <SvgIcon icon="mdi:refresh" />
            <span>{{ $t('dict.search.reset') }}</span>
          </button>
          <button class="icon-btn primary" :title="$t('dict.search.add')" @click="handleCreate">
            <SvgIcon icon="mdi:plus" />
          </button>
        </div>

        <!-- 无权限提示 -->
        <div v-if="!isSuperAdmin" class="no-permission">
          <SvgIcon icon="mdi:shield-lock" class="no-permission-icon" />
          <p>{{ $t('dict.noPermission') }}</p>
        </div>

        <!-- 字典卡片列表 -->
        <div v-else class="card-list">
          <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
              <div class="dict-card" :class="{ disabled: row.status !== '1' }"
                :style="{ '--delay': `${index * 0.04}s` }">
                <div class="card-header">
                  <div class="dict-info">
                    <div class="dict-icon-wrap" :class="{ business: row.type === '2' }">
                      <SvgIcon icon="mdi:book-open-variant" class="dict-icon" />
                    </div>
                    <div class="dict-title">
                      <span class="dict-name" :title="row.name">{{ row.name || $t('dict.unnamed') }}</span>
                      <span class="dict-code">{{ row.code }}</span>
                    </div>
                  </div>
                  <div class="status-badge" :class="{ enabled: row.status === '1' }">
                    <span class="dot" />
                    {{ getStatusText(row.status) }}
                  </div>
                </div>

                <div class="dict-desc">
                  <SvgIcon icon="mdi:text-box-outline" class="desc-icon" />
                  <span class="desc-text" :title="row.description">{{ row.description || $t('dict.noDescription') }}</span>
                </div>

                <div class="dict-meta">
                  <span class="type-badge" :class="{ business: row.type === '2' }">
                    <SvgIcon icon="mdi:shape-outline" class="meta-icon" />
                    {{ getTypeText(row.type) }}
                  </span>
                  <span class="sort-text">
                    <SvgIcon icon="mdi:sort" class="meta-icon" />
                    {{ $t('dict.sort') }} {{ row.sort ?? 0 }}
                  </span>
                </div>

                <div class="card-footer">
                  <div class="footer-item">
                    <SvgIcon icon="mdi:clock-outline" class="footer-icon" />
                    <span>{{ $t('dict.createTime') }}{{ formatDate(row.createTime) }}</span>
                  </div>
                  <div class="footer-actions">
                    <button class="footer-action-btn item" :title="$t('dict.manageItems')" @click="handleOpenItem(row)">
                      <SvgIcon icon="mdi:view-list" />
                    </button>
                    <button class="footer-action-btn edit" :title="$t('dict.edit')" @click="handleEdit(row)">
                      <SvgIcon icon="mdi:pencil" />
                    </button>
                    <button class="footer-action-btn delete" :title="$t('dict.delete')" :disabled="row.type === '1'"
                      @click="handleDelete(row)">
                      <SvgIcon icon="mdi:delete" />
                    </button>
                  </div>
                </div>
              </div>
            </NGridItem>

            <!-- 骨架屏 -->
            <NGridItem v-if="loading" v-for="i in 6" :key="`skeleton-${i}`" span="3 s:2 m:1 l:1">
              <div class="dict-card skeleton">
                <div class="skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </NGridItem>
          </NGrid>

          <!-- 空状态 -->
          <div v-if="!loading && list.length === 0" class="empty-state">
            <SvgIcon icon="mdi:book-off-outline" class="empty-icon" />
            <p>{{ $t('dict.empty') }}</p>
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
            <span>{{ isEditMode ? $t('dict.form.editTitle') : $t('dict.form.addTitle') }}</span>
          </div>
        </template>
        <div class="modal-form">
          <div class="form-item">
            <label class="form-label">{{ $t('dict.form.name.label') }}</label>
            <NInput v-model:value="editForm.name" :placeholder="$t('dict.form.name.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.form.code.label') }}</label>
            <NInput v-model:value="editForm.code" :placeholder="$t('dict.form.code.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.form.type.label') }}</label>
            <div class="type-chip-group">
              <button v-for="opt in typeOptions" :key="opt.value" type="button" class="type-chip"
                :class="{ active: editForm.type === opt.value }"
                :style="{ '--chip-color': getDictTypeColor(opt.value) }" @click="editForm.type = opt.value">
                <span class="chip-dot" />
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.form.sort.label') }}</label>
            <NInputNumber v-model:value="editForm.sort" :placeholder="$t('dict.form.sort.placeholder')" min="0" class="w-full" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.form.description.label') }}</label>
            <NInput v-model:value="editForm.description" type="textarea" :rows="3"
              :placeholder="$t('dict.form.description.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.form.enabled.label') }}</label>
            <div class="switch-wrap">
              <NSwitch v-model:value="editForm.status" :checked-value="'1'" :unchecked-value="'0'" />
              <span class="switch-text">{{ editForm.status === '1' ? $t('dict.status.enabled') : $t('dict.status.disabled') }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="action-btn cancel" @click="showEditModal = false">{{ $t('common.cancel') }}</button>
            <button class="action-btn confirm" :disabled="editLoading" @click="handleEditSubmit">
              <SvgIcon icon="mdi:check" />
              <span>{{ editLoading ? $t('dict.form.saving') : $t('dict.form.save') }}</span>
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
            <span>{{ $t('dict.deleteModal.title') }}</span>
          </div>
        </template>
        <div class="delete-modal-body">
          <p class="delete-modal-text">
            {{ $t('dict.deleteModal.confirmPrefix') }}
            <span class="delete-modal-target">{{ currentDeleteRow?.name }}</span>
            {{ $t('dict.deleteModal.confirmSuffix', { value: currentDeleteRow?.code }) }}
          </p>
          <p class="delete-modal-tip">{{ $t('dict.deleteModal.tip') }}</p>
        </div>
        <div class="delete-modal-actions">
          <button class="action-btn cancel" @click="handleCloseDeleteModal">{{ $t('common.cancel') }}</button>
          <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
            <SvgIcon icon="mdi:delete" />
            <span>{{ deleteLoading ? $t('dict.deleteModal.deleting') : $t('dict.deleteModal.delete') }}</span>
          </button>
        </div>
      </NModal>

      <!-- 子字典（子项）管理弹窗 -->
      <NModal v-model:show="showItemModal" preset="card" class="w-900px rounded-16px" :bordered="false" size="large"
        :closable="true">
        <template #header>
          <div class="modal-header">
            <SvgIcon icon="mdi:view-list" class="modal-header-icon" />
            <span>{{ $t('dict.item.manageTitle', { name: currentDict?.name, code: currentDict?.code }) }}</span>
          </div>
        </template>
        <div class="item-manage">
          <!-- 子项搜索栏 -->
          <div class="item-search-bar">
            <div class="item-search-box">
              <SvgIcon icon="mdi:code-tags" class="search-icon" />
              <NInput v-model:value="itemPagination.value" :placeholder="$t('dict.item.search.value')" clearable size="small" />
            </div>
            <div class="item-search-box">
              <SvgIcon icon="mdi:translate" class="search-icon" />
              <NInput v-model:value="itemPagination.zhCn" :placeholder="$t('dict.item.search.zhCn')" clearable size="small" />
            </div>
            <div class="item-search-box">
              <SvgIcon icon="mdi:alphabetical-variant" class="search-icon" />
              <NInput v-model:value="itemPagination.enUs" :placeholder="$t('dict.item.search.enUs')" clearable size="small" />
            </div>
            <div class="item-search-box">
              <SvgIcon icon="mdi:text-box-outline" class="search-icon" />
              <NInput v-model:value="itemPagination.description" :placeholder="$t('dict.item.search.description')" clearable size="small" />
            </div>
            <button class="item-btn primary" :title="$t('dict.item.search.btn')" @click="handleItemSearch">
              <SvgIcon icon="mdi:magnify" />
              <span>{{ $t('dict.item.search.btn') }}</span>
            </button>
            <button class="item-btn" :title="$t('dict.item.search.reset')" @click="handleItemReset">
              <SvgIcon icon="mdi:refresh" />
              <span>{{ $t('dict.item.search.reset') }}</span>
            </button>
            <button class="item-btn add" :title="$t('dict.item.add')" @click="handleItemCreate">
              <SvgIcon icon="mdi:plus" />
              <span>{{ $t('dict.item.add') }}</span>
            </button>
          </div>

          <!-- 子项表格 -->
          <div class="item-table">
            <div class="item-table-header">
              <span class="col-value">{{ $t('dict.item.column.value') }}</span>
              <span class="col-zh">{{ $t('dict.item.column.zhCn') }}</span>
              <span class="col-en">{{ $t('dict.item.column.enUs') }}</span>
              <span class="col-type">{{ $t('dict.item.column.type') }}</span>
              <span class="col-sort">{{ $t('dict.item.column.sort') }}</span>
              <span class="col-status">{{ $t('dict.item.column.status') }}</span>
              <span class="col-actions">{{ $t('dict.item.column.actions') }}</span>
            </div>
            <div class="item-table-body">
              <div v-for="item in itemList" :key="item.id" class="item-row">
                <span class="col-value cell-text" :title="item.value">{{ item.value }}</span>
                <span class="col-zh cell-text" :title="item.zhCn">{{ item.zhCn }}</span>
                <span class="col-en cell-text" :title="item.enUs">{{ item.enUs }}</span>
                <span class="col-type">
                  <span class="item-type-badge"
                    :style="{ color: getItemTypeColor(item.type), borderColor: `${getItemTypeColor(item.type)}55`, background: `${getItemTypeColor(item.type)}14` }">
                    <span class="item-type-dot" :style="{ background: getItemTypeColor(item.type) }" />
                    {{ getItemTypeLabel(item.type) }}
                  </span>
                </span>
                <span class="col-sort">{{ item.sort ?? 0 }}</span>
                <span class="col-status">
                  <span class="item-status-badge" :class="{ enabled: item.status === '1' }">
                    <span class="dot" />
                    {{ getStatusText(item.status) }}
                  </span>
                </span>
                <span class="col-actions">
                  <button class="item-action-btn edit" :title="$t('dict.item.editBtnTitle')" @click="handleItemEdit(item)">
                    <SvgIcon icon="mdi:pencil" />
                  </button>
                  <button class="item-action-btn delete" :title="$t('dict.item.deleteBtnTitle')" @click="handleItemDelete(item)">
                    <SvgIcon icon="mdi:delete" />
                  </button>
                </span>
              </div>

              <!-- 加载骨架 -->
              <template v-if="itemLoading">
                <div v-for="i in 4" :key="`item-skeleton-${i}`" class="item-row skeleton-row">
                  <span v-for="j in 7" :key="j" class="skeleton-cell" />
                </div>
              </template>

              <!-- 空状态 -->
              <div v-if="!itemLoading && itemList.length === 0" class="item-empty">
                <SvgIcon icon="mdi:book-off-outline" class="empty-icon" />
                <p>{{ $t('dict.item.empty') }}</p>
              </div>
            </div>
          </div>

          <!-- 子项分页 -->
          <div v-if="itemPagination.total > 0" class="item-pagination">
            <NPagination v-model:value="itemPagination.current" :item-count="itemPagination.total"
              :page-size="itemPagination.size" @update-page="handleItemPageChange" />
          </div>
        </div>
      </NModal>

      <!-- 子项新增 / 编辑弹窗 -->
      <NModal v-model:show="showItemEditModal" preset="card" class="w-480px rounded-16px" :bordered="false" size="small"
        :closable="true">
        <template #header>
          <div class="modal-header">
            <SvgIcon :icon="isItemEditMode ? 'mdi:pencil' : 'mdi:plus'" class="modal-header-icon" />
            <span>{{ isItemEditMode ? $t('dict.item.editTitle') : $t('dict.item.addTitle') }} - {{ currentDict?.name }}</span>
          </div>
        </template>
        <div class="modal-form">
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.value.label') }}</label>
            <NInput v-model:value="itemEditForm.value" :placeholder="$t('dict.item.form.value.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.zhCn.label') }}</label>
            <NInput v-model:value="itemEditForm.zhCn" :placeholder="$t('dict.item.form.zhCn.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.enUs.label') }}</label>
            <NInput v-model:value="itemEditForm.enUs" :placeholder="$t('dict.item.form.enUs.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.type.label') }}</label>
            <div class="type-chip-group">
              <button v-for="opt in itemTypeOptions" :key="opt.value" type="button" class="type-chip"
                :class="{ active: itemEditForm.type === opt.value }"
                :style="{ '--chip-color': getItemTypeColor(opt.value) }" @click="itemEditForm.type = opt.value">
                <span class="chip-dot" />
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.sort.label') }}</label>
            <NInputNumber v-model:value="itemEditForm.sort" :placeholder="$t('dict.item.form.sort.placeholder')" min="0" class="w-full" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.description.label') }}</label>
            <NInput v-model:value="itemEditForm.description" type="textarea" :rows="2"
              :placeholder="$t('dict.item.form.description.placeholder')" clearable />
          </div>
          <div class="form-item">
            <label class="form-label">{{ $t('dict.item.form.enabled.label') }}</label>
            <div class="switch-wrap">
              <NSwitch v-model:value="itemEditForm.status" :checked-value="'1'" :unchecked-value="'0'" />
              <span class="switch-text">{{ itemEditForm.status === '1' ? $t('dict.status.enabled') : $t('dict.status.disabled') }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="action-btn cancel" @click="showItemEditModal = false">{{ $t('common.cancel') }}</button>
            <button class="action-btn confirm" :disabled="itemEditLoading" @click="handleItemEditSubmit">
              <SvgIcon icon="mdi:check" />
              <span>{{ itemEditLoading ? $t('dict.item.form.saving') : $t('dict.item.form.save') }}</span>
            </button>
          </div>
        </div>
      </NModal>

      <!-- 子项删除确认弹窗 -->
      <NModal v-model:show="showItemDeleteModal" preset="card" class="delete-modal rounded-16px w-400px" :bordered="false"
        size="small" :closable="false">
        <template #header>
          <div class="delete-modal-header">
            <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
            <span>{{ $t('dict.item.deleteModal.title') }}</span>
          </div>
        </template>
        <div class="delete-modal-body">
          <p class="delete-modal-text">
            {{ $t('dict.item.deleteModal.confirmPrefix') }}
            <span class="delete-modal-target">{{ currentDeleteItem?.zhCn }}</span>
            {{ $t('dict.item.deleteModal.confirmSuffix', { value: currentDeleteItem?.value }) }}
          </p>
          <p class="delete-modal-tip">{{ $t('dict.item.deleteModal.tip') }}</p>
        </div>
        <div class="delete-modal-actions">
          <button class="action-btn cancel" @click="handleCloseItemDeleteModal">{{ $t('common.cancel') }}</button>
          <button class="action-btn danger" :disabled="itemDeleteLoading" @click="handleConfirmItemDelete">
            <SvgIcon icon="mdi:delete" />
            <span>{{ itemDeleteLoading ? $t('dict.item.deleteModal.deleting') : $t('dict.item.deleteModal.delete') }}</span>
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

.dict-manage-container {
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
      width: 170px;
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

    .custom-select {
      position: relative;

      .select-trigger {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 170px;
        height: 36px;
        padding: 0 12px;
        border-radius: 10px;
        background: rgba(var(--app-rgb), 0.05);
        border: 1px solid rgba(var(--app-rgb), 0.08);
        color: rgba(var(--app-rgb), 0.9);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.25s ease;

        &:hover,
        &.open {
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(var(--app-rgb), 0.08);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
          font-size: 16px;
          color: rgba(var(--app-rgb), 0.4);
          flex-shrink: 0;
        }

        .select-label {
          flex: 1;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &.placeholder {
            color: rgba(var(--app-rgb), 0.35);
          }
        }

        .chevron-icon {
          font-size: 15px;
          color: rgba(var(--app-rgb), 0.4);
          flex-shrink: 0;
          transition: transform 0.25s ease;

          &.open {
            transform: rotate(180deg);
          }
        }
      }

      .select-options {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 10;
        min-width: 100%;
        padding: 5px;
        border-radius: 10px;
        background: #1e1f24;
        border: 1px solid rgba(var(--app-rgb), 0.1);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        box-sizing: border-box;

        .select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 7px;
          font-size: 13px;
          color: rgba(var(--app-rgb), 0.75);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;

          &:hover {
            background: rgba(102, 126, 234, 0.12);
            color: #667eea;
          }

          &.selected {
            color: #667eea;
            font-weight: 600;
          }

          .check-icon {
            font-size: 15px;
            color: #667eea;
          }
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

  .dict-card {
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

      .dict-info {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;

        .dict-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.12);
          flex-shrink: 0;

          .dict-icon {
            font-size: 22px;
            color: #667eea;
          }

          &.business {
            background: rgba(67, 233, 123, 0.1);

            .dict-icon {
              color: #43e97b;
            }
          }
        }

        .dict-title {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .dict-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--n-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .dict-code {
            font-size: 11px;
            color: rgba(var(--app-rgb), 0.45);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: 'JetBrains Mono', Consolas, monospace;
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

    .dict-desc {
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
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }

    .dict-meta {
      display: flex;
      align-items: center;
      gap: 12px;

      .type-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 500;
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.2);

        &.business {
          color: #43e97b;
          background: rgba(67, 233, 123, 0.1);
          border-color: rgba(67, 233, 123, 0.2);
        }

        .meta-icon {
          font-size: 12px;
        }
      }

      .sort-text {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: rgba(var(--app-rgb), 0.4);

        .meta-icon {
          font-size: 12px;
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

          &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            transform: none;
            background: rgba(var(--app-rgb), 0.04);
            color: rgba(var(--app-rgb), 0.3);

            &:hover {
              transform: none;
              background: rgba(var(--app-rgb), 0.04);
            }
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

/* ================================ 编辑 / 新增弹窗 ================================ */

/* 弹窗标题（新增 / 编辑 / 删除确认共用） */
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

    .type-chip-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .type-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12.5px;
        cursor: pointer;
        color: rgba(var(--app-rgb), 0.7);
        background: rgba(var(--app-rgb), 0.05);
        border: 1px solid rgba(var(--app-rgb), 0.1);
        transition: all 0.2s ease;

        .chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--chip-color);
        }

        &:hover {
          background: rgba(var(--app-rgb), 0.1);
          color: rgba(var(--app-rgb), 0.9);
        }

        &.active {
          color: #667eea;
          font-weight: 500;
          background: rgba(102, 126, 234, 0.15);
          border-color: var(--chip-color);
          box-shadow: 0 0 0 1px var(--chip-color);
        }
      }
    }
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }
}

/* 通用操作按钮（取消 / 确认 / 危险，弹窗底部共用） */
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

/* ================================ 子字典（子项）管理 ================================ */

.item-manage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 420px;

  .item-search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    flex-shrink: 0;

    .item-search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 150px;
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

    .item-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 34px;
      padding: 0 14px;
      border-radius: 9px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.7);
      background: rgba(var(--app-rgb), 0.06);
      border: 1px solid rgba(var(--app-rgb), 0.1);
      transition: all 0.2s ease;

      &:hover {
        color: rgba(var(--app-rgb), 0.9);
        background: rgba(var(--app-rgb), 0.12);
      }

      &.primary {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.25);

        &:hover {
          background: rgba(102, 126, 234, 0.22);
        }
      }

      &.add {
        color: #43e97b;
        background: rgba(67, 233, 123, 0.1);
        border-color: rgba(67, 233, 123, 0.25);

        &:hover {
          background: rgba(67, 233, 123, 0.18);
        }
      }
    }
  }

  .item-table {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    border: 1px solid rgba(var(--app-rgb), 0.08);
    overflow: hidden;

    .item-table-header {
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

      .col-value { flex: 1.2; }
      .col-zh { flex: 1.1; }
      .col-en { flex: 1.1; }
      .col-type { flex: 0.8; }
      .col-sort { flex: 0.5; }
      .col-status { flex: 0.7; }
      .col-actions { flex: 0.8; }
    }

    .item-table-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      max-height: 340px;

      .item-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        border-bottom: 1px solid rgba(var(--app-rgb), 0.05);
        transition: background 0.2s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.04);
        }

        .col-value { flex: 1.2; }
        .col-zh { flex: 1.1; }
        .col-en { flex: 1.1; }
        .col-type { flex: 0.8; }
        .col-sort { flex: 0.5; }
        .col-status { flex: 0.7; }
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

        .item-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 500;
          border: 1px solid transparent;
          white-space: nowrap;

          .item-type-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
          }
        }

        .item-status-badge {
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

        .item-action-btn {
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

      .item-empty {
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

  .item-pagination {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }
}
</style>
