import { ipcMain, BrowserWindow, shell } from 'electron'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'

// ========== 全局变量 ==========
let mainWindow: BrowserWindow | null = null // 主窗口实例，用于发送数据到渲染进程
let GsiService: any = null // CS2 GSI服务实例
let EVENTS: any = null // CS2 GSI服务事件常量
let gsiService: any = null // GSI服务实例，用于与CS2游戏进行通信
let isGsiConnected = false // 是否已连接到CS2游戏的GSI服务

const execPromise = promisify(exec)

// ========== 基础工具函数 ==========
export function setMainWindowForCs2Gsi(window: BrowserWindow) {
    mainWindow = window
}

// ========== 发送GSI数据到渲染进程 ==========
function sendGsiDataToRenderer(eventName: string, data: any) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cs2-gsi-data', { eventName, data })
    }
}

// ========== 加载CS2 GSI服务 ==========
async function loadCs2Gsi() {
    if (!GsiService) {
        const module = await import('cs2-gsi-z')
        GsiService = module.GsiService
        EVENTS = module.EVENTS
    }
}

// ========== 进程检测相关 ==========
async function checkCsgo2Running(): Promise<boolean> {
    try {
        const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq cs2.exe" /FO CSV')
        return stdout.toLowerCase().includes('cs2.exe')
    } catch (error) {
        try {
            const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq csgo.exe" /FO CSV')
            return stdout.toLowerCase().includes('csgo.exe')
        } catch (error2) {
            console.log('Failed to check CSGO2 process:', error2)
            return false
        }
    }
}

// ========== GSI 配置相关 ==========
function checkGsiConfigExists(csgo2Path: string): boolean {
    if (!csgo2Path) return false

    const possiblePaths = [
        path.join(csgo2Path, 'game', 'csgo', 'cfg', 'gamestate_integration_consolesample.cfg'),
        path.join(csgo2Path, 'csgo', 'cfg', 'gamestate_integration_consolesample.cfg')
    ]

    for (const cfgPath of possiblePaths) {
        if (fs.existsSync(cfgPath)) {
            return true
        }
    }

    return false
}

// ========== 创建GSI配置文件 ==========
function createGsiConfig(csgo2Path: string): boolean {
    if (!csgo2Path) return false

    const cfgContent = `"Console Sample v.1"
{
    "uri" "http://127.0.0.1:3345"
    "timeout" "5.0"
    "buffer" "0.1"
    "throttle" "0.5"
    "heartbeat" "60.0"
    "auth"
    {
        "token" "CCWJu64ZV3JHDT8hZc"
    }
    "output"
    {
        "precision_time" "3"
        "precision_position" "1"
        "precision_vector" "3"
    }
    "data"
    {
        "provider"            "1"
        "map"                 "1"
        "round"               "1"
        "player_id"           "1"
        "player_state"        "1"
        "player_weapons"      "1"
        "player_match_stats"  "1"
    }
}`

    const possiblePaths = [
        path.join(csgo2Path, 'game', 'csgo', 'cfg'),
        path.join(csgo2Path, 'csgo', 'cfg')
    ]

    for (const cfgDir of possiblePaths) {
        if (fs.existsSync(cfgDir)) {
            const cfgPath = path.join(cfgDir, 'gamestate_integration_consolesample.cfg')
            try {
                fs.writeFileSync(cfgPath, cfgContent, 'utf-8')
                console.log('GSI 配置文件已创建在:', cfgPath)
                return true
            } catch (error) {
                console.log('创建 GSI 配置文件失败:', error)
            }
        }
    }

    return false
}

// ========== 游戏启动相关 ==========
function getLogFilePath(csgo2Path: string): string | null {
    if (!csgo2Path) return null
    const logPath = path.join(csgo2Path, 'game', 'csgo', 'console.log')
    return logPath
}

function isGameFullyLoaded(csgo2Path: string): boolean {
    const logPath = getLogFilePath(csgo2Path)
    if (!logPath) return false

    if (!fs.existsSync(logPath)) return false

    try {
        const content = fs.readFileSync(logPath, 'utf-8')
        const regexMainMenu = /MasterServerHostThread|Loading level .* got steam|Connected to Steam accounts|Significant network event|Signon number/
        return regexMainMenu.test(content)
    } catch (e) {
        console.log('检查游戏加载日志失败:', e)
        return false
    }
}

