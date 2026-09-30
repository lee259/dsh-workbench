# DSH Workbench

[![DSH Insights health](https://dsh-insights.com/badge/lee259/dsh-workbench.svg)](https://dsh-insights.com/p/lee259/dsh-workbench/) [![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[English](./README.md) · [更新日志](./CHANGELOG.zh-CN.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

[DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) Web 内的 Codex 风格审查。直接审查 Harness 每轮记录的文件变更和原生 Diff。

## 能做什么

- 按 DSH Session 和 turn 浏览文件变更，并读取 Harness 原生 hunk Diff。
- 主区域显示 Harness Diff，旁边列出变更文件供切换查看。
- 从工具调用、工作区文件树或搜索打开文件；对话里的文件链接会展开对应 diff。
- 文件预览、工作区浏览和路径引用作为审查时的辅助能力保留。

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

可在隔离的 DSH Web 实例中挂载打包后的插件：

```bash
pnpm test:mount
DSH_VERSION=0.2.0-rc.2 pnpm test:mount
```

第一条命令使用当前可安装的 `dsh@0.1.7-rc.2`；设置 `DSH_VERSION` 可指定其他版本。
目前 `dsh@0.2.0-rc.2` 依赖 npm 尚未发布的
`dsh-client-ui-settings-account@0.2.0-rc.2`，因此全新安装 CLI 可能失败，需等该依赖发布。

- Host：`src/index.ts` 导出 `name`、`inject`、`apply(ctx)`
- Client：`dsh.client`、`exports["./client"]`、`window.__ModuleLoader__.load`
- 样式：`src/client/styles.css`
- 第三方 React 组件：使用 DSH 注入的 React 运行时。若组件静态导入 `react-dom`、依赖尚未桥接的 React API，或注入全局 CSS，需要先加适配层；参见 `src/client/react-bridge.ts` 与 `tsdown.config.ts`。
- 文案：`src/shared/i18n.ts`

## Roadmap

在 DeepSeek Harness 内审查 agent 每轮改动。变更列表与 hunk Diff 使用 DSH 原生 `workspaceChanges` API。

### 已完成

- `read` 和文件提及的只读预览
- `write` / `edit` 的真实 DSH Diff
- DSH 原生右侧工作区；原生 Sidebar 服务不可用时回退到插件抽屉
- 多文件标签、预览 / 固定、复制路径和桌面快捷键
- 文件内查找 / 跳行，以及对话里的 `:line` / `#Lline` 定位
- 跟随 DSH locale 的中英文界面
- Quick Open（`⌘/Ctrl+P`）和只定位不打开的树搜索
- 工作区文件树：面包屑、键盘导航，以及把路径插入输入框
- 语法高亮、代码折叠，以及磁盘变更后的实时刷新
- 图片预览和渲染后的 Markdown（支持相对图片）
- 代码预览还支持 MATLAB（`.m`）、R、Julia、Lua、C#、Kotlin、Scala、Swift、Dart、XML 和 Python 类型存根（`.pyi`）。Vue / Svelte 使用基础 HTML 高亮；MATLAB 使用 Octave 语法高亮，`.m` 默认按 MATLAB 识别，不支持 `.mat` 和 `.mlx`。
- 变更审阅：会话编辑、未提交、未暂存和已暂存 Git 范围，共用 `+/−` 数据
- 每条捕获写入显示简单操作摘要
- 审查增量更新：保持当前 Tab，大型审查面板仍能流畅响应
- 工作区内容搜索（`⌘/Ctrl+⇧+F`），结果可直接跳到命中行
- 从文件树和预览选区向输入框引用文件、目录和代码范围
- 可编辑的工作区预览，以及外部变更保护
- 审查工具栏中的 Git 分支/状态与会话工具活动信息

### 近期计划

目标是在 DeepSeek Harness 内提供接近 Codex 的审查交互：以 Harness turn changes 为审查基准，
把对话会话、改动文件和 Diff 放在同一个审查流程里。

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
- 可插拔工作区面板（Files / Review，以及后续 DSH 工具）

## License

[MIT](./LICENSE)
