import { EVENTS_API_PATH } from "../shared/types.js";

export type WorkspaceEventSource = {
  addEventListener(type: string, listener: (event?: { data?: string }) => void): void;
  close(): void;
};

export type WorkspaceWriteEvent = { path: string };
export type WorkspaceChangeEvent = { paths: string[] };

export function followWorkspaceEvents(
  onChange: (event: WorkspaceChangeEvent) => void,
  connect: (url: string) => WorkspaceEventSource = (url) => new EventSource(url),
  onWrite: (event: WorkspaceWriteEvent) => void = () => {},
  onActivity: () => void = () => {},
): () => void {
  const source = connect(EVENTS_API_PATH);
  source.addEventListener("change", (event) => {
    if (!event?.data) return onChange({ paths: [] });
    try {
      const payload = JSON.parse(event.data) as Partial<WorkspaceChangeEvent>;
      onChange({ paths: Array.isArray(payload.paths) ? payload.paths.filter((path): path is string => typeof path === "string" && Boolean(path)) : [] });
    } catch {
      onChange({ paths: [] });
    }
  });
  source.addEventListener("activity", onActivity);
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
