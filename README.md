# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[中文文档](./README.zh-CN.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

Right-side file workspace for [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart). Click a path in a DSH Web session to read or diff it beside the conversation.

![DSH Workbench in DeepSeek Harness Web](./assets/dsh-workbench-demo.png)

```text
read       → source
write/edit → captured DSH diff
```

- Tabs, resize, and path copy
- Click a tree or Quick Open row to preview; double-click to pin
- `⌥⌘B` toggle · `⌘⇧E` tree / review · `⌘P` open file · `⌘F` / `⌘L` find / go to line · `⌘W` close · `⌘1`–`⌘9` tabs
- Tree search locates without opening; drag or right-click inserts a path
- Review lists captured writes with `+/−`
- UI follows the DSH language setting

## Install

```bash
dsh plugin --profile web add dsh-workbench
dsh web
```

If `dsh` is not on your PATH:

```bash
pnpm dlx @deepseek-ai/dsh plugin --profile web add dsh-workbench
pnpm dlx @deepseek-ai/dsh web
```

Local checkout:

```bash
git clone https://github.com/lee259/dsh-workbench.git
cd dsh-workbench
pnpm install
pnpm run build
dsh plugin --profile web add "$(pwd)"
dsh web
```

Rebuild and restart `dsh web` after plugin changes.

## Local start

```bash
pnpm start -- /absolute/path/to/your/project
```

Builds the plugin, registers it on the target project, and starts DSH Web. Without a path, uses the current directory.

## Previews

| DSH operation | View |
| --- | --- |
| `read` | Source; images and Markdown render |
| `write` / `edit` | Captured DSH diff |
| File mention | Source; images and Markdown render |

Host listens to `tool/call`, `tool/result`, and `tool/code-dispatch`. Prefers `dsh-tool-fs` `meta.diffs`.

## Development

```bash
pnpm install
pnpm test
pnpm start -- /absolute/path/to/your/project
```

- Host: `name`, `inject`, `apply(ctx)` from `src/index.ts`
- Client: `dsh.client`, `exports["./client"]`, `window.__ModuleLoader__.load`
- Styles: `src/client/styles.css`
- UI strings: `src/shared/i18n.ts`

## License

[MIT](./LICENSE)
