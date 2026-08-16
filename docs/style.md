# Style

JSX and CSS are documents. A reviewer must be able to scan the tree.

- One element or declaration per line.
- Wrap props when a tag has more than three attributes or any handler.
- Extract a helper instead of a nested ternary wall.
- Group CSS as layout → box → type → color → motion.

```tsx
// ❌
return <section>{items.map((item) => <button key={item.path} onClick={() => open(item)}>{item.path}</button>)}</section>;

// ✅
return (
  <section>
    {items.map((item) => (
      <button key={item.path} type="button" onClick={() => open(item)}>
        {item.path}
      </button>
    ))}
  </section>
);
```

```css
/* ❌ */
.dsh-wb-review-item { min-height: 36px; border-radius: 10px; background: #1b1f24; }

/* ✅ */
.dsh-wb-review-item {
  min-height: 28px;
  border-radius: 4px;
  background: transparent;
}
```
