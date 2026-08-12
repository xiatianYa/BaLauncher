<script setup lang="ts">
import dayjs from 'dayjs';
import { $t } from '@/locales';
import { useDict } from '@/hooks/business/dict';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'FeedbackDetail' });

const props = defineProps<{
  /** 反馈详情数据 */
  feedback: Api.System.SysFeedbackVo;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

/** 字典：反馈类型 / 状态 / 优先级的文案与配色（type 字段即 NaiveUI 主题色） */
const { dictLabel, dictType } = useDict();

/** 日期格式化 */
const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');
</script>

<template>
  <div class="feedback-detail">
    <!-- 头部：标题 + 返回 -->
    <div class="detail-header">
      <div class="detail-title-group">
        <SvgIcon icon="mdi:message-text-outline" class="detail-title-icon" />
        <span>{{ $t('feedback.detailTitle') }}</span>
      </div>
      <div class="back-btn" @click="emit('back')">
        <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
        <span>{{ $t('feedback.back') }}</span>
      </div>
    </div>

    <!-- 详情主体（单卡片，内部不再嵌套卡片） -->
    <div class="detail-scroll">
      <div class="detail-card">
        <!-- 标题 + 标签 -->
        <div class="detail-header-row">
          <h3 class="detail-title">{{ feedback.title }}</h3>
          <div class="detail-tags">
            <NTag size="small" :bordered="false" :type="dictType('sys_feedback_type', String(feedback.feedbackType))">
              {{ dictLabel('sys_feedback_type', String(feedback.feedbackType)) || '-' }}
            </NTag>
            <NTag size="small" :bordered="false" :type="dictType('sys_feedback_status', String(feedback.status))">
              {{ dictLabel('sys_feedback_status', String(feedback.status)) || '-' }}
            </NTag>
            <NTag size="small" :bordered="false" :type="dictType('sys_feedback_priority', String(feedback.priority))">
              {{ dictLabel('sys_feedback_priority', String(feedback.priority)) || '-' }}
            </NTag>
          </div>
        </div>

        <!-- 发布者信息 -->
        <div class="detail-meta">
          <div class="meta-user">
            <img v-if="feedback.userAvatar" :src="feedback.userAvatar" class="meta-avatar" alt="avatar" />
            <span v-else class="meta-avatar fallback">
              <SvgIcon icon="mdi:account" />
            </span>
            <span class="meta-name">{{ feedback.userName || '-' }}</span>
          </div>
          <span class="meta-item">
            <SvgIcon icon="mdi:clock-outline" class="meta-icon" />
            {{ formatDate(feedback.createTime) }}
          </span>
        </div>

        <!-- 反馈内容 -->
        <div class="detail-block">
          <div class="block-title">
            <SvgIcon icon="mdi:text-box-outline" class="block-icon" />
            <span>{{ $t('feedback.contentLabel') }}</span>
          </div>
          <p class="block-text">{{ feedback.content }}</p>
        </div>

        <!-- 反馈截图 -->
        <div v-if="feedback.images" class="detail-block">
          <div class="block-title">
            <SvgIcon icon="mdi:image-multiple-outline" class="block-icon" />
            <span>{{ $t('feedback.imagesLabel') }}</span>
          </div>
          <div class="detail-images">
            <NImageGroup>
              <NImage
                v-for="(url, i) in feedback.images.split(',')"
                :key="i"
                :src="url"
                width="96"
                height="96"
                object-fit="cover"
                class="rounded-md"
                preview
              />
            </NImageGroup>
          </div>
        </div>

        <!-- 处理信息 -->
        <div v-if="feedback.handleRemark || feedback.status !== 0" class="detail-block handle-block">
          <div class="block-title">
            <SvgIcon icon="mdi:comment-check-outline" class="block-icon" />
            <span>{{ $t('feedback.handleTime') }}</span>
            <span v-if="feedback.handleTime" class="block-time">{{ formatDate(feedback.handleTime) }}</span>
          </div>
          <p v-if="feedback.handleRemark" class="block-text">{{ feedback.handleRemark }}</p>
        </div>

        <!-- 评论区 -->
        <div class="detail-block">
          <CommentSection
            :target-type="1"
            :target-id="feedback.id"
            :reply-user-id="feedback.userId"
            :reply-user-name="feedback.userName"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.feedback-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  animation: fadeIn 0.4s ease-out;

  /* 头部 */
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-shrink: 0;

    .detail-title-group {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;

      .detail-title-icon {
        font-size: 17px;
        color: rgba(var(--app-rgb), 0.55);
        flex-shrink: 0;
      }

      span {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--n-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.65);
      background: rgba(var(--app-rgb), 0.05);
      border: 1px solid rgba(var(--app-rgb), 0.12);
      transition: all 0.25s ease;
      flex-shrink: 0;

      &:hover {
        background: rgba(var(--app-rgb), 0.09);
        border-color: rgba(var(--app-rgb), 0.22);
        color: rgba(var(--app-rgb), 0.85);
      }

      .back-icon {
        font-size: 15px;
      }
    }
  }

  /* 详情滚动区 */
  .detail-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 2px;

    /* 单卡片主体 */
    .detail-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px 18px;
      border-radius: 14px;
      background: rgba(var(--app-rgb), 0.04);
      border: 1px solid rgba(var(--app-rgb), 0.07);
      animation: cardIn 0.45s ease-out forwards;
      box-sizing: border-box;
    }

    /* 标题 + 标签 */
    .detail-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;

      .detail-title {
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 700;
        margin: 0;
        color: var(--n-text-color);
        line-height: 1.4;
        word-break: break-word;
      }

      .detail-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
    }

    /* 发布者信息（无内嵌卡片） */
    .detail-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .meta-user {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        .meta-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          object-fit: cover;
          border: 1px solid rgba(var(--app-rgb), 0.08);

          &.fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #fff;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
          }
        }

        .meta-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(var(--app-rgb), 0.88);
        }
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        color: rgba(var(--app-rgb), 0.5);
        flex-shrink: 0;

        .meta-icon {
          font-size: 13px;
        }
      }
    }

    /* 内容/截图/处理信息区块：图标引导，无内嵌卡片，虚线分隔 */
    .detail-block {
      padding-top: 14px;
      border-top: 1px dashed rgba(var(--app-rgb), 0.1);

      .block-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 0.6);
        margin-bottom: 8px;

        .block-icon {
          font-size: 15px;
          color: rgba(var(--app-rgb), 0.45);
          flex-shrink: 0;
        }

        .block-time {
          margin-left: auto;
          font-size: 11px;
          font-weight: 400;
          color: rgba(var(--app-rgb), 0.45);
        }
      }

      .block-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.7;
        color: rgba(var(--app-rgb), 0.78);
        white-space: pre-wrap;
        word-break: break-word;
      }
    }

    /* 处理信息：绿色标识 */
    .handle-block {
      .block-title {
        color: #10b981;

        .block-icon {
          color: #10b981;
        }
      }
    }

    /* 截图（Naive UI NImage 预览） */
    .detail-images {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
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
</style>
