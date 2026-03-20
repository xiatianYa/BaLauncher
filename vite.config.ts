import fs from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'
import { setupUnplugin } from './build/plugins/unplugin';
import UnoCSS from 'unocss/vite'
import path from 'node:path' // 引入path模块

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  fs.rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    plugins: [
      vue(),
      vueJsx(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main/index.ts',
          onstart({ startup }) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App')
            } else {
              startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons, 
                // we can use `external` to exclude them to ensure they work correctly.
                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                // Of course, this is not absolute, just this way is relatively simple. :)
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                input: {
                  index: path.join(__dirname, 'electron/main/index.ts'),
                  serverQuery: path.join(__dirname, 'electron/main/workers/serverQuery.ts'),
                },
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
      setupUnplugin(),
      UnoCSS(),
    ],
    // 添加路径别名配置
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    // 服务器配置 - 重点修复代理问题
    server: {
      ...(process.env.VSCODE_DEBUG && (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
        return {
          host: url.hostname,
          port: +url.port,
        }
      })()),
      // 代理配置
      proxy: {
        '/api': {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
          // 修复路径替换逻辑
          rewrite: (path) => {
            return path.replace(/^\/api/, '');
          },
          ws: true,
        }
      }
    },
    clearScreen: false,
  }
})
