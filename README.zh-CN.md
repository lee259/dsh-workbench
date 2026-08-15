# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[English](./README.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

## 给 DeepSeek Harness 的文件工作区

DSH Workbench 把 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) 里的文件操作，变成一个更接近 Codex 的文件工作区。

在 DSH Web 会话里点击文件路径，右侧就会打开常驻工作区；对话上下文保留在左侧，文件查看和变更检查集中在右侧。

![DSH Workbench 在 DeepSeek Harness Web 中运行](./assets/dsh-workbench-demo.png)

这张演示图展示了真实 DSH Web 会话的工作流：左侧保留对话，右侧 Workbench 展示捕获到的 `package.json` Diff、多文件标签、文件搜索和工作区文件树。读取内容保持普通源码预览，真实捕获到的写入和编辑则进入聚焦的 Diff 视图。

```text
read       → 普通只读源码预览
write/edit → DSH 实际捕获到的 diff
```

## 你会得到什么

- 对话和正在查看的文件同时可见，不需要来回切页面。
- 只展示真实 DSH write/edit 的前后变化，不伪造 Git HEAD diff。
- `read` 是普通源码预览，不会被历史写入误判成 diff。
- 支持多文件标签、文件切换、刷新、复制内容、复制路径和拖拽调整宽度。从文件树或 Quick Open 点开的是斜体预览标签（和 VS Code 一样，后点的会替换前一个）；双击文件或标签即可固定。对话里的写入仍会打开固定标签。
- 支持桌面式快捷键：`⌥⌘B` 展开/收起，`⌘⇧E`（或标签栏的面板按钮）显隐文件树，`⌘P` 打开文件，树搜索只定位不打开，`⌘F` / `⌘L` 在预览里查找或跳行，`⌘W` 关闭当前文件，`⌘1`–`⌘9` 切换标签。树工具栏可一键折叠全部文件夹；也可拖拽或右键把路径插入对话输入框。
- 界面跟随 DSH 设置，在中文和英文之间自动切换。

## 安装

### 安装已发布版本

把已发布的插件安装到 `web` profile，然后重启 DSH Web：

```bash
dsh plugin --profile web add dsh-workbench@0.2.4
dsh web
```

如果本机还没有 `dsh` 命令，可以使用包管理器临时运行：

```bash
pnpm dlx @deepseek-ai/dsh plugin --profile web add dsh-workbench@0.2.4
pnpm dlx @deepseek-ai/dsh web
```

### 本地开发

如果要运行 GitHub 当前检出的版本：

```bash
git clone https://github.com/lee259/dsh-workbench.git
cd dsh-workbench
pnpm install
pnpm run build
dsh plugin --profile web add "$(pwd)"
dsh web
```

修改插件后重新执行 `pnpm run build`，然后重启 `dsh web`。

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

目标是做到接近 Codex 的文件工作区体验：在对话旁边查看、定位和审阅 agent 改过的文件。这里始终是工作区，不是完整 IDE；没有捕获到 DSH 写入时，也不会伪造 Git `HEAD` diff。

### 已完成

- `read` 和文件提及的只读源码预览
- `write` / `edit` 的真实 DSH Diff
- 常驻、可调整宽度的右侧文件工作区，顶栏与宿主对话头对齐
- 多文件标签（VS Code 式斜体预览标签）、刷新、复制和桌面快捷键
- 文件内查找 / 跳行，以及对话里的 `:line` / `#Lline` 定位
- 跟随 DSH locale 的中英文界面
- Quick Open（`⌘/Ctrl+P`）和只定位不打开的树搜索
- 工作区文件树：面包屑、显隐、键盘导航、一键折叠，以及把路径插入输入框
- 语法高亮、代码折叠，以及磁盘变更后的实时刷新

### 近期计划

- 本轮 / 本会话变更审阅：捕获到的 DSH 写入文件列表，带 `+/−`，可在文件间跳转（对标 Codex Review 的 Last turn，数据来自会话事件而不是 Git）
- Diff hunk 导航，以及每条捕获写入的简短变更摘要
- 跟随 agent：DSH 写入时自动打开或在树中揭示文件，并保持文件树同步
- 工作区内容搜索（`⌘/Ctrl+⇧+F`），补齐现在只有文件名 Quick Open 的缺口
- 从文件树把文件或目录挂到输入框当上下文，而不只是插入路径
- 图片和渲染后的 Markdown 预览

### 探索方向

- 在编辑器中打开、在文件夹中显示
- 在 Diff 行上写批注并送回对话输入框
- 在宿主提供可用 slot 的前提下，接入 DSH 原生面板控制和布局
- 可插拔工作区面板（Files / Review，以及后续 DSH 工具）

## 发版

CI 会在 `main` 的 push 和 Pull Request 上执行 `pnpm test`。推送 `v*` tag 会触发发布：

```bash
git tag v0.2.0
git push origin main --tags
```

发布工作流使用 GitHub Actions 的 npm Trusted Publishing 和 provenance。请在 npmjs.com 为 `lee259/dsh-workbench` 配置 `.github/workflows/publish.yml`。

## License

[MIT](./LICENSE)
