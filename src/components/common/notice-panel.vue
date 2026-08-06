<script setup lang="ts">
import { onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { fetchGetMyNoticeList, fetchMarkNoticeAsRead } from '@/service/api';
import { $t } from '@/locales';

defineOptions({ name: 'NoticePanel' });

/** 未读数变化（通知外部刷新铃铛徽标，携带最新未读数，避免与后端计数接口口径不一致） */
const emit = defineEmits<{ changed: [count: number] }>();

/** 加载状态 */
const loading = ref(false);
/** 当前用户通知列表 */
const list = ref<Api.System.SysNoticeVo[]>([]);
/** 未读数量 */
const unreadCount = ref(0);

/** 按列表统计未读数并通知外部刷新徽标（保证徽标与面板展示一致） */
const updateUnreadCount = () => {
  unreadCount.value = list.value.filter(item => !item.isRead).length;
  emit('changed', unreadCount.value);
};
/** 正在标记已读的通知ID（防重复点击） */
const markingId = ref<number | string | null>(null);

/** 优先级展示信息 */
const priorityInfo = (priority?: number) => {
  switch (priority) {
    case 1:
      return { label: $t('notice.priorityImportant'), color: '#f0a020', icon: 'mdi:alert' };
    case 2:
      return { label: $t('notice.priorityUrgent'), color: '#d03050', icon: 'mdi:alert-decagram' };
    default:
      return { label: $t('notice.priorityNormal'), color: 'rgba(var(--app-rgb), 0.35)', icon: '' };
  }
};

/** 时间格式化 */
const formatTime = (date?: string | null) => {
  if (!date) return '';
  return dayjs(date).format('MM-DD HH:mm');
};

/** 加载当前用户通知（未读在前） */
const loadNotices = async () => {
  loading.value = true;
  try {
    const { data, error } = await fetchGetMyNoticeList();
    if (!error && data) {
      list.value = [...data].sort((a, b) => (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0));
      // 未读数按列表统计，避免与 unreadCount 接口口径不一致导致徽标少于实际未读
      updateUnreadCount();
    }
  } finally {
    loading.value = false;
  }
};

/** 标记单条通知为已读 */
const handleMarkRead = async (item: Api.System.SysNoticeVo) => {
  // 已读或正在处理则忽略
  if (item.isRead || markingId.value !== null) return;
  const id = String(item.id ?? '');
  if (!id) return;
  markingId.value = id;
  try {
    const { error } = await fetchMarkNoticeAsRead(id);
    if (!error) {
      item.isRead = true;
      item.readTime = new Date().toISOString();
      // 已读项排到列表末尾
      list.value = [...list.value].sort((a, b) => (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0));
      // 重新按列表统计未读数
      updateUnreadCount();
    }
  } finally {
    markingId.value = null;
  }
};

onMounted(() => {
  loadNotices();
});
</script>

<template>
  <div class="notice-panel">
    <!-- 头部：标题 -->
    <div class="notice-header">
      <div class="notice-title">
        <SvgIcon icon="mdi:bell-outline" class="notice-title-icon" />
        <span>{{ $t('notice.title') }}</span>
      </div>
    </div>

    <!-- 通知列表 -->
    <div class="notice-list">
      <!-- 加载中 -->
      <div v-if="loading" class="notice-empty">
        <SvgIcon icon="mdi:loading" class="notice-loading-icon" />
        <p>{{ $t('common.loading') }}</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="list.length === 0" class="notice-empty">
        <SvgIcon icon="mdi:bell-outline" class="notice-empty-icon" />
        <p>{{ $t('notice.empty') }}</p>
      </div>

      <!-- 通知项 -->
      <div v-for="item in list" :key="item.id" class="notice-item" :class="{ unread: !item.isRead }"
        @click="handleMarkRead(item)">
        <div class="notice-item-dot" :style="{ backgroundColor: priorityInfo(item.priority).color }" />
        <div class="notice-item-body">
          <div class="notice-item-title-row">
            <span class="notice-item-title" :title="item.title">{{ item.title }}</span>
            <span v-if="item.priority && item.priority > 0" class="notice-item-priority"
              :style="{ color: priorityInfo(item.priority).color, borderColor: priorityInfo(item.priority).color }">
              {{ priorityInfo(item.priority).label }}
            </span>
          </div>
          <p class="notice-item-content" :title="item.content">{{ item.content }}</p>
          <div class="notice-item-footer">
            <span class="notice-item-time">{{ formatTime(item.createTime) }}</span>
            <span class="notice-item-tag">{{ item.noticeType === 2 ? $t('notice.personal') : $t('notice.announce')
              }}</span>
          </div>
        </div>
        <!-- 未读小红点 -->
        <div v-if="!item.isRead" class="notice-item-unread-dot" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notice-panel {
  width: 380px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

/* 头部 */
.notice-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--n-border-color);
  flex-shrink: 0;

  .notice-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .notice-title-icon {
      font-size: 18px;
      color: #667eea;
    }
  }
}

/* 列表 */
.notice-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  /* 每条通知之间的间距 */
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 通知项 */
.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  /* 已读项使用边框区分层次 */
  border: 1px solid rgba(var(--app-rgb), 0.16);
  background: rgba(var(--app-rgb), 0.03);

  &.unread {
    background: rgba(102, 126, 234, 0.08);
    border-color: rgba(102, 126, 234, 0.3);

    &:hover {
      background: rgba(102, 126, 234, 0.13);
    }
  }

  &:hover {
    background: rgba(var(--app-rgb), 0.05);
  }

  /* 优先级圆点 */
  .notice-item-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .notice-item-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .notice-item-title-row {
      display: flex;
      align-items: center;
      gap: 6px;

      .notice-item-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--n-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .notice-item-priority {
        flex-shrink: 0;
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        border: 1px solid;
        line-height: 1.5;
      }
    }

    .notice-item-content {
      margin: 0;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.55);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.6;
    }

    .notice-item-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: rgba(var(--app-rgb), 0.35);

      .notice-item-tag {
        padding: 0 5px;
        border-radius: 3px;
        background: rgba(var(--app-rgb), 0.06);
      }
    }
  }

  /* 未读小红点 */
  .notice-item-unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4757;
    margin-top: 6px;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(255, 71, 87, 0.6);
  }
}

/* 空状态 / 加载中 */
.notice-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  color: rgba(var(--app-rgb), 0.4);

  .notice-empty-icon {
    font-size: 40px;
    opacity: 0.4;
  }

  .notice-loading-icon {
    font-size: 22px;
    color: #667eea;
    animation: spin 1s linear infinite;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
