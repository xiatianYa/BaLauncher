<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NCard, NGrid, NGridItem, NInput, NInfiniteScroll, NSpin } from 'naive-ui';
import {
  fetchGetFeedbackPage,
  fetchGetMyFeedbackList,
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';
import FeedbackCard from './modules/FeedbackCard.vue';
import FeedbackAddModal from './modules/FeedbackAddModal.vue';
import FeedbackHandleModal from './modules/FeedbackHandleModal.vue';
import FeedbackDetail from './modules/FeedbackDetail.vue';
import FeedbackDeleteModal from './modules/FeedbackDeleteModal.vue';

defineOptions({ name: 'Feedback' });

const { isAdmin } = useAuth();

/** 字典文案：反馈类型 / 状态 / 优先级（筛选下拉用） */
const { dictLabel } = useDict();
const getTypeText = (type?: number) => (type != null ? dictLabel('sys_feedback_type', String(type)) || '-' : '-');
const getStatusText = (status?: number) => (status != null ? dictLabel('sys_feedback_status', String(status)) || '-' : '-');
const getPriorityText = (priority?: number) =>
  priority != null ? dictLabel('sys_feedback_priority', String(priority)) || '-' : '-';

/* ==================== 列表与滚动加载 ==================== */

const loading = ref(false);
const loadingMore = ref(false);
const finished = ref(false);
const limit = ref(9);
const list = ref<Api.System.SysFeedbackVo[]>([]);
const showMyFeedback = ref(false);

const filters = reactive({
  title: '',
  feedbackType: null as number | null,
  status: null as number | null,
  priority: null as number | null,
});

const typeMenuOpen = ref(false);
const statusMenuOpen = ref(false);
const priorityMenuOpen = ref(false);

/* ==================== 数据加载 ==================== */

/** 从接口过滤后的数据中追加新条目（去重） */
const appendUnique = (records: Api.System.SysFeedbackVo[]) => {
  const existingIds = new Set(list.value.map(item => item.id));
  const newItems = records.filter(item => !existingIds.has(item.id));
  list.value = [...list.value, ...newItems];
};

const loadData = async () => {
  if (loadingMore.value) return;

  if (list.value.length === 0) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    if (showMyFeedback.value) {
      const { data, error } = await fetchGetMyFeedbackList();
      if (!error && data) {
        list.value = data || [];
        finished.value = true;
      }
      return;
    }

    const { data, error } = await fetchGetFeedbackPage({
      title: filters.title || null,
      feedbackType: filters.feedbackType,
      status: filters.status,
      priority: filters.priority,
      current: 1,
      size: limit.value,
    });

    if (!error && data) {
      if (list.value.length === 0) {
        list.value = data.records || [];
      } else {
        appendUnique(data.records || []);
      }

      if ((data.records || []).length < limit.value) {
        finished.value = true;
      }
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

/** 滚动加载更多（NInfiniteScroll 触发） */
const loadMore = () => {
  if (!finished.value && !loadingMore.value) {
    limit.value += 9;
    loadData();
  }
};

/** 搜索/筛选：重置列表并重新加载 */
const handleSearch = () => {
  list.value = [];
  limit.value = 9;
  finished.value = false;
  loadData();
};

/** 重置所有筛选条件 */
const handleReset = () => {
  filters.title = '';
  filters.feedbackType = null;
  filters.status = null;
  filters.priority = null;
  showMyFeedback.value = false;
  list.value = [];
  limit.value = 9;
  finished.value = false;
  loadData();
};

/** 切换「全部反馈 / 我的反馈」 */
const handleToggleView = (value: 'all' | 'my') => {
  showMyFeedback.value = value === 'my';
  list.value = [];
  limit.value = 9;
  finished.value = false;
  loadData();
};

/* ==================== 弹窗状态 ==================== */

const showAddModal = ref(false);
const showDeleteModal = ref(false);
const showHandleModal = ref(false);
/** 详情页当前反馈（非空时切换到详情页） */
const activeDetail = ref<Api.System.SysFeedbackVo | null>(null);
const deleteFeedback = ref<Api.System.SysFeedbackVo | null>(null);
/** 待处理的反馈 */
const handleFeedback = ref<Api.System.SysFeedbackVo | null>(null);

const handleViewDetail = (row: Api.System.SysFeedbackVo) => { activeDetail.value = row; };
const handleOpenDelete = (row: Api.System.SysFeedbackVo) => { deleteFeedback.value = row; showDeleteModal.value = true; };
const handleOpenHandle = (row: Api.System.SysFeedbackVo) => { handleFeedback.value = row; showHandleModal.value = true; };

const handleRefresh = () => {
  list.value = [];
  limit.value = 9;
  finished.value = false;
  loadData();
};

onMounted(() => { loadData(); });
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true, footer: 'soft' }" v-if="!activeDetail">
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:message-question-outline" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.feedback') }}</h1>
              <span class="page-subtitle">{{ $t('feedback.listSubtitle') }}</span>
            </div>
          </div>
          <div class="header-right">
            <div class="view-switcher">
              <button class="switch-btn" :class="{ active: !showMyFeedback }" @click="handleToggleView('all')">
                <SvgIcon icon="mdi:view-grid" class="switch-icon" />
                <span>{{ $t('feedback.allFeedback') }}</span>
              </button>
              <button class="switch-btn" :class="{ active: showMyFeedback }" @click="handleToggleView('my')">
                <SvgIcon icon="mdi:account-circle" class="switch-icon" />
                <span>{{ $t('feedback.myFeedback') }}</span>
              </button>
            </div>
            <button class="header-btn primary" @click="showAddModal = true">
              <SvgIcon icon="mdi:plus" />
              <span>{{ $t('feedback.addFeedback') }}</span>
            </button>
          </div>
        </div>
      </template>

      <div class="feedback-container">
        <!-- 搜索栏 -->
        <div v-if="!showMyFeedback" class="search-bar">
          <div class="search-box">
            <SvgIcon icon="mdi:magnify" class="search-icon" />
            <NInput v-model:value="filters.title" :placeholder="$t('feedback.searchTitle')" clearable size="small"
              @keyup.enter="handleSearch" />
          </div>
          <!-- 类型下拉 -->
          <div class="custom-select" :class="{ open: typeMenuOpen }">
            <div class="select-trigger" @click.stop="typeMenuOpen = !typeMenuOpen; statusMenuOpen = false; priorityMenuOpen = false">
              <SvgIcon icon="mdi:shape" class="select-prefix-icon" />
              <span class="select-value" :class="{ placeholder: filters.feedbackType == null }">
                {{ filters.feedbackType != null ? getTypeText(filters.feedbackType) : $t('feedback.typeAll') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
            </div>
            <transition name="select-fade">
              <div v-if="typeMenuOpen" class="select-menu">
                <div class="select-option" :class="{ active: filters.feedbackType == null }"
                  @click="filters.feedbackType = null; typeMenuOpen = false">
                  <span>{{ $t('feedback.typeAll') }}</span>
                  <SvgIcon v-if="filters.feedbackType == null" icon="mdi:check" class="option-check" />
                </div>
                <div v-for="t in [0, 1, 2, 3]" :key="t" class="select-option"
                  :class="{ active: filters.feedbackType === t }"
                  @click="filters.feedbackType = filters.feedbackType === t ? null : t; typeMenuOpen = false">
                  <span>{{ getTypeText(t) }}</span>
                  <SvgIcon v-if="filters.feedbackType === t" icon="mdi:check" class="option-check" />
                </div>
              </div>
            </transition>
          </div>
          <!-- 状态下拉 -->
          <div class="custom-select" :class="{ open: statusMenuOpen }">
            <div class="select-trigger" @click.stop="statusMenuOpen = !statusMenuOpen; typeMenuOpen = false; priorityMenuOpen = false">
              <SvgIcon icon="mdi:flag" class="select-prefix-icon" />
              <span class="select-value" :class="{ placeholder: filters.status == null }">
                {{ filters.status != null ? getStatusText(filters.status) : $t('feedback.statusAll') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
            </div>
            <transition name="select-fade">
              <div v-if="statusMenuOpen" class="select-menu">
                <div class="select-option" :class="{ active: filters.status == null }"
                  @click="filters.status = null; statusMenuOpen = false">
                  <span>{{ $t('feedback.statusAll') }}</span>
                  <SvgIcon v-if="filters.status == null" icon="mdi:check" class="option-check" />
                </div>
                <div v-for="s in [0, 1, 2, 3, 4]" :key="s" class="select-option"
                  :class="{ active: filters.status === s }"
                  @click="filters.status = filters.status === s ? null : s; statusMenuOpen = false">
                  <span>{{ getStatusText(s) }}</span>
                  <SvgIcon v-if="filters.status === s" icon="mdi:check" class="option-check" />
                </div>
              </div>
            </transition>
          </div>
          <!-- 优先级下拉 -->
          <div class="custom-select" :class="{ open: priorityMenuOpen }">
            <div class="select-trigger" @click.stop="priorityMenuOpen = !priorityMenuOpen; typeMenuOpen = false; statusMenuOpen = false">
              <SvgIcon icon="mdi:alert-circle" class="select-prefix-icon" />
              <span class="select-value" :class="{ placeholder: filters.priority == null }">
                {{ filters.priority != null ? getPriorityText(filters.priority) : $t('feedback.typeAll') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
            </div>
            <transition name="select-fade">
              <div v-if="priorityMenuOpen" class="select-menu">
                <div class="select-option" :class="{ active: filters.priority == null }"
                  @click="filters.priority = null; priorityMenuOpen = false">
                  <span>{{ $t('feedback.typeAll') }}</span>
                  <SvgIcon v-if="filters.priority == null" icon="mdi:check" class="option-check" />
                </div>
                <div v-for="p in [0, 1, 2, 3]" :key="p" class="select-option"
                  :class="{ active: filters.priority === p }"
                  @click="filters.priority = filters.priority === p ? null : p; priorityMenuOpen = false">
                  <span>{{ getPriorityText(p) }}</span>
                  <SvgIcon v-if="filters.priority === p" icon="mdi:check" class="option-check" />
                </div>
              </div>
            </transition>
          </div>
          <button class="icon-btn search-action-btn" @click="handleSearch">
            <SvgIcon icon="mdi:magnify" />
            <span>{{ $t('feedback.search') }}</span>
          </button>
          <button class="icon-btn reset-btn" @click="handleReset">
            <SvgIcon icon="mdi:refresh" />
          </button>
        </div>

        <!-- 骨架屏：首次加载（与 updateLog 一致） -->
        <NGrid v-if="loading && list.length === 0" :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
          <NGridItem v-for="i in 6" :key="`sk-${i}`" span="3 s:2 m:1 l:1">
            <div class="feedback-card skeleton">
              <div class="skeleton-title" />
              <div class="skeleton-line" />
              <div class="skeleton-line short" />
            </div>
          </NGridItem>
        </NGrid>

        <!-- 滚动加载列表（参考 updateLog NInfiniteScroll） -->
        <NInfiniteScroll v-else @load="loadMore" :distance="100">
          <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
              <FeedbackCard
                :row="row"
                :index="index"
                :is-admin="isAdmin"
                @view="handleViewDetail(row)"
                @handle="handleOpenHandle(row)"
                @delete="handleOpenDelete(row)"
              />
            </NGridItem>
            <!-- 加载更多骨架 -->
            <NGridItem v-if="loadingMore" v-for="i in 3" :key="`lm-${i}`" span="3 s:2 m:1 l:1">
              <div class="feedback-card skeleton">
                <div class="skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </NGridItem>
          </NGrid>

          <!-- 空状态 -->
          <div v-if="!loadingMore && list.length === 0" class="empty-state">
            <SvgIcon icon="mdi:message-text-outline" class="empty-icon" />
            <p>{{ $t('feedback.empty') }}</p>
          </div>

          <!-- 底部加载完毕提示 -->
          <div v-if="finished && list.length > 0 && !loadingMore" class="finished-indicator">
            {{ $t('updateLog.allLoaded') }}
          </div>
        </NInfiniteScroll>
      </div>
    </NCard>

    <!-- 详情页（参考 tools 模块切换模式） -->
    <NCard class="m-10px rounded-10px" content-style="padding:15px;" :bordered="false"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true, footer: 'soft' }" v-else-if="activeDetail">
      <FeedbackDetail :feedback="activeDetail" @back="activeDetail = null" />
    </NCard>
  </NCard>

  <!-- 弹窗 -->
  <FeedbackAddModal v-model:show="showAddModal" @submitted="handleRefresh" />
  <FeedbackHandleModal v-model:show="showHandleModal" :feedback="handleFeedback" @submitted="handleRefresh" />
  <FeedbackDeleteModal v-model:show="showDeleteModal" :feedback="deleteFeedback" @deleted="handleRefresh" />
</template>

<style scoped lang="scss">
/* ================================ 头部（参考 updateLog 内联写法） ================================ */

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 16px;

  .title-section {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

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
      flex-shrink: 0;
    }

    .title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      .page-title {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
        margin: 0;
        color: rgba(var(--app-rgb), 0.92);
      }

      .page-subtitle {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.45);
      }
    }
  }

  /* 右侧：视图切换 + 提交按钮（参考 updateLog header-right） */
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    .view-switcher {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
      border-radius: 10px;
      background: rgba(var(--app-rgb), 0.04);
      border: 1px solid rgba(var(--app-rgb), 0.07);

      .switch-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 14px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 500;
        color: rgba(var(--app-rgb), 0.55);
        background: transparent;
        transition: all 0.25s ease;
        white-space: nowrap;

        .switch-icon {
          font-size: 15px;
        }

        &:hover {
          color: rgba(var(--app-rgb), 0.85);
        }

        &.active {
          color: #667eea;
          background: rgba(102, 126, 234, 0.15);
        }
      }
    }

    .header-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 8px 16px;
      border: 1px solid rgba(102, 126, 234, 0.25);
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #667eea;
      background: rgba(102, 126, 234, 0.12);
      transition: all 0.25s ease;
      white-space: nowrap;

      &:hover {
        background: rgba(102, 126, 234, 0.22);
      }
    }
  }
}

