<script setup lang="ts">
import { NEllipsis } from 'naive-ui';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';

defineOptions({ name: 'CommentNode' });

const props = defineProps<{
  /** 评论数据 */
  comment: Api.System.SysCommentVo;
  /** 嵌套层级 */
  level: number;
  /** 是否管理员 */
  isAdmin: boolean;
  /** 已展开子评论ID集合 */
  expandedChildren: Set<number>;
  /** 日期格式化函数 */
  formatDate: (date?: string | null) => string;
  /** 状态标签函数 */
  getStatusLabel: (status?: number) => string;
}>();

const emit = defineEmits<{
  (e: 'like', comment: Api.System.SysCommentVo): void;
  (e: 'dislike', comment: Api.System.SysCommentVo): void;
  (e: 'reply', comment: Api.System.SysCommentVo): void;
  (e: 'delete', comment: Api.System.SysCommentVo): void;
  (e: 'shield', comment: Api.System.SysCommentVo): void;
  (e: 'toggleChildren', commentId: number): void;
}>();

/** 是否已删除 */
const isDeleted = props.comment.status === 0;
/** 是否已屏蔽 */
const isHidden = props.comment.status === 2;
/** 是否有子评论 */
const hasChildren = (props.comment.children?.length ?? 0) > 0;
/** 子评论是否展开 */
const isExpanded = props.expandedChildren.has(props.comment.id);
</script>

