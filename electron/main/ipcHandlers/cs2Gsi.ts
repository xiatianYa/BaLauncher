import { ipcMain, BrowserWindow, shell } from 'electron'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'
import net from 'node:net'
import { startLogReader } from './logReader'
import { getCSGO2Path, getSteamPathFromRegistry } from './gamePath'

const execPromise = promisify(exec)

/** CS2 服务器区服模式 */
type ServerMode = 'perfectworld' | 'worldwide'
/** CS2 启动方式：steam 协议链接 / steam.exe 直接拉起 */
type StartType = 'steamurl' | 'steamexe'

/** 主窗口实例，用于向渲染进程推送 GSI 数据 */
let mainWindow: BrowserWindow | null = null
/** cs2-gsi-z 模块（懒加载） */
let GsiService: any = null
let EVENTS: any = null
/** GSI 服务实例 */
let gsiService: any = null
/** 是否已连接 CS2 的 GSI 服务 */
let isGsiConnected = false
/** 首选 GSI 端口：五位数、低于系统动态端口区间（49152-65535），避免与临时端口冲突 */
const DEFAULT_GSI_PORT = 13455
/** GSI 服务端口：优先 DEFAULT_GSI_PORT，被其他进程占用时自动改用空闲端口 */
let gsiPort = DEFAULT_GSI_PORT
/** 端口是否已解析（一次运行期间保持稳定，保证 cfg 与服务一致） */
let gsiPortResolved = false

export function setMainWindowForCs2Gsi(window: BrowserWindow) {
  mainWindow = window
}

/** 发送 GSI 数据到渲染进程 */
function sendGsiDataToRenderer(eventName: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cs2-gsi-data', { eventName, data })
  }
}

// ===== GSI 端口管理 =====

/** 检测端口当前是否空闲（可绑定） */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.once('error', () => resolve(false))
    probe.listen(port, '127.0.0.1', () => {
      probe.close(() => resolve(true))
    })
  })
}

/** 分配空闲端口：优先 preferred，被占用时随机选一个空闲端口 */
async function allocateGsiPort(preferred: number = DEFAULT_GSI_PORT): Promise<number> {
  if (await isPortFree(preferred)) return preferred
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.listen(0, '127.0.0.1', () => {
      const addr = probe.address() as net.AddressInfo
      probe.close(() => resolve(addr.port))
    })
  })
}

/** 获取当前应使用的 GSI 端口（首次解析后缓存，保证 cfg 与服务一致） */
async function ensureGsiPort(): Promise<number> {
  if (!gsiPortResolved) {
    gsiPort = await allocateGsiPort()
    gsiPortResolved = true
  }
  return gsiPort
}

/** 等待 GsiService 底层 HTTP 服务器真正开始监听（端口被占用/绑定失败时返回 false） */
function waitForServiceListening(service: any, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const listener = service?.listener
    if (!listener) {
      resolve(false)
      return
    }
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      clearInterval(interval)
      listener.removeListener('error', fail)
      resolve(ok)
    }
    const fail = () => finish(false)
    const timer = setTimeout(() => finish(!!listener.server?.listening), timeoutMs)
    const interval = setInterval(() => {
      if (listener.server?.listening) finish(true)
    }, 100)
    listener.once('error', fail)
  })
}

/** GSI 服务是否真实在监听（直接检查底层 HTTP server，避免被占用端口的其他进程欺骗） */
function isGsiServiceListening(): boolean {
  return !!(gsiService && gsiService.listener?.server?.listening)
}

/** 懒加载 cs2-gsi-z 模块 */
async function loadCs2Gsi() {
  if (!GsiService) {
    const module = await import('cs2-gsi-z')
    GsiService = module.GsiService
    EVENTS = module.EVENTS
  }
}

/** 检测 CS2 进程是否在运行（cs2.exe，老版本回退 csgo.exe） */
async function checkCsgo2Running(): Promise<boolean> {
  for (const image of ['cs2.exe', 'csgo.exe']) {
    try {
      const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${image}" /FO CSV`)
      if (stdout.toLowerCase().includes(image)) return true
    } catch {
      // 进程查询失败，尝试下一个可执行文件名
    }
  }
  return false
}

