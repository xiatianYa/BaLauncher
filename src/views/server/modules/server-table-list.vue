<script setup lang="ts">
import ServerMapFlowModal from '@/components/tool/server-map-flow-modal.vue';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';
import {
  NButton,
  NDataTable,
  NEllipsis,
  NTag,
  NTooltip,
  type DataTableBaseColumn,
  type DataTableColumns
} from 'naive-ui';
import { computed, h, ref } from 'vue';
import { useDict } from '@/hooks/business/dict';
import dayjs from 'dayjs';

// 排序状态：none 默认 / asc 正序 / desc 倒序
type SortOrder = 'none' | 'asc' | 'desc';
type SortField = 'players' | 'ping' | null;

const { dictType, dictLabel, dictOptions } = useDict();

const props = defineProps<{
  servers: Api.Game.SeverVo[];
  mapList: Api.Game.Map[];
  sourceServerList: Api.Game.Server[];
  refreshingAddrs: string[];
}>();

const emit = defineEmits<{
  (e: 'join', server: Api.Game.SeverVo): void;
  (e: 'copy', server: Api.Game.SeverVo): void;
  (e: 'autoJoin', server: Api.Game.SeverVo): void;
  (e: 'refresh', server: Api.Game.SeverVo): void;
  (e: 'back'): void;
}>();

// 获取 Ping 值对应的 naive-ui Tag 类型（来自字典 ping_level）
const getPingType = (ping?: number) => {
  const level = ping === undefined || ping === null ? 'unknown' : ping < 70 ? 'normal' : ping < 100 ? 'warning' : 'error';
  return dictType('ping_level', level);
};

// 地图运行时长：自换图时间(dateTimeOriginal)起，用 dayjs 计算并格式化为 X时Y分 / X分，离线时无该字段显示 '-'
const formatMapRuntime = (targetTime?: string) => {
  if (!targetTime) return '-';
  const minutes = Math.max(dayjs().diff(dayjs(targetTime), 'minute'), 0);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
  return `${minutes}分`;
};

// 获取源服务器信息
const getSourceServerInfo = (server: Api.Game.SeverVo): Api.Game.Server | undefined => {
  return props.sourceServerList.find(s => {
    if (s.connectStr === server.connectStr) return true;
    if (s.ip && s.port) {
      const serverAddr = `${s.ip}:${s.port}`;
      if (serverAddr === server.connectStr) return true;
    }
    return false;
  });
};

// 判断服务器是否离线
const isServerOffline = (server: Api.Game.SeverVo) => {
  return !server.isOnline;
};

// 获取服务器显示名称（离线时用源服务器名 + 离线后缀；
// 源服务器信息缺失时用连接地址兜底，再缺失则直接显示"离线"，避免出现 undefined）
const getServerName = (server: Api.Game.SeverVo) => {
  if (server.serverName) return server.serverName;
  const sourceName = getSourceServerInfo(server)?.serverName;
  const baseName = sourceName || server.connectStr;
  return baseName ? `${baseName}${$t('server.offlineSuffix')}` : $t('server.offline');
};

// 获取玩家数进度百分比
const getPlayerPercent = (server: Api.Game.SeverVo) => {
  if (!server.maxPlayers) return 0;
  return Math.min((server.numPlayers / server.maxPlayers) * 100, 100);
};

// 当前排序字段和方向，默认不排序
const sortField = ref<SortField>(null);
const sortOrder = ref<SortOrder>('none');

// 根据排序状态返回服务器列表；无论是否排序，离线服务器始终置底（在线在前、离线在后）
const sortedServers = computed(() => {
  const sortFn =
    sortField.value === null || sortOrder.value === 'none'
      ? null
      : (a: Api.Game.SeverVo, b: Api.Game.SeverVo) => {
          let v1 = 0;
          let v2 = 0;

          if (sortField.value === 'players') {
            v1 = a.numPlayers ?? 0;
            v2 = b.numPlayers ?? 0;
          } else if (sortField.value === 'ping') {
            v1 = a.ping ?? Number.MAX_SAFE_INTEGER;
            v2 = b.ping ?? Number.MAX_SAFE_INTEGER;
          }

          return sortOrder.value === 'asc' ? v1 - v2 : v2 - v1;
        };

  const online = props.servers.filter(s => !isServerOffline(s));
  const offline = props.servers.filter(isServerOffline);

  if (sortFn) {
    online.sort(sortFn);
    offline.sort(sortFn);
  }

  return [...online, ...offline];
});

