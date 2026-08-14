# Changelog

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
