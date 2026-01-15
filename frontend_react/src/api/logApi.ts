import { api } from "./client";
import type { CTATMessage } from "../types/ctat";

export async function sendLogs(session_id: string, events: CTATMessage[]) {
  await api.post("/api/logs", { session_id, events });
}
