<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NCard, NGrid, NGridItem, NInput, NPagination } from 'naive-ui';
import {
  fetchGetFeedbackPage,
  fetchGetMyFeedbackList
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';
import FeedbackHeader from './modules/FeedbackHeader.vue';
import FeedbackCard from './modules/FeedbackCard.vue';
import FeedbackAddModal from './modules/FeedbackAddModal.vue';
import FeedbackDetailModal from './modules/FeedbackDetailModal.vue';
import FeedbackHandleModal from './modules/FeedbackHandleModal.vue';
import FeedbackDeleteModal from './modules/FeedbackDeleteModal.vue';

defineOptions({ name: 'Feedback' });

const { isAdmin } = useAuth();

/* ==================== 工具函数（搜索栏/卡片标签复用） ==================== */

const getTypeText = (type?: number) => {
  const map: Record<number, string> = { 0: 'type0', 1: 'type1', 2: 'type2', 3: 'type3' };
  return type != null ? $t(`feedback.${map[type] || 'type3'}`) : '-';
};

const getStatusText = (status?: number) => {
  const map: Record<number, string> = { 0: 'status0', 1: 'status1', 2: 'status2', 3: 'status3', 4: 'status4' };
  return status != null ? $t(`feedback.${map[status] || 'status0'}`) : '-';
};

const getPriorityText = (priority?: number) => {
  const map: Record<number, string> = { 0: 'priority0', 1: 'priority1', 2: 'priority2', 3: 'priority3' };
  return priority != null ? $t(`feedback.${map[priority] || 'priority0'}`) : '-';
};

/* ==================== 列表与分页 ==================== */

const loading = ref(false);
const list = ref<Api.System.SysFeedbackVo[]>([]);
const showMyFeedback = ref(false);

const pagination = reactive({
  title: '',
  feedbackType: null as number | null,
  status: null as number | null,
  priority: null as number | null,
  current: 1,
  size: 9,
  total: 0
});

const typeMenuOpen = ref(false);
const statusMenuOpen = ref(false);
const priorityMenuOpen = ref(false);

/* ==================== Mock 假数据（开发预览） ==================== */

const isDevPreview = ref(true);
const mockList: Api.System.SysFeedbackVo[] = [
  {
    id: 1, userId: 10001, userName: '阿洛娜', feedbackType: 0,
    title: '启动器在 Win10 上频繁闪退',
    content: '每次启动后大约 5 分钟左右就会自动闪退，已经尝试重新安装但问题依旧。系统版本是 Windows 10 22H2。',
    images: '', status: 1, priority: 2, handlerUserId: 1,
    handleTime: '2026-08-10 15:30:00',
    handleRemark: '已定位到是显卡驱动兼容性问题，请将显卡驱动更新至最新版本后重试。',
    createTime: '2026-08-08 10:25:00', updateTime: '2026-08-10 15:30:00'
  },
  {
    id: 2, userId: 10002, userName: '希娜', feedbackType: 1,
    title: '希望增加自动签到功能',
    content: '建议在启动器中加入每日自动签到功能，这样就不用每天都手动打开游戏签到了。',
    images: '', status: 0, priority: 1, handleRemark: '',
    createTime: '2026-08-09 14:10:00', updateTime: '2026-08-09 14:10:00'
  },
  {
    id: 3, userId: 10003, userName: '绫音', feedbackType: 2,
    title: '服务器选择页面加载缓慢',
    content: '在服务器选择页面，从进入页面到列表加载完成大概需要 8 秒左右，期间 UI 会卡死。',
    images: '', status: 2, priority: 2, handlerUserId: 1,
    handleTime: '2026-08-11 09:00:00',
    handleRemark: '已优化服务器列表加载逻辑，下个版本会显著提升加载速度。',
    createTime: '2026-08-07 16:45:00', updateTime: '2026-08-11 09:00:00'
  },
  {
    id: 4, userId: 10004, userName: '星野', feedbackType: 0,
    title: '暗色模式下部分文字看不清',
    content: '在暗色主题下，设置页面中的部分提示文字颜色太暗，几乎看不清。希望能调整对比度。',
    images: '', status: 3, priority: 0,
    createTime: '2026-08-06 11:20:00', updateTime: '2026-08-06 11:20:00'
  },
  {
    id: 5, userId: 10005, userName: '白子', feedbackType: 1,
    title: '建议增加游戏启动时的过渡动画',
    content: '目前点击启动按钮后直接进入加载黑屏，建议增加一个带 logo 的过渡动画。',
    images: '', status: 2, priority: 1, handlerUserId: 1,
    handleTime: '2026-08-10 11:30:00',
    handleRemark: '已采纳该建议，将在 v2.1.0 中加入启动过渡动画。',
    createTime: '2026-08-05 08:30:00', updateTime: '2026-08-10 11:30:00'
  },
  {
    id: 6, userId: 10006, userName: '日奈', feedbackType: 2,
    title: '点击"启动游戏"按钮无响应',
    content: '在安装了最新更新后，点击启动游戏按钮完全没有反应，控制台也无报错信息。',
    images: '', status: 1, priority: 3,
    createTime: '2026-08-11 10:00:00', updateTime: '2026-08-11 10:00:00'
  },
  {
    id: 7, userId: 10007, userName: '晴奈', feedbackType: 3,
    title: '启动器中文翻译有一处错误',
    content: '在"工具"页面中，按键绑定相关的提示文案存在一处中文翻译错误，原文"bind"被翻译成了"捆绑"而非"绑定"。',
    images: '', status: 0, priority: 0,
    createTime: '2026-08-04 19:55:00', updateTime: '2026-08-04 19:55:00'
  }
];

/* ==================== 数据加载 ==================== */

const loadData = async () => {
  if (isDevPreview.value) {
    loading.value = true;
    await new Promise(resolve => setTimeout(resolve, 600));
    if (showMyFeedback.value) {
      list.value = mockList.filter(f => f.userId === 10001);
      pagination.total = list.value.length;
    } else {
      const start = (pagination.current - 1) * pagination.size;
      const end = start + pagination.size;
      list.value = mockList.slice(start, end);
      pagination.total = mockList.length;
    }
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    if (showMyFeedback.value) {
      const { data, error } = await fetchGetMyFeedbackList();
      if (!error && data) {
        list.value = data || [];
        pagination.total = data.length;
      }
    } else {
      const { data, error } = await fetchGetFeedbackPage({
        title: pagination.title || null,
        feedbackType: pagination.feedbackType,
        status: pagination.status,
        priority: pagination.priority,
        current: pagination.current,
        size: pagination.size
      });
      if (!error && data) {
        list.value = data.records || [];
        pagination.total = data.total || 0;
      }
    }
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.current = 1; loadData(); };

const handleReset = () => {
  pagination.title = '';
  pagination.feedbackType = null;
  pagination.status = null;
  pagination.priority = null;
  pagination.current = 1;
  showMyFeedback.value = false;
  loadData();
};

const handlePageChange = (page: number) => { pagination.current = page; loadData(); };

const handleToggleView = (value: 'all' | 'my') => {
  showMyFeedback.value = value === 'my';
  pagination.current = 1;
  loadData();
};

/* ==================== 弹窗状态 ==================== */

const showAddModal = ref(false);
const showDetailModal = ref(false);
const showHandleModal = ref(false);
const showDeleteModal = ref(false);
const detailFeedback = ref<Api.System.SysFeedbackVo | null>(null);
const handleFeedback = ref<Api.System.SysFeedbackVo | null>(null);
const deleteFeedback = ref<Api.System.SysFeedbackVo | null>(null);

const handleViewDetail = (row: Api.System.SysFeedbackVo) => { detailFeedback.value = row; showDetailModal.value = true; };
const handleOpenHandle = (row: Api.System.SysFeedbackVo) => { handleFeedback.value = row; showHandleModal.value = true; };
const handleOpenDelete = (row: Api.System.SysFeedbackVo) => { deleteFeedback.value = row; showDeleteModal.value = true; };

/** 子组件提交/删除后刷新列表 */
const handleRefresh = () => { loadData(); };

/* ==================== 生命周期 ==================== */

onMounted(() => { loadData(); });
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true, footer: 'soft' }">
      <!-- 头部 -->
      <template #header>
        <FeedbackHeader :show-my-feedback="showMyFeedback" @toggle-view="handleToggleView" @create="showAddModal = true" />
      </template>

      <div class="feedback-container">
        <!-- 搜索栏 -->
        <div v-if="!showMyFeedback" class="search-bar">
          <div class="search-box">
            <SvgIcon icon="mdi:magnify" class="search-icon" />
            <NInput v-model:value="pagination.title" :placeholder="$t('feedback.searchTitle')" clearable size="small"
              @keyup.enter="handleSearch" />
          </div>
          <!-- 类型下拉 -->
          <div class="custom-select" :class="{ open: typeMenuOpen }">
            <div class="select-trigger" @click.stop="typeMenuOpen = !typeMenuOpen; statusMenuOpen = false; priorityMenuOpen = false">
              <SvgIcon icon="mdi:shape" class="select-prefix-icon" />
              <span class="select-value" :class="{ placeholder: pagination.feedbackType == null }">
                {{ pagination.feedbackType != null ? getTypeText(pagination.feedbackType) : $t('feedback.typeAll') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
            </div>
            <transition name="select-fade">
              <div v-if="typeMenuOpen" class="select-menu">
                <div class="select-option" :class="{ active: pagination.feedbackType == null }"
                  @click="pagination.feedbackType = null; typeMenuOpen = false">
                  <span>{{ $t('feedback.typeAll') }}</span>
                  <SvgIcon v-if="pagination.feedbackType == null" icon="mdi:check" class="option-check" />
                </div>
                <div v-for="t in [0, 1, 2, 3]" :key="t" class="select-option"
                  :class="{ active: pagination.feedbackType === t }"
                  @click="pagination.feedbackType = pagination.feedbackType === t ? null : t; typeMenuOpen = false">
                  <span>{{ getTypeText(t) }}</span>
                  <SvgIcon v-if="pagination.feedbackType === t" icon="mdi:check" class="option-check" />
                </div>
              </div>
            </transition>
          </div>
          <!-- 状态下拉 -->
          <div class="custom-select" :class="{ open: statusMenuOpen }">
            <div class="select-trigger" @click.stop="statusMenuOpen = !statusMenuOpen; typeMenuOpen = false; priorityMenuOpen = false">
              <SvgIcon icon="mdi:flag" class="select-prefix-icon" />
              <span class="select-value" :class="{ placeholder: pagination.status == null }">
                {{ pagination.status != null ? getStatusText(pagination.status) : $t('feedback.statusAll') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
            </div>
            <transition name="select-fade">
              <div v-if="statusMenuOpen" class="select-menu">
                <div class="select-option" :class="{ active: pagination.status == null }"
                  @click="pagination.status = null; statusMenuOpen = false">
                  <span>{{ $t('feedback.statusAll') }}</span>
                  <SvgIcon v-if="pagination.status == null" icon="mdi:check" class="option-check" />
                </div>
                <div v-for="s in [0, 1, 2, 3, 4]" :key="s" class="select-option"
                  :class="{ active: pagination.status === s }"
                  @click="pagination.status = pagination.status === s ? null : s; statusMenuOpen = false">
                  <span>{{ getStatusText(s) }}</span>
                  <SvgIcon v-if="pagination.status === s" icon="mdi:check" class="option-check" />
                </div>
              </div>
            </transition>
          </div>
          <!-- 优先级下拉 -->
          <div class="custom-select" :class="{ open: priorityMenuOpen }">
            <div class="select-trigger" @click.stop="priorityMenuOpen = !priorityMenuOpen; typeMenuOpen = false; statusMenuOpen = false">
              <SvgIcon icon="mdi:alert-circle" class="select-prefix-icon" />
              <span class="select-value" :class="{ placeholder: pagination.priority == null }">
                {{ pagination.priority != null ? getPriorityText(pagination.priority) : $t('feedback.typeAll') }}
              </span>
              <SvgIcon icon="mdi:chevron-down" class="select-arrow" />
            </div>
            <transition name="select-fade">
              <div v-if="priorityMenuOpen" class="select-menu">
                <div class="select-option" :class="{ active: pagination.priority == null }"
                  @click="pagination.priority = null; priorityMenuOpen = false">
                  <span>{{ $t('feedback.typeAll') }}</span>
                  <SvgIcon v-if="pagination.priority == null" icon="mdi:check" class="option-check" />
                </div>
                <div v-for="p in [0, 1, 2, 3]" :key="p" class="select-option"
                  :class="{ active: pagination.priority === p }"
                  @click="pagination.priority = pagination.priority === p ? null : p; priorityMenuOpen = false">
                  <span>{{ getPriorityText(p) }}</span>
                  <SvgIcon v-if="pagination.priority === p" icon="mdi:check" class="option-check" />
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

        <!-- 卡片网格 -->
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
          <!-- 骨架屏 -->
          <NGridItem v-if="loading" v-for="i in 6" :key="`sk-${i}`" span="3 s:2 m:1 l:1">
            <div class="feedback-card skeleton">
              <div class="skeleton-title" />
              <div class="skeleton-line" />
              <div class="skeleton-line short" />
            </div>
          </NGridItem>
        </NGrid>

        <!-- 空状态 -->
        <div v-if="!loading && list.length === 0" class="empty-state">
          <SvgIcon icon="mdi:message-text-outline" class="empty-icon" />
          <p>{{ $t('feedback.empty') }}</p>
        </div>

        <!-- 分页 -->
        <div v-if="!showMyFeedback && pagination.total > 0" class="pagination-bar">
          <NPagination v-model:page="pagination.current" :item-count="pagination.total"
            :page-size="pagination.size" @update-page="handlePageChange" />
        </div>
      </div>
    </NCard>
  </NCard>

  <!-- 新增反馈弹窗 -->
  <FeedbackAddModal v-model:show="showAddModal" @submitted="handleRefresh" />

  <!-- 反馈详情弹窗 -->
  <FeedbackDetailModal v-model:show="showDetailModal" :feedback="detailFeedback" />

  <!-- 管理员处理弹窗 -->
  <FeedbackHandleModal v-model:show="showHandleModal" :feedback="handleFeedback" @submitted="handleRefresh" />

  <!-- 删除确认弹窗 -->
  <FeedbackDeleteModal v-model:show="showDeleteModal" :feedback="deleteFeedback" @deleted="handleRefresh" />
</template>

<style scoped lang="scss">
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

  &.open {
    z-index: 2;
  }

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

    &:hover {
      border-color: rgba(var(--app-rgb), 0.2);
    }

    .select-prefix-icon {
      font-size: 14px;
      color: rgba(var(--app-rgb), 0.35);
      flex-shrink: 0;
    }

    .select-value {
      font-size: 12.5px;
      color: rgba(var(--app-rgb), 0.65);
      flex: 1;

      &.placeholder {
        color: rgba(var(--app-rgb), 0.4);
      }
    }

    .select-arrow {
      font-size: 14px;
      color: rgba(var(--app-rgb), 0.35);
      transition: transform 0.25s ease;
    }
  }

  &.open .select-arrow {
    transform: rotate(180deg);
  }

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
.select-fade-leave-active {
  transition: all 0.2s ease;
}

.select-fade-enter-from,
.select-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

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

    &:hover {
      background: rgba(102, 126, 234, 0.22);
    }
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

    &.short {
      width: 40%;
    }
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

  p {
    margin: 0;
    font-size: 14px;
  }
}

/* ================================ 分页 ================================ */

.pagination-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
</style>
