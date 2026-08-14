# CONTEXT

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
│   └── write-history.ts
├── shared/                  # 两端共享
│   ├── types.ts
│   ├── i18n.ts              # zh / en UI copy, following DSH settings
│   └── jsx.d.ts
├── client/                  # 客户端（browser bundle）
│   ├── entry.ts             # bundle 入口（被 src/client.ts 转导）
│   ├── ui.tsx               # 组件：FileDrawer、FileToolRow
│   ├── store.ts             # FileStore：open / activate / close
│   ├── mount.ts             # mountWorkbenchDrawer：挂载到 document.body
│   ├── code-mirror.ts       # CodeMirror 编辑器集成
│   ├── editor-spec.ts       # view/diff 判断 + CodeMirror 语言映射
│   ├── lang-map.ts          # 扩展名 → 语言标识（editor-spec 使用）
│   ├── line-diff.ts         # diffLines：LCS 行 diff
│   ├── tool-path.ts         # 从 tool call block 提取文件路径
│   ├── file-open-capture.ts # 捕获文件打开事件
│   ├── styles.css           # 样式源文件
│   └── styles.generated.ts  # 自动生成（由 embed-css.mjs 从 styles.css 生成）
├── client.ts                # 转导层 → ./client/entry.js（tsdown entry）
├── index.ts                 # 转导层 → ./host/index.js（package.json main）
└── tests/                   # 测试（平行于 src）
```

## Seams

| Module | Interface | Owns |
| --- | --- | --- |
| `createPathIdentity` | `identify(path)` | One display path for relative and absolute inputs under the same root |
| `WriteHistory` | `record(event, sessionId)`, `replay(events, sessionId)`, `get(path)` | File revisions from the session log. `replay` rebuilds from an existing log; `record` follows live events. An edit without a prior read still records `dsh-write` from `old_string` / `new_string`. **Note:** real DSH `tool/result` has no top-level `callId` — the call identity lives in `message.content[0].toolCallId` (ToolResultBlock). `recordResult` extracts it via `resultBlockOf()`. |
| `createWorkspace` | `read(path)` | File reads (relative to start cwd, or any absolute path). Uses `createPathIdentity`. |
| `toFilePayload` | disk + revision → preview DTO | Overlay DSH writes on disk content |
| `createFileStore` | `open` / `activate` / `close` | Open set + active file. `path` is the active path so the sidebar can stay single-file. |
| `createLocaleStore` | `t` / `setLocale` / `followDshLocale` | zh / en UI copy, following DSH settings |
| `diffLines` | before / after → rows | Line diff helper |
| `editorSpec` / `viewKind` | payload source → view or diff | Write/edit opens CodeMirror merge; everything else is a read-only view |
| `mountWorkbenchDrawer` | React + createRoot + FileDrawer | Mount the sidebar host on `document.body` |
| `languageForPath` | path → LanguageId or null | Extension / basename → canonical language identifier (for CodeMirror language selection) |

## Host

- `inject`: `sessions`, `webServer`
- `GET /api/dsh-workbench/file?path=`
- Relative reads resolve from `process.cwd()`; absolute session paths are read as-is
- On apply, `sessions.list()` and `session/created` replay each session log; `session/event` records live events

## Client

- Slots: `tool.call.toolview` for `read` / `write` / `edit` at `priority: -1` (lowest renders; shadows the shipped rows at 0). Path clicks on tool rows, produced-file chips, and markdown file mentions open the workbench sidebar, not the host default app. The sidebar mounts on `document.body` via `react-dom/client` as a fixed right-side panel (no backdrop); opening it toggles `body.dsh-wb-sidebar-open` which reserves the right margin so the host conversation reflows like a Codex side panel. Write/edit uses CodeMirror `unifiedMergeView`; other opens use a read-only CodeMirror view. Folding comes from `@codemirror/language` `foldGutter`. Syntax highlighting via CodeMirror language extensions with GitHub-like `defaultHighlightStyle`.
- A true layout-slot sidebar (`conversation.details.tool`) is not used: it is a `single` slot already occupied by `@deepseek-ai/dsh-client-ui-tool` at the same priority, and registering there throws (`single slot "conversation.details.tool" already has a registration at priority 0`). The body-margin sidebar avoids the host slot conflict entirely.
- Locale follows the DSH settings language via `ctx.locale` / `locale/change`

## Build

`tsc` emits host modules into `lib/`. `tsdown` then emits an IIFE as `lib/client.iife.js`, which the build renames to `lib/client.js`. `tsdown` must run with `clean: false`, `format: iife`, and inline client dependencies — DSH loads the file as a classic script, so leftover `import` statements or top-level `const top` (and other window globals) prevent `__ModuleLoader__.load` from running. Client CSS lives in `src/client/styles.css`. `scripts/embed-css.mjs` copies it into the client bundle at build time.