// 获取服务器模式文案（字典 game_server_mode 渲染，未配置模式归入"未分组"）
const getServerModeLabel = (mode?: number) => {
  if (mode == null) return $t('server.unknownMode');
  return dictLabel('game_server_mode', String(mode)) || $t('server.unknownMode');
};

// 按服务器模式分区展示（组内保持在线优先、离线置底与排序结果；分区按字典顺序，未知模式置底）
const groupedServers = computed(() => {
  const dictOrder = new Map(dictOptions('game_server_mode').map((d, i) => [d.value, i] as [string, number]));

  const groups: { mode: number | undefined; label: string; servers: Api.Game.SeverVo[] }[] = [];
  const indexMap = new Map<string, number>();

  sortedServers.value.forEach(server => {
    const mode = server.mode;
    const key = mode == null ? '__none__' : String(mode);
    let gi = indexMap.get(key);
    if (gi === undefined) {
      gi = groups.length;
      indexMap.set(key, gi);
      groups.push({ mode, label: getServerModeLabel(mode), servers: [] });
    }
    groups[gi].servers.push(server);
  });

  // 未知模式置底，其余按字典顺序排列
  groups.sort((a, b) => {
    const ai = a.mode == null ? Number.MAX_SAFE_INTEGER : (dictOrder.get(String(a.mode)) ?? Number.MAX_SAFE_INTEGER - 1);
    const bi = b.mode == null ? Number.MAX_SAFE_INTEGER : (dictOrder.get(String(b.mode)) ?? Number.MAX_SAFE_INTEGER - 1);
    return ai - bi;
  });

  return groups;
});

// 切换排序状态：none -> asc -> desc -> none
const toggleSort = (field: SortField) => {
  if (sortField.value !== field) {
    sortField.value = field;
    sortOrder.value = 'asc';
    return;
  }

  if (sortOrder.value === 'none') {
    sortOrder.value = 'asc';
  } else if (sortOrder.value === 'asc') {
    sortOrder.value = 'desc';
  } else {
    sortOrder.value = 'none';
  }
};

// 获取指定字段的排序状态
const getSortOrder = (field: SortField) => {
  return sortField.value === field ? sortOrder.value : 'none';
};

/* ==================== NDataTable 列定义 ==================== */

/** 列宽拖拽结果（按列 key 记录；所有分组表格共用同一份 columns，改动即全局同步） */
const resizedWidths = ref<Record<string, number>>({});

/** NDataTable 列宽拖拽回调：记录调整后的宽度（受限后的宽度），驱动所有分组表格同步 */
const handleColumnResize = (_resizedWidth: number, limitedWidth: number, column: DataTableBaseColumn) => {
  const key = String(column.key);
  if (key) resizedWidths.value[key] = limitedWidth;
};

/** 行 key：保证各分组表格行节点稳定复用 */
const rowKey = (row: Api.Game.SeverVo) => row.connectStr || row.serverName || '';

/** 行 props：离线行红渲 + 错落淡入动画延时（保持与旧样式一致的进入动画） */
const rowProps = (row: Api.Game.SeverVo, index: number) => ({
  class: isServerOffline(row) ? 'offline-row' : '',
  style: { '--delay': `${Math.min(index * 0.05, 0.4)}s` }
});

/* ===== 单元格渲染（h() 生成，样式经 :deep 覆写，保证与旧表格视觉一致） ===== */

/** 服务器名：状态点 + 名称（超出省略，悬停展示完整名称） */
const renderNameCell = (row: Api.Game.SeverVo) =>
  h('div', { class: 'td-name' }, [
    h('span', { class: ['status-dot', isServerOffline(row) ? 'offline' : 'online'] }),
    h(
      NEllipsis,
      { class: 'name-text', maxLine: 1, tooltip: { placement: 'top' }, style: 'max-width: 200px' },
      { default: () => getServerName(row) }
    )
  ]);

