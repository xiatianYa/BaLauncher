<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { NCard, NGrid, NGridItem, NSwitch } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { usePerfMonitorStore } from '@/store/modules/perfMonitor';

defineOptions({ name: 'perfView' });

const emit = defineEmits<{ back: [] }>();

const store = usePerfMonitorStore();

// 解构 store 状态/计算属性 → 模板可直接访问
const {
  loading,
  stats,
  pollInterval,
  INTERVAL_OPTIONS,
  showTemperature,
  showMemSticks,
  showGpuSensors,
  showProcessInfo,
  showSystemInfo,
  miniWindow,
  miniShowCpu,
  miniShowRam,
  miniShowGpu,
  miniShowTemperature,
  hasGpuUsage,
  hasGpuMem,
  hasVirtualMemory,
  effectiveHasGpuTemp,
  effectiveShowSticks,
  effectiveShowGpuSensors,
  effectiveShowSystem,
  effectiveShowProcess,
  gpuMemPercent
} = storeToRefs(store);

/* ===== 格式化工具函数 ===== */

/** 字节 → 可读字符串（精确两位） */
const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 ** 3) return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / (1024 ** 2)).toFixed(0) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
};

/** 字节 → 紧凑格式（1 位小数） */
const formatBytesCompact = (bytes: number): string => {
  if (bytes >= 1024 ** 3) return (bytes / (1024 ** 3)).toFixed(1) + 'G';
  if (bytes >= 1024 ** 2) return (bytes / (1024 ** 2)).toFixed(0) + 'M';
  return (bytes / 1024).toFixed(0) + 'K';
};

/** KB → 可读格式 */
const formatKb = (kb: number): string => {
  if (kb >= 1024) return (kb / 1024).toFixed(0) + ' MB';
  return kb + ' KB';
};

/** 秒 → 运行时长（Xd Yh 或 Xh Ym） */
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/** 使用率 → 颜色（绿 <40 < 黄 <70 < 橙 <90 < 红） */
const usageColor = (percent: number): string => {
  if (percent < 40) return '#4ade80';
  if (percent < 70) return '#fbbf24';
  if (percent < 90) return '#f97316';
  return '#ef4444';
};

/** 温度 → 颜色（绿 <45 < 黄 <65 < 橙 <80 < 红） */
const tempColor = (celsius: number): string => {
  if (celsius < 45) return '#4ade80';
  if (celsius < 65) return '#fbbf24';
  if (celsius < 80) return '#f97316';
  return '#ef4444';
};

/** 每核心平均频率（MHz） */
const avgCoreFreq = computed(() => {
  const freqs = stats.value.cpu.perCoreFreq;
  if (!freqs.length) return 0;
  return Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length);
});

/** MHz → GHz（保留 1 位小数，如 3500 → 3.5） */
const formatGhz = (mhz: number): string => (mhz / 1000).toFixed(1);

/* ===== 生命周期 ===== */

onMounted(() => {
  store.startPolling();
});

onUnmounted(() => {
  // 离开页面时停止页面轮询，但保留桌面浮窗继续运行
  store.stopPolling();
});
</script>

