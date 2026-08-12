import { ipcMain, BrowserWindow, dialog, app, shell, screen } from 'electron'
import { getMainWindow } from '../windowManager'
import { preload, indexHtml, VITE_DEV_SERVER_URL } from '../config'
import { setMiniConfig } from './systemMonitor'

/** 性能监测小窗引用 */
let perfMiniWindow: BrowserWindow | null = null

export function setupWindowControlIpc() {
  ipcMain.handle('electron:get-app-version', async () => {
    try {
      return app.getVersion()
    } catch {
      return 'unknown' // 版本获取失败时的兜底值
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

  ipcMain.handle('window-minimize', () => {
    const win = getMainWindow()
    if (win) {
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
  .wrap { display:flex; flex-direction:row; gap:8px; padding:6px 10px; height:100vh; align-items:center; }
  .item { display:flex; align-items:center; gap:4px; white-space:nowrap; }
  .label { font-size:10px; color:#888; }
  .val { font-size:14px; font-weight:700; }
  .bar { width:40px; height:3px; border-radius:2px; background:#333; overflow:hidden; }
  .bar-fill { height:100%; border-radius:2px; transition:width 0.5s; }
  .sep { width:1px; height:20px; background:rgba(255,255,255,.1); margin:0 2px; }
  .c0{color:#4ade80}.c1{color:#fbbf24}.c2{color:#f97316}.c3{color:#ef4444}
  .hidden { display:none; }
</style>
</head>
<body>
<div class="wrap" id="app">
  <div class="item" id="item-fps"><span class="label">FPS</span><span class="val" id="fps">--</span></div>
  <div class="sep" id="sep-fps"></div>
  <div class="item" id="item-cpu"><span class="label">CPU</span><span class="val" id="cpu">--</span><span class="label">%</span></div>
  <div class="bar" id="bar-cpu"><div class="bar-fill" id="cpu-bar"></div></div>
  <div class="sep" id="sep-cpu"></div>
  <div class="item" id="item-ram"><span class="label">RAM</span><span class="val" id="ram">--</span><span class="label">%</span></div>
  <div class="bar" id="bar-ram"><div class="bar-fill" id="ram-bar"></div></div>
  <div class="sep" id="sep-ram"></div>
  <div class="item" id="item-gpu"><span class="label">GPU</span><span class="val" id="gpu">--</span><span class="label">%</span></div>
  <div class="bar" id="bar-gpu"><div class="bar-fill" id="gpu-bar"></div></div>
  <div class="sep" id="sep-gpu"></div>
  <div class="sep" id="sep-temp"></div>
  <div class="item" id="item-cpu-t"><span class="label">CPU</span><span class="val" id="cpu-t">--</span><span class="label">°C</span></div>
  <div class="sep" id="sep-gpu-t"></div>
  <div class="item" id="item-gpu-t"><span class="label">GPU</span><span class="val" id="gpu-t">--</span><span class="label">°C</span></div>
</div>
<script>
  const uColor = p => p<40?'c0':p<70?'c1':p<90?'c2':'c3';
  async function poll() {
    try {
      const result = await window.ipcRenderer.getPerfMiniData();
      if (!result || !result.stats) return;
      const data = result.stats;
      const cfg = result.config || {};
      // 各模块独立显示/隐藏
      const showFps = cfg.showFps !== false;
      document.getElementById('item-fps').className = showFps ? 'item' : 'hidden';
      document.getElementById('sep-fps').className = showFps ? 'sep' : 'hidden';
      const showCpu = cfg.showCpu !== false;
      document.getElementById('item-cpu').className = showCpu ? 'item' : 'hidden';
      document.getElementById('bar-cpu').className = showCpu ? 'bar' : 'hidden';
      document.getElementById('sep-cpu').className = showCpu ? 'sep' : 'hidden';
      const showRam = cfg.showRam !== false;
      document.getElementById('item-ram').className = showRam ? 'item' : 'hidden';
      document.getElementById('bar-ram').className = showRam ? 'bar' : 'hidden';
      document.getElementById('sep-ram').className = showRam ? 'sep' : 'hidden';
      const showGpu = cfg.showGpu !== false;
      document.getElementById('item-gpu').className = showGpu ? 'item' : 'hidden';
      document.getElementById('bar-gpu').className = showGpu ? 'bar' : 'hidden';
      document.getElementById('sep-gpu').className = showGpu ? 'sep' : 'hidden';
      // 温度区域（统一控制，前面的分隔线跟着一起）
      const showTemp = cfg.showTemperature !== false;
      document.getElementById('sep-temp').className = showTemp ? 'sep' : 'hidden';
      document.getElementById('item-cpu-t').className = showTemp ? 'item' : 'hidden';
      document.getElementById('sep-gpu-t').className = showTemp ? 'sep' : 'hidden';
      document.getElementById('item-gpu-t').className = showTemp ? 'item' : 'hidden';
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
      const gpuPct = data.gpu.usagePercent ?? 0;
      gpu.textContent = gpuPct;
      gpu.className = 'val '+uColor(gpuPct);
      gpuBar.style.width = gpuPct+'%';
      gpuBar.style.backgroundColor = gpuPct<40?'#4ade80':gpuPct<70?'#fbbf24':gpuPct<90?'#f97316':'#ef4444';
      document.getElementById('cpu-t').textContent = data.cpu.temperature ?? '--';
      document.getElementById('gpu-t').textContent = data.gpu.temperature ?? '--';
    } catch(e){}
  }
  // FPS 追踪
  let fpsFrames = 0, fpsLast = performance.now();
  function fpsLoop() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast >= 1000) {
      document.getElementById('fps').textContent = Math.round(fpsFrames * 1000 / (now - fpsLast));
      fpsFrames = 0;
      fpsLast = now;
    }
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);
  // 鼠标移入浮窗 → 透明，让出背后内容
  document.body.addEventListener('mouseenter', () => { document.body.style.opacity = '0'; });
  document.body.addEventListener('mouseleave', () => { document.body.style.opacity = '1'; });
  setInterval(poll, 2000);
  poll();
</script>
</body>
</html>`;

  ipcMain.handle('perf-mini-open', (_, cfg?: {
    showFps?: boolean
    showCpu?: boolean
    showRam?: boolean
    showGpu?: boolean
    showTemperature?: boolean
  }) => {
    // 保存小窗配置，供 perf-mini-data 查询时返回
    setMiniConfig({
      showFps: cfg?.showFps ?? true,
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
    const winWidth = 580;
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
    perfMiniWindow.on('closed', () => { perfMiniWindow = null; });
  });

  // 运行时更新浮窗配置（无需重开浮窗，下次轮询即生效）
  ipcMain.handle('update-perf-mini-config', (_, cfg?: {
    showFps?: boolean
    showCpu?: boolean
    showRam?: boolean
    showGpu?: boolean
    showTemperature?: boolean
  }) => {
    if (cfg) setMiniConfig({
      showFps: cfg.showFps ?? true,
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
}
