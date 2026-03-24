<script setup lang="ts">
import { NGrid, NGridItem, NTag, NEllipsis } from 'naive-ui';
import { useDict } from '@/hooks/business/dict';


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
}>();

const { dictOptions } = useDict();


// 根据地图名称获取地图信息
const getMapByMapName = (mapName: string) => {
  return props.mapList.find(map => map.mapName === mapName);
};

// 获取 Ping 值对应的颜色类型
const getPingType = (ping?: number) => {
  if (ping === undefined || ping === null) return 'info';
  if (ping < 70) return 'success';
  if (ping < 100) return 'warning';
  return 'error';
};

// 格式化游戏时间计算进度颜色
const getOnLineColor = (server: Api.Game.InfoResponse) => {
  if (!server) return '';
  if (server.players <= 20) {
    return `background-color: #00f91a;width: ${(server.players / server.maxPlayers) * 100}%;`;
  } else if (server.players <= 40) {
    return `background-color: #5470ee;width: ${(server.players / server.maxPlayers) * 100}%;`;
  } else if (server.players <= 60) {
    return `background-color: #ffa325;width: ${(server.players / server.maxPlayers) * 100}%;`;
  } else if (server.players <= 80) {
    return `background-color: #ff4f00;width: ${(server.players / server.maxPlayers) * 100}%;`;
  }
  return `background-color: #ff0000;width: ${(server.players / server.maxPlayers) * 100}%;`;
};

const getPlayersChipBg = (server: Api.Game.InfoResponse): string | undefined => {
  const match = getOnLineColor(server).match(/background-color:\s*([^;]+);/);
  return match?.[1];
};

// 服务器状态中文映射
const getMapPhaseText = (phase: string) => {
  const phaseMap: Record<string, string> = {
    'warmup': '热身',
    'intermission': '中场休息',
    'gameover': '游戏结束',
    'live': '对局中',
    'over': '已结束',
    'unknown': '未知'
  };
  return phaseMap[phase] || phase;
};

// 获取源服务器信息
const getSourceServerInfo = (server: Api.Game.InfoResponse): Api.Game.Server | undefined => {
  return props.sourceServerList.find(s => s.connectStr === server.addr);
};

// 查询服务器地图类型
const queryServerMapType = (mapName: string) => {
  return getMapByMapName(mapName)?.type;
};

// 查询服务器地图标签
const queryServerMapTag = (mapName: string) => {
  return getMapByMapName(mapName)?.tag;
};

const handleJoin = (server: Api.Game.InfoResponse) => {
  emit('join', server);
};

const handleCopy = (server: Api.Game.InfoResponse) => {
  emit('copy', server);
};

const handleAutoJoin = (server: Api.Game.InfoResponse) => {
  emit('autoJoin', server);
};

const handleRefresh = (server: Api.Game.InfoResponse) => {
  emit('refresh', server);
};
</script>

