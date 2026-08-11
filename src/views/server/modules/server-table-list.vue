<script setup lang="ts">
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';
import { NButton, NEllipsis, NTag, NTooltip } from 'naive-ui';
import { computed, ref } from 'vue';
import { useDict } from '@/hooks/business/dict';

// 排序状态：none 默认 / asc 正序 / desc 倒序
type SortOrder = 'none' | 'asc' | 'desc';
type SortField = 'players' | 'ping' | null;

const { dictType, dictLabel } = useDict();

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

// 服务器比赛阶段文案（来自字典 game_map_phase，与卡片视图一致）
const getMapPhaseText = (phase: string) => dictLabel('game_map_phase', phase) || phase;

// 根据在线人数获取颜色
const getPlayerColor = (players: number) => {
  if (players <= 20) return '#52c41a';
  if (players <= 40) return '#4096ff';
  if (players <= 60) return '#faad14';
  if (players <= 80) return '#ff7a45';
  return '#ff4d4f';
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
</script>

<template>
  <div class="h-full custom-table-wrapper">
    <div class="custom-table" v-show="servers.length > 0">
      <!-- 表头 -->
      <div class="custom-thead">
        <div class="th th-name">{{ $t('server.serverName') }}</div>
        <div class="th th-map">{{ $t('server.map') }}</div>
        <div class="th th-players sortable" @click="toggleSort('players')">
          <span>{{ $t('server.playerCountColumn') }}</span>
          <span class="sort-icon">
            <SvgIcon v-if="getSortOrder('players') === 'asc'" icon="iconamoon:arrow-up-2-bold" />
            <SvgIcon v-else-if="getSortOrder('players') === 'desc'" icon="iconamoon:arrow-down-2-bold" />
            <SvgIcon v-else icon="ph:caret-up-down-bold" />
          </span>
        </div>
        <div class="th th-ping sortable" @click="toggleSort('ping')">
          <span>{{ $t('server.ping') }}</span>
          <span class="sort-icon">
            <SvgIcon v-if="getSortOrder('ping') === 'asc'" icon="iconamoon:arrow-up-2-bold" />
            <SvgIcon v-else-if="getSortOrder('ping') === 'desc'" icon="iconamoon:arrow-down-2-bold" />
            <SvgIcon v-else icon="ph:caret-up-down-bold" />
          </span>
        </div>
        <div class="th th-score">{{ $t('server.score') }}</div>
        <div class="th th-action">{{ $t('server.operate') }}</div>
      </div>

      <!-- 表体 -->
      <div class="custom-tbody">
        <div v-for="(server, index) in sortedServers" :key="index" class="custom-row"
          :class="{ 'offline-row': isServerOffline(server) }"
          :style="{ '--delay': `${Math.min(index * 0.05, 0.4)}s` }">
          <!-- 服务器名 -->
          <div class="td td-name">
            <div class="flex items-center gap-8px">
              <span class="status-dot" :class="isServerOffline(server) ? 'offline' : 'online'" />
              <!-- 超出省略，鼠标移入展示完整名称 -->
              <NEllipsis class="name-text" :max-line="1" :tooltip="{ placement: 'top' }" style="max-width: 200px;">
                {{ getServerName(server) }}
              </NEllipsis>
            </div>
          </div>
          <!-- 地图 -->
          <div class="td td-map">
            <div class="map-box">
              <NTooltip trigger="hover" placement="top" :disabled="!server.mapName">
                <template #trigger>
                  <span class="map-name">{{ server.mapName }}</span>
                </template>
                {{ server.mapName }}
              </NTooltip>
              <NTooltip v-if="server.mapLabel" trigger="hover" placement="top">
                <template #trigger>
                  <span class="map-label" :style="{ color: 'rgba(var(--app-rgb), 0.6)' }">
                    {{ server.mapLabel }}
                  </span>
                </template>
                {{ server.mapLabel }}
              </NTooltip>
            </div>
          </div>

          <!-- 玩家数 -->
          <div class="td td-players">
            <div class="player-count-cell">
              <div class="progress-track" :style="{ backgroundColor: 'rgba(var(--app-rgb), 0.15)' }">
                <div class="progress-fill" :style="{
                  width: `${getPlayerPercent(server)}%`,
                  backgroundColor: getPlayerColor(server.numPlayers),
                  boxShadow: `0 0 8px ${getPlayerColor(server.numPlayers)}`
                }" />
              </div>
              <span class="player-count-text" :style="{ color: 'rgba(var(--app-rgb), 0.6)' }">
                {{ server.numPlayers || 0 }}<span class="count-sep">/</span>{{ server.maxPlayers || 0 }}
              </span>
            </div>
          </div>

          <!-- Ping -->
          <div class="td td-ping">
            <NTag size="small" round class="ping-tag" :type="getPingType(server.ping)">
              {{ server.ping ? `${server.ping}ms` : '??' }}
            </NTag>
          </div>

          <!-- 比分 -->
          <div class="td td-score">
            <div v-if="server.mapPhase" class="stat-chip">
              <span class="team team-ct">{{ server.CTScore || 0 }}</span>
              <span class="score-phase">{{ getMapPhaseText(server.mapPhase || '') }}</span>
              <span class="team team-t">{{ server.TScore || 0 }}</span>
            </div>
            <span v-else class="empty-score" :style="{ color: 'rgba(var(--app-rgb), 0.6)' }">-</span>
          </div>

          <!-- 操作 -->
          <div class="td td-action">
            <div class="action-cell">
              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <NButton size="small" class="action-btn join-btn" @click="emit('join', server)">
                    <template #icon>
                      <SvgIcon icon="iconamoon:player-play-bold" />
                    </template>
                  </NButton>
                </template>
                {{ $t('server.joinServer') }}
              </NTooltip>
              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <NButton size="small" class="action-btn auto-btn" @click="emit('autoJoin', server)">
                    <template #icon>
                      <SvgIcon icon="iconamoon:player-next-bold" />
                    </template>
                  </NButton>
                </template>
                {{ $t('server.autoJoin') }}
              </NTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
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

