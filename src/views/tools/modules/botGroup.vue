<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NGrid, NGridItem, NInput, NPagination } from 'naive-ui';
import dayjs from 'dayjs';
import { useThemeStore } from '@/store/modules/theme';
import { fetchGetBotGroupPageList } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'BotGroupPage' });

const emit = defineEmits<{
  /** 返回上一级页面 */
  (e: 'back'): void;
}>();

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

/** 加载状态 */
const loading = ref(false);
/** 数据列表 */
const list = ref<Api.Bot.BotGroupVo[]>([]);
/** 分页与搜索参数 */
const pagination = reactive<Api.Bot.BotGroupSearchDTO & { current: number; size: number; total: number }>({
  groupId: null,
  current: 1,
  size: 6,
  total: 0
});

/** 日期格式化 */
const formatDate = (date?: string | null) => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

/** 计算剩余天数 */
const getRemainingDays = (expireTime?: string | null) => {
  if (!expireTime) return null;
  const diff = dayjs(expireTime).diff(dayjs(), 'day');
  if (diff < 0) return '已过期';
  if (diff === 0) return '今天到期';
  return `${diff} 天后到期`;
};

/** 加载分页数据 */
const loadData = async () => {
  loading.value = true;
  try {
    const params: Api.Bot.BotGroupSearchDTO = {
      groupId: pagination.groupId || null,
      current: pagination.current,
      size: pagination.size
    };
    const { data, error } = await fetchGetBotGroupPageList(params);
    if (!error && data) {
      list.value = data.records || [];
      pagination.total = data.total || 0;
    }
  } finally {
    loading.value = false;
  }
};

/** 搜索 */
const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

/** 分页切换 */
const handlePageChange = (page: number) => {
  pagination.current = page;
  loadData();
};

/** 编辑 */
const handleEdit = (row: Api.Bot.BotGroupVo) => {
  window.$message?.info(`编辑群 ${row.groupId}（演示）`);
};

/** 删除 */
const handleDelete = (row: Api.Bot.BotGroupVo) => {
  window.$message?.info(`删除群 ${row.groupId}（演示）`);
};

