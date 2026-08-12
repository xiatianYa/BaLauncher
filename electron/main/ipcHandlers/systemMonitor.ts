import { ipcMain } from 'electron'
import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

// ===== 快照存储 =====
let lastTotalSnapshot: { total: number; idle: number } | null = null
let lastCoreSnapshots: { total: number; idle: number }[] | null = null

// ===== 静态缓存（只查一次） =====
let cpuStaticInfo: { physicalCores: number; logicalCores: number; l2Cache: number; l3Cache: number; baseClock: number } | null = null
let memoryStaticInfo: { sticks: { speed: number; type: string; manufacturer: string; capacity: number }[] } | null = null
let gpuStaticInfo: { model: string; adapterRam: number; driverVersion: string } | null = null
let isInitialized = false

/** 防重入锁：防止多次采集同时执行（async 不阻塞主线程，但防止请求堆积） */
let isCollecting = false

/** 小窗配置缓存（从渲染进程打开小窗时传入，与 PerfMonitor.PerfMiniConfig 同步） */
interface PerfMiniConfig {
  /** 是否显示 FPS 帧率 */
  showFps: boolean
  /** 是否显示 CPU 使用率 */
  showCpu: boolean
  /** 是否显示内存使用率 */
  showRam: boolean
  /** 是否显示 GPU 使用率 */
  showGpu: boolean
  /** 是否显示 CPU / GPU 温度 */
  showTemperature: boolean
}
let miniConfig: PerfMiniConfig = {
  showFps: true,
  showCpu: true,
  showRam: true,
  showGpu: true,
  showTemperature: true
}

/** 设置小窗配置（渲染进程调用 openPerfMiniWindow 时传入） */
export function setMiniConfig(cfg: PerfMiniConfig) {
  miniConfig = cfg
}

// ===== 工具 =====

function coreSnapshot(core: os.CpuInfo) {
  let total = 0
  for (const t of Object.values(core.times)) total += t
  return { total, idle: core.times.idle }
}

function calcUsage(curr: { total: number; idle: number }, prev: { total: number; idle: number }): number {
  const td = curr.total - prev.total
  const id = curr.idle - prev.idle
  if (td <= 0) return 0
  return Math.min(100, Math.max(0, Math.round(((td - id) / td) * 1000) / 10))
}

/** 异步执行命令，失败返回 null */
async function execQuiet(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(cmd, { encoding: 'utf-8', timeout: 4000, windowsHide: true })
    return stdout
  } catch {
    return null
  }
}

/** 安全解析数字 */
function safeInt(s: string | undefined): number {
  const v = parseInt(s || '', 10)
  return isNaN(v) ? 0 : v
}

/** 安全解析浮点 */
function safeFloat(s: string | undefined): number | null {
  const v = parseFloat(s || '')
  return isNaN(v) ? null : v
}

// ===== CPU 温度 =====

async function getCpuTemperature(): Promise<number | null> {
  const out = await execQuiet('wmic /namespace:\\\\root\\wmi path MSAcpi_ThermalZoneTemperature get CurrentTemperature /value')
  if (!out) return null
  const m = out.match(/CurrentTemperature=(\d+)/i)
  if (!m) return null
  return Math.round(((parseInt(m[1], 10) / 10) - 273.15) * 10) / 10
}

// ===== 静态 CPU 信息 =====

async function initCpuStatic() {
  if (cpuStaticInfo) return
  const cpus = os.cpus()
  const logicalCores = cpus.length
  let physicalCores = logicalCores
  let l2Cache = 0
  let l3Cache = 0
  let baseClock = cpus[0]?.speed || 0

  const out = await execQuiet('wmic cpu get L2CacheSize,L3CacheSize,MaxClockSpeed,NumberOfCores,NumberOfLogicalProcessors /format:csv')
  if (out) {
    const lines = out.trim().split(/\r?\n/)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length < 6) continue
      const nc = safeInt(cols[4])
      const nl = safeInt(cols[5])
      if (nc > 0) physicalCores = nc
      if (nl > 0) physicalCores = nc // 取第一个 CPU 的实际物理核心
      const l2 = safeInt(cols[2])
      const l3 = safeInt(cols[3])
      if (l2 > 0) l2Cache = l2
      if (l3 > 0) l3Cache = l3
      const mcs = safeInt(cols[1])
      if (mcs > 0) baseClock = mcs
      break
    }
  }

  cpuStaticInfo = { physicalCores, logicalCores, l2Cache, l3Cache, baseClock }
}

// ===== 静态内存信息 =====