/** 地图：原名 + 译名副行（均悬停展示完整内容） */
const renderMapCell = (row: Api.Game.SeverVo) =>
  h('div', { class: 'map-box' }, [
    h(
      NTooltip,
      { trigger: 'hover', placement: 'top', disabled: !row.mapName },
      {
        trigger: () => h('span', { class: 'map-name' }, row.mapName || '-'),
        default: () => row.mapName
      }
    ),
    row.mapLabel
      ? h(
          NTooltip,
          { trigger: 'hover', placement: 'top' },
          {
            trigger: () => h('span', { class: 'map-label', style: 'color: rgba(var(--app-rgb), 0.6)' }, row.mapLabel),
            default: () => row.mapLabel
          }
        )
      : null
  ]);

/** 玩家数：圆点（点亮数量按人数比例，颜色绿→红分级）+ 精确人数 */
const PLAYER_DOT_COLORS = ['#52c41a', '#8fd62c', '#c6d435', '#e8b83d', '#f08a3e', '#ff4d4f'];

const renderPlayersCell = (row: Api.Game.SeverVo) => {
  const litCount = Math.round((getPlayerPercent(row) / 100) * PLAYER_DOT_COLORS.length);
  return h('div', { class: 'player-dot-cell' }, [
    h(
      'div',
      { class: 'player-dots' },
      PLAYER_DOT_COLORS.map((color, i) =>
        h('span', {
          class: ['dot', i < litCount ? 'on' : ''],
          style: i < litCount ? { backgroundColor: color, boxShadow: `0 0 6px ${color}` } : null
        })
      )
    ),
    h('span', { class: 'player-count-text', style: 'color: rgba(var(--app-rgb), 0.6)' }, [
      `${row.numPlayers || 0}`,
      h('span', { class: 'count-sep' }, '/'),
      `${row.maxPlayers || 0}`
    ])
  ]);
};

/** Ping：字典色 Tag */
const renderPingCell = (row: Api.Game.SeverVo) =>
  h(NTag, { size: 'small', round: true, class: 'ping-tag', type: getPingType(row.ping) }, { default: () => (row.ping ? `${row.ping}ms` : '??') });

/** 比分：CT:T 徽标（仅展示比分，不展示阶段等服务器状态） */
const renderScoreCell = (row: Api.Game.SeverVo) =>
  row.mapPhase
    ? h('div', { class: 'stat-chip' }, [
        h('span', { class: 'team team-ct' }, `${row.CTScore || 0}`),
        h('span', { class: 'score-sep' }, ':'),
        h('span', { class: 'team team-t' }, `${row.TScore || 0}`)
      ])
    : h('span', { class: 'empty-score', style: 'color: rgba(var(--app-rgb), 0.6)' }, '-');

/** 地图运行时长：Tag 样式（窄列下省略） */
const renderRuntimeCell = (row: Api.Game.SeverVo) =>
  h(
    NTag,
    {
      size: 'small',
      round: true,
      bordered: false,
      class: 'runtime-tag',
      color: { color: 'rgba(var(--app-rgb), 0.06)', textColor: 'rgba(var(--app-rgb), 0.75)' }
    },
    { default: () => formatMapRuntime(row.dateTimeOriginal) }
  );

/* ===== 地图运行时间线弹窗 ===== */

const showFlowModal = ref(false);
/** 传给流程弹窗的服务器（取源服务器信息，未匹配到时为 null） */
const flowServer = ref<Api.Game.Server | null>(null);

/** 打开地图运行记录流程弹窗 */
const handleShowFlow = (server: Api.Game.SeverVo) => {
  flowServer.value = getSourceServerInfo(server) ?? null;
  showFlowModal.value = true;
};

