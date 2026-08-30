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
│   ├── ui.tsx               # 组装：FileDrawer、FileToolRow
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
│   ├── review/              # 当前会话的 DSH 写入列表
│   ├── workbench/           # 侧栏壳：header / body / drawer
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
| `WriteHistory` | `record(event, sessionId)`, `replay(events, sessionId)`, `get(path)` | File revisions from the session log. `replay` rebuilds from an existing log; `record` follows live events. An edit without a prior read still records `dsh-write` from `old_string` / `new_string`. **Note:** real DSH `tool/result` has no top-level `callId` — the call identity lives in `message.content[0].toolCallId` (ToolResultBlock). `recordResult` extracts it via `resultBlockOf()`. |
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
| `startWorkspaceWatch` | root + onChange | Recursive disk watch that never attaches to `node_modules` / `lib` / `.git`. Host `apply` starts it only when a client opens the change SSE; the same SSE also emits captured DSH write paths for agent-following. |
| `insertDraftText` / `spliceDraftValue` | draft + path → updated input | Insert a workspace path into the conversation composer |
| `mountWorkbenchDrawer` | React + createRoot + FileDrawer | Mount the sidebar host on `document.body` |
| `languageForPath` | path → LanguageId or null | Extension / basename → canonical language identifier (for CodeMirror language selection) |

## Host

- `inject`: `sessions`, `webServer`
- `GET /api/dsh-workbench/file?path=`
- Relative reads resolve from the current workbench root (starts at `process.cwd()`; `POST /api/dsh-workbench/workspace` follows the DSH workspace)
- On apply, `sessions.list()` and `session/created` replay each session log; `session/event` records live events

## Client

- Slots: `tool.call.toolview` for `read` / `write` / `edit` at `priority: -1` (lowest renders; shadows the shipped rows at 0). The Session header toggle registers on the host list `conversation.session.header.utilities` (`id: dsh-workbench`, `order: 10`) so it sits with Session log; do not take the single `conversation.session.header` seat. Path clicks on tool rows, produced-file chips, and markdown file mentions open the workbench sidebar, not the host default app. Mentions with `:line` or `#Lline` jump to that line in the preview. The sidebar mounts on `document.body` via `react-dom/client` as a fixed right-side panel (no backdrop); opening it toggles `#root.dsh-wb-sidebar-open`, which reserves the right margin so the conversation reflows. DSH Tooltip bubbles render beside their triggers, so the open sidebar must not retain a CSS transform. The workspace file tree sits to the right of the preview, starts open, and can be hidden with `⌘⇧E` or the tab-bar toggle. Tree search locates a row without opening it; `⌘P` opens a file. Chrome tokens, sizes, and interaction live in [ui.md](./ui.md). Write/edit uses CodeMirror `unifiedMergeView`; other opens use a read-only CodeMirror view. Folding comes from `@codemirror/language` `foldGutter`. In-file find / go-to-line use `@codemirror/search` and only steal those keys when focus is inside the sidebar. Syntax highlighting via CodeMirror language extensions and `defaultHighlightStyle`.
- A true layout-slot sidebar (`conversation.details.tool`) is not used: it is a `single` slot already occupied by `@deepseek-ai/dsh-client-ui-tool` at the same priority, and registering there throws (`single slot "conversation.details.tool" already has a registration at priority 0`). The body-margin sidebar avoids the host slot conflict entirely.
- Locale follows the DSH settings language via `ctx.locale` / `locale/change`
- Workspace root follows `ctx.sessions` / `ctx.workspaces` and retargets the host via `POST /api/dsh-workbench/workspace`. The identity adapter accepts both the legacy `items` workspace list and the controller's ordered `byId` projection. Switching workspace resets open tabs; review follows the current session without clearing the editor.
- File references use the legacy `conversation.input.for(scope)` face when present and the split `uiSession` input face when supplied by newer Harness clients. The adapter keeps the same `insertReference` seam for both.

## Build

`tsc` emits host modules into `lib/`. `tsdown` then emits `lib/client.js` as a CJS module-loader factory: `window.__ModuleLoader__.load({ id, factory(require) })`. Keep `clean: false` so the host output remains, bundle application code, and leave host-owned React, React DOM, and DSH UI primitives external for the factory's `require`. Client CSS lives in `src/client/styles.css`. `scripts/embed-css.mjs` copies it into the client bundle at build time.
