# Changelog

## Unreleased

### Added

- Add a change review panel that lists real DSH writes by session with `+/−` counts.

### Changed

- Align the review rail with the file tree: same head height, row, and hover language.
- Fold the header review chip into the Workbench toggle so one control shows counts when the session has writes.
- Drop the review-rail refresh control; the list already follows session and disk events.
- Remove the status footer, header file refresh, tab Diff badge, and content-copy control.
- Drop the review file filter and the tree expand-all / refresh chrome. The tree still rescans on disk events; folders still toggle from the row.
- Opening the Workbench toggle while the session has writes lands on the review rail.

### Fixes

- Follow the DSH workspace selection so the file tree, tabs, and review list retarget instead of staying on the process start directory.
- Review `+/−` counts follow the expanded preview diff, and the Workbench toggle waits for the current session before showing writes.

## 0.4.0 - 2026-08-16

### Features

- Add previews for workspace images and rendered Markdown files, including relative Markdown images.
- Add a Markdown preview/source mode toggle while keeping CodeMirror for raw Markdown inspection.
- Use `marked` for GFM rendering and DOMPurify for sanitizing rendered HTML.

### Fixes

- Allow images up to 12 MB to pass through the dedicated asset preview route while retaining the text preview limit.

## 0.3.2 - 2026-08-15

### Fixes

- Start the workspace file watcher only when a client subscribes to change events, so `pnpm test` can exit on Linux CI.

## 0.3.1 - 2026-08-15

### Features

- Put the Workbench toggle in the Session header next to Session log.

### Fixes

- Skip `node_modules` and other dependency directories when starting the workspace file watcher, so Linux CI no longer hangs in `pnpm test`.

## 0.3.0 - 2026-08-15

### Features

- Add a workspace file tree with breadcrumbs, hide/show, keyboard navigation, collapse-all, and tree search that locates without opening.
- Add Quick Open (`⌘/Ctrl+P`) and a VS Code-style italic preview tab; double-click pins the file. Conversation writes still open a kept tab.
- Add in-file find / go-to-line, conversation `:line` / `#Lline` targets, and drag or right-click path insert into the composer.
- Add syntax highlighting, folding, and live refresh when workspace files change on disk.

### Documentation

- Refresh the demo screenshot and point the roadmap at a Codex-class file workspace.

## 0.2.4 - 2026-08-14

### Fixes

- Harden the file workspace interaction flow with coverage for panel toggling, resizing, tabs, refresh, copy actions, loading/errors, and read-vs-diff rendering.
- Add accessible labels and state attributes for workspace controls and tabs.

### Tests

- Add component-level regression coverage for real read/edit tool rows and the right-side workspace.

## 0.2.3 - 2026-08-14

### Documentation

- Align installation and local development instructions with the standard DSH plugin workflow.

## 0.2.2 - 2026-08-14

### Fixes

- Align the documented DSH Web startup command with the current CLI syntax.
- Make the one-command starter avoid shell-specific execution on Unix.

## 0.2.1 - 2026-08-14

### Fixes

- Make the one-command starter use `pnpm dlx` by default, matching the documented package-manager workflow.

## 0.2.0 - 2026-08-14

### Features

- Add a persistent, resizable right-side file workspace with multi-file tabs.
- Add read-only previews for reads and captured CodeMirror diffs for writes and edits.
- Add refresh, copy content, copy path, width persistence, and desktop keyboard shortcuts.
- Add a public-safe README demo image and refreshed project metadata.

### Fixes

- Keep read previews out of write/edit diffs, including after a file has been written.
- Capture file links rendered as either buttons or anchors.

## 0.1.0 - 2026-08-14

### Features

- Host file preview and context-file discovery for DeepSeek Harness Web
- Client tool rows for `read` / `write` / `edit`, with a code-preview sidebar (CodeMirror merge diff for writes/edits)
- UI copy follows the DSH settings language
