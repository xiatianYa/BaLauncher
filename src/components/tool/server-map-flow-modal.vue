<!--
 * @component ServerMapFlowModal
 * @description 服务器地图运行记录流程弹窗 —— 基于 Vue Flow 的可视化流程，将指定服务器最近的地图运行记录按时间顺序排列成节点流
 * @author BaLauncher
 * @design 自定义节点 ServerMapFlowNode（封面图 + 地图名 + 游玩时间 + 时长 + 在线人数 + 比分），
 *         节点按游玩开始时间升序蛇形排列，自定义 flowEdge 流光灯边顺序串联；
 *         初始视口默认只展示约 4 行节点，支持滚轮缩放 / 拖拽平移 / 缩放工具条。
 *         组件位于 src/components 下，由 unplugin-vue-components 自动全局注册，任意页面无需 import 即可使用。
 -->
<script setup lang="ts">
/* Vue Flow 基础样式（仅本组件使用，组件级引入避免全局样式开销；theme-default 为可选默认主题，本组件用自定义节点无需引入） */
import '@vue-flow/core/dist/style.css';
import { computed, markRaw, nextTick, ref, watch } from 'vue';
import { NEmpty, NModal, NSpin, NTag } from 'naive-ui';
import { MarkerType, Position, VueFlow, useVueFlow } from '@vue-flow/core';
import { fetchGetServerMapTimeline } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import ServerMapFlowNode from './server-map-flow-node.vue';
import ServerMapFlowLoadMore from './server-map-flow-load-more.vue';
import FlowEdge from './flow-edge.vue';

defineOptions({ name: 'ServerMapFlowModal' });

/** 流程画布唯一 ID（缩放工具条通过 useVueFlow 绑定到同一画布实例） */
const FLOW_ID = 'server-map-flow';

const props = defineProps<{
  /** 是否显示弹窗 */
  show: boolean;
  /** 目标服务器（id 必填，serverName / ip / port 用于头部展示） */
  server: Api.Game.Server | null;
}>();

const emit = defineEmits<{ (e: 'update:show', value: boolean): void }>();

const showRef = computed({
  get: () => props.show,
  set: value => emit('update:show', value)
});

/** 画布实例操作（供缩放工具条 / 初始视口 / 上下滚动使用） */
const { zoomIn, zoomOut, fitView, setViewport, viewport, dimensions } = useVueFlow({ id: FLOW_ID });

/* ==================== 数据加载 ==================== */

/** 单页加载条数（流程可视化仅展示最近记录，无需全量分页） */
const PAGE_SIZE = 50;
const loading = ref(false);
const loadingMore = ref(false);
const records = ref<Api.Game.GameServerMapTimelineVo[]>([]);
/** 当前已加载的页码（从 1 开始，用于"加载更多"翻页） */
const currentPage = ref(1);
/** 后端记录总数（用于判断是否还有下一页） */
const total = ref(0);
/** 是否还有更多数据可加载（已加载条数 < 总数） */
const hasMore = computed(() => records.value.length < total.value);

/** 加载指定服务器的地图运行记录（首页） */
const loadData = async () => {
  if (!props.server) return;
  loading.value = true;
  // 重置分页状态
  currentPage.value = 1;
  total.value = 0;
  try {
    const { data, error } = await fetchGetServerMapTimeline(props.server.id, {
      current: 1,
      size: PAGE_SIZE
    });
    if (!error && data) {
      total.value = data.total || 0;
      // 按游玩开始时间降序排列，最新日期排在最前面（流程从左到右由新到旧推进）
      records.value = [...(data.records || [])].sort(
        (a, b) => +new Date(b.firstPlayTime) - +new Date(a.firstPlayTime)
      );
      // 等待画布挂载完成后再设置初始视口
      applyDefaultView();
    }
  } finally {
    loading.value = false;
  }
};

