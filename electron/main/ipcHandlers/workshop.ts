import { app, ipcMain, protocol, shell } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { getSteamPathFromRegistry } from './gamePath'

/**
 * Steam 创意工坊资源读取
 *
 * 1. 注册自定义协议 `local-file://`（必须在 app ready 之前），用于在渲染进程展示
 *    创意工坊目录内的本地预览图（绕过 dev 模式 http 页面无法直接加载 file:// 的限制）。
 * 2. 提供 IPC `get-workshop-resources`：读取 `{steamPath}/steamapps/workshop/content/730`
 *    下的所有订阅资源（目录名 = 创意工坊物品 ID），返回标题/预览图/大小/时间等元数据。
 */

/** 本地文件协议名 */
const SCHEME = 'local-file'

/** CS2 创意工坊应用 ID */
const APP_ID = '730'

/** 创意工坊内容根目录列表（覆盖多个盘符的 Steam 库，首次读取时记录，供协议 handler 使用） */
let workshopBases: string[] = []

/** Steam 主安装路径（读取工坊清单时记录，供删除后同步 appworkshop ACF 使用） */
let steamInstallPath = ''

/** 预览图候选文件名（按优先级） */
const PREVIEW_NAMES = ['preview.jpg', 'preview.jpeg', 'preview.png']

/** VDF 值：字符串或嵌套对象 */
type VdfValue = string | VdfObject

/** VDF 嵌套对象：键值对，值可为字符串或继续嵌套 */
interface VdfObject {
  [key: string]: VdfValue
}

/** 解析 VDF KeyValues 文本为嵌套对象（保留文档顺序） */
function parseVdf(text: string): Record<string, VdfValue> {
  const tokens: string[] = []
  const regex = /"((?:\\.|[^"\\])*)"|([{}])/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match[1] !== undefined) tokens.push(match[1])
    else tokens.push(match[2])
  }
  let idx = 0
  const parseObject = (): Record<string, VdfValue> => {
    const obj: Record<string, VdfValue> = {}
    while (idx < tokens.length) {
      const key = tokens[idx]
      if (key === '}') {
        idx++
        return obj
      }
      idx++
      if (idx >= tokens.length) break
      const value = tokens[idx]
      if (value === '{') {
        idx++
        obj[key] = parseObject()
      } else {
        idx++
        obj[key] = value
      }
    }
    return obj
  }
  return parseObject()
}

/** 将嵌套对象序列化为 VDF KeyValues 文本（tab 缩进） */
function serializeVdf(root: Record<string, VdfValue>): string {
  const lines: string[] = []
  const walk = (obj: Record<string, VdfValue>, depth: number) => {
    for (const [key, value] of Object.entries(obj)) {
      const pad = '\t'.repeat(depth)
      if (typeof value === 'object') {
        lines.push(`${pad}"${key}"`)
        lines.push(`${pad}{`)
        walk(value, depth + 1)
        lines.push(`${pad}}`)
      } else {
        lines.push(`${pad}"${key}"\t\t"${value}"`)
      }
    }
  }
  walk(root, 0)
  return lines.join('\n')
}

/**
 * 从 Steam 安装目录的 `{steamPath}/steamapps/workshop/appworkshop_730.acf` 中移除已删除的工坊条目。
 * 注意：appworkshop ACF 固定位于 Steam 安装目录（如 D:\Steam）的 steamapps/workshop 下，
 * 而非各库目录。工坊条目实际分布在两个节点（均以物品 ID 为键）：
 * - WorkshopItemsInstalled：安装状态（size / timeupdated / manifest）
 * - WorkshopItemDetails：订阅详情（manifest / timeupdated / subscribedby 等）
 * 仅删除文件而不清理该清单会导致 Steam 认为内容仍已安装：进服务器报模型 ERROR 且不会重新下载。
 */
