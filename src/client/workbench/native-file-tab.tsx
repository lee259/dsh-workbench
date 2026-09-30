import { useEffect, useState, useSyncExternalStore } from "react";
import { parseNativeFileAddress } from "../native-address.js";
import { CodeView } from "../preview/code-view.js";
import { createFileStore } from "../store.js";
import { WorkbenchRuntime, useWorkbenchServices } from "./runtime.js";

type TabInfo = { tab: { contentId: string; visible?: boolean; navigation?: { revision?: number; params?: { line?: number } } } };

export function NativeFileTab({ useTabInfo }: { useTabInfo(): TabInfo }) {
  const services = useWorkbenchServices();
  const [store] = useState(() => createFileStore());
  const [loadedAddress, setLoadedAddress] = useState("");
  const info = useTabInfo();
  const address = parseNativeFileAddress(info.tab.contentId);
  const path = address?.path;
  const sessionId = address?.sessionId;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const navigation = info.tab.navigation;
  useEffect(() => services.store.registerDirtyCheck(() => store.hasUnsavedChanges()), [services.store, store]);
  useEffect(() => {
    if (!path || !sessionId || info.tab.visible === false) return;
    let active = true;
    void store.open(path, "view", navigation?.params?.line, false, "keep", sessionId).then(() => {
      if (active) setLoadedAddress(info.tab.contentId);
    });
    return () => { active = false; };
  }, [info.tab.contentId, info.tab.visible, navigation?.revision, navigation?.params?.line, path, sessionId, store]);
  useEffect(() => {
    if (!path || !sessionId || info.tab.visible === false) return;
    const reload = () => { void store.open(path, "view", navigation?.params?.line, false, "keep", sessionId); };
    window.addEventListener("dsh-wb-workspace-change", reload);
    return () => window.removeEventListener("dsh-wb-workspace-change", reload);
  }, [info.tab.visible, navigation?.params?.line, path, sessionId, store]);
  if (!path) return <div className="dsh-wb-error">Invalid workbench file address</div>;
  if (state.path !== path || loadedAddress !== info.tab.contentId) return <div className="dsh-wb-empty"><strong>Loading file</strong></div>;
  return <WorkbenchRuntime services={{ ...services, store }}><section className="dsh-wb-native-content-page"><CodeView state={state} sessionId={sessionId} /></section></WorkbenchRuntime>;
}
