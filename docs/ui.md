# UI

Review is a DeepSeek Harness side panel. It should look like the host, not a second product.

## Goal

A quiet, Codex-inspired review surface for code changes made during a DSH turn. Use Harness-native summaries and diffs for completed turns, and show captured DSH file writes in an in-progress turn. Keep the host conversation and session navigation in charge of the surrounding app.

Complete the named job with the fewest moves. If a click on an existing row does the work, that is the interaction. Extra chrome arrives when a later request names it.

Review opens to a centered Diff with a changed-file list beside it. Each path appears once, using its latest Harness change. Selecting a file loads its Harness diff in the main area. If the Session has no turn changes, show the current workspace's uncommitted files.

## Tokens

Use host tokens for all workbench surfaces and controls. The CodeMirror syntax
palette is the deliberate exception: it uses One Light / One Dark hues while
the editor surface, foreground, cursor, and selection still use host tokens.

| Role | Token |
| --- | --- |
| Text | `--dsw-alias-label-primary` / `secondary` / `tertiary` |
| Fill | `--dsw-alias-bg-layer-1`, `--dsw-specific-sidebar-fill` |
| Border | `--dsw-alias-border-l1` / `l2` |
| Hover | `--dsw-alias-interactive-bg-hover-solid`, `--dsw-specific-sidebar-nav-item-hover` |
| Selected | `--dsw-specific-sidebar-nav-item-active` |
| Focus | `--dsw-alias-state-business-primary` |
| Add / delete | `--dsw-alias-state-success-primary` / `--dsw-alias-state-error-primary` |

Type inherits the host font. Body 12px, meta 11px.

### Interactive controls

`src/client/styles/tokens.css` is the workbench's design-system adapter. It
defines only `--dsh-wb-*` semantic tokens and maps them to host tokens; do not
use raw host interaction tokens in component styles.

| Role | Local token | Host mapping |
| --- | --- | --- |
| Button hover | `--dsh-wb-button-hover-fill` | `--dsw-alias-interactive-bg-hover-solid` |
| Field fill | `--dsh-wb-field-fill` | `--dsw-alias-interactive-bg-hover-solid` |
| Button pressed | `--dsh-wb-button-active-fill` | `--dsw-alias-button-ghost-active-fill` |
| Navigation hover | `--dsh-wb-nav-item-hover-fill` | `--dsw-specific-sidebar-nav-item-hover` |
| Navigation selected | `--dsh-wb-nav-item-active-fill` | `--dsw-specific-sidebar-nav-item-active` |
| Keyboard focus | `--dsh-wb-focus-ring` | `--dsw-alias-state-business-primary` |
| Accent text / fill | `--dsh-wb-accent-label` / `--dsh-wb-accent-fill` | `--dsw-alias-state-business-primary` / `tertiary` |
| Conversation file link | `--dsh-wb-link-label` | `--dsw-alias-label-link`, with an accent fallback for older DSH versions |
| Floating surface text | `--dsh-wb-floating-surface-label` | `--dsw-alias-label-primary` |
| Code editor | `--dsh-wb-code-*` | One Light / One Dark syntax palette; text surface remains host-token driven |

Hover communicates availability; it never substitutes for selected state or
keyboard focus. Shared button behavior belongs in `styles/controls.css`;
surface styles retain only layout and size.

Tooltips are reserved for icon-only controls and the workbench entry with its
shortcut; visible labels, file rows, breadcrumbs, and menu items do not repeat
their text in a tooltip. Tooltips are the one deliberate color exception: use
black fill, white text, 8px radius, and `8px 10px` padding. They open after
400ms on pointer hover and immediately on keyboard focus.

## Scale

| Role | Size |
| --- | --- |
| Rail search / row | 26–28px tall, 4px radius |
| Icon button | 26px in rails, 30px in the tab bar |
| Tab bar / pathbar | 40px / 35px |
| Right rail | 280px, min 210px |
| Space | 2 / 4 / 6 / 8 / 10 / 12 |
| Motion | 120ms ease-out; honor `prefers-reduced-motion` |

## Interaction

- One primary action per surface: click a row to open, double-click to pin.
- Hover uses nav-item-hover. Selected uses nav-item-active.
- Keyboard: `focus-visible` 2px business outline, offset `-2px`.
- Activating a tab scrolls it into view. Do not claim a keyboard shortcut unless it matches the host's documented shortcut model.
- File workflow keeps browser and host-global commands unclaimed. Review, file search, content search, find, and go-to-line use their visible UI controls; keyboard handling stays with the focused control or an open transient surface.
- A tab close affordance may be visually hidden while its tab is inactive, but it must not remain in the keyboard focus order until it is visible.
- Icon-only buttons use `aria-label` and the host Tooltip component. It appears
  on pointer hover and keyboard focus. Do not retain a CSS transform on the
  sidebar while it is open: the Tooltip bubble renders beside its trigger and
  a transformed sidebar would offset its fixed positioning.
- Show `+/−` counts when they are non-zero.
- Review shows a central Diff, a searchable changed-file tree, and aggregate `+/−` counts; selecting a file scrolls to its Harness diff. There is no separate Summary view or turn selector.
- Review follows the Codex-style diff workflow: split / unified view, collapse or expand one file or all files, copy a file path, hide or show the file tree, resize the tree rail, and navigate the tree with arrow keys, Home / End, Enter, and Escape in search.
- Match the diff editor's unchanged-line folding: keep three context lines beside changes, fold only when at least six lines can be hidden, and reveal a folded run when clicked.
- In split view, show pure additions and pure deletions in one full-width column; reserve two columns for files containing both kinds of change.
- Horizontal scrolling belongs to each complete code pane, with the old and new panes kept in sync; individual code lines do not scroll independently.
- Review file rows use the selected, hover, and focus states from the existing file tree. Search expands matching folder paths and Escape clears the query.
- On viewports narrower than 768px, the workbench is a full-width drawer and does not reflow the conversation.