/** 操作：加入 / 自动加入 / 复制 / 地图运行时间线 四个按钮 */
const renderActionCell = (row: Api.Game.SeverVo) =>
  h('div', { class: 'action-cell' }, [
    h(
      NTooltip,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () =>
          h(
            NButton,
            { size: 'small', class: 'action-btn join-btn', onClick: () => emit('join', row) },
            { icon: () => h(SvgIcon, { icon: 'iconamoon:player-play-bold' }) }
          ),
        default: () => $t('server.joinServer')
      }
    ),
    h(
      NTooltip,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () =>
          h(
            NButton,
            { size: 'small', class: 'action-btn auto-btn', onClick: () => emit('autoJoin', row) },
            { icon: () => h(SvgIcon, { icon: 'iconamoon:player-next-bold' }) }
          ),
        default: () => $t('server.autoJoin')
      }
    ),
    h(
      NTooltip,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () =>
          h(
            NButton,
            { size: 'small', class: 'action-btn copy-btn', onClick: () => emit('copy', row) },
            { icon: () => h(SvgIcon, { icon: 'solar:copy-outline' }) }
          ),
        default: () => $t('server.copyAddress')
      }
    ),
    h(
      NTooltip,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () =>
          h(
            NButton,
            { size: 'small', class: 'action-btn flow-btn', onClick: () => handleShowFlow(row) },
            { icon: () => h(SvgIcon, { icon: 'mdi:file-tree' }) }
          ),
        default: () => $t('tools.mapTimeline')
      }
    )
  ]);

/** 排序图标：按当前排序状态切换 升序/降序/未排序 图标 */
const getSortIcon = (field: SortField) => {
  const order = getSortOrder(field);
  if (order === 'asc') return 'iconamoon:arrow-up-2-bold';
  if (order === 'desc') return 'iconamoon:arrow-down-2-bold';
  return 'ph:caret-up-down-bold';
};

/** 可排序表头：图标 + 文案，点击切换排序（不启用 NDataTable 内置 sorter，保证离线服务器始终置底） */
const renderSortableTitle = (field: SortField, label: string) => () =>
  h('div', { class: 'th-sortable', onClick: () => toggleSort(field) }, [
    h('span', null, label),
    h('span', { class: 'sort-icon' }, [h(SvgIcon, { icon: getSortIcon(field) })])
  ]);

/** 普通表头文案 */
const renderPlainTitle = (label: string) => () => h('div', { class: 'th-title' }, label);

/** NDataTable 列定义：所有分组表格共用同一数组，拖拽列宽后全局同步 */
const columns = computed<DataTableColumns<Api.Game.SeverVo>>(() => [
  {
    key: 'name',
    title: renderPlainTitle($t('server.serverName')),
    minWidth: 120,
    resizable: true,
    width: resizedWidths.value['name'],
    render: row => renderNameCell(row)
  },
  {
    key: 'map',
    title: renderPlainTitle($t('server.map')),
    minWidth: 100,
    resizable: true,
    width: resizedWidths.value['map'],
    render: row => renderMapCell(row)
  },
  {
    key: 'players',
    title: renderSortableTitle('players', $t('server.playerCountColumn')),
    width: resizedWidths.value['players'] ?? 88,
    minWidth: 80,
    resizable: true,
    render: row => renderPlayersCell(row)
  },
  {
    key: 'ping',
    title: renderSortableTitle('ping', $t('server.ping')),
    width: resizedWidths.value['ping'] ?? 72,
    minWidth: 64,
    resizable: true,
    render: row => renderPingCell(row)
  },
  {
    key: 'score',
    title: renderPlainTitle($t('server.score')),
    width: resizedWidths.value['score'] ?? 84,
    minWidth: 72,
    resizable: true,
    render: row => renderScoreCell(row)
  },
  {
    key: 'runtime',
    title: renderPlainTitle($t('server.mapRuntime')),
    width: resizedWidths.value['runtime'] ?? 96,
    minWidth: 80,
    resizable: true,
    render: row => renderRuntimeCell(row)
  },
  {
    key: 'action',
    title: renderPlainTitle($t('server.operate')),
    width: resizedWidths.value['action'] ?? 210,
    minWidth: 196,
    resizable: true,
    render: row => renderActionCell(row)
  }
]);
</script>

