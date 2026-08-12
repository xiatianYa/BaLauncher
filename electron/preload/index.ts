import { ipcRenderer, contextBridge } from 'electron'

// --------- 向渲染进程暴露 IPC API ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    )
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  queryGameServer(host: string, port?: number) {
    return ipcRenderer.invoke('query-game-server', host, port)
  },
  queryGameServers(gameServers: string[], attempts?: number, timeout?: number | number[]) {
    return ipcRenderer.invoke('query-game-servers', gameServers, attempts, timeout)
  },
  checkCsgo2Running() {
    return ipcRenderer.invoke('check-csgo2-running')
  },
  checkGsiConfig(csgo2Path: string) {
    return ipcRenderer.invoke('check-gsi-config', csgo2Path)
  },
  createGsiConfig(csgo2Path: string) {
    return ipcRenderer.invoke('create-gsi-config', csgo2Path)
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
  launchCs2(csgo2Path: string, serverMode: 'perfectworld' | 'worldwide' = 'worldwide', startType: 'steamurl' | 'steamexe' = 'steamurl', steamPath?: string, startItems?: string[]) {
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
  getAppVersion() {
    return ipcRenderer.invoke('electron:get-app-version')
  },
  showMapOrderNotification(data: { title: string; message: string; serverName?: string; connectStr?: string; mapName?: string; mapChineseName?: string; mapImage?: string }) {
    return ipcRenderer.invoke('show-notification', { ...data, type: 'map-subscription' })
  },
  closeMapOrderNotification() {
    return ipcRenderer.invoke('close-notification')
  },
  getImageCacheInfo() {
    return ipcRenderer.invoke('image-cache:get-info')
  },
  clearImageCache() {
    return ipcRenderer.invoke('image-cache:clear')
  },
  openInBrowser(url: string) {
    return ipcRenderer.invoke('open-in-browser', url)
  },
  fetchCurrentWeather() {
    return ipcRenderer.invoke('fetch-current-weather')
  },
  getSystemStats() {
    return ipcRenderer.invoke('get-system-stats')
  },
  openPerfMiniWindow(cfg?: {
    showFps?: boolean
    showCpu?: boolean
    showRam?: boolean
    showGpu?: boolean
    showTemperature?: boolean
  }) {
    return ipcRenderer.invoke('perf-mini-open', cfg)
  },
  closePerfMiniWindow() {
    return ipcRenderer.invoke('perf-mini-close')
  },
  updatePerfMiniConfig(cfg?: {
    showFps?: boolean
    showCpu?: boolean
    showRam?: boolean
    showGpu?: boolean
    showTemperature?: boolean
  }) {
    return ipcRenderer.invoke('update-perf-mini-config', cfg)
  },
  getPerfMiniData() {
    return ipcRenderer.invoke('perf-mini-data')
  },
})
