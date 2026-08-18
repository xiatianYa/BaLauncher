<!--
 * @component ServerMapFlowNode
 * @description Vue Flow 自定义节点 —— 展示单条地图运行记录（封面图 + 地图名 + 游玩时间 + 时长 + 在线人数 + 比分）
 * @author BaLauncher
 * @design 入边/出边两个连接点（Handle），方位由父组件按蛇形流向传入（行内左右进出、行尾底部发送、行首顶部接收），
 *         由 ServerMapFlowModal 按时间顺序串联成流程。颜色使用模态窗根节点派生的 CSS 变量，随主题自适应。
 -->
<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import dayjs from 'dayjs';
import { useI18n } from 'vue-i18n';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'ServerMapFlowNode' });

/** 节点数据：地图记录 + 蛇形流向的连接点方位配置 */
type FlowNodeData = Api.Game.GameServerMapTimelineVo & {
  /** 连接点方位：由父组件按蛇形布局计算，缺省时同向行左进右出 */
  flowHandle?: { target: Position; source: Position };
};

/** 自定义节点必须继承 Vue Flow 注入的完整 NodeProps（含 id/type/selected 等运行时属性），
 *  这里以 NodeProps<FlowNodeData> 声明，data 即该地图记录类型 */
const props = defineProps<NodeProps<FlowNodeData>>();

const { locale } = useI18n();

/** 展示名称（主名）：优先地图译名，其次地图原名 */
const mapName = computed(() => props.data.mapLabel || props.data.mapName);

/** 是否存在与主名不同的原名（需要单独占一行展示） */
const hasOriginName = computed(() => !!props.data.mapName && props.data.mapName !== mapName.value);

/** 游玩开始时间（月份日期 + 时分，跟随当前语言） */
const formatPlayTime = computed(() => {
  if (!props.data.firstPlayTime) return '-';
  const date = dayjs(props.data.firstPlayTime);
  const isZh = locale.value === 'zh-CN' || locale.value === 'zh-TW';
  return isZh ? date.format('MM月DD日 HH:mm') : date.format('MM-DD HH:mm');
});

/** 最大在线人数（取人数曲线中的峰值） */
const maxPlayers = computed(() => Math.max(0, ...(props.data.playerCountAxis || [])));

/** 是否有比分（CT/T 双方比分均存在时展示比分牌） */
const hasScore = computed(() => props.data.ctScore != null && props.data.tscore != null);

/** 复制地图名称到剪贴板（复制原始 mapName 字段；点击封面地图名触发） */
const handleCopyMapName = async () => {
  const raw = props.data.mapName || mapName.value;
  if (!raw) return;
  await navigator.clipboard.writeText(raw);
  window.$message?.success($t('server.copySuccess'));
};
</script>

<template>
  <div class="flow-node">
    <!-- 入边连接点（位置由蛇形流向决定，缺省在节点左侧） -->
    <Handle type="target" :position="data.flowHandle?.target ?? Position.Left" class="flow-node-handle" />

    <!-- 封面区：地图封面 + 渐变遮罩 + 比分牌 + 地图名 -->
    <div class="node-cover">
      <img v-if="data.mapUrl" :src="data.mapUrl" :alt="mapName" class="node-cover-img" loading="lazy" />
      <div v-else class="node-cover-placeholder">
        <SvgIcon icon="mdi:image-off-outline" />
      </div>
      <div class="node-cover-mask"></div>
      <!-- 比分牌：CT 蓝 / T 橙 -->
      <div v-if="hasScore" class="node-score">
        <span class="score-team ct">CT {{ data.ctScore }}</span>
        <span class="score-sep">:</span>
        <span class="score-team t">{{ data.tscore }} T</span>
      </div>
      <!-- 地图名：主名（译名优先）+ 原名副行，点击复制原始地图名称 -->
      <div class="node-map-name" :title="mapName" @click="handleCopyMapName">
        <div class="node-map-name-line">
          <span class="node-map-name-text">{{ mapName }}</span>
          <SvgIcon icon="mdi:content-copy" class="node-map-name-copy" />
        </div>
        <span v-if="hasOriginName" class="node-map-name-origin">{{ props.data.mapName }}</span>
      </div>
    </div>

    <!-- 信息区：游玩时间 / 游玩时长 / 最大在线人数 -->
    <div class="node-info">
      <div class="node-row">
        <SvgIcon icon="mdi:clock-outline" class="node-row-icon" />
        <span>{{ formatPlayTime }}</span>
      </div>
      <div class="node-row">
        <SvgIcon icon="mdi:timer-outline" class="node-row-icon" />
        <span>{{ $t('tools.playDuration', { count: data.totalPlayMinutes }) }}</span>
      </div>
      <div class="node-row">
        <SvgIcon icon="mdi:account-multiple-outline" class="node-row-icon" />
        <span>{{ $t('tools.onlinePlayers') }}: {{ maxPlayers }}</span>
      </div>
    </div>

    <!-- 出边连接点（位置由蛇形流向决定，缺省在节点右侧） -->
    <Handle type="source" :position="data.flowHandle?.source ?? Position.Right" class="flow-node-handle" />
  </div>
