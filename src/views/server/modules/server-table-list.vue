<script setup lang="tsx">
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';
import { DataTableColumn, NButton, NTooltip } from 'naive-ui';
import { ref, computed } from 'vue';
import { useGameStore } from '@/store/modules/game';
import { useThemeStore } from '@/store/modules/theme';

const gameStore = useGameStore();
const themeStore = useThemeStore();

const isDarkMode = computed(() => themeStore.darkMode);

const getSecondaryTextColor = () => {
  return isDarkMode.value ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
};

const getProgressBarBgColor = () => {
  return isDarkMode.value ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
};

const getOfflineRowBgColor = () => {
  return isDarkMode.value ? 'rgba(255, 77, 79, 0.08)' : 'rgba(255, 77, 79, 0.12)';
};

const props = defineProps<{
  servers: Api.Game.InfoResponse[];
  mapList: Api.Game.Map[];
  sourceServerList: Api.Game.Server[];
  refreshingAddrs: string[];
}>();

const emit = defineEmits<{
  (e: 'join', server: Api.Game.InfoResponse): void;
  (e: 'copy', server: Api.Game.InfoResponse): void;
  (e: 'autoJoin', server: Api.Game.InfoResponse): void;
  (e: 'refresh', server: Api.Game.InfoResponse): void;
  (e: 'delete', server: Api.Game.InfoResponse): void;
  (e: 'back'): void;
}>();

// 根据地图名称获取地图信息
const getMapByMapName = (mapName: string) => {
  return props.mapList.find(map => map.mapName === mapName);
};

// 获取 Ping 值对应的颜色
const getPingColor = (ping?: number) => {
  if (ping === undefined || ping === null) return '#ff4d4f';
  if (ping < 70) return '#52c41a';
  if (ping < 100) return '#faad14';
  return '#ff4d4f';
};

// 根据在线人数获取颜色
const getPlayerColor = (players: number) => {
  if (players <= 20) return '#52c41a';
  if (players <= 40) return '#4096ff';
  if (players <= 60) return '#faad14';
  if (players <= 80) return '#ff7a45';
  return '#ff4d4f';
};

// 获取源服务器信息
const getSourceServerInfo = (server: Api.Game.InfoResponse): Api.Game.Server | undefined => {
  return props.sourceServerList.find(s => {
    if (s.connectStr === server.addr) return true;
    if (s.ip && s.port) {
      const serverAddr = `${s.ip}:${s.port}`;
      if (serverAddr === server.addr) return true;
    }
    return false;
  });
};

// 判断服务器是否离线
const isServerOffline = (server: Api.Game.InfoResponse) => {
  return !server.isOnline;
};

// 行样式
const getRowProps = (row: Api.Game.InfoResponse) => {
  return {
    class: {
      'offline-row': isServerOffline(row)
    },
    style: isServerOffline(row) ? { backgroundColor: getOfflineRowBgColor() } : {}
  };
};

// 删除服务器
const handleDelete = (server: Api.Game.InfoResponse) => {
  gameStore.removeCustomServer(server.addr, gameStore.selectedCommunityId || 0);
  emit('delete', server);
};

const columns = ref<DataTableColumn<Api.Game.InfoResponse>[]>([
  {
    title: $t('server.serverName'),
    key: 'name',
    render: (row) => row.name ? row.name : getSourceServerInfo(row)?.serverName + $t('server.offlineSuffix'),
  },
  {
    title: $t('server.map'),
    key: 'map',
    render: (row) => <span style={{ color: getSecondaryTextColor() }}>{getMapByMapName(row.map)?.mapLabel || row.map}</span>,
  },
  {
    title: $t('server.playerCountColumn'),
    key: 'players',
    sorter: (row1, row2) => {
      const p1 = row1.players ?? -1;
      const p2 = row2.players ?? -1;
      return p1 - p2;
    },
    render: (row) => (
      <div class="flex items-center gap-6px">
        <div class="w-60px h-6px rounded-3px overflow-hidden" style={{ backgroundColor: getProgressBarBgColor() }}>
          <div
            class="h-full rounded-3px transition-all duration-300"
            style={{
              width: `${(row.players / row.maxPlayers) * 100}%`,
              backgroundColor: getPlayerColor(row.players)
            }}
          />
        </div>
        <span class="text-12px whitespace-nowrap" style={{ color: getSecondaryTextColor() }}>{row.players || 0}/{row.maxPlayers || 0}</span>
      </div>
    )
  },
  {
    title: $t('server.ping'),
    key: 'ping',
    render: (row) => (
      <div class="text-12px font-bold">
        <span style={{ color: getPingColor(row.ping) }}>{row.ping ? `${row.ping}ms` : '??'}</span>
      </div>
    )
  },
  {
    title: $t('server.score'),
    key: 'score',
    width: 100,
    render: (row) => (
      <div class="flex items-center">
        {row.mapPhase ? (
          <>
            <span class="text-12px font-bold" style={{ color: '#4096ff' }}>CT</span>
            <span class="text-12px ml-4px mr-4px" style={{ color: '#4096ff' }}>{row.CTScore || 0}</span>
            <span class="text-12px font-bold" style={{ color: getSecondaryTextColor() }}>:</span>
            <span class="text-12px ml-4px mr-4px" style={{ color: '#faad14' }}>{row.TScore || 0}</span>
            <span class="text-12px font-bold" style={{ color: '#faad14' }}>T</span>
          </>
        ) : (
          <span class="text-12px" style={{ color: getSecondaryTextColor() }}>-</span>
        )}
      </div>
    )
  },
  {
    title: $t('server.operate'),
    key: 'operate',
    align: 'center',
    render: (row) => {
      const isCustom = gameStore.isCustomCategory(gameStore?.selectedCommunityId || 0);
      return (
        <div class="flex items-center flex-center gap-6px">
          <NTooltip trigger="hover" placement="bottom">
            {{
              trigger: () => (
                <NButton size="small" onClick={() => emit('join', row)}>
                  {{
                    icon: () => <SvgIcon icon="iconamoon:player-play-bold" />
                  }}
                </NButton>
              ),
              default: () => $t('server.joinServer')
            }}
          </NTooltip>
          <NTooltip trigger="hover" placement="bottom">
            {{
              trigger: () => (
                <NButton size="small" onClick={() => emit('autoJoin', row)}>
                  {{
                    icon: () => <SvgIcon icon="iconamoon:player-next-bold" />
                  }}
                </NButton>
              ),
              default: () => $t('server.autoJoin')
            }}
          </NTooltip>
          {isCustom && (
            <NTooltip trigger="hover" placement="bottom">
              {{
                trigger: () => (
                  <NButton size="small" onClick={() => handleDelete(row)}>
                    {{
                      icon: () => <SvgIcon icon="mdi:delete-outline" />
                    }}
                  </NButton>
                ),
                default: () => $t('server.deleteServer')
              }}
            </NTooltip>
          )}
        </div>
      );
    }
  }
]);
</script>

<template>
  <div class="h-full overflow-auto p-5px">
    <NDataTable :columns="columns" :data="servers" :pagination="false" size="medium" :row-props="getRowProps"
      class="w-full server-table" v-show="servers.length > 0" />
  </div>
</template>

<style scoped lang="scss">
:deep(.server-table) {
  .n-data-table-tr {
    .n-data-table-td {
      padding-top: 12px;
      padding-bottom: 12px;
    }
  }
}
</style>
