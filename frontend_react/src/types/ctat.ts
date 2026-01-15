export type CTATKind = "CTAT_LOG_EVENT" | "CTAT_PROBLEM_DONE";

export type CTATMessage =
  | {
      kind: "CTAT_LOG_EVENT";
      ts: string;
      payload: Record<string, unknown>;
    }
  | {
      kind: "CTAT_PROBLEM_DONE";
      ts: string;
      payload: { problemId?: string };
    };
