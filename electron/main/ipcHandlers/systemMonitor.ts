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

/** 执行 PowerShell 查询，失败返回 null（Win11 已移除 wmic，统一走 CIM） */
async function execPs(cmd: string): Promise<string | null> {
  return execQuiet(`powershell -NoProfile -NonInteractive -Command "${cmd}"`)
}

/** 解析 PowerShell Format-List 输出（Key : Value 行，空行分隔对象）为记录数组 */
function psRecords(out: string | null): Record<string, string>[] {
  if (!out) return []
  const records: Record<string, string>[] = []
  for (const block of out.trim().split(/\r?\n\s*\r?\n/)) {
    const record: Record<string, string> = {}
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^\s*([^:]+?)\s*:\s*(.*)$/)
      if (m && m[1]?.trim()) record[m[1].trim()] = m[2].trim()
    }
    if (Object.keys(record).length) records.push(record)
  }
  return records
}

// ===== CPU =====

async function initCpuStatic() {
  if (cpuStaticInfo) return
  const cpus = os.cpus()
  const logicalCores = cpus.length
  let physicalCores = logicalCores
  let l2Cache = 0
  let l3Cache = 0
  const out = await execPs(
    'Get-CimInstance Win32_Processor | ' +
      'Select-Object NumberOfCores,NumberOfLogicalProcessors,L2CacheSize,L3CacheSize,MaxClockSpeed | Format-List'
  )
  const record = psRecords(out)[0]
  if (record) {
    const nc = safeInt(record.NumberOfCores)
    physicalCores = nc > 0 ? nc : logicalCores
    l2Cache = safeInt(record.L2CacheSize)
    l3Cache = safeInt(record.L3CacheSize)
  }
  cpuStaticInfo = {
    physicalCores,
    logicalCores,
    l2Cache,
    l3Cache,
    baseClock: safeInt(record?.MaxClockSpeed) || cpus[0]?.speed || 0
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
  const out = await execPs(
    'Get-CimInstance Win32_PhysicalMemory | ' +
      'Select-Object Capacity,Manufacturer,ConfiguredClockSpeed,SMBIOSMemoryType,Speed | Format-List'
  )
  for (const record of psRecords(out)) {
    const cap = safeInt(record.Capacity)
    if (cap <= 0) continue
    const smbiosType = safeInt(record.SMBIOSMemoryType)
    sticks.push({
      speed: safeInt(record.Speed) || safeInt(record.ConfiguredClockSpeed),
      type: typeMap[smbiosType] || `Type${smbiosType}`,
      manufacturer: record.Manufacturer?.trim() || '',
      capacity: cap
    })
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
  const out = await execPs(
    'Get-CimInstance win32_VideoController | ' +
      'Select-Object Name,AdapterRAM,DriverVersion | Format-List'
  )
  // 优先取有显存容量的真实显卡（虚拟显示器 AdapterRAM 为空）
  const record = psRecords(out).find(r => safeInt(r.AdapterRAM) > 0) ?? psRecords(out)[0]
  if (record) {
    model = record.Name?.trim() || ''
    adapterRam = safeInt(record.AdapterRAM)
    driverVersion = record.DriverVersion?.trim() || ''
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
  const out = await execPs(
    'Get-CimInstance Win32_PageFileUsage | Select-Object AllocatedBaseSize,CurrentUsage | Format-List'
  )
  const record = psRecords(out)[0]
  if (!record) return { total: 0, free: 0 }
  const total = safeInt(record.AllocatedBaseSize) * 1024 * 1024
  const used = safeInt(record.CurrentUsage) * 1024 * 1024
  return { total, free: Math.max(0, total - used) }
}

async function getVirtualMemory(): Promise<{ total: number; free: number } | null> {
  const out = await execPs(
    'Get-CimInstance Win32_OperatingSystem | Select-Object TotalVirtualMemorySize,FreeVirtualMemory | Format-List'
  )
  const record = psRecords(out)[0]
  if (!record) return null
  const total = safeInt(record.TotalVirtualMemorySize) * 1024
  const free = safeInt(record.FreeVirtualMemory) * 1024
  if (total <= 0) return null
  return { total, free }
}

// ===== 主采集 =====

async function collectStats() {
  // 首次调用时初始化静态缓存
  if (!isInitialized) {
    await Promise.all([initCpuStatic(), initMemoryStatic(), initGpuStatic()])
    isInitialized = true
  }

  // 并发执行所有外部命令（GPU 传感器 / 虚拟内存 / Swap）
  const [gpuSensors, vm, swap] = await Promise.all([
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
      // WMI AdapterRAM 有 4GB 上限，优先用 nvidia-smi 的真实显存总量
      adapterRam: gpuSensors.memoryTotal ?? gpuStaticInfo?.adapterRam ?? 0,
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
