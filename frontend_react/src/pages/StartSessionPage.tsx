import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startSession, type StartSessionResponse } from "../api/sessionApi";

const TEACHER_KEY    = "Solve2Learn";
const DIAGNOSTIC_IDS = ["level1Difficult_v1", "level2Difficult_v1", "level3Difficult_v1"];

function resumeRoute(
  data: StartSessionResponse,
  classCode: string,
): { path: string; state: Record<string, unknown> } {
  const completedIds   = new Set(data.completed_problems.map((c) => c.problem_id));
  const diagnosticsDone = DIAGNOSTIC_IDS.every((id) => completedIds.has(id));

  if (!diagnosticsDone) {
    const remaining = DIAGNOSTIC_IDS.filter((id) => !completedIds.has(id));
    return { path: "/tutor", state: { sessionId: data.session_id, problemIds: remaining, classCode } };
  }

  if (data.assignment && !data.assignment.mastery) {
    const remaining = data.assignment.problem_ids.filter((id) => !completedIds.has(id));
    if (remaining.length > 0)
      return { path: "/tutor", state: { sessionId: data.session_id, problemIds: remaining, classCode } };
  }

  return { path: "/waiting", state: { sessionId: data.session_id, classCode } };
}

export default function StartSessionPage() {
  const nav = useNavigate();
  const [classCode,  setClassCode]  = useState("");
  const [studentId,  setStudentId]  = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [resumeInfo, setResumeInfo] = useState<string | null>(null);

  const [showTeacherPrompt, setShowTeacherPrompt] = useState(false);
  const [teacherKey,        setTeacherKey]        = useState("");
  const [keyError,          setKeyError]          = useState(false);

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
    setResumeInfo(null);
    const cc = classCode.trim();
    if (!cc) return setError("El codi de classe és obligatori.");

    setLoading(true);
    try {
      const sid  = studentId.trim() || crypto.randomUUID();
      const data = await startSession(cc, sid);

      if (data.resumed) {
        const n = data.completed_problems.length;
        setResumeInfo(`Sessió recuperada — ${n} exercici${n !== 1 ? "s" : ""} ja guardats. Reprenent…`);
        await new Promise((r) => setTimeout(r, 1800));
        const { path, state } = resumeRoute(data, cc);
        nav(path, { state });
      } else {
        nav("/tutor", { state: { sessionId: data.session_id, problemIds: data.problem_ids, classCode: cc } });
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "No s'ha pogut iniciar la sessió. Comprova que FastAPI està en marxa.");
    } finally {
      setLoading(false);
    }
  }

  /* ─── shared input style ─── */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 12,
    border: "2px solid #e0e0e0",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
    backgroundColor: "#fafafa",
  };

  return (
    <>
      {/* ── global styles (hover / focus) ── */}
      <style>{`
        body { margin: 0; }

        .s2l-input:focus {
          border-color: #1565C0 !important;
          background-color: #fff !important;
        }

        .s2l-btn-main {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          font-weight: 800;
          font-family: inherit;
          border: none;
          border-radius: 14px;
          background: linear-gradient(90deg, #16788c, #17b1af);
          color: white;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 14px rgba(21,101,192,0.35);
        }
        .s2l-btn-main:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(21,101,192,0.45);
        }
        .s2l-btn-main:active:not(:disabled) {
          transform: translateY(0);
        }
        .s2l-btn-main:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .s2l-teacher-link {
          background: none;
          border: none;
          color: rgba(255,255,255,0.45);
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          font-family: inherit;
          transition: color 0.2s;
        }
        .s2l-teacher-link:hover { color: rgba(255,255,255,0.75); }
      `}</style>

      {/* ── page wrapper ── */}
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0d5b6e 0%, #15a4c0 55%, #2ab3a3 100%)",
          fontFamily: "'Verdana', sans-serif",
          padding: "32px 16px",
          boxSizing: "border-box",
        }}
      >

        {/* ── brand ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 4 }}>✏️</div>
          <h1
            style={{
              margin: 0,
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: 1,
              textShadow: "0 3px 16px rgba(0,0,0,0.25)",
              lineHeight: 1.1,
            }}
          >
            Solve2Learn
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            Aprèn matemàtiques al teu ritme 🚀
          </p>
        </div>

        {/* ── card ── */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            backgroundColor: "#ffffff",
            borderRadius: 24,
            padding: "36px 32px 28px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              margin: "0 0 28px",
              textAlign: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "#1a1a2e",
            }}
          >
            Inici de sessió
          </h2>

          {/* Class code */}
          <label
            style={{ display: "block", fontSize: 13, fontWeight: 700,
                     color: "#555", marginBottom: 6, letterSpacing: 0.3 }}
          >
            CODI DE CLASSE
          </label>
          <input
            className="s2l-input"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onStart(); }}
            style={inputStyle}
            placeholder="Per exemple: 1ESO_A"
          />

          {/* Student ID */}
          <label
            style={{ display: "block", fontSize: 13, fontWeight: 700,
                     color: "#555", margin: "20px 0 6px", letterSpacing: 0.3 }}
          >
            EL TEU IDENTIFICADOR
          </label>
          <input
            className="s2l-input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onStart(); }}
            style={inputStyle}
            placeholder="Curs + número de llista  (ex: 405)"
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#aaa" }}>
            Si ets de 4rt ESO i el teu número és el 5: escriu 405
          </p>

          {/* Resume banner */}
          {resumeInfo && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "#e3f2fd", borderRadius: 12,
              padding: "12px 16px", marginTop: 20,
              border: "1.5px solid #90caf9",
            }}>
              <span style={{ fontSize: 20 }}>♻️</span>
              <span style={{ fontSize: 13, color: "#1565C0", fontWeight: 600 }}>{resumeInfo}</span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "#ffebee", borderRadius: 12,
              padding: "12px 16px", marginTop: 20,
              border: "1.5px solid #ef9a9a",
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ fontSize: 13, color: "#c62828", fontWeight: 600 }}>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            className="s2l-btn-main"
            onClick={onStart}
            disabled={loading}
            style={{ marginTop: 28 }}
          >
            {loading ? "⏳  Carregant…" : "Començar ✨"}
          </button>

          {/* Teacher access */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            {!showTeacherPrompt ? (
              <button
                className="s2l-teacher-link"
                onClick={() => { setShowTeacherPrompt(true); setKeyError(false); setTeacherKey(""); }}
                style={{ color: "#bbb" }}
              >
                Accés professor
              </button>
            ) : (
              <div style={{
                padding: "16px", backgroundColor: "#f8f8f8",
                borderRadius: 14, border: "1.5px solid #e0e0e0",
                textAlign: "left",
              }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#555", fontWeight: 600 }}>
                  🔑 Clau d'accés del professor
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
                      ...inputStyle,
                      fontSize: 14,
                      padding: "10px 14px",
                      border: `2px solid ${keyError ? "#e53935" : "#e0e0e0"}`,
                    }}
                  />
                  <button
                    onClick={onTeacherAccess}
                    style={{
                      padding: "10px 18px", backgroundColor: "#1565C0",
                      color: "white", border: "none", borderRadius: 10,
                      cursor: "pointer", fontSize: 13, fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => setShowTeacherPrompt(false)}
                    style={{
                      padding: "10px 12px", backgroundColor: "#eee",
                      border: "1.5px solid #ddd", borderRadius: 10,
                      cursor: "pointer", fontSize: 14, color: "#777",
                    }}
                  >
                    ✕
                  </button>
                </div>
                {keyError && (
                  <p style={{ color: "#e53935", fontSize: 12, margin: "8px 0 0", fontWeight: 600 }}>
                    Clau incorrecta. Torna-ho a provar.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── footer ── */}
        <div style={{ textAlign: "center", marginTop: 28, color: "rgba(255,255,255,0.40)", fontSize: 11 }}>
          <p style={{ margin: "0 0 2px" }}>Melany Nuria Condori · Treball de Fi de Grau</p>
          <p style={{ margin: 0 }}>Universitat Pompeu Fabra</p>
        </div>

      </div>
    </>
  );
}
