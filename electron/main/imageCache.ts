import { app, protocol, session, net, ipcMain } from 'electron'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 图片磁盘缓存
 *
 * 原理：
 * 1. 注册自定义协议 `img-cache://`（必须在 app ready 之前调用 registerImageCacheScheme）
 * 2. app ready 后通过 session.webRequest 拦截所有远程图片请求（resourceType === 'image'）
 * 3. 已缓存的图片：直接重定向到 `img-cache://local/<文件名>`，由 protocol.handle 从磁盘读取
 * 4. 未缓存的图片：放行原网络请求，同时在后台下载并写入缓存目录，下次访问命中本地
 *
 * 覆盖范围：地图缩略图(mapUrl)、社区 logo、用户头像、按键图标、通知窗口图片等所有远程图片
 */

/** 自定义图片缓存协议名 */
const CACHE_SCHEME = 'img-cache'

/** 缓存目录名（位于 userData 下） */
const CACHE_DIR_NAME = 'image-cache'

/** 下载超时时间（毫秒） */
const DOWNLOAD_TIMEOUT = 15000

/** 图片扩展名 -> MIME 类型映射 */
const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif'
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
 */
function getCacheFileName(url: string): string {
  // 从 URL 提取扩展名，默认使用 .img
  let ext = '.img'
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/i)
    if (match && MIME_MAP[`.${match[1].toLowerCase()}`]) {
      ext = `.${match[1].toLowerCase()}`
    }
  } catch {
    // URL 解析失败时使用默认扩展名
  }
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 32)
  return `${hash}${ext}`
}

/**
 * 获取 URL 对应的缓存文件完整路径
 */
function getCacheFilePath(url: string): string {
  return path.join(cacheDir, getCacheFileName(url))
}

/**
 * 下载远程图片并写入缓存目录
 */
async function downloadToCache(url: string): Promise<void> {
  // 已存在缓存文件则跳过
  const filePath = getCacheFilePath(url)
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

  // 拦截所有远程图片请求
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      // 只处理图片类型请求
      if (details.resourceType !== 'image') {
        callback({})
        return
      }

      const filePath = getCacheFilePath(details.url)

      if (fs.existsSync(filePath)) {
        // 命中缓存：重定向到本地协议，不再请求网络
        const fileName = path.basename(filePath)
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
