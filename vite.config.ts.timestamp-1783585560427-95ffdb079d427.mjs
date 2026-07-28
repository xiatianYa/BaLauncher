// vite.config.ts
import fs from "node:fs";
import { defineConfig } from "file:///D:/bluearchive/BaLauncher/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/bluearchive/BaLauncher/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/bluearchive/BaLauncher/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import electron from "file:///D:/bluearchive/BaLauncher/node_modules/vite-plugin-electron/dist/simple.mjs";

// package.json
var package_default = {
  name: "BaLauncher",
  version: "1.3.2",
  main: "dist-electron/main/index.js",
  description: "Really simple Electron + Vue + Vite boilerplate.",
  author: "\u590F\u5929 <939648675@qq.com>",
  license: "MIT",
  private: true,
  keywords: [
    "electron",
    "rollup",
    "vite",
    "vue3",
    "vue"
  ],
  debug: {
    env: {
      VITE_DEV_SERVER_URL: "http://127.0.0.1:3344/"
    }
  },
  type: "module",
  scripts: {
    dev: "vite",
    build: "vue-tsc --noEmit && vite build && electron-builder",
    "build:win": "vue-tsc --noEmit && vite build && electron-builder --win",
    "build:mac": "vue-tsc --noEmit && vite build && electron-builder --mac",
    "build:linux": "vue-tsc --noEmit && vite build && electron-builder --linux",
    publish: "npm run build && electron-builder --publish always",
    "publish:win": "npm run build:win && electron-builder --win --publish always",
    "publish:mac": "npm run build:mac && electron-builder --mac --publish always",
    "publish:linux": "npm run build:linux && electron-builder --linux --publish always",
    preview: "vite preview",
    commit: "git-cz"
  },
  devDependencies: {
    "@commitlint/cli": "^20.4.3",
    "@commitlint/config-conventional": "^20.4.3",
    "@iconify/vue": "5.0.0",
    "@types/nprogress": "^0.2.3",
    "@vitejs/plugin-vue": "^5.0.4",
    "@vueuse/core": "13.3.0",
    axios: "^1.11.0",
    commitizen: "^4.3.1",
    "cz-customizable": "^7.5.1",
    dayjs: "1.11.13",
    echarts: "5.5.1",
    electron: "^29.1.1",
    "electron-builder": "^24.13.3",
    klona: "2.0.6",
    "naive-ui": "^2.42.0",
    nprogress: "^0.2.0",
    pinia: "3.0.3",
    sass: "1.89.1",
    "tailwind-merge": "3.3.1",
    typescript: "5.8.3",
    unocss: "^66.5.0",
    "unplugin-vue-components": "28.7.0",
    vite: "^5.1.5",
    "vite-plugin-electron": "^0.28.4",
    "vite-plugin-electron-renderer": "^0.14.5",
    vue: "^3.4.21",
    "vue-i18n": "11.1.7",
    "vue-router": "4.5.1",
    "vue-tsc": "^2.0.6",
    "vue3-lazyload": "0.3.8"
  },
  dependencies: {
    "@vitejs/plugin-vue-jsx": "^5.1.5",
    "animate.css": "^4.1.1",
    animejs: "^4.3.6",
    "cs2-gsi-z": "^2.0.0",
    "electron-updater": "^6.6.2",
    "md-editor-v3": "^6.4.0",
    "pixi.js": "^8.17.1",
    "steam-server-query": "^1.1.3",
    "vue-draggable-plus": "^0.6.1"
  },
  packageManager: "pnpm@10.30.3+sha512.c961d1e0a2d8e354ecaa5166b822516668b7f44cb5bd95122d590dd81922f606f5473b6d23ec4a5be05e7fcd18e8488d47d978bbe981872f1145d06e9a740017",
  config: {
    commitizen: {
      path: "./node_modules/cz-customizable"
    },
    "cz-customizable": {
      config: ".cz-config.cjs"
    }
  }
};

// build/plugins/unplugin.ts
import Components from "file:///D:/bluearchive/BaLauncher/node_modules/unplugin-vue-components/dist/vite.js";
import { NaiveUiResolver } from "file:///D:/bluearchive/BaLauncher/node_modules/unplugin-vue-components/dist/resolvers.js";
function setupUnplugin() {
  const plugins = [
    Components({
      // 🔴 核心：指定组件解析器（告诉插件如何找到组件）
      resolvers: [
        NaiveUiResolver()
        // 解析 Naive UI 组件（如 NButton、NConfigProvider）
        // 若有其他组件库，可添加对应的 resolver（如 ElementPlusResolver()）
      ],
      // 📁 指定需要扫描的文件目录（默认扫描 src 下所有 .vue 文件）
      dirs: ["src/components", "src/layout"],
      // 扫描自定义组件（如 AppProvider、SvgIcon）
      // 📄 生成的类型声明文件路径（就是你提供的 components.d.ts）
      dts: "src/typings/components.d.ts",
      // 🚫 排除不需要扫描的文件（可选）
      exclude: ["node_modules/**", "src/**/*.md"]
    })
  ];
  return plugins;
}

