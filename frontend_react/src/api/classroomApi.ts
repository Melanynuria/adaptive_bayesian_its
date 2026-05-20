import { api } from "./client";

type StudentProgress = {
  student_id: string;
  session_id: string;
  problems: Record<string, { correct: number; incorrect: number }>;
  total_correct: number;
  total_incorrect: number;
  assigned_to: string | null;
  hand_raised: boolean;
  knowledge_states: Record<string, number>;
};

/** Teacher: initialise a new class session (creates the per-class SQLite database). */
export async function startClass(class_code: string) {
  const res = await api.post(`/api/classroom/${class_code}/start`);
  return res.data as { status: string; class_code: string };
}

/** Teacher: fetch the live attempt summary for all students in the class. */
export async function getProgress(class_code: string) {
  const res = await api.get(`/api/classroom/${class_code}/progress`);
  return res.data as { students: StudentProgress[] };
}

/** Teacher: mark the session as ended so students see the final-assessment button. */
export async function endClass(class_code: string) {
  await api.post(`/api/classroom/${class_code}/end`);
}

/** Student: poll to find out whether the teacher has ended the session. */
export async function getClassStatus(class_code: string) {
  const res = await api.get(`/api/classroom/${class_code}/status`);
  return res.data as { ended: boolean };
}

/** Teacher: download the class Excel report as a file. */
export async function downloadReport(class_code: string): Promise<void> {
  const res = await api.get(`/api/classroom/${class_code}/report`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report_${class_code}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
