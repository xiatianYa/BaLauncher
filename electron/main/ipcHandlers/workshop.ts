import { app, ipcMain, protocol, shell } from 'electron'
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

/** 预览图候选文件名（按优先级） */
const PREVIEW_NAMES = ['preview.jpg', 'preview.jpeg', 'preview.png']

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
    installed: true,
    subscribedTime: birthtime ? formatTime(birthtime) : '',
    updatedTime: mtime ? formatTime(mtime) : '',
    description,
    publishData
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
  })
}
