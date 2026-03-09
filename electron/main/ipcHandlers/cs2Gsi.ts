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

        // ========== Provider 事件 ==========
        gsiService.on(EVENTS.provider.nameChanged, (payload: any) => {
            sendGsiDataToRenderer("provider:nameChanged", payload)
        })
        gsiService.on(EVENTS.provider.timestampChanged, (payload: any) => {
            sendGsiDataToRenderer("provider:timestampChanged", payload)
        })

        // ========== Map 事件 ==========
        gsiService.on(EVENTS.map.nameChanged, (payload: any) => {
            sendGsiDataToRenderer("map:nameChanged", payload)
        })
        gsiService.on(EVENTS.map.phaseChanged, (payload: any) => {
            sendGsiDataToRenderer("map:phaseChanged", payload)
        })
        gsiService.on(EVENTS.map.roundChanged, (payload: any) => {
            sendGsiDataToRenderer("map:roundChanged", payload)
        })
        gsiService.on(EVENTS.map.teamCTScoreChanged, (payload: any) => {
            sendGsiDataToRenderer("map:teamCTScoreChanged", payload)
        })
        gsiService.on(EVENTS.map.teamTScoreChanged, (payload: any) => {
            sendGsiDataToRenderer("map:teamTScoreChanged", payload)
        })
        gsiService.on(EVENTS.map.currentSpectatorsChanged, (payload: any) => {
            sendGsiDataToRenderer("map:currentSpectatorsChanged", payload)
        })
        gsiService.on(EVENTS.map.souvenirsTotalChanged, (payload: any) => {
            sendGsiDataToRenderer("map:souvenirsTotalChanged", payload)
        })
        gsiService.on(EVENTS.map.roundWinsChanged, (payload: any) => {
            sendGsiDataToRenderer("map:roundWinsChanged", payload)
        })

        // ========== Round 事件 ==========
        gsiService.on(EVENTS.round.phaseChanged, (payload: any) => {
            sendGsiDataToRenderer("round:phaseChanged", payload)
        })
        gsiService.on(EVENTS.round.started, (payload: any) => {
            sendGsiDataToRenderer("round:started", payload)
        })
        gsiService.on(EVENTS.round.ended, (payload: any) => {
            sendGsiDataToRenderer("round:ended", payload)
        })
        gsiService.on(EVENTS.round.won, (payload: any) => {
            sendGsiDataToRenderer("round:won", payload)
        })

        // ========== Player 事件 ==========
        gsiService.on(EVENTS.player.nameChanged, (payload: any) => {
            sendGsiDataToRenderer("player:nameChanged", payload)
        })
        gsiService.on(EVENTS.player.clanChanged, (payload: any) => {
            sendGsiDataToRenderer("player:clanChanged", payload)
        })
        gsiService.on(EVENTS.player.xpOverloadLevelChanged, (payload: any) => {
            sendGsiDataToRenderer("player:xpOverloadLevelChanged", payload)
        })
        gsiService.on(EVENTS.player.steamidChanged, (payload: any) => {
            sendGsiDataToRenderer("player:steamidChanged", payload)
        })
        gsiService.on(EVENTS.player.teamChanged, (payload: any) => {
            sendGsiDataToRenderer("player:teamChanged", payload)
        })
        gsiService.on(EVENTS.player.activityChanged, (payload: any) => {
            sendGsiDataToRenderer("player:activityChanged", payload)
        })
        gsiService.on(EVENTS.player.observerSlotChanged, (payload: any) => {
            sendGsiDataToRenderer("player:observerSlotChanged", payload)
        })
        gsiService.on(EVENTS.player.specTargetChanged, (payload: any) => {
            sendGsiDataToRenderer("player:specTargetChanged", payload)
        })
        gsiService.on(EVENTS.player.positionChanged, (payload: any) => {
            sendGsiDataToRenderer("player:positionChanged", payload)
        })
        gsiService.on(EVENTS.player.forwardDirectionChanged, (payload: any) => {
            sendGsiDataToRenderer("player:forwardDirectionChanged", payload)
        })
        gsiService.on(EVENTS.player.hpChanged, (payload: any) => {
            sendGsiDataToRenderer("player:hpChanged", payload)
        })
        gsiService.on(EVENTS.player.armorChanged, (payload: any) => {
            sendGsiDataToRenderer("player:armorChanged", payload)
        })
        gsiService.on(EVENTS.player.helmetChanged, (payload: any) => {
            sendGsiDataToRenderer("player:helmetChanged", payload)
        })
        gsiService.on(EVENTS.player.flashedChanged, (payload: any) => {
            sendGsiDataToRenderer("player:flashedChanged", payload)
        })
        gsiService.on(EVENTS.player.smokedChanged, (payload: any) => {
            sendGsiDataToRenderer("player:smokedChanged", payload)
        })
        gsiService.on(EVENTS.player.burningChanged, (payload: any) => {
            sendGsiDataToRenderer("player:burningChanged", payload)
        })
        gsiService.on(EVENTS.player.moneyChanged, (payload: any) => {
            sendGsiDataToRenderer("player:moneyChanged", payload)
        })
        gsiService.on(EVENTS.player.equipmentValueChanged, (payload: any) => {
            sendGsiDataToRenderer("player:equipmentValueChanged", payload)
        })
        gsiService.on(EVENTS.player.weaponChanged, (payload: any) => {
            sendGsiDataToRenderer("player:weaponChanged", payload)
        })
        gsiService.on(EVENTS.player.ammoClipChanged, (payload: any) => {
            sendGsiDataToRenderer("player:ammoClipChanged", payload)
        })
        gsiService.on(EVENTS.player.ammoReserveChanged, (payload: any) => {
            sendGsiDataToRenderer("player:ammoReserveChanged", payload)
        })
        gsiService.on(EVENTS.player.killsChanged, (payload: any) => {
            sendGsiDataToRenderer("player:killsChanged", payload)
        })
        gsiService.on(EVENTS.player.deathsChanged, (payload: any) => {
            sendGsiDataToRenderer("player:deathsChanged", payload)
        })
        gsiService.on(EVENTS.player.assistsChanged, (payload: any) => {
            sendGsiDataToRenderer("player:assistsChanged", payload)
        })
        gsiService.on(EVENTS.player.scoreChanged, (payload: any) => {
            sendGsiDataToRenderer("player:scoreChanged", payload)
        })
        gsiService.on(EVENTS.player.mvpsChanged, (payload: any) => {
            sendGsiDataToRenderer("player:mvpsChanged", payload)
        })

        // ========== PhaseCountdowns 事件 ==========
        gsiService.on(EVENTS.phaseCountdowns.phaseChanged, (payload: any) => {
            sendGsiDataToRenderer("phaseCountdowns:phaseChanged", payload)
        })
        gsiService.on(EVENTS.phaseCountdowns.phaseEndsInChanged, (payload: any) => {
            sendGsiDataToRenderer("phaseCountdowns:phaseEndsInChanged", payload)
        })

        // ========== AllPlayers 事件 ==========
        gsiService.on(EVENTS.allPlayers.joined, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:joined", payload)
        })
        gsiService.on(EVENTS.allPlayers.left, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:left", payload)
        })
        gsiService.on(EVENTS.allPlayers.teamChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:teamChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.observerSlotChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:observerSlotChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.positionChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:positionChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.forwardDirectionChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:forwardDirectionChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.hpChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:hpChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.armorChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:armorChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.helmetChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:helmetChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.flashedChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:flashedChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.smokedChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:smokedChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.burningChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:burningChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.moneyChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:moneyChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.equipmentValueChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:equipmentValueChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.weaponChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:weaponChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.ammoClipChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:ammoClipChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.ammoReserveChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:ammoReserveChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.killsChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:killsChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.deathsChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:deathsChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.assistsChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:assistsChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.scoreChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:scoreChanged", payload)
        })
        gsiService.on(EVENTS.allPlayers.mvpsChanged, (payload: any) => {
            sendGsiDataToRenderer("allPlayers:mvpsChanged", payload)
        })

        // ========== Bomb 事件 ==========
        gsiService.on(EVENTS.bomb.stateChanged, (payload: any) => {
            sendGsiDataToRenderer("bomb:stateChanged", payload)
        })
        gsiService.on(EVENTS.bomb.positionChanged, (payload: any) => {
            sendGsiDataToRenderer("bomb:positionChanged", payload)
        })
        gsiService.on(EVENTS.bomb.playerChanged, (payload: any) => {
            sendGsiDataToRenderer("bomb:playerChanged", payload)
        })

        // ========== Grenades 事件 ==========
        gsiService.on(EVENTS.grenades.existenceChanged, (payload: any) => {
            sendGsiDataToRenderer("grenades:existenceChanged", payload)
        })
        gsiService.on(EVENTS.grenades.positionChanged, (payload: any) => {
            sendGsiDataToRenderer("grenades:positionChanged", payload)
        })
        gsiService.on(EVENTS.grenades.velocityChanged, (payload: any) => {
            sendGsiDataToRenderer("grenades:velocityChanged", payload)
        })
        gsiService.on(EVENTS.grenades.lifetimeChanged, (payload: any) => {
            sendGsiDataToRenderer("grenades:lifetimeChanged", payload)
        })
        gsiService.on(EVENTS.grenades.effectTimeChanged, (payload: any) => {
            sendGsiDataToRenderer("grenades:effectTimeChanged", payload)
        })
        gsiService.on(EVENTS.grenades.flamesChanged, (payload: any) => {
            sendGsiDataToRenderer("grenades:flamesChanged", payload)
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

