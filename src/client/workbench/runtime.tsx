import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { LocaleStore } from "../../shared/i18n.js";
import type { FileStore } from "../store.js";

export type WorkbenchRuntimeServices = { readonly store: FileStore; readonly i18n: LocaleStore };
let runtimeContext: ReturnType<typeof createContext<WorkbenchRuntimeServices | null>> | null = null;
let compatibilityServices: WorkbenchRuntimeServices | null = null;

function getRuntimeContext() {
  runtimeContext ??= createContext<WorkbenchRuntimeServices | null>(null);
  return runtimeContext;
}

export function setWorkbenchRuntimeFallback(services: WorkbenchRuntimeServices): void {
  compatibilityServices = services;
}

export function WorkbenchRuntime({ services, children }: { services: WorkbenchRuntimeServices; children: ReactNode }) {
  const Context = getRuntimeContext();
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

export function useWorkbenchRuntime(): WorkbenchRuntimeServices {
  const context = useContext(getRuntimeContext());
  const services = context ?? compatibilityServices;
  if (!services) throw new Error("Workbench runtime is not initialized");
  return services;
}

export function useWorkbenchServices(): WorkbenchRuntimeServices {
  const services = useWorkbenchRuntime();
  useSyncExternalStore(services.i18n.subscribe, services.i18n.getSnapshot, services.i18n.getSnapshot);
  return services;
}
