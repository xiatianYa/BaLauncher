<!--
 * @component UserProfileModal
 * @description 用户个人资料弹窗 —— 展示当前用户详细信息，支持 QQ / Steam 第三方账号绑定
 * @author BaLauncher
 * @design 概要头部（头像 + 昵称 + 角色标签）+ 账号信息网格 + 第三方账号绑定卡片，绑定流程参考登录弹窗的 OAuth 授权窗口
 -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { NAvatar, NButton, NInputNumber, NModal, NSelect, NSpin, NTag } from 'naive-ui';
import { useDict } from '@/hooks/business/dict';
import {
  fetchBindQQ,
  fetchBindSteam,
  fetchBotGroupMemberIsBound,
  fetchBotGroupMemberUnbind,
  fetchGetBotGroupMemberSubscribe,
  fetchGetCommunityList,
  fetchGetMyInfo,
  fetchUpdateBotGroupMemberSubscribe
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import dayjs from 'dayjs';

defineOptions({ name: 'UserProfileModal' });

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const showRef = computed({
  get: () => props.show,
  set: value => emit('update:show', value)
});

const { dictLabel, dictOptions, dictType } = useDict();

/** 用户详情 */
const detail = ref<Api.System.SysUserVo | null>(null);
/** 详情加载中 */
const loading = ref(false);
/** 正在绑定的平台 */
const binding = ref<'qq' | 'steam' | null>(null);
/** 是否已绑定机器人 QQ 群成员 */
const isGroupBound = ref(false);
/** 解绑群绑定中 */
const unbindingGroup = ref(false);

/** 订阅配置表单 */
const subscribeForm = reactive({
  subscribeCommunityIds: [] as string[],
  subscribeMode: [] as string[],
  subscribeCount: null as number | null
});
/** 社区列表（订阅社区下拉选项来源） */
const communityList = ref<Api.Game.Community[]>([]);
/** 已保存的订阅配置快照（用于判断是否有变化，避免重复保存） */
let lastSavedSnapshot = '';
/** 订阅配置自动保存防抖定时器 */
let subscribeSaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 序列化当前订阅配置，用于变化比对 */
const subscribeSnapshot = () =>
  JSON.stringify({
    communityIds: [...subscribeForm.subscribeCommunityIds].sort(),
    mode: [...subscribeForm.subscribeMode].sort(),
    count: subscribeForm.subscribeCount ?? 0
  });

/** 订阅社区下拉选项（value 使用字符串化的社区 ID） */
const communitySelectOptions = computed(() =>
  communityList.value.map(c => ({ label: c.communityName, value: String(c.id) }))
);

/** 订阅模式选项（来自字典 game_server_mode） */
const subscribeModeOptions = computed(() =>
  dictOptions('game_server_mode').map(d => ({ label: d.label, value: d.value }))
);

/** 加载用户详情 */
const loadDetail = async () => {
  loading.value = true;
  try {
    const [detailRes, groupBoundRes, subscribeRes, communityRes] = await Promise.all([
      fetchGetMyInfo(),
      fetchBotGroupMemberIsBound(),
      fetchGetBotGroupMemberSubscribe(),
      fetchGetCommunityList()
    ]);
    detail.value = detailRes.data ?? null;
    isGroupBound.value = Boolean(groupBoundRes.data);

    const subscribe = subscribeRes.data;
    subscribeForm.subscribeCommunityIds = subscribe?.subscribeCommunityIds
      ? subscribe.subscribeCommunityIds.split(',').filter(Boolean)
      : [];
    subscribeForm.subscribeMode = subscribe?.subscribeMode
      ? subscribe.subscribeMode.split(',').filter(Boolean)
      : [];
    subscribeForm.subscribeCount = subscribe?.subscribeCount ?? null;
    lastSavedSnapshot = subscribeSnapshot();

    communityList.value = communityRes.data ?? [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.show,
  val => {
    if (val) {
      detail.value = null;
      loadDetail();
    }
  }
);

/** 角色信息（文案与颜色取自系统字典 user_role） */
const getRoleInfo = (role: string) => ({
  label: dictLabel('user_role', role) || role,
  type: dictType('user_role', role)
});

/** 是否已绑定 QQ */
const isQQBound = computed(() => Boolean(detail.value?.qqOpenId));
/** 是否已绑定 Steam */
const isSteamBound = computed(() => Boolean(detail.value?.steamOpenId));

/** QQ OAuth 授权地址（与登录弹窗保持一致） */
const getQQLoginUrl = () => {
  const params = new URLSearchParams({
    client_id: '102129326',
    redirect_uri: 'https://www.bluearchive.top/main',
    response_type: 'code',
    scope: 'get_user_info',
    state: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  });
  return `https://graph.qq.com/oauth2.0/authorize?${params.toString()}`;
};

/** Steam OpenID 授权地址（与登录弹窗保持一致） */
const getSteamLoginUrl = () => {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': 'https://www.bluearchive.top/main',
    'openid.realm': 'https://www.bluearchive.top',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
};

/** 绑定第三方账号：打开 OAuth 授权窗口 → 调用绑定接口 → 刷新详情 */
const handleBind = async (type: 'qq' | 'steam') => {
  if (binding.value) return;
  binding.value = type;
  try {
    const url = type === 'qq' ? getQQLoginUrl() : getSteamLoginUrl();
    const ipcChannel = type === 'qq' ? 'open-qq-login-window' : 'open-steam-login-window';
    const data = await window.ipcRenderer.invoke(ipcChannel, url);
    if (!data) return;
    const { error } =
      type === 'qq'
        ? await fetchBindQQ(data.accessToken, data.openid)
        : await fetchBindSteam(data.steamId);
    if (error) {
      window.$message?.error(error.message || $t('profile.bindFailed'));
      return;
    }
    window.$message?.success($t('profile.bindSuccess'));
    await loadDetail();
  } finally {
    binding.value = null;
  }
};

/** 解除机器人 QQ 群成员绑定 */
const handleUnbindGroup = async () => {
  if (unbindingGroup.value) return;
  unbindingGroup.value = true;
  try {
    const { data, error } = await fetchBotGroupMemberUnbind();
    if (error) {
      window.$message?.error(error.message || $t('profile.unbindFailed'));
      return;
    }
    if (data === true) {
      window.$message?.success($t('profile.unbindSuccess'));
    } else {
      window.$message?.error($t('profile.unbindFailed'));
    }
    await loadDetail();
  } finally {
    unbindingGroup.value = false;
  }
};

/** 保存订阅配置（自动保存调用，失败时提示） */
const saveSubscribe = async () => {
  const snapshot = subscribeSnapshot();
  if (snapshot === lastSavedSnapshot) return; // 无变化，跳过
  const params: Api.Bot.BotGroupMemberSubscribeDTO = {
    subscribeCommunityIds: subscribeForm.subscribeCommunityIds.join(','),
    subscribeMode: subscribeForm.subscribeMode.join(','),
    subscribeCount: subscribeForm.subscribeCount ?? 0
  };
  const { error } = await fetchUpdateBotGroupMemberSubscribe(params);
  if (error) {
    window.$message?.error(error.message || $t('profile.subscribeSaveFailed'));
    return;
  }
  lastSavedSnapshot = snapshot;
};

// 订阅配置参数变化时自动保存（防抖，避免输入过程中频繁请求）
watch(
  subscribeSnapshot,
  () => {
    if (subscribeSaveTimer) clearTimeout(subscribeSaveTimer);
    subscribeSaveTimer = setTimeout(() => {
      saveSubscribe();
    }, 400);
  }
);
</script>

<template>
  <NModal v-model:show="showRef" preset="card" class="profile-modal w-800px h-600px rounded-16px" :bordered="false">
    <template #header>
      <div class="profile-header">
        <div class="profile-header-icon-wrap">
          <SvgIcon icon="mdi:account-circle" class="profile-header-icon" />
        </div>
        <span>{{ $t('profile.title') }}</span>
      </div>
    </template>

    <NSpin :show="loading">
      <template v-if="detail">
        <!-- 用户概要 -->
        <div class="profile-summary">
          <NAvatar round :size="64" :src="detail.avatar" class="profile-avatar" />
          <div class="profile-summary-info">
            <div class="profile-name">{{ detail.nickName || '-' }}</div>
            <div v-if="detail.userRoles?.length" class="profile-roles">
              <NTag v-for="role in detail.userRoles" :key="role" :type="getRoleInfo(role).type" size="small" ghost
                round>
                {{ getRoleInfo(role).label }}
              </NTag>
            </div>
          </div>
          <NTag :type="detail.status === '1' ? 'success' : 'error'" size="small" round class="profile-status-tag">
            {{ detail.status === '1' ? $t('profile.enabled') : $t('profile.disabled') }}
          </NTag>
        </div>

        <!-- 账号信息 -->
        <div class="profile-section-title">{{ $t('profile.accountInfo') }}</div>
        <div class="profile-info-grid">
          <div class="profile-info-item">
            <SvgIcon icon="mdi:card-account-details-outline" class="profile-info-icon" />
            <div class="profile-info-text">
              <span class="profile-info-label">{{ $t('profile.nickName') }}</span>
              <span class="profile-info-value">{{ detail.nickName || '-' }}</span>
            </div>
          </div>
          <div class="profile-info-item">
            <SvgIcon icon="mdi:clock-outline" class="profile-info-icon" />
            <div class="profile-info-text">
              <span class="profile-info-label">{{ $t('profile.lastLoginTime') }}</span>
              <span class="profile-info-value">
                {{ detail.lastLoginTime ? dayjs(detail.lastLoginTime).format('YYYY-MM-DD HH:mm') : '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 账号绑定 -->
        <div class="profile-section-title">{{ $t('profile.bindSection') }}</div>
        <p class="profile-bind-tip">{{ $t('profile.bindTip') }}</p>
        <div class="profile-bind-list">
          <!-- QQ -->
          <div class="profile-bind-item">
            <div class="profile-bind-info">
              <SvgIcon icon="basil:qq-outline" class="profile-bind-icon qq" />
              <div class="profile-bind-text">
                <span class="profile-bind-name">{{ $t('profile.qq') }}</span>
                <span class="profile-bind-status" :class="{ bound: isQQBound }">
                  {{ isQQBound ? $t('profile.bound') : $t('profile.notBound') }}
                </span>
              </div>
            </div>
            <NButton size="small" type="primary" dashed :disabled="isQQBound || !!binding"
              :loading="binding === 'qq'" @click="handleBind('qq')">
              {{ isQQBound ? $t('profile.bound') : $t('profile.bind') }}
            </NButton>
          </div>
          <!-- Steam -->
          <div class="profile-bind-item">
            <div class="profile-bind-info">
              <SvgIcon icon="mdi:steam" class="profile-bind-icon steam" />
              <div class="profile-bind-text">
                <span class="profile-bind-name">{{ $t('profile.steam') }}</span>
                <span class="profile-bind-status" :class="{ bound: isSteamBound }">
                  {{ isSteamBound ? $t('profile.bound') : $t('profile.notBound') }}
                </span>
              </div>
            </div>
            <NButton size="small" type="primary" dashed :disabled="isSteamBound || !!binding"
              :loading="binding === 'steam'" @click="handleBind('steam')">
              {{ isSteamBound ? $t('profile.bound') : $t('profile.bind') }}
            </NButton>
          </div>
          <!-- QQ 群绑定 -->
          <div class="profile-bind-item">
            <div class="profile-bind-info">
              <SvgIcon icon="mdi:account-group" class="profile-bind-icon group" />
              <div class="profile-bind-text">
                <span class="profile-bind-name">{{ $t('profile.group') }}</span>
                <span class="profile-bind-status" :class="{ bound: isGroupBound }">
                  {{ isGroupBound ? $t('profile.bound') : $t('profile.notBound') }}
                </span>
              </div>
            </div>
            <NButton size="small" type="primary" dashed :disabled="!isGroupBound || unbindingGroup"
              :loading="unbindingGroup" @click="handleUnbindGroup">
              {{ $t('profile.unbind') }}
            </NButton>
          </div>
        </div>

        <!-- 订阅配置 -->
        <div class="profile-section-title">{{ $t('profile.subscribeSection') }}</div>
        <p class="profile-bind-tip">{{ $t('profile.subscribeTip') }}</p>
        <div class="profile-subscribe-note">
          <SvgIcon icon="mdi:information-outline" class="profile-subscribe-note-icon" />
          <span>{{ $t('profile.subscribeGroupTip') }}</span>
        </div>
        <div class="profile-subscribe-form">
          <div class="profile-subscribe-field">
            <span class="profile-subscribe-label">
              <SvgIcon icon="mdi:office-building-outline" class="profile-subscribe-icon" />
              {{ $t('profile.subscribeCommunity') }}
            </span>
            <NSelect v-model:value="subscribeForm.subscribeCommunityIds" multiple clearable filterable
              :options="communitySelectOptions" :placeholder="$t('profile.subscribeCommunityPlaceholder')" />
          </div>
          <div class="profile-subscribe-field">
            <span class="profile-subscribe-label">
              <SvgIcon icon="mdi:server-outline" class="profile-subscribe-icon" />
              {{ $t('profile.subscribeMode') }}
            </span>
            <NSelect v-model:value="subscribeForm.subscribeMode" multiple clearable
              :options="subscribeModeOptions" :placeholder="$t('profile.subscribeModePlaceholder')" />
          </div>
          <div class="profile-subscribe-field">
            <span class="profile-subscribe-label">
              <SvgIcon icon="mdi:account-multiple-outline" class="profile-subscribe-icon" />
              {{ $t('profile.subscribeCount') }}
            </span>
            <NInputNumber v-model:value="subscribeForm.subscribeCount" :min="0" :show-button="false"
              :placeholder="$t('profile.subscribeCountPlaceholder')" />
          </div>
        </div>
      </template>
    </NSpin>
  </NModal>
</template>

<style scoped lang="scss">
.profile-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);

  .profile-header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(102, 126, 234, 0.12);

    .profile-header-icon {
      font-size: 18px;
      color: #667eea;
    }
  }
}

/* 用户概要 */
.profile-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 12px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);

  .profile-avatar {
    flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25);
  }

  .profile-summary-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;

    .profile-name {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .profile-username {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .profile-roles {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }
  }

  .profile-status-tag {
    flex-shrink: 0;
  }
}

