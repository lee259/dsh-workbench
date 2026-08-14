# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[中文文档](./README.zh-CN.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

## A file workspace for DeepSeek Harness

DSH Workbench turns file operations in [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) into a focused, Codex-like file workspace.

Click a file path in a DSH Web session and inspect it in a persistent right-side panel—without losing the conversation context.

![DSH Workbench in DeepSeek Harness Web](./assets/dsh-workbench-demo.png)

The demo shows a real DSH Web session with the conversation on the left and the Workbench reading `package.json` on the right. Read-only files stay readable as source; captured writes and edits open as focused diffs.

```text
read       → read-only source view
write/edit → captured DSH diff
```

## Why it is useful

- Keep the conversation and the file you are inspecting visible together.
- See real DSH write/edit changes, with the captured before/after content.
- Read files as normal source code—no fake Git HEAD diff and no noisy activity timeline.
- Open several files, switch between tabs, refresh them, copy content or paths, and resize the panel.
- Use desktop-style shortcuts: `⌥⌘B` to toggle the panel, `⌘W` to close a file, and `⌘1`–`⌘9` to switch tabs.
- UI copy follows the DSH language setting (中文 / English).

## Install

```bash
pnpm exec dsh plugin --profile web add dsh-workbench
```

Then start DSH Web from the project you want to inspect:

```bash
pnpm exec dsh web
```

If the DSH CLI is not available yet:

```bash
pnpm dlx @deepseek-ai/dsh plugin --profile web add dsh-workbench
pnpm dlx @deepseek-ai/dsh web
```

## One-command local start

For local development or a quick test:

```bash
pnpm start -- /absolute/path/to/your/project
```

This builds the plugin, registers the local bundle in the target project, and starts DSH Web. Without a path, it uses the current directory.

## How previews work

| DSH operation | Workbench view |
| --- | --- |
| `read` | Read-only CodeMirror source view |
| `write` | Diff against the captured write baseline |
| `edit` | Diff against the captured edit baseline |
| Workspace file mention | Read-only source view |

The host listens to official session events (`tool/call`, `tool/result`, and `tool/code-dispatch`). When `dsh-tool-fs` provides `meta.diffs`, those diffs are preferred. The plugin never invents a Git `HEAD` diff when no DSH write was captured.

## Development

```bash
pnpm install
pnpm test
pnpm start -- /absolute/path/to/your/project
```

The plugin follows the standard Cordis contract:

- Host: `name`, `inject`, `apply(ctx)` from `src/index.ts`
- Client: `dsh.client`, `exports["./client"]`, and `window.__ModuleLoader__.load`
- Styles: `src/client/styles.css`
- UI strings: `src/shared/i18n.ts`

## Roadmap

### Done

- Read-only previews for `read` and file mentions
- Captured DSH diffs for `write` / `edit`
- Persistent, resizable right-side workspace
- Multi-file tabs, refresh, copy actions, and desktop shortcuts
- Chinese / English UI following DSH locale

### Next

- Browser-level interaction tests for the sidebar and real DSH tool rows
- Better integration with native DSH panel controls and layout slots
- File search and quick navigation inside the workspace
- More precise diff navigation and change summaries

### Exploring

- Optional lightweight file tree for the active workspace
- Open-in-editor and reveal-in-folder actions
- Pluggable workspace panels for future DSH tools

## Release

CI runs `pnpm test` on pushes and pull requests to `main`. Publishing is triggered by pushing a `v*` tag:

```bash
git tag v0.2.0
git push origin main --tags
```

The publish workflow uses npm Trusted Publishing with GitHub Actions provenance. Configure it on npmjs.com for `lee259/dsh-workbench` and `.github/workflows/publish.yml`.

## License

[MIT](./LICENSE)
