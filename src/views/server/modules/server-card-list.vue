<script setup lang="ts">
import { NGrid, NGridItem, NTag } from 'naive-ui';
import { useDict } from '@/hooks/business/dict';
import dayjs from 'dayjs';

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
}>();

const { dictOptions } = useDict();

// 计算目标时间到当前时间的分钟差
const calculatePastMinutes = (targetTime: string) => {
  const target = dayjs(targetTime);
  const now = dayjs();
  const minutesDiff = now.diff(target, 'minute');
  return Math.max(minutesDiff, 0);
};

// 获取 Ping 值对应的颜色类型
const getPingType = (ping?: number) => {
  if (ping === undefined || ping === null) return 'info';
  if (ping < 70) return 'success';
  if (ping < 100) return 'warning';
  return 'error';
};

// 格式化游戏时间计算进度颜色
const getOnLineColor = (server: Api.Game.SeverVo) => {
  if (!server) return '';
  if (server.numPlayers <= 20) {
    return `background-color: #00f91a;width: ${(server.numPlayers / server.maxPlayers) * 100}%;`;
  } else if (server.numPlayers <= 40) {
    return `background-color: #5470ee;width: ${(server.numPlayers / server.maxPlayers) * 100}%;`;
  } else if (server.numPlayers <= 60) {
    return `background-color: #ffa325;width: ${(server.numPlayers / server.maxPlayers) * 100}%;`;
  } else if (server.numPlayers <= 80) {
    return `background-color: #ff4f00;width: ${(server.numPlayers / server.maxPlayers) * 100}%;`;
  }
  return `background-color: #ff0000;width: ${(server.numPlayers / server.maxPlayers) * 100}%;`;
};

const getPlayersChipBg = (server: Api.Game.SeverVo): string | undefined => {
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
    'freezetime': '暂停回合',
    'unknown': '未知'
  };
  return phaseMap[phase] || phase;
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

const handleJoin = (server: Api.Game.SeverVo) => {
  emit('join', server);
};

const handleCopy = (server: Api.Game.SeverVo) => {
  emit('copy', server);
};

const handleAutoJoin = (server: Api.Game.SeverVo) => {
  emit('autoJoin', server);
};

const handleRefresh = (server: Api.Game.SeverVo) => {
  emit('refresh', server);
};

</script>