/* 区块标题 */
.profile-section-title {
  margin: 18px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  position: relative;
  padding-left: 10px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 12px;
    border-radius: 2px;
    background: #667eea;
  }
}

/* 账号信息网格 */
.profile-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .profile-info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);

    .profile-info-icon {
      font-size: 17px;
      color: #667eea;
      flex-shrink: 0;
    }

    .profile-info-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .profile-info-label {
        font-size: 11.5px;
        color: var(--text-secondary);
      }

      .profile-info-value {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-main);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

/* 账号绑定 */
.profile-bind-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.profile-bind-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  .profile-bind-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    transition: all 0.2s ease;

    &:hover {
      border-color: rgba(102, 126, 234, 0.35);
    }

    .profile-bind-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;

      .profile-bind-icon {
        font-size: 26px;
        flex-shrink: 0;

        &.qq {
          color: #12b7f5;
        }

        &.steam {
          color: #66c0f4;
        }

        &.group {
          color: #667eea;
        }
      }

      .profile-bind-text {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .profile-bind-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }

        .profile-bind-status {
          font-size: 11.5px;
          color: var(--text-secondary);

          &.bound {
            color: #18a058;
          }
        }
      }
    }
  }
}

/* 订阅配置 */
.profile-subscribe-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-secondary);

  .profile-subscribe-note-icon {
    font-size: 14px;
    color: #667eea;
    flex-shrink: 0;
    margin-top: 1px;
  }
}

