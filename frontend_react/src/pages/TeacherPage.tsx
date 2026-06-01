import { useState, useEffect } from "react";
import { startClass, getProgress, endClass, downloadReport, toggleMessages } from "../api/classroomApi";

type StudentProgress = {
  student_id: string;
  session_id: string;
  problems:         Record<string, { correct: number; incorrect: number }>;
  total_correct:    number;
  total_incorrect:  number;
  assigned_to:      string | null;
  hand_raised:      boolean;
  knowledge_states: Record<string, number>;
};

const KC_LIST: { key: string; short: string; full: string }[] = [
  { key: "move_constants",               short: "MC",  full: "Move constants" },
  { key: "remove_coefficient",           short: "RC",  full: "Remove coefficient" },
  { key: "combine_like_terms",           short: "CLT", full: "Combine like terms" },
  { key: "expand_eliminate_parentheses", short: "EEP", full: "Expand / eliminate parentheses" },
  { key: "normalize_negative_sign",      short: "NNS", full: "Normalize negative sign" },
];

function allKcsMastered(ks: Record<string, number>) {
  const v = Object.values(ks);
  return v.length > 0 && v.every(x => x > 0.9);
}
function kcBg(p: number)   { return p < 0.40 ? "#ffcdd2" : p < 0.80 ? "#fff9c4" : "#c8e6c9"; }
function kcClr(p: number)  { return p < 0.40 ? "#b71c1c" : p < 0.80 ? "#f57f17" : "#1b5e20"; }

