/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@kangc/v-md-editor';
declare module '@kangc/v-md-editor/lib/theme/github.js';
declare module '@kangc/v-md-editor/lib/theme/vuepress.js';
declare module '@kangc/v-md-editor/lib/style/base-editor.css';
declare module '@kangc/v-md-editor/lib/theme/style/github.css';
declare module '@kangc/v-md-editor/lib/theme/style/vuepress.css';
