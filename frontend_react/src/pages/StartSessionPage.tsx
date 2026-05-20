import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startSession } from "../api/sessionApi";

const TEACHER_KEY = "Solve2Learn";

export default function StartSessionPage() {
  const nav = useNavigate();
  const [classCode, setClassCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showTeacherPrompt, setShowTeacherPrompt] = useState(false);
  const [teacherKey, setTeacherKey]               = useState("");
  const [keyError, setKeyError]                   = useState(false);

  function onTeacherAccess() {
    if (teacherKey === TEACHER_KEY) {
      nav("/teacher");
    } else {
      setKeyError(true);
      setTeacherKey("");
    }
  }

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

        {/* Teacher access */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          {!showTeacherPrompt ? (
            <button
              onClick={() => { setShowTeacherPrompt(true); setKeyError(false); setTeacherKey(""); }}
              style={{
                background: "none", border: "none", color: "#999",
                fontSize: 12, cursor: "pointer", textDecoration: "underline",
              }}
            >
              Accés professor
            </button>
          ) : (
            <div style={{
              marginTop: 4, padding: "14px 16px",
              backgroundColor: "#f5f5f5", borderRadius: 8,
              border: "1px solid #ddd",
            }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#555" }}>
                Introdueix la clau d'accés
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  value={teacherKey}
                  onChange={(e) => { setTeacherKey(e.target.value); setKeyError(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") onTeacherAccess(); }}
                  placeholder="Clau…"
                  autoFocus
                  style={{
                    flex: 1, padding: "8px 10px", fontSize: 13,
                    borderRadius: 6, border: `1px solid ${keyError ? "crimson" : "#ccc"}`,
                  }}
                />
                <button
                  onClick={onTeacherAccess}
                  style={{
                    padding: "8px 14px", backgroundColor: "#1565C0",
                    color: "white", border: "none", borderRadius: 6,
                    cursor: "pointer", fontSize: 13, fontWeight: "bold",
                  }}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setShowTeacherPrompt(false)}
                  style={{
                    padding: "8px 10px", backgroundColor: "#eee",
                    border: "1px solid #ccc", borderRadius: 6,
                    cursor: "pointer", fontSize: 13, color: "#555",
                  }}
                >
                  ✕
                </button>
              </div>
              {keyError && (
                <p style={{ color: "crimson", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                  Clau incorrecta.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
