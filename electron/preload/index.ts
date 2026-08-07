import { ipcRenderer, contextBridge } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  queryGameServer(host: string, port?: number) {
    return ipcRenderer.invoke('query-game-server', host, port);
  },
  queryGameServers(gameServers: string[], attempts?: number, timeout?: number | number[]) {
    return ipcRenderer.invoke('query-game-servers', gameServers, attempts, timeout);
  },
  checkCsgo2Running() {
    return ipcRenderer.invoke('check-csgo2-running');
  },
  checkGsiConfig(csgo2Path: string) {
    return ipcRenderer.invoke('check-gsi-config', csgo2Path);
  },
  createGsiConfig(csgo2Path: string) {
    return ipcRenderer.invoke('create-gsi-config', csgo2Path);
  },
  startGsiService() {
    return ipcRenderer.invoke('start-gsi-service');
  },
  stopGsiService() {
    return ipcRenderer.invoke('stop-gsi-service');
  },
  checkGsiConnected() {
    return ipcRenderer.invoke('check-gsi-connected');
  },
  launchCs2Cmd(csgo2Path: string, serverMode: 'perfectworld' | 'worldwide' = 'worldwide') {
    return ipcRenderer.invoke('launch-cs2-cmd', csgo2Path, serverMode);
  },
  launchCs2(csgo2Path: string, serverMode: 'perfectworld' | 'worldwide' = 'worldwide', startType: 'steamurl' | 'steamexe' = 'steamurl', steamPath?: string, startItems?: string[]) {
    return ipcRenderer.invoke('launch-cs2', csgo2Path, serverMode, startType, steamPath, startItems);
  },
  waitForCs2Launch(csgo2Path?: string, maxWaitMs: number = 90000) {
    return ipcRenderer.invoke('wait-for-cs2-launch', csgo2Path, maxWaitMs);
  },
  startLogReader(csgo2Path: string) {
    return ipcRenderer.invoke('start-log-reader', csgo2Path);
  },
  stopLogReader() {
    return ipcRenderer.invoke('stop-log-reader');
  },
  autoDetectPaths() {
    return ipcRenderer.invoke('auto-detect-paths');
  },
  getAppVersion() {
    return ipcRenderer.invoke('electron:get-app-version');
  },
  showMapOrderNotification(data: { title: string; message: string; serverName?: string; connectStr?: string; mapName?: string; mapChineseName?: string; mapImage?: string }) {
    return ipcRenderer.invoke('show-notification', { ...data, type: 'map-subscription' });
  },
  closeMapOrderNotification() {
    return ipcRenderer.invoke('close-notification');
  },
  getImageCacheInfo() {
    return ipcRenderer.invoke('image-cache:get-info');
  },
  clearImageCache() {
    return ipcRenderer.invoke('image-cache:clear');
  },
  openExternalWindow(url: string) {
    return ipcRenderer.invoke('open-external-window', url);
  },
  fetchCurrentWeather() {
    return ipcRenderer.invoke('fetch-current-weather');
  },
});

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ["complete", "interactive"],
) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child);
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child);
    }
  },
};

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const styleContent = `
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 999;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;
  /* 启动加载期窗口透明（无背景色、无背景图） */
}

.loading-image {
  position: absolute;
  width: 200px;
  height: 300px;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  animation: float 2s ease-in-out infinite;
}

.loading-image.active {
  opacity: 1;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-30px);
  }
}

.character-stage {
  position: absolute;
  left: 50%;
  top: 48%;
  width: 200px;
  height: 300px;
  transform: translate(-50%, -50%);
  z-index: 2;
}

/* 加载进度百分比（相对角色图容器定位，水平中心与角色图完全对齐，位于图片下方） */
.loading-progress {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 3px;
  z-index: 5;
  font-family: 'MiSans', 'HarmonyOS Sans SC', 'PingFang SC', 'Segoe UI', 'Microsoft YaHei', sans-serif;
  user-select: none;
  pointer-events: none;

  .progress-num {
    font-size: 24px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
  }

  .progress-sym {
    font-size: 16px;
    font-weight: 600;
    color: rgba(190, 204, 255, 0.95);
    text-shadow: 0 0 8px rgba(102, 126, 234, 0.45);
  }
}

.core-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 340px;
  height: 440px;
  transform: translate(-50%, -50%) scale(0.85);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.55) 0%, rgba(102, 126, 234, 0.22) 42%, transparent 72%);
  opacity: 0.6;
  animation: glow-breathe 2.6s ease-in-out infinite;
  pointer-events: none;
}

.halo-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 320px;
  height: 420px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1.5px dashed rgba(150, 172, 255, 0.45);
  animation: halo-spin 14s linear infinite;
  pointer-events: none;
}

.halo-ring::after {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  border: 1px solid rgba(120, 140, 255, 0.22);
}

@keyframes glow-breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(0.85);
    opacity: 0.55;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.12);
    opacity: 1;
  }
}

@keyframes halo-spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

    `;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");

  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `
    <div class="loading-container">
      <div class="core-glow"></div>
      <div class="halo-ring"></div>
      <div class="character-stage">
      <img class="loading-image" src="./imgs/ALuoNa01.png" alt="Alona1"/>
      <img class="loading-image" src="./imgs/ALuoNa02.png" alt="Alona2">
      <img class="loading-image" src="./imgs/ALuoNa03.png" alt="Alona3">
      <img class="loading-image" src="./imgs/ALuoNa04.png" alt="Alona4">
      </div>
    </div>
  `;

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);

      // 加载进度百分比元素（动态创建，避免在静态 HTML 中写死）
      const percentEl = document.createElement("div");
      percentEl.className = "loading-progress";
      percentEl.innerHTML = '<span class="progress-num">0</span><span class="progress-sym">%</span>';
      // 挂载到角色图容器内，水平中心与角色图一致
      oDiv.querySelector(".character-stage")?.appendChild(percentEl);
      const numEl = percentEl.querySelector<HTMLElement>(".progress-num");

      // 图片轮播：每 1 秒切换一张角色图
      const images = document.querySelectorAll(".loading-image");
      let currentIndex = 0;
      setInterval(() => {
        // 隐藏当前图片
        images[currentIndex].classList.remove("active");

        // 计算下一张图片的索引
        currentIndex = (currentIndex + 1) % images.length;

        // 显示下一张图片
        images[currentIndex].classList.add("active");
      }, 1000);

      // 模拟加载进度：先快后慢（剩余越多增长越快），封顶 99.2%，
      // 页面渲染完成触发 removeLoading 时强制跳到 100%
      let progress = 0;
      const progressTimer = setInterval(() => {
        progress += Math.max((100 - progress) * 0.05, 0.2);
        if (progress >= 99.2) progress = 99.2;
        if (numEl) numEl.textContent = `${Math.floor(progress)}`;
      }, 100);
      // 保存定时器引用，供 removeLoading 清理
      (oDiv as HTMLDivElement & { _progressTimer?: ReturnType<typeof setInterval> })._progressTimer = progressTimer;
    },
    removeLoading() {
      // 清理模拟进度定时器，并将进度强制置为 100%
      const timer = (oDiv as HTMLDivElement & { _progressTimer?: ReturnType<typeof setInterval> })._progressTimer;
      if (timer) clearInterval(timer);
      const numEl = oDiv.querySelector<HTMLElement>(".loading-progress .progress-num");
      if (numEl) numEl.textContent = "100";
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    },
  };
}

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = (ev) => {
  if (ev.data.payload === "removeLoading") {
    removeLoading();
  }
};
