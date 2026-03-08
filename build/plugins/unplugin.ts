import type { PluginOption } from 'vite';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';

export function setupUnplugin() {
  const plugins: PluginOption[] = [
    Components({
        // 🔴 核心：指定组件解析器（告诉插件如何找到组件）
        resolvers: [
          NaiveUiResolver(), // 解析 Naive UI 组件（如 NButton、NConfigProvider）
          // 若有其他组件库，可添加对应的 resolver（如 ElementPlusResolver()）
        ],
        // 📁 指定需要扫描的文件目录（默认扫描 src 下所有 .vue 文件）
        dirs: ['src/components',"src/layout"], // 扫描自定义组件（如 AppProvider、SvgIcon）
        // 📄 生成的类型声明文件路径（就是你提供的 components.d.ts）
        dts: 'src/typings/components.d.ts',
        // 🚫 排除不需要扫描的文件（可选）
        exclude: ['node_modules/**', 'src/**/*.md'],
    }),
  ];

  return plugins;
}