async function initMemoryStatic() {
  if (memoryStaticInfo) return
  const sticks: { speed: number; type: string; manufacturer: string; capacity: number }[] = []
  const out = await execQuiet('wmic memorychip get Speed,MemoryType,Manufacturer,Capacity,ConfiguredClockSpeed,SMBIOSMemoryType /format:csv')
  if (out) {
    const lines = out.trim().split(/\r?\n/)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length < 7) continue
      const cap = safeInt(cols[3])
      if (cap <= 0) continue
      const speed = safeInt(cols[4]) || safeInt(cols[1])
      let type = ''
      const smbiosType = safeInt(cols[5])
      // SMBIOS memory type mapping
      const typeMap: Record<number, string> = { 20: 'DDR', 21: 'DDR2', 22: 'DDR2 FB-DIMM', 24: 'DDR3', 26: 'DDR4', 34: 'DDR5' }
      type = typeMap[smbiosType] || `Type${smbiosType}`
      sticks.push({
        speed,
        type,
        manufacturer: cols[2]?.trim() || '',
        capacity: cap
      })
    }
  }
  memoryStaticInfo = { sticks }
}

// ===== GPU 静态信息（只查一次） =====

async function initGpuStatic() {
  if (gpuStaticInfo) return
  const out = await execQuiet('wmic path win32_VideoController get name,AdapterRAM,DriverVersion /format:csv')
  let model = ''; let adapterRam = 0; let driverVersion = ''
  if (out) {
    const lines = out.trim().split(/\r?\n/)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      if (cols.length < 4) continue
      model = cols[3]?.trim() || ''
      if (!model) continue
      adapterRam = safeInt(cols[2])
      driverVersion = cols[1]?.trim() || ''
      break
    }
  }
  gpuStaticInfo = { model, adapterRam, driverVersion }
}

// ===== GPU 动态传感器（nvidia-smi，每次轮询调用） =====

interface GpuSensors {
  temperature: number | null; usagePercent: number | null
  memoryUsed: number | null; memoryTotal: number | null
  coreClock: number | null; memClock: number | null
  powerDraw: number | null; fanSpeed: number | null
}

/** 上一次 nvidia-smi 成功结果缓存（避免连续失败时闪烁） */
let lastGpuSensors: GpuSensors | null = null

async function getGpuSensors(): Promise<GpuSensors> {
  const empty = { temperature: null, usagePercent: null, memoryUsed: null, memoryTotal: null, coreClock: null, memClock: null, powerDraw: null, fanSpeed: null }
  const out = await execQuiet(
    'nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total,clocks.gr,clocks.mem,power.draw,fan.speed --format=csv,noheader,nounits'
  )
  if (!out) return lastGpuSensors ?? empty
  const line = out.trim().split(/\r?\n/)[0]
  if (!line) return lastGpuSensors ?? empty
  const p = line.split(',').map(s => s.trim())
  if (p.length >= 8) {
    const result: GpuSensors = {
      temperature: safeFloat(p[0]),
      usagePercent: safeFloat(p[1]),
      memoryUsed: (safeFloat(p[2]) || 0) * 1024 * 1024,
      memoryTotal: (safeFloat(p[3]) || 0) * 1024 * 1024,
      coreClock: safeFloat(p[4]),
      memClock: safeFloat(p[5]),
      powerDraw: safeFloat(p[6]),
      fanSpeed: safeFloat(p[7])
    }
    lastGpuSensors = result
    return result
  }
  return lastGpuSensors ?? empty
}

// ===== Swap / 虚拟内存 =====

async function getSwapInfo(): Promise<{ total: number; free: number }> {
  const out = await execQuiet('wmic pagefile get AllocatedBaseSize,CurrentUsage /format:csv')
  if (!out) return { total: 0, free: 0 }
  for (const line of out.trim().split(/\r?\n/).slice(1)) {
    const cols = line.split(','); if (cols.length < 3) continue
    const total = safeInt(cols[2]) * 1024 * 1024
    return { total, free: total - safeInt(cols[1]) * 1024 * 1024 }
  }
  return { total: 0, free: 0 }
}

async function getVirtualMemory(): Promise<{ total: number; free: number } | null> {
  const out = await execQuiet('wmic OS get TotalVirtualMemorySize,FreeVirtualMemory /format:csv')
  if (!out) return null
  const lines = out.trim().split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 3) continue
    const total = safeInt(cols[1]) * 1024
    const free = safeInt(cols[2]) * 1024
    if (total > 0) return { total, free }
    break
  }
  return null
}