<template>
  <div class="perf-view-container">
    <!-- 页面头部：标题 + 返回按钮 -->
    <div class="header-section">
      <div class="title-section">
        <SvgIcon icon="heroicons:cpu-chip" class="title-icon" />
        <h1 class="page-title">{{ $t('tools.perfViewTitle') }}</h1>
      </div>
      <div class="back-btn" @click="emit('back')">
        <SvgIcon icon="mdi:arrow-left" class="back-icon" />
        <span>{{ $t('keyBind.back') }}</span>
      </div>
    </div>

    <!-- ===== 骨架屏 ===== -->
    <template v-if="loading">
      <div class="perf-body">
        <div class="perf-left">
          <div class="skeleton-container">
            <!-- 第一行骨架：3 张卡片 -->
            <div class="skeleton-row">
              <div v-for="n in 3" :key="'r1-'+n" class="skeleton-card skeleton-card--overview">
                <div class="sk-title" />
                <div class="sk-big" />
                <div class="sk-bar" />
                <div class="sk-line" style="width:60%" />
                <div class="sk-line" style="width:80%" />
                <div class="sk-line" style="width:45%" />
              </div>
            </div>
            <!-- 第三行骨架：2 张卡片 -->
            <div class="skeleton-row">
              <div v-for="n in 2" :key="'r3-'+n" class="skeleton-card skeleton-card--info">
                <div class="sk-title" />
                <div class="sk-line" style="width:70%" />
                <div class="sk-line" style="width:55%" />
                <div class="sk-line" style="width:65%" />
              </div>
            </div>
            <!-- 第四行骨架：CPU 核心卡片 -->
            <div class="skeleton-card skeleton-card--cores">
              <div class="sk-title" />
              <div class="sk-line" style="width:90%" />
              <div class="sk-line" style="width:80%" />
              <div class="sk-line" style="width:85%" />
              <div class="sk-line" style="width:75%" />
            </div>
          </div>
        </div>
        <!-- 右侧骨架占位 -->
        <div class="perf-right">
          <div class="skeleton-card skeleton-card--config">
            <div class="sk-title" />
            <div class="sk-line" style="width:60%" />
            <div class="sk-line" style="width:80%" />
            <div class="sk-line" style="width:50%" />
            <div class="sk-line" style="width:70%" />
            <div class="sk-line" style="width:45%" />
            <div class="sk-line" style="width:55%" />
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 真实数据 ===== -->
    <template v-else>
    <div class="perf-body">

    <!-- ===== 左侧：系统监测数据 ===== -->
    <div class="perf-left">

    <!-- 第一行：CPU / 内存 / GPU -->
    <NGrid :x-gap="14" :y-gap="14" :cols="3" responsive="screen" item-responsive>
      <!-- CPU -->
      <NGridItem span="3 s:3 m:1 l:1">
        <NCard class="panel-card panel-card--overview" :bordered="true" size="small">
          <div class="card-body">
          <div class="card-header"><SvgIcon icon="heroicons:cpu-chip" class="card-icon cpu-color" /><span class="card-title">CPU</span></div>
          <div class="big-value" :style="{ color: usageColor(stats.cpu.usage) }">{{ stats.cpu.usage }}<span class="unit">%</span></div>
          <!-- 型号 -->
          <div class="info-row">{{ stats.cpu.model || '—' }}</div>
          <!-- 详情 -->
          <div class="detail-list">
            <div class="detail-row"><span>{{ $t('perfView.physCores') }}</span><b>{{ stats.cpu.physicalCores }}</b><span class="sep">|</span><span>{{ $t('perfView.logiCores') }}</span><b>{{ stats.cpu.logicalCores }}</b></div>
            <div class="detail-row"><span>{{ $t('perfView.baseClock') }}</span><b>{{ formatGhz(stats.cpu.baseClock) }} GHz</b><span class="sep">|</span><span>{{ $t('perfView.curClock') }}</span><b>{{ formatGhz(stats.cpu.speed) }} GHz</b></div>
            <div class="detail-row"><span>{{ $t('perfView.avgClock') }}</span><b>{{ formatGhz(avgCoreFreq) }} GHz</b><span class="sep">|</span><span>L2</span><b>{{ formatKb(stats.cpu.l2Cache) }}</b></div>
            <div class="detail-row" v-if="stats.cpu.l3Cache"><span>L3 Cache</span><b>{{ formatKb(stats.cpu.l3Cache) }}</b></div>
          </div>
          </div>
        </NCard>
      </NGridItem>

      <!-- 内存 -->
      <NGridItem span="3 s:3 m:1 l:1">
        <NCard class="panel-card panel-card--overview" :bordered="true" size="small">
          <div class="card-body">
          <div class="card-header"><SvgIcon icon="mdi:memory" class="card-icon ram-color" /><span class="card-title">{{ $t('perfView.memory') }}</span></div>
          <div class="big-value" :style="{ color: usageColor(stats.memory.usagePercent) }">{{ stats.memory.usagePercent }}<span class="unit">%</span></div>
          <div class="info-row">{{ formatBytes(stats.memory.used) }} / {{ formatBytes(stats.memory.total) }}</div>
          <div class="detail-list">
            <div class="detail-row"><span>{{ $t('perfView.available') }}</span><b>{{ formatBytesCompact(stats.memory.free) }}</b></div>
            <div class="detail-row" v-if="stats.memory.swapTotal"><span>Swap</span><b>{{ stats.memory.swapUsagePercent }}%</b><span class="sep">|</span><span>{{ $t('perfView.swapUsed') }}</span><b>{{ formatBytesCompact(stats.memory.swapUsed) }} / {{ formatBytesCompact(stats.memory.swapTotal) }}</b></div>
            <div class="detail-row" v-if="hasVirtualMemory"><span>{{ $t('perfView.virtualMem') }}</span><b>{{ formatBytesCompact(stats.memory.virtualTotal - stats.memory.virtualFree) }} / {{ formatBytesCompact(stats.memory.virtualTotal) }}</b></div>
          </div>
          <!-- 内存条 -->
          <div v-if="effectiveShowSticks" class="sticks">
            <div class="sticks-title">{{ $t('perfView.memSticks') }} <span class="sticks-count">{{ stats.memory.sticks.length }}</span></div>
            <div v-for="(stick, idx) in stats.memory.sticks" :key="idx" class="stick-row">
              <span class="stick-cap">{{ formatBytesCompact(stick.capacity) }}</span>
              <span class="stick-type">{{ stick.type }} {{ stick.speed }}MHz</span>
              <span class="stick-mfr">{{ stick.manufacturer }}</span>
            </div>
          </div>
          </div>
        </NCard>
      </NGridItem>

      <!-- GPU -->
      <NGridItem span="3 s:3 m:1 l:1">
        <NCard class="panel-card panel-card--overview" :bordered="true" size="small">
          <div class="card-body">
          <div class="card-header"><SvgIcon icon="mdi:expansion-card" class="card-icon gpu-color" /><span class="card-title">GPU</span></div>
          <template v-if="hasGpuUsage">
            <div class="big-value" :style="{ color: usageColor(stats.gpu.usagePercent!) }">{{ stats.gpu.usagePercent }}<span class="unit">%</span></div>
          </template>
          <template v-else>
            <div class="gpu-fallback-name">{{ stats.gpu.model || $t('perfView.noData') }}</div>
          </template>
          <!-- 温度 -->
          <div class="temp-row" v-if="effectiveHasGpuTemp"><SvgIcon icon="mdi:thermometer" class="temp-icon" :style="{ color: tempColor(stats.gpu.temperature!) }" /><span class="temp-value" :style="{ color: tempColor(stats.gpu.temperature!) }">{{ stats.gpu.temperature }}°C</span></div>
          <!-- 显存 -->
          <div v-if="hasGpuMem" class="vram">
            <div class="vram-label">{{ $t('perfView.vram') }}</div>
            <div class="vram-row">
              <div class="vram-bar"><div class="vram-fill" :style="{ width: gpuMemPercent + '%', backgroundColor: usageColor(gpuMemPercent) }" /></div>
              <span class="vram-text">{{ formatBytesCompact(stats.gpu.memoryUsed!) }} / {{ formatBytesCompact(stats.gpu.memoryTotal!) }}</span>
            </div>
          </div>
          <!-- GPU 传感器 -->
          <div v-if="effectiveShowGpuSensors" class="gpu-sensors">
            <div class="sensor" v-if="stats.gpu.coreClock !== null"><SvgIcon icon="mdi:sine-wave" class="sensor-icon" /><span>{{ $t('perfView.gpuCore') }}</span><b>{{ formatGhz(stats.gpu.coreClock!) }} GHz</b></div>
            <div class="sensor" v-if="stats.gpu.memClock !== null"><SvgIcon icon="mdi:memory" class="sensor-icon" /><span>{{ $t('perfView.gpuMem') }}</span><b>{{ formatGhz(stats.gpu.memClock!) }} GHz</b></div>
            <div class="sensor" v-if="stats.gpu.powerDraw !== null"><SvgIcon icon="mdi:flash" class="sensor-icon" /><span>{{ $t('perfView.gpuPower') }}</span><b :style="{ color: usageColor(stats.gpu.powerDraw) }">{{ stats.gpu.powerDraw }} W</b></div>
            <div class="sensor" v-if="stats.gpu.fanSpeed !== null"><SvgIcon icon="mdi:fan" class="sensor-icon" /><span>{{ $t('perfView.gpuFan') }}</span><b>{{ stats.gpu.fanSpeed }}%</b></div>
          </div>
          <!-- GPU 信息 -->
          <div class="detail-list">
            <div class="detail-row" v-if="stats.gpu.model"><span>{{ $t('perfView.gpuModel') }}</span><b>{{ stats.gpu.model }}</b></div>
            <div class="detail-row" v-if="stats.gpu.adapterRam"><span>{{ $t('perfView.vram') }}</span><b>{{ formatBytes(stats.gpu.adapterRam) }}</b></div>
            <div class="detail-row" v-if="stats.gpu.driverVersion"><span>{{ $t('perfView.gpuDriver') }}</span><b>{{ stats.gpu.driverVersion }}</b></div>
          </div>
          </div>
        </NCard>
      </NGridItem>
    </NGrid>

    <!-- 第三行：进程 + 系统信息 -->
    <NGrid :x-gap="14" :y-gap="14" :cols="2" responsive="screen" item-responsive>
      <NGridItem span="2 s:1 m:1 l:1" v-if="effectiveShowProcess">
        <NCard class="panel-card panel-card--info" :bordered="true" size="small">
          <div class="card-body">
          <div class="card-header"><SvgIcon icon="mdi:application-brackets" class="card-icon proc-color" /><span class="card-title">{{ $t('perfView.process') }}</span></div>
          <div class="detail-list">
            <div class="detail-row"><span>{{ $t('perfView.procMemory') }}</span><b>{{ formatBytesCompact(stats.process.memoryUsage) }}</b></div>
            <div class="detail-row"><span>{{ $t('perfView.procHeap') }}</span><b>{{ formatBytesCompact(stats.process.heapUsed) }} / {{ formatBytesCompact(stats.process.heapTotal) }}</b></div>
            <div class="detail-row"><span>{{ $t('perfView.procCpu') }}</span><b :style="{ color: usageColor(stats.process.cpuUsage) }">{{ stats.process.cpuUsage }}%</b></div>
          </div>
          </div>
        </NCard>
      </NGridItem>
      <NGridItem span="2 s:1 m:1 l:1" v-if="effectiveShowSystem">
        <NCard class="panel-card panel-card--info" :bordered="true" size="small">
          <div class="card-body">
          <div class="card-header"><SvgIcon icon="mdi:desktop-tower-monitor" class="card-icon sys-color" /><span class="card-title">{{ $t('perfView.systemInfo') }}</span></div>
          <div class="detail-list">
            <div class="detail-row"><span>{{ $t('perfView.hostname') }}</span><b>{{ stats.system.hostname || '—' }}</b></div>
            <div class="detail-row"><span>{{ $t('perfView.os') }}</span><b>{{ stats.system.platform }} {{ stats.system.arch }}</b></div>
            <div class="detail-row"><span>{{ $t('perfView.uptime') }}</span><b>{{ formatUptime(stats.system.uptime) }}</b></div>
            <div class="detail-row"><span>{{ $t('perfView.totalRam') }}</span><b>{{ formatBytes(stats.system.totalMem) }}</b></div>
          </div>
          </div>
        </NCard>
      </NGridItem>
    </NGrid>

    <!-- 第四行：CPU 各核心使用率 -->
    <NCard class="panel-card panel-card--cores" :bordered="true" size="small">
      <div class="card-body">
      <div class="card-header"><SvgIcon icon="heroicons:cpu-chip" class="card-icon cpu-color" /><span class="card-title">{{ $t('perfView.cores') }}</span></div>
      <div class="percore-grid">
        <div class="percore" v-for="(u, i) in stats.cpu.perCoreUsage" :key="i">
          <div class="percore-head">
            <span class="percore-idx">{{ $t('perfView.core') }} {{ i + 1 }}</span>
            <span class="percore-val" :style="{ color: usageColor(u) }">{{ u }}%</span>
          </div>
          <div class="percore-track">
            <div class="percore-fill" :style="{ width: u + '%', backgroundColor: usageColor(u) }" />
          </div>
        </div>
      </div>
      </div>
    </NCard>

    </div>
    <!-- ===== /左侧 ===== -->

    <!-- ===== 右侧：参数配置 ===== -->
    <div class="perf-right">
      <NCard class="config-card" :bordered="true" size="small">
        <div class="config-header">
          <SvgIcon icon="mdi:cog" class="config-header-icon" />
          <span class="config-header-title">{{ $t('perfView.config') }}</span>
        </div>

        <!-- 轮询间隔 -->
        <div class="config-group">
          <div class="config-label">{{ $t('perfView.pollInterval') }}</div>
          <div class="config-options">
            <button
              v-for="opt in INTERVAL_OPTIONS"
              :key="opt.value"
              class="config-btn"
              :class="{ active: pollInterval === opt.value }"
              @click="store.applyPollInterval(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- 页面显示开关 -->
        <div class="config-group">
          <div class="config-label">{{ $t('perfView.pageDisplay') }}</div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:thermometer" class="config-item-icon" />
              <span>{{ $t('perfView.showTemp') }}</span>
            </div>
            <NSwitch v-model:value="showTemperature" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:memory" class="config-item-icon" />
              <span>{{ $t('perfView.showMemSticks') }}</span>
            </div>
            <NSwitch v-model:value="showMemSticks" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:expansion-card" class="config-item-icon" />
              <span>{{ $t('perfView.showGpuSensors') }}</span>
            </div>
            <NSwitch v-model:value="showGpuSensors" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:application-brackets" class="config-item-icon" />
              <span>{{ $t('perfView.showProcess') }}</span>
            </div>
            <NSwitch v-model:value="showProcessInfo" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:desktop-tower-monitor" class="config-item-icon" />
              <span>{{ $t('perfView.showSystem') }}</span>
            </div>
            <NSwitch v-model:value="showSystemInfo" size="small" />
          </div>
        </div>

        <!-- 浮窗配置（独立于页面配置） -->
        <div class="config-group">
          <div class="config-label">{{ $t('perfView.miniWindow') }}</div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:monitor-small" class="config-item-icon" />
              <span>{{ $t('perfView.enableMiniWindow') }}</span>
            </div>
            <NSwitch v-model:value="miniWindow" size="small" @update:value="store.toggleMiniWindow" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="heroicons:cpu-chip" class="config-item-icon" />
              <span>{{ $t('perfView.miniShowCpu') }}</span>
            </div>
            <NSwitch v-model:value="miniShowCpu" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:memory" class="config-item-icon" />
              <span>{{ $t('perfView.miniShowRam') }}</span>
            </div>
            <NSwitch v-model:value="miniShowRam" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:expansion-card" class="config-item-icon" />
              <span>{{ $t('perfView.miniShowGpu') }}</span>
            </div>
            <NSwitch v-model:value="miniShowGpu" size="small" />
          </div>
          <div class="config-item">
            <div class="config-item-left">
              <SvgIcon icon="mdi:thermometer" class="config-item-icon" />
              <span>{{ $t('perfView.miniShowTemp') }}</span>
            </div>
            <NSwitch v-model:value="miniShowTemperature" size="small" />
          </div>
        </div>
      </NCard>
    </div>
    <!-- ===== /右侧 ===== -->

    </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.perf-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 14px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(var(--app-rgb), 0.12); border-radius: 2px; }

  // === 页面头部（完全对齐 BotGroup 风格） ===

  .header-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;

    .title-section {
      display: flex;
      align-items: center;
      gap: 12px;

      .title-icon {
        font-size: 24px;
        color: #667eea;
      }

      .page-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: var(--n-text-color);
        letter-spacing: 0.5px;
      }
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
      color: #667eea;
      background: rgba(102, 126, 234, 0.15);
      border: 1px solid rgba(var(--app-rgb), 0.1);
      transition: all 0.3s ease;

      &:hover {
        background: rgba(102, 126, 234, 0.3);
      }

      .back-icon {
        font-size: 20px;
      }
    }
  }

  // === 左右布局 ===

  .perf-body {
    display: flex;
    gap: 14px;
    flex: 1;
    min-height: 0;
  }

  .perf-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .perf-right {
    width: 240px;
    flex-shrink: 0;
  }

  // === 卡片骨架 ===

  .panel-card {
    border-radius: 12px;

    :deep(.n-card-content) {
      padding: 0;
      overflow-y: auto;

      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb { background: rgba(var(--app-rgb), 0.12); border-radius: 2px; }
    }

    // 概览卡片（CPU / 内存 / GPU）：固定 216px
    &--overview { height: 216px; }
    // 信息卡片（进程 / 系统）：固定 154px
    &--info { height: 154px; }
    // 核心卡片（CPU 各核心）：固定 200px
    &--cores { height: 200px; }
  }

  .card-body {
    padding: 12px 14px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    .card-icon {
      font-size: 18px;

      &.cpu-color {
        color: #667eea;
      }

      &.ram-color {
        color: #f59e0b;
      }

      &.gpu-color {
        color: #10b981;
      }

      &.proc-color {
        color: #f472b6;
      }

      &.sys-color {
        color: #6366f1;
      }
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: rgba(var(--app-rgb), 0.7);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .card-subtitle {
      margin-left: auto;
      font-size: 11px;
      color: rgba(var(--app-rgb), 0.35);
    }
  }

  // === 大数值 ===

  .big-value {
    font-size: 24px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -1px;

    .unit {
      font-size: 13px;
      font-weight: 600;
      margin-left: 2px;
    }
  }

  .info-row {
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // === 温度 ===

  .temp-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;

    .temp-icon {
      font-size: 16px;

      &.muted {
        color: rgba(var(--app-rgb), 0.2);
      }
    }

    .temp-value {
      font-size: 14px;
      font-weight: 700;
    }

    .temp-na {
      font-size: 11px;
      color: rgba(var(--app-rgb), 0.2);
    }
  }

  // === 详情列表 ===

  .detail-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 4px;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: rgba(var(--app-rgb), 0.4);

    b {
      color: rgba(var(--app-rgb), 0.65);
      font-weight: 600;
    }

    .sep {
      margin: 0 6px;
      opacity: 0.25;
    }
  }

  // === GPU 专用 ===

  .gpu-fallback-name {
    font-size: 14px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.85);
    min-height: 38px;
    display: flex;
    align-items: center;
  }

  .vram {
    .vram-label {
      font-size: 10px;
      color: rgba(var(--app-rgb), 0.35);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .vram-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .vram-bar {
      flex: 1;
      height: 10px;
      background: rgba(var(--app-rgb), 0.06);
      border-radius: 4px;
      overflow: hidden;
    }

    .vram-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s;
      min-width: 2px;
    }

    .vram-text {
      font-size: 11px;
      font-weight: 600;
      color: rgba(var(--app-rgb), 0.55);
      white-space: nowrap;
    }
  }

  .gpu-sensors {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin: 6px 0;
  }

  .sensor {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: rgba(var(--app-rgb), 0.45);

    .sensor-icon {
      font-size: 13px;
      color: rgba(var(--app-rgb), 0.3);
    }

    b {
      color: rgba(var(--app-rgb), 0.7);
      font-weight: 600;
    }
  }

  // === CPU 各核心 ===

  .percore-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 6px 12px;
  }

  .percore-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3px;

    .percore-idx {
      font-size: 11px;
      color: rgba(var(--app-rgb), 0.5);
    }

    .percore-val {
      font-size: 12px;
      font-weight: 700;
    }
  }

  .percore-track {
    height: 3px;
    border-radius: 2px;
    background: rgba(var(--app-rgb), 0.08);
    overflow: hidden;

    .percore-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
  }

  // === 内存条 ===

  .sticks {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid rgba(var(--app-rgb), 0.06);
  }

  .sticks-title {
    font-size: 10px;
    color: rgba(var(--app-rgb), 0.35);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;

    .sticks-count {
      opacity: 0.6;
    }
  }

  .stick-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    padding: 2px 0;

    .stick-cap {
      font-weight: 600;
      color: rgba(var(--app-rgb), 0.65);
    }

    .stick-type {
      color: rgba(var(--app-rgb), 0.45);
    }

    .stick-mfr {
      color: rgba(var(--app-rgb), 0.3);
      margin-left: auto;
      font-size: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100px;
    }
  }

  // === 骨架屏 ===

  @keyframes perf-skeleton-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
  }

  .skeleton-row {
    display: flex;
    gap: 14px;
  }

  .skeleton-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border-radius: 12px;
    background: rgba(var(--app-rgb), 0.03);
    border: 1px solid rgba(var(--app-rgb), 0.06);

    &--overview { height: 216px; }
    &--info { height: 154px; }
    &--cores { height: 200px; }
    &--config { height: 280px; }
  }

  .sk-title {
    width: 80px;
    height: 14px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      rgba(var(--app-rgb), 0.06) 25%,
      rgba(var(--app-rgb), 0.12) 50%,
      rgba(var(--app-rgb), 0.06) 75%
    );
    background-size: 200% 100%;
    animation: perf-skeleton-shimmer 1.5s ease-in-out infinite;
  }

  .sk-big {
    width: 120px;
    height: 44px;
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      rgba(var(--app-rgb), 0.06) 25%,
      rgba(var(--app-rgb), 0.12) 50%,
      rgba(var(--app-rgb), 0.06) 75%
    );
    background-size: 200% 100%;
    animation: perf-skeleton-shimmer 1.5s ease-in-out infinite;
  }

  .sk-bar {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      rgba(var(--app-rgb), 0.06) 25%,
      rgba(var(--app-rgb), 0.12) 50%,
      rgba(var(--app-rgb), 0.06) 75%
    );
    background-size: 200% 100%;
    animation: perf-skeleton-shimmer 1.5s ease-in-out infinite;
  }

  .sk-line {
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      rgba(var(--app-rgb), 0.06) 25%,
      rgba(var(--app-rgb), 0.12) 50%,
      rgba(var(--app-rgb), 0.06) 75%
    );
    background-size: 200% 100%;
    animation: perf-skeleton-shimmer 1.5s ease-in-out infinite;
  }

  // === 右侧配置面板 ===

  .config-card {
    border-radius: 12px;
    position: sticky;
    top: 0;
    max-height: calc(100vh - 100px);
    overflow: hidden;

    :deep(.n-card-content) {
      padding: 16px;
      overflow-y: auto;
      max-height: calc(100vh - 100px);

      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb { background: rgba(var(--app-rgb), 0.12); border-radius: 2px; }
    }
  }

  .config-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(var(--app-rgb), 0.06);

    .config-header-icon {
      font-size: 18px;
      color: #667eea;
    }

    .config-header-title {
      font-size: 14px;
      font-weight: 700;
      color: rgba(var(--app-rgb), 0.75);
    }
  }

  .config-group {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .config-label {
    font-size: 11px;
    font-weight: 600;
    color: rgba(var(--app-rgb), 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .config-options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .config-btn {
    flex: 1;
    min-width: 40px;
    padding: 5px 8px;
    border: 1px solid rgba(var(--app-rgb), 0.1);
    border-radius: 6px;
    background: rgba(var(--app-rgb), 0.03);
    color: rgba(var(--app-rgb), 0.5);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(var(--app-rgb), 0.06);
    }

    &.active {
      background: rgba(102, 126, 234, 0.15);
      border-color: rgba(102, 126, 234, 0.3);
      color: #667eea;
    }
  }

  .config-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;

    & + & {
      border-top: 1px solid rgba(var(--app-rgb), 0.04);
    }
  }

  .config-item-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.6);

    .config-item-icon {
      font-size: 14px;
      color: rgba(var(--app-rgb), 0.35);
    }
  }
}
</style>
