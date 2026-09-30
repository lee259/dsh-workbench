# Context

DSH Workbench is a Cordis bundle for DeepSeek Harness Web. It is not Runtime Inspector and does not own the agent loop.

## Source layout

```
src/
├── host/                    # 宿主端（Node.js 环境）
│   ├── index.ts             # 插件入口（apply / inject）
│   ├── http.ts
│   ├── file-preview.ts
│   ├── path-identity.ts
│   ├── workspace.ts
│   ├── change-pump.ts       # 磁盘变更防抖
│   ├── workspace-watch.ts   # 跳过 node_modules 的递归监听
│   ├── write-history.ts
│   └── activity.ts          # 会话工具活动（API）
├── shared/                  # 两端共享
│   ├── types.ts
│   ├── i18n.ts              # zh / en UI copy, following DSH settings
│   ├── line-diff.ts
│   └── jsx.d.ts
├── client/                  # 客户端（browser bundle）
│   ├── entry.ts             # bundle 入口（被 src/client.ts 转导）
│   ├── ui.tsx               # 组装：FileDrawer、FileToolRow 与原生 tab
│   ├── navigation.ts         # 文件 / Review 打开的展示层无关导航
│   ├── presentation.ts       # 旧版抽屉与原生 Sidebar 展示层 adapter
│   ├── store.ts             # FileStore：open / activate / close
│   ├── mount.ts             # mountWorkbenchDrawer：挂载到 document.body
│   ├── react-bridge.ts      # 把宿主 React 交给非 JSX 模块
│   ├── workspace-events.ts  # 磁盘变更 SSE
│   ├── styles.css           # 样式源文件
│   ├── styles.generated.ts  # 自动生成（由 embed-css.mjs 从 styles.css 生成）
│   ├── styles/tokens.css    # 工作台语义 token → DSH host token 映射
│   ├── styles/controls.css  # 共用按钮与焦点状态
│   ├── chrome/              # 侧栏宽度、快捷键、tab 集合、图标
│   ├── explorer/            # 文件树 / Quick Open / 路径插入
│   ├── preview/             # CodeMirror 预览、diff、跳行
│   ├── review/              # Harness turn changes 与 diff 数据读取
│   ├── workbench/           # 侧栏壳：header / body / drawer
│   │   ├── native-*-tab.tsx # 原生 Workspace / File / Review 内容
│   │   └── native-title.tsx # 跟随 locale 的原生 tab 标题
│   ├── workspace-identity.ts
│   └── capture/             # 对话里的文件打开捕获
├── client.ts                # 转导层 → ./client/entry.js（tsdown entry）
├── index.ts                 # 转导层 → ./host/index.js（package.json main）
└── tests/                   # 测试（平行于 src，按模块接口）
```

## Seams

| Module | Interface | Owns |
| --- | --- | --- |
| `createPathIdentity` | `identify(path)` | One display path for relative and absolute inputs under the same root |
| `WriteHistory` | `record(event, sessionId)`, `replay(events, sessionId)`, `get(path, sessionId?)`, `getReviewAfter(sessionId, root, seq)` | Session-scoped file revisions for previews and live Review while a turn is running. Once Harness records `workspace/changes`, the review switches to its native turn diff. |
| `createWorkspace` | `read(path)` | File reads (relative to start cwd, or any absolute path). Uses `createPathIdentity`. |
| `toFilePayload` | disk + revision → preview DTO | Overlay DSH writes on disk content |
| `createFileStore` | `open` / `activate` / `pin` / `close` | Open set + active file + optional preview `line`. `open(..., reveal)` bumps `reveal` so the tree can scroll only for conversation / Quick Open, not tab switches. Tree / Quick Open use a single italic preview tab; double-click or a conversation open pins it. |
| `nextOpenTabs` | open + preview + path + kind → next tabs | Preview replaces the transient tab; kept tabs stay |
| `createLocaleStore` | `t` / `setLocale` / `followDshLocale` | zh / en UI copy, following DSH settings |
| `diffLines` / `countDiffLines` | before / after → rows or `+/−` | Shared line diff used by preview and review |
| `reviewCountsFor` | disk + revision → `+/−` | Review counts after the same disk expansion as the preview; review entries also carry a simple operation summary |
| `editorSpec` / `viewKind` | payload source → view or diff | Write/edit opens CodeMirror merge; everything else is a read-only view |
| `rankSearchHits` / `treeSearchHits` | query → ordered hits | Quick Open ranks basename matches first; tree search locates without opening |
| `visibleBreadcrumbTargets` | path → crumbs without a `/` root | Explorer chrome shows `src / file`, not `/ / src / file` |
| `treeFileOpenMode` | tree / Quick Open → `view` | Browse the workspace file; do not overlay a captured DSH write diff |
| `treeKeyAction` / `consumeTreeEscape` | key + visible rows → move/toggle/open | Home/End, parent/child arrows, Esc closes menu then filter |
| `createChangePump` | `notify` / `subscribe` | Debounced workspace change events; skips dependency directories |
| `startWorkspaceWatch` | root + onChange | Recursive disk watch that never attaches to `node_modules` / `lib` / `.git`. Host `apply` starts it only when a client opens the change SSE; the same SSE also emits captured DSH write paths for agent-following. Native clients keep those paths as background Review updates and do not steal the active host tab. |
| `insertDraftText` / `spliceDraftValue` | draft + path → updated input | Insert a workspace path into the conversation composer |
| `mountWorkbenchDrawer` | React + createRoot + FileDrawer | Mount the sidebar host on `document.body` |
| `createWorkbenchNavigation` | `openFile` / `openReview` / `subscribe` | Route file and review requests without coupling callers to a particular sidebar presentation |
| `createLegacyWorkbenchPresentation` | `mount()` | Existing `document.body` drawer presentation for Harness versions without a native Sidebar |
| `nativeFileAddress` | `sessionId + path ↔ dsh-resource://file/session/...` | Session-scoped DSH file resource identity for a Workbench-owned file tab |
| `createNativeWorkbenchPresentation` | `mount()` | Registers workspace, file, and review bodies in host Tabs; the host owns all tab state and layout |
| `languageForPath` | path → LanguageId or null | Extension / basename → canonical language identifier (for CodeMirror language selection) |

