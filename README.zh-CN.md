# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[English](./README.md) · [更新日志](./CHANGELOG.zh-CN.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

[DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) Web 的 Codex 风格文件工作区与 Git 审查。把对话、改动文件和 diff 放在同一个地方看。

## 能做什么

- 捕获 DSH `write` / `edit` 的原始前后内容。
- 可切换会话编辑、未提交、未暂存与已暂存 Git 变更；文件树和 diff 共用 `+/−` 统计。
- 从工具调用、工作区文件树或搜索打开文件；对话里的文件链接会展开对应 diff。
- 可编辑工作区文件、复制路径，并把选中的 diff 范围插入当前 Harness 输入框。

![DSH Workbench 在 DeepSeek Harness Web 中运行](./assets/dsh-workbench-demo.png)

```text
read       → 源码
write/edit → 捕获到的 DSH diff
```

## 细节

右侧面板可常驻、可调整宽度，支持预览和固定标签、Quick Open、文件树搜索、文件内查找/跳行、图片与 Markdown 预览，以及带外部变更保护的工作区编辑；界面跟随 DSH 语言设置。

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
- 变更审阅：会话编辑、未提交、未暂存和已暂存 Git 范围，共用 `+/−` 数据
- 每条捕获写入显示简单操作摘要
- 审查增量更新：保持当前 Tab，大型审查面板仍能流畅响应
- 工作区内容搜索（`⌘/Ctrl+⇧+F`），结果可直接跳到命中行
- 从文件树和预览选区向输入框引用文件、目录和代码范围
- 可编辑的工作区预览，以及外部变更保护
- 审查工具栏中的 Git 分支/状态与会话工具活动信息

### 近期计划

目标是在 DeepSeek Harness 内提供接近 Codex 的开发交互：复用成熟的工作区交互，
同时保留 DSH 写入捕获和会话审阅作为本项目的核心。

1. 以 DSH 原生方式逐步补齐终端与后台任务面板。
2. 收紧审阅到对话的反馈，包括在 diff 中给出内联指导。
3. 持续优化按会话保存的工作区状态和审查性能。

现有的 DSH 事件捕获、`meta.diffs`、会话 Review、操作摘要和增量审查更新继续作为
差异化基础。

### 近期实施顺序

- 终端和后台任务面板
- 内联审查评论，以及更丰富的审阅到对话反馈

### 探索方向

- 在编辑器中打开、在文件夹中显示
- 在 Diff 行上写批注并送回对话输入框
- 在宿主提供可用 slot 的前提下，接入 DSH 原生面板控制和布局
- 可插拔工作区面板（Files / Review，以及后续 DSH 工具）

## License

[MIT](./LICENSE)
