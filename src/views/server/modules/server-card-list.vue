<script setup lang="ts">
import { NTag, NEllipsis } from 'naive-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';
import dayjs from 'dayjs';

// 虚拟滚动配置
const ITEMS_PER_ROW = 2; // 每行 2 张卡片
const CARD_HEIGHT = 155; // 卡片高度（px）
const ROW_GAP = 12; // 行间距（px）
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP; // 每行卡片占用高度
const HEADER_HEIGHT = 32; // 分区标题高度（px）
const HEADER_ROW_HEIGHT = HEADER_HEIGHT + ROW_GAP; // 分区标题 + 间距占用高度
const BUFFER_PX = ROW_HEIGHT * 3; // 上下缓冲距离（px）

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

const { dictOptions, dictType, dictLabel } = useDict();

// 虚拟滚动状态
const listRef = ref<HTMLElement | null>(null);
const containerHeight = ref(0);
const scrollTop = ref(0);

// 获取源服务器信息（按连接地址匹配，用于在线/离线卡片判定时读取源服务器名称）
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

/** 离线卡片判定（与模板渲染一致：离线或缺少源服务器信息） */
const isOfflineCard = (server: Api.Game.SeverVo) => !(server.isOnline && getSourceServerInfo(server)?.serverName);

/** 展示列表：在线服务器在前、离线服务器置底（组内保持原有顺序） */
const displayServers = computed(() => {
  const online = props.servers.filter(s => !isOfflineCard(s));
  const offline = props.servers.filter(isOfflineCard);
  return [...online, ...offline];
});

// 获取服务器模式文案（字典 game_server_mode 渲染，未配置模式归入"未分组"）
const getServerModeLabel = (mode?: number) => {
  if (mode == null) return $t('server.unknownMode');
  return dictLabel('game_server_mode', String(mode)) || $t('server.unknownMode');
};

// 虚拟列表块：分区标题（header）或一行卡片（cards）
type CardBlock =
  | { type: 'header'; key: string; label: string; count: number; height: number }
  | { type: 'cards'; key: string; servers: Api.Game.SeverVo[]; height: number; delayBase: number };

// 按服务器模式分区，并拍平成块列表供虚拟滚动使用（组内保持在线优先、离线置底，分区按字典顺序，未知模式置底）
const blocks = computed<CardBlock[]>(() => {
  const dictOrder = new Map(dictOptions('game_server_mode').map((d, i) => [d.value, i] as [string, number]));

  const groups: { mode: number | undefined; servers: Api.Game.SeverVo[] }[] = [];
  const indexMap = new Map<string, number>();

  displayServers.value.forEach(server => {
    const mode = server.mode;
    const key = mode == null ? '__none__' : String(mode);
    let gi = indexMap.get(key);
    if (gi === undefined) {
      gi = groups.length;
      indexMap.set(key, gi);
      groups.push({ mode, servers: [] });
    }
    groups[gi].servers.push(server);
  });

  // 未知模式置底，其余按字典顺序排列
  groups.sort((a, b) => {
    const ai = a.mode == null ? Number.MAX_SAFE_INTEGER : (dictOrder.get(String(a.mode)) ?? Number.MAX_SAFE_INTEGER - 1);
    const bi = b.mode == null ? Number.MAX_SAFE_INTEGER : (dictOrder.get(String(b.mode)) ?? Number.MAX_SAFE_INTEGER - 1);
    return ai - bi;
  });

  const result: CardBlock[] = [];
  let cardIndex = 0;
  groups.forEach(g => {
    result.push({
      type: 'header',
      key: `header-${g.mode ?? 'none'}`,
      label: getServerModeLabel(g.mode),
      count: g.servers.length,
      height: HEADER_ROW_HEIGHT,
    });
    for (let i = 0; i < g.servers.length; i += ITEMS_PER_ROW) {
      const chunk = g.servers.slice(i, i + ITEMS_PER_ROW);
      result.push({ type: 'cards', key: chunk[0].connectStr, servers: chunk, height: ROW_HEIGHT, delayBase: cardIndex });
      cardIndex += chunk.length;
    }
  });

  return result;
});

// 各块起始偏移（前缀和），用于计算可视窗口
const blockOffsets = computed(() => {
  const offsets: number[] = [];
  let acc = 0;
  blocks.value.forEach(b => {
    offsets.push(acc);
    acc += b.height;
  });
  return offsets;
});

const totalHeight = computed(() => blocks.value.reduce((sum, b) => sum + b.height, 0));

