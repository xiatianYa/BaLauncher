import { ipcMain, BrowserWindow, shell } from 'electron'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'
import net from 'node:net'
import { startLogReader } from './logReader'

const execPromise = promisify(exec)

/** 主窗口实例，用于向渲染进程推送 GSI 数据 */
let mainWindow: BrowserWindow | null = null
/** cs2-gsi-z 模块（懒加载） */
let GsiService: any = null
let GSIConfigWriter: any = null
let EVENTS: any = null
/** GSI 服务实例 */
let gsiService: any = null
/** 是否已连接 CS2 的 GSI 服务 */
let isGsiConnected = false

export function setMainWindowForCs2Gsi(window: BrowserWindow) {
  mainWindow = window
}

/** 发送 GSI 数据到渲染进程 */
function sendGsiDataToRenderer(eventName: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cs2-gsi-data', { eventName, data })
  }
}

/** 懒加载 cs2-gsi-z 模块 */
async function loadCs2Gsi() {
  if (!GsiService) {
    const module = await import('cs2-gsi-z')
    GsiService = module.GsiService
    GSIConfigWriter = module.GSIConfigWriter
    EVENTS = module.EVENTS
  }
}

/** 检测 CS2 进程是否在运行（cs2.exe，老版本回退 csgo.exe） */
async function checkCsgo2Running(): Promise<boolean> {
  try {
    const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq cs2.exe" /FO CSV')
    return stdout.toLowerCase().includes('cs2.exe')
  } catch {
    try {
      const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq csgo.exe" /FO CSV')
      return stdout.toLowerCase().includes('csgo.exe')
    } catch {
      return false
    }
  }
}

/** 检查 GSI 配置文件是否已存在 */
function checkGsiConfigExists(csgo2Path: string): boolean {
  if (!csgo2Path) return false
  const possiblePaths = [
    path.join(csgo2Path, 'game', 'csgo', 'cfg', 'gamestate_integration_balauncher.cfg'),
    path.join(csgo2Path, 'csgo', 'cfg', 'gamestate_integration_balauncher.cfg')
  ]
  return possiblePaths.some(cfgPath => fs.existsSync(cfgPath))
}

/** 创建 GSI 配置文件（已存在则不重复创建） */
async function createGsiConfig(csgo2Path: string): Promise<boolean> {
  if (!csgo2Path) return false
  await loadCs2Gsi()
  if (!GSIConfigWriter) return false

  const possiblePaths = [
    path.join(csgo2Path, 'game', 'csgo', 'cfg'),
    path.join(csgo2Path, 'csgo', 'cfg')
  ]

  for (const cfgDir of possiblePaths) {
    if (!fs.existsSync(cfgDir)) continue
    const targetPath = path.join(cfgDir, 'gamestate_integration_balauncher.cfg')
    if (fs.existsSync(targetPath)) return true
    try {
      // GSIConfigWriter.generate 返回配置内容字符串，由我们写入目标文件
      const configContent = GSIConfigWriter.generate({
        name: 'balauncher',
        uri: 'http://localhost:3345'
      })
      if (configContent) {
        fs.writeFileSync(targetPath, configContent, 'utf-8')
        return true
      }
    } catch {
      // 写入失败，尝试下一个候选目录
    }
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
  serverMode: 'perfectworld' | 'worldwide' = 'worldwide',
  startType: 'steamurl' | 'steamexe' = 'steamurl',
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

/** 启动 GSI 服务并注册全部事件转发 */
async function startGsiService() {
  if (gsiService && isGsiConnected) {
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

  try {
    await loadCs2Gsi()

    gsiService = new GsiService({ httpPort: 3345 })
    gsiService.start()
    isGsiConnected = true

    for (const [event, channel] of getGsiEventMap()) {
      gsiService.on(event, (payload: any) => sendGsiDataToRenderer(channel, payload))
    }

    return { success: true }
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

/** 探测 GSI 服务端口是否真实可连接（防止服务异常退出但标志仍为 true） */
function isGsiServiceAlive(): Promise<boolean> {
  if (!gsiService) return Promise.resolve(false)
  return new Promise((resolve) => {
    const socket = net.connect(3345, '127.0.0.1')
    socket.setTimeout(1500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

export function setupCs2GsiIpc() {
  ipcMain.handle('check-csgo2-running', async () => {
    return { isRunning: await checkCsgo2Running() }
  })

  ipcMain.handle('check-gsi-config', async (_event, csgo2Path: string) => {
    return { exists: checkGsiConfigExists(csgo2Path) }
  })

  ipcMain.handle('create-gsi-config', async (_event, csgo2Path: string) => {
    return { success: await createGsiConfig(csgo2Path) }
  })

  ipcMain.handle('start-gsi-service', async () => {
    return await startGsiService()
  })

  ipcMain.handle('stop-gsi-service', async () => {
    return await stopGsiService()
  })

  ipcMain.handle('check-gsi-connected', async () => {
    // 实例/标志与端口双重验证：服务异常退出后渲染端能发现并主动重启
    return { isConnected: !!(gsiService && isGsiConnected) && (await isGsiServiceAlive()) }
  })

  ipcMain.handle('launch-cs2', async (_event, csgo2Path: string, serverMode: 'perfectworld' | 'worldwide' = 'worldwide', startType: 'steamurl' | 'steamexe' = 'steamurl', steamPath?: string, startItems: string[] = []) => {
    return await launchCs2(csgo2Path, serverMode, startType, steamPath, startItems)
  })

  ipcMain.handle('wait-for-cs2-launch', async (_event, csgo2Path?: string, maxWaitMs: number = 90000) => {
    return await waitForCs2Launch(csgo2Path, maxWaitMs)
  })
}
