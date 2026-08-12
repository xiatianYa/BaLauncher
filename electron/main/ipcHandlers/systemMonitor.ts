import { ipcMain } from 'electron'
import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

// ===== 采集状态 =====
let isCollecting = false
let lastTotalSnapshot: { total: number; idle: number } | null = null
let lastCoreSnapshots: { total: number; idle: number }[] | null = null

// ===== 静态缓存（只查一次） =====
interface CpuStaticInfo {
  physicalCores: number
  logicalCores: number
  l2Cache: number
  l3Cache: number
  baseClock: number
}
interface MemoryStick {
  speed: number
  type: string
  manufacturer: string
  capacity: number
}
interface MemoryStaticInfo {
  sticks: MemoryStick[]
}
interface GpuStaticInfo {
  model: string
  adapterRam: number
  driverVersion: string
}
let cpuStaticInfo: CpuStaticInfo | null = null
let memoryStaticInfo: MemoryStaticInfo | null = null
let gpuStaticInfo: GpuStaticInfo | null = null
let isInitialized = false

// ===== 小窗配置缓存（从渲染进程打开小窗时传入） =====
interface PerfMiniConfig {
  showCpu: boolean
  showRam: boolean
  showGpu: boolean
  showTemperature: boolean
}
let miniConfig: PerfMiniConfig = {
  showCpu: true,
  showRam: true,
  showGpu: true,
  showTemperature: true
}

export function setMiniConfig(cfg: PerfMiniConfig) {
  miniConfig = cfg
}

// ===== 工具 =====

/** 异步执行命令，失败返回 null */
async function execQuiet(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(cmd, {
      encoding: 'utf-8',
      timeout: 4000,
      windowsHide: true
    })
    return stdout
  } catch {
    return null
  }
}

function safeInt(s: string | undefined): number {
  const v = parseInt(s || '', 10)
  return isNaN(v) ? 0 : v
}

function safeFloat(s: string | undefined): number | null {
  const v = parseFloat(s || '')
  return isNaN(v) ? null : v
}

function coreSnapshot(core: os.CpuInfo) {
  let total = 0
  for (const t of Object.values(core.times)) total += t
  return { total, idle: core.times.idle }
}

function calcUsage(
  curr: { total: number; idle: number },
  prev: { total: number; idle: number }
): number {
  const td = curr.total - prev.total
  const id = curr.idle - prev.idle
  if (td <= 0) return 0
  return Math.min(100, Math.max(0, Math.round(((td - id) / td) * 1000) / 10))
}

/** 解析 wmic /format:csv 输出为数据行二维数组（跳过表头） */
function wmicRows(out: string): string[][] {
  return out.trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(','))
    .filter((r) => r.length > 1)
}

// ===== CPU =====

async function getCpuTemperature(): Promise<number | null> {
  const out = await execQuiet(
    'wmic /namespace:\\\\root\\wmi ' +
      'path MSAcpi_ThermalZoneTemperature get CurrentTemperature /value'
  )
  if (!out) return null
  const m = out.match(/CurrentTemperature=(\d+)/i)
  if (!m) return null
  return Math.round(((parseInt(m[1], 10) / 10) - 273.15) * 10) / 10
}

async function initCpuStatic() {
  if (cpuStaticInfo) return
  const cpus = os.cpus()
  const logicalCores = cpus.length
  let physicalCores = logicalCores
  let l2Cache = 0
  let l3Cache = 0
  const out = await execQuiet(
    'wmic cpu get L2CacheSize,L3CacheSize,MaxClockSpeed,' +
      'NumberOfCores,NumberOfLogicalProcessors /format:csv'
  )
  const row = out ? wmicRows(out).find((c) => c.length >= 6) : undefined
  if (row) {
    const nc = safeInt(row[4])
    physicalCores = nc > 0 ? nc : logicalCores
    l2Cache = safeInt(row[2])
    l3Cache = safeInt(row[3])
  }
  cpuStaticInfo = {
    physicalCores,
    logicalCores,
    l2Cache,
    l3Cache,
    baseClock: safeInt(row?.[1]) || cpus[0]?.speed || 0
  }
}

/** CPU 使用率（总 + 每核心，基于两次快照差值） */
function calcCpuUsage() {
  const cpus = os.cpus()
  const coreCurrs = cpus.map(coreSnapshot)
  const totalCurr = coreCurrs.reduce(
    (a, s) => ({ total: a.total + s.total, idle: a.idle + s.idle }),
    { total: 0, idle: 0 }
  )
  const usage = lastTotalSnapshot ? calcUsage(totalCurr, lastTotalSnapshot) : 0
  const perCoreUsage: number[] = []
  if (lastCoreSnapshots && lastCoreSnapshots.length === coreCurrs.length) {
    for (let i = 0; i < coreCurrs.length; i++) {
      perCoreUsage.push(calcUsage(coreCurrs[i], lastCoreSnapshots[i]))
    }
  } else {
    coreCurrs.forEach(() => perCoreUsage.push(0))
  }
  lastTotalSnapshot = totalCurr
  lastCoreSnapshots = coreCurrs
  return {
    usage,
    perCoreUsage,
    perCoreFreq: cpus.map((c) => c.speed),
    model: cpus[0]?.model?.trim() || 'Unknown',
    speed: cpus[0]?.speed || 0,
    coreCount: cpus.length
  }
}

// ===== 内存 =====