// ========== 启动CS2游戏 ==========
async function launchCs2(
    csgo2Path: string,
    serverMode: 'perfectworld' | 'worldwide' = 'worldwide',
    startType: 'steamurl' | 'steamexe' = 'steamurl',
    steamPath?: string
) {
    if (!csgo2Path) return { success: false, error: 'CS2 path not provided' }

    try {
        const params: string[] = []

        if (serverMode === 'perfectworld') {
            params.push('-perfectworld')
        } else {
            params.push('-worldwide')
        }

        params.push('-vac')
        params.push('-condebug')

        if (startType === 'steamurl') {
            const steamId = '730'
            const baseCommand = 'steam://rungameid/'
            let command = `${baseCommand}${steamId}`

            if (params.length > 0) {
                command = `${baseCommand}${steamId}}`
            }
            console.log('Steam URL 启动命令:', command)
            shell.openExternal(command)
            console.log('CS2 Steam URL 启动命令已成功发送')
        } else {
            if (!steamPath) {
                return { success: false, error: 'Steam path not provided for steamexe mode' }
            }

            const steamExePath = path.join(steamPath, 'steam.exe')
            if (!fs.existsSync(steamExePath)) {
                return { success: false, error: `Steam.exe not found at ${steamExePath}` }
            }

            const args = ['-applaunch', '730', ...params]
            console.log('Steam.exe 启动命令:', steamExePath, args.join(' '))

            spawn(steamExePath, args, { detached: true, stdio: 'ignore' }).unref()
            console.log('CS2 Steam.exe 启动命令已成功发送')
        }

        return { success: true }
    } catch (error) {
        console.error('CS2启动失败:', error)
        return { success: false, error: String(error) }
    }
}

// ========== 等待CS2游戏启动完成 ==========
async function waitForCs2Launch(csgo2Path?: string, maxWaitMs: number = 90000) {
    const endTime = Date.now() + maxWaitMs

    while (Date.now() < endTime) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const isRunning = await checkCsgo2Running()
        if (isRunning) {
            console.log('检测到CS2进程已启动，等待进程稳定...')
            await new Promise(resolve => setTimeout(resolve, 3000))
            const stillRunning = await checkCsgo2Running()
            if (stillRunning) {
                console.log('CS2进程已稳定运行')
                await new Promise(resolve => setTimeout(resolve, 2000))
                if (csgo2Path) {
                    console.log('检查游戏是否完全加载...')
                    const loadCheckStart = Date.now()
                    const loadCheckEnd = loadCheckStart + 10000
                    while (Date.now() < loadCheckEnd) {
                        if (isGameFullyLoaded(csgo2Path)) {
                            console.log('游戏已加载到主菜单')
                            return { success: true }
                        }
                    }
                }

                return { success: true }
            } else {
                console.log('CS2进程启动后崩溃，继续等待...')
            }
        }
    }

    return { success: false, error: '游戏启动超时，未加载到主菜单' }
}