/** 加载下一页记录并追加到流程末尾（由末尾的"加载更多"节点触发） */
const loadMore = async () => {
  if (!props.server || loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  try {
    const { data, error } = await fetchGetServerMapTimeline(props.server.id, {
      current: currentPage.value + 1,
      size: PAGE_SIZE
    });
    if (!error && data) {
      currentPage.value += 1;
      total.value = data.total || 0;
      // 与首页同样按游玩开始时间降序排列（时间上比当前最后一条更旧）
      const more = [...(data.records || [])].sort(
        (a, b) => +new Date(b.firstPlayTime) - +new Date(a.firstPlayTime)
      );
      // 空页视为已全部加载，避免再次触发请求
      if (more.length === 0) total.value = records.value.length;
      // 追加到现有记录末尾
      records.value = [...records.value, ...more];
    }
  } finally {
    loadingMore.value = false;
  }
};

/** 默认只展示约 3 行节点（不缩放到全图），并将内容在画布中居中；配合缩放工具条的"自适应"可查看全部 */
const ROWS_TO_SHOW = 3;
const applyDefaultView = async () => {
  await nextTick();
  const { width, height } = dimensions.value;
  // 画布尚未测量完成或暂无节点时跳过
  if (!width || !height || nodes.value.length === 0) return;

  // 实际展示的行数（数据不足 4 行时按实际行数缩放，避免内容过小）
  const rowsShown = Math.min(Math.ceil(nodes.value.length / COLS), ROWS_TO_SHOW);
  // 目标缩放：让展示的行恰好铺满画布高度（上限 1x）
  const rowPitch = NODE_H + GAP_Y;
  const zoom = Math.min(1, height / (rowsShown * rowPitch));

  // 计算可见内容区域（前 rowsShown 行节点）的包围盒，作为居中基准
  const visible = nodes.value.slice(0, rowsShown * COLS);
  const minX = Math.min(...visible.map(n => n.position.x));
  const maxX = Math.max(...visible.map(n => n.position.x + NODE_W));
  const minY = Math.min(...visible.map(n => n.position.y));
  const maxY = Math.max(...visible.map(n => n.position.y + NODE_H));
  const contentW = maxX - minX;
  const contentH = maxY - minY;

  // 平移视口，使内容区域在画布中水平、垂直居中
  const x = (width - contentW * zoom) / 2 - minX * zoom;
  const y = (height - contentH * zoom) / 2 - minY * zoom;
  setViewport?.({ x, y, zoom });
};

/** 弹窗打开时加载；服务器切换时重新加载 */
watch(
  () => props.show,
  val => {
    if (val) {
      records.value = [];
      loadData();
    }
  }
);

watch(
  () => props.server?.id,
  () => {
    if (props.show) {
      records.value = [];
      loadData();
    }
  }
);

/* ==================== 流程节点 / 边构建 ==================== */

/** 节点尺寸与间距（与 ServerMapFlowNode 组件样式保持一致） */
const NODE_W = 240;
const NODE_H = 190;
const GAP_X = 48;
const GAP_Y = 48;
/** 每行节点数 */
const COLS = 4;

/** 流程节点统一结构（记录节点与"加载更多"节点共用，data 内容因节点类型而异） */
type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

/**
 * 计算蛇形布局中第 index 个节点的位置与连接点方位：
 *  - 奇数行反向排列（从右往左），行尾与下一行行首左右对齐
 *  - 连接点方位：
 *      行内  偶数行左进右出 / 奇数行右进左出（仅左右）
 *      行间  行尾卡片从底部向下发送（Bottom），下一行行首从顶部接收（Top），连线竖直
 * @param index 节点序号（从 0 开始）
 * @param count 节点总数（用于判断该节点是否有后继节点）
 */
const layoutAt = (index: number, count: number) => {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const isEvenRow = row % 2 === 0;
  // 物理列：偶数行从左往右，奇数行从右往左
  const xIndex = isEvenRow ? col : COLS - 1 - col;
  const hasNext = index < count - 1;
  const isRowFirst = col === 0;
  const isRowLast = col === COLS - 1;

  // 入边连接点：行首（非首行）从上一行行尾底部接收（Top），其余按行内流向进
  const targetPos = isRowFirst && row > 0 ? Position.Top : isEvenRow ? Position.Left : Position.Right;
  // 出边连接点：行尾（且有下一行）向下一行行首底部发送（Bottom），其余按行内流向出
  const sourcePos = isRowLast && hasNext ? Position.Bottom : isEvenRow ? Position.Right : Position.Left;

  return {
    x: 24 + xIndex * (NODE_W + GAP_X),
    y: 24 + row * (NODE_H + GAP_Y),
    targetPos,
    sourcePos
  };
};

/** 流程末尾的"加载更多"节点：位于最后一条记录之后，继续按蛇形排布，仅在还有下一页时出现 */
const loadMoreNode = computed(() => {
  if (!hasMore.value) return null;
  const { x, y, targetPos, sourcePos } = layoutAt(records.value.length, records.value.length + 1);
  return {
    id: 'load-more',
    type: 'loadMore',
    position: { x, y },
    data: {
      // 加载中状态：按钮节点据此展示加载动画
      loading: loadingMore.value,
      // 连接点方位配置：节点组件据此渲染左右/上下的 Handle
      flowHandle: { target: targetPos, source: sourcePos }
    }
  };
});

/** 按蛇形布局生成流程节点（记录节点 + 末尾的"加载更多"节点） */
const nodes = computed(() => {
  const list: FlowNode[] = records.value.map((record, index) => {
    const { x, y, targetPos, sourcePos } = layoutAt(index, records.value.length);
    return {
      id: `map-${index}`,
      type: 'mapRecord',
      position: { x, y },
      data: {
        ...record,
        // 连接点方位配置：节点组件据此渲染左右/上下的 Handle
        flowHandle: { target: targetPos, source: sourcePos }
      }
    };
  });
  const moreNode = loadMoreNode.value;
  if (moreNode) list.push(moreNode);
  return list;
});

/** 按记录顺序串联相邻节点（时间先后关系即流程方向），使用自定义流光灯边 */
const edges = computed(() =>
  nodes.value.slice(0, -1).map((node, index) => ({
    id: `edge-${index}`,
    source: node.id,
    target: nodes.value[index + 1].id,
    type: 'flowEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(102, 126, 234, 0.65)' }
  }))
);