</template>

<style scoped lang="scss">
.flow-node {
  width: 240px;
  height: 190px;
  border-radius: 12px;
  overflow: visible;
  /* 主题变量由模态窗根节点派生，未在模态窗内使用时回退到 --n-text-color */
  background: var(--flow-card-bg, color-mix(in srgb, var(--n-text-color, #888) 6%, transparent));
  border: 1px solid var(--flow-border, color-mix(in srgb, var(--n-text-color, #888) 14%, transparent));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: rgba(102, 126, 234, 0.6);
    box-shadow: 0 6px 18px rgba(102, 126, 234, 0.25);
  }

  /* ===== 封面区 ===== */
  .node-cover {
    position: relative;
    height: 100px;
    border-radius: 11px 11px 0 0;
    overflow: hidden;

    .node-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .node-cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      color: var(--flow-text-2, color-mix(in srgb, var(--n-text-color, #888) 40%, transparent));
      background: color-mix(in srgb, var(--n-text-color, #888) 8%, transparent);
    }

    .node-cover-mask {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.6) 100%);
    }

    /* 比分牌：电竞风格，CT 蓝 / T 橙 */
    .node-score {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      overflow: hidden;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.16);
      line-height: 1;
      font-size: 11px;
      font-weight: 700;

      .score-team {
        padding: 3px 6px;
        color: #fff;

        &.ct {
          background: rgba(79, 172, 254, 0.2);
          color: #4facfe;
        }

        &.t {
          background: rgba(240, 160, 32, 0.2);
          color: #f0a020;
        }
      }

      .score-sep {
        padding: 3px 2px;
        color: rgba(255, 255, 255, 0.75);
      }
    }

    .node-map-name {
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 8px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;

      .node-map-name-line {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }

      /* 主名（译名优先）：单行省略 */
      .node-map-name-text {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* 原名副行：更小更淡，单行省略 */
      .node-map-name-origin {
        max-width: 100%;
        font-size: 10.5px;
        color: rgba(255, 255, 255, 0.72);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* 复制图标：默认淡显，hover 时高亮 */
      .node-map-name-copy {
        flex-shrink: 0;
        font-size: 12px;
        opacity: 0.55;
        transition: opacity 0.2s ease, color 0.2s ease;
      }

      &:hover .node-map-name-copy {
        opacity: 1;
        color: #a5b8ff;
      }
    }
  }

  /* ===== 信息区 ===== */
  .node-info {
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;

    .node-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--flow-text-2, color-mix(in srgb, var(--n-text-color, #888) 62%, transparent));
      /* 防止长文本横向溢出（如超长服务器名/时长） */
      overflow: hidden;

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .node-row-icon {
        font-size: 13px;
        color: #667eea;
        flex-shrink: 0;
      }
    }
  }
}

/* ===== 连接点 ===== */
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
