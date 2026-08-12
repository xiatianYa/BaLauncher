<script setup lang="ts">
import { NModal } from 'naive-ui';
import dayjs from 'dayjs';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import CommentSection from '@/components/common/comment-section.vue';

defineOptions({ name: 'FeedbackDetailModal' });

const props = defineProps<{
  show: boolean;
  /** 反馈详情数据 */
  feedback: Api.System.SysFeedbackVo | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

const getTypeText = (type?: number) => {
  const map: Record<number, string> = { 0: 'type0', 1: 'type1', 2: 'type2', 3: 'type3' };
  return type != null ? $t(`feedback.${map[type] || 'type3'}`) : '-';
};
const getTypeClass = (type?: number) => {
  const map: Record<number, string> = { 0: 'type-issue', 1: 'type-suggest', 2: 'type-bug', 3: 'type-other' };
  return type != null ? map[type] || 'type-other' : '';
};
const getStatusText = (status?: number) => {
  const map: Record<number, string> = { 0: 'status0', 1: 'status1', 2: 'status2', 3: 'status3', 4: 'status4' };
  return status != null ? $t(`feedback.${map[status] || 'status0'}`) : '-';
};
const getStatusClass = (status?: number) => {
  const map: Record<number, string> = { 0: 'status-pending', 1: 'status-progress', 2: 'status-resolved', 3: 'status-closed', 4: 'status-rejected' };
  return status != null ? map[status] || 'status-pending' : '';
};
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
  <NModal
    :show="show"
    preset="card"
    class="w-700px rounded-16px"
    :bordered="false"
    size="medium"
    :closable="true"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-header">
        <SvgIcon icon="mdi:message-text" class="modal-header-icon" />
        <span>{{ $t('feedback.detailTitle') }}</span>
      </div>
    </template>

    <div v-if="feedback" class="detail-body">
      <!-- 反馈信息 -->
      <div class="detail-info">
        <div class="detail-header-row">
          <h3 class="detail-title">{{ feedback.title }}</h3>
          <div class="detail-tags">
            <span class="tag type-tag" :class="getTypeClass(feedback.feedbackType)">{{ getTypeText(feedback.feedbackType) }}</span>
            <span class="tag status-tag" :class="getStatusClass(feedback.status)">{{ getStatusText(feedback.status) }}</span>
            <span class="tag priority-tag" :class="getPriorityClass(feedback.priority)">{{ getPriorityText(feedback.priority) }}</span>
          </div>
        </div>
        <div class="detail-meta">
          <span><SvgIcon icon="mdi:account" class="meta-icon" />{{ feedback.userName || '-' }}</span>
          <span><SvgIcon icon="mdi:clock-outline" class="meta-icon" />{{ formatDate(feedback.createTime) }}</span>
        </div>
        <div class="detail-content">
          <p>{{ feedback.content }}</p>
        </div>
        <!-- 截图 -->
        <div v-if="feedback.images" class="detail-images">
          <img
            v-for="(url, i) in feedback.images.split(',')"
            :key="i"
            :src="url"
            class="detail-image-item"
            alt="screenshot"
          />
        </div>
        <!-- 处理信息 -->
        <div v-if="feedback.handleRemark || feedback.status !== 0" class="detail-handle">
          <div class="handle-header">
            <SvgIcon icon="mdi:comment-processing" class="handle-icon" />
            <span>{{ $t('feedback.handleTime') }}</span>
          </div>
          <div v-if="feedback.handleTime" class="handle-meta">
            <span>{{ formatDate(feedback.handleTime) }}</span>
          </div>
          <p v-if="feedback.handleRemark" class="handle-remark">{{ feedback.handleRemark }}</p>
        </div>
      </div>

      <!-- 评论区 -->
      <CommentSection
        :target-type="1"
        :target-id="feedback.id"
      />
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);

  .modal-header-icon {
    font-size: 20px;
    color: #667eea;
  }
}

.detail-body {
  .detail-info {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(var(--app-rgb), 0.07);
    margin-bottom: 6px;

    .detail-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;

      .detail-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        color: var(--n-text-color);
        letter-spacing: 0.5px;
      }

      .detail-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
    }

    .detail-meta {
      display: flex;
      gap: 20px;
      font-size: 12.5px;
      color: rgba(var(--app-rgb), 0.5);

      span {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .meta-icon {
        font-size: 14px;
      }
    }

    .detail-content {
      p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.7;
        color: rgba(var(--app-rgb), 0.75);
        white-space: pre-wrap;
        word-break: break-word;
      }
    }

    .detail-images {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;

      .detail-image-item {
        width: 100px;
        height: 100px;
        border-radius: 10px;
        object-fit: cover;
        border: 1px solid rgba(var(--app-rgb), 0.08);
        cursor: pointer;
        transition: transform 0.2s ease;

        &:hover {
          transform: scale(1.06);
        }
      }
    }

    .detail-handle {
      padding: 12px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.12);

      .handle-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #10b981;
        margin-bottom: 6px;

        .handle-icon {
          font-size: 15px;
        }
      }

      .handle-meta {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.45);
        margin-bottom: 6px;
      }

      .handle-remark {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(var(--app-rgb), 0.7);
        word-break: break-word;
      }
    }
  }
}

/* 标签复用与卡片一致 */
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
</style>