function removeWorkshopItemsFromAcf(steamPath: string, ids: string[]): { removed: number; updated: boolean } {
  if (ids.length === 0 || !steamPath) return { removed: 0, updated: false }
  let removed = 0
  let updated = false
  // ACF 位于 Steam 安装目录（如 D:\Steam）的 steamapps/workshop 下
  const acfPath = path.join(steamPath, 'steamapps', 'workshop', `appworkshop_${APP_ID}.acf`)
  if (!fs.existsSync(acfPath)) return { removed: 0, updated: false }
  try {
    const content = fs.readFileSync(acfPath, 'utf-8')
    // 保留可能的 UTF-8 BOM（Steam 写入的 ACF 通常带 BOM），解析前剥离、写回时还原
    const hasBom = content.charCodeAt(0) === 0xfeff
    const root = parseVdf(hasBom ? content.slice(1) : content)
    const appWorkshop = root['AppWorkshop']
    if (!appWorkshop || typeof appWorkshop === 'string') return { removed: 0, updated: false }
    // 遍历所有工坊条目容器（含历史遗留的 WorkshopItems），同步清理已删除的 ID
    let changed = false
    const removedIds = new Set<string>()
    for (const containerName of ['WorkshopItemsInstalled', 'WorkshopItemDetails', 'WorkshopItems']) {
      const container = appWorkshop[containerName]
      if (!container || typeof container === 'string') continue
      for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(container, id)) {
          delete container[id]
          if (!removedIds.has(id)) {
            removedIds.add(id)
            removed++
          }
          changed = true
        }
      }
    }
    if (changed) {
      // 重算 SizeOnDisk：等于剩余条目 size 之和（Steam 按此汇总总占用空间）
      const installed = appWorkshop['WorkshopItemsInstalled']
      if (installed && typeof installed === 'object') {
        let total = 0
        for (const entry of Object.values(installed)) {
          if (entry && typeof entry === 'object' && typeof entry['size'] === 'string') {
            total += Number(entry['size']) || 0
          }
        }
        appWorkshop['SizeOnDisk'] = String(total)
      }
      // 原子写入（先写临时文件再替换），避免 Steam 读到半截文件
      const tmpPath = `${acfPath}.tmp`
      fs.writeFileSync(tmpPath, (hasBom ? '\uFEFF' : '') + serializeVdf(root), 'utf-8')
      fs.renameSync(tmpPath, acfPath)
      updated = true
    }
  } catch {
    // ACF 处理失败忽略
  }
  return { removed, updated }
}

/**
 * 注册自定义协议（必须在 app ready 之前调用）
 */
export function registerWorkshopScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false
      }
    }
  ])
}

/** 时间格式化 yyyy-MM-dd HH:mm:ss */
function formatTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 递归统计目录大小（字节） */
function getDirSize(dir: string): number {
  let total = 0
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      try {
        if (entry.isDirectory()) {
          total += getDirSize(fullPath)
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size
        }
      } catch {
        // 单个文件统计失败忽略
      }
    }
  } catch {
    // 目录读取失败忽略
  }
  return total
}

/** 简易 HTML 转纯文本（description.txt 通常为 HTML 片段） */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 根据标题/描述关键词推断资源类型 */
function guessType(text: string): 'map' | 'mod' | 'skin' | 'sound' {
  const t = text.toLowerCase()
  if (/(\.bsp|map|de_|cs_|aim_|training)/.test(t)) return 'map'
  if (/(skin|weapon|ak-|awp|m4a|m4a1|gloves|knife)/.test(t)) return 'skin'
  if (/(sound|audio|footstep|hitmarker|voice|music)/.test(t)) return 'sound'
  return 'mod'
}

/** 解析 VDF KeyValues 文本（如 publish_data.txt），提取全部键值对 */
function parseKeyValues(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const regex = /"([^"\r\n]+)"\s+"([^"\r\n]*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    result[match[1]] = match[2]
  }
  return result
}

/** 解析 libraryfolders.vdf 获取全部 Steam 库路径（含 Steam 主安装目录，兼容多盘符库） */
function getSteamLibraryPaths(steamPath: string): string[] {
  const libs = [steamPath]
  const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
  if (fs.existsSync(vdfPath)) {
    try {
      const content = fs.readFileSync(vdfPath, 'utf-8')
      const regex = /"path"\s*"([^"]+)"/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(content)) !== null) {
        if (match[1] && !libs.includes(match[1])) libs.push(match[1])
      }
    } catch {
      // 解析失败忽略
    }
  }
  return libs
}

/** 查找所有包含 CS2 创意工坊订阅内容的目录（可能是任意盘符的 Steam 库） */
function getWorkshopBases(steamPath: string): string[] {
  const bases: string[] = []
  for (const lib of getSteamLibraryPaths(steamPath)) {
    const base = path.join(lib, 'steamapps', 'workshop', 'content', APP_ID)
    if (fs.existsSync(base)) bases.push(base)
  }
  return bases
}

