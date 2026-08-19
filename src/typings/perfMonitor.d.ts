/** 性能监测类型定义 */

declare namespace PerfMonitor {

  /** CPU 指标 */
  interface CpuStats {
    /** CPU 型号 */
    model: string
    /** 物理核心数 */
    physicalCores: number
    /** 逻辑核心数 */
    logicalCores: number
    /** 基准频率（MHz） */
    baseClock: number
    /** L2 缓存大小（KB） */
    l2Cache: number
    /** L3 缓存大小（KB） */
    l3Cache: number
    /** 当前实时频率（MHz） */
    speed: number
    /** 整体使用率（%） */
    usage: number
    /** 每核心使用率数组 */
    perCoreUsage: number[]
    /** 每核心实时频率数组 */
    perCoreFreq: number[]
  }

  /** 内存指标 */
  interface MemoryStats {
    /** 物理内存总量（字节） */
    total: number
    /** 已用（字节） */
    used: number
    /** 空闲（字节） */
    free: number
    /** 使用率（%） */
    usagePercent: number
    /** Swap 分页文件总量（字节） */
    swapTotal: number
    /** Swap 已用（字节） */
    swapUsed: number
    /** Swap 空闲（字节） */
    swapFree: number
    /** Swap 使用率（%） */
    swapUsagePercent: number
    /** 虚拟内存提交总量（字节） */
    virtualTotal: number
    /** 虚拟内存空闲（字节） */
    virtualFree: number
    /** 物理内存条列表 */
    sticks: MemStick[]
  }

  /** 单条物理内存信息 */
  interface MemStick {
    /** 频率（MHz） */
    speed: number
    /** 类型（DDR4/DDR5 等） */
    type: string
    /** 制造商 */
    manufacturer: string
    /** 容量（字节） */
    capacity: number
  }

  /** GPU 指标（实时传感器数据依赖 nvidia-smi，非 NVIDIA 卡为 null） */
  interface GpuStats {
    /** GPU 型号 */
    model: string
    /** 专用显存总量（字节） */
    adapterRam: number
    /** 驱动版本 */
    driverVersion: string
    /** 温度（°C） */
    temperature: number | null
    /** GPU 使用率（%） */
    usagePercent: number | null
    /** 已用显存（字节） */
    memoryUsed: number | null
    /** 总显存（字节） */
    memoryTotal: number | null
    /** 核心频率（MHz） */
    coreClock: number | null
    /** 显存频率（MHz） */
    memClock: number | null
    /** 功耗（W） */
    powerDraw: number | null
    /** 风扇转速（%） */
    fanSpeed: number | null
  }

  /** 启动器进程指标 */
  interface ProcessStats {
    /** 进程 RSS 内存（字节） */
    memoryUsage: number
    /** V8 堆已用（字节） */
    heapUsed: number
    /** V8 堆总量（字节） */
    heapTotal: number
    /** 进程 CPU 使用率（%） */
    cpuUsage: number
  }

  /** 系统信息 */
  interface SystemInfo {
    /** 主机名 */
    hostname: string
    /** 操作系统平台 */
    platform: string
    /** CPU 架构 */
    arch: string
    /** 系统运行时长（秒） */
    uptime: number
    /** 物理内存总量（字节） */
    totalMem: number
  }

  /** 完整性能快照 */
  interface PerfSnapshot {
    cpu: CpuStats
    memory: MemoryStats
    gpu: GpuStats
    process: ProcessStats
    system: SystemInfo
  }

  // ===== 配置类型（控制面板中各模块的显示/隐藏） =====

  /** 轮询间隔选项 */
  interface PollIntervalOption {
    label: string
    value: number
  }

  /** 性能监测面板配置 — 修改此处会直接影响面板中对应模块的显示/隐藏 */
  interface PerfConfig {
    /** 轮询间隔（毫秒），默认 2000 */
    pollInterval: number
    /** 是否显示 GPU 温度 */
    showTemperature: boolean
    /** 是否显示物理内存条详情 */
    showMemSticks: boolean
    /** 是否显示 GPU 传感器（核心频率/显存频率/功耗/风扇） */
    showGpuSensors: boolean
    /** 是否显示启动器进程信息卡片 */
    showProcessInfo: boolean
    /** 是否显示系统信息卡片 */
    showSystemInfo: boolean
    /** 是否开启桌面小窗模式 */
    miniWindow: boolean
  }

  /** 桌面浮窗配置 — 独立于页面面板，仅控制浮窗内显示内容 */
  interface PerfMiniConfig {
    /** 是否显示 CPU 使用率 */
    showCpu: boolean
    /** 是否显示内存使用率 */
    showRam: boolean
    /** 是否显示 GPU 使用率 */
    showGpu: boolean
    /** 是否显示 GPU 温度 */
    showTemperature: boolean
    /** 浮窗在屏幕上的显示位置（九宫格） */
    position: MiniTrayPosition
  }

  /** 浮窗九宫格显示位置：top/middle/bottom × left/center/right */
  type MiniTrayPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'middle-left'
    | 'center'
    | 'middle-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
}
