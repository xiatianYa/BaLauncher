<script setup lang="ts">
import { NButton, NDataTable, NEllipsis, NGrid, NGridItem, NInput, NModal, NPagination, NSkeleton, NTooltip, type DataTableColumns } from 'naive-ui';
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAppStore } from '@/store/modules/app';
import { fetchSteamWorkshopInfo } from '@/service/api';

defineOptions({ name: 'WorkshopPage' });

const emit = defineEmits<{ back: [] }>();

const appStore = useAppStore();

/* ==================== 数据类型（由主进程读取本地创意工坊目录生成） ==================== */

interface WorkshopItem {
  id: number;
  /** Steam 创意工坊物品 ID */
  itemId: number;
  title: string;
  type: 'map' | 'mod' | 'skin' | 'sound';
  /** 本地预览图地址（local-file 协议） */
  preview: string;
  /** 文件大小（字节） */
  size: number;
  subscribedTime: string;
  updatedTime: string;
  description: string;
  /** 发布信息（publish_data.txt 解析出的全部键值对） */
  publishData?: Record<string, string>;
}

/** 资源类型样式（渐变/图标/颜色/文案） */
const typeStyleMap: Record<WorkshopItem['type'], { label: string; icon: string; color: string; gradient: string }> = {
  map: { label: 'workshop.typeMap', icon: 'mdi:map', color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  mod: { label: 'workshop.typeMod', icon: 'mdi:puzzle', color: '#43e97b', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  skin: { label: 'workshop.typeSkin', icon: 'mdi:palette-outline', color: '#f5576c', gradient: 'linear-gradient(135deg, #f5576c 0%, #ffa325 100%)' },
  sound: { label: 'workshop.typeSound', icon: 'mdi:music-note', color: '#ffa325', gradient: 'linear-gradient(135deg, #ffa325 0%, #f5576c 100%)' }
};

const typeStyle = (type: WorkshopItem['type']) => typeStyleMap[type];

/* ==================== 列表与筛选 ==================== */

const loading = ref(false);
/** 读取失败时的提示文案（成功为空字符串） */
const loadError = ref('');

/** 展示模式：card 卡片 / list 列表（参考服务器列表的卡片/表格切换） */
const viewMode = ref<'card' | 'list'>('card');
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'card' ? 'list' : 'card';
};

const keyword = ref('');

/** 分页 */
const pagination = reactive({
  current: 1,
  size: 12
});

/** 每页条数可选值（最多 100 条/页） */
const pageSizes = [12, 24, 50, 100];

/** 全部订阅资源（由主进程读取本地创意工坊目录生成） */
const allItems = ref<WorkshopItem[]>([]);

/* ==================== 多选与删除 ==================== */

/** 已选中的工坊 ID 集合（每次更新时整体替换以触发响应式） */
const selectedIds = ref<Set<number>>(new Set());

/** 是否已选中某个工坊 */
const isSelected = (id: number) => selectedIds.value.has(id);

/** 全选状态：所有筛选结果均被选中 */
const isAllSelected = computed(
  () => filteredList.value.length > 0 && filteredList.value.every(item => selectedIds.value.has(item.itemId))
);

/** 半选状态：部分筛选结果被选中 */
const isIndeterminate = computed(() => {
  const selectedInList = filteredList.value.filter(item => selectedIds.value.has(item.itemId)).length;
  return selectedInList > 0 && selectedInList < filteredList.value.length;
});

/** 切换单个工坊的选中状态 */
const handleToggleSelect = (id: number, checked: boolean) => {
  const next = new Set(selectedIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  selectedIds.value = next;
};

/** 全选/取消全选（作用于当前筛选结果） */
const handleSelectAll = (checked: boolean) => {
  const next = new Set<number>();
  if (checked) {
    for (const item of filteredList.value) next.add(item.itemId);
  }
  selectedIds.value = next;
};

/** 删除确认弹窗状态（null 表示关闭；mode 区分批量删除/删除全部） */
const deleteModal = ref<{ mode: 'batch' | 'all'; count: number } | null>(null);

/** 删除执行中标记（确认按钮 loading 状态，防止重复点击） */
const deleting = ref(false);

/** 打开批量删除确认弹窗 */
const handleBatchDelete = () => {
  const ids = [...selectedIds.value];
  if (!ids.length) return;
  deleteModal.value = { mode: 'batch', count: ids.length };
};

/** 打开删除全部确认弹窗 */
const handleDeleteAll = () => {
  const ids = allItems.value.map(item => item.itemId);
  if (!ids.length) return;
  deleteModal.value = { mode: 'all', count: ids.length };
};

/** 确认删除：按弹窗模式执行主进程删除并刷新列表（不可恢复） */
const confirmDelete = async () => {
  if (!deleteModal.value || deleting.value) return;
  const ids = deleteModal.value.mode === 'batch'
    ? [...selectedIds.value]
    : allItems.value.map(item => item.itemId);
  if (!ids.length) return;
  deleting.value = true;
  try {
    const result = await window.ipcRenderer.invoke('delete-workshop-resources', ids);
    if (result?.error === 'steam-running') {
      // Steam 客户端仍在运行，提示用户先退出后再删除
      window.$message?.error($t('workshop.deleteSteamRunning'));
      return;
    }
    if (!result?.success) {
      window.$message?.error($t('workshop.deleteFailed'));
      return;
    }
    // 部分删除失败（如文件被占用）时给出失败提示
    if ((result.failed ?? 0) > 0) {
      window.$message?.warning($t('workshop.deleteFailedCount', { count: result.failed }));
    }
    window.$message?.success(
      $t('workshop.deleteSuccess', { count: result.deleted ?? ids.length }) +
      (result.acfUpdated ? ` ${$t('workshop.acfSyncHint')}` : '')
    );
    selectedIds.value = new Set();
    deleteModal.value = null;
    // 删除后重新读取本地目录刷新列表
    await loadData();
  } finally {
    deleting.value = false;
  }
};

/** 接口返回的工坊在线信息映射（key：itemId），用于增强卡片/详情展示 */
const workshopInfoMap = ref<Map<number, Api.Workshop.SteamWorkshopInfoVo>>(new Map());

/** 卡片渲染对象：本地条目 + 接口在线信息（可能为空） */
type WorkshopCard = WorkshopItem & { apiInfo?: Api.Workshop.SteamWorkshopInfoVo };

/** 获取本地条目对应的接口在线信息 */
const getApiInfo = (row: WorkshopItem): Api.Workshop.SteamWorkshopInfoVo | undefined =>
  workshopInfoMap.value.get(row.itemId);

/** 按关键词筛选 */
const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return allItems.value.filter(item => {
    return !kw || item.title.toLowerCase().includes(kw) || String(item.itemId).includes(kw);
  });
});