/** 读取单个订阅资源目录的元数据 */
function readWorkshopItem(base: string, itemId: string): Record<string, unknown> | null {
  const dir = path.join(base, itemId)

  // 预览图
  let preview = ''
  for (const name of PREVIEW_NAMES) {
    if (fs.existsSync(path.join(dir, name))) {
      preview = `${SCHEME}://local/${APP_ID}/${itemId}/${name}`
      break
    }
  }

  // 发布信息文件（VDF KeyValues 格式，含标题/源文件夹/发布时间等）
  let publishData: Record<string, string> = {}
  const publishFile = path.join(dir, 'publish_data.txt')
  if (fs.existsSync(publishFile)) {
    try {
      publishData = parseKeyValues(fs.readFileSync(publishFile, 'utf-8'))
    } catch {
      // 解析失败忽略
    }
  }

  // 标题优先级：publish_data 的 title > 描述首行 > #itemId
  let title = publishData.title || `#${itemId}`
  let description = ''
  const descFile = path.join(dir, 'description.txt')
  if (fs.existsSync(descFile)) {
    try {
      const text = stripHtml(fs.readFileSync(descFile, 'utf-8'))
      const firstLine = text.split('\n').find(line => line.trim())?.trim() || ''
      if (firstLine && !publishData.title) title = firstLine
      description = text.length > 500 ? text.slice(0, 500) : text
    } catch {
      // 描述读取失败忽略
    }
  }

  let mtime = 0
  let birthtime = 0
  try {
    const stat = fs.statSync(dir)
    mtime = stat.mtimeMs
    birthtime = stat.birthtimeMs
  } catch {
    // 目录不可读时忽略
  }

  return {
    id: Number(itemId),
    itemId: Number(itemId),
    title,
    type: guessType(`${title} ${description}`),
    preview,
    size: getDirSize(dir),
    subscribedTime: birthtime ? formatTime(birthtime) : '',
    updatedTime: mtime ? formatTime(mtime) : '',
    description,
    publishData
  }
}

/** promisify 后的 exec，用于执行 tasklist 等命令 */
const execPromise = promisify(exec)

/** 检查 Steam 客户端是否正在运行（通过 tasklist 查询 steam.exe 进程） */
async function isSteamRunning(): Promise<boolean> {
  try {
    const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq steam.exe" /NH')
    return /steam\.exe/i.test(stdout)
  } catch {
    // 查询失败时保守返回 false，不阻塞删除流程
    return false
  }
}

/**
 * 初始化创意工坊 IPC：注册协议处理 + 资源读取
 * 注意：protocol.handle / ipcMain.handle 必须在 app ready 后注册，否则会抛出
 * "Session can only be received when app is ready" 错误（协议本身已在 ready 前注册）
 */
