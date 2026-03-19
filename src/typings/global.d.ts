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
    /** IPC Renderer */
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      queryGameServer: (host: string, port?: number) => Promise<any>;
      queryGameServers: (gameServers: string[], attempts?: number, timeout?: number | number[]) => Promise<Api.Game.InfoResponseListResult[]>;
      checkCsgo2Running: () => Promise<{ isRunning: boolean }>;
      checkGsiConfig: (csgo2Path: string) => Promise<{ exists: boolean }>;
      createGsiConfig: (csgo2Path: string) => Promise<{ success: boolean }>;
      startGsiService: () => Promise<{ success: boolean; alreadyRunning?: boolean; error?: string }>;
      stopGsiService: () => Promise<{ success: boolean }>;
      checkGsiConnected: () => Promise<{ isConnected: boolean }>;
      launchCs2: (csgo2Path: string, serverMode?: 'perfectworld' | 'worldwide', startType?: 'steamurl' | 'steamexe', steamPath?: string, startItems?: string[]) => Promise<{ success: boolean; error?: string }>;
      waitForCs2Launch: (csgo2Path?: string, maxWaitMs?: number) => Promise<{ success: boolean; error?: string }>;
      startLogReader: (csgo2Path: string) => Promise<{ success: boolean; error?: string }>;
      stopLogReader: () => Promise<{ success: boolean }>;
      autoDetectPaths: () => Promise<{ steamPath: string | null; csgo2Path: string | null }>;
      getAppVersion: () => Promise<string>;
      showMapOrderNotification: (data: { title: string; message: string; serverName?: string; connectStr?: string; mapName?: string; mapChineseName?: string; mapImage?: string }) => Promise<void>;
      closeMapOrderNotification: () => Promise<void>;
    };
  }

  /** Build time of the project */
  export const BUILD_TIME: string;
}
