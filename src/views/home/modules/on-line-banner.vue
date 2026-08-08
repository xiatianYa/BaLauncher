<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import HomeEmptyState from './empty-state.vue';
import { useDict } from '@/hooks/business/dict';
import { ThemeColor } from '@/constants/app';

// 应用仓库
const appStore = useAppStore();
const { dictLabel, dictType } = useDict();

/** 角色信息 */
interface RoleInfo {
  label: string;
  type: ThemeColor;
}

/** 渲染列表上限：卡片视口仅约 120px，避免在线人数过多时渲染大量 DOM */
const DISPLAY_MAX = 100;

/** 单个用户最多展示的角色数 */
const MAX_ROLES = 3;

/** 在线玩家数量 */
const onlineCount = computed(() => appStore.onlineUserList.length);

/** 根据角色 code 获取显示信息 */
const getRoleInfo = (role: string): RoleInfo => ({
  label: dictLabel('user_role', role) || role || dictLabel('user_role', 'guest'),
  type: dictType('user_role', role)
});

/** ThemeColor → 自定义标签色值映射 */
const ROLE_COLOR_MAP: Record<ThemeColor, { color: string; bg: string; border: string }> = {
  error: { color: '#f5576c', bg: 'rgba(245, 87, 108, 0.12)', border: 'rgba(245, 87, 108, 0.2)' },
  warning: { color: '#f0a020', bg: 'rgba(240, 160, 32, 0.12)', border: 'rgba(240, 160, 32, 0.2)' },
  success: { color: '#43e97b', bg: 'rgba(67, 233, 123, 0.12)', border: 'rgba(67, 233, 123, 0.2)' },
  info: { color: '#4facfe', bg: 'rgba(79, 172, 254, 0.12)', border: 'rgba(79, 172, 254, 0.2)' },
  primary: { color: '#667eea', bg: 'rgba(var(--app-rgb), 0.12)', border: 'rgba(var(--app-rgb), 0.2)' },
  default: { color: 'rgba(var(--app-rgb), 0.55)', bg: 'rgba(var(--app-rgb), 0.08)', border: 'transparent' }
};

/** 展示用在线用户（预计算角色标签样式，避免模板内重复字典查询与样式查找） */
interface OnlineUserItem {
  user: Api.System.OnLineUser;
  roles: Array<{ label: string; style: Record<string, string> }>;
}

const onlineItems = computed<OnlineUserItem[]>(() =>
  appStore.onlineUserList.slice(0, DISPLAY_MAX).map(user => ({
    user,
    roles: (user.roleCodes || []).slice(0, MAX_ROLES).map(role => {
      const info = getRoleInfo(role);
      const colors = ROLE_COLOR_MAP[info.type];
      return {
        label: info.label,
        style: {
          color: colors.color,
          background: colors.bg,
          borderColor: colors.border
        }
      };
    })
  }))
);

defineOptions({
  name: 'CreativityBanner'
});
</script>

<template>
  <div class="dash-card online-banner-card">
    <!-- 卡片头部：标题 + 数量徽章 -->
    <div class="card-header">
      <div class="card-title">
        <SvgIcon icon="mdi:account-group" class="card-title-icon" />
        <span>{{ $t('home.onlineUser') }}</span>
      </div>
      <span class="count-badge">
        <span class="dot" />
        {{ onlineCount }}
      </span>
    </div>

    <!-- 在线玩家列表 -->
    <div v-if="onlineCount > 0" class="online-list">
      <div v-for="item in onlineItems" :key="item.user.id" class="online-item">
        <img v-lazy="item.user.avatar" class="online-avatar" />
        <div class="online-info">
          <span class="online-name">{{ item.user.nickName }}</span>
          <div v-if="item.roles.length" class="online-roles">
            <span v-for="role in item.roles" :key="role.label" class="online-role-tag" :style="role.style">
              {{ role.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <HomeEmptyState v-else icon="mdi:account-off-outline" :title="$t('home.noData')"
      :description="$t('home.onlineUserTip')" />
  </div>
</template>

<style scoped lang="scss">
.dash-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 14px;
  border-radius: 14px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: cardIn 0.45s ease-out forwards;
  box-sizing: border-box;
  overflow: hidden;

  &:hover {
    transform: translateY(-3px);
    background: rgba(var(--app-rgb), 0.07);
    border-color: rgba(var(--app-rgb), 0.35);
    box-shadow: 0 12px 28px rgba(var(--app-rgb), 0.12);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-shrink: 0;

    .card-title {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;

      .card-title-icon {
        font-size: 17px;
        color: #667eea;
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

    .count-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
      color: #43e97b;
      background: rgba(67, 233, 123, 0.1);
      border: 1px solid rgba(67, 233, 123, 0.25);
      flex-shrink: 0;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #43e97b;
        box-shadow: 0 0 4px rgba(67, 233, 123, 0.6);
      }
    }
  }

  .online-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
    /* 一行多个玩家：网格自动换行，卡片宽度不足时自动增减每行数量 */
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    align-content: start;
    gap: 6px;
    padding: 2px 4px 2px 2px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: rgba(var(--app-rgb), 0.18);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(var(--app-rgb), 0.3);
    }

    .online-item {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(var(--app-rgb), 0.03);
      border: 1px solid rgba(var(--app-rgb), 0.06);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(var(--app-rgb), 0.07);
        border-color: rgba(var(--app-rgb), 0.35);
        transform: translateX(2px);
      }

      .online-avatar {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        object-fit: cover;
        border: 2px solid rgba(var(--app-rgb), 0.25);
        flex-shrink: 0;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        cursor: pointer;

        &:hover {
          transform: scale(1.08);
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(var(--app-rgb), 0.35);
        }
      }

      .online-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;

        .online-name {
          font-size: 11.5px;
          font-weight: 500;
          color: var(--n-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .online-roles {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;

          .online-role-tag {
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            padding: 0 5px;
            border-radius: 7px;
            font-size: 10px;
            font-weight: 500;
            border: 1px solid transparent;
          }
        }
      }
    }
  }

  /* 紧凑空状态：本卡片高度受限（120px），改为横向布局（图标 + 文字并排），避免内容被压扁 */
  :deep(.home-empty) {
    flex-direction: row;
    gap: 10px;
    padding: 4px;

    .home-empty-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;

      &::before {
        inset: -5px;
      }

      .home-empty-svg {
        font-size: 20px;
      }
    }

    .home-empty-text {
      align-items: flex-start;
      text-align: left;
    }

    .home-empty-title {
      font-size: 12.5px;
    }

    .home-empty-desc {
      font-size: 11.5px;
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
</style>
