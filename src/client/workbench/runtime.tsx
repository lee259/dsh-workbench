import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { LocaleStore } from "../../shared/i18n.js";
import type { FileStore } from "../store.js";
import type { WorkbenchNavigation } from "../navigation.js";
import { lastWorkbenchSession, sessionIdFromEvent } from "../workspace-identity.js";

export type WorkbenchRuntimeServices = {
  readonly store: FileStore;
  readonly i18n: LocaleStore;
  readonly navigation: WorkbenchNavigation;
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

export function useWorkbenchSession(): string {
  const [sessionId, setSessionId] = useState(lastWorkbenchSession);
  useEffect(() => {
    const onSessionChange = (event: Event) => setSessionId(sessionIdFromEvent(event));
    window.addEventListener("dsh-wb-session-change", onSessionChange);
    return () => window.removeEventListener("dsh-wb-session-change", onSessionChange);
  }, []);
  return sessionId;
}
