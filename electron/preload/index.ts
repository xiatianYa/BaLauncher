import { ipcRenderer, contextBridge } from 'electron'

/** 性能浮窗显示配置 */
type PerfConfig = {
  showCpu?: boolean
  showRam?: boolean
  showGpu?: boolean
  showTemperature?: boolean
}

/** 向渲染进程暴露安全的 IPC API */
contextBridge.exposeInMainWorld('ipcRenderer', {
  // ---------- 基础 IPC ----------
  on(...args: Parameters<typeof ipcRenderer.on>) {
    return ipcRenderer.on(...args)
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    return ipcRenderer.off(...args)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    return ipcRenderer.send(...args)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...payload] = args
    return ipcRenderer.invoke(channel, ...payload)
  },

  // ---------- 游戏服务器查询 ----------
  queryGameServer(host: string, port?: number) {
    return ipcRenderer.invoke('query-game-server', host, port)
  },
  queryGameServers(gameServers: string[], attempts?: number, timeout?: number | number[]) {
    return ipcRenderer.invoke('query-game-servers', gameServers, attempts, timeout)
  },

  // ---------- CS2 GSI ----------
  checkCsgo2Running() {
    return ipcRenderer.invoke('check-csgo2-running')
  },
  checkGsiConfig(csgo2Path: string, steamPath?: string) {
    return ipcRenderer.invoke('check-gsi-config', csgo2Path, steamPath)
  },
  createGsiConfig(csgo2Path: string, steamPath?: string) {
    return ipcRenderer.invoke('create-gsi-config', csgo2Path, steamPath)
  },
  startGsiService() {
    return ipcRenderer.invoke('start-gsi-service')
  },
  stopGsiService() {
    return ipcRenderer.invoke('stop-gsi-service')
  },
  checkGsiConnected() {
    return ipcRenderer.invoke('check-gsi-connected')
  },
  launchCs2Cmd(csgo2Path: string, serverMode: 'perfectworld' | 'worldwide' = 'worldwide') {
    return ipcRenderer.invoke('launch-cs2-cmd', csgo2Path, serverMode)
  },
  launchCs2(
    csgo2Path: string,
    serverMode: 'perfectworld' | 'worldwide' = 'worldwide',
    startType: 'steamurl' | 'steamexe' = 'steamurl',
    steamPath?: string,
    startItems?: string[]
  ) {
    return ipcRenderer.invoke('launch-cs2', csgo2Path, serverMode, startType, steamPath, startItems)
  },
  waitForCs2Launch(csgo2Path?: string, maxWaitMs: number = 90000) {
    return ipcRenderer.invoke('wait-for-cs2-launch', csgo2Path, maxWaitMs)
  },
  startLogReader(csgo2Path: string) {
    return ipcRenderer.invoke('start-log-reader', csgo2Path)
  },
  stopLogReader() {
    return ipcRenderer.invoke('stop-log-reader')
  },
  autoDetectPaths() {
    return ipcRenderer.invoke('auto-detect-paths')
  },

  // ---------- 应用信息 ----------
  getAppVersion() {
    return ipcRenderer.invoke('electron:get-app-version')
  },
  getSystemVersion() {
    return ipcRenderer.invoke('electron:get-system-version')
  },

  // ---------- 地图订阅通知 ----------
  showMapOrderNotification(data: {
    title: string
    message: string
    serverName?: string
    connectStr?: string
    mapName?: string
    mapChineseName?: string
    mapImage?: string
  }) {
    return ipcRenderer.invoke('show-notification', { ...data, type: 'map-subscription' })
  },
  closeMapOrderNotification() {
    return ipcRenderer.invoke('close-notification')
  },

  // ---------- 图片缓存 ----------
  getImageCacheInfo() {
    return ipcRenderer.invoke('image-cache:get-info')
  },
  clearImageCache() {
    return ipcRenderer.invoke('image-cache:clear')
  },

  // ---------- 系统工具 ----------
  openInBrowser(url: string) {
    return ipcRenderer.invoke('open-in-browser', url)
  },
  fetchCurrentWeather() {
    return ipcRenderer.invoke('fetch-current-weather')
  },

  // ---------- 性能浮窗 ----------
  getSystemStats() {
    return ipcRenderer.invoke('get-system-stats')
  },
  openPerfMiniWindow(cfg?: PerfConfig) {
    return ipcRenderer.invoke('perf-mini-open', cfg)
  },
  closePerfMiniWindow() {
    return ipcRenderer.invoke('perf-mini-close')
  },
  updatePerfMiniConfig(cfg?: PerfConfig) {
    return ipcRenderer.invoke('update-perf-mini-config', cfg)
  },
  getPerfMiniData() {
    return ipcRenderer.invoke('perf-mini-data')
  },
  /** 设置浮窗窗口透明度（0-1，鼠标移入移出时调用，OS 级透明度） */
  setPerfMiniOpacity(opacity: number) {
    return ipcRenderer.invoke('perf-mini-set-opacity', opacity)
  },
  /** 调整浮窗窗口尺寸（小窗页面测量内容后调用，让窗口贴合内容） */
  setPerfMiniSize(size: { width: number; height: number }) {
    return ipcRenderer.invoke('perf-mini-set-size', size)
  },
})
