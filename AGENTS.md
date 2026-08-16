# AGENTS

This is a DeepSeek Harness workbench plugin. Read [docs/context.md](./docs/context.md) and [docs/ui.md](./docs/ui.md) before changing code.

## Commands

```bash
pnpm install
pnpm test
pnpm start -- /absolute/path/to/target-project
```

CI runs `pnpm test` on `main` and pull requests. Pushing `v*` tags publishes to npm.

Use pnpm. The lockfile is `pnpm-lock.yaml`.

## Scope

Treat the current request as the PRD for this change.

1. Implement what the request names. Work that is only foreseeable stays out until a later request asks for it.
2. Use the smallest interaction and the smallest change that complete that job.

This is [YAGNI](https://ronjeffries.com/xprog/articles/practices/pracnotneed/) and [do the simplest thing that could possibly work](https://ronjeffries.com/xprog/articles/practices/pracsimplest/) (Extreme Programming), plus GOV.UK’s [Do less](https://www.gov.uk/guidance/government-design-principles): stay on the story in hand, and concentrate on the irreducible core.

## Rules

- Host plugin contract: export `name`, `inject`, `apply(ctx)` from `src/index.ts`.
- Client bundle contract: `dsh.client` + `exports["./client"]` + `window.__ModuleLoader__.load`.
- Keep file-tool capture on the official session events: `tool/call` + `tool/result`, and `tool/code-dispatch` for code mode.
- Prefer `dsh-tool-fs` `meta.diffs` over reconstructed edits. Diffs come from captured DSH writes.
- UI strings go through `src/shared/i18n.ts`.
- Client styles live in `src/client/styles/*.css`.
- Follow [docs/ui.md](./docs/ui.md) for tokens, sizes, and interaction. Follow [docs/style.md](./docs/style.md) for TypeScript, TSX, CSS, and React.
- Tests assert behaviour at module interfaces (`createPathIdentity`, `WriteHistory`, `createWorkspace`, `createFileStore`, `nextOpenTabs`, `diffLines`, `countDiffLines`, `reviewCountsFor`, `followDshLocale`, `workspacePathFromDsh`, `followDshWorkspace`, `followDshSession`, `workbenchShouldReset`, `retargetWorkbenchRoot`, `filePathFromOpenHint`, `parseOpenTarget`, `breadcrumbTargets`, `visibleBreadcrumbTargets`, `flattenVisibleRows`, `treeFileOpenMode`, `treeKeyAction`, `rankSearchHits`, `createChangePump`, `startWorkspaceWatch`, `spliceDraftValue`, `shortcutAction`, `editorSpec`, `mountWorkbenchDrawer`).

## Docs

- [docs/context.md](./docs/context.md) — project map
- [docs/ui.md](./docs/ui.md) — tokens and interaction
- [docs/style.md](./docs/style.md) — TypeScript, TSX, CSS, and React
- [README.md](./README.md) / [README.zh-CN.md](./README.zh-CN.md)
- Plugin docs: https://deepseek-harness.github.io/deepseek-harness/develop/basic/
