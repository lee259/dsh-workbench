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

- 多标签、调宽度、复制路径
- 文件树或 Quick Open 单击预览，双击固定
- `⌥⌘B` 开关 · `⌘⇧E` 文件树 / 审阅 · `⌘P` 打开文件 · `⌘F` / `⌘L` 查找 / 跳行 · `⌘W` 关闭 · `⌘1`–`⌘9` 切标签
- 树搜索只定位不打开；拖拽或右键可插入路径
- 审阅列出捕获到的写入和 `+/−`
- 界面跟随 DSH 语言设置

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
- 文案：`src/shared/i18n.ts`

## License

[MIT](./LICENSE)
