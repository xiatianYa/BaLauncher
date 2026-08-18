<!--
 * @component FlowEdge
 * @description Vue Flow 自定义边 —— 直线路径 + 流光灯效果（发光短线段沿路径循环流动）
 * @author BaLauncher
 * @design 基于 BaseEdge 渲染半透明基础线与交互命中区，另叠加一条带流光动画的发光路径；
 *         路径为源连接点到目标连接点的直线（行内水平、行间折返竖直），不走平滑绕行。
 -->
<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, type EdgeProps } from '@vue-flow/core';

defineOptions({ name: 'FlowEdge' });

const props = defineProps<EdgeProps>();

/** 直线路径：直接从源连接点连到目标连接点（不绕行、不弯曲） */
const path = computed(() => `M ${props.sourceX} ${props.sourceY} L ${props.targetX} ${props.targetY}`);
</script>

<template>
  <!-- 基础线（半透明底色 + 箭头标记），交互命中区由 BaseEdge 一并渲染 -->
  <BaseEdge :id="props.id" :path="path" :marker-end="props.markerEnd"
    style="stroke: rgba(102, 126, 234, 0.22); stroke-width: 2;" />
  <!-- 流光灯：发光短线段沿路径循环流动 -->
  <path :d="path" class="flow-edge-glow" />
</template>

<style scoped lang="scss">
/* 流光灯：发光短线段沿路径循环流动（负向偏移使光点沿连线方向推进） */
.flow-edge-glow {
  fill: none;
  stroke: #667eea;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 6 22;
  filter: drop-shadow(0 0 3px rgba(102, 126, 234, 0.9));
  animation: flow-edge-light 1.5s linear infinite;
}

@keyframes flow-edge-light {
  to {
    stroke-dashoffset: -28;
  }
}
</style>
