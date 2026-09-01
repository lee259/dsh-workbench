import type { ReactNode } from "react";

type ReactRuntime = Record<string, any>;
type ReactDomRuntime = { createPortal(children: unknown, container: Element): ReactNode };
let runtime: ReactRuntime | undefined;
let domRuntime: ReactDomRuntime | undefined;
const ComponentBase = class {};
const PureComponentBase = class {};
export function setReactRuntime(value: ReactRuntime): void {
  runtime = { ...(runtime ?? {}), ...value };
  if (runtime.Component) {
    Object.setPrototypeOf(ComponentBase, runtime.Component);
    Object.setPrototypeOf(ComponentBase.prototype, runtime.Component.prototype);
  }
  if (runtime.PureComponent) {
    Object.setPrototypeOf(PureComponentBase, runtime.PureComponent);
    Object.setPrototypeOf(PureComponentBase.prototype, runtime.PureComponent.prototype);
  }
}
export function setReactDomRuntime(value: ReactDomRuntime): void { domRuntime = value; }
function getRuntime(): ReactRuntime { if (!runtime) throw new Error("dsh-workbench React runtime is not ready"); return runtime; }
function getDomRuntime(): ReactDomRuntime { if (!domRuntime) throw new Error("dsh-workbench React DOM runtime is not ready"); return domRuntime; }
export const createPortal = (children: unknown, container: Element): ReactNode => getDomRuntime().createPortal(children, container);
export const createElement = (...args: any[]) => getRuntime().createElement(...args);
function createJsxElement(type: any, props: any, key: any): any {
  const current = getRuntime();
  if (current.jsx) return current.jsx(type, props, key);
  const { children, ...rest } = props ?? {};
  const nextProps = key === undefined ? rest : { ...rest, key };
  if (children === undefined) return current.createElement(type, nextProps);
  return current.createElement(type, nextProps, ...(Array.isArray(children) ? children : [children]));
}
export const jsx = (type: any, props: any, key: any) => createJsxElement(type, props, key);
export const jsxs = (type: any, props: any, key: any) => createJsxElement(type, props, key);
export const jsxDEV = (type: any, props: any, key: any) => createJsxElement(type, props, key);
export const Component = ComponentBase;
export const PureComponent = PureComponentBase;
export const cloneElement = (...args: any[]) => getRuntime().cloneElement(...args);
export const createContext = (...args: any[]) => getRuntime().createContext(...args);
export const createRef = (...args: any[]) => getRuntime().createRef(...args);
export const forwardRef = (...args: any[]) => getRuntime().forwardRef(...args);
export const memo = (...args: any[]) => getRuntime().memo(...args);
export const useCallback = (...args: any[]) => getRuntime().useCallback(...args);
export const useContext = (...args: any[]) => getRuntime().useContext(...args);
export const useEffect = (...args: any[]) => getRuntime().useEffect(...args);
export const useImperativeHandle = (...args: any[]) => getRuntime().useImperativeHandle(...args);
export const useLayoutEffect = (...args: any[]) => getRuntime().useLayoutEffect(...args);
export const useMemo = (...args: any[]) => getRuntime().useMemo(...args);
export const useReducer = (...args: any[]) => getRuntime().useReducer(...args);
export const useRef = (...args: any[]) => getRuntime().useRef(...args);
export const useState = (...args: any[]) => getRuntime().useState(...args);
export const useSyncExternalStore = (...args: any[]) => getRuntime().useSyncExternalStore(...args);
export const isValidElement = (...args: any[]) => getRuntime().isValidElement(...args);
export const Fragment = Symbol.for("react.fragment");
export default new Proxy({}, { get: (_target, key) => getRuntime()[key as string] });
