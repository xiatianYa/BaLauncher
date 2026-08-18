<!--
 * @component ServerMapFlowLoadMore
 * @description Vue Flow 自定义节点 —— 流程末尾的"加载更多"卡片节点，点击后由父组件加载下一页地图运行记录并追加到流程末尾
 * @author BaLauncher
 * @design 尺寸与 ServerMapFlowNode 完全一致（240 x 190、同圆角/背景/阴影），保持蛇形网格对齐与视觉统一；
 *         卡片内居中展示图标徽章 + 主标题 + 副标题提示，hover 时边框点亮并轻微上浮；
 *         入/出边连接点方位由父组件按蛇形布局传入；点击事件通过 VueFlow 的 node-click 冒泡到父组件处理。
 -->
<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'ServerMapFlowLoadMore' });

/** 节点数据：加载中状态 + 蛇形流向的连接点方位配置 */
type LoadMoreNodeData = {
  /** 是否正在加载下一页（徽章展示加载动画，卡片边框呼吸闪烁） */
  loading?: boolean;
  /** 连接点方位：由父组件按蛇形布局计算，缺省时同向行左进右出 */
  flowHandle?: { target: Position; source: Position };
};

/** 自定义节点必须继承 Vue Flow 注入的完整 NodeProps（含 id/type/selected 等运行时属性） */
defineProps<NodeProps<LoadMoreNodeData>>();
</script>

<template>
  <div class="flow-load-more" :class="{ 'is-loading': data.loading }">
    <!-- 入边连接点：接收上一条记录的出边（方位由蛇形流向决定） -->
    <Handle type="target" :position="data.flowHandle?.target ?? Position.Left" class="flow-node-handle" />
    <div class="load-more-content">
      <!-- 图标徽章：默认历史图标，加载中切换为旋转动画 -->
      <div class="load-more-badge">
        <span v-if="data.loading" class="load-more-spinner"></span>
        <SvgIcon v-else icon="mdi:history" class="load-more-badge-icon" />
      </div>
      <div class="load-more-text">{{ $t('tools.loadMore') }}</div>
      <div class="load-more-hint">{{ $t('tools.loadMoreHint') }}</div>
    </div>
    <!-- 出边连接点：预留（后续追加节点时可继续串联） -->
    <Handle type="source" :position="data.flowHandle?.source ?? Position.Right" class="flow-node-handle" />
  </div>
</template>

<style scoped lang="scss">
/* 卡片本体：尺寸 / 圆角 / 背景 / 阴影与 ServerMapFlowNode 保持一致 */
.flow-load-more {
  width: 240px;
  height: 190px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1.5px dashed var(--flow-accent, rgba(102, 126, 234, 0.55));
  background: var(--flow-card-bg, color-mix(in srgb, var(--n-text-color, #888) 6%, transparent));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    border-style: solid;
    border-color: rgba(102, 126, 234, 0.8);
    background: color-mix(in srgb, rgba(102, 126, 234, 0.12) 60%, var(--flow-card-bg, transparent));
    box-shadow: 0 6px 18px rgba(102, 126, 234, 0.25);
    transform: translateY(-2px);

    .load-more-badge {
      transform: scale(1.08);
      background: rgba(102, 126, 234, 0.22);
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
    }

    .load-more-text {
      color: #667eea;
    }
  }

  /* 加载中：卡片呼吸闪烁 + 禁止点击 */
  &.is-loading {
    cursor: default;
    animation: load-more-breathe 1.2s ease-in-out infinite;

    .load-more-badge {
      border-color: transparent;
      background: rgba(102, 126, 234, 0.12);
    }
  }
}

/* 居中内容区：徽章 + 主标题 + 副标题 */
.load-more-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 圆形图标徽章 */
.load-more-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.35);
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;

  .load-more-badge-icon {
    font-size: 20px;
    color: #667eea;
  }
}

/* 主标题 */
.load-more-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--flow-text, var(--n-text-color));
  transition: color 0.25s ease;
}

/* 副标题提示 */
.load-more-hint {
  font-size: 11px;
  color: var(--flow-text-2, color-mix(in srgb, var(--n-text-color, #888) 62%, transparent));
}

/* 加载中旋转动画 */
.load-more-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(102, 126, 234, 0.25);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: load-more-spin 0.8s linear infinite;
}

@keyframes load-more-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 加载中卡片边框呼吸闪烁 */
@keyframes load-more-breathe {
  0%,
  100% {
    border-color: rgba(102, 126, 234, 0.35);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  }
  50% {
    border-color: rgba(102, 126, 234, 0.75);
    box-shadow: 0 4px 18px rgba(102, 126, 234, 0.25);
  }
}

/* ===== 连接点（与 ServerMapFlowNode 保持一致） ===== */
.flow-node-handle {
  width: 10px;
  height: 10px;
  background: #667eea;
  border: 2px solid #fff;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.25);
  }
}
</style>