/** 自定义节点 / 边类型映射（markRaw 避免组件被响应式代理，否则渲染异常） */
const nodeTypes = { mapRecord: markRaw(ServerMapFlowNode), loadMore: markRaw(ServerMapFlowLoadMore) };
const edgeTypes = { flowEdge: markRaw(FlowEdge) };

/* ==================== 缩放 / 上下滚动工具条 ==================== */

/** 点击"加载更多"节点时加载下一页（Vue Flow 的 node-click 事件） */
const handleNodeClick = ({ node }: { node: { type?: string } }) => {
  if (node?.type === 'loadMore') loadMore();
};

const handleZoomIn = () => zoomIn?.();
const handleZoomOut = () => zoomOut?.();
const handleFitView = () => fitView?.({ padding: 0.15, duration: 300 });

/** 按一行行距向上平移视口（查看上方一行） */
const handleScrollUp = () => {
  setViewport?.({
    x: viewport.value.x,
    y: viewport.value.y + (NODE_H + GAP_Y) * viewport.value.zoom,
    zoom: viewport.value.zoom
  });
};

/** 按一行行距向下平移视口（查看下方一行） */
const handleScrollDown = () => {
  setViewport?.({
    x: viewport.value.x,
    y: viewport.value.y - (NODE_H + GAP_Y) * viewport.value.zoom,
    zoom: viewport.value.zoom
  });
};
</script>