// vite.config.ts
import UnoCSS from "file:///D:/bluearchive/BaLauncher/node_modules/unocss/dist/vite.mjs";
import path from "node:path";
var __vite_injected_original_dirname = "D:\\bluearchive\\BaLauncher";
var vite_config_default = defineConfig(({ command }) => {
  fs.rmSync("dist-electron", { recursive: true, force: true });
  const isServe = command === "serve";
  const isBuild = command === "build";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
  return {
    plugins: [
      vue(),
      vueJsx(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: "electron/main/index.ts",
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log(
                /* For `.vscode/.debug.script.mjs` */
                "[startup] Electron App"
              );
            } else {
              startup();
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: "dist-electron/main",
              rollupOptions: {
                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons, 
                // we can use `external` to exclude them to ensure they work correctly.
                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                // Of course, this is not absolute, just this way is relatively simple. :)
                external: Object.keys("dependencies" in package_default ? package_default.dependencies : {}),
                input: {
                  index: path.join(__vite_injected_original_dirname, "electron/main/index.ts"),
                  serverQuery: path.join(__vite_injected_original_dirname, "electron/main/workers/serverQuery.ts")
                }
              }
            }
          }
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: "electron/preload/index.ts",
          vite: {
            build: {
              sourcemap: sourcemap ? "inline" : void 0,
              // #332
              minify: isBuild,
              outDir: "dist-electron/preload",
              rollupOptions: {
                external: Object.keys("dependencies" in package_default ? package_default.dependencies : {})
              }
            }
          }
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {}
      }),
      setupUnplugin(),
      UnoCSS()
    ],
    // 添加路径别名配置
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "src")
      }
    },
    // 服务器配置 - 重点修复代理问题
    server: {
      ...process.env.VSCODE_DEBUG && (() => {
        const url = new URL(package_default.debug.env.VITE_DEV_SERVER_URL);
        return {
          host: url.hostname,
          port: +url.port
        };
      })(),
      // 代理配置
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
          // 修复路径替换逻辑
          rewrite: (path2) => {
            return path2.replace(/^\/api/, "");
          },
          ws: true
        }
      }
    },
    clearScreen: false
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIiwgImJ1aWxkL3BsdWdpbnMvdW5wbHVnaW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxibHVlYXJjaGl2ZVxcXFxCYUxhdW5jaGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxibHVlYXJjaGl2ZVxcXFxCYUxhdW5jaGVyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9ibHVlYXJjaGl2ZS9CYUxhdW5jaGVyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xyXG5pbXBvcnQgdnVlSnN4IGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZS1qc3gnXHJcbmltcG9ydCBlbGVjdHJvbiBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi9zaW1wbGUnXHJcbmltcG9ydCBwa2cgZnJvbSAnLi9wYWNrYWdlLmpzb24nXHJcbmltcG9ydCB7IHNldHVwVW5wbHVnaW4gfSBmcm9tICcuL2J1aWxkL3BsdWdpbnMvdW5wbHVnaW4nO1xyXG5pbXBvcnQgVW5vQ1NTIGZyb20gJ3Vub2Nzcy92aXRlJ1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnIC8vIFx1NUYxNVx1NTE2NXBhdGhcdTZBMjFcdTU3NTdcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+IHtcclxuICBmcy5ybVN5bmMoJ2Rpc3QtZWxlY3Ryb24nLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSlcclxuXHJcbiAgY29uc3QgaXNTZXJ2ZSA9IGNvbW1hbmQgPT09ICdzZXJ2ZSdcclxuICBjb25zdCBpc0J1aWxkID0gY29tbWFuZCA9PT0gJ2J1aWxkJ1xyXG4gIGNvbnN0IHNvdXJjZW1hcCA9IGlzU2VydmUgfHwgISFwcm9jZXNzLmVudi5WU0NPREVfREVCVUdcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgdnVlKCksXHJcbiAgICAgIHZ1ZUpzeCgpLFxyXG4gICAgICBlbGVjdHJvbih7XHJcbiAgICAgICAgbWFpbjoge1xyXG4gICAgICAgICAgLy8gU2hvcnRjdXQgb2YgYGJ1aWxkLmxpYi5lbnRyeWBcclxuICAgICAgICAgIGVudHJ5OiAnZWxlY3Ryb24vbWFpbi9pbmRleC50cycsXHJcbiAgICAgICAgICBvbnN0YXJ0KHsgc3RhcnR1cCB9KSB7XHJcbiAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5WU0NPREVfREVCVUcpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygvKiBGb3IgYC52c2NvZGUvLmRlYnVnLnNjcmlwdC5tanNgICovJ1tzdGFydHVwXSBFbGVjdHJvbiBBcHAnKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHN0YXJ0dXAoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdml0ZToge1xyXG4gICAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICAgIHNvdXJjZW1hcCxcclxuICAgICAgICAgICAgICBtaW5pZnk6IGlzQnVpbGQsXHJcbiAgICAgICAgICAgICAgb3V0RGlyOiAnZGlzdC1lbGVjdHJvbi9tYWluJyxcclxuICAgICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAvLyBTb21lIHRoaXJkLXBhcnR5IE5vZGUuanMgbGlicmFyaWVzIG1heSBub3QgYmUgYnVpbHQgY29ycmVjdGx5IGJ5IFZpdGUsIGVzcGVjaWFsbHkgYEMvQysrYCBhZGRvbnMsIFxyXG4gICAgICAgICAgICAgICAgLy8gd2UgY2FuIHVzZSBgZXh0ZXJuYWxgIHRvIGV4Y2x1ZGUgdGhlbSB0byBlbnN1cmUgdGhleSB3b3JrIGNvcnJlY3RseS5cclxuICAgICAgICAgICAgICAgIC8vIE90aGVycyBuZWVkIHRvIHB1dCB0aGVtIGluIGBkZXBlbmRlbmNpZXNgIHRvIGVuc3VyZSB0aGV5IGFyZSBjb2xsZWN0ZWQgaW50byBgYXBwLmFzYXJgIGFmdGVyIHRoZSBhcHAgaXMgYnVpbHQuXHJcbiAgICAgICAgICAgICAgICAvLyBPZiBjb3Vyc2UsIHRoaXMgaXMgbm90IGFic29sdXRlLCBqdXN0IHRoaXMgd2F5IGlzIHJlbGF0aXZlbHkgc2ltcGxlLiA6KVxyXG4gICAgICAgICAgICAgICAgZXh0ZXJuYWw6IE9iamVjdC5rZXlzKCdkZXBlbmRlbmNpZXMnIGluIHBrZyA/IHBrZy5kZXBlbmRlbmNpZXMgOiB7fSksXHJcbiAgICAgICAgICAgICAgICBpbnB1dDoge1xyXG4gICAgICAgICAgICAgICAgICBpbmRleDogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2VsZWN0cm9uL21haW4vaW5kZXgudHMnKSxcclxuICAgICAgICAgICAgICAgICAgc2VydmVyUXVlcnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICdlbGVjdHJvbi9tYWluL3dvcmtlcnMvc2VydmVyUXVlcnkudHMnKSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwcmVsb2FkOiB7XHJcbiAgICAgICAgICAvLyBTaG9ydGN1dCBvZiBgYnVpbGQucm9sbHVwT3B0aW9ucy5pbnB1dGAuXHJcbiAgICAgICAgICAvLyBQcmVsb2FkIHNjcmlwdHMgbWF5IGNvbnRhaW4gV2ViIGFzc2V0cywgc28gdXNlIHRoZSBgYnVpbGQucm9sbHVwT3B0aW9ucy5pbnB1dGAgaW5zdGVhZCBgYnVpbGQubGliLmVudHJ5YC5cclxuICAgICAgICAgIGlucHV0OiAnZWxlY3Ryb24vcHJlbG9hZC9pbmRleC50cycsXHJcbiAgICAgICAgICB2aXRlOiB7XHJcbiAgICAgICAgICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgICAgICAgc291cmNlbWFwOiBzb3VyY2VtYXAgPyAnaW5saW5lJyA6IHVuZGVmaW5lZCwgLy8gIzMzMlxyXG4gICAgICAgICAgICAgIG1pbmlmeTogaXNCdWlsZCxcclxuICAgICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uL3ByZWxvYWQnLFxyXG4gICAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgIGV4dGVybmFsOiBPYmplY3Qua2V5cygnZGVwZW5kZW5jaWVzJyBpbiBwa2cgPyBwa2cuZGVwZW5kZW5jaWVzIDoge30pLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gUGxveWZpbGwgdGhlIEVsZWN0cm9uIGFuZCBOb2RlLmpzIEFQSSBmb3IgUmVuZGVyZXIgcHJvY2Vzcy5cclxuICAgICAgICAvLyBJZiB5b3Ugd2FudCB1c2UgTm9kZS5qcyBpbiBSZW5kZXJlciBwcm9jZXNzLCB0aGUgYG5vZGVJbnRlZ3JhdGlvbmAgbmVlZHMgdG8gYmUgZW5hYmxlZCBpbiB0aGUgTWFpbiBwcm9jZXNzLlxyXG4gICAgICAgIC8vIFNlZSBcdUQ4M0RcdURDNDkgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uLXZpdGUvdml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXJcclxuICAgICAgICByZW5kZXJlcjoge30sXHJcbiAgICAgIH0pLFxyXG4gICAgICBzZXR1cFVucGx1Z2luKCksXHJcbiAgICAgIFVub0NTUygpLFxyXG4gICAgXSxcclxuICAgIC8vIFx1NkRGQlx1NTJBMFx1OERFRlx1NUY4NFx1NTIyQlx1NTQwRFx1OTE0RFx1N0Y2RVxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICAvLyBcdTY3MERcdTUyQTFcdTU2NjhcdTkxNERcdTdGNkUgLSBcdTkxQ0RcdTcwQjlcdTRGRUVcdTU5MERcdTRFRTNcdTc0MDZcdTk1RUVcdTk4OThcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICAuLi4ocHJvY2Vzcy5lbnYuVlNDT0RFX0RFQlVHICYmICgoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChwa2cuZGVidWcuZW52LlZJVEVfREVWX1NFUlZFUl9VUkwpXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGhvc3Q6IHVybC5ob3N0bmFtZSxcclxuICAgICAgICAgIHBvcnQ6ICt1cmwucG9ydCxcclxuICAgICAgICB9XHJcbiAgICAgIH0pKCkpLFxyXG4gICAgICAvLyBcdTRFRTNcdTc0MDZcdTkxNERcdTdGNkVcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjgwODBcIixcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIC8vIFx1NEZFRVx1NTkwRFx1OERFRlx1NUY4NFx1NjZGRlx1NjM2Mlx1OTAzQlx1OEY5MVxyXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjbGVhclNjcmVlbjogZmFsc2UsXHJcbiAgfVxyXG59KVxyXG4iLCAie1xyXG4gIFwibmFtZVwiOiBcIkJhTGF1bmNoZXJcIixcclxuICBcInZlcnNpb25cIjogXCIxLjMuMlwiLFxyXG4gIFwibWFpblwiOiBcImRpc3QtZWxlY3Ryb24vbWFpbi9pbmRleC5qc1wiLFxyXG4gIFwiZGVzY3JpcHRpb25cIjogXCJSZWFsbHkgc2ltcGxlIEVsZWN0cm9uICsgVnVlICsgVml0ZSBib2lsZXJwbGF0ZS5cIixcclxuICBcImF1dGhvclwiOiBcIlx1NTkwRlx1NTkyOSA8OTM5NjQ4Njc1QHFxLmNvbT5cIixcclxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcclxuICBcInByaXZhdGVcIjogdHJ1ZSxcclxuICBcImtleXdvcmRzXCI6IFtcclxuICAgIFwiZWxlY3Ryb25cIixcclxuICAgIFwicm9sbHVwXCIsXHJcbiAgICBcInZpdGVcIixcclxuICAgIFwidnVlM1wiLFxyXG4gICAgXCJ2dWVcIlxyXG4gIF0sXHJcbiAgXCJkZWJ1Z1wiOiB7XHJcbiAgICBcImVudlwiOiB7XHJcbiAgICAgIFwiVklURV9ERVZfU0VSVkVSX1VSTFwiOiBcImh0dHA6Ly8xMjcuMC4wLjE6MzM0NC9cIlxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXHJcbiAgXCJzY3JpcHRzXCI6IHtcclxuICAgIFwiZGV2XCI6IFwidml0ZVwiLFxyXG4gICAgXCJidWlsZFwiOiBcInZ1ZS10c2MgLS1ub0VtaXQgJiYgdml0ZSBidWlsZCAmJiBlbGVjdHJvbi1idWlsZGVyXCIsXHJcbiAgICBcImJ1aWxkOndpblwiOiBcInZ1ZS10c2MgLS1ub0VtaXQgJiYgdml0ZSBidWlsZCAmJiBlbGVjdHJvbi1idWlsZGVyIC0td2luXCIsXHJcbiAgICBcImJ1aWxkOm1hY1wiOiBcInZ1ZS10c2MgLS1ub0VtaXQgJiYgdml0ZSBidWlsZCAmJiBlbGVjdHJvbi1idWlsZGVyIC0tbWFjXCIsXHJcbiAgICBcImJ1aWxkOmxpbnV4XCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmJiB2aXRlIGJ1aWxkICYmIGVsZWN0cm9uLWJ1aWxkZXIgLS1saW51eFwiLFxyXG4gICAgXCJwdWJsaXNoXCI6IFwibnBtIHJ1biBidWlsZCAmJiBlbGVjdHJvbi1idWlsZGVyIC0tcHVibGlzaCBhbHdheXNcIixcclxuICAgIFwicHVibGlzaDp3aW5cIjogXCJucG0gcnVuIGJ1aWxkOndpbiAmJiBlbGVjdHJvbi1idWlsZGVyIC0td2luIC0tcHVibGlzaCBhbHdheXNcIixcclxuICAgIFwicHVibGlzaDptYWNcIjogXCJucG0gcnVuIGJ1aWxkOm1hYyAmJiBlbGVjdHJvbi1idWlsZGVyIC0tbWFjIC0tcHVibGlzaCBhbHdheXNcIixcclxuICAgIFwicHVibGlzaDpsaW51eFwiOiBcIm5wbSBydW4gYnVpbGQ6bGludXggJiYgZWxlY3Ryb24tYnVpbGRlciAtLWxpbnV4IC0tcHVibGlzaCBhbHdheXNcIixcclxuICAgIFwicHJldmlld1wiOiBcInZpdGUgcHJldmlld1wiLFxyXG4gICAgXCJjb21taXRcIjogXCJnaXQtY3pcIlxyXG4gIH0sXHJcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xyXG4gICAgXCJAY29tbWl0bGludC9jbGlcIjogXCJeMjAuNC4zXCIsXHJcbiAgICBcIkBjb21taXRsaW50L2NvbmZpZy1jb252ZW50aW9uYWxcIjogXCJeMjAuNC4zXCIsXHJcbiAgICBcIkBpY29uaWZ5L3Z1ZVwiOiBcIjUuMC4wXCIsXHJcbiAgICBcIkB0eXBlcy9ucHJvZ3Jlc3NcIjogXCJeMC4yLjNcIixcclxuICAgIFwiQHZpdGVqcy9wbHVnaW4tdnVlXCI6IFwiXjUuMC40XCIsXHJcbiAgICBcIkB2dWV1c2UvY29yZVwiOiBcIjEzLjMuMFwiLFxyXG4gICAgXCJheGlvc1wiOiBcIl4xLjExLjBcIixcclxuICAgIFwiY29tbWl0aXplblwiOiBcIl40LjMuMVwiLFxyXG4gICAgXCJjei1jdXN0b21pemFibGVcIjogXCJeNy41LjFcIixcclxuICAgIFwiZGF5anNcIjogXCIxLjExLjEzXCIsXHJcbiAgICBcImVjaGFydHNcIjogXCI1LjUuMVwiLFxyXG4gICAgXCJlbGVjdHJvblwiOiBcIl4yOS4xLjFcIixcclxuICAgIFwiZWxlY3Ryb24tYnVpbGRlclwiOiBcIl4yNC4xMy4zXCIsXHJcbiAgICBcImtsb25hXCI6IFwiMi4wLjZcIixcclxuICAgIFwibmFpdmUtdWlcIjogXCJeMi40Mi4wXCIsXHJcbiAgICBcIm5wcm9ncmVzc1wiOiBcIl4wLjIuMFwiLFxyXG4gICAgXCJwaW5pYVwiOiBcIjMuMC4zXCIsXHJcbiAgICBcInNhc3NcIjogXCIxLjg5LjFcIixcclxuICAgIFwidGFpbHdpbmQtbWVyZ2VcIjogXCIzLjMuMVwiLFxyXG4gICAgXCJ0eXBlc2NyaXB0XCI6IFwiNS44LjNcIixcclxuICAgIFwidW5vY3NzXCI6IFwiXjY2LjUuMFwiLFxyXG4gICAgXCJ1bnBsdWdpbi12dWUtY29tcG9uZW50c1wiOiBcIjI4LjcuMFwiLFxyXG4gICAgXCJ2aXRlXCI6IFwiXjUuMS41XCIsXHJcbiAgICBcInZpdGUtcGx1Z2luLWVsZWN0cm9uXCI6IFwiXjAuMjguNFwiLFxyXG4gICAgXCJ2aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlclwiOiBcIl4wLjE0LjVcIixcclxuICAgIFwidnVlXCI6IFwiXjMuNC4yMVwiLFxyXG4gICAgXCJ2dWUtaTE4blwiOiBcIjExLjEuN1wiLFxyXG4gICAgXCJ2dWUtcm91dGVyXCI6IFwiNC41LjFcIixcclxuICAgIFwidnVlLXRzY1wiOiBcIl4yLjAuNlwiLFxyXG4gICAgXCJ2dWUzLWxhenlsb2FkXCI6IFwiMC4zLjhcIlxyXG4gIH0sXHJcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xyXG4gICAgXCJAdml0ZWpzL3BsdWdpbi12dWUtanN4XCI6IFwiXjUuMS41XCIsXHJcbiAgICBcImFuaW1hdGUuY3NzXCI6IFwiXjQuMS4xXCIsXHJcbiAgICBcImFuaW1lanNcIjogXCJeNC4zLjZcIixcclxuICAgIFwiY3MyLWdzaS16XCI6IFwiXjIuMC4wXCIsXHJcbiAgICBcImVsZWN0cm9uLXVwZGF0ZXJcIjogXCJeNi42LjJcIixcclxuICAgIFwibWQtZWRpdG9yLXYzXCI6IFwiXjYuNC4wXCIsXHJcbiAgICBcInBpeGkuanNcIjogXCJeOC4xNy4xXCIsXHJcbiAgICBcInN0ZWFtLXNlcnZlci1xdWVyeVwiOiBcIl4xLjEuM1wiLFxyXG4gICAgXCJ2dWUtZHJhZ2dhYmxlLXBsdXNcIjogXCJeMC42LjFcIlxyXG4gIH0sXHJcbiAgXCJwYWNrYWdlTWFuYWdlclwiOiBcInBucG1AMTAuMzAuMytzaGE1MTIuYzk2MWQxZTBhMmQ4ZTM1NGVjYWE1MTY2YjgyMjUxNjY2OGI3ZjQ0Y2I1YmQ5NTEyMmQ1OTBkZDgxOTIyZjYwNmY1NDczYjZkMjNlYzRhNWJlMDVlN2ZjZDE4ZTg0ODhkNDdkOTc4YmJlOTgxODcyZjExNDVkMDZlOWE3NDAwMTdcIixcclxuICBcImNvbmZpZ1wiOiB7XHJcbiAgICBcImNvbW1pdGl6ZW5cIjoge1xyXG4gICAgICBcInBhdGhcIjogXCIuL25vZGVfbW9kdWxlcy9jei1jdXN0b21pemFibGVcIlxyXG4gICAgfSxcclxuICAgIFwiY3otY3VzdG9taXphYmxlXCI6IHtcclxuICAgICAgXCJjb25maWdcIjogXCIuY3otY29uZmlnLmNqc1wiXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcYmx1ZWFyY2hpdmVcXFxcQmFMYXVuY2hlclxcXFxidWlsZFxcXFxwbHVnaW5zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxibHVlYXJjaGl2ZVxcXFxCYUxhdW5jaGVyXFxcXGJ1aWxkXFxcXHBsdWdpbnNcXFxcdW5wbHVnaW4udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L2JsdWVhcmNoaXZlL0JhTGF1bmNoZXIvYnVpbGQvcGx1Z2lucy91bnBsdWdpbi50c1wiO2ltcG9ydCB0eXBlIHsgUGx1Z2luT3B0aW9uIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnO1xyXG5pbXBvcnQgeyBOYWl2ZVVpUmVzb2x2ZXIgfSBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy9yZXNvbHZlcnMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVW5wbHVnaW4oKSB7XHJcbiAgY29uc3QgcGx1Z2luczogUGx1Z2luT3B0aW9uW10gPSBbXHJcbiAgICBDb21wb25lbnRzKHtcclxuICAgICAgICAvLyBcdUQ4M0RcdUREMzQgXHU2ODM4XHU1RkMzXHVGRjFBXHU2MzA3XHU1QjlBXHU3RUM0XHU0RUY2XHU4OUUzXHU2NzkwXHU1NjY4XHVGRjA4XHU1NDRBXHU4QkM5XHU2M0QyXHU0RUY2XHU1OTgyXHU0RjU1XHU2MjdFXHU1MjMwXHU3RUM0XHU0RUY2XHVGRjA5XHJcbiAgICAgICAgcmVzb2x2ZXJzOiBbXHJcbiAgICAgICAgICBOYWl2ZVVpUmVzb2x2ZXIoKSwgLy8gXHU4OUUzXHU2NzkwIE5haXZlIFVJIFx1N0VDNFx1NEVGNlx1RkYwOFx1NTk4MiBOQnV0dG9uXHUzMDAxTkNvbmZpZ1Byb3ZpZGVyXHVGRjA5XHJcbiAgICAgICAgICAvLyBcdTgyRTVcdTY3MDlcdTUxNzZcdTRFRDZcdTdFQzRcdTRFRjZcdTVFOTNcdUZGMENcdTUzRUZcdTZERkJcdTUyQTBcdTVCRjlcdTVFOTRcdTc2ODQgcmVzb2x2ZXJcdUZGMDhcdTU5ODIgRWxlbWVudFBsdXNSZXNvbHZlcigpXHVGRjA5XHJcbiAgICAgICAgXSxcclxuICAgICAgICAvLyBcdUQ4M0RcdURDQzEgXHU2MzA3XHU1QjlBXHU5NzAwXHU4OTgxXHU2MjZCXHU2M0NGXHU3Njg0XHU2NTg3XHU0RUY2XHU3NkVFXHU1RjU1XHVGRjA4XHU5RUQ4XHU4QkE0XHU2MjZCXHU2M0NGIHNyYyBcdTRFMEJcdTYyNDBcdTY3MDkgLnZ1ZSBcdTY1ODdcdTRFRjZcdUZGMDlcclxuICAgICAgICBkaXJzOiBbJ3NyYy9jb21wb25lbnRzJyxcInNyYy9sYXlvdXRcIl0sIC8vIFx1NjI2Qlx1NjNDRlx1ODFFQVx1NUI5QVx1NEU0OVx1N0VDNFx1NEVGNlx1RkYwOFx1NTk4MiBBcHBQcm92aWRlclx1MzAwMVN2Z0ljb25cdUZGMDlcclxuICAgICAgICAvLyBcdUQ4M0RcdURDQzQgXHU3NTFGXHU2MjEwXHU3Njg0XHU3QzdCXHU1NzhCXHU1OEYwXHU2NjBFXHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0XHVGRjA4XHU1QzMxXHU2NjJGXHU0RjYwXHU2M0QwXHU0RjlCXHU3Njg0IGNvbXBvbmVudHMuZC50c1x1RkYwOVxyXG4gICAgICAgIGR0czogJ3NyYy90eXBpbmdzL2NvbXBvbmVudHMuZC50cycsXHJcbiAgICAgICAgLy8gXHVEODNEXHVERUFCIFx1NjM5Mlx1OTY2NFx1NEUwRFx1OTcwMFx1ODk4MVx1NjI2Qlx1NjNDRlx1NzY4NFx1NjU4N1x1NEVGNlx1RkYwOFx1NTNFRlx1OTAwOVx1RkYwOVxyXG4gICAgICAgIGV4Y2x1ZGU6IFsnbm9kZV9tb2R1bGVzLyoqJywgJ3NyYy8qKi8qLm1kJ10sXHJcbiAgICB9KSxcclxuICBdO1xyXG5cclxuICByZXR1cm4gcGx1Z2lucztcclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLE9BQU8sUUFBUTtBQUNsUixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLE9BQU8sY0FBYzs7O0FDSnJCO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxNQUFRO0FBQUEsRUFDUixhQUFlO0FBQUEsRUFDZixRQUFVO0FBQUEsRUFDVixTQUFXO0FBQUEsRUFDWCxTQUFXO0FBQUEsRUFDWCxVQUFZO0FBQUEsSUFDVjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFTO0FBQUEsSUFDUCxLQUFPO0FBQUEsTUFDTCxxQkFBdUI7QUFBQSxJQUN6QjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxJQUNULEtBQU87QUFBQSxJQUNQLE9BQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLGFBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxJQUNmLFNBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLGVBQWU7QUFBQSxJQUNmLGlCQUFpQjtBQUFBLElBQ2pCLFNBQVc7QUFBQSxJQUNYLFFBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQSxpQkFBbUI7QUFBQSxJQUNqQixtQkFBbUI7QUFBQSxJQUNuQixtQ0FBbUM7QUFBQSxJQUNuQyxnQkFBZ0I7QUFBQSxJQUNoQixvQkFBb0I7QUFBQSxJQUNwQixzQkFBc0I7QUFBQSxJQUN0QixnQkFBZ0I7QUFBQSxJQUNoQixPQUFTO0FBQUEsSUFDVCxZQUFjO0FBQUEsSUFDZCxtQkFBbUI7QUFBQSxJQUNuQixPQUFTO0FBQUEsSUFDVCxTQUFXO0FBQUEsSUFDWCxVQUFZO0FBQUEsSUFDWixvQkFBb0I7QUFBQSxJQUNwQixPQUFTO0FBQUEsSUFDVCxZQUFZO0FBQUEsSUFDWixXQUFhO0FBQUEsSUFDYixPQUFTO0FBQUEsSUFDVCxNQUFRO0FBQUEsSUFDUixrQkFBa0I7QUFBQSxJQUNsQixZQUFjO0FBQUEsSUFDZCxRQUFVO0FBQUEsSUFDViwyQkFBMkI7QUFBQSxJQUMzQixNQUFRO0FBQUEsSUFDUix3QkFBd0I7QUFBQSxJQUN4QixpQ0FBaUM7QUFBQSxJQUNqQyxLQUFPO0FBQUEsSUFDUCxZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxpQkFBaUI7QUFBQSxFQUNuQjtBQUFBLEVBQ0EsY0FBZ0I7QUFBQSxJQUNkLDBCQUEwQjtBQUFBLElBQzFCLGVBQWU7QUFBQSxJQUNmLFNBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxJQUNiLG9CQUFvQjtBQUFBLElBQ3BCLGdCQUFnQjtBQUFBLElBQ2hCLFdBQVc7QUFBQSxJQUNYLHNCQUFzQjtBQUFBLElBQ3RCLHNCQUFzQjtBQUFBLEVBQ3hCO0FBQUEsRUFDQSxnQkFBa0I7QUFBQSxFQUNsQixRQUFVO0FBQUEsSUFDUixZQUFjO0FBQUEsTUFDWixNQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsbUJBQW1CO0FBQUEsTUFDakIsUUFBVTtBQUFBLElBQ1o7QUFBQSxFQUNGO0FBQ0Y7OztBQ3JGQSxPQUFPLGdCQUFnQjtBQUN2QixTQUFTLHVCQUF1QjtBQUV6QixTQUFTLGdCQUFnQjtBQUM5QixRQUFNLFVBQTBCO0FBQUEsSUFDOUIsV0FBVztBQUFBO0FBQUEsTUFFUCxXQUFXO0FBQUEsUUFDVCxnQkFBZ0I7QUFBQTtBQUFBO0FBQUEsTUFFbEI7QUFBQTtBQUFBLE1BRUEsTUFBTSxDQUFDLGtCQUFpQixZQUFZO0FBQUE7QUFBQTtBQUFBLE1BRXBDLEtBQUs7QUFBQTtBQUFBLE1BRUwsU0FBUyxDQUFDLG1CQUFtQixhQUFhO0FBQUEsSUFDOUMsQ0FBQztBQUFBLEVBQ0g7QUFFQSxTQUFPO0FBQ1Q7OztBRmZBLE9BQU8sWUFBWTtBQUNuQixPQUFPLFVBQVU7QUFSakIsSUFBTSxtQ0FBbUM7QUFXekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxRQUFRLE1BQU07QUFDM0MsS0FBRyxPQUFPLGlCQUFpQixFQUFFLFdBQVcsTUFBTSxPQUFPLEtBQUssQ0FBQztBQUUzRCxRQUFNLFVBQVUsWUFBWTtBQUM1QixRQUFNLFVBQVUsWUFBWTtBQUM1QixRQUFNLFlBQVksV0FBVyxDQUFDLENBQUMsUUFBUSxJQUFJO0FBRTNDLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLElBQUk7QUFBQSxNQUNKLE9BQU87QUFBQSxNQUNQLFNBQVM7QUFBQSxRQUNQLE1BQU07QUFBQTtBQUFBLFVBRUosT0FBTztBQUFBLFVBQ1AsUUFBUSxFQUFFLFFBQVEsR0FBRztBQUNuQixnQkFBSSxRQUFRLElBQUksY0FBYztBQUM1QixzQkFBUTtBQUFBO0FBQUEsZ0JBQXlDO0FBQUEsY0FBd0I7QUFBQSxZQUMzRSxPQUFPO0FBQ0wsc0JBQVE7QUFBQSxZQUNWO0FBQUEsVUFDRjtBQUFBLFVBQ0EsTUFBTTtBQUFBLFlBQ0osT0FBTztBQUFBLGNBQ0w7QUFBQSxjQUNBLFFBQVE7QUFBQSxjQUNSLFFBQVE7QUFBQSxjQUNSLGVBQWU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGdCQUtiLFVBQVUsT0FBTyxLQUFLLGtCQUFrQixrQkFBTSxnQkFBSSxlQUFlLENBQUMsQ0FBQztBQUFBLGdCQUNuRSxPQUFPO0FBQUEsa0JBQ0wsT0FBTyxLQUFLLEtBQUssa0NBQVcsd0JBQXdCO0FBQUEsa0JBQ3BELGFBQWEsS0FBSyxLQUFLLGtDQUFXLHNDQUFzQztBQUFBLGdCQUMxRTtBQUFBLGNBQ0Y7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFNBQVM7QUFBQTtBQUFBO0FBQUEsVUFHUCxPQUFPO0FBQUEsVUFDUCxNQUFNO0FBQUEsWUFDSixPQUFPO0FBQUEsY0FDTCxXQUFXLFlBQVksV0FBVztBQUFBO0FBQUEsY0FDbEMsUUFBUTtBQUFBLGNBQ1IsUUFBUTtBQUFBLGNBQ1IsZUFBZTtBQUFBLGdCQUNiLFVBQVUsT0FBTyxLQUFLLGtCQUFrQixrQkFBTSxnQkFBSSxlQUFlLENBQUMsQ0FBQztBQUFBLGNBQ3JFO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJQSxVQUFVLENBQUM7QUFBQSxNQUNiLENBQUM7QUFBQSxNQUNELGNBQWM7QUFBQSxNQUNkLE9BQU87QUFBQSxJQUNUO0FBQUE7QUFBQSxJQUVBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxNQUNwQztBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUTtBQUFBLE1BQ04sR0FBSSxRQUFRLElBQUksaUJBQWlCLE1BQU07QUFDckMsY0FBTSxNQUFNLElBQUksSUFBSSxnQkFBSSxNQUFNLElBQUksbUJBQW1CO0FBQ3JELGVBQU87QUFBQSxVQUNMLE1BQU0sSUFBSTtBQUFBLFVBQ1YsTUFBTSxDQUFDLElBQUk7QUFBQSxRQUNiO0FBQUEsTUFDRixHQUFHO0FBQUE7QUFBQSxNQUVILE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQTtBQUFBLFVBRWQsU0FBUyxDQUFDQSxVQUFTO0FBQ2pCLG1CQUFPQSxNQUFLLFFBQVEsVUFBVSxFQUFFO0FBQUEsVUFDbEM7QUFBQSxVQUNBLElBQUk7QUFBQSxRQUNOO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGFBQWE7QUFBQSxFQUNmO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
