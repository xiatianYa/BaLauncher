// vite.config.ts
import fs from "node:fs";
import { defineConfig } from "file:///D:/bluearchive/BaLauncher/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/bluearchive/BaLauncher/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/bluearchive/BaLauncher/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import electron from "file:///D:/bluearchive/BaLauncher/node_modules/vite-plugin-electron/dist/simple.mjs";

// package.json
var package_default = {
  name: "BaLauncher",
  version: "1.4.1",
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
    jose: "^6.2.8",
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
    clearScreen: false,
    // 使用 Sass modern API 编译，消除 legacy-js-api 弃用警告（Dart Sass 2.0 将移除 legacy API）
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern"
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIiwgImJ1aWxkL3BsdWdpbnMvdW5wbHVnaW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxibHVlYXJjaGl2ZVxcXFxCYUxhdW5jaGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxibHVlYXJjaGl2ZVxcXFxCYUxhdW5jaGVyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9ibHVlYXJjaGl2ZS9CYUxhdW5jaGVyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xyXG5pbXBvcnQgdnVlSnN4IGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZS1qc3gnXHJcbmltcG9ydCBlbGVjdHJvbiBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi9zaW1wbGUnXHJcbmltcG9ydCBwa2cgZnJvbSAnLi9wYWNrYWdlLmpzb24nXHJcbmltcG9ydCB7IHNldHVwVW5wbHVnaW4gfSBmcm9tICcuL2J1aWxkL3BsdWdpbnMvdW5wbHVnaW4nO1xyXG5pbXBvcnQgVW5vQ1NTIGZyb20gJ3Vub2Nzcy92aXRlJ1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnIC8vIFx1NUYxNVx1NTE2NXBhdGhcdTZBMjFcdTU3NTdcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kIH0pID0+IHtcclxuICBmcy5ybVN5bmMoJ2Rpc3QtZWxlY3Ryb24nLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSlcclxuXHJcbiAgY29uc3QgaXNTZXJ2ZSA9IGNvbW1hbmQgPT09ICdzZXJ2ZSdcclxuICBjb25zdCBpc0J1aWxkID0gY29tbWFuZCA9PT0gJ2J1aWxkJ1xyXG4gIGNvbnN0IHNvdXJjZW1hcCA9IGlzU2VydmUgfHwgISFwcm9jZXNzLmVudi5WU0NPREVfREVCVUdcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgdnVlKCksXHJcbiAgICAgIHZ1ZUpzeCgpLFxyXG4gICAgICBlbGVjdHJvbih7XHJcbiAgICAgICAgbWFpbjoge1xyXG4gICAgICAgICAgLy8gU2hvcnRjdXQgb2YgYGJ1aWxkLmxpYi5lbnRyeWBcclxuICAgICAgICAgIGVudHJ5OiAnZWxlY3Ryb24vbWFpbi9pbmRleC50cycsXHJcbiAgICAgICAgICBvbnN0YXJ0KHsgc3RhcnR1cCB9KSB7XHJcbiAgICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5WU0NPREVfREVCVUcpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygvKiBGb3IgYC52c2NvZGUvLmRlYnVnLnNjcmlwdC5tanNgICovJ1tzdGFydHVwXSBFbGVjdHJvbiBBcHAnKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHN0YXJ0dXAoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdml0ZToge1xyXG4gICAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICAgIHNvdXJjZW1hcCxcclxuICAgICAgICAgICAgICBtaW5pZnk6IGlzQnVpbGQsXHJcbiAgICAgICAgICAgICAgb3V0RGlyOiAnZGlzdC1lbGVjdHJvbi9tYWluJyxcclxuICAgICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAvLyBTb21lIHRoaXJkLXBhcnR5IE5vZGUuanMgbGlicmFyaWVzIG1heSBub3QgYmUgYnVpbHQgY29ycmVjdGx5IGJ5IFZpdGUsIGVzcGVjaWFsbHkgYEMvQysrYCBhZGRvbnMsIFxyXG4gICAgICAgICAgICAgICAgLy8gd2UgY2FuIHVzZSBgZXh0ZXJuYWxgIHRvIGV4Y2x1ZGUgdGhlbSB0byBlbnN1cmUgdGhleSB3b3JrIGNvcnJlY3RseS5cclxuICAgICAgICAgICAgICAgIC8vIE90aGVycyBuZWVkIHRvIHB1dCB0aGVtIGluIGBkZXBlbmRlbmNpZXNgIHRvIGVuc3VyZSB0aGV5IGFyZSBjb2xsZWN0ZWQgaW50byBgYXBwLmFzYXJgIGFmdGVyIHRoZSBhcHAgaXMgYnVpbHQuXHJcbiAgICAgICAgICAgICAgICAvLyBPZiBjb3Vyc2UsIHRoaXMgaXMgbm90IGFic29sdXRlLCBqdXN0IHRoaXMgd2F5IGlzIHJlbGF0aXZlbHkgc2ltcGxlLiA6KVxyXG4gICAgICAgICAgICAgICAgZXh0ZXJuYWw6IE9iamVjdC5rZXlzKCdkZXBlbmRlbmNpZXMnIGluIHBrZyA/IHBrZy5kZXBlbmRlbmNpZXMgOiB7fSksXHJcbiAgICAgICAgICAgICAgICBpbnB1dDoge1xyXG4gICAgICAgICAgICAgICAgICBpbmRleDogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2VsZWN0cm9uL21haW4vaW5kZXgudHMnKSxcclxuICAgICAgICAgICAgICAgICAgc2VydmVyUXVlcnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICdlbGVjdHJvbi9tYWluL3dvcmtlcnMvc2VydmVyUXVlcnkudHMnKSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwcmVsb2FkOiB7XHJcbiAgICAgICAgICAvLyBTaG9ydGN1dCBvZiBgYnVpbGQucm9sbHVwT3B0aW9ucy5pbnB1dGAuXHJcbiAgICAgICAgICAvLyBQcmVsb2FkIHNjcmlwdHMgbWF5IGNvbnRhaW4gV2ViIGFzc2V0cywgc28gdXNlIHRoZSBgYnVpbGQucm9sbHVwT3B0aW9ucy5pbnB1dGAgaW5zdGVhZCBgYnVpbGQubGliLmVudHJ5YC5cclxuICAgICAgICAgIGlucHV0OiAnZWxlY3Ryb24vcHJlbG9hZC9pbmRleC50cycsXHJcbiAgICAgICAgICB2aXRlOiB7XHJcbiAgICAgICAgICAgIGJ1aWxkOiB7XHJcbiAgICAgICAgICAgICAgc291cmNlbWFwOiBzb3VyY2VtYXAgPyAnaW5saW5lJyA6IHVuZGVmaW5lZCwgLy8gIzMzMlxyXG4gICAgICAgICAgICAgIG1pbmlmeTogaXNCdWlsZCxcclxuICAgICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uL3ByZWxvYWQnLFxyXG4gICAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgIGV4dGVybmFsOiBPYmplY3Qua2V5cygnZGVwZW5kZW5jaWVzJyBpbiBwa2cgPyBwa2cuZGVwZW5kZW5jaWVzIDoge30pLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gUGxveWZpbGwgdGhlIEVsZWN0cm9uIGFuZCBOb2RlLmpzIEFQSSBmb3IgUmVuZGVyZXIgcHJvY2Vzcy5cclxuICAgICAgICAvLyBJZiB5b3Ugd2FudCB1c2UgTm9kZS5qcyBpbiBSZW5kZXJlciBwcm9jZXNzLCB0aGUgYG5vZGVJbnRlZ3JhdGlvbmAgbmVlZHMgdG8gYmUgZW5hYmxlZCBpbiB0aGUgTWFpbiBwcm9jZXNzLlxyXG4gICAgICAgIC8vIFNlZSBcdUQ4M0RcdURDNDkgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uLXZpdGUvdml0ZS1wbHVnaW4tZWxlY3Ryb24tcmVuZGVyZXJcclxuICAgICAgICByZW5kZXJlcjoge30sXHJcbiAgICAgIH0pLFxyXG4gICAgICBzZXR1cFVucGx1Z2luKCksXHJcbiAgICAgIFVub0NTUygpLFxyXG4gICAgXSxcclxuICAgIC8vIFx1NkRGQlx1NTJBMFx1OERFRlx1NUY4NFx1NTIyQlx1NTQwRFx1OTE0RFx1N0Y2RVxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICAvLyBcdTY3MERcdTUyQTFcdTU2NjhcdTkxNERcdTdGNkUgLSBcdTkxQ0RcdTcwQjlcdTRGRUVcdTU5MERcdTRFRTNcdTc0MDZcdTk1RUVcdTk4OThcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICAuLi4ocHJvY2Vzcy5lbnYuVlNDT0RFX0RFQlVHICYmICgoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChwa2cuZGVidWcuZW52LlZJVEVfREVWX1NFUlZFUl9VUkwpXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGhvc3Q6IHVybC5ob3N0bmFtZSxcclxuICAgICAgICAgIHBvcnQ6ICt1cmwucG9ydCxcclxuICAgICAgICB9XHJcbiAgICAgIH0pKCkpLFxyXG4gICAgICAvLyBcdTRFRTNcdTc0MDZcdTkxNERcdTdGNkVcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjgwODBcIixcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIC8vIFx1NEZFRVx1NTkwRFx1OERFRlx1NUY4NFx1NjZGRlx1NjM2Mlx1OTAzQlx1OEY5MVxyXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjbGVhclNjcmVlbjogZmFsc2UsXHJcbiAgICAvLyBcdTRGN0ZcdTc1MjggU2FzcyBtb2Rlcm4gQVBJIFx1N0YxNlx1OEJEMVx1RkYwQ1x1NkQ4OFx1OTY2NCBsZWdhY3ktanMtYXBpIFx1NUYwM1x1NzUyOFx1OEI2Nlx1NTQ0QVx1RkYwOERhcnQgU2FzcyAyLjAgXHU1QzA2XHU3OUZCXHU5NjY0IGxlZ2FjeSBBUElcdUZGMDlcclxuICAgIGNzczoge1xyXG4gICAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XHJcbiAgICAgICAgc2Nzczoge1xyXG4gICAgICAgICAgYXBpOiAnbW9kZXJuJ1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9XHJcbn0pXHJcbiIsICJ7XHJcbiAgXCJuYW1lXCI6IFwiQmFMYXVuY2hlclwiLFxyXG4gIFwidmVyc2lvblwiOiBcIjEuNC4xXCIsXHJcbiAgXCJtYWluXCI6IFwiZGlzdC1lbGVjdHJvbi9tYWluL2luZGV4LmpzXCIsXHJcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlJlYWxseSBzaW1wbGUgRWxlY3Ryb24gKyBWdWUgKyBWaXRlIGJvaWxlcnBsYXRlLlwiLFxyXG4gIFwiYXV0aG9yXCI6IFwiXHU1OTBGXHU1OTI5IDw5Mzk2NDg2NzVAcXEuY29tPlwiLFxyXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxyXG4gIFwicHJpdmF0ZVwiOiB0cnVlLFxyXG4gIFwia2V5d29yZHNcIjogW1xyXG4gICAgXCJlbGVjdHJvblwiLFxyXG4gICAgXCJyb2xsdXBcIixcclxuICAgIFwidml0ZVwiLFxyXG4gICAgXCJ2dWUzXCIsXHJcbiAgICBcInZ1ZVwiXHJcbiAgXSxcclxuICBcImRlYnVnXCI6IHtcclxuICAgIFwiZW52XCI6IHtcclxuICAgICAgXCJWSVRFX0RFVl9TRVJWRVJfVVJMXCI6IFwiaHR0cDovLzEyNy4wLjAuMTozMzQ0L1wiXHJcbiAgICB9XHJcbiAgfSxcclxuICBcInR5cGVcIjogXCJtb2R1bGVcIixcclxuICBcInNjcmlwdHNcIjoge1xyXG4gICAgXCJkZXZcIjogXCJ2aXRlXCIsXHJcbiAgICBcImJ1aWxkXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmJiB2aXRlIGJ1aWxkICYmIGVsZWN0cm9uLWJ1aWxkZXJcIixcclxuICAgIFwiYnVpbGQ6d2luXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmJiB2aXRlIGJ1aWxkICYmIGVsZWN0cm9uLWJ1aWxkZXIgLS13aW5cIixcclxuICAgIFwiYnVpbGQ6bWFjXCI6IFwidnVlLXRzYyAtLW5vRW1pdCAmJiB2aXRlIGJ1aWxkICYmIGVsZWN0cm9uLWJ1aWxkZXIgLS1tYWNcIixcclxuICAgIFwiYnVpbGQ6bGludXhcIjogXCJ2dWUtdHNjIC0tbm9FbWl0ICYmIHZpdGUgYnVpbGQgJiYgZWxlY3Ryb24tYnVpbGRlciAtLWxpbnV4XCIsXHJcbiAgICBcInB1Ymxpc2hcIjogXCJucG0gcnVuIGJ1aWxkICYmIGVsZWN0cm9uLWJ1aWxkZXIgLS1wdWJsaXNoIGFsd2F5c1wiLFxyXG4gICAgXCJwdWJsaXNoOndpblwiOiBcIm5wbSBydW4gYnVpbGQ6d2luICYmIGVsZWN0cm9uLWJ1aWxkZXIgLS13aW4gLS1wdWJsaXNoIGFsd2F5c1wiLFxyXG4gICAgXCJwdWJsaXNoOm1hY1wiOiBcIm5wbSBydW4gYnVpbGQ6bWFjICYmIGVsZWN0cm9uLWJ1aWxkZXIgLS1tYWMgLS1wdWJsaXNoIGFsd2F5c1wiLFxyXG4gICAgXCJwdWJsaXNoOmxpbnV4XCI6IFwibnBtIHJ1biBidWlsZDpsaW51eCAmJiBlbGVjdHJvbi1idWlsZGVyIC0tbGludXggLS1wdWJsaXNoIGFsd2F5c1wiLFxyXG4gICAgXCJwcmV2aWV3XCI6IFwidml0ZSBwcmV2aWV3XCIsXHJcbiAgICBcImNvbW1pdFwiOiBcImdpdC1jelwiXHJcbiAgfSxcclxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XHJcbiAgICBcIkBjb21taXRsaW50L2NsaVwiOiBcIl4yMC40LjNcIixcclxuICAgIFwiQGNvbW1pdGxpbnQvY29uZmlnLWNvbnZlbnRpb25hbFwiOiBcIl4yMC40LjNcIixcclxuICAgIFwiQGljb25pZnkvdnVlXCI6IFwiNS4wLjBcIixcclxuICAgIFwiQHR5cGVzL25wcm9ncmVzc1wiOiBcIl4wLjIuM1wiLFxyXG4gICAgXCJAdml0ZWpzL3BsdWdpbi12dWVcIjogXCJeNS4wLjRcIixcclxuICAgIFwiQHZ1ZXVzZS9jb3JlXCI6IFwiMTMuMy4wXCIsXHJcbiAgICBcImF4aW9zXCI6IFwiXjEuMTEuMFwiLFxyXG4gICAgXCJjb21taXRpemVuXCI6IFwiXjQuMy4xXCIsXHJcbiAgICBcImN6LWN1c3RvbWl6YWJsZVwiOiBcIl43LjUuMVwiLFxyXG4gICAgXCJkYXlqc1wiOiBcIjEuMTEuMTNcIixcclxuICAgIFwiZWNoYXJ0c1wiOiBcIjUuNS4xXCIsXHJcbiAgICBcImVsZWN0cm9uXCI6IFwiXjI5LjEuMVwiLFxyXG4gICAgXCJlbGVjdHJvbi1idWlsZGVyXCI6IFwiXjI0LjEzLjNcIixcclxuICAgIFwia2xvbmFcIjogXCIyLjAuNlwiLFxyXG4gICAgXCJuYWl2ZS11aVwiOiBcIl4yLjQyLjBcIixcclxuICAgIFwibnByb2dyZXNzXCI6IFwiXjAuMi4wXCIsXHJcbiAgICBcInBpbmlhXCI6IFwiMy4wLjNcIixcclxuICAgIFwic2Fzc1wiOiBcIjEuODkuMVwiLFxyXG4gICAgXCJ0YWlsd2luZC1tZXJnZVwiOiBcIjMuMy4xXCIsXHJcbiAgICBcInR5cGVzY3JpcHRcIjogXCI1LjguM1wiLFxyXG4gICAgXCJ1bm9jc3NcIjogXCJeNjYuNS4wXCIsXHJcbiAgICBcInVucGx1Z2luLXZ1ZS1jb21wb25lbnRzXCI6IFwiMjguNy4wXCIsXHJcbiAgICBcInZpdGVcIjogXCJeNS4xLjVcIixcclxuICAgIFwidml0ZS1wbHVnaW4tZWxlY3Ryb25cIjogXCJeMC4yOC40XCIsXHJcbiAgICBcInZpdGUtcGx1Z2luLWVsZWN0cm9uLXJlbmRlcmVyXCI6IFwiXjAuMTQuNVwiLFxyXG4gICAgXCJ2dWVcIjogXCJeMy40LjIxXCIsXHJcbiAgICBcInZ1ZS1pMThuXCI6IFwiMTEuMS43XCIsXHJcbiAgICBcInZ1ZS1yb3V0ZXJcIjogXCI0LjUuMVwiLFxyXG4gICAgXCJ2dWUtdHNjXCI6IFwiXjIuMC42XCIsXHJcbiAgICBcInZ1ZTMtbGF6eWxvYWRcIjogXCIwLjMuOFwiXHJcbiAgfSxcclxuICBcImRlcGVuZGVuY2llc1wiOiB7XHJcbiAgICBcIkB2aXRlanMvcGx1Z2luLXZ1ZS1qc3hcIjogXCJeNS4xLjVcIixcclxuICAgIFwiYW5pbWF0ZS5jc3NcIjogXCJeNC4xLjFcIixcclxuICAgIFwiYW5pbWVqc1wiOiBcIl40LjMuNlwiLFxyXG4gICAgXCJjczItZ3NpLXpcIjogXCJeMi4wLjBcIixcclxuICAgIFwiZWxlY3Ryb24tdXBkYXRlclwiOiBcIl42LjYuMlwiLFxyXG4gICAgXCJqb3NlXCI6IFwiXjYuMi44XCIsXHJcbiAgICBcIm1kLWVkaXRvci12M1wiOiBcIl42LjQuMFwiLFxyXG4gICAgXCJwaXhpLmpzXCI6IFwiXjguMTcuMVwiLFxyXG4gICAgXCJzdGVhbS1zZXJ2ZXItcXVlcnlcIjogXCJeMS4xLjNcIixcclxuICAgIFwidnVlLWRyYWdnYWJsZS1wbHVzXCI6IFwiXjAuNi4xXCJcclxuICB9LFxyXG4gIFwicGFja2FnZU1hbmFnZXJcIjogXCJwbnBtQDEwLjMwLjMrc2hhNTEyLmM5NjFkMWUwYTJkOGUzNTRlY2FhNTE2NmI4MjI1MTY2NjhiN2Y0NGNiNWJkOTUxMjJkNTkwZGQ4MTkyMmY2MDZmNTQ3M2I2ZDIzZWM0YTViZTA1ZTdmY2QxOGU4NDg4ZDQ3ZDk3OGJiZTk4MTg3MmYxMTQ1ZDA2ZTlhNzQwMDE3XCIsXHJcbiAgXCJjb25maWdcIjoge1xyXG4gICAgXCJjb21taXRpemVuXCI6IHtcclxuICAgICAgXCJwYXRoXCI6IFwiLi9ub2RlX21vZHVsZXMvY3otY3VzdG9taXphYmxlXCJcclxuICAgIH0sXHJcbiAgICBcImN6LWN1c3RvbWl6YWJsZVwiOiB7XHJcbiAgICAgIFwiY29uZmlnXCI6IFwiLmN6LWNvbmZpZy5janNcIlxyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXGJsdWVhcmNoaXZlXFxcXEJhTGF1bmNoZXJcXFxcYnVpbGRcXFxccGx1Z2luc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcYmx1ZWFyY2hpdmVcXFxcQmFMYXVuY2hlclxcXFxidWlsZFxcXFxwbHVnaW5zXFxcXHVucGx1Z2luLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9ibHVlYXJjaGl2ZS9CYUxhdW5jaGVyL2J1aWxkL3BsdWdpbnMvdW5wbHVnaW4udHNcIjtpbXBvcnQgdHlwZSB7IFBsdWdpbk9wdGlvbiB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJztcclxuaW1wb3J0IHsgTmFpdmVVaVJlc29sdmVyIH0gZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvcmVzb2x2ZXJzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFVucGx1Z2luKCkge1xyXG4gIGNvbnN0IHBsdWdpbnM6IFBsdWdpbk9wdGlvbltdID0gW1xyXG4gICAgQ29tcG9uZW50cyh7XHJcbiAgICAgICAgLy8gXHVEODNEXHVERDM0IFx1NjgzOFx1NUZDM1x1RkYxQVx1NjMwN1x1NUI5QVx1N0VDNFx1NEVGNlx1ODlFM1x1Njc5MFx1NTY2OFx1RkYwOFx1NTQ0QVx1OEJDOVx1NjNEMlx1NEVGNlx1NTk4Mlx1NEY1NVx1NjI3RVx1NTIzMFx1N0VDNFx1NEVGNlx1RkYwOVxyXG4gICAgICAgIHJlc29sdmVyczogW1xyXG4gICAgICAgICAgTmFpdmVVaVJlc29sdmVyKCksIC8vIFx1ODlFM1x1Njc5MCBOYWl2ZSBVSSBcdTdFQzRcdTRFRjZcdUZGMDhcdTU5ODIgTkJ1dHRvblx1MzAwMU5Db25maWdQcm92aWRlclx1RkYwOVxyXG4gICAgICAgICAgLy8gXHU4MkU1XHU2NzA5XHU1MTc2XHU0RUQ2XHU3RUM0XHU0RUY2XHU1RTkzXHVGRjBDXHU1M0VGXHU2REZCXHU1MkEwXHU1QkY5XHU1RTk0XHU3Njg0IHJlc29sdmVyXHVGRjA4XHU1OTgyIEVsZW1lbnRQbHVzUmVzb2x2ZXIoKVx1RkYwOVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgLy8gXHVEODNEXHVEQ0MxIFx1NjMwN1x1NUI5QVx1OTcwMFx1ODk4MVx1NjI2Qlx1NjNDRlx1NzY4NFx1NjU4N1x1NEVGNlx1NzZFRVx1NUY1NVx1RkYwOFx1OUVEOFx1OEJBNFx1NjI2Qlx1NjNDRiBzcmMgXHU0RTBCXHU2MjQwXHU2NzA5IC52dWUgXHU2NTg3XHU0RUY2XHVGRjA5XHJcbiAgICAgICAgZGlyczogWydzcmMvY29tcG9uZW50cycsXCJzcmMvbGF5b3V0XCJdLCAvLyBcdTYyNkJcdTYzQ0ZcdTgxRUFcdTVCOUFcdTRFNDlcdTdFQzRcdTRFRjZcdUZGMDhcdTU5ODIgQXBwUHJvdmlkZXJcdTMwMDFTdmdJY29uXHVGRjA5XHJcbiAgICAgICAgLy8gXHVEODNEXHVEQ0M0IFx1NzUxRlx1NjIxMFx1NzY4NFx1N0M3Qlx1NTc4Qlx1NThGMFx1NjYwRVx1NjU4N1x1NEVGNlx1OERFRlx1NUY4NFx1RkYwOFx1NUMzMVx1NjYyRlx1NEY2MFx1NjNEMFx1NEY5Qlx1NzY4NCBjb21wb25lbnRzLmQudHNcdUZGMDlcclxuICAgICAgICBkdHM6ICdzcmMvdHlwaW5ncy9jb21wb25lbnRzLmQudHMnLFxyXG4gICAgICAgIC8vIFx1RDgzRFx1REVBQiBcdTYzOTJcdTk2NjRcdTRFMERcdTk3MDBcdTg5ODFcdTYyNkJcdTYzQ0ZcdTc2ODRcdTY1ODdcdTRFRjZcdUZGMDhcdTUzRUZcdTkwMDlcdUZGMDlcclxuICAgICAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcy8qKicsICdzcmMvKiovKi5tZCddLFxyXG4gICAgfSksXHJcbiAgXTtcclxuXHJcbiAgcmV0dXJuIHBsdWdpbnM7XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjog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
