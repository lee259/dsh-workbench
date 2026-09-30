import { useEffect } from "react";
import { WorkspaceTreePanel } from "../explorer/file-tree.js";
import { useWorkbenchServices, useWorkbenchSession } from "./runtime.js";

export function NativeWorkspaceTab() {
  const { navigation, store } = useWorkbenchServices();
  const sessionId = useWorkbenchSession();
  useEffect(() => { store.show(); }, [store]);
  return <section className="dsh-wb-native-tree-page">
    <WorkspaceTreePanel key={sessionId} width={280} onResize={() => {}} sessionId={sessionId} onFileOpen={(path, mode) => { navigation.openFile(path, mode); }} />
  </section>;
}
