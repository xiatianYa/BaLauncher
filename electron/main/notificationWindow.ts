import { BrowserWindow, screen, type Display, type Rectangle } from 'electron'
import { getMainWindow } from './windowManager'

interface NotificationData {
  title: string
  message: string
  serverName?: string
  connectStr?: string
  mapName?: string
  mapImage?: string
  mapChineseName?: string
}

interface NotificationWindowItem {
  window: BrowserWindow
  id: number
}

// 通知窗口列表
let notificationWindows: NotificationWindowItem[] = []
let notificationIdCounter = 0

// 通知窗口配置
const NOTIFICATION_CONFIG = {
  width: 360,
  height: 144,
  gap: 10, // 通知之间的间距
  maxNotifications: 5, // 最大显示通知数量
  displayDuration: 30000, // 显示时长 30秒
}

/** 通知相对屏幕边缘的边距 */
const NOTIFICATION_MARGIN = 20

/** 通知显示位置（九宫格 key），由渲染进程「消息提示框显示位置」设置同步，默认与设置页一致：顶部居中 */
let notificationPosition = 'top-center'

/** 设置通知显示位置（渲染进程设置变更 / 应用启动时同步），变更后重排已显示的通知 */
export function setNotificationPosition(position: string): void {
  notificationPosition = position
  repositionNotifications()
}

export function createNotificationWindow(data: NotificationData): void {
  const workArea = getNotificationDisplay().workArea

  // 如果超过最大通知数量，移除最旧的通知
  if (notificationWindows.length >= NOTIFICATION_CONFIG.maxNotifications) {
    const oldest = notificationWindows.shift()
    if (oldest && !oldest.window.isDestroyed()) {
      oldest.window.close()
    }
    // 重新排列剩余通知
    repositionNotifications()
  }

  const notificationId = ++notificationIdCounter
  const position = calculatePosition(notificationWindows.length, workArea)

  const notificationWindow = new BrowserWindow({
    width: NOTIFICATION_CONFIG.width,
    height: NOTIFICATION_CONFIG.height,
    x: position.x,
    y: position.y,
    frame: false,
    skipTaskbar: true,
    // 不置顶：游戏等全屏应用在前台时通知不会覆盖屏幕，仅在其后正常显示
    resizable: false,
    movable: false,
    focusable: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    // 依附主窗口：即使 focusable/skipTaskbar 未生效也不会作为独立应用出现在 ALT+TAB
    parent: getMainWindow() || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  })

  // 构建通知 HTML 内容
  const htmlContent = generateNotificationHtml(data, notificationId)

  notificationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

  notificationWindow.once('ready-to-show', () => {
    notificationWindow.show()
  })

  // 添加到通知列表
  notificationWindows.push({ window: notificationWindow, id: notificationId })

  // 30秒后自动关闭
  setTimeout(() => {
    closeNotificationWindowById(notificationId)
  }, NOTIFICATION_CONFIG.displayDuration)

  // 窗口关闭时从列表中移除
  notificationWindow.on('closed', () => {
    removeNotificationFromList(notificationId)
    // 重新排列剩余通知
    repositionNotifications()
  })
}

/** 获取通知所在显示器：跟随主窗口所在屏（多屏下不固定主屏），主窗口不可用时回退主显示器 */
function getNotificationDisplay(): Display {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    return screen.getDisplayMatching(mainWindow.getBounds())
  }
  return screen.getPrimaryDisplay()
}

/** 按九宫格 key 计算通知位置：基准点贴合所选边/角，多条通知向屏幕中央方向堆叠 */
function calculatePosition(index: number, workArea: Rectangle): { x: number; y: number } {
  const { x: dx, y: dy, width: sw, height: sh } = workArea
  // 'center' 是 'middle-center' 的简写，统一拆成 [垂直, 水平]
  const [vertical, horizontal] = notificationPosition === 'center' ? ['middle', 'center'] : notificationPosition.split('-')
  let x = 0
  let y = 0
  if (horizontal === 'left') x = NOTIFICATION_MARGIN
  else if (horizontal === 'right') x = sw - NOTIFICATION_CONFIG.width - NOTIFICATION_MARGIN
  else x = Math.round((sw - NOTIFICATION_CONFIG.width) / 2)
  const offsetY = index * (NOTIFICATION_CONFIG.height + NOTIFICATION_CONFIG.gap)
  if (vertical === 'bottom') y = sh - NOTIFICATION_CONFIG.height - NOTIFICATION_MARGIN - offsetY
  else if (vertical === 'top') y = NOTIFICATION_MARGIN + offsetY
  else y = Math.round((sh - NOTIFICATION_CONFIG.height) / 2) + offsetY
  return { x: dx + x, y: dy + y }
}

