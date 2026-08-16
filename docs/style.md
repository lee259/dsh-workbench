# Style

Do not invent local rules. Follow the guides below. This page only records where this repo differs.

Tokens and sizes stay in [docs/ui.md](./ui.md).

## Follow

| Layer | Guide | Why this one |
| --- | --- | --- |
| JavaScript | [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) (148k) | The most-starred JS style guide still updated. [10.2](https://github.com/airbnb/javascript#modules--no-wildcard) forbids wildcard imports (`import * as`). |
| TypeScript | [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) ([google/styleguide](https://github.com/google/styleguide), 39k) | The usual written TS guide. Prefer [named imports](https://google.github.io/styleguide/tsguide.html#namespace-vs-named-imports) for symbols used often or with clear names (`useState`, `useEffect`). Use [`import type`](https://google.github.io/styleguide/tsguide.html#type-imports) when the name is only a type. |
| React | [Rules of React](https://react.dev/reference/rules) | Official runtime rules from the React team. |
| JSX | [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react) | The JSX half of Airbnb. Alignment, props, parentheses, tags. |
| CSS | [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html) | Same `google/styleguide` repo. Airbnb’s [CSS guide](https://github.com/airbnb/css) is archived. Hyphenated class names, one declaration per line, semicolon after every declaration. |
| CSS order | [idiomatic-css](https://github.com/necolas/idiomatic-css) (necolas, 6.6k) | Declaration groups: positioning → display & box model → other (type / visual). |

[typescript-eslint](https://typescript-eslint.io/users/configs) recommended + stylistic is the living TS lint set those guides map onto. This repo does not install that toolchain yet.

## This repo

These override the guides above when they fight the existing tree:

- File names stay kebab-case (`file-tree.tsx`). Airbnb wants PascalCase component files.
- Props are TypeScript types, not PropTypes.
- Components are functions. Do not add class components.
- Class names stay `dsh-wb-*`. Do not adopt Airbnb CSS’s PascalCase BEM blocks.
- Color, radius, and type come from [docs/ui.md](./ui.md), not raw hex.
- Relative ESM imports keep the `.js` suffix this bundle requires.
