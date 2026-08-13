export {};

declare global {
  export interface Window {
    /** NProgress instance */
    NProgress?: import('nprogress').NProgress;
    /** Loading bar instance */
    $loadingBar?: import('naive-ui').LoadingBarProviderInst;
    /** Dialog instance */
    $dialog?: import('naive-ui').DialogProviderInst;
    /** Message instance */
    $message?: import('naive-ui').MessageProviderInst;
    /** Notification instance */
    $notification?: import('naive-ui').NotificationProviderInst;
    /** 移除应用加载动画（由 index.html 内联脚本定义，应用初始化完成后调用） */
    __removeLoading__?: () => void;
    /** 加载动画完成通知（由 index.html 内联脚本定义）：resolve 后即可挂载页面 */
    __loadingDone__?: Promise<void>;
    /** IPC Renderer */
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      queryGameServer: (host: string, port?: number) => Promise<any>;
      queryGameServers: (gameServers: string[], attempts?: number, timeout?: number | number[]) => Promise<Api.Game.SeverVoListResult[]>;
      checkCsgo2Running: () => Promise<{ isRunning: boolean }>;
      checkGsiConfig: (csgo2Path: string, steamPath?: string) => Promise<{ exists: boolean }>;
      createGsiConfig: (csgo2Path: string, steamPath?: string) => Promise<{ success: boolean }>;
      startGsiService: () => Promise<{ success: boolean; alreadyRunning?: boolean; error?: string }>;
      stopGsiService: () => Promise<{ success: boolean }>;
      checkGsiConnected: () => Promise<{ isConnected: boolean }>;
      launchCs2: (csgo2Path: string, serverMode?: 'perfectworld' | 'worldwide', startType?: 'steamurl' | 'steamexe', steamPath?: string, startItems?: string[]) => Promise<{ success: boolean; error?: string }>;
      waitForCs2Launch: (csgo2Path?: string, maxWaitMs?: number) => Promise<{ success: boolean; error?: string }>;
      startLogReader: (csgo2Path: string) => Promise<{ success: boolean; error?: string }>;
      stopLogReader: () => Promise<{ success: boolean }>;
      autoDetectPaths: () => Promise<{ steamPath: string | null; csgo2Path: string | null }>;
      getAppVersion: () => Promise<string>;
      getSystemVersion: () => Promise<string>;
      showMapOrderNotification: (data: { title: string; message: string; serverName?: string; connectStr?: string; mapName?: string; mapChineseName?: string; mapImage?: string }) => Promise<void>;
      closeMapOrderNotification: () => Promise<void>;
      getImageCacheInfo: () => Promise<{ count: number; totalSize: number }>;
      clearImageCache: () => Promise<{ success: boolean }>;
      openInBrowser: (url: string) => Promise<void>;
      fetchCurrentWeather: () => Promise<{ token: string; latitude: number; longitude: number; city: string; weather: string }>;
      getSystemStats: () => Promise<PerfMonitor.PerfSnapshot | null>;
      openPerfMiniWindow: (cfg?: {
        showCpu?: boolean
        showRam?: boolean
        showGpu?: boolean
        showTemperature?: boolean
      }) => Promise<void>;
      closePerfMiniWindow: () => Promise<void>;
      updatePerfMiniConfig: (cfg?: {
        showCpu?: boolean
        showRam?: boolean
        showGpu?: boolean
        showTemperature?: boolean
      }) => Promise<void>;
      getPerfMiniData: () => Promise<{
        stats: PerfMonitor.PerfSnapshot
        config: PerfMonitor.PerfMiniConfig
      } | null>;
      setPerfMiniSize: (size: { width: number; height: number }) => Promise<void>;
    };
  }

  /** Build time of the project */
  export const BUILD_TIME: string;
}
