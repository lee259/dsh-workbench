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

## Why it is useful

- Keep the conversation and the file you are inspecting visible together.
- See real DSH write/edit changes, with the captured before/after content.
- Read files as source. Diffs come from captured DSH writes, not a Git `HEAD`.
- Open several files, switch tabs, copy paths, and resize the panel. A tree or Quick Open click previews; double-click pins. Conversation writes open a kept tab.
- Shortcuts: `⌥⌘B` toggle, `⌘⇧E` hide or show the file pane, `⌘P` open file, tree search to locate without opening, `⌘F` / `⌘L` find or jump, `⌘W` close, `⌘1`–`⌘9` switch tabs. Drag or right-click to insert a path.
- Review lists captured writes with `+/−`.
- UI follows the DSH language setting.

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
- Third-party React components: use the React runtime injected by DSH. Components that statically import `react-dom`, need unbridged React APIs, or inject global CSS need an adapter; see `src/client/react-bridge.ts` and `tsdown.config.ts`.
- UI strings: `src/shared/i18n.ts`

## Roadmap

Inspect, navigate, and review what the agent touched. Diffs stay on captured DSH writes.

### Done

- Read-only previews for `read` and file mentions
- Captured DSH diffs for `write` / `edit`
- Persistent, resizable right-side workspace
- Multi-file tabs, preview / pin, path copy, and desktop shortcuts
- In-file find / go-to-line, plus conversation `:line` / `#Lline` targets
- Chinese / English UI following DSH locale
- Quick Open (`⌘/Ctrl+P`) and tree search that locates without opening
- Workspace file tree with breadcrumbs, keyboard navigation, and path insert
- Syntax highlighting, folding, and live refresh when the workspace changes on disk
- Image previews and rendered Markdown, including relative images
- Change review: captured DSH writes by session, with `+/−` counts
- Short operation summaries for each captured write
- Follow the agent: open and reveal the latest DSH-written file

### Next

- Workspace content search (`⌘/Ctrl+⇧+F`)
- Attach a file or folder from the tree as composer context
- Associate the Git worktree for the current workspace, without inventing a Git `HEAD` diff

### Exploring

- Open-in-editor and reveal-in-folder
- Inline comments on a diff line that send guidance back to the composer
- Native DSH panel controls and layout slots, if the host exposes a usable one
- Pluggable workspace panels (Files / Review, and later DSH tools)

## License

[MIT](./LICENSE)