<template>
  <div class="h-full custom-table-wrapper server-table-list">
    <div class="custom-table" v-show="servers.length > 0">
      <!-- 每个模式分区：分区标题 + 独立 NDataTable（共用同一列定义，列宽拖拽全局同步） -->
      <template v-for="group in groupedServers" :key="group.mode ?? 'none'">
        <div class="mode-section-header">
          <span class="mode-section-label">{{ group.label }}</span>
          <NTag size="small" round :bordered="false"
            :color="{ color: 'rgba(var(--app-rgb), 0.06)', textColor: 'rgba(var(--app-rgb), 0.5)' }">
            {{ $t('server.serverCount', { count: group.servers.length }) }}
          </NTag>
        </div>
        <NDataTable
          class="group-table"
          :columns="columns"
          :data="group.servers"
          :row-key="rowKey"
          :row-props="rowProps"
          :bordered="false"
          :single-line="false"
          table-layout="fixed"
          @unstable-column-resize="handleColumnResize"
        />
      </template>
    </div>
    <!-- 地图运行时间线弹窗 -->
    <ServerMapFlowModal v-model:show="showFlowModal" :server="flowServer" />
  </div>
</template>

<style scoped lang="scss">
.custom-table-wrapper {
  padding: 10px;
  overflow: auto;
}

.custom-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
  // 关键：确保表格按完整列宽渲染，不随容器宽度收缩
  min-width: 760px;
}

/* 模式分区标题 */
.mode-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 16px 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--app-rgb), 0.7);

  .mode-section-label {
    display: inline-flex;
    align-items: center;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      margin-right: 8px;
      border-radius: 50%;
      background: #667eea;
      box-shadow: 0 0 6px rgba(102, 126, 234, 0.6);
    }
  }
}