.profile-subscribe-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  .profile-subscribe-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    transition: all 0.2s ease;

    &:hover {
      border-color: rgba(102, 126, 234, 0.35);
    }

    .profile-subscribe-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);

      .profile-subscribe-icon {
        font-size: 15px;
        color: #667eea;
      }
    }
  }
}
</style>

<style lang="scss">
/* ===== 弹窗主题变量 =====
   NModal 默认 teleport 到 body，不继承应用根节点（.theme-dark/.theme-light）上的 --app-rgb。
   这里直接基于弹窗卡片上 naive-ui 保证提供的 --n-text-color（自动随明暗主题切换）
   派生出文字/边框/背景变量，弹窗内所有颜色随主题自适应。
   同时处理固定高度 + 内容区滚动（scoped 无法可靠作用到 teleport 的弹窗根节点，故放到全局样式）。 */
.profile-modal {
  max-width: 90vw;
  border-radius: 16px;
  display: flex;
  flex-direction: column;

  --text-main: var(--n-text-color);
  --text-secondary: color-mix(in srgb, var(--n-text-color) 55%, transparent);
  --input-bg: color-mix(in srgb, var(--n-text-color) 5%, transparent);
  --input-border: color-mix(in srgb, var(--n-text-color) 10%, transparent);

  .n-card-header {
    flex-shrink: 0;
  }

  .n-card-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: color-mix(in srgb, var(--n-text-color) 18%, transparent);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--n-text-color) 30%, transparent);
    }
  }
}
</style>
