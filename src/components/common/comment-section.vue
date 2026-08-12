<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NInput } from 'naive-ui';
import dayjs from 'dayjs';
import {
  fetchGetCommentTree,
  fetchAddComment,
  fetchDeleteComment,
  fetchLikeComment,
  fetchDislikeComment,
  fetchUpdateCommentStatus
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';

defineOptions({ name: 'CommentSection' });

const props = withDefaults(
  defineProps<{
    /** 评论目标类型(1:反馈,2:帖子,3:动态,4:攻略,5:其他) */
    targetType: number;
    /** 评论目标ID */
    targetId: number;
  }>(),
  {}
);

const { isAdmin } = useAuth();

/* ==================== 状态 ==================== */

const comments = ref<Api.System.SysCommentVo[]>([]);
const commentLoading = ref(false);
const commentText = ref('');
const commentSubmitting = ref(false);

/** 回复目标（null 表示发表顶级评论） */
const replyTarget = ref<{ id: number; userName: string } | null>(null);

/** 评论总数 */
const totalCount = computed(() => {
  const countTree = (list: Api.System.SysCommentVo[]): number =>
    list.reduce((sum, c) => sum + 1 + (c.children ? countTree(c.children) : 0), 0);
  return countTree(comments.value);
});

/* ==================== 工具函数 ==================== */

const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-');

/** 评论状态标签 */
const getStatusLabel = (status?: number) => {
  if (status === 0) return $t('comment.statusDeleted');
  if (status === 2) return $t('comment.statusHidden');
  if (status === 3) return $t('comment.statusPending');
  return '';
};

/* ==================== 数据加载 ==================== */

/** 加载评论树 */
const loadComments = async () => {
  if (!props.targetId) return;
  commentLoading.value = true;
  try {
    const { data, error } = await fetchGetCommentTree(props.targetType, props.targetId);
    if (!error && data) {
      comments.value = data || [];
    } else {
      comments.value = [];
    }
  } finally {
    commentLoading.value = false;
  }
};

/* ==================== 发表评论 / 回复 ==================== */

/** 发表评论或回复 */
const handlePostComment = async () => {
  const text = commentText.value.trim();
  if (!text) return;
  commentSubmitting.value = true;
  try {
    const { error } = await fetchAddComment({
      targetType: props.targetType,
      targetId: props.targetId,
      content: text,
      parentId: replyTarget.value?.id || undefined,
      replyUserId: replyTarget.value?.id ? replyTarget.value.id : undefined
    });
    if (error) {
      window.$message?.error(error.message || $t('comment.toast.postFailed'));
      return;
    }
    window.$message?.success($t('comment.toast.postSuccess'));
    commentText.value = '';
    replyTarget.value = null;
    loadComments();
  } finally {
    commentSubmitting.value = false;
  }
};

/** 点击回复 */
const handleReply = (comment: Api.System.SysCommentVo) => {
  replyTarget.value = { id: comment.id, userName: comment.userName || '' };
  commentText.value = '';
};

/** 取消回复 */
const handleCancelReply = () => {
  replyTarget.value = null;
  commentText.value = '';
};

/* ==================== 点赞 / 点踩 ==================== */

const handleLike = async (comment: Api.System.SysCommentVo) => {
  const { error } = await fetchLikeComment(comment.id);
  if (!error) {
    loadComments();
  } else {
    window.$message?.error($t('comment.toast.likeFailed'));
  }
};

const handleDislike = async (comment: Api.System.SysCommentVo) => {
  const { error } = await fetchDislikeComment(comment.id);
  if (!error) {
    loadComments();
  } else {
    window.$message?.error($t('comment.toast.dislikeFailed'));
  }
};

/* ==================== 删除 / 屏蔽 ==================== */

const handleDelete = async (comment: Api.System.SysCommentVo) => {
  const { error } = await fetchDeleteComment(comment.id);
  if (error) {
    window.$message?.error(error.message || $t('comment.toast.deleteFailed'));
    return;
  }
  window.$message?.success($t('comment.toast.deleteSuccess'));
  loadComments();
};

const handleShield = async (comment: Api.System.SysCommentVo) => {
  const newStatus = comment.status === 2 ? 1 : 2;
  const { error } = await fetchUpdateCommentStatus({ id: comment.id, status: newStatus });
  if (!error) {
    loadComments();
  } else {
    window.$message?.error(error.message || $t('comment.toast.shieldFailed'));
  }
};

/* ==================== 展开/收起子评论 ==================== */

const expandedChildren = ref<Set<number>>(new Set());

const toggleChildren = (commentId: number) => {
  if (expandedChildren.value.has(commentId)) {
    expandedChildren.value.delete(commentId);
  } else {
    expandedChildren.value.add(commentId);
  }
};

const isChildrenExpanded = (commentId: number) => expandedChildren.value.has(commentId);

/* ==================== 生命周期 ==================== */

watch(
  () => [props.targetType, props.targetId],
  () => {
    comments.value = [];
    expandedChildren.value.clear();
    replyTarget.value = null;
    commentText.value = '';
    loadComments();
  },
  { immediate: true }
);

/** 暴露方法供父组件手动刷新 */
defineExpose({ loadComments, totalCount });
</script>

<template>
  <div class="comment-section">
    <!-- 评论头部 -->
    <div class="comment-header">
      <h4 class="comment-title">
        <SvgIcon icon="mdi:comment-multiple" class="comment-title-icon" />
        {{ $t('comment.title') }}
        <span class="comment-count">({{ totalCount }})</span>
      </h4>
    </div>

    <!-- 评论列表 -->
    <div class="comment-list">
      <div v-if="commentLoading && comments.length === 0" class="comment-skeleton">
        <div v-for="i in 3" :key="i" class="skeleton-item">
          <div class="skeleton-avatar" />
          <div class="skeleton-lines">
            <div class="skeleton-line name" />
            <div class="skeleton-line content" />
          </div>
        </div>
      </div>

      <template v-else-if="comments.length > 0">
        <!-- 递归渲染评论树 -->
        <div v-for="comment in comments" :key="comment.id">
          <!-- 顶级评论 -->
          <CommentNode
            :comment="comment"
            :level="0"
            :is-admin="isAdmin"
            :expanded-children="expandedChildren"
            :format-date="formatDate"
            :get-status-label="getStatusLabel"
            @like="handleLike"
            @dislike="handleDislike"
            @reply="handleReply"
            @delete="handleDelete"
            @shield="handleShield"
            @toggle-children="toggleChildren"
          />
        </div>
      </template>

      <div v-else class="comment-empty">
        <SvgIcon icon="mdi:comment-text-outline" class="comment-empty-icon" />
        <span>{{ $t('comment.empty') }}</span>
      </div>
    </div>

    <!-- 评论输入框 -->
    <div class="comment-input-area">
      <div v-if="replyTarget" class="comment-reply-hint">
        <span>{{ $t('comment.replyTo', { name: replyTarget.userName }) }}</span>
        <button class="reply-cancel-btn" @click="handleCancelReply">
          <SvgIcon icon="mdi:close" />
        </button>
      </div>
      <div class="comment-input-row">
        <div class="comment-avatar-icon">
          <SvgIcon icon="mdi:account-circle" />
        </div>
        <NInput
          v-model:value="commentText"
          :placeholder="replyTarget
            ? $t('comment.replyPlaceholder', { name: replyTarget.userName })
            : $t('comment.placeholder')"
          clearable
          round
          size="small"
          @keyup.enter="handlePostComment"
        />
        <button class="comment-submit-btn" :disabled="!commentText.trim() || commentSubmitting" @click="handlePostComment">
          <SvgIcon icon="mdi:send" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.comment-section {
  display: flex;
  flex-direction: column;
  gap: 14px;

  .comment-header {
    .comment-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--n-text-color);

      .comment-title-icon {
        font-size: 16px;
        color: #667eea;
      }

      .comment-count {
        font-size: 12.5px;
        font-weight: 400;
        color: rgba(var(--app-rgb), 0.45);
      }
    }
  }

  .comment-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 400px;
    overflow-y: auto;
  }

  /* 骨架屏 */
  .comment-skeleton {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 8px 0;
    pointer-events: none;

    .skeleton-item {
      display: flex;
      gap: 10px;

      .skeleton-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        flex-shrink: 0;
        background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      .skeleton-lines {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 4px;

        .skeleton-line {
          height: 12px;
          background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;

          &.name {
            width: 30%;
          }

          &.content {
            height: 28px;
            width: 80%;
          }
        }
      }
    }
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* 空状态 */
  .comment-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 0;
    color: rgba(var(--app-rgb), 0.4);
    font-size: 13px;

    .comment-empty-icon {
      font-size: 36px;
      opacity: 0.5;
    }
  }

  /* 输入区 */
  .comment-input-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid rgba(var(--app-rgb), 0.07);
    padding-top: 12px;

    .comment-reply-hint {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 10px;
      border-radius: 8px;
      background: rgba(102, 126, 234, 0.08);
      font-size: 12px;
      color: #667eea;

      .reply-cancel-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.4);
        background: transparent;
        transition: all 0.2s ease;

        &:hover {
          color: rgba(var(--app-rgb), 0.7);
          background: rgba(var(--app-rgb), 0.1);
        }
      }
    }

    .comment-input-row {
      display: flex;
      gap: 10px;
      align-items: center;

      .comment-avatar-icon {
        display: flex;
        align-items: center;
        font-size: 28px;
        color: rgba(var(--app-rgb), 0.3);
        flex-shrink: 0;
      }

      :deep(.n-input) {
        flex: 1;
      }

      .comment-submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 17px;
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        transition: all 0.2s ease;
        flex-shrink: 0;

        &:hover:not(:disabled) {
          background: rgba(102, 126, 234, 0.22);
          transform: scale(1.06);
        }

        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>
