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
- Icon-only buttons use `aria-label` and `title`.
- Show `+/−` counts when they are non-zero.
- Review and the file tree share one rail. Same head height, same row, same hover. The mode toggle replaces the list.