export default function TeacherPage() {
  const [classCodeInput, setClassCodeInput] = useState("");
  const [activeClass,    setActiveClass]    = useState<string | null>(null);
  const [students,       setStudents]       = useState<StudentProgress[]>([]);
  const [error,          setError]          = useState<string | null>(null);
  const [starting,       setStarting]       = useState(false);
  const [lastUpdate,     setLastUpdate]     = useState<Date | null>(null);
  const [confirmEnd,     setConfirmEnd]     = useState(false);
  const [sessionEnded,   setSessionEnded]   = useState(false);
  const [downloading,    setDownloading]    = useState(false);
  const [messagesEnabled, setMessagesEnabled] = useState(true);

  useEffect(() => {
    if (!activeClass) return;
    async function fetchProgress() {
      try {
        const data = await getProgress(activeClass!);
        setStudents(data.students as StudentProgress[]);
        setLastUpdate(new Date());
      } catch { /* silent */ }
    }
    fetchProgress();
    const id = setInterval(fetchProgress, 5000);
    return () => clearInterval(id);
  }, [activeClass]);

  async function onStartClass() {
    const cc = classCodeInput.trim();
    if (!cc) return setError("Introdueix un codi de classe.");
    setError(null); setStarting(true);
    try { await startClass(cc); setActiveClass(cc); }
    catch { setError("No s'ha pogut iniciar la classe. Comprova que FastAPI està en marxa."); }
    finally { setStarting(false); }
  }

  async function onEndClass() {
    if (!activeClass) return;
    try { await endClass(activeClass); setSessionEnded(true); setConfirmEnd(false); }
    catch { /* best-effort */ }
  }

  async function onToggleMessages() {
    if (!activeClass) return;
    try { const r = await toggleMessages(activeClass); setMessagesEnabled(r.messages_enabled); }
    catch { /* best-effort */ }
  }

  async function onDownloadReport() {
    if (!activeClass) return;
    setDownloading(true);
    try { await downloadReport(activeClass); }
    catch { /* 404 if no student has finished yet */ }
    finally { setDownloading(false); }
  }

  return (
    <>
      <style>{`
        body { margin: 0; }
        @keyframes handWave {
          from { transform: rotate(-10deg); }
          to   { transform: rotate(15deg); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100vw",
        display: "flex", flexDirection: "column",
        fontFamily: "Verdana, sans-serif",
        backgroundColor: "#f0f4f8",
      }}>

        {/* ══ Header bar (matches TutorPage) ══ */}
        <div style={{
          background: "linear-gradient(90deg, #0d5b6e 0%, #15a4c0 60%, #2ab3a3 100%)",
          padding: "0 24px", height: 64,
          display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 24 }}>✏️</span>
          <span style={{ color: "white", fontWeight: 900, fontSize: 19, letterSpacing: 0.5 }}>
            Solve2Learn
          </span>
          <span style={{
            color: "rgba(255,255,255,0.55)", fontSize: 13,
            borderLeft: "1px solid rgba(255,255,255,0.25)", paddingLeft: 14, marginLeft: 4,
          }}>
            Tauler del professor
          </span>
          {activeClass && lastUpdate && (
            <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.60)", fontSize: 12 }}>
              Actualitzat: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* ══ Page body ══ */}
        <div style={{ flex: 1, padding: "28px 28px 40px", boxSizing: "border-box" }}>

          {/* ─── Start-class form ─── */}
          {!activeClass ? (
            <div style={{
              maxWidth: 480,
              backgroundColor: "white", borderRadius: 20,
              padding: "32px 28px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              margin: "40px auto 0",
            }}>
              <h2 style={{ margin: "0 0 20px", color: "#1a1a2e", fontSize: 20 }}>
                Iniciar una classe
              </h2>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700,
                              color: "#666", marginBottom: 6, letterSpacing: 0.3 }}>
                CODI DE CLASSE
              </label>
              <input
                value={classCodeInput}
                onChange={(e) => setClassCodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onStartClass(); }}
                placeholder="Per exemple: 1ESO_A"
                style={{
                  width: "100%", padding: "13px 15px", fontSize: 15,
                  borderRadius: 12, border: "2px solid #e0e0e0",
                  boxSizing: "border-box", fontFamily: "inherit",
                  outline: "none", backgroundColor: "#fafafa",
                }}
              />
              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  backgroundColor: "#ffebee", borderRadius: 10,
                  padding: "10px 14px", marginTop: 14,
                  border: "1.5px solid #ef9a9a",
                }}>
                  <span>⚠️</span>
                  <span style={{ fontSize: 13, color: "#c62828", fontWeight: 600 }}>{error}</span>
                </div>
              )}
              <button
                onClick={onStartClass}
                disabled={starting}
                style={{
                  marginTop: 20, width: "100%", padding: "14px",
                  background: starting ? "#ccc" : "linear-gradient(90deg, #0d5b6e, #15a4c0)",
                  color: "white", border: "none", borderRadius: 12,
                  cursor: starting ? "not-allowed" : "pointer",
                  fontSize: 16, fontWeight: 800, fontFamily: "inherit",
                  boxShadow: starting ? "none" : "0 4px 14px rgba(21,164,192,0.35)",
                  transition: "transform 0.15s",
                }}
              >
                {starting ? "Iniciant…" : "Iniciar classe 🚀"}
              </button>
            </div>

          ) : (
            <>
              {/* ─── Active class banner ─── */}
              <div style={{
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10,
                padding: "14px 20px", borderRadius: 14,
                backgroundColor: sessionEnded ? "#fce4ec" : "#e8f5e9",
                border: `1.5px solid ${sessionEnded ? "#f48fb1" : "#a5d6a7"}`,
                marginBottom: 20,
              }}>
                {/* Status dot */}
                <span style={{
                  width: 11, height: 11, borderRadius: "50%", display: "inline-block", flexShrink: 0,
                  backgroundColor: sessionEnded ? "#e53935" : "#4CAF50",
                  boxShadow: sessionEnded ? "none" : "0 0 0 3px rgba(76,175,80,0.25)",
                }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>
                  Classe: {activeClass}
                </span>
                {sessionEnded && (
                  <span style={{ fontSize: 13, color: "#c62828", fontWeight: 700 }}>
                    — Sessió finalitzada
                  </span>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Messages toggle */}
                <button
                  onClick={onToggleMessages}
                  title={messagesEnabled ? "Desactiva els missatges motivacionals" : "Activa els missatges motivacionals"}
                  style={{
                    padding: "6px 14px", border: "none", borderRadius: 8,
                    backgroundColor: messagesEnabled ? "#2e7d32" : "#757575",
                    color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    fontFamily: "inherit",
                  }}
                >
                  {messagesEnabled ? "💬 Missatges: ON" : "💬 Missatges: OFF"}
                </button>

                {/* Excel report */}
                <button
                  onClick={onDownloadReport}
                  disabled={downloading || !sessionEnded}
                  title={sessionEnded ? "Descarrega l'informe Excel" : "Disponible un cop finalitzada la sessió"}
                  style={{
                    padding: "6px 14px", border: "none", borderRadius: 8,
                    backgroundColor: "#1565C0", color: "white",
                    cursor: (downloading || !sessionEnded) ? "not-allowed" : "pointer",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                    opacity: (downloading || !sessionEnded) ? 0.45 : 1,
                  }}
                >
                  {downloading ? "Descarregant…" : "⬇ Informe Excel"}
                </button>

                {/* End session */}
                {!sessionEnded && (
                  !confirmEnd ? (
                    <button
                      onClick={() => setConfirmEnd(true)}
                      style={{
                        padding: "6px 16px", border: "none", borderRadius: 8,
                        backgroundColor: "#e53935", color: "white",
                        cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                      }}
                    >
                      Finalitzar sessió
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#c62828", fontWeight: 700 }}>Segur?</span>
                      <button
                        onClick={onEndClass}
                        style={{
                          padding: "6px 14px", border: "none", borderRadius: 8,
                          backgroundColor: "#c62828", color: "white",
                          cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                        }}
                      >Sí, finalitzar</button>
                      <button
                        onClick={() => setConfirmEnd(false)}
                        style={{
                          padding: "6px 12px", borderRadius: 8,
                          backgroundColor: "#eee", border: "1px solid #ccc",
                          cursor: "pointer", fontSize: 13, color: "#555", fontFamily: "inherit",
                        }}
                      >Cancel·lar</button>
                    </div>
                  )
                )}
              </div>

              {/* ─── Legends ─── */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px",
                            marginBottom: 10, fontSize: 12, color: "#666" }}>
                {KC_LIST.map(({ short, full }) => (
                  <span key={short}><strong>{short}</strong> = {full}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 18, fontSize: 11, flexWrap: "wrap" }}>
                {[
                  { bg: "#ffcdd2", clr: "#b71c1c", label: "P(L) < 0.40  Dificultat" },
                  { bg: "#fff9c4", clr: "#f57f17", label: "0.40 ≤ P(L) < 0.80  Parcialment après" },
                  { bg: "#c8e6c9", clr: "#1b5e20", label: "P(L) ≥ 0.80  Après" },
                ].map(({ bg, clr, label }) => (
                  <span key={label} style={{
                    padding: "3px 10px", borderRadius: 6,
                    backgroundColor: bg, color: clr, fontWeight: 700,
                  }}>{label}</span>
                ))}
              </div>

              {/* ─── Student count header ─── */}
              <h3 style={{ margin: "0 0 12px", color: "#1a1a2e", fontSize: 16 }}>
                Progrés dels alumnes
                <span style={{
                  marginLeft: 10, padding: "2px 10px", borderRadius: 20,
                  backgroundColor: "#e3f2fd", color: "#1565C0",
                  fontSize: 13, fontWeight: 800,
                }}>{students.length}</span>
              </h3>

              {students.length === 0 ? (
                <div style={{
                  padding: "32px", textAlign: "center",
                  backgroundColor: "white", borderRadius: 14,
                  border: "1.5px dashed #ddd", color: "#aaa", fontSize: 14,
                }}>
                  Cap alumne connectat encara.
                </div>
              ) : (
                <div style={{
                  overflowX: "auto",
                  backgroundColor: "white", borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
                }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "linear-gradient(90deg, #0d5b6e, #15a4c0)" }}>
                        <Th>Alumne</Th>
                        <Th>Exercicis</Th>
                        <Th style={{ color: "#a5d6a7" }}>✓ Correctes</Th>
                        <Th style={{ color: "#ef9a9a" }}>✗ Incorrectes</Th>
                        <Th>Assignat a</Th>
                        {KC_LIST.map(({ short }) => <Th key={short}>{short}</Th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => {
                        const mastered = allKcsMastered(s.knowledge_states);
                        return (
                          <tr key={s.session_id} style={{
                            backgroundColor: mastered ? "#e8f5e9" : s.hand_raised ? "#fff8e1"
                              : i % 2 === 0 ? "#ffffff" : "#f9f9f9",
                            outline: mastered ? "2px solid #4CAF50"
                              : s.hand_raised ? "2px solid #ff9800" : "none",
                          }}>
                            <Td>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                                {mastered && (
                                  <span title="Ha après tots els conceptes!" style={{ fontSize: 15 }}>⭐</span>
                                )}
                                {s.hand_raised && (
                                  <span title="L'alumne demana ajuda" style={{
                                    fontSize: 17,
                                    animation: "handWave 0.8s ease-in-out infinite alternate",
                                  }}>🖐</span>
                                )}
                                <strong>{s.student_id}</strong>
                              </span>
                            </Td>
                            <Td>{Object.keys(s.problems).length}</Td>
                            <Td style={{ color: "#2e7d32", fontWeight: "bold" }}>{s.total_correct ?? 0}</Td>
                            <Td style={{ color: "#c62828", fontWeight: "bold" }}>{s.total_incorrect ?? 0}</Td>
                            <Td>
                              {s.assigned_to
                                ? <span style={{
                                    padding: "2px 8px", borderRadius: 6,
                                    backgroundColor: "#e3f2fd", color: "#1565C0",
                                    fontSize: 12, fontWeight: 700,
                                  }}>{s.assigned_to}</span>
                                : <span style={{ color: "#bbb", fontSize: 12 }}>—</span>
                              }
                            </Td>
                            {KC_LIST.map(({ key }) => {
                              const p = s.knowledge_states?.[key];
                              return (
                                <Td key={key} style={{
                                  backgroundColor: p != null ? kcBg(p) : "transparent",
                                  color:           p != null ? kcClr(p) : "#bbb",
                                  fontWeight: "bold",
                                }}>
                                  {p != null ? `${(p * 100).toFixed(0)}%` : "—"}
                                </Td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: "11px 14px", textAlign: "center", color: "white",
      fontWeight: 800, borderRight: "1px solid rgba(255,255,255,0.15)", ...style,
    }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: "9px 14px", textAlign: "center",
      borderBottom: "1px solid #e8e8e8",
      borderRight:  "1px solid #e8e8e8",
      ...style,
    }}>
      {children}
    </td>
  );
}
