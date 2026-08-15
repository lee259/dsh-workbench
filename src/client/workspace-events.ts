import { EVENTS_API_PATH } from "../shared/types.js";

export type WorkspaceEventSource = {
  addEventListener(type: string, listener: () => void): void;
  close(): void;
};

export function followWorkspaceEvents(
  onChange: () => void,
  connect: (url: string) => WorkspaceEventSource = (url) => new EventSource(url),
): () => void {
  const source = connect(EVENTS_API_PATH);
  source.addEventListener("change", onChange);
  return () => source.close();
}