const startIndex = computed(() => {
  const top = scrollTop.value;
  for (let i = 0; i < blocks.value.length; i++) {
    if (blockOffsets.value[i] + blocks.value[i].height >= top - BUFFER_PX) return i;
  }
  return blocks.value.length;
});

const endIndex = computed(() => {
  const bottom = scrollTop.value + containerHeight.value;
  for (let i = startIndex.value; i < blocks.value.length; i++) {
    if (blockOffsets.value[i] >= bottom + BUFFER_PX) return i;
  }
  return blocks.value.length;
});

const visibleBlocks = computed(() => blocks.value.slice(startIndex.value, endIndex.value));

const paddingTop = computed(() => blockOffsets.value[startIndex.value] ?? 0);
const paddingBottom = computed(() => totalHeight.value - (blockOffsets.value[endIndex.value] ?? totalHeight.value));

/* ===== 滚动更新节流：rAF 合并到每帧只触发一次重渲染 ===== */
let rafId = 0;
const updateVisibleRange = () => {
  const el = listRef.value;
  if (!el) return;
  scrollTop.value = el.scrollTop;
  containerHeight.value = el.clientHeight;
};
const scheduleUpdate = () => {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    updateVisibleRange();
  });
};

onMounted(() => {
  updateVisibleRange();
  listRef.value?.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
});

onUnmounted(() => {
  if (rafId) window.cancelAnimationFrame(rafId);
  listRef.value?.removeEventListener('scroll', scheduleUpdate);
  window.removeEventListener('resize', scheduleUpdate);
});

// 计算目标时间到当前时间的分钟差
const calculatePastMinutes = (targetTime: string) => {
  const target = dayjs(targetTime);
  const now = dayjs();
  const minutesDiff = now.diff(target, 'minute');
  return Math.max(minutesDiff, 0);
};

// 格式化运行时长：X时Y分 / X分（与表格视图一致）
const formatRuntime = (targetTime: string) => {
  const minutes = calculatePastMinutes(targetTime);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
  return `${minutes}分`;
};

// 获取 Ping 值对应的颜色类型（来自字典 ping_level）
const getPingType = (ping?: number) => {
  const level = ping === undefined || ping === null ? 'unknown' : ping < 70 ? 'normal' : ping < 100 ? 'warning' : 'error';
  return dictType('ping_level', level);
};

// 在线人数方格：1 名玩家 = 1 个方格，铺满卡片宽度
const getDotTotal = (server: Api.Game.SeverVo) => server.maxPlayers || 1;
const getDotFilled = (server: Api.Game.SeverVo) => Math.min(server.numPlayers || 0, getDotTotal(server));

// 在线人数对应的格子颜色等级
const getDotLevel = (server: Api.Game.SeverVo) => {
  if (server.numPlayers <= 20) return 1;
  if (server.numPlayers <= 40) return 2;
  if (server.numPlayers <= 60) return 3;
  if (server.numPlayers <= 80) return 4;
  return 5;
};

const getPlayerLevel = (server: Api.Game.SeverVo): string => {
  if (server.numPlayers <= 20) return 'player-level-1';
  if (server.numPlayers <= 40) return 'player-level-2';
  if (server.numPlayers <= 60) return 'player-level-3';
  if (server.numPlayers <= 80) return 'player-level-4';
  return 'player-level-5';
};

// 服务器比赛阶段文案（来自字典 game_map_phase）
const getMapPhaseText = (phase: string) => dictLabel('game_map_phase', phase) || phase;

