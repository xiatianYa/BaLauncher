<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NGrid, NGridItem, NInput, NPagination, NModal, NSelect, NSwitch, NDatePicker } from 'naive-ui';
import dayjs from 'dayjs';
import { useThemeStore } from '@/store/modules/theme';
import { useGameStore } from '@/store/modules/game';
import {
  fetchGetBotGroupPageList,
  fetchInsertBotGroup,
  fetchUpdateBotGroup,
  fetchRemoveBotGroup,
  fetchGetBotGroupMemberPageList,
  fetchGetGameMapOrderPage,
  fetchRemoveGameMapOrder
} from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';

defineOptions({ name: 'BotGroupPage' });

const emit = defineEmits<{ back: [] }>();

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);
const gameStore = useGameStore();

const { isAdmin } = useAuth(); // 操作按钮仅管理员可见

/* ===== 列表与分页 ===== */

const loading = ref(false);
const list = ref<Api.Bot.BotGroupVo[]>([]);
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

/** 成员身份中文映射 */
const getMemberRoleText = (role?: string | null) => {
  const map: Record<string, string> = {
    owner: '群主',
    admin: '管理员',
    member: '成员'
  };
  return map[role || ''] || role || '成员';
};

/**
 * 根据社区列表解析偏好社区名称
 * communitys 为逗号分隔的社区ID字符串（如 "1,3"），映射为社区名称，多个用顿号连接
 */
