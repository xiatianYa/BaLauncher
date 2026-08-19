<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { VueFlow, useVueFlow, type Node } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import SvgIcon from '@/components/custom/svg-icon.vue';

/**
 * 内部画布逻辑尺寸（固定坐标系）：节点坐标始终基于 220×138 布局，
 * 渲染时按容器实际宽度整体缩放（zoom），实现自适应外部宽度
 */
const CANVAS = { width: 220, height: 138 };
const SLOT_SIZE = { width: 54, height: 24 };
const MARGIN = 6;

/** 画布缩放允许范围（容器 300px 宽时约为 1.36，窄容器下取小值） */
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

/** 九宫格位置定义（key 与主进程/存储的浮窗位置一致） */
const POSITIONS: { key: string; x: number; y: number }[] = [
  { key: 'top-left', x: MARGIN, y: MARGIN },
  { key: 'top-center', x: (CANVAS.width - SLOT_SIZE.width) / 2, y: MARGIN },
  { key: 'top-right', x: CANVAS.width - SLOT_SIZE.width - MARGIN, y: MARGIN },
  { key: 'middle-left', x: MARGIN, y: (CANVAS.height - SLOT_SIZE.height) / 2 },
  { key: 'center', x: (CANVAS.width - SLOT_SIZE.width) / 2, y: (CANVAS.height - SLOT_SIZE.height) / 2 },
  { key: 'middle-right', x: CANVAS.width - SLOT_SIZE.width - MARGIN, y: (CANVAS.height - SLOT_SIZE.height) / 2 },
  { key: 'bottom-left', x: MARGIN, y: CANVAS.height - SLOT_SIZE.height - MARGIN },
  { key: 'bottom-center', x: (CANVAS.width - SLOT_SIZE.width) / 2, y: CANVAS.height - SLOT_SIZE.height - MARGIN },
  { key: 'bottom-right', x: CANVAS.width - SLOT_SIZE.width - MARGIN, y: CANVAS.height - SLOT_SIZE.height - MARGIN }
];

const props = withDefaults(
  defineProps<{
    /** 当前选中的九宫格位置 key（v-model） */
    modelValue: string;
    /** 位置文案的 i18n 命名空间，默认 perfView.trayPosition */
    i18nPrefix?: string;
  }>(),
  { i18nPrefix: 'perfView.trayPosition' }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

/** 画布容器引用（用于监听实际宽度） */
const canvasRef = ref<HTMLDivElement | null>(null);

/** 与 <VueFlow> 共享同一画布实例（id 需一致） */
const { setViewport } = useVueFlow({ id: 'position-picker' });

let resizeObserver: ResizeObserver | null = null;

/** 按容器实际宽度整体缩放画布，内部 220×138 坐标不变 */
const syncScale = () => {
  const el = canvasRef.value;
  if (!el) return;
  const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, el.clientWidth / CANVAS.width));
  setViewport({ x: 0, y: 0, zoom: scale });
};