// ===== 主采集 =====

async function collectStats() {
  // 首次调用时初始化静态缓存
  if (!isInitialized) {
    await Promise.all([initCpuStatic(), initMemoryStatic(), initGpuStatic()])
    isInitialized = true
  }

  // 并发执行所有外部命令（CPU 温度 / GPU 传感器 / 虚拟内存 / Swap）
  const [cpuTemp, gpuSensors, vm, swap] = await Promise.all([
    getCpuTemperature(),
    getGpuSensors(),
    getVirtualMemory(),
    getSwapInfo()
  ])

  // --- 以下为纯内存计算，无阻塞 ---
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  // CPU 总使用率
  let totalUsage = 0
  const totalCurr = { total: 0, idle: 0 }
  for (const c of cpus) { const s = coreSnapshot(c); totalCurr.total += s.total; totalCurr.idle += s.idle }
  if (lastTotalSnapshot) totalUsage = calcUsage(totalCurr, lastTotalSnapshot)
  lastTotalSnapshot = totalCurr

  // 每核心
  const perCoreUsage: number[] = []; const perCoreFreq: number[] = []
  const coreCurrs = cpus.map(c => coreSnapshot(c))
  if (lastCoreSnapshots && lastCoreSnapshots.length === coreCurrs.length) {
    for (let i = 0; i < coreCurrs.length; i++) perCoreUsage.push(calcUsage(coreCurrs[i], lastCoreSnapshots[i]))
  } else { for (let i = 0; i < cpus.length; i++) perCoreUsage.push(0) }
  lastCoreSnapshots = coreCurrs
  for (const c of cpus) perCoreFreq.push(c.speed)

  // 进程
  const pmem = process.memoryUsage()
  const pcpu = process.getCPUUsage()

  return {
    cpu: {
      model: cpus[0]?.model?.trim() || 'Unknown',
      logicalCores: cpuStaticInfo?.logicalCores ?? cpus.length,
      physicalCores: cpuStaticInfo?.physicalCores ?? cpus.length,
      baseClock: cpuStaticInfo?.baseClock ?? cpus[0]?.speed ?? 0,
      l2Cache: cpuStaticInfo?.l2Cache ?? 0,
      l3Cache: cpuStaticInfo?.l3Cache ?? 0,
      speed: cpus[0]?.speed || 0,
      usage: totalUsage,
      temperature: cpuTemp,
      perCoreUsage,
      perCoreFreq
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 1000) / 10,
      swapTotal: swap.total, swapUsed: swap.total - swap.free, swapFree: swap.free,
      swapUsagePercent: swap.total > 0 ? Math.round(((swap.total - swap.free) / swap.total) * 1000) / 10 : 0,
      virtualTotal: vm?.total ?? 0, virtualFree: vm?.free ?? 0,
      sticks: memoryStaticInfo?.sticks ?? []
    },
    gpu: {
      model: gpuStaticInfo?.model ?? '',
      adapterRam: gpuStaticInfo?.adapterRam ?? 0,
      driverVersion: gpuStaticInfo?.driverVersion ?? '',
      temperature: gpuSensors.temperature,
      usagePercent: gpuSensors.usagePercent,
      memoryUsed: gpuSensors.memoryUsed,
      memoryTotal: gpuSensors.memoryTotal,
      coreClock: gpuSensors.coreClock,
      memClock: gpuSensors.memClock,
      powerDraw: gpuSensors.powerDraw,
      fanSpeed: gpuSensors.fanSpeed
    },
    process: {
      memoryUsage: pmem.rss, heapUsed: pmem.heapUsed, heapTotal: pmem.heapTotal,
      cpuUsage: Math.round((pcpu.percentCPUUsage ?? 0) * 10) / 10
    },
    system: {
      hostname: os.hostname(), platform: os.platform(), arch: os.arch(),
      uptime: os.uptime(), totalMem
    }
  }
}

// ===== IPC =====

export function setupSystemMonitorIpc() {
  // 首次采集（异步触发，不阻塞启动）
  collectStats()

  ipcMain.handle('get-system-stats', async () => {
    if (isCollecting) return null
    isCollecting = true
    try {
      return await collectStats()
    } finally {
      isCollecting = false
    }
  })

  // 小窗专用：返回系统数据 + 配置开关
  ipcMain.handle('perf-mini-data', async () => {
    if (isCollecting) return null
    isCollecting = true
    try {
      const stats = await collectStats()
      return { stats, config: { ...miniConfig } }
    } finally {
      isCollecting = false
    }
  })
}
