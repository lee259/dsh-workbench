import { setReactRuntime } from "../src/client/react-bridge.js";

// Provide a test React runtime identical to the shim in the current tests.
// client modules import react (aliased → react-bridge.ts) which requires
// setReactRuntime before any hooks or createElement are called.
setReactRuntime({
  createElement(type: any, props: any, ...children: any[]) {
    return {
      type,
      props: { ...(props ?? {}), children: children.length === 1 ? children[0] : children },
    };
  },
  Fragment: Symbol.for("react.fragment"),
  Component: class {},
  PureComponent: class {},
  createContext: () => ({ Provider: {}, Consumer: {} }),
  forwardRef: (fn: any) => fn,
  cloneElement: (_el: any, props: any) => ({ type: "clone", props }),
  createRef: () => ({ current: null }),
  isValidElement: () => true,
  memo: (fn: any) => fn,
  useCallback: (fn: any) => fn,
  useContext: () => ({}),
  useEffect: () => {},
  useImperativeHandle: () => {},
  useLayoutEffect: () => {},
  useMemo: (fn: any) => fn(),
  useReducer: (_reducer: any, initial: any) => [initial, () => {}],
  useRef: (initial?: any) => ({ current: initial ?? null }),
  useState: (initial: any) => {
    let value = typeof initial === "function" ? initial() : initial;
    return [value, (next: any) => { value = typeof next === "function" ? next(value) : next; }];
  },
  useSyncExternalStore: (_subscribe: any, getSnapshot: any) => getSnapshot(),
});