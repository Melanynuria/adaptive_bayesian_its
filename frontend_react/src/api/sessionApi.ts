import { api } from "./client";

export async function startSession(class_code: string, student_id: string) {
  const res = await api.post("/api/session/start", { class_code, student_id });
  return res.data as { session_id: string; first_problem_id: string };
}

export async function diagnosticComplete(session_id: string) {
  const res = await api.post("/api/session/diagnostic-complete", { session_id });
  return res.data as { assigned_problem_ids: string[] };
}
