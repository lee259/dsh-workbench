# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[English](./README.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

## 给 DeepSeek Harness 的文件工作区

DSH Workbench 把 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) 里的文件操作，变成一个更接近 Codex 的文件工作区。

在 DSH Web 会话里点击文件路径，右侧就会打开常驻工作区；对话上下文保留在左侧，文件查看和变更检查集中在右侧。

![DSH Workbench 在 DeepSeek Harness Web 中运行](./assets/dsh-workbench-demo.png)

这张实机图展示了真实的 DSH Web 会话：左侧保留对话，右侧 Workbench 正在查看 `package.json`。读取内容保持普通源码预览，真实捕获到的写入和编辑则进入聚焦的 Diff 视图。

```text
read       → 普通只读源码预览
write/edit → DSH 实际捕获到的 diff
```

## 你会得到什么

- 对话和正在查看的文件同时可见，不需要来回切页面。
- 只展示真实 DSH write/edit 的前后变化，不伪造 Git HEAD diff。
- `read` 是普通源码预览，不会被历史写入误判成 diff。
- 支持多文件标签、文件切换、刷新、复制内容、复制路径和拖拽调整宽度。
- 支持桌面式快捷键：`⌥⌘B` 展开/收起，`⌘W` 关闭当前文件，`⌘1`–`⌘9` 切换标签。
- 界面跟随 DSH 设置，在中文和英文之间自动切换。

## 安装

```bash
pnpm exec dsh plugin --profile web add dsh-workbench
```

然后从要查看的项目目录启动 DSH Web：

```bash
pnpm exec dsh web
```

如果还没有可用的 DSH CLI：

```bash
pnpm dlx @deepseek-ai/dsh plugin --profile web add dsh-workbench
pnpm dlx @deepseek-ai/dsh web
```

## 一键本地启动

开发或快速体验时可以直接运行：

```bash
pnpm start -- /绝对路径/你的项目
```

脚本会构建插件、在目标项目注册本地 bundle，然后启动 DSH Web。不传路径时使用当前目录。

## 预览规则

| DSH 操作 | 工作区展示 |
| --- | --- |
| `read` | 只读 CodeMirror 源码视图 |
| `write` | 基于 DSH 捕获基线的 Diff |
| `edit` | 基于 DSH 捕获基线的 Diff |
| 工作区文件提及 | 只读源码视图 |

Host 监听官方会话事件：`tool/call`、`tool/result` 和 `tool/code-dispatch`。如果 `dsh-tool-fs` 提供了 `meta.diffs`，插件会优先使用它。没有捕获到 DSH 写入时，不会凭空生成 Git `HEAD` diff。

## 开发

```bash
pnpm install
pnpm test
pnpm start -- /绝对路径/你的项目
```

插件遵循标准 Cordis 合约：

- Host：`src/index.ts` 导出 `name`、`inject`、`apply(ctx)`
- Client：`dsh.client`、`exports["./client"]` 和 `window.__ModuleLoader__.load`
- 样式：`src/client/styles.css`
- 界面文案：`src/shared/i18n.ts`

## Roadmap

### 已完成

- `read` 和文件提及的只读源码预览
- `write` / `edit` 的真实 DSH Diff
- 常驻、可调整宽度的右侧文件工作区
- 多文件标签、刷新、复制操作和桌面快捷键
- 跟随 DSH locale 的中英文界面

### 近期计划

- 为侧边栏和真实 DSH 工具行补充浏览器级交互测试
- 更好地接入 DSH 原生面板控制和布局 slot
- 在工作区内提供文件搜索和快速跳转
- 更精细的 Diff 导航和变更摘要

### 探索方向

- 可选的当前工作区轻量文件树
- 在编辑器中打开、在文件夹中显示
- 为未来 DSH 工具提供可插拔工作区面板

## 发版

CI 会在 `main` 的 push 和 Pull Request 上执行 `pnpm test`。推送 `v*` tag 会触发发布：

```bash
git tag v0.2.0
git push origin main --tags
```

发布工作流使用 GitHub Actions 的 npm Trusted Publishing 和 provenance。请在 npmjs.com 为 `lee259/dsh-workbench` 配置 `.github/workflows/publish.yml`。

## License

[MIT](./LICENSE)