// ========== GSI 服务相关 ==========
async function startGsiService() {
    if (gsiService) {
        return { success: true, alreadyRunning: true }
    }

    try {
        await loadCs2Gsi()

        gsiService = new GsiService({
            httpPort: 3345
        })

        gsiService.start()
        isGsiConnected = true
        console.log('✅ GSI 服务已启动，监听端口 3345')

        // 监听 GSI 服务的「时间戳变更」事件
        // payload：包含当前最新的游戏时间戳信息（如游戏运行时长、UTC 时间戳等）
        gsiService.on(EVENTS.provider.timestampChanged, (payload: any) => {
            sendGsiDataToRenderer("timestampChanged", payload)
        })

        // 监听 GSI 服务的「地图名称变更」事件
        // payload：包含当前游戏地图的名称（如 de_dust2、de_inferno、de_mirage 等）
        gsiService.on(EVENTS.map.nameChanged, (payload: any) => {
            sendGsiDataToRenderer("nameChanged", payload)
        })

        // 监听 GSI 服务的「地图阶段变更」事件
        // payload：包含当前地图的游戏阶段（如热身 warmup、上半场 live、暂停 pause、结束 gameover 等）
        gsiService.on(EVENTS.map.phaseChanged, (payload: any) => {
            sendGsiDataToRenderer("phaseChanged", payload)
        })

        // 监听 GSI 服务的「CT 阵营分数变更」事件
        // payload：包含 CT 阵营的最新分数（数值类型，如 8、13 等）
        gsiService.on(EVENTS.map.teamCtScoreChanged, (payload: any) => {
            sendGsiDataToRenderer("teamCtScoreChanged", payload)
        })

        // 监听 GSI 服务的「T 阵营分数变更」事件
        // payload：包含 T 阵营的最新分数（数值类型，如 5、16 等）
        gsiService.on(EVENTS.map.teamTScoreChanged, (payload: any) => {
            sendGsiDataToRenderer("teamTScoreChanged", payload)
        })

        // 监听 GSI 服务的「玩家阵营变更」事件
        // payload：包含当前玩家所属阵营（ct/t/spectator，即CT/恐怖分子/观察者）
        gsiService.on(EVENTS.player.teamChanged, (payload: any) => {
            sendGsiDataToRenderer("teamChanged", payload)
        })

        // 监听 GSI 服务的「玩家活动状态变更」事件
        // payload：包含玩家当前活动状态（如 playing/menu/spectating，即游戏中/菜单/观战）
        gsiService.on(EVENTS.player.activityChanged, (payload: any) => {
            sendGsiDataToRenderer("activityChanged", payload)
        })

        // 监听 GSI 服务的「玩家状态变更」事件
        // payload：包含玩家实时状态（如生命值、护甲、武器、位置、是否倒地/死亡等）
        gsiService.on(EVENTS.player.stateChanged, (payload: any) => {
            sendGsiDataToRenderer("stateChanged", payload)
        })

        // 监听 GSI 服务的「玩家对局统计数据变更」事件
        // payload：包含玩家本局统计数据（如击杀数、死亡数、助攻数、伤害量、经济等）
        gsiService.on(EVENTS.player.matchStatsChanged, (payload: any) => {
            sendGsiDataToRenderer("matchStatsChanged", payload)
        })
        return { success: true }
    } catch (error) {
        console.log('Failed to start GSI service:', error)
        isGsiConnected = false
        return { success: false, error: String(error) }
    }
}

// ========== 停止GSI服务服务 ==========
async function stopGsiService() {
    if (gsiService) {
        try {
            gsiService.stop()
        } catch (error) {
            console.log('Error stopping GSI service:', error)
        }
        gsiService = null
        isGsiConnected = false
    }
    return isGsiConnected
}

// ========== IPC 处理函数 ==========
export function setupCs2GsiIpc() {
    ipcMain.handle('check-csgo2-running', async () => {
        const isRunning = await checkCsgo2Running()
        return { isRunning }
    })

    ipcMain.handle('check-gsi-config', async (_event, csgo2Path: string) => {
        const exists = checkGsiConfigExists(csgo2Path)
        return { exists }
    })

    ipcMain.handle('create-gsi-config', async (_event, csgo2Path: string) => {
        const success = createGsiConfig(csgo2Path)
        return { success }
    })

    ipcMain.handle('start-gsi-service', async () => {
        return await startGsiService()
    })

    ipcMain.handle('stop-gsi-service', async () => {
        return await stopGsiService()
    })

    ipcMain.handle('check-gsi-connected', async () => {
        return { isConnected: isGsiConnected }
    })

    ipcMain.handle('launch-cs2', async (_event, csgo2Path: string, serverMode: 'perfectworld' | 'worldwide' = 'worldwide', startType: 'steamurl' | 'steamexe' = 'steamurl', steamPath?: string) => {
        return await launchCs2(csgo2Path, serverMode, startType, steamPath)
    })

    ipcMain.handle('wait-for-cs2-launch', async (_event, csgo2Path?: string, maxWaitMs: number = 90000) => {
        return await waitForCs2Launch(csgo2Path, maxWaitMs)
    })
}

