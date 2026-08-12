<script setup lang="ts">
import dayjs from 'dayjs';
import { $t } from '@/locales';
import { useDict } from '@/hooks/business/dict';
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

/** 字典：反馈类型 / 状态 / 优先级的文案与配色（type 字段即 NaiveUI 主题色） */
const { dictLabel, dictType } = useDict();

/** 日期格式化 */
const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');
</script>

<template>
  <div class="feedback-card" :style="{ '--delay': `${props.index * 0.04}s` }" @click="emit('view')">
    <!-- 标签行 -->
    <div class="card-header">
      <div class="card-tags">
        <NTag size="small" :bordered="false" :type="dictType('sys_feedback_type', String(row.feedbackType))">
          {{ dictLabel('sys_feedback_type', String(row.feedbackType)) || '-' }}
        </NTag>
        <NTag size="small" :bordered="false" :type="dictType('sys_feedback_status', String(row.status))">
          {{ dictLabel('sys_feedback_status', String(row.status)) || '-' }}
        </NTag>
        <NTag size="small" :bordered="false" :type="dictType('sys_feedback_priority', String(row.priority))">
          {{ dictLabel('sys_feedback_priority', String(row.priority)) || '-' }}
        </NTag>
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
          <img v-if="row.userAvatar" :src="row.userAvatar" class="footer-avatar" alt="avatar" />
          <SvgIcon v-else icon="mdi:account" class="footer-avatar fallback" />
          {{ row.userName || '-' }}
        </span>
        <span class="footer-time">
          <SvgIcon icon="mdi:clock-outline" class="footer-icon" />
          {{ formatDate(row.createTime) }}
        </span>
      </div>
      <div class="footer-actions">
        <button v-if="isAdmin" class="edit" :title="$t('feedback.handleTitle')" @click.stop="emit('handle')">
          <SvgIcon icon="mdi:pencil" />
        </button>
        <button v-if="isAdmin" class="delete" :title="$t('feedback.delete')" @click.stop="emit('delete')">
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
    line-clamp: 1;
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
      line-clamp: 3;
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

    .footer-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;

      &.fallback {
        font-size: 13px;
        color: rgba(var(--app-rgb), 0.45);
      }
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 6px;

      /* 处理反馈：紫色描边图标按钮（参考 botGroup） */
      .edit {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.45);
        }
      }

      /* 删除：红色描边图标按钮 */
      .delete {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #ef4444;
        background: rgba(239, 68, 68, 0.08);
        transition: all 0.2s ease;

        &:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.16);
          border-color: rgba(239, 68, 68, 0.45);
        }
      }
    }
  }
}

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
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
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
</style>
