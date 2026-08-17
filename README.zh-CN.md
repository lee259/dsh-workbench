# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[English](./README.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

[DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) 的右侧文件工作区。在 DSH Web 会话里点击路径，即可在对话旁边阅读或对比文件。

![DSH Workbench 在 DeepSeek Harness Web 中运行](./assets/dsh-workbench-demo.png)

```text
read       → 源码
write/edit → 捕获到的 DSH diff
```

## 为什么用

- 对话和正在查看的文件同时可见。
- 只展示真实 DSH write/edit 的前后变化。
- `read` 是源码预览。Diff 来自捕获到的 DSH 写入，不是 Git `HEAD`。
- 多文件标签、复制路径、拖拽调宽度。文件树或 Quick Open 单击预览，双击固定。对话里的写入打开固定标签。
- 快捷键：`⌥⌘B` 开关，`⌘⇧E` 隐藏或显示文件栏，`⌘P` 打开文件，树搜索只定位不打开，`⌘F` / `⌘L` 查找或跳行，`⌘W` 关闭，`⌘1`–`⌘9` 切标签。拖拽或右键可插入路径。
- 审阅列出捕获到的写入和 `+/−`。
- 界面跟随 DSH 语言设置。

## 安装

```bash
dsh plugin --profile web add dsh-workbench
dsh web
```

本机没有 `dsh` 时：

```bash
pnpm dlx @deepseek-ai/dsh plugin --profile web add dsh-workbench
pnpm dlx @deepseek-ai/dsh web
```

本地检出：

```bash
git clone https://github.com/lee259/dsh-workbench.git
cd dsh-workbench
pnpm install
pnpm run build
dsh plugin --profile web add "$(pwd)"
dsh web
```

改完插件后重新 `pnpm run build`，再重启 `dsh web`。

## 本地启动

```bash
pnpm start -- /绝对路径/你的项目
```

构建插件、注册到目标项目，并启动 DSH Web。不传路径时使用当前目录。

## 预览

| DSH 操作 | 展示 |
| --- | --- |
| `read` | 源码；图片和 Markdown 会渲染 |
| `write` / `edit` | 捕获到的 DSH diff |
| 文件提及 | 源码；图片和 Markdown 会渲染 |

Host 监听 `tool/call`、`tool/result`、`tool/code-dispatch`。优先使用 `dsh-tool-fs` 的 `meta.diffs`。

## 开发

```bash
pnpm install
pnpm test
pnpm start -- /绝对路径/你的项目
```

- Host：`src/index.ts` 导出 `name`、`inject`、`apply(ctx)`
- Client：`dsh.client`、`exports["./client"]`、`window.__ModuleLoader__.load`
- 样式：`src/client/styles.css`
- 第三方 React 组件：使用 DSH 注入的 React 运行时。若组件静态导入 `react-dom`、依赖尚未桥接的 React API，或注入全局 CSS，需要先加适配层；参见 `src/client/react-bridge.ts` 与 `tsdown.config.ts`。
- 文案：`src/shared/i18n.ts`

## Roadmap

在对话旁边查看、定位和审阅 agent 改过的文件。Diff 只来自捕获到的 DSH 写入。

### 已完成

- `read` 和文件提及的只读预览
- `write` / `edit` 的真实 DSH Diff
- 常驻、可调整宽度的右侧文件工作区
- 多文件标签、预览 / 固定、复制路径和桌面快捷键
- 文件内查找 / 跳行，以及对话里的 `:line` / `#Lline` 定位
- 跟随 DSH locale 的中英文界面
- Quick Open（`⌘/Ctrl+P`）和只定位不打开的树搜索
- 工作区文件树：面包屑、键盘导航，以及把路径插入输入框
- 语法高亮、代码折叠，以及磁盘变更后的实时刷新
- 图片预览和渲染后的 Markdown（支持相对图片）
- 变更审阅：按会话列出捕获到的 DSH 写入和 `+/−`
- 每条捕获写入显示简单操作摘要
- 跟随 agent：自动打开并定位最新写入的文件

### 近期计划

- 工作区内容搜索（`⌘/Ctrl+⇧+F`）
- 从文件树把文件或目录挂到输入框当上下文
- 关联当前工作区的 Git worktree（不生成 Git `HEAD` diff）

### 探索方向

- 在编辑器中打开、在文件夹中显示
- 在 Diff 行上写批注并送回对话输入框
- 在宿主提供可用 slot 的前提下，接入 DSH 原生面板控制和布局
- 可插拔工作区面板（Files / Review，以及后续 DSH 工具）

## License

[MIT](./LICENSE)
