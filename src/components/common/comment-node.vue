<script setup lang="ts">
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'CommentNode' });

const props = withDefaults(
  defineProps<{
    /** 评论数据 */
    comment: Api.System.SysCommentVo;
    /** 是否为管理员（可删除任意评论） */
    isAdmin?: boolean;
    /** 当前登录用户ID（普通用户仅可删除自己的评论） */
    currentUserId?: string;
    /** 评论层级深度(0:顶级,>=1:回复)，超过一级不再缩进 */
    depth?: number;
  }>(),
  {
    depth: 0
  }
);

const emit = defineEmits<{
  (e: 'reply', payload: { parentId: number; content: string }): void;
  (e: 'delete', id: number): void;
}>();

/** 是否可删除：管理员可删任意评论，普通用户仅可删自己的评论 */
const canDelete = computed(() => {
  if (props.isAdmin) return true;
  return Boolean(props.currentUserId) && props.comment.userId === Number(props.currentUserId);
});

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm');

const replyOpen = ref(false);
const replyContent = ref('');
const replying = ref(false);

const toggleReply = () => {
  replyOpen.value = !replyOpen.value;
  if (!replyOpen.value) replyContent.value = '';
};

const submitReply = () => {
  const text = replyContent.value.trim();
  if (!text || replying.value) return;
  replying.value = true;
  emit('reply', { parentId: props.comment.id, content: text });
  replyContent.value = '';
  replyOpen.value = false;
  replying.value = false;
};
</script>

<template>
  <div class="comment-node">
    <div class="cn-main">
      <!-- 头像 -->
      <img v-if="comment.userAvatar" :src="comment.userAvatar" class="cn-avatar" alt="avatar" />
      <span v-else class="cn-avatar fallback">
        <SvgIcon icon="mdi:account" />
      </span>

      <div class="cn-body">
        <!-- 元信息 -->
        <div class="cn-meta">
          <span class="cn-name">{{ comment.userName || '-' }}</span>
          <span class="cn-time">{{ formatDate(comment.createTime) }}</span>
        </div>

        <!-- 内容 -->
        <div class="cn-content">
          <template v-if="comment.replyUserName">
            <span class="cn-reply-name">@{{ comment.replyUserName }}</span>
            <span class="cn-reply-colon">：</span>
          </template>
          {{ comment.content }}
        </div>

        <!-- 操作 -->
        <div class="cn-actions">
          <span class="cn-action" @click="toggleReply">{{ $t('comment.reply') }}</span>
          <span v-if="canDelete" class="cn-action danger" @click="emit('delete', comment.id)">
            {{ $t('comment.delete') }}
          </span>
        </div>

        <!-- 回复输入框 -->
        <div v-if="replyOpen" class="cn-reply-box">
          <input
            v-model="replyContent"
            class="reply-input"
            type="text"
            :placeholder="$t('comment.replyPlaceholder', { name: comment.userName })"
            @keydown.enter.exact.prevent="submitReply"
          />
          <div class="reply-actions">
            <button class="reply-btn cancel" @click="toggleReply">{{ $t('common.cancel') }}</button>
            <button class="reply-btn submit" :disabled="replying || !replyContent.trim()" @click="submitReply">
              {{ $t('comment.submit') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 子评论（递归，最多缩进一级） -->
    <div v-if="comment.children?.length" class="cn-children" :class="{ flat: depth >= 1 }">
      <CommentNode
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :is-admin="isAdmin"
        :current-user-id="currentUserId"
        :depth="depth + 1"
        @reply="emit('reply', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.comment-node {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .cn-main {
    display: flex;
    gap: 10px;
    min-width: 0;

    .cn-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      flex-shrink: 0;
      object-fit: cover;
      border: 1px solid rgba(var(--app-rgb), 0.08);

      &.fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        color: #fff;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border: none;
      }
    }

    .cn-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;

      .cn-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .cn-name {
          font-size: 12px;
          font-weight: 600;
          color: rgba(var(--app-rgb), 0.72);
        }

        .cn-time {
          font-size: 11px;
          color: rgba(var(--app-rgb), 0.38);
        }
      }

      .cn-content {
        font-size: 13px;
        line-height: 1.65;
        color: rgba(var(--app-rgb), 0.82);
        word-break: break-word;

        .cn-reply-name {
          font-weight: 500;
          color: #667eea;
        }

        .cn-reply-colon {
          color: rgba(var(--app-rgb), 0.5);
        }
      }

      .cn-actions {
        display: flex;
        align-items: center;
        gap: 14px;

        .cn-action {
          font-size: 11.5px;
          color: rgba(var(--app-rgb), 0.45);
          cursor: pointer;
          transition: color 0.2s ease;

          &:hover {
            color: #667eea;
          }

          &.danger:hover {
            color: #ef4444;
          }
        }
      }

      .cn-reply-box {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 2px;
        padding: 8px 10px;
        border-radius: 9px;
        background: rgba(var(--app-rgb), 0.03);
        border: 1px solid rgba(var(--app-rgb), 0.06);

        .reply-input {
          width: 100%;
          box-sizing: border-box;
          padding: 6px 10px;
          border: 1px solid rgba(var(--app-rgb), 0.12);
          border-radius: 7px;
          outline: none;
          font-size: 12.5px;
          font-family: inherit;
          color: rgba(var(--app-rgb), 0.85);
          background: transparent;
          transition: border-color 0.2s ease;

          &::placeholder {
            color: rgba(var(--app-rgb), 0.35);
          }

          &:focus {
            border-color: rgba(102, 126, 234, 0.5);
          }
        }

        .reply-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;

          .reply-btn {
            padding: 4px 14px;
            border: none;
            border-radius: 7px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;

            &.cancel {
              color: rgba(var(--app-rgb), 0.5);
              background: rgba(var(--app-rgb), 0.06);

              &:hover {
                background: rgba(var(--app-rgb), 0.1);
              }
            }

            &.submit {
              color: #667eea;
              background: rgba(102, 126, 234, 0.12);
              border: 1px solid rgba(102, 126, 234, 0.25);

              &:hover:not(:disabled) {
                background: rgba(102, 126, 234, 0.22);
              }

              &:disabled {
                opacity: 0.45;
                cursor: not-allowed;
              }
            }
          }
        }
      }
    }
  }

  /* 子评论缩进 + 引导线（超过一级回复不再缩进） */
  .cn-children {
    margin-left: 40px;
    padding-left: 14px;
    border-left: 1px solid rgba(var(--app-rgb), 0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;

    &.flat {
      margin-left: 0;
      padding-left: 0;
      border-left: none;
    }
  }
}
</style>