/* ==================== 表格排序 ==================== */

/** 当前排序列（列 key + 顺序），null 表示不排序 */
const sortState = ref<{ columnKey: string; order: 'ascend' | 'descend' } | null>(null);

/** 排序取值：仅使用本地稳定字段，避免接口在线信息按页加载导致跨页排序不一致 */
const getSortValue = (row: WorkshopItem, key: string): string | number => {
  switch (key) {
    case 'title':
      return row.title.toLowerCase();
    case 'type':
      return row.type;
    case 'size':
      return row.size;
    case 'subscribed':
      return new Date(row.subscribedTime).getTime() || 0;
    default:
      return 0;
  }
};

/** 排序后的筛选结果（先排序再分页，保证跨页排序一致） */
const sortedList = computed(() => {
  const list = filteredList.value;
  const s = sortState.value;
  if (!s) return list;
  return [...list].sort((a, b) => {
    const va = getSortValue(a, s.columnKey);
    const vb = getSortValue(b, s.columnKey);
    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb));
    return s.order === 'ascend' ? cmp : -cmp;
  });
});

/** 表格排序变化（仅维护排序状态，数据排序由 sortedList 驱动） */
const handleUpdateSorter = (sorter: { columnKey: string; order: 'ascend' | 'descend' } | null) => {
  if (!sorter?.columnKey || !sorter.order) {
    sortState.value = null;
    return;
  }
  sortState.value = { columnKey: sorter.columnKey, order: sorter.order };
};

/** 筛选结果总数（分页 item-count 直接取筛选后长度，搜索时自动更新，无需手动维护） */
const total = computed(() => filteredList.value.length);

/** 当前页数据（先排序后分页，合并接口在线信息，供卡片/详情渲染使用） */
const pagedList = computed<WorkshopCard[]>(() => {
  const start = (pagination.current - 1) * pagination.size;
  return sortedList.value.slice(start, start + pagination.size).map(item => ({
    ...item,
    apiInfo: getApiInfo(item)
  }));
});

