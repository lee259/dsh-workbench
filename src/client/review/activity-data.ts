import { ACTIVITY_API_PATH, type ActivityRecord } from "../../shared/types.js";

export async function fetchActivities(): Promise<ActivityRecord[]> {
  const response = await fetch(ACTIVITY_API_PATH);
  if (!response.ok) throw new Error("Activity request failed");
  const payload = await response.json() as { records?: ActivityRecord[] };
  return payload.records ?? [];
}
