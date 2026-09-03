# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[中文文档](./README.zh-CN.md) · [Changelog](./CHANGELOG.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

Codex-style file workspace and Git review for [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) Web. Keep the conversation, changed files, and diffs in one place.

## What it does

- Captures DSH `write` / `edit` changes with their original before/after content.
- Switches between session edits, uncommitted, unstaged, and staged Git changes; the tree and diff share the same `+/−` counts.
- Opens files from tool calls, the workspace tree, or search alongside the conversation. Conversation file links reveal the corresponding diff.
- Lets you edit workspace files, copy paths, and insert a selected diff range into the active Harness draft.

![DSH Workbench in DeepSeek Harness Web](./assets/dsh-workbench-demo.png)

```text
read       → source
write/edit → captured DSH diff
```

## Details

The panel is persistent and resizable. It has preview and pinned tabs, Quick Open, tree search, in-file find/go-to-line, image and Markdown previews, and workspace editing with external-change protection. UI language follows DSH.

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
- Change review: session edits plus uncommitted, unstaged, and staged Git scopes, with shared `+/−` counts
- Short operation summaries for each captured write
- Incremental review updates that preserve the active tab and keep large review panels responsive
- Workspace content search (`⌘/Ctrl+⇧+F`) with line-focused results
- Reference files, folders, and selected preview lines in the composer
- Editable workspace previews with external-change protection
- Git branch/status and session tool-activity metadata in the review toolbar

### Next

The target is a Codex-like development experience inside DeepSeek Harness: reuse proven
workspace interactions where they help, while keeping DSH-native write capture and
session review as the workbench's center of gravity.

1. Add terminal and background-task surfaces in small, DSH-native slices.
2. Tighten review-to-conversation feedback, including inline guidance on diffs.
3. Continue refining session-scoped workspace state and review performance.

The existing DSH event capture, `meta.diffs`, session review, operation summaries, and
incremental review updates remain the differentiating foundation.

### Near-term sequence

- Terminal and background task surfaces
- Inline review comments and richer review-to-conversation feedback

### Exploring

- Open-in-editor and reveal-in-folder
- Inline comments on a diff line that send guidance back to the composer
- Native DSH panel controls and layout slots, if the host exposes a usable one
- Pluggable workspace panels (Files / Review, and later DSH tools)

## License

[MIT](./LICENSE)
