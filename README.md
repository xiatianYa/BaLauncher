# BaLauncher

一个基于 Electron + Vue 3 + Vite 构建的游戏服务器管理启动器。

## ✨ 功能特性

- 🎮 游戏服务器实时查询与管理
- 🌐 多社区服务器列表展示
- 🎯 一键加入游戏服务器
- ⏰ 自动连接服务器功能
- 📋 服务器地址快捷复制
- 🔄 自动刷新服务器状态
- 🚀 Steam/QQ 登录支持
- 📊 服务器信息统计
- 🎨 精美的用户界面

## 🛠️ 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 下一代前端构建工具
- **Naive UI** - Vue 3 组件库
- **Pinia** - Vue 状态管理
- **Vue Router** - Vue 路由管理器
- **UnoCSS** - 原子化 CSS 引擎

## 📦 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

## 🚀 快速开始

### 开发模式

```bash
pnpm run dev
```

### 构建生产版本

```bash
# Windows
pnpm run build:win

# macOS
pnpm run build:mac

# Linux
pnpm run build:linux

# 构建所有平台
pnpm run build
```

### 发布版本

```bash
# Windows
pnpm run publish:win

# macOS
pnpm run publish:mac

# Linux
pnpm run publish:linux
```

## 📁 项目结构

```
BaLauncher/
├── electron/                 # Electron 主进程代码
│   ├── main/                # 主进程入口
│   │   ├── ipcHandlers/     # IPC 通信处理
│   │   │   ├── cs2Gsi.ts    # CS2 GSI 集成
│   │   │   ├── gamePath.ts  # 游戏路径管理
│   │   │   ├── gameServer.ts# 游戏服务器查询
│   │   │   ├── qqLogin.ts   # QQ 登录
│   │   │   ├── steamLogin.ts# Steam 登录
│   │   │   └── windowControl.ts # 窗口控制
│   │   ├── autoUpdater.ts   # 自动更新
│   │   ├── config.ts        # 配置管理
│   │   ├── index.ts         # 主进程入口
│   │   └── windowManager.ts # 窗口管理
│   └── preload/             # 预加载脚本
├── src/                      # 渲染进程代码
│   ├── assets/              # 静态资源
│   ├── components/          # 组件
│   ├── constants/           # 常量
│   ├── hooks/               # 自定义 Hooks
│   ├── layout/              # 布局组件
│   ├── router/              # 路由配置
│   ├── service/             # API 服务
│   ├── store/               # 状态管理
│   ├── style/               # 样式文件
│   ├── typings/             # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   ├── views/               # 页面视图
│   │   ├── home/            # 首页
│   │   ├── server/          # 服务器列表
│   │   ├── setting/         # 设置
│   │   └── tools/           # 工具
│   ├── App.vue              # 根组件
│   └── main.ts              # 渲染进程入口
├── public/                   # 公共静态资源
├── build/                    # 构建配置
└── package.json
```

## 📝 开发说明

### 提交规范

项目使用 Commitizen 进行提交规范管理：

```bash
pnpm run commit
```

### 环境要求

- Node.js >= 18
- pnpm >= 10

## � 功能计划表

### 已实现功能
- [x] 游戏服务器实时查询与管理
- [x] 多社区服务器列表展示
- [x] 一键加入游戏服务器
- [x] 自动连接服务器功能
- [x] 服务器地址快捷复制
- [x] 自动刷新服务器状态
- [x] Steam/QQ 登录支持
- [x] 服务器信息统计
- [x] 精美的用户界面

### 计划添加功能
- [ ] 游戏状态托盘
- [ ] 首页数据展示
- [ ] 地图订阅
- [ ] QQ机器人通知
- [ ] 换图提醒
- [ ] 一键换肤
- [ ] 地图库
- [ ] 按键绑定
- [ ] 聊天室
- [ ] 游戏直播
- [ ] 直播OBS
- [ ] 服务器热身状态
- [ ] 服务器比分数据
- [ ] 延迟显示
- [ ] 挤服托盘

### 技术迁移计划
- [ ] 考虑移植到 Tauri 的可能性

## 📚 数据来源库

- **cs2-gsi-z**: [GitHub 地址](https://github.com/zombieyang/cs2-gsi-z)
- **steam-server-query**: [GitHub 地址](https://github.com/DoctorMcKay/node-steam-server-query)

## �📄 许可证

MIT License

## 👤 作者

夏天 <939648675@qq.com>
