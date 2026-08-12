import { defineStore } from 'pinia'
import { SetupStoreId } from '@/enum'
import { computed, ref, watch } from 'vue'

/** 性能数据默认空值 */
const EMPTY_SNAPSHOT: PerfMonitor.PerfSnapshot = {
  cpu: { model: '', physicalCores: 0, logicalCores: 0, baseClock: 0, l2Cache: 0, l3Cache: 0, speed: 0, usage: 0, temperature: null, perCoreUsage: [], perCoreFreq: [] },
  memory: { total: 0, used: 0, free: 0, usagePercent: 0, swapTotal: 0, swapUsed: 0, swapFree: 0, swapUsagePercent: 0, virtualTotal: 0, virtualFree: 0, sticks: [] },
  gpu: { model: '', adapterRam: 0, driverVersion: '', temperature: null, usagePercent: null, memoryUsed: null, memoryTotal: null, coreClock: null, memClock: null, powerDraw: null, fanSpeed: null },
  process: { memoryUsage: 0, heapUsed: 0, heapTotal: 0, cpuUsage: 0 },
  system: { hostname: '', platform: '', arch: '', uptime: 0, totalMem: 0 }
}

export const usePerfMonitorStore = defineStore(SetupStoreId.PerfMonitor, () => {
  /* ===== 数据 ===== */

  /** 是否正在加载首屏数据 */
  const loading = ref(true)

  /** 当前性能快照 */
  const stats = ref<PerfMonitor.PerfSnapshot>({ ...EMPTY_SNAPSHOT })

  /** 轮询定时器 */
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  /* ===== 配置（新增/修改配置项时需同步更新 PerfMonitor.PerfConfig 类型定义） ===== */

  /** 可选的轮询间隔 */
  const INTERVAL_OPTIONS: PerfMonitor.PollIntervalOption[] = [
    { label: '1s', value: 1000 },
    { label: '2s', value: 2000 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 }
  ]

  /** 当前轮询间隔 @see PerfMonitor.PerfConfig.pollInterval */
  const pollInterval = ref(2000)

  /** 是否显示温度 @see PerfMonitor.PerfConfig.showTemperature */
  const showTemperature = ref(true)
  /** 是否显示内存条信息 @see PerfMonitor.PerfConfig.showMemSticks */
  const showMemSticks = ref(true)
  /** 是否显示 GPU 传感器 @see PerfMonitor.PerfConfig.showGpuSensors */
  const showGpuSensors = ref(true)
  /** 是否显示进程信息卡片 @see PerfMonitor.PerfConfig.showProcessInfo */
  const showProcessInfo = ref(true)
  /** 是否显示系统信息卡片 @see PerfMonitor.PerfConfig.showSystemInfo */
  const showSystemInfo = ref(true)
  /** 是否开启小窗模式 @see PerfMonitor.PerfConfig.miniWindow */
  const miniWindow = ref(false)

  /* ===== 浮窗配置（独立于页面面板，新增/修改时需同步 PerfMonitor.PerfMiniConfig） ===== */

  /** 是否在浮窗中显示 FPS 帧率 @see PerfMonitor.PerfMiniConfig.showFps */
  const miniShowFps = ref(true)
  /** 是否在浮窗中显示 CPU 使用率 @see PerfMonitor.PerfMiniConfig.showCpu */
  const miniShowCpu = ref(true)
  /** 是否在浮窗中显示内存使用率 @see PerfMonitor.PerfMiniConfig.showRam */
  const miniShowRam = ref(true)
  /** 是否在浮窗中显示 GPU 使用率 @see PerfMonitor.PerfMiniConfig.showGpu */
  const miniShowGpu = ref(true)
  /** 是否在浮窗中显示温度 @see PerfMonitor.PerfMiniConfig.showTemperature */
  const miniShowTemperature = ref(true)

  /* ===== 计算属性（数据检测） ===== */

  /** CPU 温度是否可用 */
  const hasCpuTemp = computed(() => stats.value.cpu.temperature !== null)
  /** NVIDIA GPU 实时使用率是否可用 */
  const hasGpuUsage = computed(() => stats.value.gpu.usagePercent !== null)
  /** GPU 传感器数据是否可用 */
  const hasGpuSensors = computed(
    () => stats.value.gpu.coreClock !== null || stats.value.gpu.memClock !== null || stats.value.gpu.powerDraw !== null || stats.value.gpu.fanSpeed !== null
  )
  /** 显存数据是否可用 */
  const hasGpuMem = computed(() => (stats.value.gpu.memoryTotal ?? 0) > 0)
  /** 内存条数据是否可用 */
  const hasMemorySticks = computed(() => stats.value.memory.sticks.length > 0)
  /** 虚拟内存数据是否可用 */
  const hasVirtualMemory = computed(() => stats.value.memory.virtualTotal > 0)

  /* ===== 控制显示的计算属性（开关 × 数据可用性） ===== */

  const effectiveHasCpuTemp = computed(() => showTemperature.value && hasCpuTemp.value)
  const effectiveHasGpuTemp = computed(() => showTemperature.value && stats.value.gpu.temperature !== null)
  const effectiveShowSticks = computed(() => showMemSticks.value && hasMemorySticks.value)
  const effectiveShowGpuSensors = computed(() => showGpuSensors.value && hasGpuSensors.value)
  const effectiveShowSystem = computed(() => showSystemInfo.value)
  const effectiveShowProcess = computed(() => showProcessInfo.value)

  /** 显存使用率（%） */
  const gpuMemPercent = computed(() => {
    if (!hasGpuMem.value) return 0
    return Math.round((stats.value.gpu.memoryUsed! / stats.value.gpu.memoryTotal!) * 1000) / 10
  })

  /* ===== 操作 ===== */

  /** 从主进程拉取性能数据 */
  async function fetchStats() {
    try {
      const data = await window.ipcRenderer.getSystemStats()
      if (data) { stats.value = data }
      if (loading.value) loading.value = false
    } catch (err) {
      console.error('[perfMonitor] 获取性能数据失败:', err)
      if (loading.value) loading.value = false
    }
  }

  /** 启动轮询 */
  function startPolling(interval = pollInterval.value) {
    stopPolling()
    refreshTimer = setInterval(fetchStats, interval)
    fetchStats()
  }

  /** 停止轮询 */
  function stopPolling() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  /** 应用新的轮询间隔 */
  function applyPollInterval(ms: number) {
    pollInterval.value = ms
    startPolling(ms)
  }

  /** 切换小窗模式 */
  async function toggleMiniWindow(val: boolean) {
    miniWindow.value = val
    try {
      if (val) {
        // 传递浮窗专用配置（与页面配置独立）
        await window.ipcRenderer.openPerfMiniWindow?.({
          showFps: miniShowFps.value,
          showCpu: miniShowCpu.value,
          showRam: miniShowRam.value,
          showGpu: miniShowGpu.value,
          showTemperature: miniShowTemperature.value
        })
      } else {
        await window.ipcRenderer.closePerfMiniWindow?.()
      }
    } catch (err) {
      console.error('[perfMonitor] 小窗操作失败:', err)
      miniWindow.value = false
    }
  }

  /** 同步浮窗配置到主进程（运行时修改浮窗配置时调用） */
  async function syncMiniConfig() {
    try {
      await window.ipcRenderer.updatePerfMiniConfig?.({
        showFps: miniShowFps.value,
        showCpu: miniShowCpu.value,
        showRam: miniShowRam.value,
        showGpu: miniShowGpu.value,
        showTemperature: miniShowTemperature.value
      })
    } catch (err) {
      console.error('[perfMonitor] 同步浮窗配置失败:', err)
    }
  }

  // 浮窗配置变化时自动同步到主进程（仅浮窗已开启时）
  watch([miniShowFps, miniShowCpu, miniShowRam, miniShowGpu, miniShowTemperature], () => {
    if (miniWindow.value) syncMiniConfig()
  })

  return {
    // 数据
    loading,
    stats,
    // 配置
    INTERVAL_OPTIONS,
    pollInterval,
    showTemperature,
    showMemSticks,
    showGpuSensors,
    showProcessInfo,
    showSystemInfo,
    miniWindow,
    // 浮窗配置
    miniShowFps,
    miniShowCpu,
    miniShowRam,
    miniShowGpu,
    miniShowTemperature,
    // 计算属性
    hasCpuTemp,
    hasGpuUsage,
    hasGpuSensors,
    hasGpuMem,
    hasMemorySticks,
    hasVirtualMemory,
    effectiveHasCpuTemp,
    effectiveHasGpuTemp,
    effectiveShowSticks,
    effectiveShowGpuSensors,
    effectiveShowSystem,
    effectiveShowProcess,
    gpuMemPercent,
    // 操作
    fetchStats,
    startPolling,
    stopPolling,
    applyPollInterval,
    toggleMiniWindow
  }
})