/** 生成 GSI 配置内容（uri 使用当前服务端口） */
function buildGsiConfigContent(uri: string): string {
  return `"balauncher"
{
  "uri"          "${uri}"
  "timeout"      "5.0"
  "buffer"       "0.05"
  "throttle"     "0.08"
  "heartbeat"    "25.0"
  "data"
  {
    "provider"                  "1"
    "map"                       "1"
    "map_round_wins"            "1"
    "round"                     "1"
    "player_id"                 "1"
    "player_state"              "1"
    "player_weapons"            "1"
    "player_match_stats"        "1"
    "player_position"           "1"
    "phase_countdowns"          "1"
    "allplayers_id"             "1"
    "allplayers_state"          "1"
    "allplayers_match_stats"    "1"
    "allplayers_weapons"        "1"
    "allplayers_position"       "1"
    "allgrenades"               "1"
    "bomb"                      "1"
  }
}`
}

/** 将 cfg 写入目标目录（内容一致跳过；写入失败返回 false） */
function writeGsiConfigToDir(cfgDir: string, content: string): boolean {
  try {
    const targetPath = path.join(cfgDir, 'gamestate_integration_balauncher.cfg')
    if (fs.existsSync(targetPath) && fs.readFileSync(targetPath, 'utf-8') === content) {
      return true
    }
    fs.writeFileSync(targetPath, content, 'utf-8')
    return true
  } catch {
    return false
  }
}

/** Steam 用户级 GSI 配置目录（每个账号 730/local/cfg，CS2/CS:GO 均会读取该位置） */
function getSteamUserdataCfgDirs(steamPath?: string): string[] {
  if (!steamPath) return []
  const userdata = path.join(steamPath, 'userdata')
  if (!fs.existsSync(userdata)) return []
  const dirs: string[] = []
  for (const entry of fs.readdirSync(userdata)) {
    const accDir = path.join(userdata, entry)
    try {
      if (!fs.statSync(accDir).isDirectory()) continue
    } catch {
      continue
    }
    dirs.push(path.join(accDir, '730', 'local', 'cfg'))
  }
  return dirs
}

/** GSI 配置文件全量候选目录（游戏目录 + Steam 用户级目录） */
function getGsiConfigTargets(csgo2Path: string, steamPath?: string): string[] {
  const gameDirs = csgo2Path
    ? [
        path.join(csgo2Path, 'game', 'csgo', 'cfg'),
        path.join(csgo2Path, 'csgo', 'cfg')
      ]
    : []
  return [...gameDirs, ...getSteamUserdataCfgDirs(steamPath)]
}

/** 检查 GSI 配置文件是否已存在（游戏目录或 Steam 用户级目录任一存在即可） */
function checkGsiConfigExists(csgo2Path: string, steamPath?: string): boolean {
  if (!csgo2Path) return false
  return getGsiConfigTargets(csgo2Path, steamPath)
    .filter((dir) => fs.existsSync(dir))
    .some((dir) => fs.existsSync(path.join(dir, 'gamestate_integration_balauncher.cfg')))
}

/** 创建/同步 GSI 配置文件：同步所有已存在的目标目录，全部失败时强制写 Steam 用户级目录（系统级兜底） */
async function createGsiConfig(csgo2Path: string, steamPath?: string): Promise<boolean> {
  // 路径未配置时自动探测（注册表 / steamapps 库目录），保证软件启动时也能创建配置
  if (!steamPath) steamPath = (await getSteamPathFromRegistry()) || undefined
  if (!csgo2Path && steamPath) csgo2Path = (await getCSGO2Path(steamPath)) || ''
  if (!csgo2Path && !steamPath) return false

  // 端口先解析并缓存：cfg 与服务必须使用同一端口，否则游戏数据发不到服务
  const uri = `http://localhost:${await ensureGsiPort()}`
  const content = buildGsiConfigContent(uri)

  // 第一轮：同步所有已存在的目标目录（游戏目录 + Steam 用户级目录）。
  // 不中途 return，确保旧端口残留的 cfg 也一并更新为当前端口，避免多处配置不一致
  let wroteAny = false
  for (const cfgDir of getGsiConfigTargets(csgo2Path, steamPath)) {
    if (!fs.existsSync(cfgDir)) continue
    if (writeGsiConfigToDir(cfgDir, content)) wroteAny = true
  }
  if (wroteAny) return true

  // 第二轮：强制创建 Steam 用户级目录并写入（游戏目录缺失/不可写时的系统级兜底）
  for (const cfgDir of getSteamUserdataCfgDirs(steamPath)) {
    try {
      fs.mkdirSync(cfgDir, { recursive: true })
    } catch {
      continue
    }
    if (writeGsiConfigToDir(cfgDir, content)) return true
  }

  return false
}

