<script setup lang="ts">
import dayjs from 'dayjs';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackCard' });

const props = defineProps<{
  /** 反馈数据行 */
  row: Api.System.SysFeedbackVo;
  /** 卡片在列表中的索引 */
  index: number;
  /** 是否管理员 */
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'view'): void;
  (e: 'handle'): void;
  (e: 'delete'): void;
}>();

/** 日期格式化 */
const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

/** 反馈类型文本 */
const getTypeText = (type?: number) => {
  const map: Record<number, string> = { 0: 'type0', 1: 'type1', 2: 'type2', 3: 'type3' };
  return type != null ? $t(`feedback.${map[type] || 'type3'}`) : '-';
};
const getTypeClass = (type?: number) => {
  const map: Record<number, string> = { 0: 'type-issue', 1: 'type-suggest', 2: 'type-bug', 3: 'type-other' };
  return type != null ? map[type] || 'type-other' : '';
};

/** 处理状态文本 */
const getStatusText = (status?: number) => {
  const map: Record<number, string> = { 0: 'status0', 1: 'status1', 2: 'status2', 3: 'status3', 4: 'status4' };
  return status != null ? $t(`feedback.${map[status] || 'status0'}`) : '-';
};
const getStatusClass = (status?: number) => {
  const map: Record<number, string> = { 0: 'status-pending', 1: 'status-progress', 2: 'status-resolved', 3: 'status-closed', 4: 'status-rejected' };
  return status != null ? map[status] || 'status-pending' : '';
};

/** 优先级文本 */
const getPriorityText = (priority?: number) => {
  const map: Record<number, string> = { 0: 'priority0', 1: 'priority1', 2: 'priority2', 3: 'priority3' };
  return priority != null ? $t(`feedback.${map[priority] || 'priority0'}`) : '-';
};
const getPriorityClass = (priority?: number) => {
  const map: Record<number, string> = { 0: 'pri-low', 1: 'pri-mid', 2: 'pri-high', 3: 'pri-urgent' };
  return priority != null ? map[priority] || 'pri-low' : '';
};
</script>

<template>
  <div class="feedback-card" :style="{ '--delay': `${props.index * 0.04}s` }">
    <!-- 标签行 -->
    <div class="card-header">
      <div class="card-tags">
        <span class="tag type-tag" :class="getTypeClass(row.feedbackType)">{{ getTypeText(row.feedbackType) }}</span>
        <span class="tag status-tag" :class="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span>
        <span class="tag priority-tag" :class="getPriorityClass(row.priority)">{{ getPriorityText(row.priority) }}</span>
      </div>
    </div>

    <!-- 标题 -->
    <h3 class="card-title" :title="row.title">{{ row.title || '-' }}</h3>

    <!-- 内容预览 -->
    <div class="card-content">
      <p class="content-text">{{ row.content || $t('feedback.empty') }}</p>
    </div>

    <!-- 底部 -->
    <div class="card-footer">
      <div class="footer-info">
        <span class="footer-user">
          <SvgIcon icon="mdi:account" class="footer-icon" />
          {{ row.userName || '-' }}
        </span>
        <span class="footer-time">
          <SvgIcon icon="mdi:clock-outline" class="footer-icon" />
          {{ formatDate(row.createTime) }}
        </span>
      </div>
      <div class="footer-actions">
        <button class="footer-action-btn view" :title="$t('feedback.viewDetail')" @click="emit('view')">
          <SvgIcon icon="mdi:eye" />
        </button>
        <button v-if="isAdmin" class="footer-action-btn edit" :title="$t('feedback.handleFeedback')" @click="emit('handle')">
          <SvgIcon icon="mdi:pencil" />
        </button>
        <button v-if="isAdmin" class="footer-action-btn delete" :title="$t('feedback.delete')" @click="emit('delete')">
          <SvgIcon icon="mdi:delete" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.feedback-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px 14px;
  border-radius: 14px;
  background: rgba(var(--app-rgb), 0.025);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  opacity: 0;
  animation: cardIn 0.4s ease-out forwards;
  animation-delay: var(--delay);

  &:hover {
    background: rgba(var(--app-rgb), 0.05);
    border-color: rgba(var(--app-rgb), 0.12);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  .card-header {
    .card-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
  }

  .card-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: var(--n-text-color);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    letter-spacing: 0.3px;
  }

  .card-content {
    flex: 1;
    min-height: 0;

    .content-text {
      margin: 0;
      font-size: 13px;
      line-height: 1.55;
      color: rgba(var(--app-rgb), 0.55);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid rgba(var(--app-rgb), 0.05);

    .footer-info {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.4);
    }

    .footer-user,
    .footer-time {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .footer-icon {
      font-size: 13px;
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 4px;

      .footer-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 7px;
        cursor: pointer;
        font-size: 14px;
        color: rgba(var(--app-rgb), 0.4);
        background: transparent;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.08);
        }

        &.view:hover {
          color: #667eea;
        }

        &.edit:hover {
          color: #10b981;
        }

        &.delete:hover {
          color: #ef4444;
        }
      }
    }
  }
}

/* 标签通用样式 */
.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 5px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.type-tag.type-issue { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.type-tag.type-suggest { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
.type-tag.type-bug { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.type-tag.type-other { color: #6b7280; background: rgba(107, 114, 128, 0.1); }

.status-tag.status-pending { color: #6b7280; background: rgba(107, 114, 128, 0.1); }
.status-tag.status-progress { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.status-tag.status-resolved { color: #10b981; background: rgba(16, 185, 129, 0.1); }
.status-tag.status-closed { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
.status-tag.status-rejected { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

.priority-tag.pri-low { color: #6b7280; background: rgba(107, 114, 128, 0.1); }
.priority-tag.pri-mid { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.priority-tag.pri-high { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.priority-tag.pri-urgent { color: #dc2626; background: rgba(220, 38, 38, 0.12); font-weight: 600; }

/* 骨架屏 */
.feedback-card.skeleton {
  pointer-events: none;
  gap: 12px;

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

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