<template>
  <NModal v-model:show="showRef" preset="card" class="server-map-flow-modal" :bordered="false">
    <template #header>
      <div class="flow-modal-header">
        <div class="flow-modal-header-icon">
          <SvgIcon icon="mdi:file-tree" />
        </div>
        <span class="flow-modal-header-title">{{ $t('tools.mapTimeline') }}</span>
        <NTag v-if="props.server" size="small" round class="flow-modal-server-tag">
          {{ props.server.serverName || `${props.server.ip}:${props.server.port}` }}
        </NTag>
      </div>
    </template>

    <div class="flow-body">
      <!-- 初始加载中 -->
      <div v-if="loading && nodes.length === 0" class="flow-center">
        <NSpin size="large" />
      </div>

      <!-- 流程画布 -->
      <template v-else-if="nodes.length > 0">
        <VueFlow
          :id="FLOW_ID"
          :nodes="nodes"
          :edges="edges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :min-zoom="0.2"
          :max-zoom="1.5"
          :nodes-draggable="false"
          :nodes-connectable="false"
          @node-click="handleNodeClick"
          class="flow-canvas"
        />
        <!-- 缩放 / 上下滚动工具条 -->
        <div class="flow-tools">
          <button class="flow-tool-btn" title="up" @click="handleScrollUp">
            <SvgIcon icon="mdi:chevron-up" />
          </button>
          <button class="flow-tool-btn" title="down" @click="handleScrollDown">
            <SvgIcon icon="mdi:chevron-down" />
          </button>
          <div class="flow-tools-divider"></div>
          <button class="flow-tool-btn" title="+" @click="handleZoomIn">
            <SvgIcon icon="mdi:plus" />
          </button>
          <button class="flow-tool-btn" title="-" @click="handleZoomOut">
            <SvgIcon icon="mdi:minus" />
          </button>
          <button class="flow-tool-btn" title="fit" @click="handleFitView">
            <SvgIcon icon="mdi:fit-to-screen-outline" />
          </button>
        </div>
        <!-- 刷新中的遮罩加载（如切换服务器时） -->
        <div v-if="loading" class="flow-reload-mask">
          <NSpin size="small" />
        </div>
      </template>

      <!-- 无数据 -->
      <NEmpty v-else class="flow-center" :description="$t('tools.noTimelineData')" />
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.flow-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--flow-text, var(--n-text-color));

  .flow-modal-header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(102, 126, 234, 0.12);

    :deep(svg) {
      font-size: 18px;
      color: #667eea;
    }
  }

  .flow-modal-header-title {
    flex-shrink: 0;
  }

  .flow-modal-server-tag {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.flow-body {
  flex: 1;
  min-height: 0;
  position: relative;
  padding: 12px;
}

.flow-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 缩放工具条：悬浮在画布右上角（上/下滚动 + 缩放手感分隔线） */
.flow-tools {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;

  /* 上/下滚动按钮与缩放按钮之间的分隔线 */
  .flow-tools-divider {
    width: 22px;
    height: 1px;
    margin: 2px auto;
    background: var(--flow-border, color-mix(in srgb, var(--n-text-color, #888) 14%, transparent));
  }

  .flow-tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid var(--flow-border, color-mix(in srgb, var(--n-text-color, #888) 14%, transparent));
    background: var(--flow-card-bg, color-mix(in srgb, var(--n-text-color, #888) 6%, transparent));
    color: var(--flow-text-2, color-mix(in srgb, var(--n-text-color, #888) 62%, transparent));
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;

    &:hover {
      color: #667eea;
      border-color: rgba(102, 126, 234, 0.5);
      background: rgba(102, 126, 234, 0.12);
    }
  }
}

/* 刷新遮罩 */
.flow-reload-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--n-text-color, #888) 6%, transparent);
}
</style>

<style lang="scss">
/* ===== 弹窗全局样式 =====
   NModal 默认 teleport 到 body，不继承应用根节点的 --app-rgb。
   这里基于弹窗卡片上 naive-ui 保证提供的 --n-text-color（自动随明暗主题切换）
   派生画布/节点/工具条所需变量，弹窗内所有颜色随主题自适应。 */
.server-map-flow-modal {
  width: min(1080px, 94vw);
  height: min(700px, 88vh);
  max-width: 94vw;
  border-radius: 16px;
  display: flex;
  flex-direction: column;

  --flow-bg: color-mix(in srgb, var(--n-text-color) 4%, transparent);
  --flow-text: var(--n-text-color);
  --flow-text-2: color-mix(in srgb, var(--n-text-color) 62%, transparent);
  --flow-card-bg: color-mix(in srgb, var(--n-text-color) 6%, transparent);
  --flow-border: color-mix(in srgb, var(--n-text-color) 14%, transparent);

  .n-card-header {
    flex-shrink: 0;
  }

  .n-card-content {
    flex: 1;
    min-height: 0;
    padding: 0;
    display: flex;
    overflow: hidden;
  }

  /* Vue Flow 画布：占满内容区 */
  .flow-canvas {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: var(--flow-bg);
  }
}
</style>
