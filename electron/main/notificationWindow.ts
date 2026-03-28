import { BrowserWindow, screen } from 'electron'

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
  height: 140,
  gap: 10, // 通知之间的间距
  maxNotifications: 5, // 最大显示通知数量
  displayDuration: 30000, // 显示时长 30秒
}

export function createNotificationWindow(data: NotificationData): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // 如果超过最大通知数量，移除最旧的通知
  if (notificationWindows.length >= NOTIFICATION_CONFIG.maxNotifications) {
    const oldest = notificationWindows.shift()
    if (oldest && !oldest.window.isDestroyed()) {
      oldest.window.close()
    }
    // 重新排列剩余通知
    repositionNotifications(screenWidth, screenHeight)
  }

  const notificationId = ++notificationIdCounter
  const position = calculatePosition(notificationWindows.length, screenWidth, screenHeight)

  const notificationWindow = new BrowserWindow({
    width: NOTIFICATION_CONFIG.width,
    height: NOTIFICATION_CONFIG.height,
    x: position.x,
    y: position.y,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    focusable: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
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
    notificationWindow.setAlwaysOnTop(true, 'screen-saver')
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
    repositionNotifications(screenWidth, screenHeight)
  })
}

// 计算通知位置
function calculatePosition(index: number, screenWidth: number, screenHeight: number): { x: number; y: number } {
  const x = screenWidth - NOTIFICATION_CONFIG.width - 20
  const y = 20 + index * (NOTIFICATION_CONFIG.height + NOTIFICATION_CONFIG.gap)
  return { x, y }
}

// 重新排列所有通知位置
function repositionNotifications(screenWidth: number, screenHeight: number): void {
  notificationWindows.forEach((item, index) => {
    if (!item.window.isDestroyed()) {
      const position = calculatePosition(index, screenWidth, screenHeight)
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
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: transparent;
      overflow: hidden;
      user-select: none;
    }

    .notification-card {
      width: 360px;
      min-height: 120px;
      background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(40, 40, 55, 0.95) 100%);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px);
    }

    .notification-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
      animation: progress 30s linear forwards;
      opacity: 0.6;
    }

    .icon-wrapper {
      height: 60px;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .tool-icon {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    .notification-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .notification-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }

    .notification-message {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      line-height: 1.4;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .btn-close {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
    }

    .btn-join {
      background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="notification-card" onclick="window.close()">
    <div class="icon-wrapper">
      <img src="${escapeHtml(data.mapImage || '')}" class="tool-icon" onerror="this.style.display='none'" />
    </div>
    <div class="notification-content">
      <h3 class="notification-title">${escapeHtml(data.serverName || data.title)}</h3>
      <p class="notification-message">${escapeHtml(data.mapName || data.message)}</p>
      ${hasChineseName ? `<p class="notification-message">${escapeHtml(data.mapChineseName)}</p>` : ''}
      <div class="notification-actions">
        <button class="btn btn-close" onclick="event.stopPropagation(); window.close();">关闭通知</button>
        <button class="btn btn-join" onclick="event.stopPropagation(); joinServer('${escapeHtml(data.connectStr || '')}');">立即进服</button>
      </div>
    </div>
    <div class="progress-bar"></div>
  </div>

  <script>
    // 点击任意位置关闭
    document.addEventListener('click', () => {
      window.close();
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
    });

    // 立即进服
    function joinServer(connectStr) {
      if (connectStr) {
        const aLink = document.createElement('a');
        aLink.href = 'steam://rungame/730/76561198977557298/+connect ' + connectStr;
        aLink.click();
      }
      console.log('正在连接服务器...');
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
}