/** 控制台日志路径 */
function getLogFilePath(csgo2Path: string): string | null {
  if (!csgo2Path) return null
  return path.join(csgo2Path, 'game', 'csgo', 'console.log')
}

/** 通过日志内容判断游戏是否已加载到主菜单 */
function isGameFullyLoaded(csgo2Path: string): boolean {
  const logPath = getLogFilePath(csgo2Path)
  if (!logPath || !fs.existsSync(logPath)) return false
  try {
    const content = fs.readFileSync(logPath, 'utf-8')
    const regexMainMenu = /MasterServerHostThread|Loading level .* got steam|Connected to Steam accounts|Significant network event|Signon number/
    return regexMainMenu.test(content)
  } catch {
    return false
  }
}

/** 启动 CS2：steamurl 走 steam:// 协议，steamexe 直接拉起 steam.exe */
async function launchCs2(
  csgo2Path: string,
  serverMode: ServerMode = 'worldwide',
  startType: StartType = 'steamurl',
  steamPath?: string,
  startItems?: string[]
) {
  if (!csgo2Path) return { success: false, error: 'CS2 path not provided' }

  try {
    const params = [
      serverMode === 'perfectworld' ? '-perfectworld' : '-worldwide',
      '-vac',
      '-condebug',
      ...(startItems || [])
    ]

    if (startType === 'steamurl') {
      const baseCommand = 'steam://rungameid/730'
      const command = params.length > 0 ? `${baseCommand}//${params.join(' ')}` : baseCommand
      shell.openExternal(command)
    } else {
      if (!steamPath) {
        return { success: false, error: 'Steam path not provided for steamexe mode' }
      }
      const steamExePath = path.join(steamPath, 'steam.exe')
      if (!fs.existsSync(steamExePath)) {
        return { success: false, error: `Steam.exe not found at ${steamExePath}` }
      }
      spawn(steamExePath, ['-applaunch', '730', ...params], { detached: true, stdio: 'ignore' }).unref()
    }

    startLogReader(csgo2Path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** 等待 CS2 启动完成（进程稳定运行且日志出现主菜单标记） */
async function waitForCs2Launch(csgo2Path?: string, maxWaitMs: number = 60000) {
  const endTime = Date.now() + maxWaitMs

  while (Date.now() < endTime) {
    await sleep(1000)

    // 进程需持续存在（启动 3s 后再确认），避免启动即崩溃的假阳性
    if (!(await checkCsgo2Running())) continue
    await sleep(3000)
    if (!(await checkCsgo2Running())) continue

    await sleep(2000)
    // 等待日志出现主菜单标记（最多 10s，逐秒轮询避免忙等）
    const loadCheckEnd = Date.now() + 10000
    while (Date.now() < loadCheckEnd) {
      if (csgo2Path && isGameFullyLoaded(csgo2Path)) {
        return { success: true }
      }
      await sleep(1000)
    }
    return { success: true }
  }

  return { success: false, error: '游戏启动超时，未加载到主菜单' }
}

/**
 * 构建 GSI 事件 -> 渲染进程通道名 映射（表驱动注册，避免大量重复的 on 回调）
 * 注意：EVENTS 为懒加载模块，需在 loadCs2Gsi() 之后调用
 */
function getGsiEventMap(): Array<[string, string]> {
  return [
    // provider
    [EVENTS.provider.nameChanged, 'provider:nameChanged'],
    [EVENTS.provider.timestampChanged, 'provider:timestampChanged'],
    // map
    [EVENTS.map.nameChanged, 'map:nameChanged'],
    [EVENTS.map.phaseChanged, 'map:phaseChanged'],
    [EVENTS.map.roundChanged, 'map:roundChanged'],
    [EVENTS.map.teamCTScoreChanged, 'map:teamCTScoreChanged'],
    [EVENTS.map.teamTScoreChanged, 'map:teamTScoreChanged'],
    [EVENTS.map.currentSpectatorsChanged, 'map:currentSpectatorsChanged'],
    [EVENTS.map.souvenirsTotalChanged, 'map:souvenirsTotalChanged'],
    [EVENTS.map.roundWinsChanged, 'map:roundWinsChanged'],
    // round
    [EVENTS.round.phaseChanged, 'round:phaseChanged'],
    [EVENTS.round.started, 'round:started'],
    [EVENTS.round.ended, 'round:ended'],
    [EVENTS.round.won, 'round:won'],
    // player
    [EVENTS.player.nameChanged, 'player:nameChanged'],
    [EVENTS.player.clanChanged, 'player:clanChanged'],
    [EVENTS.player.xpOverloadLevelChanged, 'player:xpOverloadLevelChanged'],
    [EVENTS.player.steamidChanged, 'player:steamidChanged'],
    [EVENTS.player.teamChanged, 'player:teamChanged'],
    [EVENTS.player.activityChanged, 'player:activityChanged'],
    [EVENTS.player.observerSlotChanged, 'player:observerSlotChanged'],
    [EVENTS.player.specTargetChanged, 'player:specTargetChanged'],
    [EVENTS.player.positionChanged, 'player:positionChanged'],
    [EVENTS.player.forwardDirectionChanged, 'player:forwardDirectionChanged'],
    [EVENTS.player.hpChanged, 'player:hpChanged'],
    [EVENTS.player.armorChanged, 'player:armorChanged'],
    [EVENTS.player.helmetChanged, 'player:helmetChanged'],
    [EVENTS.player.flashedChanged, 'player:flashedChanged'],
    [EVENTS.player.smokedChanged, 'player:smokedChanged'],
    [EVENTS.player.burningChanged, 'player:burningChanged'],
    [EVENTS.player.moneyChanged, 'player:moneyChanged'],
    [EVENTS.player.equipmentValueChanged, 'player:equipmentValueChanged'],
    [EVENTS.player.weaponChanged, 'player:weaponChanged'],
    [EVENTS.player.ammoClipChanged, 'player:ammoClipChanged'],
    [EVENTS.player.ammoReserveChanged, 'player:ammoReserveChanged'],
    [EVENTS.player.killsChanged, 'player:killsChanged'],
    [EVENTS.player.deathsChanged, 'player:deathsChanged'],
    [EVENTS.player.assistsChanged, 'player:assistsChanged'],
    [EVENTS.player.scoreChanged, 'player:scoreChanged'],
    [EVENTS.player.mvpsChanged, 'player:mvpsChanged'],
    // phaseCountdowns
    [EVENTS.phaseCountdowns.phaseChanged, 'phaseCountdowns:phaseChanged'],
    [EVENTS.phaseCountdowns.phaseEndsInChanged, 'phaseCountdowns:phaseEndsInChanged'],
    // allPlayers
    [EVENTS.allPlayers.joined, 'allPlayers:joined'],
    [EVENTS.allPlayers.left, 'allPlayers:left'],
    [EVENTS.allPlayers.teamChanged, 'allPlayers:teamChanged'],
    [EVENTS.allPlayers.observerSlotChanged, 'allPlayers:observerSlotChanged'],
    [EVENTS.allPlayers.positionChanged, 'allPlayers:positionChanged'],
    [EVENTS.allPlayers.forwardDirectionChanged, 'allPlayers:forwardDirectionChanged'],
    [EVENTS.allPlayers.hpChanged, 'allPlayers:hpChanged'],
    [EVENTS.allPlayers.armorChanged, 'allPlayers:armorChanged'],
    [EVENTS.allPlayers.helmetChanged, 'allPlayers:helmetChanged'],
    [EVENTS.allPlayers.flashedChanged, 'allPlayers:flashedChanged'],
    [EVENTS.allPlayers.smokedChanged, 'allPlayers:smokedChanged'],
    [EVENTS.allPlayers.burningChanged, 'allPlayers:burningChanged'],
    [EVENTS.allPlayers.moneyChanged, 'allPlayers:moneyChanged'],
    [EVENTS.allPlayers.equipmentValueChanged, 'allPlayers:equipmentValueChanged'],
    [EVENTS.allPlayers.weaponChanged, 'allPlayers:weaponChanged'],
    [EVENTS.allPlayers.ammoClipChanged, 'allPlayers:ammoClipChanged'],
    [EVENTS.allPlayers.ammoReserveChanged, 'allPlayers:ammoReserveChanged'],
    [EVENTS.allPlayers.killsChanged, 'allPlayers:killsChanged'],
    [EVENTS.allPlayers.deathsChanged, 'allPlayers:deathsChanged'],
    [EVENTS.allPlayers.assistsChanged, 'allPlayers:assistsChanged'],
    [EVENTS.allPlayers.scoreChanged, 'allPlayers:scoreChanged'],
    [EVENTS.allPlayers.mvpsChanged, 'allPlayers:mvpsChanged'],
    // bomb
    [EVENTS.bomb.stateChanged, 'bomb:stateChanged'],
    [EVENTS.bomb.positionChanged, 'bomb:positionChanged'],
    [EVENTS.bomb.playerChanged, 'bomb:playerChanged'],
    // grenades
    [EVENTS.grenades.existenceChanged, 'grenades:existenceChanged'],
    [EVENTS.grenades.positionChanged, 'grenades:positionChanged'],
    [EVENTS.grenades.velocityChanged, 'grenades:velocityChanged'],
    [EVENTS.grenades.lifetimeChanged, 'grenades:lifetimeChanged'],
    [EVENTS.grenades.effectTimeChanged, 'grenades:effectTimeChanged'],
    [EVENTS.grenades.flamesChanged, 'grenades:flamesChanged']
  ]
}

/** 启动 GSI 服务并注册全部事件转发（端口被占用时自动更换空闲端口重试） */
async function startGsiService() {
  if (gsiService && isGsiConnected && isGsiServiceListening()) {
    return { success: true, alreadyRunning: true }
  }

  // 上次启动残留的实例（如 start() 抛错后）先释放，避免误判"已运行"导致服务永远无法真正启动
  if (gsiService) {
    try {
      gsiService.stop()
    } catch {
      // 停止失败忽略，直接释放引用
    }
    gsiService = null
  }
  isGsiConnected = false

  try {
    await loadCs2Gsi()

    let port = await ensureGsiPort()
    for (let attempt = 0; attempt < 3; attempt++) {
      const service = new GsiService({ httpPort: port })
      // GsiListener 绑定失败不会同步抛错（走 error 事件），必须主动确认端口真实监听
      service.start()
      const listening = await waitForServiceListening(service)
      if (listening) {
        gsiService = service
        gsiPort = port
        isGsiConnected = true

        for (const [event, channel] of getGsiEventMap()) {
          service.on(event, (payload: any) => sendGsiDataToRenderer(channel, payload))
        }
        return { success: true }
      }

      // 端口被其他进程占用：释放本次实例，换空闲端口重试
      try {
        service.stop()
      } catch {
        // 忽略
      }
      port = await allocateGsiPort()
    }
    return { success: false, error: '无法绑定空闲端口，请检查是否有其他 GSI 工具占用端口' }
  } catch (error) {
    gsiService = null
    isGsiConnected = false
    return { success: false, error: String(error) }
  }
}

/** 停止 GSI 服务 */
async function stopGsiService() {
  if (gsiService) {
    try {
      gsiService.stop()
    } catch {
      // 停止失败忽略，直接释放引用
    }
    gsiService = null
    isGsiConnected = false
  }
  return isGsiConnected
}

export function setupCs2GsiIpc() {
  ipcMain.handle('check-csgo2-running', async () => {
    return { isRunning: await checkCsgo2Running() }
  })

  ipcMain.handle('check-gsi-config', async (_event, csgo2Path: string, steamPath?: string) => {
    return { exists: checkGsiConfigExists(csgo2Path, steamPath) }
  })

  ipcMain.handle('create-gsi-config', async (_event, csgo2Path: string, steamPath?: string) => {
    return { success: await createGsiConfig(csgo2Path, steamPath) }
  })

  ipcMain.handle('start-gsi-service', () => startGsiService())

  ipcMain.handle('stop-gsi-service', () => stopGsiService())

  ipcMain.handle('check-gsi-connected', async () => {
    // 直接检查底层 HTTP server 是否在监听：端口被其他进程占用时不会误判为已连接
    return { isConnected: isGsiServiceListening() }
  })

  ipcMain.handle(
    'launch-cs2',
    (
      _event,
      csgo2Path: string,
      serverMode: ServerMode = 'worldwide',
      startType: StartType = 'steamurl',
      steamPath?: string,
      startItems: string[] = []
    ) => launchCs2(csgo2Path, serverMode, startType, steamPath, startItems)
  )

  ipcMain.handle(
    'wait-for-cs2-launch',
    (_event, csgo2Path?: string, maxWaitMs = 90000) => waitForCs2Launch(csgo2Path, maxWaitMs)
  )
}