export function setupWorkshopIpc(): void {
  app.whenReady().then(() => {
    // 协议处理：仅允许读取创意工坊内容目录内的文件，防止路径穿越
    protocol.handle(SCHEME, async (request) => {
      try {
        const url = new URL(request.url)
        if (url.hostname !== 'local' || workshopBases.length === 0) {
          return new Response('Not Found', { status: 404 })
        }
        const segments = url.pathname.split('/').filter(Boolean)
        // 路径格式：/<appId>/<itemId>/<文件名>
        const appId = segments[0]
        const itemId = segments[1]
        const fileName = segments[2] ? path.basename(segments[2]) : ''
        if (appId !== APP_ID || !itemId || !/^\d+$/.test(itemId) || !fileName) {
          return new Response('Not Found', { status: 404 })
        }
        // 在多个 Steam 库中定位该文件
        let filePath = ''
        for (const base of workshopBases) {
          const candidate = path.join(base, itemId, fileName)
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            filePath = candidate
            break
          }
        }
        if (!filePath) {
          return new Response('Not Found', { status: 404 })
        }
        const data = fs.readFileSync(filePath)
        const ext = path.extname(fileName).toLowerCase()
        const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'application/octet-stream'
        return new Response(data, {
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'no-cache'
          }
        })
      } catch {
        return new Response('Error', { status: 500 })
      }
    })

    // 读取创意工坊订阅资源列表
    ipcMain.handle('get-workshop-resources', async (_event, steamPath?: string) => {
      // 未配置路径时尝试注册表自动探测（Steam 可能不在 C 盘）
      if (!steamPath) {
        const detected = await getSteamPathFromRegistry()
        if (detected) steamPath = detected
      }
      if (!steamPath) {
        return { success: false, list: [], error: 'missing-steam-path' }
      }

      // 记录主安装路径，供删除后同步 appworkshop ACF 使用
      steamInstallPath = steamPath

      // 收集所有 Steam 库中的创意工坊目录（主目录 + libraryfolders.vdf 中的其他盘符库）
      const bases = getWorkshopBases(steamPath)
      if (bases.length === 0) {
        return { success: false, list: [], error: 'workshop-dir-not-found' }
      }

      workshopBases = bases
      const list: Record<string, unknown>[] = []
      const seenIds = new Set<number>()
      for (const base of bases) {
        try {
          const entries = fs.readdirSync(base, { withFileTypes: true })
          for (const entry of entries) {
            // 只处理数字命名的子目录（创意工坊物品 ID），跨库按 ID 去重
            if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue
            const id = Number(entry.name)
            if (seenIds.has(id)) continue
            seenIds.add(id)
            const item = readWorkshopItem(base, entry.name)
            if (item) list.push(item)
          }
        } catch {
          // 单个库读取失败跳过，继续其他库
        }
      }

      // 按更新时间倒序
      list.sort((a, b) => String(b.updatedTime).localeCompare(String(a.updatedTime)))
      return { success: true, list }
    })

    // 在系统文件管理器中打开指定资源目录
    ipcMain.handle('open-workshop-folder', async (_event, itemId: number | string) => {
      const id = String(itemId)
      if (workshopBases.length === 0 || !/^\d+$/.test(id)) {
        return { success: false, error: 'invalid-item-id' }
      }
      // 在多个库中定位该订阅资源所在目录
      const dir = workshopBases.map(base => path.join(base, id)).find(base => fs.existsSync(base))
      if (!dir) {
        return { success: false, error: 'not-found' }
      }
      try {
        const errorMessage = await shell.openPath(dir)
        return { success: !errorMessage, error: errorMessage || undefined }
      } catch {
        return { success: false, error: 'open-failed' }
      }
    })

    // 批量删除本地创意工坊订阅目录（从所有 Steam 库中删除，不可恢复）
    ipcMain.handle('delete-workshop-resources', async (_event, itemIds: number[] | string[]) => {
      // 过滤出合法的数字 ID，防止路径注入
      const ids = (itemIds || []).map(id => String(id)).filter(id => /^\d+$/.test(id))
      if (ids.length === 0) {
        return { success: false, deleted: 0, total: 0, error: 'invalid-item-ids' }
      }
      let deleted = 0
      const failedIds: string[] = []
      // 删除前确保用户已退出 Steam 客户端，否则文件被占用会导致删除失败/清单不同步
      if (await isSteamRunning()) {
        return { success: false, deleted: 0, total: ids.length, error: 'steam-running' }
      }
      for (const id of ids) {
        // 在多个 Steam 库中定位并删除该订阅资源目录
        for (const base of workshopBases) {
          const dir = path.join(base, id)
          if (!fs.existsSync(dir)) continue
          try {
            fs.rmSync(dir, { recursive: true, force: true })
            deleted++
          } catch {
            // 目录存在但删除失败（如文件被 Steam/游戏占用），记录到失败列表
            failedIds.push(id)
          }
          // 找到目录（已删除或删除失败）即结束，避免跨库重复统计
          break
        }
      }
      // 同步 appworkshop_730.acf：仅移除已成功删除（或目录已不存在）工坊的条目，
      // 否则 Steam 认为内容仍已安装，进服务器会报模型 ERROR 且不会重新下载被删文件；
      // 删除失败的条目保留在清单中，避免清单与实际文件不一致
      const deletedIds = ids.filter(id => !failedIds.includes(id))
      const acfSteamPath = steamInstallPath || (await getSteamPathFromRegistry())
      const acfResult = removeWorkshopItemsFromAcf(acfSteamPath, deletedIds)
      return {
        success: deleted > 0,
        deleted,
        total: ids.length,
        failed: failedIds.length,
        acfRemoved: acfResult.removed,
        acfUpdated: acfResult.updated
      }
    })
  })
}