// 比分等级：CT 领先 → 蓝，T 领先 → 金，平局 → 中性（与玩家数徽标同款彩色发光边框）
const getScoreLevel = (server: Api.Game.SeverVo) => {
  const ct = Number(server.CTScore) || 0;
  const t = Number(server.TScore) || 0;
  if (ct > t) return 'score-level-ct';
  if (t > ct) return 'score-level-t';
  return 'score-level-draw';
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

/* ===== 地图运行记录流程弹窗 ===== */

const showFlowModal = ref(false);
/** 传给流程弹窗的服务器（取源服务器信息，未匹配到时为 null） */
const flowServer = ref<Api.Game.Server | null>(null);

/** 打开地图运行记录流程弹窗 */
const handleShowFlow = (server: Api.Game.SeverVo) => {
  flowServer.value = getSourceServerInfo(server) ?? null;
  showFlowModal.value = true;
};

</script>

<template>
  <div ref="listRef" class="server-card-list h-full overflow-auto p-5px relative">
    <div class="virtual-scroll-spacer" :style="{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` }">
      <div class="card-grid">
        <template v-for="block in visibleBlocks" :key="block.key">
          <div v-if="block.type === 'header'" class="mode-section-header">
            <span class="mode-section-label">{{ block.label }}</span>
            <NTag size="small" round :bordered="false"
              :color="{ color: 'rgba(var(--app-rgb), 0.06)', textColor: 'rgba(var(--app-rgb), 0.5)' }">
              {{ $t('server.serverCount', { count: block.count }) }}
            </NTag>
          </div>
          <template v-else>
            <div v-for="(server, index) in block.servers" :key="server.connectStr || index"
              :style="{ '--delay': `${Math.min((block.delayBase + index) * 0.03, 0.4)}s` }">
          <div class="sercer-card overflow-hidden flex flex-col"
            v-if="server.isOnline && getSourceServerInfo(server)?.serverName">
            <img v-if="server.mapUrl" class="server-card-bg" v-lazy="server.mapUrl" />
            <div class="z-9 server-dots" :class="`level-${getDotLevel(server)}`">
              <span v-for="i in getDotTotal(server)" :key="i" class="server-dot"
                :class="{ filled: i <= getDotFilled(server) }"></span>
            </div>
            <div class="server-card-mask"></div>
            <div
              class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold whitespace-nowrap text-ellipsis overflow-hidden">
              {{ server.serverName }}
            </div>
            <div class="flex justify-between">
              <NEllipsis
                class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold flex-1 min-w-0"
                :max-line="1">
                {{ server.mapName }}
              </NEllipsis>
              <div class="player-badge mr-5px" :class="getPlayerLevel(server)">
                <SvgIcon icon="mdi:account-group" class="player-icon" />
                <span class="player-num">{{ server.numPlayers }}<span class="player-sep">/</span>{{ server.maxPlayers
                }}</span>
              </div>
            </div>
            <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
              <SvgIcon icon="tdesign:translate" class="mr-5px font-size-18px" />
              <NEllipsis class="flex items-center justify-center flex-1">
                {{ server.mapLabel ? server.mapLabel :
                  $t('server.noTranslation') }}
              </NEllipsis>
              <div class="chip-score mr-5px" :class="getScoreLevel(server)" v-show="server.mapPhase">
                <span class="team team-ct">{{ server.CTScore || '0' }}</span>
                <span class="score-phase">{{ getMapPhaseText(server.mapPhase || '') }}</span>
                <span class="team team-t">{{ server.TScore || '0' }}</span>
              </div>
            </div>
            <div class="flex items-center ml-5px mt-6px position-relative font-bold">
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
              <!-- 上线时间徽标：参考在线人数样式，其他 Tag 靠左、徽标靠右 -->
              <div v-if="server.dateTimeOriginal" class="online-time-badge ml-auto mr-5px">
                <SvgIcon icon="mdi:clock-outline" class="online-time-icon" />
                <span class="online-time-num">
                  {{ formatRuntime(server.dateTimeOriginal) }}
                </span>
              </div>
            </div>
            <div class="server-card-button mt-6px">
              <button class="action-btn btn-join" @click="handleJoin(server)">
                <SvgIcon icon="iconamoon:enter" class="text-22px" />
              </button>
              <button class="action-btn btn-copy" @click="handleCopy(server)">
                <SvgIcon icon="solar:copy-outline" class="text-22px" />
              </button>
              <button class="action-btn btn-auto" @click="handleAutoJoin(server)">
                <SvgIcon icon="material-symbols:alarm-smart-wake-outline" class="text-22px" />
              </button>
              <button class="action-btn btn-flow" @click="handleShowFlow(server)">
                <SvgIcon icon="mdi:file-tree" class="text-22px" />
              </button>
            </div>
          </div>
          <div v-else class="sercer-card overflow-hidden flex flex-col">
            <div class="server-offline-bg"></div>
            <div class="z-9 server-offline"></div>
            <div class="server-card-mask"></div>
            <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
              <SvgIcon icon="material-symbols:cloud-off" class="mr-5px font-size-18px text-yellow-400" />
              {{ server.serverName || server.connectStr }}
            </div>
            <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#fff font-bold">
              <SvgIcon icon="mdi:server-off" class="mr-5px font-size-16px text-gray-400" />
              {{ $t('server.offline') }}
            </div>
            <div class="mt-6px ml-5px font-size-13px flex items-center position-relative color-#a0a0a0 font-bold">
              {{ $t('server.waiting') }}
            </div>
            <div class="server-card-button mt-6px">
              <button class="action-btn btn-refresh" @click="handleRefresh(server)">
                <div :class="{ 'refresh-icon-spinning': refreshingAddrs.includes(server.connectStr) }">
                  <SvgIcon icon="material-symbols:refresh" class="text-22px" />
                </div>
              </button>
            </div>
          </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- 地图运行记录流程弹窗（全局自动注册组件；NModal 默认 teleport 到 body，不影响布局）
         放在根节点内部以保持单根结构，父级事件监听可正常继承 -->
    <ServerMapFlowModal v-model:show="showFlowModal" :server="flowServer" />
  </div>
</template>

<style scoped lang="scss">
/* 虚拟滚动容器：禁用浏览器滚动锚定（overflow-anchor），
   避免向下滚动时视口上方行被卸载触发锚定补偿、在底部回弹；
   overscroll-behavior 阻止滚动冒泡到外层窗口 */
.server-card-list {
  overflow-anchor: none;
  overscroll-behavior: contain;
}

/* 卡片网格（用原生 CSS Grid 替代 NGrid，减少组件渲染开销） */
.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  /* 允许子项收缩，避免长内容撑爆网格列导致徽标被挤出卡片 */
  > * {
    min-width: 0;
  }
}