onMounted(() => {
  syncScale();
  resizeObserver = new ResizeObserver(syncScale);
  if (canvasRef.value) resizeObserver.observe(canvasRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

/** 位置 key → 画布坐标（未知 key 兜底到左上角） */
const positionOf = (key: string) => POSITIONS.find((p) => p.key === key) ?? POSITIONS[0];

/** Vue-Flow 节点：9 个槽位（虚线占位，不可拖拽）+ 1 个浮窗节点（可拖拽吸附） */
const nodes = ref<Node[]>([
  ...POSITIONS.map((p, i) => ({
    id: `slot-${i}`,
    type: 'slot',
    position: { x: p.x, y: p.y },
    data: { key: p.key },
    draggable: false,
    selectable: false,
    connectable: false
  })),
  {
    id: 'tray',
    type: 'tray',
    position: { x: positionOf(props.modelValue).x, y: positionOf(props.modelValue).y },
    data: {}
  }
]);

/** 选中位置变化（点击槽位/外部修改）时，浮窗节点吸附到对应槽位 */
watch(
  () => props.modelValue,
  (key) => {
    const pos = positionOf(key);
    const tray = nodes.value.find((n) => n.id === 'tray');
    if (tray) tray.position = { x: pos.x, y: pos.y };
  }
);

/** 点击槽位 → 选中该位置 */
const handleNodeClick = ({ node }: { node: Node }) => {
  if (node.type === 'slot') emit('update:modelValue', (node.data as { key: string }).key);
};

/** 拖拽结束 → 吸附到最近槽位并选中 */
const handleNodeDragStop = ({ node }: { node: Node }) => {
  if (node.id !== 'tray') return;
  const { x, y } = node.position;
  let nearest = POSITIONS[0];
  let minDist = Infinity;
  for (const p of POSITIONS) {
    const dist = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  node.position = { x: nearest.x, y: nearest.y };
  emit('update:modelValue', nearest.key);
};
</script>

<template>
  <div class="position-picker">
    <!-- 屏幕预览画布：虚线槽位可点击，浮窗节点可拖拽吸附（宽度自适应外部容器） -->
    <div ref="canvasRef" class="position-canvas">
      <VueFlow
        id="position-picker"
        v-model:nodes="nodes"
        :edges="[]"
        :pan-on-drag="false"
        :zoom-on-scroll="false"
        :zoom-on-pinwheel="false"
        :zoom-on-double-click="false"
        :nodes-connectable="false"
        :nodes-focusable="false"
        :min-zoom="MIN_ZOOM"
        :max-zoom="MAX_ZOOM"
        :fit-view-on-init="false"
        :default-viewport="{ x: 0, y: 0, zoom: 1 }"
        @node-click="handleNodeClick"
        @node-drag-stop="handleNodeDragStop"
      >
        <template #node-slot="slotProps">
          <div class="slot-node" :class="{ active: slotProps.data.key === modelValue }" />
        </template>
        <template #node-tray>
          <div class="tray-node">
            <span class="tray-dot cpu" />
            <span class="tray-dot ram" />
            <span class="tray-dot gpu" />
          </div>
        </template>
      </VueFlow>
    </div>
    <!-- 当前选中位置文案 -->
    <div class="position-label">
      <SvgIcon icon="mdi:monitor" class="position-label-icon" />
      <span>{{ $t(`${i18nPrefix}.${modelValue}`) }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.position-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

/* 屏幕预览画布：宽度跟随外部容器，高度按 220:138 等比自适应 */
.position-canvas {
  width: 100%;
  aspect-ratio: 220 / 138;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.08);
  cursor: default;

  /* 覆盖 Vue-Flow 节点默认内边距，让节点占满自身尺寸 */
  :deep(.vue-flow__node) {
    padding: 0;
  }

  /* 槽位节点：虚线占位框 */
  :deep(.slot-node) {
    width: 54px;
    height: 24px;
    border: 1px dashed rgba(var(--app-rgb), 0.28);
    border-radius: 6px;
    background: rgba(var(--app-rgb), 0.04);
    transition: all 0.2s ease;

    &.active {
      border-style: solid;
      border-color: #12b7f5;
      background: rgba(18, 183, 245, 0.18);
    }
  }

  /* 浮窗节点：模拟性能浮窗的深色横条 */
  :deep(.tray-node) {
    width: 54px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border-radius: 6px;
    background: #1e293b;
    border: 1px solid rgba(18, 183, 245, 0.6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    .tray-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;

      &.cpu {
        background: #667eea;
      }

      &.ram {
        background: #f59e0b;
      }

      &.gpu {
        background: #10b981;
      }
    }
  }
}

/* 当前位置文案 */
.position-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(var(--app-rgb), 0.55);

  .position-label-icon {
    font-size: 14px;
    color: #667eea;
  }
}
</style>
