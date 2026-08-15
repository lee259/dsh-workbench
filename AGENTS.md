# AGENTS

This is a DeepSeek Harness workbench plugin. Read [CONTEXT.md](./CONTEXT.md) before changing code.

## Commands

```bash
pnpm install
pnpm test
pnpm start -- /absolute/path/to/target-project
```

CI runs `pnpm test` on `main` and pull requests. Pushing `v*` tags publishes to npm.

Do not use npm. The lockfile is `pnpm-lock.yaml`.

## Rules

- Host plugin contract: export `name`, `inject`, `apply(ctx)` from `src/index.ts`.
- Client bundle contract: `dsh.client` + `exports["./client"]` + `window.__ModuleLoader__.load`.
- Keep file-tool capture on the official session events: `tool/call` + `tool/result`, and `tool/code-dispatch` for code mode.
- Prefer `dsh-tool-fs` `meta.diffs` over reconstructed edits.
- Do not invent a Git HEAD diff when no DSH write was captured.
- UI strings go through `src/i18n.ts`. Do not hardcode user-facing Chinese or English in components.
- Client styles live in `src/client/styles.css`. Do not put CSS in a TypeScript string.
- Tests assert behaviour at module interfaces (`createPathIdentity`, `WriteHistory`, `createWorkspace`, `createFileStore`, `nextOpenTabs`, `diffLines`, `followDshLocale`, `filePathFromOpenHint`, `parseOpenTarget`, `breadcrumbTargets`, `visibleBreadcrumbTargets`, `flattenVisibleRows`, `treeFileOpenMode`, `treeKeyAction`, `rankSearchHits`, `createChangePump`, `startWorkspaceWatch`, `spliceDraftValue`, `shortcutAction`, `editorSpec`, `mountWorkbenchDrawer`). Do not scan source text.

## Docs

- English README: [README.md](./README.md)
- Chinese README: [README.zh-CN.md](./README.zh-CN.md)
- Plugin docs: https://deepseek-harness.github.io/deepseek-harness/develop/basic/