/* ================================ 容器 / 搜索栏 ================================ */

.feedback-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 160px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--app-rgb), 0.1);
  background: rgba(var(--app-rgb), 0.03);
  transition: border-color 0.25s ease;

  &:focus-within {
    border-color: rgba(102, 126, 234, 0.4);
  }

  .search-icon {
    font-size: 16px;
    color: rgba(var(--app-rgb), 0.35);
    flex-shrink: 0;
  }

  :deep(.n-input) {
    border: none;
    background: transparent;
  }
}

/* 自定义下拉选择器 */
.custom-select {
  position: relative;
  min-width: 110px;
  z-index: 1;

  &.open { z-index: 2; }

  .select-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid rgba(var(--app-rgb), 0.1);
    background: rgba(var(--app-rgb), 0.03);
    cursor: pointer;
    user-select: none;
    transition: border-color 0.25s ease;

    &:hover { border-color: rgba(var(--app-rgb), 0.2); }

    .select-prefix-icon {
      font-size: 14px;
      color: rgba(var(--app-rgb), 0.35);
      flex-shrink: 0;
    }

    .select-value {
      font-size: 12.5px;
      color: rgba(var(--app-rgb), 0.65);
      flex: 1;

      &.placeholder { color: rgba(var(--app-rgb), 0.4); }
    }

    .select-arrow {
      font-size: 14px;
      color: rgba(var(--app-rgb), 0.35);
      transition: transform 0.25s ease;
    }
  }

  &.open .select-arrow { transform: rotate(180deg); }

  .select-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    border-radius: 10px;
    border: 1px solid rgba(var(--app-rgb), 0.1);
    background: var(--n-color);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    padding: 4px;
    z-index: 10;
  }

  .select-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
    font-size: 12.5px;
    color: rgba(var(--app-rgb), 0.6);
    transition: all 0.2s ease;

    &:hover {
      background: rgba(var(--app-rgb), 0.05);
      color: rgba(var(--app-rgb), 0.8);
    }

    &.active {
      color: #667eea;
      background: rgba(102, 126, 234, 0.08);
      font-weight: 500;
    }

    .option-check {
      font-size: 14px;
      color: #667eea;
    }
  }
}

