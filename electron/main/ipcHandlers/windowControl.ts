import { ipcMain, BrowserWindow, dialog, app, shell, screen, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { getMainWindow } from '../windowManager'
import { preload, indexHtml, VITE_DEV_SERVER_URL } from '../config'
import { setMiniConfig } from './systemMonitor'

/** 性能监测小窗引用 */
let perfMiniWindow: BrowserWindow | null = null

/** 系统托盘引用（「隐藏到系统托盘」模式下懒创建，退出时随应用销毁） */
let tray: Tray | null = null

/** 显示并聚焦主窗口（托盘点击 / 托盘菜单「显示主界面」使用） */
function showMainWindow(): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

/** 确保系统托盘已创建：仅在首次「隐藏到系统托盘」时出现托盘图标 */
function ensureTray(): void {
  if (tray && !tray.isDestroyed()) return
  tray = new Tray(nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, 'logo.png')))
  tray.setToolTip('碧蓝档案登录器')
  // 单击托盘图标恢复主窗口
  tray.on('click', () => showMainWindow())
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主界面', click: () => showMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]))
}

export function setupWindowControlIpc() {
  ipcMain.handle('electron:get-app-version', async () => {
    try {
      return app.getVersion()
    } catch {
      return 'unknown' // 版本获取失败时的兜底值
    }
  })

  // 获取 Windows 系统版本（如 "Windows 10 Pro 10.0.22631"），供反馈上报使用
  ipcMain.handle('electron:get-system-version', async () => {
    try {
      const version = os.version() // 系统友好名称，如 "Windows 10 Pro"，可能为空
      const release = os.release() // 系统版本号，如 "10.0.22631"
      return version ? `${version} ${release}` : `${os.type()} ${release}`
    } catch {
      return 'unknown' // 系统版本获取失败时的兜底值
    }
  })

  ipcMain.handle('open-win', (_, arg) => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return

    const childWindow = new BrowserWindow({
      // 依附主窗口：不出现在 ALT+TAB/任务栏，避免多个应用条目残留
      parent: win,
      skipTaskbar: true,
      webPreferences: {
        preload,
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    if (VITE_DEV_SERVER_URL) {
      childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
    } else {
      childWindow.loadFile(indexHtml, { hash: arg })
    }
  })

  ipcMain.handle('open-in-browser', (_, url: string) => {
    if (!url) return
    shell.openExternal(url)
  })

  ipcMain.handle('window-minimize', (_e, mode: 'taskbar' | 'tray' = 'taskbar') => {
    const win = getMainWindow()
    if (!win) return
    if (mode === 'tray') {
      // 隐藏到系统托盘：窗口仅隐藏不最小化，点击托盘图标可恢复
      ensureTray()
      win.hide()
    } else {
      // 默认最小化到任务栏
      win.minimize()
    }
  })

  ipcMain.handle('window-close', () => {
    const win = getMainWindow()
    if (win) {
      win.close()
    }
  })

  ipcMain.handle('select-directory', async (_, title) => {
    const win = getMainWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: title || '选择目录',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // ===== 性能监测小窗 =====

  /** 小窗内联 HTML（独立轮询，不依赖 Vue Router） */
  const MINI_WINDOW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#1a1a2e; color:#e0e0e0; font-family:'Segoe UI',sans-serif; overflow:hidden; user-select:none; transition:opacity 0.15s; }
  .wrap { display:flex; flex-direction:row; gap:6px; padding:6px 8px; height:100vh; align-items:center; }
  .item { display:flex; align-items:center; gap:3px; white-space:nowrap; }
  .label { font-size:10px; color:#888; }
  .val { font-size:14px; font-weight:700; }
  .bar { width:30px; height:3px; border-radius:2px; background:#333; overflow:hidden; }
  .bar-fill { height:100%; border-radius:2px; transition:width 0.5s; }
  .sep { width:1px; height:20px; background:rgba(255,255,255,.1); margin:0 1px; }
  .c0{color:#4ade80}.c1{color:#fbbf24}.c2{color:#f97316}.c3{color:#ef4444}
  .hidden { display:none; }
  .ram-extra { font-size:10px; color:#777; font-weight:600; }
</style>
</head>
<body>
<div class="wrap" id="app">
  <div class="item" id="item-cpu"><span class="label">CPU</span><span class="val" id="cpu">--</span><span class="label">%</span></div>
  <div class="bar" id="bar-cpu"><div class="bar-fill" id="cpu-bar"></div></div>
  <div class="sep" id="sep-cpu"></div>
  <div class="item" id="item-ram"><span class="label">RAM</span><span class="val" id="ram">--</span><span class="label">%</span><span class="ram-extra" id="ram-txt">--</span></div>
  <div class="bar" id="bar-ram"><div class="bar-fill" id="ram-bar"></div></div>
  <div class="sep" id="sep-ram"></div>
  <div class="item" id="item-gpu"><span class="label">GPU</span><span class="val" id="gpu">--</span><span class="label">%</span></div>
  <div class="bar" id="bar-gpu"><div class="bar-fill" id="gpu-bar"></div></div>
  <div class="sep" id="sep-gpu"></div>
  <div class="item" id="item-gpu-t"><span class="label">GPU</span><span class="val" id="gpu-t">--</span><span class="label">°C</span></div>
</div>
<script>
  const uColor = p => p<40?'c0':p<70?'c1':p<90?'c2':'c3';
  const fmtB = b => b >= 1073741824 ? (b/1073741824).toFixed(1)+'G' : b >= 1048576 ? (b/1048576).toFixed(0)+'M' : (b/1024).toFixed(0)+'K';
  // 测量内容实际宽高并通知主进程缩放窗口（flex 布局下让窗口贴合内容，无右侧留白）
  let lastW = 0;
  function fitWidth() {
    const w = document.documentElement.scrollWidth;
    const h = document.documentElement.scrollHeight;
    if (Math.abs(w - lastW) >= 4) {
      lastW = w;
      window.ipcRenderer.setPerfMiniSize({ width: w, height: h });
    }
  }
  async function poll() {
    try {
      const result = await window.ipcRenderer.getPerfMiniData();
      if (!result || !result.stats) return;
      const data = result.stats;
      const cfg = result.config || {};
      // 各模块独立显示/隐藏
      const showCpu = cfg.showCpu !== false;
      document.getElementById('item-cpu').className = showCpu ? 'item' : 'hidden';
      document.getElementById('bar-cpu').className = showCpu ? 'bar' : 'hidden';
      const showRam = cfg.showRam !== false;
      document.getElementById('item-ram').className = showRam ? 'item' : 'hidden';
      document.getElementById('bar-ram').className = showRam ? 'bar' : 'hidden';
      const showGpu = cfg.showGpu !== false;
      document.getElementById('item-gpu').className = showGpu ? 'item' : 'hidden';
      document.getElementById('bar-gpu').className = showGpu ? 'bar' : 'hidden';
      // 温度区域（GPU）
      const showTemp = cfg.showTemperature !== false;
      document.getElementById('item-gpu-t').className = showTemp ? 'item' : 'hidden';
      // 分隔线：仅在相邻两个区块都可见时显示，避免连续分隔线或尾部多余留空
      const anyMain = showCpu || showRam || showGpu;
      document.getElementById('sep-cpu').className = (showCpu && showRam) ? 'sep' : 'hidden';
      document.getElementById('sep-ram').className = (showRam && showGpu) ? 'sep' : 'hidden';
      document.getElementById('sep-gpu').className = (anyMain && showTemp) ? 'sep' : 'hidden';
      const cpu = document.getElementById('cpu');
      const cpuBar = document.getElementById('cpu-bar');
      const ram = document.getElementById('ram');
      const ramBar = document.getElementById('ram-bar');
      const gpu = document.getElementById('gpu');
      const gpuBar = document.getElementById('gpu-bar');
      cpu.textContent = data.cpu.usage;
      cpu.className = 'val '+uColor(data.cpu.usage);
      cpuBar.style.width = data.cpu.usage+'%';
      cpuBar.style.backgroundColor = data.cpu.usage<40?'#4ade80':data.cpu.usage<70?'#fbbf24':data.cpu.usage<90?'#f97316':'#ef4444';
      const ramPct = data.memory.usagePercent;
      ram.textContent = ramPct;
      ram.className = 'val '+uColor(ramPct);
      ramBar.style.width = ramPct+'%';
      ramBar.style.backgroundColor = ramPct<40?'#4ade80':ramPct<70?'#fbbf24':ramPct<90?'#f97316':'#ef4444';
      document.getElementById('ram-txt').textContent = fmtB(data.memory.used) + '/' + fmtB(data.memory.total);
      const gpuPct = data.gpu.usagePercent ?? 0;
      gpu.textContent = gpuPct;
      gpu.className = 'val '+uColor(gpuPct);
      gpuBar.style.width = gpuPct+'%';
      gpuBar.style.backgroundColor = gpuPct<40?'#4ade80':gpuPct<70?'#fbbf24':gpuPct<90?'#f97316':'#ef4444';
      document.getElementById('gpu-t').textContent = data.gpu.temperature ?? '--';
    } catch(e){}
  }
  // 鼠标移入浮窗 → 窗口全透明（OS 级），让出背后内容；移出 → 恢复显示
  document.body.addEventListener('mouseenter', () => { window.ipcRenderer.setPerfMiniOpacity(0); });
  document.body.addEventListener('mouseleave', () => { window.ipcRenderer.setPerfMiniOpacity(1); });
  setInterval(poll, 2000);
  poll();
</script>
</body>
</html>`;

  ipcMain.handle('perf-mini-open', async (_, cfg?: {
    showCpu?: boolean
    showRam?: boolean
    showGpu?: boolean
    showTemperature?: boolean
  }) => {
    // 保存小窗配置，供 perf-mini-data 查询时返回
    setMiniConfig({
      showCpu: cfg?.showCpu ?? true,
      showRam: cfg?.showRam ?? true,
      showGpu: cfg?.showGpu ?? true,
      showTemperature: cfg?.showTemperature ?? true
    });
    if (perfMiniWindow && !perfMiniWindow.isDestroyed()) {
      perfMiniWindow.show();
      perfMiniWindow.focus();
      return;
    }
    // 计算桌面右上角位置（距右边距 16px，顶部 8px）
    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;
    // 初始宽度给个保守值，页面加载后由 fitWidth 自动贴合内容
    const winWidth = 480;
    const winHeight = 42;
    const x = screenWidth - winWidth - 16;
    const y = 8;
    perfMiniWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x,
      y,
      frame: false,
      alwaysOnTop: true,
      transparent: false,
      resizable: false,
      skipTaskbar: true,
      // 不设置 parent，避免主窗口最小化时浮窗跟着消失
      webPreferences: {
        preload,
        nodeIntegration: false,
        // contextIsolation 必须为 true，preload 使用的 contextBridge 才能正常暴露 API
        contextIsolation: true
      }
    });
    perfMiniWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(MINI_WINDOW_HTML)}`);
    perfMiniWindow.on('closed', () => {
      perfMiniWindow = null;
    });
  });

  // 运行时更新浮窗配置（无需重开浮窗，下次轮询即生效）
  ipcMain.handle('update-perf-mini-config', (_, cfg?: {
    showCpu?: boolean
    showRam?: boolean
    showGpu?: boolean
    showTemperature?: boolean
  }) => {
    if (cfg) setMiniConfig({
      showCpu: cfg.showCpu ?? true,
      showRam: cfg.showRam ?? true,
      showGpu: cfg.showGpu ?? true,
      showTemperature: cfg.showTemperature ?? true
    });
  });

  ipcMain.handle('perf-mini-close', () => {
    if (perfMiniWindow && !perfMiniWindow.isDestroyed()) {
      perfMiniWindow.close();
      perfMiniWindow = null;
    }
  });

  // 浮窗 OS 级透明度（0 = 全透明，1 = 不透明），鼠标移入移出时由小窗页面调用
  ipcMain.handle('perf-mini-set-opacity', (_e, opacity: number) => {
    if (perfMiniWindow && !perfMiniWindow.isDestroyed()) {
      const o = Math.min(1, Math.max(0, opacity));
      perfMiniWindow.setOpacity(o);
    }
  });

  // 浮窗自适应尺寸：小窗页面测量内容宽高后调用，让窗口贴合内容避免右侧留白
  ipcMain.handle('perf-mini-set-size', (_e, size: { width: number; height: number }) => {
    if (perfMiniWindow && !perfMiniWindow.isDestroyed()) {
      const w = Math.max(60, Math.round(size.width));
      const h = Math.max(24, Math.round(size.height));
      const [cw, ch] = perfMiniWindow.getSize();
      if (w !== cw || h !== ch) perfMiniWindow.setSize(w, h);
    }
  });
}