## Host

- `inject`: `sessions`, `webServer`, `workspaceChanges`
- `GET /api/dsh-workbench/file?path=&session=`
- `GET /api/dsh-workbench/review?source=harness&session=` returns completed Harness turn summaries plus a provisional in-progress turn from captured DSH file writes; add `seq` and `index` for a selected file diff (`seq=-1` selects the provisional turn).
- Relative reads resolve from the current workbench root (starts at `process.cwd()`; `POST /api/dsh-workbench/workspace` follows the DSH workspace)
- On apply, `sessions.list()` and `session/created` replay each session log; `session/event` records live events

## Client

- On a host with the right Sidebar API, the host owns the right-column layout, opening/closing, splits, and the only Tab strip. The plugin contributes **File workspace**, Session-scoped `workbench-file` resources, and **Review**. Review shows a central Harness diff and a changed-file rail with the latest changed version of each path across turns; selecting a row loads that file's native hunk diff. If the selected session has no turn changes, the rail falls back to the session workspace's uncommitted files. The legacy drawer keeps its captured-write review as a fallback. Tool rows, tree rows, and captured file references use `nativeFileAddress(path, sessionId)`, so the host deduplicates files through `(kind, contentId)` without merging same-path files across sessions. The native path never renders `WorkbenchHeader` or `useWorkbenchTabs`; those remain only in the old-drawing fallback. The host's own Files and text tabs remain available and are not overridden. Without the host Sidebar, the Session header toggle registers on the host list `conversation.session.header.utilities` (`id: dsh-workbench`, `order: 10`) and the fixed `document.body` drawer preserves the legacy workflow. Mentions with `:line` or `#Lline` jump to that line in the preview. Chrome tokens, sizes, and interaction live in [ui.md](./ui.md). Write/edit uses CodeMirror `unifiedMergeView`; other opens use a read-only CodeMirror view. Folding comes from `@codemirror/language` `foldGutter`. In-file find / go-to-line use `@codemirror/search` and only steal those keys when focus is inside the sidebar. Syntax highlighting via CodeMirror language extensions and `defaultHighlightStyle`.
- A true layout-slot sidebar (`conversation.details.tool`) is not used: it is a `single` slot already occupied by `@deepseek-ai/dsh-client-ui-tool` at the same priority, and registering there throws (`single slot "conversation.details.tool" already has a registration at priority 0`). The body-margin sidebar avoids the host slot conflict entirely.
- Locale follows the DSH settings language via `ctx.locale` / `locale/change`
- Workspace root follows `ctx.sessions` / `ctx.workspaces` and retargets the host via `POST /api/dsh-workbench/workspace`. DSH 0.2 session selection comes from `SessionSummary.retainedBy.mainView`; older `current` snapshots remain supported. Workspace resolution prefers the Session `cwd`, then its `workspaceId`, and accepts both legacy `items` / ordered `byId` projections and current Workspace `items`. File drafts and captured write revisions are partitioned by Session so matching paths do not share state.
- File references use the legacy `conversation.input.for(scope)` face when present and the split `uiSession` input face when supplied by newer Harness clients. The adapter keeps the same `insertReference` seam for both.

## Build

`tsc` emits host modules into `lib/`. `tsdown` then emits `lib/client.js` as a CJS module-loader factory: `window.__ModuleLoader__.load({ id, factory(require) })`. Keep `clean: false` so the host output remains, bundle application code, and leave host-owned React, React DOM, and DSH UI primitives external for the factory's `require`. Client CSS lives in `src/client/styles.css`. `scripts/embed-css.mjs` copies it into the client bundle at build time.

`pnpm test:mount` packs the plugin and mounts it in an isolated
`dsh@0.1.7-rc.2` Web instance by default. Set `DSH_VERSION` to test another Harness
release explicitly. The current client activation gate follows the native
runtime (`slots`, `locale`, `sessions`, and `workspaces`); Sidebar faces are
optional and are discovered through `ctx.get()`, leaving the legacy drawer
available on hosts that have not shipped the native presentation.