const getCommunityNames = (communitys?: string | null) => {
  if (!communitys) return '未配置';
  const communityMap = new Map(gameStore.communityList.map(c => [String(c.id), c.communityName]));
  const names = communitys
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(id => communityMap.get(id))
    .filter((name): name is string => !!name);
  return names.length > 0 ? names.join('、') : '未配置';
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

/* ===== 编辑 / 新增 ===== */

/** 编辑弹窗显示状态 */
const showEditModal = ref(false);
/** 编辑保存加载状态 */
const editLoading = ref(false);
/** 是否编辑模式（false 为新增） */
const isEditMode = ref(false);
/** 编辑表单 */
const editForm = reactive({
  id: '',
  groupId: '',
  communityIds: [] as string[],
  isNotifyImage: 0,
  startTime: null as number | null,
  expireTime: null as number | null
});

/** 偏好社区选项（来自 communityList） */
const communityOptions = computed(() =>
  gameStore.communityList.map(c => ({ label: c.communityName, value: String(c.id) }))
);

/** 日期时间格式化（NDatePicker 值为毫秒时间戳） */
const formatDateTime = (ts?: number | null) => (ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '');
/** 字符串时间转时间戳 */
const toTimestamp = (v?: string | null) => (v ? dayjs(v).valueOf() : null);

/** 打开新增弹窗 */
const handleCreate = () => {
  isEditMode.value = false;
  Object.assign(editForm, {
    id: '',
    groupId: '',
    communityIds: [],
    isNotifyImage: 0,
    startTime: null,
    expireTime: null
  });
  showEditModal.value = true;
};

/** 打开编辑弹窗 */
const handleEdit = (row: Api.Bot.BotGroupVo) => {
  isEditMode.value = true;
  Object.assign(editForm, {
    id: String(row.id ?? ''),
    groupId: String(row.groupId ?? ''),
    communityIds: row.communitys ? row.communitys.split(',').filter(Boolean) : [],
    isNotifyImage: row.isNotifyImage,
    startTime: toTimestamp(row.startTime),
    expireTime: toTimestamp(row.expireTime)
  });
  showEditModal.value = true;
};

/** 保存（新增 / 修改） */
const handleEditSubmit = async () => {
  const groupId = String(editForm.groupId ?? '').trim();
  if (!groupId) {
    window.$message?.warning('请输入 QQ 群号');
    return;
  }
  const params: Api.Bot.BotGroupEdit = {
    id: isEditMode.value ? String(editForm.id ?? '') : undefined,
    groupId,
    communitys: Array.isArray(editForm.communityIds) ? editForm.communityIds.join(',') : '',
    isNotifyImage: editForm.isNotifyImage,
    startTime: editForm.startTime ? formatDateTime(editForm.startTime) : '',
    expireTime: editForm.expireTime ? formatDateTime(editForm.expireTime) : ''
  };
  editLoading.value = true;
  try {
    const { error } = isEditMode.value
      ? await fetchUpdateBotGroup(params)
      : await fetchInsertBotGroup(params);
    if (error) {
      window.$message?.error(error.message || (isEditMode.value ? '保存失败' : '新增失败'));
      return;
    }
    window.$message?.success(isEditMode.value ? '保存成功' : '新增成功');
    showEditModal.value = false;
    loadData();
  } finally {
    editLoading.value = false;
  }
};

/* ===== 删除确认弹窗 ===== */

/** 删除确认弹窗显示状态 */
const showDeleteModal = ref(false);
/** 删除加载状态 */
const deleteLoading = ref(false);
/** 当前待删除行 */
const currentDeleteRow = ref<Api.Bot.BotGroupVo | null>(null);

/** 申请入群（复制群号，引导用户前往QQ搜索申请加群） */
const handleApplyJoin = async (row: Api.Bot.BotGroupVo) => {
  await navigator.clipboard.writeText(row.groupId);
  window.$message?.success(`群号 ${row.groupId} 已复制，请前往QQ搜索并申请入群`);
};

/** 打开删除确认弹窗 */
const handleDelete = (row: Api.Bot.BotGroupVo) => {
  currentDeleteRow.value = row;
  showDeleteModal.value = true;
};

/** 确认删除 */
const handleConfirmDelete = async () => {
  if (!currentDeleteRow.value) return;
  deleteLoading.value = true;
  try {
    const { error } = await fetchRemoveBotGroup(currentDeleteRow.value.id);
    if (error) {
      window.$message?.error(error.message || '删除失败');
      return;
    }
    window.$message?.success('删除成功');
    showDeleteModal.value = false;
    currentDeleteRow.value = null;
    loadData();
  } finally {
    deleteLoading.value = false;
  }
};

/** 关闭删除确认弹窗 */
const handleCloseDeleteModal = () => {
  showDeleteModal.value = false;
  currentDeleteRow.value = null;
};

/* ===== 群成员管理弹窗 ===== */

/** 群成员弹窗显示状态 */
const showMemberModal = ref(false);
/** 群成员加载状态 */
const memberLoading = ref(false);
/** 当前查看的群 */
const currentMemberGroup = ref<Api.Bot.BotGroupVo | null>(null);
/** 群成员列表 */
const memberList = ref<Api.Bot.BotGroupMemberVo[]>([]);
/** 选中的群成员 */
const selectedMember = ref<Api.Bot.BotGroupMemberVo | null>(null);
/** 群成员分页 */
const memberPagination = reactive({
  current: 1,
  size: 12,
  total: 0
});

/** 加载群成员分页数据 */
const loadMemberData = async () => {
  if (!currentMemberGroup.value) return;
  memberLoading.value = true;
  try {
    const { data, error } = await fetchGetBotGroupMemberPageList({
      groupId: String(currentMemberGroup.value.id),
      current: memberPagination.current,
      size: memberPagination.size
    });
    if (!error && data) {
      memberList.value = data.records || [];
      memberPagination.total = data.total || 0;
    }
  } finally {
    memberLoading.value = false;
  }
};

/** 打开群成员弹窗 */
const handleMembers = (row: Api.Bot.BotGroupVo) => {
  currentMemberGroup.value = row;
  memberPagination.current = 1;
  memberPagination.total = 0;
  memberList.value = [];
  selectedMember.value = null;
  memberSubscriptions.value = [];
  showMemberModal.value = true;
  loadMemberData();
};

/** 关闭群成员弹窗 */
const handleCloseMemberModal = () => {
  showMemberModal.value = false;
  currentMemberGroup.value = null;
  selectedMember.value = null;
  memberList.value = [];
  memberSubscriptions.value = [];
  memberPagination.current = 1;
  memberPagination.total = 0;
};

/** 切换选中群成员 */
const handleSelectMember = (member: Api.Bot.BotGroupMemberVo) => {
  selectedMember.value = member;
  loadMemberSubscriptions(member);
};

/** 群成员分页切换 */
const handleMemberPageChange = (page: number) => {
  memberPagination.current = page;
  loadMemberData();
};

/* ===== 群友地图订阅 ===== */

/** 群友订阅加载状态 */
const memberSubscriptionLoading = ref(false);
/** 群友地图订阅列表 */
const memberSubscriptions = ref<Api.Game.GameMapOrderVo[]>([]);

/** 加载选中群友的地图订阅（通过其绑定的系统用户ID查询） */
const loadMemberSubscriptions = async (member: Api.Bot.BotGroupMemberVo) => {
  memberSubscriptions.value = [];
  if (!member.sysUserId) return;
  memberSubscriptionLoading.value = true;
  try {
    const { data, error } = await fetchGetGameMapOrderPage({
      userId: String(member.sysUserId),
      current: 1,
      size: 100
    });
    if (!error && data) {
      memberSubscriptions.value = data.records || [];
    }
  } finally {
    memberSubscriptionLoading.value = false;
  }
};

/** 重新加载当前选中群友的订阅 */
const reloadMemberSubscriptions = () => {
  if (selectedMember.value) {
    loadMemberSubscriptions(selectedMember.value);
  }
};

/* ===== 删除订阅确认弹窗 ===== */

/** 删除订阅确认弹窗显示状态 */
const showDeleteSubModal = ref(false);
/** 删除订阅加载状态 */
const deleteSubLoading = ref(false);
/** 当前待删除订阅 */
const currentDeleteSub = ref<Api.Game.GameMapOrderVo | null>(null);

/** 打开删除订阅确认弹窗 */
const handleDeleteSubscribe = (sub: Api.Game.GameMapOrderVo) => {
  currentDeleteSub.value = sub;
  showDeleteSubModal.value = true;
};

/** 确认删除订阅 */
const handleConfirmDeleteSubscribe = async () => {
  if (!currentDeleteSub.value) return;
  deleteSubLoading.value = true;
  try {
    const { error } = await fetchRemoveGameMapOrder(String(currentDeleteSub.value.id));
    if (error) {
      window.$message?.error(error.message || '删除失败');
      return;
    }
    window.$message?.success('删除成功');
    showDeleteSubModal.value = false;
    currentDeleteSub.value = null;
    reloadMemberSubscriptions();
  } finally {
    deleteSubLoading.value = false;
  }
};

/** 关闭删除订阅确认弹窗 */
const handleCloseDeleteSubModal = () => {
  showDeleteSubModal.value = false;
  currentDeleteSub.value = null;
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
        <NInput v-model:value="pagination.groupId" placeholder="搜索 QQ 群号" clearable size="small"
          @keyup.enter="handleSearch" @clear="handleSearch" />
      </div>
      <button class="icon-btn primary" title="新增群" @click="handleCreate">
        <SvgIcon icon="mdi:plus" />
      </button>
    </div>

    <!-- 卡片列表 -->
    <div class="card-list">
      <NGrid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
        <NGridItem v-for="(row, index) in list" :key="row.id" span="3 s:2 m:1 l:1">
          <div class="group-card" :class="{ expired: getRemainingDays(row.expireTime) === '已过期' }"
            :style="{ '--delay': `${index * 0.04}s` }">
            <div class="card-header">
              <div class="group-id">
                <SvgIcon icon="mdi:qqchat" class="qq-icon" />
                <div class="group-title">
                  <span class="group-name" :title="row.groupName">{{ row.groupName || '未命名群' }}</span>
                  <span class="group-number">{{ row.groupId }}</span>
                </div>
              </div>
              <div class="remaining-badge"
                :class="{ danger: getRemainingDays(row.expireTime) === '已过期' || getRemainingDays(row.expireTime) === '今天到期' }">
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
                <span class="label-value">{{ getCommunityNames(row.communitys) }}</span>
              </div>

              <!-- 换图通知状态 -->
              <div class="notify-status" :class="{ active: row.isNotifyImage === 1 }">
                <span class="dot" />
                <span>换图通知：{{ row.isNotifyImage === 1 ? '开启' : '关闭' }}</span>
              </div>
            </div>

            <div v-if="isAdmin" class="card-actions">
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
            <button class="action-btn apply" @click="handleApplyJoin(row)">
              <SvgIcon icon="mdi:login" />
              <span>申请入群</span>
            </button>
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
      <NPagination v-model:value="pagination.current" :total="pagination.total" :item-count="pagination.total"
        :page-size="pagination.size" @update-page="handlePageChange" />
    </div>

    <!-- 群成员管理弹窗 -->
    <NModal v-model:show="showMemberModal" preset="card" class="member-modal w-700px rounded-16px"
      :class="{ 'light-mode': !isDarkMode }" :bordered="false" size="small" :closable="true"
      @close="handleCloseMemberModal">
      <template #header>
        <div class="member-modal-header">
          <div class="member-modal-icon-wrap">
            <SvgIcon icon="mdi:account-group" class="member-modal-icon" />
          </div>
          <span>群成员管理</span>
          <span class="member-modal-group" :title="currentMemberGroup?.groupName">
            <SvgIcon icon="mdi:qqchat" class="group-tag-icon" />
            {{ currentMemberGroup?.groupName || currentMemberGroup?.groupId }}
          </span>
        </div>
      </template>
      <div class="member-modal-body">
        <!-- 左侧：群成员列表 -->
        <div class="member-list-panel">
          <div class="member-list-title">
            <div class="member-list-title-left">
              <SvgIcon icon="mdi:account-multiple" class="member-list-title-icon" />
              <span>群友列表</span>
            </div>
            <span class="member-list-count">{{ memberPagination.total }} 人</span>
          </div>
          <div class="member-list" :class="{ loading: memberLoading }">
            <div v-for="member in memberList" :key="member.id" class="member-card"
              :class="{ selected: selectedMember?.id === member.id }" @click="handleSelectMember(member)">
              <div class="member-avatar">
                <SvgIcon icon="mdi:qqchat" />
              </div>
              <div class="member-info">
                <div class="member-name-row">
                  <span class="member-name">{{ member.nickName || member.qq }}</span>
                </div>
                <div class="member-meta">
                  <span class="member-qq">{{ member.qq }}</span>
                  <span class="member-role-tag" :class="member.memberRole || 'member'">
                    {{ getMemberRoleText(member.memberRole) }}
                  </span>
                  <span class="member-bind-status" :class="{ bound: !!member.sysUserId }">
                    <span class="bind-dot" />
                    {{ member.sysUserId ? '已绑定' : '未绑定' }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="!memberLoading && memberList.length === 0" class="member-empty">
              <SvgIcon icon="mdi:account-off" class="member-empty-icon" />
              <span>暂无群成员数据</span>
            </div>
            <div v-if="memberLoading && memberList.length === 0" class="member-skeleton">
              <div v-for="i in 6" :key="`member-skeleton-${i}`" class="member-skeleton-card">
                <div class="member-skeleton-avatar" />
                <div class="member-skeleton-lines">
                  <div class="member-skeleton-line" />
                  <div class="member-skeleton-line short" />
                </div>
              </div>
            </div>
          </div>
          <div v-if="memberPagination.total > 0" class="member-pagination">
            <NPagination v-model:value="memberPagination.current" :total="memberPagination.total"
              :item-count="memberPagination.total" :page-size="memberPagination.size"
              @update-page="handleMemberPageChange" />
          </div>
        </div>

        <!-- 右侧：详情 -->
        <div class="member-detail-panel">
          <div v-if="!selectedMember" class="member-detail-placeholder">
            <div class="placeholder-icon-wrap">
              <SvgIcon icon="mdi:account-search" class="placeholder-icon" />
            </div>
            <p class="placeholder-title">选择群友查看详情</p>
            <span class="placeholder-tip">点击左侧群友卡片，可查看其地图订阅</span>
          </div>
          <div v-else class="member-detail-content">
            <div class="member-detail-header">
              <div class="member-detail-avatar">
                <SvgIcon icon="mdi:qqchat" />
              </div>
              <div class="member-detail-info">
                <div class="member-detail-name-row">
                  <span class="member-detail-name">{{ selectedMember.nickName || selectedMember.qq }}</span>
                  <span class="member-detail-role" :class="selectedMember.memberRole || 'member'">
                    {{ getMemberRoleText(selectedMember.memberRole) }}
                  </span>
                  <span class="member-detail-badge" :class="{ bound: !!selectedMember.sysUserId }">
                    {{ selectedMember.sysUserId ? '已绑定' : '未绑定' }}
                  </span>
                </div>
                <div class="member-detail-meta">
                  <span class="detail-meta-item">
                    <SvgIcon icon="mdi:qqchat" />
                    QQ：{{ selectedMember.qq }}
                  </span>
                  <span v-if="selectedMember.joinTime" class="detail-meta-item">
                    <SvgIcon icon="mdi:clock-outline" />
                    入群：{{ formatDate(selectedMember.joinTime) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="member-subscribe-section">
              <div class="member-subscribe-title">
                <SvgIcon icon="mdi:map-marker" />
                <span>地图订阅</span>
                <span v-if="!memberSubscriptionLoading && memberSubscriptions.length > 0" class="subscribe-count">
                  {{ memberSubscriptions.length }}
                </span>
              </div>
              <!-- 未绑定系统账号 -->
              <div v-if="!selectedMember.sysUserId" class="member-subscribe-empty">
                <SvgIcon icon="mdi:account-key" class="subscribe-empty-icon" />
                <p>该群友未绑定系统账号</p>
                <span>绑定后即可查看其地图订阅</span>
              </div>
              <!-- 加载中 -->
              <div v-else-if="memberSubscriptionLoading" class="subscribe-skeleton">
                <div v-for="i in 3" :key="`subscribe-skeleton-${i}`" class="subscribe-skeleton-card">
                  <div class="subscribe-skeleton-cover" />
                  <div class="subscribe-skeleton-lines">
                    <div class="subscribe-skeleton-line" />
                    <div class="subscribe-skeleton-line short" />
                  </div>
                </div>
              </div>
              <!-- 空态 -->
              <div v-else-if="memberSubscriptions.length === 0" class="member-subscribe-empty">
                <SvgIcon icon="mdi:map-marker-off" class="subscribe-empty-icon" />
                <p>暂无地图订阅</p>
                <span>该群友尚未订阅任何地图</span>
              </div>
              <!-- 订阅列表 -->
              <div v-else class="subscribe-list">
                <div v-for="sub in memberSubscriptions" :key="sub.id" class="subscribe-card">
                  <div class="subscribe-card-icon">
                    <SvgIcon icon="mdi:map" />
                  </div>
                  <div class="subscribe-card-info">
                    <span class="subscribe-map-name">{{ sub.gameMap?.mapLabel || sub.gameMap?.mapName || '未知地图'
                      }}</span>
                    <span class="subscribe-map-origin">{{ sub.gameMap?.mapName }}</span>
                  </div>
                  <div class="subscribe-badges">
                    <span v-if="sub.systemOrder === '1'" class="subscribe-badge system">
                      <SvgIcon icon="mdi:server" />
                      系统
                    </span>
                    <span v-if="sub.qqOrder === '1'" class="subscribe-badge qq">
                      <SvgIcon icon="mdi:qqchat" />
                      QQ
                    </span>
                    <button class="subscribe-delete-btn" title="删除订阅" @click.stop="handleDeleteSubscribe(sub)">
                      <SvgIcon icon="mdi:trash-can-outline" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NModal>

    <!-- 删除订阅确认弹窗 -->
    <NModal v-model:show="showDeleteSubModal" preset="card" class="delete-modal rounded-16px w-400px"
      :class="{ 'light-mode': !isDarkMode }" :bordered="false" size="small" :closable="false">
      <template #header>
        <div class="delete-modal-header">
          <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
          <span>删除订阅确认</span>
        </div>
      </template>
      <div class="delete-modal-body">
        <p class="delete-modal-text">
          确定要删除地图
          <span class="delete-modal-target">{{ currentDeleteSub?.gameMap?.mapLabel || currentDeleteSub?.gameMap?.mapName
            }}</span>
          的订阅吗？
        </p>
        <p class="delete-modal-tip">删除后该群友将不再收到此地图的订阅通知。</p>
      </div>
      <div class="delete-modal-actions">
        <button class="action-btn cancel" @click="handleCloseDeleteSubModal">取消</button>
        <button class="action-btn danger" :disabled="deleteSubLoading" @click="handleConfirmDeleteSubscribe">
          <SvgIcon icon="mdi:delete" />
          <span>{{ deleteSubLoading ? '删除中...' : '删除' }}</span>
        </button>
      </div>
    </NModal>

    <!-- 删除确认弹窗 -->
    <NModal v-model:show="showDeleteModal" preset="card" class="delete-modal rounded-16px w-400px"
      :class="{ 'light-mode': !isDarkMode }" :bordered="false" size="small" :closable="false">
      <template #header>
        <div class="delete-modal-header">
          <SvgIcon icon="mdi:delete-alert" class="delete-modal-icon" />
          <span>删除确认</span>
        </div>
      </template>
      <div class="delete-modal-body">
        <p class="delete-modal-text">
          确定要删除机器人群
          <span class="delete-modal-target">{{ currentDeleteRow?.groupId }}</span>
          吗？
        </p>
        <p class="delete-modal-tip">删除后数据将无法恢复，请谨慎操作。</p>
      </div>
      <div class="delete-modal-actions">
        <button class="action-btn cancel" @click="handleCloseDeleteModal">取消</button>
        <button class="action-btn danger" :disabled="deleteLoading" @click="handleConfirmDelete">
          <SvgIcon icon="mdi:delete" />
          <span>{{ deleteLoading ? '删除中...' : '删除' }}</span>
        </button>
      </div>
    </NModal>

    <!-- 编辑 / 新增弹窗 -->
    <NModal v-model:show="showEditModal" preset="card" class="w-520px rounded-16px"
      :class="{ 'light-mode': !isDarkMode }" :bordered="false" size="small" :closable="true">
      <template #header>
        <div class="modal-header">
          <SvgIcon :icon="isEditMode ? 'mdi:pencil' : 'mdi:plus'" class="modal-header-icon" />
          <span>{{ isEditMode ? '编辑机器人群' : '新增机器人群' }}</span>
        </div>
      </template>
      <div class="modal-form">
        <div class="form-item">
          <label class="form-label">QQ 群号</label>
          <NInput v-model:value="editForm.groupId" placeholder="请输入 QQ 群号" clearable />
        </div>
        <div class="form-item">
          <label class="form-label">偏好社区</label>
          <NSelect v-model:value="editForm.communityIds" :options="communityOptions" multiple clearable
            placeholder="选择偏好社区" />
        </div>
        <div class="form-item">
          <label class="form-label">换图通知</label>
          <div class="switch-wrap">
            <NSwitch v-model:value="editForm.isNotifyImage" :checked-value="1" :unchecked-value="0" />
            <span class="switch-text">{{ editForm.isNotifyImage === 1 ? '开启' : '关闭' }}</span>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">生效时间</label>
          <NDatePicker v-model:value="editForm.startTime" type="datetime" clearable placeholder="选择生效时间"
            class="w-full" />
        </div>
        <div class="form-item">
          <label class="form-label">到期时间</label>
          <NDatePicker v-model:value="editForm.expireTime" type="datetime" clearable placeholder="选择到期时间"
            class="w-full" />
        </div>
        <div class="modal-actions">
          <button class="action-btn cancel" @click="showEditModal = false">取消</button>
          <button class="action-btn confirm" :disabled="editLoading" @click="handleEditSubmit">
            <SvgIcon icon="mdi:check" />
            <span>{{ editLoading ? '保存中...' : '保存' }}</span>
          </button>
        </div>
      </div>
    </NModal>
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

        .group-title {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .group-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--n-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .group-number {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.45);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
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

    .action-btn.apply {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      width: 100%;
      margin-top: 12px;
      padding: 8px 2px;
      border-radius: 9px;
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      white-space: nowrap;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.8);

      &:hover {
        transform: translateY(-2px);
        background: rgba(79, 172, 254, 0.2);
        color: #4facfe;
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

      .card-header {
        .group-title {
          .group-number {
            color: rgba(0, 0, 0, 0.45);
          }
        }
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

      .action-btn.apply {
        border-top-color: rgba(0, 0, 0, 0.06);
        background: rgba(0, 0, 0, 0.04);
        color: rgba(0, 0, 0, 0.65);

        &:hover {
          background: rgba(79, 172, 254, 0.18);
          color: #4facfe;
        }
      }
    }

    .empty-state {
      color: rgba(0, 0, 0, 0.4);
    }
  }
}

/* ================================ 删除确认弹窗（teleport 到 body，独立于容器作用域） ================================ */

.delete-modal {
  width: 360px;

  .delete-modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .delete-modal-icon {
      font-size: 20px;
      color: #f5576c;
    }
  }

  .delete-modal-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 0 16px;

    .delete-modal-text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);

      .delete-modal-target {
        font-weight: 600;
        color: #f5576c;
      }
    }

    .delete-modal-tip {
      margin: 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  .delete-modal-actions {
    display: flex;
    gap: 10px;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex: 1;
      padding: 9px 2px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.8);

      &:hover {
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      &.cancel {
        &:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      }

      &.danger {
        color: #f5576c;
        background: rgba(245, 87, 108, 0.12);
        border-color: rgba(245, 87, 108, 0.25);

        &:hover {
          background: rgba(245, 87, 108, 0.22);
        }
      }
    }
  }
}

.light-mode {
  .delete-modal-body {
    .delete-modal-text {
      color: rgba(0, 0, 0, 0.85);
    }

    .delete-modal-tip {
      color: rgba(0, 0, 0, 0.45);
    }
  }
}

/* ================================ 群成员管理弹窗（teleport 到 body） ================================ */

.member-modal {
  .member-modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .member-modal-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: rgba(102, 126, 234, 0.12);

      .member-modal-icon {
        font-size: 18px;
        color: #667eea;
      }
    }

    .member-modal-group {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.65);
      background: rgba(255, 255, 255, 0.06);

      .group-tag-icon {
        font-size: 13px;
        color: #12b7f5;
      }
    }
  }

  .member-modal-body {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 14px;
    height: min(430px, 62vh);
  }

  /* ---------- 左侧：群友列表 ---------- */
  .member-list-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;

    .member-list-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);

      .member-list-title-left {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.85);

        .member-list-title-icon {
          font-size: 16px;
          color: #667eea;
        }
      }

      .member-list-count {
        padding: 1px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
      }
    }

    .member-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 2px;

      &.loading {
        opacity: 0.7;
        pointer-events: none;
      }

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.12);
      }
    }

    .member-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(102, 126, 234, 0.3);
      }

      &.selected {
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.4);
        box-shadow: inset 3px 0 0 #667eea;
      }

      .member-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 19px;
        color: #12b7f5;
        background: rgba(18, 183, 245, 0.1);
        flex-shrink: 0;
      }

      .member-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .member-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;

          .member-name {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.88);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .member-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .member-qq {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
          }

          .member-bind-status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.4);

            .bind-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.3);
            }

            &.bound {
              color: #43e97b;

              .bind-dot {
                background: #43e97b;
                box-shadow: 0 0 4px rgba(67, 233, 123, 0.6);
              }
            }
          }

          .member-role-tag {
            display: inline-flex;
            align-items: center;
            padding: 0 5px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.55);
            background: rgba(255, 255, 255, 0.08);

            &.owner {
              color: #f5576c;
              background: rgba(245, 87, 108, 0.12);
            }

            &.admin {
              color: #f0a020;
              background: rgba(240, 160, 32, 0.12);
            }
          }
        }
      }
    }

    .member-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 50px 20px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 13px;

      .member-empty-icon {
        font-size: 38px;
        opacity: 0.4;
      }
    }

    .member-skeleton {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .member-skeleton-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);

        .member-skeleton-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
        }

        .member-skeleton-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;

          .member-skeleton-line {
            height: 12px;
            width: 60%;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.05);

            &.short {
              width: 40%;
            }
          }
        }
      }
    }

    .member-pagination {
      display: flex;
      justify-content: center;
      flex-shrink: 0;
      padding-top: 2px;
    }
  }

  /* ---------- 右侧：详情 ---------- */
  .member-detail-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;

    .member-detail-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 100%;
      padding: 0 24px;
      text-align: center;

      .placeholder-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        margin-bottom: 8px;
        background: rgba(102, 126, 234, 0.08);

        .placeholder-icon {
          font-size: 32px;
          color: rgba(102, 126, 234, 0.6);
        }
      }

      .placeholder-title {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.7);
      }

      .placeholder-tip {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .member-detail-content {
      display: flex;
      flex-direction: column;
      height: 100%;

      .member-detail-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);

        .member-detail-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          font-size: 24px;
          color: #12b7f5;
          background: rgba(18, 183, 245, 0.12);
          flex-shrink: 0;
        }

        .member-detail-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;

          .member-detail-name-row {
            display: flex;
            align-items: center;
            gap: 8px;

            .member-detail-name {
              font-size: 15px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.92);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .member-detail-badge {
              flex-shrink: 0;
              padding: 1px 8px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 500;
              color: rgba(255, 255, 255, 0.55);
              background: rgba(255, 255, 255, 0.08);

              &.bound {
                color: #43e97b;
                background: rgba(67, 233, 123, 0.12);
              }
            }

            .member-detail-role {
              flex-shrink: 0;
              padding: 1px 8px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 500;
              color: rgba(255, 255, 255, 0.55);
              background: rgba(255, 255, 255, 0.08);

              &.owner {
                color: #f5576c;
                background: rgba(245, 87, 108, 0.12);
              }

              &.admin {
                color: #f0a020;
                background: rgba(240, 160, 32, 0.12);
              }
            }
          }

          .member-detail-meta {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;

            .detail-meta-item {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              color: rgba(255, 255, 255, 0.5);

              svg {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.35);
              }
            }
          }
        }
      }

      .member-subscribe-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px 16px;
        min-height: 0;

        .member-subscribe-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);

          svg {
            font-size: 16px;
            color: #667eea;
          }

          .subscribe-count {
            padding: 1px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
            color: #667eea;
            background: rgba(102, 126, 234, 0.12);
          }
        }

        .member-subscribe-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.4);

          .subscribe-empty-icon {
            font-size: 36px;
            opacity: 0.45;
          }

          p {
            margin: 0;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
          }

          span {
            font-size: 11px;
          }
        }

        .subscribe-skeleton {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          min-height: 0;

          .subscribe-skeleton-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.03);

            .subscribe-skeleton-cover {
              width: 34px;
              height: 34px;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.05);
              flex-shrink: 0;
            }

            .subscribe-skeleton-lines {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 6px;

              .subscribe-skeleton-line {
                height: 12px;
                width: 55%;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);

                &.short {
                  width: 35%;
                }
              }
            }
          }
        }

        .subscribe-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 2px;

          &::-webkit-scrollbar {
            width: 4px;
          }

          &::-webkit-scrollbar-thumb {
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.12);
          }

          .subscribe-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            transition: all 0.2s ease;

            &:hover {
              background: rgba(255, 255, 255, 0.07);
              border-color: rgba(102, 126, 234, 0.3);
            }

            .subscribe-card-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 34px;
              height: 34px;
              border-radius: 8px;
              font-size: 18px;
              color: #667eea;
              background: rgba(102, 126, 234, 0.1);
              flex-shrink: 0;
            }

            .subscribe-card-info {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 2px;

              .subscribe-map-name {
                font-size: 13px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.88);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .subscribe-map-origin {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .subscribe-badges {
              display: flex;
              align-items: center;
              gap: 5px;
              flex-shrink: 0;

              .subscribe-badge {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                padding: 2px 7px;
                border-radius: 7px;
                font-size: 10.5px;
                font-weight: 500;

                svg {
                  font-size: 11px;
                }

                &.system {
                  color: #43e97b;
                  background: rgba(67, 233, 123, 0.1);
                }

                &.qq {
                  color: #12b7f5;
                  background: rgba(18, 183, 245, 0.1);
                }
              }

              .subscribe-delete-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                padding: 0;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.3);
                background: transparent;
                transition: all 0.2s ease;

                &:hover {
                  color: #f5576c;
                  background: rgba(245, 87, 108, 0.12);
                }
              }
            }
          }
        }
      }
    }
  }
}