<template>
  <div class="comment-node">
    <!-- 已删除评论占位 -->
    <div v-if="isDeleted" class="comment-deleted">
      <SvgIcon icon="mdi:delete-outline" class="deleted-icon" />
      <span>{{ $t('comment.statusDeleted') }}</span>
    </div>

    <!-- 正常/已屏蔽评论 -->
    <template v-else>
      <div class="comment-item" :class="{ 'is-hidden': isHidden }" :style="{ marginLeft: `${level * 28}px` }">
        <!-- 头像 -->
        <div class="comment-avatar">
          <SvgIcon icon="mdi:account-circle" />
        </div>

        <!-- 主体 -->
        <div class="comment-body">
          <!-- 用户名 + 时间 + 状态标签 -->
          <div class="comment-author">
            <span class="comment-name">{{ comment.userName || '-' }}</span>
            <!-- 被回复标签 -->
            <span v-if="comment.replyUserName" class="comment-reply-target">
              <SvgIcon icon="mdi:reply" class="reply-icon" />
              {{ comment.replyUserName }}
            </span>
            <!-- 状态标签 -->
            <span v-if="getStatusLabel(comment.status)" class="comment-status-tag" :class="{ hidden: isHidden, pending: comment.status === 3 }">
              {{ getStatusLabel(comment.status) }}
            </span>
            <span class="comment-time">{{ formatDate(comment.createTime) }}</span>
          </div>

          <!-- 内容 -->
          <p class="comment-content">
            <NEllipsis :line-clamp="3" expand-trigger="click">
              {{ comment.content }}
            </NEllipsis>
          </p>

          <!-- 图片 -->
          <div v-if="comment.images" class="comment-images">
            <img
              v-for="(url, i) in comment.images.split(',')"
              :key="i"
              :src="url"
              class="comment-image-item"
              alt="comment image"
            />
          </div>

          <!-- 操作按钮 -->
          <div class="comment-actions">
            <!-- 点赞 -->
            <button class="comment-btn" :class="{ active: comment.isLiked }" @click="emit('like', comment)">
              <SvgIcon :icon="comment.isLiked ? 'mdi:thumb-up' : 'mdi:thumb-up-outline'" />
              <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
            </button>

            <!-- 点踩 -->
            <button class="comment-btn" :class="{ active: comment.isDisliked }" @click="emit('dislike', comment)">
              <SvgIcon :icon="comment.isDisliked ? 'mdi:thumb-down' : 'mdi:thumb-down-outline'" />
            </button>

            <!-- 回复 -->
            <button class="comment-btn" @click="emit('reply', comment)">
              <SvgIcon icon="mdi:reply" />
              <span>{{ $t('comment.reply') }}</span>
            </button>

            <!-- 展开子评论 -->
            <button v-if="hasChildren && !isExpanded" class="comment-btn expand" @click="emit('toggleChildren', comment.id)">
              <SvgIcon icon="mdi:chevron-down" />
              <span>{{ $t('comment.showReplies', { count: comment.replyCount }) }}</span>
            </button>

            <!-- 收起子评论 -->
            <button v-if="hasChildren && isExpanded" class="comment-btn expand" @click="emit('toggleChildren', comment.id)">
              <SvgIcon icon="mdi:chevron-up" />
              <span>{{ $t('comment.hideReplies') }}</span>
            </button>

            <!-- 管理员操作 -->
            <template v-if="isAdmin">
              <button class="comment-btn warn" @click="emit('shield', comment)">
                <SvgIcon :icon="isHidden ? 'mdi:eye' : 'mdi:eye-off'" />
                <span>{{ isHidden ? $t('comment.unshield') : $t('comment.shield') }}</span>
              </button>
              <button class="comment-btn danger" @click="emit('delete', comment)">
                <SvgIcon icon="mdi:delete" />
              </button>
            </template>
          </div>

          <!-- 子评论（展开时递归渲染） -->
          <div v-if="hasChildren && isExpanded" class="comment-children">
            <CommentNode
              v-for="child in comment.children"
              :key="child.id"
              :comment="child"
              :level="level + 1"
              :is-admin="isAdmin"
              :expanded-children="expandedChildren"
              :format-date="formatDate"
              :get-status-label="getStatusLabel"
              @like="emit('like', $event)"
              @dislike="emit('dislike', $event)"
              @reply="emit('reply', $event)"
              @delete="emit('delete', $event)"
              @shield="emit('shield', $event)"
              @toggle-children="emit('toggleChildren', $event)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.comment-node {
  /* 已删除评论占位 */
  .comment-deleted {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 0;
    font-size: 12.5px;
    color: rgba(var(--app-rgb), 0.35);
    border-bottom: 1px solid rgba(var(--app-rgb), 0.04);

    .deleted-icon {
      font-size: 14px;
    }
  }
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--app-rgb), 0.05);
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &.is-hidden {
    opacity: 0.55;
  }

  .comment-avatar {
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
    font-size: 30px;
    color: rgba(var(--app-rgb), 0.28);
    flex-shrink: 0;
  }

  .comment-body {
    flex: 1;
    min-width: 0;
  }

  .comment-author {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
    flex-wrap: wrap;

    .comment-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--n-text-color);
    }

    .comment-reply-target {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11.5px;
      color: #667eea;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(102, 126, 234, 0.08);

      .reply-icon {
        font-size: 10px;
      }
    }

    .comment-status-tag {
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 4px;

      &.hidden {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }

      &.pending {
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
    }

    .comment-time {
      font-size: 11px;
      color: rgba(var(--app-rgb), 0.4);
    }
  }

  .comment-content {
    margin: 0 0 6px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(var(--app-rgb), 0.75);
    word-break: break-word;
  }

  .comment-images {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 8px;

    .comment-image-item {
      width: 70px;
      height: 70px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid rgba(var(--app-rgb), 0.08);
      cursor: pointer;
      transition: transform 0.2s ease;

      &:hover {
        transform: scale(1.08);
      }
    }
  }

  .comment-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;

    .comment-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px 8px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.5);
      background: transparent;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(var(--app-rgb), 0.06);
      }

      &.active {
        color: #667eea;
      }

      &.expand {
        color: #667eea;
      }

      &.warn:hover {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }

      &.danger:hover {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
    }
  }

  .comment-children {
    margin-top: 6px;
    padding-top: 4px;
    border-left: 2px solid rgba(var(--app-rgb), 0.06);
    padding-left: 0;
  }
}
</style>
