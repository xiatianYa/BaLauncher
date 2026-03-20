<script setup lang="tsx">
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';
import { DataTableColumn, NButton, NTag, NTooltip } from 'naive-ui';
import { ref } from 'vue';

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
  (e: 'back'): void;
}>();

// 根据地图名称获取地图信息
const getMapByMapName = (mapName: string) => {
  return props.mapList.find(map => map.mapName === mapName);
};

// 获取 Ping 值对应的颜色类型
const getPingType = (ping?: number) => {
  if (ping === undefined || ping === null) return 'error';
  if (ping < 70) return 'success';
  if (ping < 100) return 'warning';
  return 'error';
};

// 根据在线人数获取颜色
const getPlayerColor = (players: number) => {
  if (players <= 20) return '#00f91a';
  if (players <= 40) return '#5470ee';
  if (players <= 60) return '#ffa325';
  if (players <= 80) return '#ff4f00';
  return '#ff0000';
};

// 获取源服务器信息
const getSourceServerInfo = (server: Api.Game.InfoResponse): Api.Game.Server | undefined => {
  return props.sourceServerList.find(s => s.connectStr === server.addr);
};

// 判断服务器是否离线
const isServerOffline = (server: Api.Game.InfoResponse) => {
  return !server.isOnline;
};

// 行样式类名
const getRowProps = (row: Api.Game.InfoResponse) => {
  return {
    class: {
      'offline-row': isServerOffline(row) ? 'offline-row' : ''
    }
  };
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
    render: (row) => getMapByMapName(row.map)?.mapLabel || row.map,
  },
  {
    title: $t('server.playerCountColumn'),
    key: 'players',
    sorter: (row1, row2) => row1.players - row2.players,
    render: (row) => (
      <div class="flex items-center gap-6px">
        <div class="w-60px h-6px bg-gray-200 rounded-3px overflow-hidden">
          <div
            class="h-full rounded-3px transition-all duration-300"
            style={{
              width: `${(row.players / row.maxPlayers) * 100}%`,
              backgroundColor: getPlayerColor(row.players)
            }}
          />
        </div>
        <span class="text-12px whitespace-nowrap">{row.players || 0}/{row.maxPlayers || 0}</span>
      </div>
    )
  },
  {
    title: $t('server.ping'),
    key: 'ping',
    render: (row) => (
      <div class="flex items-center">
        <NTag size="small" class="mr-3px rounded-5px" type={getPingType(row.ping)}>
          {row.ping ? `${row.ping}ms` : '??'}
        </NTag>
      </div>
    )
  },
  {
    title: $t('server.score'),
    key: 'score',
    width: 100,
    render: (row) => (
      <div class="flex items-center">
        <NTag size="small" class="mr-3px rounded-5px" type="info">
          {row.mapPhase ? `CT ${row.CTScore || 0} : ${row.TScore || 0} T` : '-'}
        </NTag>
      </div>
    )
  },
  {
    title: $t('server.operate'),
    key: 'operate',
    align: 'center',
    render: (row) => (
      <div class="flex items-center flex-center gap-8px">
        <NTooltip trigger="hover" placement="bottom">
          {{
            trigger: () => (
              <NButton class="mr-5px" type="primary" ghost size="small" onClick={() => emit('join', row)}>
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
              <NButton type="warning" ghost size="small" onClick={() => emit('autoJoin', row)}>
                {{
                  icon: () => <SvgIcon icon="iconamoon:player-next-bold" />
                }}
              </NButton>
            ),
            default: () => $t('server.autoJoin')
          }}
        </NTooltip>
      </div>
    )
  }
]);
</script>

<template>
  <div class="h-full overflow-auto p-5px">
    <NDataTable :columns="columns" :data="servers" :pagination="false" size="small" striped :row-props="getRowProps"
      class="w-full" v-show="servers.length > 0" />
  </div>
</template>

<style scoped lang="scss">
:deep(.offline-row) {
  td {
    background-color: rgba(255, 0, 0, 0.1) !important;
  }
}
</style>