.light-mode {
  .member-modal {
    .member-modal-header .member-modal-group {
      color: rgba(0, 0, 0, 0.55);
      background: rgba(0, 0, 0, 0.05);
    }

    .member-list-title {
      border-bottom-color: rgba(0, 0, 0, 0.06);

      .member-list-title-left {
        color: rgba(0, 0, 0, 0.75);
      }

      .member-list-count {
        color: #667eea;
        background: rgba(102, 126, 234, 0.1);
      }
    }

    .member-card {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.05);

      &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: rgba(102, 126, 234, 0.3);
      }

      &.selected {
        background: rgba(102, 126, 234, 0.1);
        border-color: rgba(102, 126, 234, 0.35);
        box-shadow: inset 3px 0 0 #667eea;
      }

      .member-info {
        .member-name-row .member-name {
          color: rgba(0, 0, 0, 0.8);
        }

        .member-meta .member-qq {
          color: rgba(0, 0, 0, 0.45);
        }

        .member-meta .member-bind-status {
          color: rgba(0, 0, 0, 0.4);

          .bind-dot {
            background: rgba(0, 0, 0, 0.25);
          }
        }

        .member-meta .member-role-tag {
          color: rgba(0, 0, 0, 0.5);
          background: rgba(0, 0, 0, 0.06);

          &.owner {
            color: #d03050;
            background: rgba(208, 48, 80, 0.1);
          }

          &.admin {
            color: #f0a020;
            background: rgba(240, 160, 32, 0.1);
          }
        }
      }
    }

    .member-list::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
    }

    .member-empty {
      color: rgba(0, 0, 0, 0.4);
    }

    .member-skeleton .member-skeleton-card {
      background: rgba(0, 0, 0, 0.03);
    }

    .member-skeleton .member-skeleton-avatar,
    .member-skeleton .member-skeleton-line {
      background: rgba(0, 0, 0, 0.05);
    }

    .member-detail-panel {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.05);

      .member-detail-placeholder {
        .placeholder-title {
          color: rgba(0, 0, 0, 0.7);
        }

        .placeholder-tip {
          color: rgba(0, 0, 0, 0.4);
        }

        .placeholder-icon-wrap {
          background: rgba(102, 126, 234, 0.08);

          .placeholder-icon {
            color: rgba(102, 126, 234, 0.6);
          }
        }
      }

      .member-detail-content {
        .member-detail-header {
          border-bottom-color: rgba(0, 0, 0, 0.06);

          .member-detail-info {
            .member-detail-name {
              color: rgba(0, 0, 0, 0.85);
            }

            .member-detail-badge {
              color: rgba(0, 0, 0, 0.55);
              background: rgba(0, 0, 0, 0.06);

              &.bound {
                color: #2ecc71;
                background: rgba(46, 204, 113, 0.12);
              }
            }

            .member-detail-role {
              color: rgba(0, 0, 0, 0.55);
              background: rgba(0, 0, 0, 0.06);

              &.owner {
                color: #d03050;
                background: rgba(208, 48, 80, 0.1);
              }

              &.admin {
                color: #f0a020;
                background: rgba(240, 160, 32, 0.1);
              }
            }

            .member-detail-meta .detail-meta-item {
              color: rgba(0, 0, 0, 0.5);

              svg {
                color: rgba(0, 0, 0, 0.35);
              }
            }
          }
        }

        .member-subscribe-section {
          .member-subscribe-title {
            color: rgba(0, 0, 0, 0.75);

            .subscribe-count {
              color: #667eea;
              background: rgba(102, 126, 234, 0.1);
            }
          }

          .member-subscribe-empty {
            border-color: rgba(0, 0, 0, 0.15);
            color: rgba(0, 0, 0, 0.4);

            p {
              color: rgba(0, 0, 0, 0.6);
            }
          }

          .subscribe-skeleton {
            .subscribe-skeleton-card {
              background: rgba(0, 0, 0, 0.03);

              .subscribe-skeleton-cover,
              .subscribe-skeleton-line {
                background: rgba(0, 0, 0, 0.05);
              }
            }
          }

          .subscribe-list {
            &::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.15);
            }

            .subscribe-card {
              background: rgba(0, 0, 0, 0.02);
              border-color: rgba(0, 0, 0, 0.05);

              &:hover {
                background: rgba(0, 0, 0, 0.04);
                border-color: rgba(102, 126, 234, 0.3);
              }

              .subscribe-card-icon {
                color: #667eea;
                background: rgba(102, 126, 234, 0.1);
              }

              .subscribe-card-info {
                .subscribe-map-name {
                  color: rgba(0, 0, 0, 0.82);
                }

                .subscribe-map-origin {
                  color: rgba(0, 0, 0, 0.4);
                }
              }

              .subscribe-badge {
                &.system {
                  color: #2ecc71;
                  background: rgba(46, 204, 113, 0.1);
                }

                &.qq {
                  color: #0d9fd8;
                  background: rgba(13, 159, 216, 0.1);
                }
              }

              .subscribe-delete-btn {
                color: rgba(0, 0, 0, 0.3);

                &:hover {
                  color: #f5576c;
                  background: rgba(245, 87, 108, 0.12);
                }
              }
            }
          }
        }
      }
    }
  }
}

/* ================================ 编辑弹窗（teleport 到 body，独立于容器作用域） ================================ */

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--n-text-color);

  .modal-header-icon {
    font-size: 18px;
    color: #667eea;
  }
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .form-label {
      font-size: 12.5px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.75);
    }

    .switch-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 34px;

      .switch-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }
    }
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex: 1;
      padding: 9px 2px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.8);

      &:hover {
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      &.cancel {
        &:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      }

      &.confirm {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.25);

        &:hover {
          background: rgba(102, 126, 234, 0.22);
        }
      }
    }
  }
}

.light-mode {
  .modal-form {
    .form-label {
      color: rgba(0, 0, 0, 0.72);
    }

    .switch-wrap .switch-text {
      color: rgba(0, 0, 0, 0.6);
    }

    .modal-actions .action-btn.cancel {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.65);

      &:hover {
        background: rgba(0, 0, 0, 0.1);
      }
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
