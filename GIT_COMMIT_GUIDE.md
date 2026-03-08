# Git 提交规范指南

本项目使用 Conventional Commits 规范，并通过 `commitizen` + `commitlint` 来规范化 Git 提交信息。

## 安装依赖

```bash
# 安装必要的开发依赖
pnpm add -D commitizen cz-customizable @commitlint/cli @commitlint/config-conventional husky
```

## 配置 Husky（可选但推荐）

```bash
# 初始化 husky
npx husky install

# 添加 commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

## 提交类型说明

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `feat-wip` | 开发中的功能，比如某功能的部分代码 |
| `fix` | 修复 Bug |
| `docs` | 只涉及文档更新 |
| `typo` | 代码或文档勘误，比如错误拼写 |
| `style` | 修改代码风格，不影响代码含义的变更 |
| `refactor` | 代码重构，既不修复 bug 也不添加功能的代码变更 |
| `perf` | 可提高性能的代码更改 |
| `optimize` | 优化代码质量的代码更改 |
| `test` | 添加缺失的测试或更正现有测试 |
| `build` | 影响构建系统或外部依赖项的更改 |
| `ci` | 对 CI 配置文件和脚本的更改 |
| `chore` | 没有修改 src 或测试文件的其他变更 |
| `revert` | 还原先前的提交 |

## 提交范围说明

| 范围 | 说明 |
|------|------|
| `projects` | 项目 |
| `packages` | 包 |
| `components` | 组件 |
| `hooks` | 钩子函数 |
| `utils` | 工具函数 |
| `types` | TS 类型声明 |
| `styles` | 代码风格 |
| `deps` | 项目依赖 |
| `release` | 发布项目新版本 |
| `other` | 其他的变更 |

## 使用方式

### 方式一：使用交互式提交（推荐）

```bash
# 在 package.json 中添加脚本（如果还没有）
# "commit": "git-cz"

# 执行交互式提交
git add .
pnpm commit
```

### 方式二：手动提交（需要符合规范）

```bash
# 格式：<type>(<scope>): <subject>
# 示例：
git add .
git commit -m "feat(components): 添加登录组件"
git commit -m "fix(hooks): 修复 useAuth hook 中的登录逻辑"
git commit -m "docs: 更新 README 文档"
```

## 提交信息格式

```
<type>(<scope>): <subject>
<空行>
<body>
<空行>
<footer>
```

### 说明

- **type**：必填，提交类型，见上表
- **scope**：可选，提交影响的范围，见上表
- **subject**：必填，简短描述，不超过 100 字符
- **body**：可选，详细描述
- **footer**：可选，关联的 issue 或 breaking changes

## 示例

### 新功能
```
feat(components): 添加用户头像组件
```

### 修复 Bug
```
fix(hooks): 修复 useCounter hook 的初始值问题
```

### 重构
```
refactor(utils): 重构工具函数，提高可读性
```

### 文档
```
docs: 更新 API 文档
```

### 构建
```
build(deps): 升级 vite 到 5.2.0
```