<template>
  <div class="h-full overflow-auto p-5px relative">
    <NGrid :x-gap="12" :y-gap="12" :cols="2">
      <NGridItem v-for="(server, index) in servers" :key="index">
        <div class="sercer-card overflow-hidden flex flex-col"
          v-if="server.isOnline && getSourceServerInfo(server)?.serverName">
          <img v-if="server.mapUrl" class="server-card-bg" v-lazy="server.mapUrl" />
          <div class="z-9 server-online" :style="`${getOnLineColor(server)}`"></div>
          <div class="server-card-mask"></div>
          <div
            class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold whitespace-nowrap text-ellipsis overflow-hidden">
            {{ server.serverName }}
          </div>
          <div class="flex justify-between">
            <NEllipsis
              class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold w-220px"
              :max-line="1">
              {{ server.mapName }}
            </NEllipsis>
            <div class="player-badge mr-5px" :style="{ '--player-color': getPlayersChipBg(server) }">
              <SvgIcon icon="mdi:account-group" class="player-icon" />
              <span class="player-num">{{ server.numPlayers }}<span class="player-sep">/</span>{{ server.maxPlayers }}</span>
            </div>
          </div>
          <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
            <SvgIcon icon="tdesign:translate" class="mr-5px font-size-18px" />
            <NEllipsis class="flex items-center justify-center flex-1">
              {{ server.mapLabel ? server.mapLabel :
                $t('server.noTranslation') }}
            </NEllipsis>
            <div class="stat-chip chip-score mr-5px w-160px flex items-center justify-center" v-show="server.mapPhase">
              <span class="team team-ct">{{ server.CTScore || '0' }}</span>
              <span class="score-phase">{{ getMapPhaseText(server.mapPhase || '') }}</span>
              <span class="team team-t">{{ server.TScore || '0' }}</span>
            </div>
          </div>
          <div class="flex-y-center ml-5px mt-6px position-relative font-bold">
            <NTag size="small" round class="mr-3px" ghost
              :type="dictOptions('game_type').find((item: any) => item.value === server.type)?.type || 'primary'"
              v-show="server.type">
              {{dictOptions('game_type').find((item: any) => item.value === server.type)?.label}}
            </NTag>
            <NTag v-for="(tag, idx) in server.tag" :key="idx" size="small" round class="mr-3px" type="success"
              v-show="server.tag.length > 0">
              {{dictOptions('game_tag').find((item: any) => item.value === tag)?.label}}
            </NTag>
            <NTag size="small" round class="mr-3px" ghost :type="getPingType(server.ping)">
              {{ server.ping ? `${server.ping}ms` : '???' }}
            </NTag>
            <NTag v-if="server.dateTimeOriginal" size="small" round class="mr-3px" ghost type="info">
              {{ calculatePastMinutes(server.dateTimeOriginal) }}分钟
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
            <div class="three-btn h-30px" @click="handleRefresh(server)">
              <div :class="{ 'refresh-icon-spinning': refreshingAddrs.includes(server.connectStr) }">
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
  border-radius: 12px;
  background-color: #a5aaa3;
  font-family: 'SimHei';
  overflow: hidden;
  transition: box-shadow 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
  cursor: pointer;

  .server-card-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    transition: filter 0.3s ease;
    filter: brightness(0.9);
  }

  .server-online {
    height: 3px;
    width: 100%;
    position: absolute;
    z-index: 10;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    transition: filter 0.3s ease, height 0.3s ease;
  }

  .server-offline {
    height: 3px;
    width: 100%;
    position: absolute;
    background: linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%);
    z-index: 10;
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

  /* 遮罩层样式 - 底部加深渐变更有层次 */
  .server-card-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.15) 0%,
      rgba(0, 0, 0, 0.35) 50%,
      rgba(0, 0, 0, 0.6) 100%
    );
    z-index: 1;
    transition: opacity 0.25s ease;
  }

  .server-card-button {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: end;
    position: sticky;
    width: 100%;
    color: #ffffff;
    z-index: 2;

    /* 改为列方向布局 */
    .one-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 3;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      cursor: pointer;
      color: rgba(34, 197, 94, 0.85);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(34, 197, 94, 0.25);
        color: #22c55e;
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .two-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-grow: 2;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      cursor: pointer;
      color: rgba(59, 130, 246, 0.85);
      transition: all 0.2s ease;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      border-right: 1px solid rgba(255, 255, 255, 0.08);

      &:hover {
        background: rgba(59, 130, 246, 0.25);
        color: #3b82f6;
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .three-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 3;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      cursor: pointer;
      color: rgba(249, 115, 22, 0.85);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(249, 115, 22, 0.25);
        color: #f97316;
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .four-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 2;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      color: rgba(239, 68, 68, 0.7);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:hover .server-card-bg {
    filter: brightness(1);
  }

  &:hover .server-online {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  }

  &:hover .server-card-mask {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.08) 0%,
      rgba(0, 0, 0, 0.25) 50%,
      rgba(0, 0, 0, 0.5) 100%
    );
  }
}

.player-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.55);
    border-color: rgba(255, 255, 255, 0.18);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}

.player-icon {
  font-size: 13px;
  color: var(--player-color, #22c55e);
  opacity: 0.9;
}

.player-num {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.2px;
}

.player-sep {
  margin: 0 2px;
  opacity: 0.45;
  font-weight: 400;
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
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  gap: 8px;
}

.team {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.team-ct {
  color: #60a5fa;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #60a5fa;
    display: inline-block;
    box-shadow: 0 0 4px rgba(96, 165, 250, 0.6);
  }
}

.team-t {
  color: #fbbf24;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fbbf24;
    display: inline-block;
    box-shadow: 0 0 4px rgba(251, 191, 36, 0.6);
  }
}

.score-phase {
  font-size: 10px;
  opacity: 0.6;
  font-weight: 500;
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}
</style>
