<script setup lang="ts">
import { MdEditor, MdPreview } from 'md-editor-v3';
import type { ToolbarNames } from 'md-editor-v3';

defineOptions({ name: 'CommonMdEditor' });

withDefaults(
  defineProps<{
    /** 绑定的 Markdown 内容（v-model） */
    modelValue?: string;
    /** 工具栏配置 */
    toolbars?: ToolbarNames[];
    /** 是否显示预览区 */
    preview?: boolean;
    /** 是否仅预览（只读展示，隐藏编辑区） */
    previewOnly?: boolean;
    /** 主题变体：log = 更新日志（紫色主色），cfg = 配置编辑器（天蓝主色） */
    theme?: 'log' | 'cfg';
  }>(),
  {
    modelValue: '',
    // 默认工具栏（更新日志常用排版工具）：defineProps 会被提升到 setup 外，
    // 默认值工厂不能引用局部变量，需内联字面量
    toolbars: () => [
      'bold',
      'underline',
      'italic',
      'strikeThrough',
      'title',
      'sub',
      'sup',
      'quote',
      'unorderedList',
      'orderedList',
      'codeRow',
      'code',
      'link',
      'table',
      'revoke',
      'next'
    ] as ToolbarNames[],
    preview: true,
    previewOnly: false,
    theme: 'log'
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  onSave: [value: string];
}>();

/** v-model 更新透传 */
const handleUpdate = (value: string) => emit('update:modelValue', value);

/** 保存事件透传（Ctrl+S 或保存按钮） */
const handleSave = (value: string) => emit('onSave', value);
</script>

<template>
  <!-- 仅预览：md-editor-v3 自 4.0.0 起移除了 MdEditor 的 previewOnly 属性（不生效），
       需改用独立的 MdPreview 组件才能实现真正的只读预览 -->
  <MdPreview
    v-if="previewOnly"
    class="common-md-editor"
    :class="`md-theme-${theme}`"
    :model-value="modelValue"
  />
  <MdEditor
    v-else
    class="common-md-editor"
    :class="`md-theme-${theme}`"
    :model-value="modelValue"
    :toolbars="toolbars"
    :preview="preview"
    @update:model-value="handleUpdate"
    @on-save="handleSave"
  />
</template>

<style scoped lang="scss">
// ==================== 通用 Markdown 编辑器（MdEditor）美化 ====================
// 参考 updateLog 预览区的透明化风格，支持两种主题变体（log 紫色 / cfg 天蓝）
// 文字色跟随系统主题（naive-ui --n-text-color，页面与 teleport 弹窗内均可用），
// 边框/背景由文字色 color-mix 派生，深浅随系统主题自动切换
.common-md-editor {
  // 主题主色 RGB 三元组（默认 log = 项目主紫）
  --md-accent: 102, 126, 234;

  // 系统主题文字色 + 由其派生的边框/背景色
  --md-text: var(--n-text-color, rgba(var(--app-rgb), 0.8));
  --md-line: color-mix(in srgb, var(--n-text-color, rgba(var(--app-rgb), 0.8)) 12%, transparent);
  --md-line-soft: color-mix(in srgb, var(--n-text-color, rgba(var(--app-rgb), 0.8)) 6%, transparent);
  --md-line-strong: color-mix(in srgb, var(--n-text-color, rgba(var(--app-rgb), 0.8)) 16%, transparent);
  --md-bg-soft: color-mix(in srgb, var(--n-text-color, rgba(var(--app-rgb), 0.8)) 4%, transparent);

  // md-editor-v3 主题变量
  --md-color: var(--md-text);
  --md-bk-color: transparent;
  --md-bk-color-outstand: var(--md-bg-soft);
  --md-bk-hover-color: rgba(var(--md-accent), 0.1);
  --md-border-color: var(--md-line);
  --md-border-hover-color: rgba(var(--md-accent), 0.35);
  --md-border-active-color: rgb(var(--md-accent));
  --md-hover-color: rgb(var(--md-accent));
  --md-theme-base-color: rgb(var(--md-accent));
  --md-scrollbar-bg-color: var(--md-line-soft);
  --md-scrollbar-thumb-color: var(--md-line-strong);
  --md-scrollbar-thumb-hover-color: rgba(var(--md-accent), 0.5);
  --md-scrollbar-thumb-active-color: rgba(var(--md-accent), 0.6);
  background: transparent;
  border: 1px solid var(--md-line);
  border-radius: 10px;
  overflow: hidden;

  // cfg 主题变体：天蓝主色（keyBind 配置编辑器）
  &.md-theme-cfg {
    --md-accent: 75, 158, 248;
  }

  /* 仅预览：库在 previewOnly 下会把预览区内边距清零（.md-editor-previewOnly .md-editor-preview { padding: 0 }），
     这里补回内边距，让文字与边框留出间距（参考 update-confirm 更新日志卡片的 padding: 12px 14px） */
  &.md-editor-previewOnly {
    :deep(.md-editor-preview) {
      padding: 12px 14px;
    }
  }

  /* 编辑区 / 预览区透明化 + 排版统一（字号 13px、行高 1.8，同 updateLog 预览区） */
  :deep(.md-editor-content),
  :deep(.md-editor-preview-wrapper),
  :deep(.md-editor-preview) {
    background: transparent;
  }

  :deep(.md-editor-input) {
    background: transparent;
    font-size: 13px;
    line-height: 1.8;
    color: var(--md-text);
  }

  /* 预览区内容排版：标题 / 段落 / 强调 / 链接 / 列表 / 代码 / 引用 / 表格 */
  :deep(.md-editor-preview) {
    font-size: 13px;
    line-height: 1.8;
    color: var(--md-text);

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 14px 0 8px;
      font-weight: 600;
      line-height: 1.45;
      color: color-mix(in srgb, var(--md-text) 92%, transparent);

      &:first-child {
        margin-top: 0;
      }
    }

    h1 {
      font-size: 17px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--md-line);
    }

    h2 {
      font-size: 15.5px;
    }

    h3 {
      font-size: 14px;
    }

    h4,
    h5,
    h6 {
      font-size: 13.5px;
    }

    p {
      margin: 6px 0;
      color: color-mix(in srgb, var(--md-text) 75%, transparent);
    }

    strong {
      font-weight: 600;
      color: color-mix(in srgb, var(--md-text) 95%, transparent);
    }

    em {
      color: color-mix(in srgb, var(--md-text) 85%, transparent);
    }

    a {
      color: rgb(var(--md-accent));
      text-decoration: none;
      border-bottom: 1px solid rgba(var(--md-accent), 0.35);

      &:hover {
        color: color-mix(in srgb, rgb(var(--md-accent)) 78%, var(--md-text));
        border-bottom-color: color-mix(in srgb, rgb(var(--md-accent)) 78%, var(--md-text));
      }
    }

    ul,
    ol {
      margin: 6px 0;
      padding-left: 20px;
      color: color-mix(in srgb, var(--md-text) 75%, transparent);
    }

    li {
      margin: 3px 0;
    }

    /* 行内代码 */
    code {
      font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 5px;
      background: rgba(var(--md-accent), 0.12);
      color: color-mix(in srgb, rgb(var(--md-accent)) 78%, var(--md-text));
      word-break: break-all;
    }

    /* 代码块 */
    pre {
      margin: 10px 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--md-line);
      overflow-x: auto;
      line-height: 1.6;

      code {
        padding: 0;
        background: transparent;
        color: #c9d1f9;
      }
    }

    /* 引用 */
    blockquote {
      margin: 8px 0;
      padding: 8px 14px;
      border-left: 3px solid rgb(var(--md-accent));
      border-radius: 0 8px 8px 0;
      background: rgba(var(--md-accent), 0.08);
      color: color-mix(in srgb, var(--md-text) 70%, transparent);

      p {
        margin: 4px 0;
      }
    }

    /* 表格 */
    table {
      width: 100%;
      margin: 10px 0;
      border-collapse: collapse;
      font-size: 12.5px;

      th,
      td {
        padding: 7px 12px;
        border: 1px solid var(--md-line);
        text-align: left;
      }

      th {
        background: var(--md-bg-soft);
        font-weight: 600;
        color: color-mix(in srgb, var(--md-text) 85%, transparent);
      }

      tr:nth-child(even) td {
        background: color-mix(in srgb, var(--md-text) 2%, transparent);
      }
    }

    /* 分割线 / 图片 */
    hr {
      margin: 14px 0;
      border: none;
      border-top: 1px solid var(--md-line);
    }

    img {
      max-width: 100%;
      border-radius: 8px;
    }
  }
}
</style>
