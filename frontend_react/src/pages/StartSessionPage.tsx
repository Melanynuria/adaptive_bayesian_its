import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startSession } from "../api/sessionApi";

export default function StartSessionPage() {
  const nav = useNavigate();
  const [classCode, setClassCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onStart() {
    setError(null);
    const cc = classCode.trim();
    if (!cc) return setError("El codi de classe és obligatori.");

    setLoading(true);
    try {
      const sid = studentId.trim() || crypto.randomUUID();
      const data = await startSession(cc, sid);
      nav("/tutor", {
        state: {
          sessionId: data.session_id,
          problemIds: data.problem_ids,
          classCode: cc,
        },
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setError(detail ?? "No s'ha pogut iniciar la sessió. Comprova que FastAPI està en marxa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Verdana",
        backgroundColor: "#bcbcbc",
      }}
    >
      <div
        style={{
          width: 620,
          padding: 25,
          border: "1px solid #c0c0c0",
          borderRadius: 10,
          boxShadow: "0 0px 70px rgba(255, 255, 255, 0.08)",
          backgroundColor: "#ffffff",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>
          Inici de sessió
        </h2>

        <label>Codi de classe</label>
        <input
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          style={{ width: "95%", padding: 10, margin: "8px 0 16px" }}
          placeholder=" Per exemple: 1ESO_A"
        />

        <label>Student ID (curs + número de llista)</label>
        <input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{ width: "95%", padding: 10, margin: "8px 0 16px" }}
          placeholder="Per exemple, si curs 4rt i número de llista 05:  405"
        />

        {error && (
          <p style={{ color: "crimson", marginBottom: 16 }}>{error}</p>
        )}

        <button
          onClick={onStart}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            marginTop: 8,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Carregant…" : "Iniciar"}
        </button>
      </div>
    </div>
  );
}
