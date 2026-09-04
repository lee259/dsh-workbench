import { SYSTEM_OPEN_API_PATH } from "../../shared/types.js";

export async function openInSystem(path: string): Promise<void> {
  const response = await fetch(SYSTEM_OPEN_API_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!response.ok) throw new Error("open_failed");
}