/* 模式分区标题（占满整行） */
.mode-section-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 4px;
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
  // 进入动画：错落淡入上浮（与更新日志卡片一致）
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;

  .server-card-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    transition: filter 0.3s ease;
    filter: brightness(0.9);
  }

  .server-dots {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 2px;
    z-index: 10;
    overflow: hidden;

    .server-dot {
      flex: 1 1 0;
      min-width: 0;
      height: 4px;
      background: rgba(var(--app-rgb), 0.2);
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
    }

    &.level-1 .server-dot.filled {
      background: #00f91a;
      box-shadow: 0 0 4px rgba(0, 249, 26, 0.6);
    }

    &.level-2 .server-dot.filled {
      background: #5470ee;
      box-shadow: 0 0 4px rgba(84, 112, 238, 0.6);
    }

    &.level-3 .server-dot.filled {
      background: #ffa325;
      box-shadow: 0 0 4px rgba(255, 163, 37, 0.6);
    }

    &.level-4 .server-dot.filled {
      background: #ff4f00;
      box-shadow: 0 0 4px rgba(255, 79, 0, 0.6);
    }

    &.level-5 .server-dot.filled {
      background: #ff0000;
      box-shadow: 0 0 4px rgba(255, 0, 0, 0.6);
    }
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
  /* z-index 与背景图同层（0），内容文字在 DOM 中位于其后，绘制顺序靠上，不会被遮罩盖住 */
  .server-card-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg,
        rgba(0, 0, 0, 0.15) 0%,
        rgba(0, 0, 0, 0.35) 50%,
        rgba(0, 0, 0, 0.6) 100%);
    z-index: 0;
    transition: opacity 0.25s ease;
  }

  .server-card-button {
    /* 悬停才显示的操作栏：绝对定位卡片底部、固定高度，不占布局空间（无占位） */
    position: absolute;
    bottom: 5px; /* 与卡片底部保持距离 */
    left: 0;
    right: 0;
    height: 30px;
    display: flex;
    justify-content: flex-start; /* 按钮从左到右排列 */
    align-items: center;
    gap: 8px;
    padding-left: 8px;
    width: 100%;
    color: #ffffff;
    z-index: 2;
    opacity: 0;
    transform: translateY(100%);
    /* !important：覆盖全局 .n-config-provider * 的过渡覆盖，否则 opacity/transform 过渡不生效导致瞬间出现 */
    transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    pointer-events: none; /* 隐藏时不可点击 */

    /* 操作按钮：独立 button、固定 30x30、不撑满整行（留出空隙，后续可继续追加按钮） */
    .action-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.45);
      cursor: pointer;
      color: #fff;
      /* !important：同上，覆盖全局过渡，保证自身 hover/active 动画生效 */
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease !important;

      &:active {
        transform: scale(0.92);
      }

      &.btn-join {
        color: rgba(34, 197, 94, 0.9);

        &:hover {
          background: rgba(34, 197, 94, 0.25);
          color: #22c55e;
        }
      }

      &.btn-copy {
        color: rgba(59, 130, 246, 0.9);

        &:hover {
          background: rgba(59, 130, 246, 0.25);
          color: #3b82f6;
        }
      }

      &.btn-auto {
        color: rgba(249, 115, 22, 0.9);

        &:hover {
          background: rgba(249, 115, 22, 0.25);
          color: #f97316;
        }
      }

      /* 地图运行记录流程按钮：紫色，与 modal 头部图标主题一致 */
      &.btn-flow {
        color: rgba(167, 139, 250, 0.9);

        &:hover {
          background: rgba(167, 139, 250, 0.25);
          color: #a78bfa;
        }
      }

      &.btn-refresh {
        color: rgba(156, 163, 175, 0.9);

        &:hover {
          background: rgba(156, 163, 175, 0.25);
          color: #9ca3af;
        }
      }
    }
  }

  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* 鼠标移入卡片时操作栏从底部滑入显示 */
  &:hover .server-card-button {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  &:hover .server-card-bg {
    filter: brightness(1);
  }

  &:hover .server-dots {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  }

  &:hover .server-card-mask {
    background: linear-gradient(180deg,
        rgba(0, 0, 0, 0.08) 0%,
        rgba(0, 0, 0, 0.25) 50%,
        rgba(0, 0, 0, 0.5) 100%);
  }
}

