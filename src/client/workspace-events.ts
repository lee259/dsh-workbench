import { EVENTS_API_PATH } from "../shared/types.js";

export type WorkspaceEventSource = {
  addEventListener(type: string, listener: (event?: { data?: string }) => void): void;
  close(): void;
};

export type WorkspaceWriteEvent = { path: string };

export function followWorkspaceEvents(
  onChange: () => void,
  connect: (url: string) => WorkspaceEventSource = (url) => new EventSource(url),
  onWrite: (event: WorkspaceWriteEvent) => void = () => {},
): () => void {
  const source = connect(EVENTS_API_PATH);
  source.addEventListener("change", onChange);
  source.addEventListener("write", (event) => {
    if (!event?.data) return;
    try {
      const payload = JSON.parse(event.data) as Partial<WorkspaceWriteEvent>;
      if (typeof payload.path === "string" && payload.path) onWrite({ path: payload.path });
    } catch {
      // Ignore malformed workspace events; disk refresh remains best effort.
    }
  });
  return () => source.close();
}