/** 订阅总数与占用空间统计 */
const subscribedCount = computed(() => allItems.value.length);
const totalBytes = computed(() => allItems.value.reduce((sum, item) => sum + item.size, 0));

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1)} ${units[i]}`;
};

const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

/** 卡片标题：优先接口在线标题，其次本地解析标题 */
const displayTitle = (card: WorkshopCard) => card.apiInfo?.workshopInfo?.title || card.title;

/** 卡片预览图：优先接口在线预览图（Steam CDN），其次本地预览图 */
const displayPreview = (card: WorkshopCard) => card.apiInfo?.workshopInfo?.preview_url || card.preview;

/** 数字压缩展示（1234 -> 1.2k），无值时显示 - */
const formatCount = (num?: number) => {
  if (num === undefined || num === null) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
};

const handleSearch = () => {
  pagination.current = 1;
};

/** 切换每页条数（最多 100 条/页） */
const handlePageSizeChange = (size: number) => {
  pagination.size = size;
  pagination.current = 1;
};

const handleOpenFolder = async (row: WorkshopItem) => {
  // 在系统文件管理器中打开资源所在目录
  await window.ipcRenderer.invoke('open-workshop-folder', row.itemId);
};

/* ==================== 详情弹窗 ==================== */

const showDetail = ref(false);
const currentItem = ref<WorkshopCard | null>(null);

const handleDetail = (row: WorkshopItem) => {
  currentItem.value = row;
  showDetail.value = true;
};

/* ==================== 列表模式（NDataTable，样式参考 server-table-list） ==================== */

/** 表格行 key */
const tableRowKey = (row: WorkshopCard) => row.id;

/** 表格行 props：错落淡入动画延时 */
const tableRowProps = (row: WorkshopCard, index: number) => ({
  style: { '--delay': `${Math.min(index * 0.04, 0.4)}s` }
});

/** 已选中行（受控复选框，供表格多选列使用） */
const checkedRowKeys = computed(() => [...selectedIds.value]);

/** 表格勾选变化：与卡片多选共用同一份 selectedIds */
const onTableSelectionChange = (keys: Array<string | number>) => {
  selectedIds.value = new Set(keys.map(Number));
};

/** 标题单元格：预览图缩略 + 标题（超出省略），下方附地图译名 */
const renderTitleCell = (row: WorkshopCard) =>
  h('div', { class: 'td-name' }, [
    displayPreview(row)
      ? h('img', { src: displayPreview(row), class: 'ws-thumb', alt: displayTitle(row), loading: 'lazy' })
      : h('div', { class: 'ws-thumb thumb-fallback', style: { '--type-gradient': typeStyle(row.type).gradient } }, [
          h(SvgIcon, { icon: typeStyle(row.type).icon })
        ]),
    h('div', { class: 'name-wrap' }, [
      h(NEllipsis, { maxLine: 1, tooltip: { placement: 'top' }, style: 'max-width: 220px' }, { default: () => displayTitle(row) }),
      row.apiInfo?.map?.mapLabel
        ? h('span', { class: 'td-map-label' }, row.apiInfo.map.mapLabel)
        : null
    ])
  ]);

/** 类型单元格：类型色小标签 */
const renderTypeCell = (row: WorkshopCard) => {
  const c = typeStyle(row.type).color;
  return h('span', { class: 'ws-type-tag', style: { color: c, background: `${c}1a`, borderColor: `${c}33` } }, $t(typeStyle(row.type).label));
};

/** 统计单元格：订阅/收藏/浏览（接口未返回时显示 -） */
const renderStatsCell = (row: WorkshopCard) => {
  const info = row.apiInfo?.workshopInfo;
  if (!info) return h('span', { class: 'ws-empty-cell' }, '-');
  return h('div', { class: 'td-stats' }, [
    h('span', { class: 'stat', title: $t('workshop.statSubscriptions') }, [
      h(SvgIcon, { icon: 'mdi:download-circle-outline' }),
      formatCount(info.subscriptions)
    ]),
    h('span', { class: 'stat', title: $t('workshop.statFavorites') }, [
      h(SvgIcon, { icon: 'mdi:star-outline' }),
      formatCount(info.favorited)
    ]),
    h('span', { class: 'stat', title: $t('workshop.statViews') }, [
      h(SvgIcon, { icon: 'mdi:eye-outline' }),
      formatCount(info.views)
    ])
  ]);
};

/** 作者单元格：头像 + 昵称（点击跳转作者 Steam 主页） */
const renderAuthorCell = (row: WorkshopCard) => {
  const author = row.apiInfo?.author;
  if (!author) return h('span', { class: 'ws-empty-cell' }, '-');
  return h('a', { class: 'td-author', href: author.profileurl, target: '_blank', rel: 'noopener', title: author.personaname }, [
    author.avatar
      ? h('img', { src: author.avatar, class: 'author-avatar', alt: author.personaname })
      : h(SvgIcon, { icon: 'mdi:account-circle', class: 'author-icon' }),
    h('span', { class: 'author-name' }, author.personaname)
  ]);
};

/** 操作单元格：查看详情 / 打开目录（带 tooltip） */
const renderActionCell = (row: WorkshopCard) =>
  h('div', { class: 'td-actions' }, [
    h(NTooltip, { trigger: 'hover', placement: 'bottom' }, {
      trigger: () => h(NButton, { size: 'small', class: 'ws-action-btn detail', onClick: () => handleDetail(row) }, { icon: () => h(SvgIcon, { icon: 'mdi:eye-outline' }) }),
      default: () => $t('workshop.viewDetail')
    }),
    h(NTooltip, { trigger: 'hover', placement: 'bottom' }, {
      trigger: () => h(NButton, { size: 'small', class: 'ws-action-btn folder', onClick: () => handleOpenFolder(row) }, { icon: () => h(SvgIcon, { icon: 'mdi:folder-open-outline' }) }),
      default: () => $t('workshop.openFolder')
    })
  ]);

/** 表头普通文案 */
const renderPlainTitle = (label: string) => () => h('div', { class: 'th-title' }, label);

/** 列表模式列定义 */
const tableColumns: DataTableColumns<WorkshopCard> = [
  {
    type: 'selection',
    width: 40,
    fixed: 'left'
  },
  {
    key: 'title',
    title: renderPlainTitle($t('workshop.tableTitle')),
    minWidth: 200,
    resizable: true,
    sorter: true,
    render: renderTitleCell
  },
  {
    key: 'type',
    title: renderPlainTitle($t('workshop.tableType')),
    width: 88,
    resizable: true,
    sorter: true,
    render: renderTypeCell
  },
  {
    key: 'size',
    title: renderPlainTitle($t('workshop.tableSize')),
    width: 96,
    resizable: true,
    sorter: true,
    render: row => h('span', { class: 'td-value' }, formatSize(row.size))
  },
  {
    key: 'subscribed',
    title: renderPlainTitle($t('workshop.detailSubscribed')),
    width: 130,
    resizable: true,
    sorter: true,
    render: row => h('span', { class: 'td-value' }, formatDate(row.subscribedTime))
  },
  {
    key: 'stats',
    title: renderPlainTitle($t('workshop.tableStats')),
    minWidth: 180,
    resizable: true,
    render: renderStatsCell
  },
  {
    key: 'author',
    title: renderPlainTitle($t('workshop.author')),
    minWidth: 140,
    resizable: true,
    render: renderAuthorCell
  },
  {
    key: 'action',
    title: renderPlainTitle($t('workshop.tableActions')),
    width: 112,
    resizable: true,
    render: renderActionCell
  }
];

/** 读取失败：统一置空列表并展示提示文案 */
const setLoadError = (msg: string) => {
  loadError.value = msg;
  allItems.value = [];
};

/** 从 Steam 路径读取创意工坊订阅资源列表（路径为空时主进程会用注册表自动探测） */
const loadData = async () => {
  const steamPath = appStore.steamPath;
  loading.value = true;
  loadError.value = '';
  try {
    const result = await window.ipcRenderer.invoke('get-workshop-resources', steamPath);
    if (result && result.success) {
      allItems.value = (result.list || []) as WorkshopItem[];
      // 仅按当前分页查询接口在线信息（不再一次性全量查询），期间显示骨架屏；失败不影响本地数据渲染
      await loadCurrentPageWorkshopInfo();
    } else if (result?.error === 'missing-steam-path') {
      setLoadError($t('workshop.loadErrorNoPath'));
    } else if (result?.error === 'workshop-dir-not-found') {
      setLoadError($t('workshop.loadErrorDir'));
    } else {
      setLoadError($t('workshop.loadError'));
    }
  } catch {
    setLoadError($t('workshop.loadError'));
  } finally {
    loading.value = false;
  }
};

/**
 * 按当前分页调用接口查询本地工坊的在线信息（标题/预览图/统计/作者）
 * 仅请求当前页尚未缓存（未查询过）的工坊 ID，避免一次性全量查询与重复请求；
 * 查询结果合并进缓存映射，翻页/搜索时复用已查询过的数据
 * 接口鉴权由后端处理，未登录或查询失败时静默跳过，直接用本地数据渲染
 */
const loadCurrentPageWorkshopInfo = async () => {
  const start = (pagination.current - 1) * pagination.size;
  const pageItems = sortedList.value.slice(start, start + pagination.size);
  if (!pageItems.length) return;
  const missingIds = pageItems
    .map(item => item.itemId)
    .filter(id => !workshopInfoMap.value.has(id));
  if (!missingIds.length) return;
  const { data, error } = await fetchSteamWorkshopInfo(missingIds.map(String));
  if (error || !data) return;
  const next = new Map(workshopInfoMap.value);
  for (const vo of data) {
    const id = Number(vo.workshopInfo?.publishedfileid);
    if (vo.workshopInfo && id) next.set(id, vo);
  }
  workshopInfoMap.value = next;
};

/** 页码 / 每页条数变化时，按当前分页重新查询在线信息 */
watch(
  () => [pagination.current, pagination.size],
  () => loadCurrentPageWorkshopInfo(),
);

/** 排序变化时当前页内容改变，按新排序重新查询在线信息 */
watch(sortState, () => loadCurrentPageWorkshopInfo());

/** 搜索关键词输入防抖查询（300ms），避免每次击键都请求接口 */
let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(keyword, () => {
  if (keywordDebounceTimer) clearTimeout(keywordDebounceTimer);
  keywordDebounceTimer = setTimeout(() => loadCurrentPageWorkshopInfo(), 300);
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="workshop-container">
    <!-- 页面头部：标题 + 返回按钮 -->
    <div class="header-section">
      <div class="title-section">
        <SvgIcon icon="mdi:steam" class="title-icon" />
        <h1 class="page-title">{{ $t('tools.workshopTitle') }}</h1>
      </div>
      <div class="back-btn" @click="emit('back')">
        <SvgIcon icon="mdi:arrow-left" class="back-icon" />
        <span>{{ $t('keyBind.back') }}</span>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-box">
        <SvgIcon icon="mdi:magnify" class="search-icon" />
        <NInput v-model:value="keyword" :placeholder="$t('workshop.searchPlaceholder')" clearable size="small"
          @keyup.enter="handleSearch" @clear="handleSearch" />
      </div>
      <!-- 多选工具栏：全选 + 已选数量 + 批量删除 + 删除全部 -->
      <div class="select-bar">
        <!-- 全选按钮（点击切换全选/取消全选） -->
        <button class="select-all-btn" @click="handleSelectAll(!isAllSelected)">
          <SvgIcon
            :icon="isAllSelected ? 'mdi:checkbox-marked' : isIndeterminate ? 'mdi:checkbox-minus-outline' : 'mdi:checkbox-blank-outline'" />
          {{ $t('workshop.selectAll') }}
        </button>
        <span v-if="selectedIds.size > 0" class="select-count">
          {{ $t('workshop.selectedCount', { count: selectedIds.size }) }}
        </span>
        <button v-if="selectedIds.size > 0" class="delete-btn" @click="handleBatchDelete">
          <SvgIcon icon="mdi:trash-can-outline" />
          {{ $t('workshop.deleteSelected') }}
        </button>
        <button v-if="subscribedCount > 0" class="delete-btn delete-all" @click="handleDeleteAll">
          <SvgIcon icon="mdi:delete-forever-outline" />
          {{ $t('workshop.deleteAll') }}
        </button>
      </div>
      <div class="stat-info">
        <span class="stat-item">
          <SvgIcon icon="mdi:steam" />
          {{ $t('workshop.subscribedCount', { count: subscribedCount }) }}
        </span>
        <span class="stat-item">
          <SvgIcon icon="mdi:harddisk" />
          {{ $t('workshop.totalSize', { size: formatSize(totalBytes) }) }}
        </span>
        <!-- 卡片/列表视图切换 -->
        <NTooltip placement="bottom">
          <template #trigger>
            <button class="view-toggle-btn" @click="toggleViewMode">
              <SvgIcon :icon="viewMode === 'list' ? 'material-symbols:view-quilt' : 'material-symbols:view-list'" />
            </button>
          </template>
          {{ $t('workshop.switchView') }}
        </NTooltip>
      </div>
    </div>

    <!-- 卡片列表 -->
    <div class="card-list">
      <!-- 骨架屏：等待本地数据读取 + 接口在线信息返回 -->
      <NGrid v-if="loading" :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
        <NGridItem v-for="n in 12" :key="`sk-${n}`" span="3 s:2 m:1 l:1">
          <div class="ws-card skeleton-card">
            <NSkeleton class="sk-preview" :animated="true" />
            <div class="skeleton-body">
              <NSkeleton text class="sk-title" :animated="true" />
              <NSkeleton text class="sk-line" :animated="true" />
              <NSkeleton text class="sk-line short" :animated="true" />
              <div class="skeleton-actions">
                <NSkeleton text class="sk-btn" :animated="true" />
                <NSkeleton text class="sk-btn" :animated="true" />
              </div>
            </div>
          </div>
        </NGridItem>
      </NGrid>

      <!-- 真实数据：列表模式（表格，参考服务器列表） -->
      <NDataTable v-else-if="viewMode === 'list'" class="ws-table" :columns="tableColumns" :data="pagedList"
        :row-key="tableRowKey" :row-props="tableRowProps" :checked-row-keys="checkedRowKeys"
        @update:checked-row-keys="onTableSelectionChange" @update:sorter="handleUpdateSorter" :bordered="false"
        :single-line="false" table-layout="fixed" />

      <!-- 真实数据：卡片模式 -->
      <NGrid v-else :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
        <NGridItem v-for="(row, index) in pagedList" :key="row.id" span="3 s:2 m:1 l:1">
          <div class="ws-card" :class="{ selected: isSelected(row.itemId) }"
            :style="{ '--delay': `${index * 0.04}s`, '--type-gradient': typeStyle(row.type).gradient }">
            <!-- 预览区域 -->
            <div class="card-preview">
              <img v-if="displayPreview(row)" :src="displayPreview(row)" class="preview-img" :alt="displayTitle(row)" loading="lazy" />
              <div v-else class="preview-bg">
                <SvgIcon :icon="typeStyle(row.type).icon" class="preview-icon" />
              </div>
              <span class="type-badge" :style="{ '--type-color': typeStyle(row.type).color }">
                {{ $t(typeStyle(row.type).label) }}
              </span>
              <!-- 多选勾选框（卡片右上角，纯 CSS 自定义实现，不使用任何组件） -->
              <button class="card-check" :class="{ checked: isSelected(row.itemId) }"
                @click.stop="handleToggleSelect(row.itemId, !isSelected(row.itemId))">
                <span class="check-mark"></span>
              </button>
            </div>
            <!-- 内容区域 -->
            <div class="card-body">
              <div class="ws-title-row">
                <h3 class="ws-title" :title="displayTitle(row)">{{ displayTitle(row) }}</h3>
                <!-- 本地地图译名（接口返回，按标题匹配 game_map 表） -->
                <span v-if="row.apiInfo?.map?.mapLabel" class="ws-map-label" :title="$t('workshop.localMap')">
                  {{ row.apiInfo.map.mapLabel }}
                </span>
              </div>
              <div class="ws-meta">
                <span class="meta-item">
                  <SvgIcon icon="mdi:identifier" />
                  #{{ row.itemId }}
                </span>
                <span class="meta-item">
                  <SvgIcon icon="mdi:harddisk" />
                  {{ formatSize(row.size) }}
                </span>
              </div>
              <!-- 在线统计（接口返回：订阅/收藏/浏览） -->
              <div v-if="row.apiInfo?.workshopInfo" class="ws-stats">
                <span class="stat-item" :title="$t('workshop.statSubscriptions')">
                  <SvgIcon icon="mdi:download-circle-outline" />
                  {{ formatCount(row.apiInfo.workshopInfo.subscriptions) }}
                </span>
                <span class="stat-item" :title="$t('workshop.statFavorites')">
                  <SvgIcon icon="mdi:star-outline" />
                  {{ formatCount(row.apiInfo.workshopInfo.favorited) }}
                </span>
                <span class="stat-item" :title="$t('workshop.statViews')">
                  <SvgIcon icon="mdi:eye-outline" />
                  {{ formatCount(row.apiInfo.workshopInfo.views) }}
                </span>
              </div>
              <div class="ws-time">
                <SvgIcon icon="mdi:calendar-check" />
                <span>{{ formatDate(row.subscribedTime) }}</span>
              </div>
              <!-- 作者信息（接口返回，点击跳转作者 Steam 主页） -->
              <a v-if="row.apiInfo?.author" class="ws-author" :href="row.apiInfo.author.profileurl" target="_blank"
                rel="noopener" :title="row.apiInfo.author.personaname">
                <img v-if="row.apiInfo.author.avatar" :src="row.apiInfo.author.avatar" class="author-avatar"
                  :alt="row.apiInfo.author.personaname" />
                <SvgIcon v-else icon="mdi:account-circle" class="author-icon" />
                <span class="author-name">{{ row.apiInfo.author.personaname }}</span>
              </a>
              <div class="card-actions">
                <button class="action-btn detail" @click="handleDetail(row)">
                  <SvgIcon icon="mdi:eye-outline" />
                  <span>{{ $t('workshop.viewDetail') }}</span>
                </button>
                <button class="action-btn folder" @click="handleOpenFolder(row)">
                  <SvgIcon icon="mdi:folder-open-outline" />
                  <span>{{ $t('workshop.openFolder') }}</span>
                </button>
              </div>
            </div>
          </div>
        </NGridItem>
      </NGrid>

      <!-- 空状态 -->
      <div v-if="!loading && filteredList.length === 0" class="empty-state">
        <SvgIcon icon="mdi:steam" class="empty-icon" />
        <p>{{ loadError || $t('workshop.empty') }}</p>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination-bar">
      <NPagination v-model:page="pagination.current" :item-count="total"
        :page-size="pagination.size" :page-sizes="pageSizes" show-size-picker
        @update:page-size="handlePageSizeChange" />
    </div>

    <!-- 资源详情弹窗 -->
    <NModal v-model:show="showDetail" preset="card" class="detail-modal w-680px rounded-16px" :bordered="false"
      size="small">
      <template #header>
        <div class="detail-modal-header">
          <div class="detail-modal-icon-wrap">
            <SvgIcon icon="mdi:steam" class="detail-modal-icon" />
          </div>
          <span>{{ $t('workshop.detailTitle') }}</span>
        </div>
      </template>
      <div v-if="currentItem" class="detail-modal-body">
        <!-- 顶部：大预览 + 标题 -->
        <div class="detail-hero">
          <div class="detail-preview" :class="{ 'has-img': !!displayPreview(currentItem) }"
            :style="!displayPreview(currentItem) ? { '--type-gradient': typeStyle(currentItem.type).gradient } : undefined">
            <img v-if="displayPreview(currentItem)" :src="displayPreview(currentItem)" class="detail-preview-img"
              :alt="displayTitle(currentItem)" />
            <SvgIcon v-else :icon="typeStyle(currentItem.type).icon" />
          </div>
          <div class="detail-head">
            <h3 class="detail-title" :title="displayTitle(currentItem)">{{ displayTitle(currentItem) }}</h3>
            <span class="type-badge" :style="{ '--type-color': typeStyle(currentItem.type).color }">
              {{ $t(typeStyle(currentItem.type).label) }}
            </span>
            <a class="detail-steam-link" :href="`https://steamcommunity.com/sharedfiles/filedetails/?id=${currentItem.itemId}`"
              target="_blank" rel="noopener">
              <SvgIcon icon="mdi:open-in-new" />
              {{ $t('workshop.viewOnSteam') }}
            </a>
          </div>
        </div>

        <!-- 字段详情 -->
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ $t('workshop.detailId') }}</span>
            <span class="detail-value mono">#{{ currentItem.itemId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('workshop.detailSize') }}</span>
            <span class="detail-value">{{ formatSize(currentItem.size) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('workshop.detailSubscribed') }}</span>
            <span class="detail-value">{{ formatDate(currentItem.subscribedTime) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('workshop.detailUpdated') }}</span>
            <span class="detail-value">{{ formatDate(currentItem.updatedTime) }}</span>
          </div>
          <!-- 本地地图译名（接口返回，按标题匹配 game_map 表） -->
          <div v-if="currentItem.apiInfo?.map" class="detail-item">
            <span class="detail-label">{{ $t('workshop.localMap') }}</span>
            <span class="detail-value">{{ currentItem.apiInfo.map.mapLabel || currentItem.apiInfo.map.mapName || '-' }}</span>
          </div>
          <!-- 在线统计（接口返回） -->
          <template v-if="currentItem.apiInfo?.workshopInfo">
            <div class="detail-item">
              <span class="detail-label">{{ $t('workshop.statSubscriptions') }}</span>
              <span class="detail-value">{{ formatCount(currentItem.apiInfo.workshopInfo.subscriptions) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('workshop.statFavorites') }}</span>
              <span class="detail-value">{{ formatCount(currentItem.apiInfo.workshopInfo.favorited) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">{{ $t('workshop.statViews') }}</span>
              <span class="detail-value">{{ formatCount(currentItem.apiInfo.workshopInfo.views) }}</span>
            </div>
          </template>
          <!-- 作者信息（接口返回，点击跳转作者 Steam 主页） -->
          <div v-if="currentItem.apiInfo?.author" class="detail-item">
            <span class="detail-label">{{ $t('workshop.author') }}</span>
            <a class="detail-author" :href="currentItem.apiInfo.author.profileurl" target="_blank" rel="noopener">
              <img v-if="currentItem.apiInfo.author.avatar" :src="currentItem.apiInfo.author.avatar"
                class="author-avatar" :alt="currentItem.apiInfo.author.personaname" />
              <SvgIcon v-else icon="mdi:account-circle" class="author-icon" />
              <span>{{ currentItem.apiInfo.author.personaname }}</span>
            </a>
          </div>
          <!-- 资源标签（接口返回） -->
          <div v-if="currentItem.apiInfo?.workshopInfo?.tags?.length" class="detail-item full">
            <span class="detail-label">{{ $t('workshop.detailTags') }}</span>
            <div class="tag-list">
              <span v-for="tag in currentItem.apiInfo.workshopInfo.tags" :key="tag.tag" class="tag-chip">{{ tag.tag }}</span>
            </div>
          </div>
          <div class="detail-item full">
            <span class="detail-label">{{ $t('workshop.detailDescription') }}</span>
            <p class="detail-desc">{{ currentItem.apiInfo?.workshopInfo?.file_description || currentItem.description || '-' }}</p>
          </div>
          <!-- 发布信息（publish_data.txt 完整内容） -->
          <div v-if="currentItem.publishData && Object.keys(currentItem.publishData).length" class="detail-item full">
            <span class="detail-label">{{ $t('workshop.detailPublishData') }}</span>
            <div class="publish-data-list">
              <div v-for="(value, key) in currentItem.publishData" :key="key" class="publish-data-row">
                <span class="pd-key">{{ key }}</span>
                <span class="pd-value" :title="value">{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NModal>

    <!-- 删除确认弹窗（独立 NModal 提示用户，替代 window.$dialog） -->
    <NModal :show="!!deleteModal" preset="card" class="delete-modal w-400px rounded-16px" :bordered="false" size="small"
      @update:show="(v: boolean) => { if (!v) deleteModal = null; }">
      <template #header>
        <div class="delete-modal-header">
          <div class="delete-modal-icon-wrap">
            <SvgIcon icon="mdi:delete-alert-outline" class="delete-modal-icon" />
          </div>
          <span>{{ deleteModal?.mode === 'all' ? $t('workshop.deleteAllTitle') : $t('workshop.deleteTitle') }}</span>
        </div>
      </template>
      <div class="delete-modal-body">
        <p class="delete-tip">
          {{ deleteModal?.mode === 'all'
            ? $t('workshop.deleteAllConfirm', { count: deleteModal?.count ?? 0 })
            : $t('workshop.deleteConfirm', { count: deleteModal?.count ?? 0 }) }}
        </p>
        <!-- 操作前置提示：需先退出游戏与 Steam，避免本地文件被占用导致地图缺失 -->
        <div class="delete-hint">
          <SvgIcon icon="mdi:information-outline" class="delete-hint-icon" />
          <span>{{ $t('workshop.deleteHint') }}</span>
        </div>
        <!-- 素材缺失提示：进入服务器遇社区素材丢失时需重新订阅资源包 -->
        <div class="delete-hint assets">
          <SvgIcon icon="mdi:map-marker-alert-outline" class="delete-hint-icon" />
          <span>{{ $t('workshop.deleteHintAssets') }}</span>
        </div>
      </div>
      <template #footer>
        <div class="delete-modal-footer">
          <NButton size="small" :disabled="deleting" @click="deleteModal = null">{{ $t('common.cancel') }}</NButton>
          <NButton size="small" type="error" :loading="deleting" @click="confirmDelete">
            {{ deleteModal?.mode === 'all' ? $t('workshop.deleteAll') : $t('workshop.deleteSelected') }}
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.workshop-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 14px;

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
        font-size: 24px;
        color: #667eea;
      }

      .page-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: var(--n-text-color);
        letter-spacing: 0.5px;
      }
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      color: #667eea;
      background: rgba(102, 126, 234, 0.15);
      border: 1px solid rgba(var(--app-rgb), 0.1);
      transition: all 0.3s ease;

      &:hover {
        background: rgba(102, 126, 234, 0.3);
      }

      .back-icon {
        font-size: 20px;
      }
    }
  }

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

    /* 多选工具栏 */
    .select-bar {
      display: flex;
      align-items: center;
      gap: 8px;

      .select-all-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 30px;
        padding: 0 12px;
        border-radius: 6px;
        border: 1px solid rgba(102, 126, 234, 0.3);
        background: rgba(102, 126, 234, 0.1);
        color: #667eea;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s ease;

        &:hover {
          background: rgba(102, 126, 234, 0.2);
          transform: translateY(-1px);
        }

        svg {
          font-size: 14px;
        }
      }

      .select-count {
        font-size: 12px;
        font-weight: 600;
        color: #667eea;
      }

      .delete-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 30px;
        padding: 0 12px;
        border-radius: 6px;
        border: 1px solid rgba(245, 87, 108, 0.35);
        background: rgba(245, 87, 108, 0.12);
        color: #f5576c;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s ease;

        &:hover {
          background: rgba(245, 87, 108, 0.22);
          transform: translateY(-1px);
        }

        svg {
          font-size: 14px;
        }

        /* 删除全部：描边样式与"删除选中"区分 */
        &.delete-all {
          background: transparent;
          border-style: dashed;

          &:hover {
            background: rgba(245, 87, 108, 0.15);
          }
        }
      }
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;

      /* 小 tag 样式 */
      .stat-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 500;
        white-space: nowrap;
        color: rgba(var(--app-rgb), 0.65);
        background: rgba(102, 126, 234, 0.08);
        border: 1px solid rgba(102, 126, 234, 0.18);

        svg {
          font-size: 13px;
          color: #667eea;
        }
      }

      /* 卡片/列表视图切换按钮 */
      .view-toggle-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        padding: 0;
        border-radius: 6px;
        border: 1px solid rgba(102, 126, 234, 0.25);
        background: rgba(102, 126, 234, 0.08);
        color: #667eea;
        cursor: pointer;
        transition: all 0.25s ease;

        &:hover {
          background: rgba(102, 126, 234, 0.18);
          transform: translateY(-1px);
        }

        svg {
          font-size: 14px;
          color: #667eea;
        }
      }
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

    /* ===== 列表模式表格（样式参考 server-table-list） ===== */
    .ws-table {
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

      :deep(.th-title) {
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

      :deep(.n-data-table-td:first-child) {
        border-radius: 12px 0 0 12px;
      }

      :deep(.n-data-table-td:last-child) {
        border-radius: 0 12px 12px 0;
      }

      /* 行进入动画：错落淡入上浮 */
      :deep(.n-data-table-tr) {
        animation: fadeInUp 0.5s ease-out forwards;
        animation-delay: var(--delay, 0s);
        opacity: 0;
      }

      :deep(.n-data-table-tr:hover .n-data-table-td) {
        background: rgba(var(--app-rgb), 0.06);
      }

      /* ===== 标题列 ===== */
      :deep(.td-name) {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      :deep(.ws-thumb) {
        width: 56px;
        height: 36px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
      }

      :deep(.ws-thumb.thumb-fallback) {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--type-gradient);

        svg {
          font-size: 18px;
          color: #fff;
        }
      }

      :deep(.name-wrap) {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      :deep(.name-wrap .n-ellipsis) {
        font-size: 13.5px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 0.92);
      }

      :deep(.td-map-label) {
        font-size: 11px;
        font-weight: 500;
        color: #43e97b;
        background: rgba(67, 233, 123, 0.1);
        border: 1px solid rgba(67, 233, 123, 0.25);
        padding: 1px 6px;
        border-radius: 999px;
        align-self: flex-start;
        max-width: 110px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ===== 类型 ===== */
      :deep(.ws-type-tag) {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      /* ===== 普通文本值 ===== */
      :deep(.td-value) {
        font-size: 12.5px;
        color: rgba(var(--app-rgb), 0.7);
        white-space: nowrap;
      }

      :deep(.ws-empty-cell) {
        font-size: 12.5px;
        color: rgba(var(--app-rgb), 0.4);
      }

      /* ===== 统计 ===== */
      :deep(.td-stats) {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      :deep(.td-stats .stat) {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12.5px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 0.75);
        white-space: nowrap;

        svg {
          font-size: 14px;
          color: #667eea;
        }
      }

      /* ===== 作者 ===== */
      :deep(.td-author) {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        text-decoration: none;
      }

      :deep(.td-author .author-avatar) {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      :deep(.td-author .author-icon) {
        font-size: 24px;
        color: #667eea;
        flex-shrink: 0;
      }

      :deep(.td-author .author-name) {
        font-size: 12.5px;
        color: rgba(var(--app-rgb), 0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      :deep(.td-author:hover .author-name) {
        color: #667eea;
      }

      /* ===== 操作按钮 ===== */
      :deep(.td-actions) {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }

      :deep(.ws-action-btn) {
        min-width: 34px;
        border-radius: 6px;
        transition: all 0.2s ease;

        &.detail {
          color: rgba(102, 126, 234, 0.9);
          background: rgba(102, 126, 234, 0.08);
          border: 1px solid rgba(102, 126, 234, 0.2);

          &:hover {
            background: rgba(102, 126, 234, 0.2);
            color: #667eea;
            border-color: rgba(102, 126, 234, 0.4);
          }
        }

        &.folder {
          color: rgba(249, 115, 22, 0.9);
          background: rgba(249, 115, 22, 0.08);
          border: 1px solid rgba(249, 115, 22, 0.2);

          &:hover {
            background: rgba(249, 115, 22, 0.2);
            color: #f97316;
            border-color: rgba(249, 115, 22, 0.4);
          }
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }

  .ws-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: 14px;
    background: rgba(var(--app-rgb), 0.05);
    border: 1px solid rgba(var(--app-rgb), 0.08);
    overflow: hidden;
    transition: all 0.3s ease;
    animation: fadeInUp 0.5s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;

    &:hover {
      transform: translateY(-4px);
      border-color: rgba(102, 126, 234, 0.35);
      box-shadow: 0 10px 28px rgba(102, 126, 234, 0.12);
    }

    /* 选中态：卡片整体高亮描边，与勾选框联动反馈 */
    &.selected {
      border-color: rgba(102, 126, 234, 0.8);
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25), 0 10px 28px rgba(102, 126, 234, 0.15);
    }

    &.skeleton-card {
      cursor: default;
      opacity: 1;

      &:hover {
        transform: none;
        border-color: rgba(var(--app-rgb), 0.08);
        box-shadow: none;
      }

      .sk-preview {
        height: 110px;
        flex-shrink: 0;
        border-radius: 0;
      }

      .skeleton-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 10px;
        padding: 12px 14px 14px;

        .sk-title {
          width: 70%;
          height: 16px;
        }

        .sk-line {
          width: 100%;
          height: 14px;
        }

        .sk-line.short {
          width: 55%;
        }

        .skeleton-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;

          .sk-btn {
            flex: 1;
            height: 32px;
            border-radius: 8px;
          }
        }
      }
    }

    .card-preview {
      position: relative;
      height: 110px;
      flex-shrink: 0;

      .preview-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .preview-bg {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--type-gradient);
        opacity: 0.85;

        &::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.25) 100%);
        }

        .preview-icon {
          font-size: 44px;
          color: rgba(255, 255, 255, 0.9);
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
        }
      }

      .type-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 600;
        color: #fff;
        background: var(--type-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      }

      /* 多选勾选框（卡片右上角，纯 CSS 自绘，不使用任何组件）
         配色参考 botGroup 主题色 #12b7f5（亮蓝平面纯色，不用紫色渐变）
         未选中：半透明圆底 + 白色描边，悬停加深并放大
         选中：亮蓝纯色圆底 + 白色对勾（弹跳浮现），与卡片描边高亮联动 */
      .card-check {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: 2px solid rgba(255, 255, 255, 0.85);
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: all 0.25s ease;

        /* 勾号：白色 L 形边框旋转 45°，纯 CSS 绘制 */
        .check-mark {
          width: 9px;
          height: 5px;
          margin-top: -2px;
          border-left: 2px solid #fff;
          border-bottom: 2px solid #fff;
          transform: rotate(-45deg) scale(0);
          opacity: 0;
          transition: all 0.2s ease;
        }

        &:hover {
          background: rgba(18, 183, 245, 0.55);
          transform: scale(1.12);
        }

        &:active {
          transform: scale(0.9);
        }

        /* 选中态：亮蓝纯色圆底 + 对勾浮现 */
        &.checked {
          border-color: transparent;
          background: #12b7f5;
          box-shadow: 0 2px 8px rgba(18, 183, 245, 0.5);

          .check-mark {
            transform: rotate(-45deg) scale(1);
            opacity: 1;
          }
        }
      }
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      padding: 12px 14px 14px;

      .ws-title-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;

        .ws-title {
          flex: 1;
          min-width: 0;
          margin: 0;
          font-size: 14.5px;
          font-weight: 600;
          color: rgba(var(--app-rgb), 0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 本地地图译名（位于标题右侧，无图标） */
        .ws-map-label {
          flex-shrink: 0;
          max-width: 110px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
          color: #43e97b;
          background: rgba(67, 233, 123, 0.1);
          border: 1px solid rgba(67, 233, 123, 0.25);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .ws-meta {
        display: flex;
        align-items: center;
        gap: 12px;

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          color: rgba(var(--app-rgb), 0.5);

          svg {
            font-size: 13px;
            color: #667eea;
          }
        }
      }

      .ws-stats {
        display: flex;
        align-items: center;
        gap: 12px;

        .stat-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          color: rgba(var(--app-rgb), 0.5);

          svg {
            font-size: 13px;
            color: #667eea;
          }
        }
      }

      .ws-author {
        display: flex;
        align-items: center;
        gap: 6px;
        width: fit-content;
        font-size: 11.5px;
        color: rgba(var(--app-rgb), 0.55);
        text-decoration: none;
        transition: color 0.25s ease;

        &:hover {
          color: #667eea;
        }

        .author-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(var(--app-rgb), 0.1);
        }

        .author-icon {
          font-size: 18px;
          color: rgba(var(--app-rgb), 0.4);
        }

        .author-name {
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .ws-time {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        color: rgba(var(--app-rgb), 0.45);

        svg {
          font-size: 13px;
          color: rgba(var(--app-rgb), 0.45);
        }
      }

      .card-actions {
        display: flex;
        gap: 8px;
        margin-top: auto;
        padding-top: 4px;

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex: 1;
          height: 30px;
          border-radius: 6px;
          border: 1px solid rgba(var(--app-rgb), 0.08);
          background: rgba(var(--app-rgb), 0.05);
          color: rgba(var(--app-rgb), 0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.25s ease;

          &:hover {
            transform: translateY(-1px);
          }

          &.detail {
            color: #667eea;
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(102, 126, 234, 0.25);

            &:hover {
              background: rgba(102, 126, 234, 0.2);
            }
          }

          &.folder {
            color: #43e97b;
            background: rgba(67, 233, 123, 0.1);
            border-color: rgba(67, 233, 123, 0.25);

            &:hover {
              background: rgba(67, 233, 123, 0.2);
            }
          }
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 260px;
    color: rgba(var(--app-rgb), 0.4);

    .empty-icon {
      font-size: 56px;
      opacity: 0.5;
    }

    p {
      margin: 0;
      font-size: 13px;
    }
  }

  .pagination-bar {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<style lang="scss">
/* ================================ 资源详情弹窗（teleport 到 body） ================================ */
.detail-modal {
  width: 680px;
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  /* 固定高度下，头部不压缩，内容区自适应滚动 */
  .n-card-header {
    flex-shrink: 0;
  }

  .n-card__content {
    flex: 1;
    min-height: 0;
  }

  .detail-modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .detail-modal-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: rgba(102, 126, 234, 0.12);

      .detail-modal-icon {
        font-size: 18px;
        color: #667eea;
      }
    }
  }

  .detail-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 4px 0;
    overflow-y: auto;
  }

  .detail-hero {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--n-text-color) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--n-text-color) 10%, transparent);

    .detail-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 72px;
      flex-shrink: 0;
      border-radius: 10px;
      background: var(--type-gradient);
      font-size: 36px;
      color: rgba(255, 255, 255, 0.9);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
      overflow: hidden;

      &.has-img {
        background: color-mix(in srgb, var(--n-text-color) 5%, transparent);
      }

      .detail-preview-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .detail-head {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;

      .detail-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--n-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .type-badge {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 600;
        color: #fff;
        background: var(--type-color);
      }

      .detail-steam-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        width: fit-content;
        font-size: 12px;
        color: #667eea;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }

        svg {
          font-size: 14px;
        }
      }
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 14px;

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      padding: 10px 12px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--n-text-color) 4%, transparent);
      border: 1px solid color-mix(in srgb, var(--n-text-color) 8%, transparent);

      &.full {
        grid-column: 1 / -1;
      }

      .detail-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.6px;
        color: color-mix(in srgb, var(--n-text-color) 45%, transparent);
      }

      .detail-value {
        font-size: 13px;
        color: color-mix(in srgb, var(--n-text-color) 88%, transparent);
        word-break: break-all;

        &.mono {
          font-family: 'JetBrains Mono', Consolas, monospace;
          font-size: 12px;
        }
      }

      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .tag-chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 500;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
        }
      }

      .detail-desc {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.7;
        color: color-mix(in srgb, var(--n-text-color) 75%, transparent);
        word-break: break-all;
      }

      .publish-data-list {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .publish-data-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          .pd-key {
            flex-shrink: 0;
            min-width: 88px;
            padding: 3px 10px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', Consolas, monospace;
            font-size: 11px;
            color: #667eea;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
          }

          .pd-value {
            font-size: 12.5px;
            line-height: 1.8;
            color: color-mix(in srgb, var(--n-text-color) 80%, transparent);
            word-break: break-all;
            white-space: pre-wrap;
          }
        }
      }
    }

    .detail-author {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      font-size: 13px;
      color: #667eea;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }

      .author-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
      }

      .author-icon {
        font-size: 24px;
        color: rgba(var(--n-text-color), 0.4);
      }
    }
  }
}

/* ================================ 删除确认弹窗（teleport 到 body） ================================ */
.delete-modal {
  width: 400px;

  .delete-modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .delete-modal-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: rgba(245, 87, 108, 0.12);

      .delete-modal-icon {
        font-size: 18px;
        color: #f5576c;
      }
    }
  }

  .delete-modal-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 6px 2px;

    .delete-tip {
      margin: 0;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.7;
      color: color-mix(in srgb, var(--n-text-color) 85%, transparent);
      background: rgba(245, 87, 108, 0.06);
      border: 1px solid rgba(245, 87, 108, 0.22);
    }

    /* 操作前置提示：需先退出游戏与 Steam */
    .delete-hint {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.6;
      color: #f97316;
      background: rgba(249, 115, 22, 0.1);
      border: 1px solid rgba(249, 115, 22, 0.25);

      .delete-hint-icon {
        flex-shrink: 0;
        font-size: 14px;
        margin-top: 1px;
      }
    }

    /* 素材缺失提示（蓝色调，与橙色操作提示区分） */
    .delete-hint.assets {
      color: #667eea;
      background: rgba(102, 126, 234, 0.08);
      border-color: rgba(102, 126, 234, 0.22);
    }
  }

  .delete-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>
