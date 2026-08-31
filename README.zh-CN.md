# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[English](./README.md) · [更新日志](./CHANGELOG.zh-CN.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

[DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) Web 的 Codex 风格工作区与 Git 审查。无需离开对话，即可同时审查会话编辑和 Git 变更。

## 核心能力

- **按正确基线审查** — 可切换会话编辑、未提交、未暂存与已暂存；文件列表和 `+/−` 行数始终同步。
- **在对话旁阅读和对比** — 可从 Agent 工具调用、工作区文件树或搜索打开文件，不丢失当前上下文。
- **跟随 Agent 编辑** — 新编辑会刷新审查并定位受影响文件，不会在长列表中反复跳动。

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
- 工作区内容搜索（`⌘/Ctrl+⇧+F`），结果可直接跳到命中行
- 从文件树和预览选区向输入框引用文件、目录和代码范围

### 近期计划

目标是在 DeepSeek Harness 内提供接近 Codex 的开发交互：复用成熟的工作区交互，
同时保留 DSH 写入捕获和会话审阅作为本项目的核心。

1. 增加真正的编辑模式：草稿状态、保存、外部变更冲突提示，以及回到对话的路径。
2. 分阶段补齐开发闭环：终端、Git worktree/状态、后台任务或子代理可见性。
3. 收紧对话联动：打开/定位目标、从审阅结果反馈到对话，以及按会话持久化工作区状态。

现有的 DSH 事件捕获、`meta.diffs`、会话 Review、操作摘要和 agent-follow 继续作为
差异化基础。

### 近期实施顺序

- 支持保存的可编辑预览，以及外部变更冲突处理
- 关联 Git worktree 并展示状态，但不凭空生成 Git `HEAD` diff
- 终端和后台任务面板

### 探索方向

- 在编辑器中打开、在文件夹中显示
- 在 Diff 行上写批注并送回对话输入框
- 在宿主提供可用 slot 的前提下，接入 DSH 原生面板控制和布局
- 可插拔工作区面板（Files / Review，以及后续 DSH 工具）

## License

[MIT](./LICENSE)