async function initMemoryStatic() {
  if (memoryStaticInfo) return
  const sticks: MemoryStick[] = []
  const typeMap: Record<number, string> = {
    20: 'DDR',
    21: 'DDR2',
    22: 'DDR2 FB-DIMM',
    24: 'DDR3',
    26: 'DDR4',
    34: 'DDR5'
  }
  const out = await execQuiet(
    'wmic memorychip get Speed,MemoryType,Manufacturer,Capacity,' +
      'ConfiguredClockSpeed,SMBIOSMemoryType /format:csv'
  )
  if (out) {
    for (const cols of wmicRows(out)) {
      if (cols.length < 7) continue
      const cap = safeInt(cols[3])
      if (cap <= 0) continue
      const smbiosType = safeInt(cols[5])
      sticks.push({
        speed: safeInt(cols[4]) || safeInt(cols[1]),
        type: typeMap[smbiosType] || `Type${smbiosType}`,
        manufacturer: cols[2]?.trim() || '',
        capacity: cap
      })
    }
  }
  memoryStaticInfo = { sticks }
}

// ===== GPU =====

interface GpuSensors {
  temperature: number | null
  usagePercent: number | null
  memoryUsed: number | null
  memoryTotal: number | null
  coreClock: number | null
  memClock: number | null
  powerDraw: number | null
  fanSpeed: number | null
}
const EMPTY_GPU: GpuSensors = {
  temperature: null,
  usagePercent: null,
  memoryUsed: null,
  memoryTotal: null,
  coreClock: null,
  memClock: null,
  powerDraw: null,
  fanSpeed: null
}
/** 上一次 nvidia-smi 成功结果缓存（避免连续失败时闪烁） */
let lastGpuSensors: GpuSensors | null = null

async function initGpuStatic() {
  if (gpuStaticInfo) return
  let model = ''
  let adapterRam = 0
  let driverVersion = ''
  const out = await execQuiet(
    'wmic path win32_VideoController get name,AdapterRAM,' +
      'DriverVersion /format:csv'
  )
  const row = out
    ? wmicRows(out).find((c) => c.length >= 4 && c[3]?.trim())
    : undefined
  if (row) {
    model = row[3].trim()
    adapterRam = safeInt(row[2])
    driverVersion = row[1]?.trim() || ''
  }
  gpuStaticInfo = { model, adapterRam, driverVersion }
}

async function getGpuSensors(): Promise<GpuSensors> {
  const out = await execQuiet(
    'nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,' +
      'memory.used,memory.total,clocks.gr,clocks.mem,power.draw,fan.speed ' +
      '--format=csv,noheader,nounits'
  )
  if (!out) return lastGpuSensors ?? EMPTY_GPU
  const p = out.trim()
    .split(/\r?\n/)[0]
    ?.split(',')
    .map((s) => s.trim())
  if (!p || p.length < 8) return lastGpuSensors ?? EMPTY_GPU
  lastGpuSensors = {
    temperature: safeFloat(p[0]),
    usagePercent: safeFloat(p[1]),
    memoryUsed: (safeFloat(p[2]) || 0) * 1024 * 1024,
    memoryTotal: (safeFloat(p[3]) || 0) * 1024 * 1024,
    coreClock: safeFloat(p[4]),
    memClock: safeFloat(p[5]),
    powerDraw: safeFloat(p[6]),
    fanSpeed: safeFloat(p[7])
  }
  return lastGpuSensors
}

// ===== Swap / 虚拟内存 =====

async function getSwapInfo(): Promise<{ total: number; free: number }> {
  const out = await execQuiet('wmic pagefile get AllocatedBaseSize,CurrentUsage /format:csv')
  const row = out ? wmicRows(out).find((c) => c.length >= 3) : undefined
  if (!row) return { total: 0, free: 0 }
  const total = safeInt(row[2]) * 1024 * 1024
  return { total, free: total - safeInt(row[1]) * 1024 * 1024 }
}

async function getVirtualMemory(): Promise<{ total: number; free: number } | null> {
  const out = await execQuiet('wmic OS get TotalVirtualMemorySize,FreeVirtualMemory /format:csv')
  const row = out
    ? wmicRows(out).find((c) => c.length >= 3 && safeInt(c[1]) > 0)
    : undefined
  if (!row) return null
  return { total: safeInt(row[1]) * 1024, free: safeInt(row[2]) * 1024 }
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
  const cpu = calcCpuUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const pmem = process.memoryUsage()
  const pcpu = process.getCPUUsage()

  return {
    cpu: {
      model: cpu.model,
      logicalCores: cpuStaticInfo?.logicalCores ?? cpu.coreCount,
      physicalCores: cpuStaticInfo?.physicalCores ?? cpu.coreCount,
      baseClock: cpuStaticInfo?.baseClock ?? cpu.speed,
      l2Cache: cpuStaticInfo?.l2Cache ?? 0,
      l3Cache: cpuStaticInfo?.l3Cache ?? 0,
      speed: cpu.speed,
      usage: cpu.usage,
      temperature: cpuTemp,
      perCoreUsage: cpu.perCoreUsage,
      perCoreFreq: cpu.perCoreFreq
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 1000) / 10,
      swapTotal: swap.total,
      swapUsed: swap.total - swap.free,
      swapFree: swap.free,
      swapUsagePercent: swap.total > 0
        ? Math.round(((swap.total - swap.free) / swap.total) * 1000) / 10
        : 0,
      virtualTotal: vm?.total ?? 0,
      virtualFree: vm?.free ?? 0,
      sticks: memoryStaticInfo?.sticks ?? []
    },
    gpu: {
      model: gpuStaticInfo?.model ?? '',
      adapterRam: gpuStaticInfo?.adapterRam ?? 0,
      driverVersion: gpuStaticInfo?.driverVersion ?? '',
      ...gpuSensors
    },
    process: {
      memoryUsage: pmem.rss,
      heapUsed: pmem.heapUsed,
      heapTotal: pmem.heapTotal,
      cpuUsage: Math.round((pcpu.percentCPUUsage ?? 0) * 10) / 10
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      totalMem
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
