import { app, protocol, session, net, ipcMain } from 'electron'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 图片磁盘缓存
 *
 * 原理：
 * 1. 注册自定义协议 `img-cache://`（必须在 app ready 之前调用 registerImageCacheScheme）
 * 2. app ready 后通过 session.webRequest 拦截所有远程图片/视频请求（resourceType === 'image' | 'media'）
 * 3. 已缓存的资源：直接重定向到 `img-cache://local/<文件名>`，由 protocol.handle 从磁盘读取
 * 4. 未缓存的资源：放行原网络请求，同时在后台下载并写入缓存目录，下次访问命中本地
 *
 * 覆盖范围：地图缩略图(mapUrl)、社区 logo、用户头像、按键图标、通知窗口图片、视频等远程图片/媒体
 * 仅缓存常见图片（png/jpg/jpeg/gif/webp/bmp/avif/ico）与视频（mp4/webm/mkv/mov/avi/flv），
 * SVG 与无扩展名等未知格式一律不缓存
 */

/** 自定义图片缓存协议名 */
const CACHE_SCHEME = 'img-cache'

/** 缓存目录名（位于 userData 下） */
const CACHE_DIR_NAME = 'image-cache'

/** 下载超时时间（毫秒） */
const DOWNLOAD_TIMEOUT = 15000

/** 允许缓存的扩展名 -> MIME 类型映射（仅图片与视频；SVG 可含脚本、未知扩展名等一律不缓存） */
const MIME_MAP: Record<string, string> = {
  // 图片
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  // 视频
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.flv': 'video/x-flv',
}

/** 缓存目录绝对路径 */
let cacheDir = ''

/** 正在下载中的 URL 集合，避免重复下载 */
const downloadingUrls = new Set<string>()

/**
 * 注册自定义协议（必须在 app ready 之前调用）
 */
export function registerImageCacheScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: CACHE_SCHEME,
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

/**
 * 根据 URL 计算缓存文件名（hash + 原扩展名）
 * 仅返回 MIME_MAP 允许的扩展名；SVG、无扩展名等不允许缓存的 URL 返回 null
 */
function getCacheFileName(url: string): string | null {
  let ext = ''
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/i)
    if (match && MIME_MAP[`.${match[1].toLowerCase()}`]) {
      ext = `.${match[1].toLowerCase()}`
    }
  } catch {
    // URL 解析失败时按不缓存处理
  }
  if (!ext) return null
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 32)
  return `${hash}${ext}`
}

/**
 * 获取 URL 对应的缓存文件完整路径；不支持缓存的 URL 返回空字符串
 */
function getCacheFilePath(url: string): string {
  const fileName = getCacheFileName(url)
  return fileName ? path.join(cacheDir, fileName) : ''
}

/**
 * 下载远程图片/视频并写入缓存目录
 */
async function downloadToCache(url: string): Promise<void> {
  // 不允许缓存的 URL（SVG、无扩展名等）直接跳过
  const filePath = getCacheFilePath(url)
  if (!filePath) return

  // 已存在缓存文件则跳过
  if (fs.existsSync(filePath)) return

  // 避免同一 URL 并发重复下载
  if (downloadingUrls.has(url)) return
  downloadingUrls.add(url)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT)

  try {
    const response = await net.fetch(url, { signal: controller.signal })
    if (!response.ok) return
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) return
    // 先写入临时文件再重命名，避免写入一半时被读取
    const tmpPath = `${filePath}.tmp`
    fs.writeFileSync(tmpPath, buffer)
    fs.renameSync(tmpPath, filePath)
  } catch {
    // 下载失败不做处理，下次访问会重新尝试
  } finally {
    clearTimeout(timer)
    downloadingUrls.delete(url)
  }
}

/**
 * 初始化图片缓存：注册协议处理 + 拦截远程图片请求
 * 内部等待 app ready 后再执行，可直接在启动时调用
 */
export function setupImageCache(): void {
  app.whenReady().then(() => {
    initImageCache()
  })
}

/**
 * 实际初始化逻辑（app ready 之后执行）
 */
function initImageCache(): void {
  cacheDir = path.join(app.getPath('userData'), CACHE_DIR_NAME)
  fs.mkdirSync(cacheDir, { recursive: true })

  // 处理 img-cache://local/<文件名> 请求，从磁盘读取缓存文件
  protocol.handle(CACHE_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      // 只允许 local 主机名，防止路径穿越
      if (url.hostname !== 'local') {
        return new Response('Not Found', { status: 404 })
      }
      const fileName = path.basename(url.pathname)
      if (!fileName) {
        return new Response('Not Found', { status: 404 })
      }
      const filePath = path.join(cacheDir, fileName)
      if (!fs.existsSync(filePath)) {
        return new Response('Not Found', { status: 404 })
      }
      const data = fs.readFileSync(filePath)
      const ext = path.extname(fileName).toLowerCase()
      return new Response(data, {
        headers: {
          'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache'
        }
      })
    } catch {
      return new Response('Error', { status: 500 })
    }
  })

  // 拦截所有远程图片/视频请求
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      // 只处理图片与视频类型请求（media 包含 <video>/<audio> 等媒体资源）
      if (details.resourceType !== 'image' && details.resourceType !== 'media') {
        callback({})
        return
      }

      // 不允许缓存的 URL（SVG、无扩展名等）直接放行，不写入缓存
      const fileName = getCacheFileName(details.url)

      if (fileName && fs.existsSync(path.join(cacheDir, fileName))) {
        // 命中缓存：重定向到本地协议，不再请求网络
        callback({ redirectURL: `${CACHE_SCHEME}://local/${fileName}` })
      } else {
        // 未命中缓存：放行网络请求，后台下载缓存
        callback({})
        void downloadToCache(details.url)
      }
    }
  )

  // 提供图片缓存查询/清理 IPC
  ipcMain.handle('image-cache:get-info', async () => {
    let count = 0
    let totalSize = 0
    try {
      const files = fs.readdirSync(cacheDir)
      for (const file of files) {
        const filePath = path.join(cacheDir, file)
        try {
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            count++
            totalSize += stat.size
          }
        } catch {
          // 单个文件统计失败忽略
        }
      }
    } catch {
      // 目录不存在时返回 0
    }
    return { count, totalSize }
  })

  ipcMain.handle('image-cache:clear', async () => {
    try {
      const files = fs.readdirSync(cacheDir)
      for (const file of files) {
        const filePath = path.join(cacheDir, file)
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath)
          }
        } catch {
          // 单个文件删除失败忽略
        }
      }
    } catch {
      // 目录不存在时忽略
    }
    return { success: true }
  })
}
