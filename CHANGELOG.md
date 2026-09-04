# Changelog

## 0.14.1 - 2026-09-04

### Fixes

- Restore broad Harness peer ranges so existing profiles do not mix incompatible client packages while the session replay adapter handles both legacy and RC APIs.

## 0.14.0 - 2026-09-04

### Features

- Refine workspace-file and Markdown previews with save feedback, protected refresh, source/preview switching, and a Markdown outline.

### Changed

- Make the file-tree search filter rows directly, and align the tree and preview interaction treatment.

### Compatibility

- Replay existing Harness session logs through the v0.1.2 RC `snapshotEvents()` API while retaining the legacy event-array fallback.

## 0.13.0 - 2026-09-03

### Features

- Show the empty file-open view by default when opening Workbench with no active file.
- Add collapse-all and expand-all controls for review diffs; selecting a collapsed file in the tree expands and reveals it.
- Keep every file in the workspace tree while limiting source previews and Git/session diffs to a safe text and image allowlist. Unsupported files show a clear unavailable-preview hint.

### Changed

- Refresh the README copy and Workbench screenshot.

## 0.12.2 - 2026-09-02

### Performance

- Defer review diff editors outside the viewport and limit concurrent Git diff reads.
- Avoid empty panes for added and deleted files in split diff view.

## 0.12.1 - 2026-09-02

### Features

- Add unified and split review-diff views, with synchronized horizontal scrolling in split view.
- Let selected diff text add a review note directly to the active Harness conversation.

### Changed

- Use host theme tokens for review-diff additions and deletions in light and dark mode, retaining only line fill and change gutters.
- Keep review activity focused on running and failed tasks, and simplify the review toolbar controls.

## 0.12.0 - 2026-09-01

### Features

- Add in-diff selected-code references that insert the chosen file range into the active Harness conversation.
- Allow safe workspace-file editing from the workbench, with an optimistic disk-content check before saving.
- Show session tool activity state and Git branch/status metadata in the review toolbar.

### Fixes

- Update only the changed review file after writes or workspace events, keeping unaffected diff editors mounted and responsive in large reviews.
- Keep review updates scoped to the active tab; direct conversation-file clicks still open and reveal the requested diff.
- Keep the session-review count aligned with the workbench toggle, make review-file reveal use the scroll container's coordinates, and prevent scope switching from unmounting the workbench.

## 0.11.4 - 2026-08-31

### Features

- Add Codex-style review scopes for session edits, uncommitted, unstaged, and staged Git changes, with one shared file and count source across the diff and tree.

### Fixes

- Keep review contents current after Git branch, commit, stash, index, and workspace changes; preserve complete session edits while comparing their latest working-tree version.
- Restore file-path copying in diff file headers and append workspace file references to the active conversation draft through Harness's `@path` flow.
- Debounce repeated review-file reveals while an agent makes many edits.

### Changed

- Align the compact review-scope picker and resizable rails with the Harness file-tree hover and keyboard-focus treatment.

## 0.11.4-alpha.1 - 2026-08-31

### Features

- Add Codex-style review scopes for session edits, uncommitted, unstaged, and staged Git changes, with one shared file and count source across the diff and tree.

### Fixes

- Keep review contents current after Git branch, commit, stash, index, and workspace changes; preserve complete session edits while comparing their latest working-tree version.
- Restore file-path copying in diff file headers and append workspace file references to the active conversation draft through Harness's `@path` flow.
- Debounce repeated review-file reveals while an agent makes many edits.

### Changed

- Align the compact review-scope picker and resizable rails with the Harness file-tree hover and keyboard-focus treatment.

## 0.11.4-alpha.0 - 2026-08-31

### Compatibility

- Target the DeepSeek Harness v0.1.2-alpha.2 client composition, replacing the removed Runtime package with the Session and Workspace Controllers plus the UI Renderer.

### Distribution

- Publish prerelease versions to npm's `next` dist-tag and mark their GitHub Releases as prereleases; stable versions remain on `latest`.

## 0.11.3 - 2026-08-31

### Fixes

- Keep dedicated file tabs stable while replacing their selected file, including rapid tree and conversation-file opens.
- Close tabs by selecting the previous available tab across review, regular file, empty, and dedicated file tab types; close the workbench only when none remain.

## 0.11.2 - 2026-08-31

### Fixes

- Keep a file selected in a dedicated file tab from being replaced by the next tree preview, so switching file tabs always activates the selected file.
- Make sidebar and file-rail resize feedback follow the active separator only, while keeping resize movement in sync with the pointer.

## 0.11.1 - 2026-08-30

### Compatibility

- Follow the DeepSeek Harness controller workspace projection (`byId` + `order`) while retaining the legacy workspace-list shape.
- Resolve file-reference input through the split controller conversation face as well as the legacy composer face.
- Keep the stable client runtime package in the default install path while accepting the newer controller-shaped client data at runtime.

## 0.11.0 - 2026-08-26

### Features

- Rebuild diff review as a Codex-style review tab that lists all changed files in one panel.
- Add independent review and file tabs, including isolated empty file tabs and session-aware state restoration.
- Add collapsible diff sections, path copying, file-tree diff navigation, and targeted diff reveal.
- Align workbench icons with DSH primitives while keeping unsupported glyphs safe and local.

### Fixes

- Keep file and review tabs isolated when switching tabs or sessions.
- Route edit links to the review panel and read links to file tabs without cross-tab reuse.
- Preserve the file tree and review state when agent changes arrive.

## 0.10.0 - 2026-08-24

### Features

- Align diff review with the Codex-style workspace file tree and session state.
- Show only changed files in diff mode with add, delete, and mixed-change icons.

### Fixes

- Reset tabs and diff state when switching sessions, then restore diff mode for sessions with changes.
- Keep the last diff tab closed instead of reopening it automatically.

## 0.9.0 - 2026-08-20

### Features

- Add native DSH file-tree context actions to open or reveal files, reference them in the conversation, and copy their absolute paths.
- Render conversation file references as native composer chips.

### Fixes

- Keep native DSH tooltips anchored to workbench controls.

### Changed

- Load the client bundle through the DSH module-loader factory and reuse host Tooltip primitives.

## 0.8.0 - 2026-08-19

### Features

- Add workspace content search with `⌘/Ctrl+⇧+F`.
- Show matching lines and open results directly at the matching line.

## 0.7.0 - 2026-08-17

### Features

- Show simple operation summaries for captured DSH writes in the review rail.
- Follow agent-written files by opening the latest DSH write and revealing it in the workspace tree.

## 0.6.0 - 2026-08-16

### Features

- Add a focused, keyboard-accessible tooltip for icon-only workbench controls.
- Add a persistent file-pane visibility control and preserve focus when opening or closing Quick Open.

### Changed

- Centralize workbench interaction tokens and shared button states so hover, pressed, selected, and focus treatment follows the DSH host UI.
- Simplify the file tree and review rail transition while keeping hidden controls out of keyboard navigation.
- Move workbench styles to one document-level stylesheet instead of rendering them with each UI entry point.

### Fixes

- Remove the duplicate native clear button from the Quick Open search field.
- Keep tooltip delays from firing after the pointer has left a control.

## 0.5.0 - 2026-08-16

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