.select-fade-enter-active,
.select-fade-leave-active { transition: all 0.2s ease; }
.select-fade-enter-from,
.select-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* 搜索/重置图标按钮 */
.icon-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  transition: all 0.25s ease;

  &.search-action-btn {
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);

    &:hover { background: rgba(102, 126, 234, 0.22); }
  }

  &.reset-btn {
    color: rgba(var(--app-rgb), 0.45);
    background: rgba(var(--app-rgb), 0.05);

    &:hover {
      background: rgba(var(--app-rgb), 0.1);
      color: rgba(var(--app-rgb), 0.6);
    }
  }
}

/* ================================ 骨架屏 ================================ */

.feedback-card.skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 14px;
  background: rgba(var(--app-rgb), 0.025);
  border: 1px solid rgba(var(--app-rgb), 0.05);
  pointer-events: none;

  .skeleton-title {
    height: 18px;
    width: 60%;
    border-radius: 4px;
    background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-line {
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;

    &.short { width: 40%; }
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ================================ 空状态 ================================ */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(var(--app-rgb), 0.35);

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  p { margin: 0; font-size: 14px; }
}

/* ================================ 底部加载完毕 ================================ */

.finished-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 0;
  font-size: 12px;
  color: rgba(var(--app-rgb), 0.35);

  &::before,
  &::after {
    content: '';
    width: 40px;
    height: 1px;
    background: currentColor;
    opacity: 0.5;
  }
}
</style>
