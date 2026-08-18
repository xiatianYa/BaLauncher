<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NGrid, NGridItem, NInput, NModal, NPagination } from 'naive-ui';
import dayjs from 'dayjs';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAppStore } from '@/store/modules/app';

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
  installed: boolean;
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

/** 安装状态筛选 */
type FilterKey = 'all' | 'installed' | 'notInstalled';
const filterKey = ref<FilterKey>('all');
const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'workshop.filterAll' },
  { key: 'installed', label: 'workshop.filterInstalled' },
  { key: 'notInstalled', label: 'workshop.filterNotInstalled' }
];

const keyword = ref('');

/** 分页 */
const pagination = reactive({
  current: 1,
  size: 6,
  total: 0
});

/** 全部订阅资源（由主进程读取本地创意工坊目录生成） */
const allItems = ref<WorkshopItem[]>([]);

/** 按关键词 + 安装状态筛选 */
const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return allItems.value.filter(item => {
    const matchKw = !kw || item.title.toLowerCase().includes(kw) || String(item.itemId).includes(kw);
    const matchFilter =
      filterKey.value === 'all' ||
      (filterKey.value === 'installed' && item.installed) ||
      (filterKey.value === 'notInstalled' && !item.installed);
    return matchKw && matchFilter;
  });
});

/** 当前页数据 */
const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.size;
  return filteredList.value.slice(start, start + pagination.size);
});

/** 订阅总数与占用空间统计 */
const subscribedCount = computed(() => allItems.value.length);
const totalBytes = computed(() => allItems.value.reduce((sum, item) => sum + item.size, 0));
const installedCount = computed(() => allItems.value.filter(item => item.installed).length);

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1)} ${units[i]}`;
};

const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

const handleSearch = () => {
  pagination.current = 1;
};

const handleFilter = (key: FilterKey) => {
  filterKey.value = key;
  pagination.current = 1;
};

const handlePageChange = (page: number) => {
  pagination.current = page;
};

const handleOpenFolder = async (row: WorkshopItem) => {
  // 在系统文件管理器中打开资源所在目录
  await window.ipcRenderer.invoke('open-workshop-folder', row.itemId);
};

/* ==================== 详情弹窗 ==================== */

const showDetail = ref(false);
const currentItem = ref<WorkshopItem | null>(null);

const handleDetail = (row: WorkshopItem) => {
  currentItem.value = row;
  showDetail.value = true;
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
      pagination.total = filteredList.value.length;
    } else if (result?.error === 'missing-steam-path') {
      loadError.value = $t('workshop.loadErrorNoPath');
      allItems.value = [];
      pagination.total = 0;
    } else if (result?.error === 'workshop-dir-not-found') {
      loadError.value = $t('workshop.loadErrorDir');
      allItems.value = [];
      pagination.total = 0;
    } else {
      loadError.value = $t('workshop.loadError');
      allItems.value = [];
      pagination.total = 0;
    }
  } catch {
    loadError.value = $t('workshop.loadError');
    allItems.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

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
      <div class="filter-tabs">
        <button v-for="tab in filterTabs" :key="tab.key" class="filter-tab"
          :class="{ active: filterKey === tab.key }" @click="handleFilter(tab.key)">
          {{ $t(tab.label) }}
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
        <span class="stat-item">
          <SvgIcon icon="mdi:check-circle-outline" />
          {{ $t('workshop.installedCount', { count: installedCount }) }}
        </span>
      </div>
    </div>

    <!-- 卡片列表 -->
    <div class="card-list">
      <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
        <NGridItem v-for="(row, index) in pagedList" :key="row.id" span="3 s:2 m:1 l:1">
          <div class="ws-card" :style="{ '--delay': `${index * 0.04}s`, '--type-gradient': typeStyle(row.type).gradient }">
            <!-- 预览区域 -->
            <div class="card-preview">
              <img v-if="row.preview" :src="row.preview" class="preview-img" :alt="row.title" loading="lazy" />
              <div v-else class="preview-bg">
                <SvgIcon :icon="typeStyle(row.type).icon" class="preview-icon" />
              </div>
              <span class="type-badge" :style="{ '--type-color': typeStyle(row.type).color }">
                {{ $t(typeStyle(row.type).label) }}
              </span>
              <span class="installed-badge" :class="{ installed: row.installed }">
                <span class="dot" />
                {{ row.installed ? $t('workshop.installed') : $t('workshop.notInstalled') }}
              </span>
            </div>
            <!-- 内容区域 -->
            <div class="card-body">
              <h3 class="ws-title" :title="row.title">{{ row.title }}</h3>
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
              <div class="ws-time">
                <SvgIcon icon="mdi:calendar-check" />
                <span>{{ formatDate(row.subscribedTime) }}</span>
              </div>
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
    <div v-if="pagination.total > 0" class="pagination-bar">
      <NPagination v-model:page="pagination.current" :item-count="pagination.total"
        :page-size="pagination.size" @update-page="handlePageChange" />
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
          <div class="detail-preview" :class="{ 'has-img': !!currentItem.preview }"
            :style="!currentItem.preview ? { '--type-gradient': typeStyle(currentItem.type).gradient } : undefined">
            <img v-if="currentItem.preview" :src="currentItem.preview" class="detail-preview-img" :alt="currentItem.title" />
            <SvgIcon v-else :icon="typeStyle(currentItem.type).icon" />
          </div>
          <div class="detail-head">
            <h3 class="detail-title" :title="currentItem.title">{{ currentItem.title }}</h3>
            <div class="detail-badges">
              <span class="type-badge" :style="{ '--type-color': typeStyle(currentItem.type).color }">
                {{ $t(typeStyle(currentItem.type).label) }}
              </span>
              <span class="installed-badge" :class="{ installed: currentItem.installed }">
                <span class="dot" />
                {{ currentItem.installed ? $t('workshop.installed') : $t('workshop.notInstalled') }}
              </span>
            </div>
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
          <div class="detail-item full">
            <span class="detail-label">{{ $t('workshop.detailDescription') }}</span>
            <p class="detail-desc">{{ currentItem.description || '-' }}</p>
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

    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 6px;

      .filter-tab {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 30px;
        padding: 0 14px;
        border-radius: 8px;
        border: 1px solid rgba(var(--app-rgb), 0.08);
        background: rgba(var(--app-rgb), 0.05);
        color: rgba(var(--app-rgb), 0.6);
        font-size: 12.5px;
        cursor: pointer;
        transition: all 0.25s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.1);
          color: rgba(var(--app-rgb), 0.85);
        }

        &.active {
          color: #667eea;
          background: rgba(102, 126, 234, 0.12);
          border-color: rgba(102, 126, 234, 0.25);
          font-weight: 600;
        }
      }
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;

      .stat-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.55);

        svg {
          font-size: 15px;
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

      .installed-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(4px);

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f5576c;
        }

        &.installed .dot {
          background: #43e97b;
        }
      }
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      padding: 12px 14px 14px;

      .ws-title {
        margin: 0;
        font-size: 14.5px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 0.92);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
          height: 32px;
          border-radius: 8px;
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
    padding: 4px 0;
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

      .detail-badges {
        display: flex;
        align-items: center;
        gap: 8px;

        .type-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
          color: #fff;
          background: var(--type-color);
        }

        .installed-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          color: color-mix(in srgb, var(--n-text-color) 65%, transparent);
          background: color-mix(in srgb, var(--n-text-color) 6%, transparent);

          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #f5576c;
          }

          &.installed .dot {
            background: #43e97b;
          }
        }
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
  }
}
</style>