.custom-thead {
  display: grid;
  // 固定列宽，避免容器变小时列被压缩导致内容截断
  grid-template-columns: 2fr 1.5fr 1.2fr 80px 100px 100px;
  gap: 16px;
  padding: 0 16px 8px;
  // 分隔线颜色随主题变化（--app-rgb 深色为白、浅色为暖黑）
  border-bottom: 1px solid rgba(var(--app-rgb), 0.08);

  .th {
    font-size: 13px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &.sortable {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
      transition: color 0.2s ease;

      &:hover {
        // 排序表头悬停高亮颜色随主题变化
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
  }
}

.custom-tbody {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.custom-row {
  position: relative;
  display: grid;
  // 与表头保持一致的固定列宽比例
  grid-template-columns: 2fr 1.5fr 1.2fr 80px 100px 100px;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  // 行背景色随主题变化，浅色主题下不再是一块淡白
  background: rgba(var(--app-rgb), 0.03);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.25s ease;
  overflow: hidden;
  // 进入动画：错落淡入上浮（与更新日志卡片一致）
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.06);
  }

  &.offline-row {
    background: rgba(255, 77, 79, 0.08);
    box-shadow: 0 1px 3px rgba(255, 77, 79, 0.08), 0 1px 2px rgba(255, 77, 79, 0.05);

    &:hover {
      box-shadow: 0 8px 24px rgba(255, 77, 79, 0.14), 0 3px 8px rgba(255, 77, 79, 0.08);
    }
  }

  .td {
    min-width: 0;
    display: flex;
    align-items: center;
  }
}

// 服务器名
.td-name {
  .status-dot {
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

  .name-text {
    font-size: 14px;
    font-weight: 700;
    // 服务器名颜色随主题变化
    color: rgba(var(--app-rgb), 0.95);
  }
}

// 地图
.td-map {
  .map-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .map-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    // 地图名颜色随主题变化
    color: rgba(var(--app-rgb), 0.9);
  }

  .map-label {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 玩家数
.td-players {
  .player-count-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .progress-track {
    flex: 1;
    height: 7px;
    border-radius: 3.5px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .progress-fill {
    height: 100%;
    border-radius: 3.5px;
    transition: width 0.3s ease;
  }

  .player-count-text {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .count-sep {
    margin: 0 2px;
    opacity: 0.45;
    font-weight: 400;
  }
}

// Ping
.td-ping {
  :deep(.ping-tag) {
    font-weight: 600;
  }
}

// 比分
.td-score {
  .stat-chip {
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

  .team {
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

  .team-ct {
    color: #60a5fa;

    &::before {
      background: #60a5fa;
    }
  }

  .team-t {
    color: #fbbf24;

    &::before {
      background: #fbbf24;
    }
  }

  .score-phase {
    font-size: 10px;
    opacity: 0.7;
    font-weight: 500;
    padding: 1px 6px;
    background: rgba(var(--app-rgb), 0.08);
    border-radius: 4px;
    text-transform: capitalize;
  }

  .empty-score {
    font-size: 12px;
  }
}

// 操作按钮
.td-action {
  .action-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .action-btn {
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
</style>