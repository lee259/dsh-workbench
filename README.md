# DSH Workbench

[中文](./README.zh-CN.md)

A standalone [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) workbench plugin. In DSH Web it turns `read` / `write` / `edit` into clickable file rows and opens a right-side panel (read-only view for reads, CodeMirror merge diff for writes/edits).

It is a normal Cordis bundle: the host half watches the session log and serves file reads; the client half mounts onto Web UI slots. It does not include Agent Flow and does not depend on Runtime Inspector.

## Scope

- Host: `src/index.ts` exports `name` / `inject` / `apply(ctx)` as in [Your first plugin](https://deepseek-harness.github.io/deepseek-harness/develop/basic/). `ctx.webServer.register` serves `/api/dsh-workbench/file`. `session/event` handles native `tool/call` + `tool/result` (`dsh-tool-fs` `meta.diffs`) and code-mode `tool/code-dispatch`.
- Client: `dsh.client` plus `exports["./client"]`, loaded by `__ModuleLoader__`. UI mounts on `tool.call.toolview`. Copy is Chinese / English and follows the language in DSH settings.
- Diff: only the captured DSH write before/after. No fake Git HEAD diff.

## Install

```bash
pnpm exec dsh plugin --profile web add @runtime-inspector/dsh-workbench
```

If `dsh` is not installed, replace `pnpm exec dsh` with `npx @deepseek-ai/dsh`.

## Usage

Start DSH from the project you want to inspect (process cwd is the default workspace):

```bash
pnpm exec dsh plugin --profile web add @runtime-inspector/dsh-workbench
pnpm exec dsh --profile web web
```

If `dsh` is not installed, replace `pnpm exec dsh` with `npx @deepseek-ai/dsh`.

Open DSH Web, select a workspace, then open a session. Click a file path: `write` / `edit` opens the Diff, everything else opens a read-only view.

## One-shot start

```bash
pnpm start -- /absolute/path/to/your/project
```

The script builds the plugin, registers it in the target directory, then starts DSH Web. With no path it uses the current directory.

## Release

CI runs `pnpm test` on every push and pull request to `main`.

To publish:

1. Bump `package.json` and add a section to `CHANGELOG.md` / `CHANGELOG.zh-CN.md`.
2. Commit, then tag and push: `git tag v0.1.0 && git push origin main --tags`.
3. The `Publish` workflow publishes `@runtime-inspector/dsh-workbench` to npm and opens a GitHub Release.

GitHub setup:

- Create the `npm` environment.
- Add `NPM_TOKEN` (Automation token with publish rights to `@runtime-inspector`), or configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) for this repository.
