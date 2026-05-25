import { api } from "./client";

/** Create a new student session and receive the three diagnostic problem IDs. */
export async function startSession(class_code: string, student_id: string) {
  const res = await api.post("/api/session/start", { class_code, student_id });
  return res.data as { session_id: string; problem_ids: string[] };
}

/**
 * Poll for the personalised exercise assignment produced by BKT.
 * Returns { ready: false } while BKT is still running, or the full assignment once ready.
 */
export async function getAssignment(session_id: string) {
  const res = await api.get(`/api/session/${session_id}/assignment`);
  return res.data as
    | { ready: false }
    | { ready: true; level: string; difficulty: string; problem_ids: string[]; mastery: boolean };
}

export async function raiseHand(session_id: string) {
  await api.post(`/api/session/${session_id}/raise-hand`);
}

export async function getResults(session_id: string) {
  const res = await api.get(`/api/session/${session_id}/results`);
  return res.data as {
    initial_states:           Record<string, number>;
    final_states:             Record<string, number>;
    normalized_learning_gain: Record<string, number>;
  };
}
