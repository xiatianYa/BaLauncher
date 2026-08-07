<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/store/modules/game';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'ServerCurrentOnline'
});

const gameStore = useGameStore();

/** 在线服务器列表（WebSocket 全量推送，含 numPlayers 实时人数） */
const onlineServers = computed(() =>
  gameStore.currentServerWsList.filter(server => (server.numPlayers || 0) > 0)
);

/** 在线服务器总数 */
const onlineServerCount = computed(() => onlineServers.value.length);

/** 总在线人数 */
const totalPlayers = computed(() =>
  onlineServers.value.reduce((sum, server) => sum + (server.numPlayers || 0), 0)
);

/** 最大在线服务器（按人数排序取第一） */
const maxServer = computed(() =>
  [...onlineServers.value].sort((a, b) => (b.numPlayers || 0) - (a.numPlayers || 0))[0]
);

/** 空状态：当前没有任何在线服务器 */
const isEmpty = computed(() => onlineServers.value.length === 0);
</script>

<template>
  <div class="dash-card server-online-card">
    <!-- 卡片头部：标题 + 实时徽章 -->
    <div class="card-header">
      <div class="card-title">
        <SvgIcon icon="mdi:server-network" class="card-title-icon" />
        <span>{{ $t('home.serverCurrentOnline') }}</span>
      </div>
      <span class="live-badge">
        <span class="dot" />
        {{ $t('home.weatherRealtime') }}
      </span>
    </div>

    <!-- 空状态 -->
    <div v-if="isEmpty" class="empty-state">
      <div class="empty-icon-wrap">
        <SvgIcon icon="mdi:server-off" class="empty-icon" />
      </div>
      <p class="empty-title">{{ $t('home.noData') }}</p>
      <span class="empty-tip">{{ $t('home.serverCurrentOnlineTip') }}</span>
    </div>

    <!-- 数据统计 -->
    <div v-else class="online-body">
      <!-- 统计概览 -->
      <div class="stat-grid">
        <div class="stat-item">
          <SvgIcon icon="mdi:server" class="stat-icon" />
          <div class="stat-info">
            <span class="stat-label">{{ $t('home.serverOnlineCount') }}</span>
            <span class="stat-value">{{ onlineServerCount }}</span>
          </div>
        </div>
        <div class="stat-item">
          <SvgIcon icon="mdi:account-group" class="stat-icon" />
          <div class="stat-info">
            <span class="stat-label">{{ $t('home.playersOnline') }}</span>
            <span class="stat-value">{{ totalPlayers }}</span>
          </div>
        </div>
      </div>

      <!-- 最多人服务器 -->
      <div v-if="maxServer" class="max-server">
        <div class="max-server-label">
          <SvgIcon icon="mdi:trophy-outline" class="max-server-icon" />
          <span>{{ $t('home.mostPlayersServer') }}</span>
        </div>
        <div class="max-server-info">
          <div class="max-server-name" :title="maxServer.serverName">{{ maxServer.serverName }}</div>
          <div class="max-server-meta">
            <SvgIcon icon="mdi:map-marker" />
            <span>{{ maxServer.mapLabel || maxServer.mapName }}</span>
          </div>
        </div>
        <div class="max-server-count">
          {{ maxServer.numPlayers }}<span>/{{ maxServer.maxPlayers }}</span>
        </div>
      </div>

      <!-- 服务器列表 -->
      <div class="server-list">
        <div v-for="server in onlineServers" :key="server.serverId" class="server-item">
          <div class="server-item-left">
            <span class="server-name" :title="server.serverName">{{ server.serverName }}</span>
            <span class="server-map">{{ server.mapLabel || server.mapName }}</span>
          </div>
          <div class="server-players" :class="{ hot: (server.numPlayers || 0) >= (server.maxPlayers || 1) * 0.9 }">
            <span class="num">{{ server.numPlayers }}</span>
            <span class="max">/{{ server.maxPlayers }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 通用卡片（参照 botGroup group-card） */
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

    .live-badge {
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

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: rgba(var(--app-rgb), 0.4);

    .empty-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(var(--app-rgb), 0.08);

      .empty-icon {
        font-size: 28px;
        color: rgba(var(--app-rgb), 0.6);
      }
    }

    .empty-title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 500;
      color: rgba(var(--app-rgb), 0.7);
    }

    .empty-tip {
      font-size: 11.5px;
    }
  }

  .online-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 2px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background: rgba(var(--app-rgb), 0.12);
    }

    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(var(--app-rgb), 0.03);
        min-width: 0;

        .stat-icon {
          font-size: 18px;
          color: #667eea;
          flex-shrink: 0;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;

          .stat-label {
            font-size: 10px;
            color: rgba(var(--app-rgb), 0.4);
          }

          .stat-value {
            font-size: 16px;
            font-weight: 700;
            line-height: 1;
            color: var(--n-text-color);
            font-variant-numeric: tabular-nums;
          }
        }
      }
    }

    .max-server {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(var(--app-rgb), 0.04);
      border: 1px solid rgba(var(--app-rgb), 0.07);

      .max-server-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;

        .max-server-icon {
          font-size: 17px;
          color: #f0a020;
        }

        span {
          font-size: 9.5px;
          color: rgba(var(--app-rgb), 0.4);
        }
      }

      .max-server-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .max-server-name {
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(var(--app-rgb), 0.88);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .max-server-meta {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          color: rgba(var(--app-rgb), 0.5);

          svg {
            font-size: 12px;
            color: #667eea;
          }

          span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .max-server-count {
        font-size: 15px;
        font-weight: 700;
        color: #667eea;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;

        span {
          font-size: 11px;
          font-weight: 500;
          color: rgba(var(--app-rgb), 0.4);
        }
      }
    }

    .server-list {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .server-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 7px 10px;
        border-radius: 9px;
        background: rgba(var(--app-rgb), 0.03);
        border: 1px solid rgba(var(--app-rgb), 0.06);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(var(--app-rgb), 0.07);
          border-color: rgba(var(--app-rgb), 0.35);
        }

        .server-item-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;

          .server-name {
            font-size: 12.5px;
            font-weight: 600;
            color: rgba(var(--app-rgb), 0.88);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .server-map {
            font-size: 10.5px;
            color: rgba(var(--app-rgb), 0.4);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .server-players {
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;

          .num {
            font-size: 13px;
            font-weight: 700;
            color: #43e97b;
          }

          .max {
            font-size: 10.5px;
            color: rgba(var(--app-rgb), 0.4);
          }

          &.hot .num {
            color: #f0a020;
          }
        }
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
</style>