<template>
  <div class="h-full overflow-auto p-5px relative">
    <NGrid :x-gap="12" :y-gap="12" :cols="2">
      <NGridItem v-for="(server, index) in servers" :key="index">
        <div class="sercer-card overflow-hidden flex flex-col"
          v-if="server.isOnline && getSourceServerInfo(server)?.serverName">
          <img v-if="getMapByMapName(server.map)" class="server-card-bg" v-lazy="getMapByMapName(server.map)?.mapUrl" />
          <div class="z-9 server-online" :style="`${getOnLineColor(server)}`"></div>
          <div class="server-card-mask"></div>
          <div
            class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold whitespace-nowrap text-ellipsis overflow-hidden">
            {{ server.name }}
          </div>
          <div class="flex justify-between">
            <NEllipsis
              class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold w-220px"
              :max-line="1">
              {{ server.map }}
            </NEllipsis>
            <div class="stat-chip chip-players mr-5px" :style="{ '--chip-players-bg': getPlayersChipBg(server) }">
              <SvgIcon icon="mdi:account-group" class="chip-icon" />
              <span class="chip-text">{{ `${server.players}/${server.maxPlayers}` }}</span>
            </div>
          </div>
          <div
            class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
            <SvgIcon icon="tdesign:translate" class="mr-5px font-size-18px" />
            <NEllipsis class="flex items-center justify-center flex-1">
              {{ getMapByMapName(server.map)?.mapLabel ? getMapByMapName(server.map)?.mapLabel :
                $t('server.noTranslation') }}
            </NEllipsis>
            <div class="stat-chip chip-score mr-5px w-145px flex items-center justify-center" v-show="server.mapPhase">
              <span class="team team-ct">CT {{ server.CTScore || '0' }}</span>
              <span>{{ getMapPhaseText(server.mapPhase || '') }}</span>
              <span class="team team-t">T {{ server.TScore || '0' }}</span>
            </div>
          </div>
          <div class="flex-y-center ml-5px mt-6px position-relative font-bold">
            <NTag size="small" round class="mr-3px" ghost
              :type="dictOptions('game_type').find((item: any) => item.value === queryServerMapType(server.map))?.type"
              v-show="queryServerMapType(server.map)">
              {{dictOptions('game_type').find((item: any) => item.value === queryServerMapType(server.map))?.label}}
            </NTag>
            <NTag v-for="(tag, idx) in queryServerMapTag(server.map)" :key="idx" size="small" round class="mr-3px"
              type="success" v-show="queryServerMapType(server.map)">
              {{dictOptions('game_tag').find((item: any) => item.value === tag)?.label}}
            </NTag>
            <NTag size="small" round class="mr-3px" ghost :type="getPingType(server.ping)">
              {{ server.ping ? `${server.ping}ms` : '???' }}
            </NTag>
          </div>
          <div class="server-card-button mt-6px">
            <div class="one-btn h-30px" @click="handleJoin(server)">
              <SvgIcon icon="iconamoon:enter" class="text-22px" />
            </div>
            <div class="two-btn h-30px" @click="handleCopy(server)">
              <SvgIcon icon="solar:copy-outline" class="text-22px" />
            </div>
            <div class="three-btn h-30px" @click="handleAutoJoin(server)">
              <SvgIcon icon="material-symbols:alarm-smart-wake-outline" class="text-22px" />
            </div>
          </div>
        </div>
        <div v-else class="sercer-card overflow-hidden flex flex-col">
          <div class="server-offline-bg"></div>
          <div class="z-9 server-offline"></div>
          <div class="server-card-mask"></div>
          <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
            <SvgIcon icon="material-symbols:cloud-off" class="mr-5px font-size-18px text-yellow-400" />
            {{ getSourceServerInfo(server)?.serverName }}
          </div>
          <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
            <SvgIcon icon="mdi:server-off" class="mr-5px font-size-16px text-gray-400" />
            {{ $t('server.offline') }}
          </div>
          <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#a0a0a0 font-bold">
            {{ $t('server.waiting') }}
          </div>
          <div class="server-card-button mt-6px">
            <div class="two-btn h-30px" @click="handleCopy(server)">
              <SvgIcon icon="solar:copy-outline" class="text-22px" />
            </div>
            <div class="three-btn h-30px" @click="handleRefresh(server)">
              <div :class="{ 'refresh-icon-spinning': refreshingAddrs.includes(server.addr) }">
                <SvgIcon icon="material-symbols:refresh" class="text-22px" />
              </div>
            </div>
          </div>
        </div>
      </NGridItem>
    </NGrid>
  </div>
</template>

<style scoped lang="scss">
.sercer-card {
  position: relative;
  width: 100%;
  height: 155px;
  border-radius: 10px;
  background-color: #a5aaa3;
  font-family: 'SimHei';
  transition: all 0.2s ease;

  .server-card-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  .server-online {
    height: 5px;
    width: 100%;
    position: absolute;
  }

  .server-offline {
    height: 5px;
    width: 100%;
    position: absolute;
    background: linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%);
  }

  .server-offline-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%);
    z-index: 0;
  }

  .refresh-icon-spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  /* 遮罩层样式 */
  .server-card-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 1;
    transition: opacity 0.2s ease;
  }

  .server-card-button {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: end;
    position: sticky;
    width: 100%;
    color: #ffffff;

    /* 改为列方向布局 */
    .one-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 3;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(34, 197, 94, 0.7);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }

    .two-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-grow: 2;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(59, 130, 246, 0.7);

      &:hover {
        background-color: rgba(150, 150, 150, 0.5);
      }
    }

    .three-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 3;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(249, 115, 22, 0.7);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &:hover {
    box-shadow: 0 1px 2px -2px rgba(0, 0, 0, .08), 0 3px 6px 0 rgba(0, 0, 0, .06), 0 5px 12px 4px rgba(0, 0, 0, .04);
  }

  &:hover .server-card-mask {
    opacity: 0.5;
  }
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(6px);
}

.chip-icon {
  font-size: 16px;
  opacity: 0.9;
}

.chip-text {
  line-height: 1;
}

.chip-players {
  background: var(--chip-players-bg, linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%));
}

.chip-score {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #ef4444 100%);
}

.team {
  display: flex;
  align-items: center;
  gap: 4px;
}

.team-ct::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #60a5fa;
  display: inline-block;
}

.team-t::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  display: inline-block;
}
</style>
