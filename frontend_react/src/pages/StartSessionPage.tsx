import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startSession } from "../api/sessionApi";

export default function StartSessionPage() {
  const nav = useNavigate();
  const [classCode, setClassCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setError(null);
    const cc = classCode.trim();
    if (!cc) return setError("Class code is required.");

    try {
      const sid = studentId.trim() || crypto.randomUUID();
      const data = await startSession(cc, sid);
      nav("/tutor", { state: { sessionId: data.session_id, firstProblemId: data.first_problem_id } });
    } catch {
      setError("Could not start session. Is FastAPI running?");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>Start Session</h2>

      <label>Class code</label>
      <input
        value={classCode}
        onChange={(e) => setClassCode(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "8px 0 16px" }}
        placeholder="e.g., 1ESO_A"
      />

      <label>Student ID (optional)</label>
      <input
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "8px 0 16px" }}
        placeholder="Leave blank to auto-generate"
      />

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <button onClick={onStart} style={{ padding: "10px 16px" }}>
        Start
      </button>
    </div>
  );
}
