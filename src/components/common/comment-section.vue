<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { fetchAddComment, fetchDeleteComment, fetchGetCommentTree } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { useAuthStore } from '@/store/modules/auth';

defineOptions({ name: 'CommentSection' });

const props = defineProps<{
  /** 评论目标类型(1:反馈,2:帖子,3:动态,4:攻略,5:其他) */
  targetType: number;
  /** 评论目标ID */
  targetId: number;
  /** 目标发布者用户ID（顶级评论会作为被回复人携带） */
  replyUserId?: number;
  /** 目标发布者昵称（顶级评论会作为被回复人携带） */
  replyUserName?: string;
}>();

const { isAdmin } = useAuth();
const authStore = useAuthStore();
/** 当前登录用户ID（用于判断是否可删除自己的评论） */
const currentUserId = computed(() => authStore.userInfo.userId);

const loading = ref(false);
const comments = ref<Api.System.SysCommentVo[]>([]);
const content = ref('');
const submitting = ref(false);

/** 总评论数（含子评论） */
const count = computed(() => countComments(comments.value));

function countComments(list: Api.System.SysCommentVo[]): number {
  return list.reduce((sum, item) => {
    const children = item.children?.length ? countComments(item.children) : 0;
    return sum + 1 + children;
  }, 0);
}

async function loadComments() {
  if (!props.targetId) return;
  loading.value = true;
  try {
    const { data, error } = await fetchGetCommentTree(props.targetType, props.targetId);
    if (!error && data) {
      comments.value = data || [];
    }
  } catch {
    window.$message?.error($t('comment.loadFailed'));
  } finally {
    loading.value = false;
  }
}

/** 发表顶级评论 */
async function submitRootComment() {
  const text = content.value.trim();
  if (!text || submitting.value) return;
  submitting.value = true;
  try {
    const { error } = await fetchAddComment({
      targetType: props.targetType,
      targetId: props.targetId,
      content: text,
      parentId: 0,
      // 顶级评论：被回复人为目标发布者
      replyUserId: props.replyUserId,
      replyUserName: props.replyUserName
    });
    if (error) {
      window.$message?.error(error.message || $t('comment.addFailed'));
      return;
    }
    window.$message?.success($t('comment.addSuccess'));
    content.value = '';
    await loadComments();
  } finally {
    submitting.value = false;
  }
}

/** 回复子评论（由 CommentNode 触发） */
async function handleReply(payload: { parentId: number; content: string }) {
  const { error } = await fetchAddComment({
    targetType: props.targetType,
    targetId: props.targetId,
    content: payload.content,
    parentId: payload.parentId
  });
  if (error) {
    window.$message?.error(error.message || $t('comment.addFailed'));
    return;
  }
  window.$message?.success($t('comment.addSuccess'));
  await loadComments();
}

/** 删除评论（管理员） */
function handleDelete(id: number) {
  window.$dialog?.warning({
    title: $t('comment.delete'),
    content: $t('comment.deleteConfirm'),
    positiveText: $t('comment.delete'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error } = await fetchDeleteComment(id);
      if (error) {
        window.$message?.error(error.message || $t('comment.deleteFailed'));
        return false;
      }
      window.$message?.success($t('comment.deleteSuccess'));
      await loadComments();
    }
  });
}

onMounted(loadComments);
watch(() => props.targetId, loadComments);
</script>

<template>
  <div class="comment-section">
    <!-- 头部 -->
    <div class="cs-header">
      <SvgIcon icon="mdi:comment-text-outline" class="cs-icon" />
      <span>{{ $t('comment.title') }}</span>
      <span class="cs-count">{{ $t('comment.count', { count }) }}</span>
    </div>

    <!-- 新评论输入框 -->
    <div class="cs-composer">
      <NInput
        v-model:value="content"
        type="textarea"
        :placeholder="$t('comment.placeholder')"
        :autosize="{ minRows: 2, maxRows: 4 }"
        :maxlength="500"
        show-count
      />
      <div class="cs-composer-actions">
        <button class="cs-submit" :disabled="submitting || !content.trim()" @click="submitRootComment">
          <SvgIcon icon="mdi:send" class="cs-submit-icon" />
          <span>{{ submitting ? $t('comment.submitting') : $t('comment.submit') }}</span>
        </button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="loading" class="cs-loading">{{ $t('common.loading') }}</div>
    <div v-else-if="comments.length" class="cs-list">
      <CommentNode
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :is-admin="isAdmin"
        :current-user-id="currentUserId"
        @reply="handleReply"
        @delete="handleDelete"
      />
    </div>
    <div v-else class="cs-empty">
      <SvgIcon icon="mdi:comment-text-outline" class="empty-icon" />
      <span>{{ $t('comment.empty') }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.comment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  /* 头部 */
  .cs-header {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 700;
    color: rgba(var(--app-rgb), 0.88);

    .cs-icon {
      font-size: 15px;
      color: rgba(var(--app-rgb), 0.45);
    }

    .cs-count {
      font-size: 11px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.45);
      padding: 1px 8px;
      border-radius: 999px;
      background: rgba(var(--app-rgb), 0.06);
    }
  }

  /* 输入框 */
  .cs-composer {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .cs-composer-actions {
      display: flex;
      justify-content: flex-end;

      .cs-submit {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 6px 18px;
        border-radius: 9px;
        border: 1px solid rgba(102, 126, 234, 0.25);
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 500;
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover:not(:disabled) {
          background: rgba(102, 126, 234, 0.22);
          transform: translateY(-2px);
        }

        &:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .cs-submit-icon {
          font-size: 14px;
        }
      }
    }
  }

  /* 加载中 */
  .cs-loading {
    padding: 18px 0;
    text-align: center;
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.45);
  }

  /* 列表 */
  .cs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* 空状态 */
  .cs-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 26px 0;
    font-size: 12.5px;
    color: rgba(var(--app-rgb), 0.4);

    .empty-icon {
      font-size: 26px;
      color: rgba(var(--app-rgb), 0.18);
    }
  }
}
</style>
