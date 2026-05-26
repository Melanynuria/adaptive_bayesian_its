import { api } from "./client";

export type CompletedProblem = { problem_id: string; completed_at: string };

export type SessionAssignment = {
  level: string;
  difficulty: string;
  problem_ids: string[];
  mastery: boolean;
} | null;

export type StartSessionResponse = {
  session_id: string;
  /** Always the three diagnostic IDs — kept for API compatibility. */
  problem_ids: string[];
  /** Exercises the student already finished (empty for a new session). */
  completed_problems: CompletedProblem[];
  /** Current personalised assignment from the DB, or null if BKT hasn't run yet. */
  assignment: SessionAssignment;
  /** True when an existing session was found and restored (network-error recovery). */
  resumed: boolean;
};

/** Create or resume a student session. */
export async function startSession(
  class_code: string,
  student_id: string,
): Promise<StartSessionResponse> {
  const res = await api.post("/api/session/start", { class_code, student_id });
  return res.data as StartSessionResponse;
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
