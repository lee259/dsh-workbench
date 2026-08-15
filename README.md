# DSH Workbench

[![npm version](https://img.shields.io/npm/v/dsh-workbench?color=cb3837&logo=npm)](https://www.npmjs.com/package/dsh-workbench)
[![CI](https://github.com/lee259/dsh-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/lee259/dsh-workbench/actions)
[![License](https://img.shields.io/github/license/lee259/dsh-workbench)](./LICENSE)

[中文文档](./README.zh-CN.md) · [Issues](https://github.com/lee259/dsh-workbench/issues) · [npm](https://www.npmjs.com/package/dsh-workbench)

## A file workspace for DeepSeek Harness

DSH Workbench turns file operations in [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart) into a focused, Codex-like file workspace.

Click a file path in a DSH Web session and inspect it in a persistent right-side panel—without losing the conversation context.

![DSH Workbench in DeepSeek Harness Web](./assets/dsh-workbench-demo.png)

The demo shows a real DSH Web session with the conversation on the left and the Workbench showing a captured `package.json` diff, multiple tabs, file search, and a workspace tree on the right. Read-only files stay readable as source; captured writes and edits open as focused diffs.

```text
read       → read-only source view
write/edit → captured DSH diff
```

## Why it is useful

- Keep the conversation and the file you are inspecting visible together.
- See real DSH write/edit changes, with the captured before/after content.
- Read files as normal source code—no fake Git HEAD diff and no noisy activity timeline.
- Open several files, switch between tabs, refresh them, copy content or paths, and resize the panel. A tree or Quick Open click uses one italic preview tab (like VS Code); double-click the file or tab to keep it. Conversation writes still open a kept tab.
- Use desktop-style shortcuts: `⌥⌘B` (or the Session header Workbench control next to Session log) to toggle the panel, `⌘⇧E` (or the tab-bar control) to show or hide the file tree, `⌘P` to open a file, tree search to locate a file without opening it, `⌘F` / `⌘L` to find or jump in the preview, `⌘W` to close a file, and `⌘1`–`⌘9` to switch tabs. Collapse every folder from the tree toolbar, or drag / right-click a file to insert its path into the chat input.
- UI copy follows the DSH language setting (中文 / English).

## Install

### Published package

Install the released plugin into the `web` profile, then restart DSH Web:

```bash
dsh plugin --profile web add dsh-workbench@0.3.2
dsh web
```

If the `dsh` command is not available yet, use the package-manager fallback:

```bash
pnpm dlx @deepseek-ai/dsh plugin --profile web add dsh-workbench@0.3.2
pnpm dlx @deepseek-ai/dsh web
```

### Local development

To run the version currently checked out from GitHub:

```bash
git clone https://github.com/lee259/dsh-workbench.git
cd dsh-workbench
pnpm install
pnpm run build
dsh plugin --profile web add "$(pwd)"
dsh web
```

After changing the plugin, run `pnpm run build` again and restart `dsh web`.

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

The target is a Codex-class file workspace beside the DSH conversation: inspect, navigate, and review what the agent touched. It stays a workspace, not an IDE, and it never invents a Git `HEAD` diff when no DSH write was captured.

### Done

- Read-only previews for `read` and file mentions
- Captured DSH diffs for `write` / `edit`
- Persistent, resizable right-side workspace aligned with the host conversation chrome
- Multi-file tabs with a VS Code-style italic preview tab, refresh, copy, and desktop shortcuts
- In-file find / go-to-line, plus conversation `:line` / `#Lline` targets
- Chinese / English UI following DSH locale
- Quick Open (`⌘/Ctrl+P`) and tree search that locates without opening
- Workspace file tree with breadcrumbs, hide/show, keyboard navigation, collapse-all, and path insert into the composer
- Syntax highlighting, folding, and live refresh when the workspace changes on disk

### Next

- Last-turn / session change review: a file list of captured DSH writes with `+/−`, jump between them (Codex Review’s “Last turn”, from session events rather than Git)
- Diff hunk navigation and a short change summary on each captured write
- Follow the agent: auto-open or reveal files as DSH writes them, and keep the tree in sync
- Workspace content search (`⌘/Ctrl+⇧+F`) in addition to filename Quick Open
- Attach a file or folder from the tree as composer context, not only insert a path
- Richer previews for images and rendered Markdown

### Exploring

- Open-in-editor and reveal-in-folder
- Inline comments on a diff line that send guidance back to the composer
- Native DSH panel controls and layout slots, if the host exposes a usable one
- Pluggable workspace panels (Files / Review, and later DSH tools)

## Release

CI runs `pnpm test` on pushes and pull requests to `main`. Publishing is triggered by pushing a `v*` tag:

```bash
git tag v0.2.0
git push origin main --tags
```

The publish workflow uses npm Trusted Publishing with GitHub Actions provenance. Configure it on npmjs.com for `lee259/dsh-workbench` and `.github/workflows/publish.yml`.

## License

[MIT](./LICENSE)