/* ===== NDataTable 内部样式覆写（行卡片化，视觉与旧表格保持一致） ===== */
.group-table {
  /* 去掉默认底色 */
  :deep(.n-data-table) {
    background: transparent;
  }

  /* 行间距：表头与首行、行与行之间留出 10px（表头行与表体同表渲染时自动生效） */
  :deep(.n-data-table-table) {
    border-collapse: separate !important;
    border-spacing: 0 10px;
  }

  /* ===== 表头 ===== */
  :deep(.n-data-table-th) {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(var(--app-rgb), 0.08);
    padding: 8px 12px;
  }

  :deep(.n-data-table-th__title-wrapper) {
    font-size: 13px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.6);
    white-space: nowrap;
  }

  /* 普通表头 / 排序表头（保持旧 .th 的样式） */
  :deep(.th-title) {
    font-size: 13px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.6);
    white-space: nowrap;
  }

  :deep(.th-sortable) {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    transition: color 0.2s ease;

    &:hover {
      color: rgba(var(--app-rgb), 0.9);
    }

    .sort-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      font-size: 12px;
      opacity: 0.7;
    }
  }

  /* ===== 表体（行卡片化：圆角 + 主题背景 + 离线红渲 + hover 加深） ===== */
  :deep(.n-data-table-td) {
    border: none;
    padding: 14px 12px;
    background: rgba(var(--app-rgb), 0.03);
    overflow: hidden;
    transition: background 0.25s ease;
  }

  /* 每行四角圆角：首列左圆角、末列右圆角（与旧 .custom-row 12px 圆角一致） */
  :deep(.n-data-table-td:first-child) {
    border-radius: 12px 0 0 12px;
  }

  :deep(.n-data-table-td:last-child) {
    border-radius: 0 12px 12px 0;
  }

  /* 行进入动画：错落淡入上浮（与旧表格一致） */
  :deep(.n-data-table-tr) {
    animation: fadeInUp 0.5s ease-out forwards;
    animation-delay: var(--delay, 0s);
    opacity: 0;
  }

  :deep(.n-data-table-tr:hover .n-data-table-td) {
    background: rgba(var(--app-rgb), 0.06);
  }

  /* 离线行红渲 */
  :deep(.n-data-table-tr.offline-row .n-data-table-td) {
    background: rgba(255, 77, 79, 0.08);
  }

  :deep(.n-data-table-tr.offline-row:hover .n-data-table-td) {
    background: rgba(255, 77, 79, 0.13);
  }

  /* ===== 服务器名 ===== */
  :deep(.td-name) {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  :deep(.status-dot) {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 6px currentColor;

    &.online {
      background: #52c41a;
      color: #52c41a;
    }

    &.offline {
      background: #9ca3af;
      color: #9ca3af;
    }
  }

  :deep(.name-text) {
    font-size: 14px;
    font-weight: 700;
    color: rgba(var(--app-rgb), 0.95);
  }

  /* ===== 地图 ===== */
  :deep(.map-box) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  :deep(.map-name) {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: rgba(var(--app-rgb), 0.9);
  }

  :deep(.map-label) {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ===== 玩家数（圆点 + 精确人数） ===== */
  :deep(.player-dot-cell) {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
  }

  :deep(.player-dots) {
    display: flex;
    align-items: center;
    gap: 1.5px;
    flex-shrink: 0;
  }

  :deep(.player-dots .dot) {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(var(--app-rgb), 0.18);
    transition: transform 0.2s ease;
  }

  :deep(.player-dots .dot.on) {
    /* 点亮圆点的颜色与光晕由行内 style 注入（绿→红渐变） */
    animation: dotPop 0.3s ease-out;
  }

  :deep(.player-count-text) {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  :deep(.count-sep) {
    margin: 0 2px;
    opacity: 0.45;
    font-weight: 400;
  }

  /* ===== Ping ===== */
  :deep(.ping-tag) {
    font-weight: 600;
  }

  /* ===== 比分 ===== */
  :deep(.stat-chip) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(var(--app-rgb), 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :deep(.team) {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 4px currentColor;
    }
  }

  :deep(.team-ct) {
    color: #60a5fa;

    &::before {
      background: #60a5fa;
    }
  }

  :deep(.team-t) {
    color: #fbbf24;

    &::before {
      background: #fbbf24;
    }
  }

  :deep(.score-sep) {
    font-size: 12px;
    opacity: 0.6;
    font-weight: 600;
  }

  :deep(.empty-score) {
    font-size: 12px;
  }

  /* ===== 地图运行时长 ===== */
  :deep(.runtime-tag) {
    font-weight: 600;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* fixed 布局下列宽固定，时长文字过长时在标签内部省略 */
  :deep(.runtime-tag .n-tag__content) {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ===== 操作按钮 ===== */
  :deep(.action-cell) {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  :deep(.action-btn) {
    min-width: 40px;
    transition: all 0.2s ease;
    border-radius: 8px;

    &.join-btn {
      color: rgba(34, 197, 94, 0.85);
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.2);

      &:hover {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        border-color: rgba(34, 197, 94, 0.4);
      }
    }

    &.auto-btn {
      color: rgba(249, 115, 22, 0.85);
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.2);

      &:hover {
        background: rgba(249, 115, 22, 0.2);
        color: #f97316;
        border-color: rgba(249, 115, 22, 0.4);
      }
    }

    &.copy-btn {
      color: rgba(64, 158, 255, 0.85);
      background: rgba(64, 158, 255, 0.08);
      border: 1px solid rgba(64, 158, 255, 0.2);

      &:hover {
        background: rgba(64, 158, 255, 0.2);
        color: #4096ff;
        border-color: rgba(64, 158, 255, 0.4);
      }
    }

    /* 地图运行时间线按钮：紫色，与时间线弹窗主题一致 */
    &.flow-btn {
      color: rgba(167, 139, 250, 0.9);
      background: rgba(167, 139, 250, 0.08);
      border: 1px solid rgba(167, 139, 250, 0.2);

      &:hover {
        background: rgba(167, 139, 250, 0.2);
        color: #a78bfa;
        border-color: rgba(167, 139, 250, 0.4);
      }
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dotPop {
  0% {
    transform: scale(0.4);
  }

  60% {
    transform: scale(1.25);
  }

  100% {
    transform: scale(1);
  }
}
</style>
