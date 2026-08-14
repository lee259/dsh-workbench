# DSH Workbench

[English](./README.md)

独立的 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) 工作台插件。在 DSH Web 里把 `read` / `write` / `edit` 做成可点的文件行，右侧打开面板（读取只看文件，写入/编辑用 CodeMirror merge diff）。

它是一个标准 Cordis 组合包：Host 半边监听会话日志、提供文件读取；Client 半边挂到 Web UI 的 slot 上。不含 Agent Flow，也不依赖 Runtime Inspector。

## 实现边界

- Host：`src/index.ts` 导出 `name` / `inject` / `apply(ctx)`，按 [第一个插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) 接入。`ctx.webServer.register` 提供 `/api/dsh-workbench/file`；`session/event` 同时吃 native 的 `tool/call` + `tool/result`（`dsh-tool-fs` 的 `meta.diffs`）和 code mode 的 `tool/code-dispatch`。
- Client：`package.json` 的 `dsh.client` + `exports["./client"]`，由 `__ModuleLoader__` 加载。用 `tool.call.toolview` 挂 UI。界面为中 / 英，跟随 DSH 设置里的语言。
- Diff：只对比本轮捕获到的 DSH 写入前后。没有写入记录时不伪造 Git HEAD。

## 安装

```bash
pnpm exec dsh plugin --profile web add dsh-workbench
```

没有全局 / 本地 `dsh` 时，把 `pnpm exec dsh` 换成 `npx @deepseek-ai/dsh`。

## 使用

在你要查看的项目目录启动 DSH（进程 cwd 就是默认工作区）：

```bash
pnpm exec dsh plugin --profile web add dsh-workbench
pnpm exec dsh --profile web web
```

没有全局 / 本地 `dsh` 时，把 `pnpm exec dsh` 换成 `npx @deepseek-ai/dsh`。

打开 DSH Web，选中工作区后进入会话。点击文件路径：`write` / `edit` 直接出 Diff，其余只读查看。

## 一键启动

```bash
pnpm start -- /绝对路径/你的项目
```

脚本会先构建插件，再在目标目录注册并启动 DSH Web。没传路径时用当前目录。

## 发版

CI 会在 `main` 的 push / PR 上跑 `pnpm test`。

发包步骤：

1. 改 `package.json` 版本，并在 `CHANGELOG.md` / `CHANGELOG.zh-CN.md` 补一节。
2. 提交后打 tag 推送：`git tag v0.1.0 && git push origin main --tags`。
3. `Publish` 工作流会把 `dsh-workbench` 发到 npm，并创建 GitHub Release。

GitHub 需要：

- 给这个仓库配置 [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)：在 npmjs.com 上进入 `dsh-workbench` → Settings → Trusted Publishing，添加 `lee259/dsh-workbench`，workflow 路径填 `.github/workflows/publish.yml`。
