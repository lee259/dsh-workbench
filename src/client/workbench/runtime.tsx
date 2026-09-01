import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { LocaleStore } from "../../shared/i18n.js";
import type { FileStore } from "../store.js";

export type WorkbenchRuntimeServices = {
  readonly store: FileStore;
  readonly i18n: LocaleStore;
  readonly references?: {
    addPath(path: string, directory?: boolean, sessionId?: string): boolean;
    appendText(text: string, sessionId?: string): boolean;
  };
  readonly absolutePath?: (path: string) => string;
};
let runtimeContext: ReturnType<typeof createContext<WorkbenchRuntimeServices | null>> | null = null;

function getRuntimeContext() {
  runtimeContext ??= createContext<WorkbenchRuntimeServices | null>(null);
  return runtimeContext;
}

export function WorkbenchRuntime({ services, children }: { services: WorkbenchRuntimeServices; children: ReactNode }) {
  const Context = getRuntimeContext();
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

export function useWorkbenchRuntime(): WorkbenchRuntimeServices {
  const context = useContext(getRuntimeContext());
  if (!context) throw new Error("Workbench runtime is not initialized");
  return context;
}

export function useWorkbenchServices(): WorkbenchRuntimeServices {
  const services = useWorkbenchRuntime();
  useSyncExternalStore(services.i18n.subscribe, services.i18n.getSnapshot, services.i18n.getSnapshot);
  return services;
}