// 重新排列所有通知位置
function repositionNotifications(): void {
  const workArea = getNotificationDisplay().workArea
  notificationWindows.forEach((item, index) => {
    if (!item.window.isDestroyed()) {
      const position = calculatePosition(index, workArea)
      item.window.setPosition(position.x, position.y)
    }
  })
}

// 安全关闭通知窗口
function safeCloseNotificationWindow(notificationItem: NotificationWindowItem): void {
  if (!notificationItem.window.isDestroyed()) {
    notificationItem.window.close()
  }
}

// 根据ID关闭通知窗口
function closeNotificationWindowById(id: number): void {
  const notificationItem = notificationWindows.find(item => item.id === id)
  if (notificationItem && !notificationItem.window.isDestroyed()) {
    // 添加淡出动画
    notificationItem.window.webContents.executeJavaScript(`
      document.body.style.animation = 'fadeOut 0.3s ease forwards';
    `).then(() => {
      setTimeout(() => safeCloseNotificationWindow(notificationItem), 300)
    }).catch(() => safeCloseNotificationWindow(notificationItem))
  }
}

// 从列表中移除通知
function removeNotificationFromList(id: number): void {
  notificationWindows = notificationWindows.filter(item => item.id !== id)
}

export function closeNotificationWindow(): void {
  // 关闭所有通知窗口
  notificationWindows.forEach(item => {
    if (!item.window.isDestroyed()) {
      item.window.close()
    }
  })
  notificationWindows = []
}

function generateNotificationHtml(data: NotificationData, notificationId: number): string {
  const hasChineseName = data.mapChineseName && data.mapChineseName.trim() !== ''
  const mapLabel = hasChineseName ? data.mapChineseName : data.mapName

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>通知</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: transparent;
      overflow: hidden;
      user-select: none;
    }

    .notification-card {
      width: 360px;
      height: 144px;
      background: rgba(35, 38, 45, 0.96);
      border-radius: 14px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 0 18px rgba(0, 0, 0, 0.18);
      padding: 14px;
      display: flex;
      gap: 14px;
      animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(18px);
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: #4b9afa;
      animation: progress 30s linear forwards;
      opacity: 0.75;
    }

    .icon-wrapper {
      width: 60px;
      height: 60px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.05);
    }

    .tool-icon {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .notification-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.92);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-subtitle {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .notification-subtitle .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #3b82f6;
    }

    .notification-map {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }

    .notification-map .label {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }

    .notification-map .name {
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
      padding-top: 10px;
    }

    .btn {
      flex: 1;
      height: 28px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    .btn:active {
      transform: scale(0.98);
    }

    .btn-close {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.65);
    }

    .btn-close:hover {
      background: rgba(255, 255, 255, 0.14);
      color: rgba(255, 255, 255, 0.85);
    }

    .btn-join {
      background: #3b82f6;
      color: #ffffff;
    }

    .btn-join:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="notification-card">
    <div class="icon-wrapper">
      <img src="${escapeHtml(data.mapImage || '')}" class="tool-icon" onerror="this.style.display='none'" />
    </div>
    <div class="notification-content">
      <h3 class="notification-title">${escapeHtml(data.serverName || data.title)}</h3>
      <div class="notification-subtitle">
        <span class="dot"></span>
        <span>你订阅的地图正在该服务器运行</span>
      </div>
      <div class="notification-map">
        <span class="label">当前地图</span>
        <span class="name">${escapeHtml(mapLabel || data.message)}</span>
      </div>
      <div class="notification-actions">
        <button class="btn btn-close" onclick="event.stopPropagation(); window.close();">关闭</button>
        <button class="btn btn-join" onclick="event.stopPropagation(); joinServer('${escapeHtml(data.connectStr || '')}');">立即进服</button>
      </div>
    </div>
    <div class="progress-bar"></div>
  </div>

  <script>
    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn')) return;
      window.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.close();
    });

    function joinServer(connectStr) {
      if (connectStr) {
        const aLink = document.createElement('a');
        aLink.href = 'steam://rungame/730/76561198977557298/+connect ' + connectStr;
        aLink.click();
      }
      window.close();
    }
  </script>
</body>
</html>`
}

function escapeHtml(text: string | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function setupNotificationIpc(ipcMain: typeof import('electron').ipcMain): void {
  ipcMain.handle('show-notification', (_event, data: NotificationData) => {
    createNotificationWindow(data)
  })

  ipcMain.handle('close-notification', () => {
    closeNotificationWindow()
  })

  // 渲染进程「消息提示框显示位置」设置变更时同步（地图订阅等系统通知按此位置摆放）
  ipcMain.handle('update-notification-position', (_event, position: string) => {
    setNotificationPosition(position)
  })
}