.player-badge {
  /* 定位提升到背景图/遮罩之上：非定位元素会被 z-index:0 的定位背景盖住 */
  position: relative;
  z-index: 2;
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
  border: 1px solid rgba(var(--app-rgb), 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.55);
    border-color: rgba(var(--app-rgb), 0.18);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}

.player-icon {
  font-size: 13px;
  opacity: 0.9;
}

.player-badge.player-level-1 {
  border-color: rgba(0, 249, 26, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 10px rgba(0, 249, 26, 0.2);

  :deep(.player-icon) {
    color: #00f91a;
  }

  &:hover {
    border-color: rgba(0, 249, 26, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 14px rgba(0, 249, 26, 0.3);
  }
}

.player-badge.player-level-2 {
  border-color: rgba(84, 112, 238, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 10px rgba(84, 112, 238, 0.2);

  :deep(.player-icon) {
    color: #5470ee;
  }

  &:hover {
    border-color: rgba(84, 112, 238, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 14px rgba(84, 112, 238, 0.3);
  }
}

.player-badge.player-level-3 {
  border-color: rgba(255, 163, 37, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 10px rgba(255, 163, 37, 0.2);

  :deep(.player-icon) {
    color: #ffa325;
  }

  &:hover {
    border-color: rgba(255, 163, 37, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 14px rgba(255, 163, 37, 0.3);
  }
}

.player-badge.player-level-4 {
  border-color: rgba(255, 79, 0, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 10px rgba(255, 79, 0, 0.2);

  :deep(.player-icon) {
    color: #ff4f00;
  }

  &:hover {
    border-color: rgba(255, 79, 0, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 14px rgba(255, 79, 0, 0.3);
  }
}

.player-badge.player-level-5 {
  border-color: rgba(255, 0, 0, 0.55);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 12px rgba(255, 0, 0, 0.28);

  :deep(.player-icon) {
    color: #ff0000;
  }

  &:hover {
    border-color: rgba(255, 0, 0, 0.7);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 18px rgba(255, 0, 0, 0.4);
  }
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

/* 上线时间徽标（参考在线人数 player-badge 样式） */
.online-time-badge {
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
  border: 1px solid rgba(var(--app-rgb), 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.55);
    border-color: rgba(var(--app-rgb), 0.18);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}

.online-time-icon {
  font-size: 13px;
  opacity: 0.9;
  color: #667eea;
}

.online-time-num {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.2px;
  white-space: nowrap;
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
  /* 与玩家数徽标完全一致的胶囊样式：紧凑自适应宽度 + 半透明材质 + 定位提升 */
  position: relative;
  z-index: 2;
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
  border: 1px solid rgba(var(--app-rgb), 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.55);
    border-color: rgba(var(--app-rgb), 0.18);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
}

/* 领先方发光边框（对齐玩家数徽标的 player-level-N 效果） */
.chip-score.score-level-ct {
  border-color: rgba(96, 165, 250, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 10px rgba(96, 165, 250, 0.2);

  &:hover {
    border-color: rgba(96, 165, 250, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 14px rgba(96, 165, 250, 0.3);
  }
}

.chip-score.score-level-t {
  border-color: rgba(251, 191, 36, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 10px rgba(251, 191, 36, 0.2);

  &:hover {
    border-color: rgba(251, 191, 36, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 0 14px rgba(251, 191, 36, 0.3);
  }
}

.chip-score.score-level-draw {
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
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
  /* 纯文字分隔（去掉内衬小 chip，与玩家数徽标的文字风格一致） */
  font-size: 11px;
  opacity: 0.7;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
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