/** 群成员管理 */
const handleMembers = (row: Api.Bot.BotGroupVo) => {
  window.$message?.info(`管理群 ${row.groupId} 成员（演示）`);
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="bot-group-container" :class="{ 'light-mode': !isDarkMode }">
    <!-- 页面头部：标题 + 返回按钮 -->
    <div class="header-section">
      <div class="title-section">
        <SvgIcon icon="mdi:robot-excited" class="title-icon" />
        <h1 class="page-title">{{ $t('tools.botGroupTitle') }}</h1>
      </div>
      <div class="back-btn" @click="emit('back')">
        <SvgIcon icon="mdi:arrow-left" class="back-icon" />
        <span>{{ $t('keyBind.back') }}</span>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-box">
        <SvgIcon icon="mdi:magnify" class="search-icon" />
        <NInput
          v-model:value="pagination.groupId"
          placeholder="搜索 QQ 群号"
          clearable
          size="small"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
      </div>
      <button class="icon-btn primary" title="新增群" @click="handleEdit({ id: '', groupId: '', isNotifyImage: 0, communitys: '', createUserId: '', createTime: '', updateUserId: '', updateTime: '', isDeleted: 0, startTime: '', expireTime: '' })">
        <SvgIcon icon="mdi:plus" />
      </button>
    </div>

    <!-- 卡片列表 -->
    <div class="card-list">
      <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
        <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
          <div
            class="group-card"
            :class="{ expired: getRemainingDays(row.expireTime) === '已过期' }"
            :style="{ '--delay': `${index * 0.04}s` }"
          >
            <div class="card-header">
              <div class="group-id">
                <SvgIcon icon="mdi:qqchat" class="qq-icon" />
                <span class="group-number">{{ row.groupId }}</span>
              </div>
              <div class="remaining-badge" :class="{ danger: getRemainingDays(row.expireTime) === '已过期' || getRemainingDays(row.expireTime) === '今天到期' }">
                {{ getRemainingDays(row.expireTime) || '永久有效' }}
              </div>
            </div>

            <div class="card-meta">
              <div class="meta-item">
                <SvgIcon icon="mdi:calendar-start" class="meta-icon" />
                <div class="meta-info">
                  <span class="meta-label">生效时间</span>
                  <span class="meta-value">{{ formatDate(row.startTime) }}</span>
                </div>
              </div>
              <div class="meta-item">
                <SvgIcon icon="mdi:calendar-end" class="meta-icon" />
                <div class="meta-info">
                  <span class="meta-label">到期时间</span>
                  <span class="meta-value">{{ formatDate(row.expireTime) }}</span>
                </div>
              </div>
            </div>

            <div class="community-section">
              <div class="community-label">
                <SvgIcon icon="mdi:heart-multiple" class="label-icon" />
                <span class="label-key">偏好社区</span>
                <span class="label-colon">:</span>
                <span class="label-value">{{ row.communitys || '未配置' }}</span>
              </div>

              <!-- 换图通知状态 -->
              <div class="notify-status" :class="{ active: row.isNotifyImage === 1 }">
                <span class="dot" />
                <span>换图通知：{{ row.isNotifyImage === 1 ? '开启' : '关闭' }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="action-btn members" @click="handleMembers(row)">
                <SvgIcon icon="mdi:account-group" />
                <span>群友管理</span>
              </button>
              <button class="action-btn edit" @click="handleEdit(row)">
                <SvgIcon icon="mdi:pencil" />
                <span>编辑</span>
              </button>
              <button class="action-btn delete" @click="handleDelete(row)">
                <SvgIcon icon="mdi:delete" />
                <span>删除</span>
              </button>
            </div>
          </div>
        </NGridItem>

        <!-- 骨架屏 -->
        <NGridItem v-if="loading" v-for="i in 6" :key="`skeleton-${i}`" span="3 s:2 m:1 l:1">
          <div class="group-card skeleton">
            <div class="skeleton-title" />
            <div class="skeleton-meta">
              <div class="skeleton-line" />
              <div class="skeleton-line" />
            </div>
            <div class="skeleton-tags" />
            <div class="skeleton-actions" />
          </div>
        </NGridItem>
      </NGrid>

      <!-- 空状态 -->
      <div v-if="!loading && list.length === 0" class="empty-state">
        <SvgIcon icon="mdi:robot-confused" class="empty-icon" />
        <p>暂无机器人群数据</p>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > 0" class="pagination-bar">
      <NPagination
        v-model:value="pagination.current"
        :total="pagination.total"
        :item-count="pagination.total"
        :page-size="pagination.size"
        @update-page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.bot-group-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 14px;

  .header-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;

    .title-section {
      display: flex;
      align-items: center;
      gap: 12px;

      .title-icon {
        font-size: 24px;
        color: #667eea;
      }

      .page-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: var(--n-text-color);
        letter-spacing: 0.5px;
      }
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      color: #667eea;
      background: rgba(102, 126, 234, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;

      &:hover {
        background: rgba(102, 126, 234, 0.3);
      }

      .back-icon {
        font-size: 20px;
      }
    }
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 260px;
      height: 36px;
      padding: 0 12px 0 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.25s ease;

      &:focus-within {
        border-color: rgba(102, 126, 234, 0.5);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .search-icon {
        position: absolute;
        left: 12px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.4);
      }

      :deep(.n-input) {
        background: transparent;
        --n-border: none !important;
        --n-border-focus: none !important;
        --n-border-hover: none !important;
        --n-box-shadow-focus: none !important;

        .n-input__input-el {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
        }

        .n-input__placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
      }
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.75);
      cursor: pointer;
      font-size: 18px;
      transition: all 0.25s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }

      &.primary {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.25);

        &:hover {
          background: rgba(102, 126, 234, 0.22);
        }
      }
    }
  }

  .card-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 2px;

    .n-grid {
      width: 100%;
    }
  }

  .group-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding: 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: cardIn 0.45s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
    box-sizing: border-box;

    &:hover {
      transform: translateY(-4px);
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(102, 126, 234, 0.35);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    }

    &.expired {
      border-color: rgba(245, 87, 108, 0.25);

      &:hover {
        border-color: rgba(245, 87, 108, 0.45);
      }

      .remaining-badge {
        background: rgba(245, 87, 108, 0.15);
        color: #f5576c;
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      .group-id {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;

        .qq-icon {
          font-size: 18px;
          color: #12b7f5;
          flex-shrink: 0;
        }

        .group-number {
          font-size: 15px;
          font-weight: 700;
          color: var(--n-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .remaining-badge {
        padding: 4px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        background: rgba(102, 126, 234, 0.12);
        color: #667eea;
        white-space: nowrap;
        flex-shrink: 0;

        &.danger {
          background: rgba(245, 87, 108, 0.12);
          color: #f5576c;
        }
      }
    }

    .card-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        min-width: 0;

        .meta-icon {
          font-size: 15px;
          color: #667eea;
          flex-shrink: 0;
        }

        .meta-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;

          .meta-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);
          }

          .meta-value {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .community-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;

      .community-label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        width: fit-content;
        max-width: 100%;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);

        .label-icon {
          font-size: 13px;
          color: #7c8cf8;
          flex-shrink: 0;
        }

        .label-key {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.75);
          white-space: nowrap;
        }

        .label-colon {
          color: rgba(255, 255, 255, 0.35);
        }

        .label-value {
          color: rgba(255, 255, 255, 0.6);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .notify-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: fit-content;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        &.active {
          color: #43e97b;
          background: rgba(67, 233, 123, 0.08);
          border-color: rgba(67, 233, 123, 0.25);

          .dot {
            background: #43e97b;
          }
        }
      }
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        flex: 1;
        padding: 8px 2px;
        border-radius: 9px;
        border: none;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 500;
        white-space: nowrap;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.8);

        &:hover {
          transform: translateY(-2px);
        }

        &.members {
          &:hover {
            background: rgba(67, 233, 123, 0.2);
            color: #43e97b;
          }
        }

        &.edit {
          &:hover {
            background: rgba(102, 126, 234, 0.2);
            color: #667eea;
          }
        }

        &.delete {
          &:hover {
            background: rgba(245, 87, 108, 0.2);
            color: #f5576c;
          }
        }
      }
    }
  }

  .skeleton {
    pointer-events: none;

    .skeleton-title,
    .skeleton-line,
    .skeleton-tags,
    .skeleton-actions {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }

    .skeleton-title {
      height: 18px;
      width: 40%;
    }

    .skeleton-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      .skeleton-line {
        height: 36px;
      }
    }

    .skeleton-tags {
      height: 24px;
      width: 70%;
    }

    .skeleton-actions {
      height: 34px;
      margin-top: auto;
    }
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 80px 20px;
    color: rgba(255, 255, 255, 0.5);

    .empty-icon {
      font-size: 56px;
      opacity: 0.4;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  .pagination-bar {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  &.light-mode {
    .search-bar {
      .search-box {
        background: rgba(0, 0, 0, 0.03);
        border-color: rgba(0, 0, 0, 0.06);

        &:focus-within {
          border-color: rgba(102, 126, 234, 0.45);
          background: rgba(0, 0, 0, 0.04);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
        }

        .search-icon {
          color: rgba(0, 0, 0, 0.35);
        }

        :deep(.n-input) {
          .n-input__input-el {
            color: rgba(0, 0, 0, 0.85);
          }

          .n-input__placeholder {
            color: rgba(0, 0, 0, 0.35);
          }
        }
      }

      .icon-btn {
        background: rgba(0, 0, 0, 0.03);
        border-color: rgba(0, 0, 0, 0.06);
        color: rgba(0, 0, 0, 0.65);

        &:hover {
          background: rgba(0, 0, 0, 0.06);
        }

        &.primary {
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          border-color: rgba(102, 126, 234, 0.22);

          &:hover {
            background: rgba(102, 126, 234, 0.18);
          }
        }
      }
    }

    .group-card {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.05);

      &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: rgba(102, 126, 234, 0.3);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
      }

      &.expired {
        border-color: rgba(245, 87, 108, 0.2);
      }

      .card-meta {
        .meta-item {
          background: rgba(0, 0, 0, 0.02);

          .meta-label {
            color: rgba(0, 0, 0, 0.4);
          }

          .meta-value {
            color: rgba(0, 0, 0, 0.7);
          }
        }
      }

      .community-section {
        .community-label {
          color: rgba(0, 0, 0, 0.55);
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.1);

          .label-key {
            color: rgba(0, 0, 0, 0.72);
          }

          .label-colon {
            color: rgba(0, 0, 0, 0.3);
          }

          .label-value {
            color: rgba(0, 0, 0, 0.55);
          }
        }

        .notify-status {
          color: rgba(0, 0, 0, 0.55);
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.1);

          .dot {
            background: rgba(0, 0, 0, 0.25);
          }

          &.active {
            color: #2ecc71;
            background: rgba(46, 204, 113, 0.08);
            border-color: rgba(46, 204, 113, 0.25);

            .dot {
              background: #2ecc71;
            }
          }
        }
      }

      .card-actions {
        border-top-color: rgba(0, 0, 0, 0.06);

        .action-btn {
          background: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.65);
        }

        .action-btn.members {
          &:hover {
            background: rgba(46, 204, 113, 0.18);
            color: #2ecc71;
          }
        }
      }
    }

    .empty-state {
      color: rgba(0, 0, 0, 0.4);
    }
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

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
