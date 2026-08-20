# UI

Workbench is a DeepSeek Harness side panel. It should look like the host, not a second product.

## Goal

A quiet right-side file workbench. Open a file, read or diff it, return to the conversation. Review lists captured DSH writes in the same rail as the file tree.

Complete the named job with the fewest moves. If a click on an existing row does the work, that is the interaction. Extra chrome arrives when a later request names it.

## Tokens

Use host tokens only:

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
- Icon-only buttons use `aria-label` and the host Tooltip component. It appears
  on pointer hover and keyboard focus. Do not retain a CSS transform on the
  sidebar while it is open: the Tooltip bubble renders beside its trigger and
  a transformed sidebar would offset its fixed positioning.
- Show `+/−` counts when they are non-zero.
- Review and the file tree share one rail. Same head height, same row, same hover. The mode toggle replaces the list.
