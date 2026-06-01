import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startSession, type StartSessionResponse } from "../api/sessionApi";

const TEACHER_KEY    = "Solve2Learn";
const DIAGNOSTIC_IDS = ["level1Difficult_v1", "level2Difficult_v1", "level3Difficult_v1"];

// Excludes visually ambiguous chars: 0/O, 1/I/L
const TOKEN_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateToken(): string {
  const part = () =>
    Array.from({ length: 4 }, () =>
      TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)]
    ).join("");
  return `${part()}-${part()}`;
}

function resumeRoute(
  data: StartSessionResponse,
  classCode: string,
): { path: string; state: Record<string, unknown> } {
  const completedIds    = new Set(data.completed_problems.map((c) => c.problem_id));
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

// Auto-format typed token: uppercase + insert dash after 4th char
function formatTokenInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export default function StartSessionPage() {
  const nav = useNavigate();

  // "new" = first time, "reconnect" = student has a code
  const [mode, setMode]                   = useState<"new" | "reconnect">("new");
  const [classCode, setClassCode]         = useState("");
  const [reconnectToken, setReconnectToken] = useState("");

  // Token-confirmation modal
  const [pendingToken, setPendingToken]   = useState<string | null>(null);
  const [confirmed, setConfirmed]         = useState(false);
  const [copied, setCopied]               = useState(false);

  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [resumeInfo, setResumeInfo] = useState<string | null>(null);

  // Teacher access
  const [showTeacherPrompt, setShowTeacherPrompt] = useState(false);
  const [teacherKey, setTeacherKey]               = useState("");
  const [keyError, setKeyError]                   = useState(false);

  function onTeacherAccess() {
    if (teacherKey === TEACHER_KEY) { nav("/teacher"); }
    else { setKeyError(true); setTeacherKey(""); }
  }

  // ── Step 1 (new): validate class code, generate token, show modal ──
  function onNewSession() {
    setError(null);
    const cc = classCode.trim();
    if (!cc) return setError("El codi de classe és obligatori.");
    setPendingToken(generateToken());
    setConfirmed(false);
    setCopied(false);
  }

  // ── Step 2 (new): user confirmed token → create session ──
  async function onConfirmToken() {
    if (!confirmed || !pendingToken) return;
    const cc = classCode.trim();
    setLoading(true);
    try {
      const data = await startSession(cc, pendingToken);
      setPendingToken(null);
      nav("/tutor", {
        state: { sessionId: data.session_id, problemIds: data.problem_ids, classCode: cc },
      });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "No s'ha pogut iniciar la sessió. Comprova que FastAPI està en marxa.");
      setPendingToken(null);
    } finally {
      setLoading(false);
    }
  }

  // ── Reconnect: look up existing session by token ──
  async function onReconnect() {
    setError(null);
    setResumeInfo(null);
    const cc  = classCode.trim();
    const tok = reconnectToken.replace("-", "").trim();
    if (!cc)  return setError("El codi de classe és obligatori.");
    if (tok.length < 8) return setError("El codi de sessió ha de tenir 8 caràcters (format: XXXX-XXXX).");

    setLoading(true);
    try {
      const data = await startSession(cc, reconnectToken.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0,4) + "-" + reconnectToken.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(4,8));
      if (!data.resumed) {
        setError("No s'ha trobat cap sessió amb aquest codi. Comprova que el codi és correcte i que el professor ha reobert la classe.");
        return;
      }
      const n = data.completed_problems.length;
      setResumeInfo(`Sessió recuperada — ${n} exercici${n !== 1 ? "s" : ""} ja guardats. Reprenent…`);
      await new Promise((r) => setTimeout(r, 1800));
      const { path, state } = resumeRoute(data, cc);
      nav(path, { state });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "No s'ha pogut reconnectar.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!pendingToken) return;
    await navigator.clipboard.writeText(pendingToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", fontSize: 16,
    borderRadius: 12, border: "2px solid #e0e0e0", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color 0.2s", backgroundColor: "#fafafa",
  };

  return (
    <>
      <style>{`
        body { margin: 0; }
        .s2l-input:focus { border-color: #15a4c0 !important; background-color: #fff !important; }
        .s2l-btn-main {
          width: 100%; padding: 16px; font-size: 18px; font-weight: 800;
          font-family: inherit; border: none; border-radius: 14px;
          background: linear-gradient(90deg, #16788c, #17b1af);
          color: white; cursor: pointer; letter-spacing: 0.5px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 14px rgba(21,164,192,0.35);
        }
        .s2l-btn-main:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(21,164,192,0.45); }
        .s2l-btn-main:active:not(:disabled) { transform: translateY(0); }
        .s2l-btn-main:disabled { opacity: 0.65; cursor: not-allowed; }
        .s2l-teacher-link {
          background: none; border: none; color: rgba(255,255,255,0.45);
          font-size: 12px; cursor: pointer; text-decoration: underline;
          font-family: inherit; transition: color 0.2s;
        }
        .s2l-teacher-link:hover { color: rgba(255,255,255,0.75); }
        .s2l-mode-link {
          background: none; border: none; font-family: inherit;
          font-size: 13px; cursor: pointer; text-decoration: underline;
          transition: color 0.2s; padding: 0;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes tokenPop {
          0%   { transform: scale(0.8); opacity: 0; }
          70%  { transform: scale(1.06); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* ── Page wrapper ── */}
      <div style={{
        minHeight: "100vh", width: "100vw",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #0d5b6e 0%, #15a4c0 55%, #2ab3a3 100%)",
        fontFamily: "'Verdana', sans-serif",
        padding: "32px 16px", boxSizing: "border-box",
      }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 4 }}>✏️</div>
          <h1 style={{
            margin: 0, fontSize: 48, fontWeight: 900, color: "#fff",
            letterSpacing: 1, textShadow: "0 3px 16px rgba(0,0,0,0.25)", lineHeight: 1.1,
          }}>Solve2Learn</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            Aprèn matemàtiques al teu ritme 🚀
          </p>
        </div>

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 480,
          backgroundColor: "#fff", borderRadius: 24,
          padding: "36px 32px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
        }}>

          <h2 style={{ margin: "0 0 24px", textAlign: "center", fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
            {mode === "new" ? "Inici de sessió" : "Recuperar sessió"}
          </h2>

          {/* Class code (both modes) */}
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 6, letterSpacing: 0.3 }}>
            CODI DE CLASSE
          </label>
          <input
            className="s2l-input"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") mode === "new" ? onNewSession() : onReconnect(); }}
            style={inputStyle}
            placeholder="Per exemple: 1ESO_A"
          />

          {/* Reconnect token input */}
          {mode === "reconnect" && (
            <>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#555", margin: "20px 0 6px", letterSpacing: 0.3 }}>
                EL TEU CODI DE SESSIÓ
              </label>
              <input
                className="s2l-input"
                value={reconnectToken}
                onChange={(e) => setReconnectToken(formatTokenInput(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") onReconnect(); }}
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: 20, letterSpacing: 3, textAlign: "center" }}
                placeholder="XXXX-XXXX"
                maxLength={9}
              />
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#aaa" }}>
                El codi que vas apuntar quan vas iniciar la sessió.
              </p>
            </>
          )}

          {/* Resume / error banners */}
          {resumeInfo && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "#e3f2fd", borderRadius: 12,
              padding: "12px 16px", marginTop: 20, border: "1.5px solid #90caf9",
            }}>
              <span style={{ fontSize: 20 }}>♻️</span>
              <span style={{ fontSize: 13, color: "#1565C0", fontWeight: 600 }}>{resumeInfo}</span>
            </div>
          )}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              backgroundColor: "#ffebee", borderRadius: 12,
              padding: "12px 16px", marginTop: 20, border: "1.5px solid #ef9a9a",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 13, color: "#c62828", fontWeight: 600 }}>{error}</span>
            </div>
          )}

          {/* Primary button */}
          <button
            className="s2l-btn-main"
            onClick={mode === "new" ? onNewSession : onReconnect}
            disabled={loading}
            style={{ marginTop: 28 }}
          >
            {loading ? "⏳  Carregant…" : mode === "new" ? "Començar ✨" : "↩  Reconnectar"}
          </button>

          {/* Mode toggle */}
          <div style={{ textAlign: "center", marginTop: 18 }}>
            {mode === "new" ? (
              <button
                className="s2l-mode-link"
                onClick={() => { setMode("reconnect"); setError(null); setResumeInfo(null); }}
                style={{ color: "#15a4c0" }}
              >
                Ja tinc el meu codi de sessió →
              </button>
            ) : (
              <button
                className="s2l-mode-link"
                onClick={() => { setMode("new"); setError(null); setResumeInfo(null); setReconnectToken(""); }}
                style={{ color: "#888" }}
              >
                ← Nova sessió
              </button>
            )}
          </div>

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
                borderRadius: 14, border: "1.5px solid #e0e0e0", textAlign: "left",
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
                      ...inputStyle, fontSize: 14, padding: "10px 14px",
                      border: `2px solid ${keyError ? "#e53935" : "#e0e0e0"}`,
                    }}
                  />
                  <button onClick={onTeacherAccess} style={{
                    padding: "10px 18px", backgroundColor: "#1565C0",
                    color: "white", border: "none", borderRadius: 10,
                    cursor: "pointer", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
                  }}>Entrar</button>
                  <button onClick={() => setShowTeacherPrompt(false)} style={{
                    padding: "10px 12px", backgroundColor: "#eee",
                    border: "1.5px solid #ddd", borderRadius: 10,
                    cursor: "pointer", fontSize: 14, color: "#777",
                  }}>✕</button>
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

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, color: "rgba(255,255,255,0.40)", fontSize: 11 }}>
          <p style={{ margin: "0 0 2px" }}>Melany Nuria Condori · Treball de Fi de Grau</p>
          <p style={{ margin: 0 }}>Universitat Pompeu Fabra</p>
        </div>
      </div>

      {/* ══════════════════ TOKEN MODAL ══════════════════ */}
      {pendingToken && (
        <div style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16, backdropFilter: "blur(3px)",
        }}>
          <div style={{
            width: "100%", maxWidth: 440,
            backgroundColor: "white", borderRadius: 24,
            padding: "36px 32px 28px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            animation: "modalIn 0.3s cubic-bezier(.22,.68,0,1.2)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>
              El teu codi de sessió
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#777" }}>
              Apunta aquest codi — és l'únic que t'identifica al sistema.
            </p>

            {/* Token display */}
            <div style={{
              display: "inline-block",
              backgroundColor: "#e8f5e9", border: "2px solid #81c784",
              borderRadius: 16, padding: "14px 36px", marginBottom: 12,
              animation: "tokenPop 0.4s cubic-bezier(.22,.68,0,1.2)",
            }}>
              <span style={{
                fontFamily: "monospace", fontSize: 34, fontWeight: 900,
                letterSpacing: 6, color: "#1b5e20",
              }}>
                {pendingToken}
              </span>
            </div>

            {/* Copy button */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={copyToken}
                style={{
                  padding: "7px 18px", borderRadius: 8,
                  border: "1.5px solid #c8e6c9",
                  backgroundColor: copied ? "#e8f5e9" : "#f9f9f9",
                  color: copied ? "#2e7d32" : "#555",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {copied ? "✅ Copiat!" : "📋 Copiar"}
              </button>
            </div>

            {/* Warning */}
            <div style={{
              backgroundColor: "#fff8e1", border: "1.5px solid #ffe082",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
              textAlign: "left",
            }}>
              <p style={{ margin: 0, fontSize: 13, color: "#e65100", lineHeight: 1.6, fontWeight: 600 }}>
                ⚠️ <strong>Apunta aquest codi ara!</strong><br />
                <span style={{ fontWeight: 400 }}>
                  Si et desconnectes durant la sessió, l'hauràs d'introduir per recuperar el teu progrés.
                  No es pot recuperar si el perds.
                </span>
              </p>
            </div>

            {/* Confirmation checkbox */}
            <label style={{
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", marginBottom: 24,
              padding: "12px 16px", borderRadius: 12,
              backgroundColor: confirmed ? "#e8f5e9" : "#f5f5f5",
              border: `1.5px solid ${confirmed ? "#81c784" : "#e0e0e0"}`,
              transition: "all 0.2s",
            }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#2e7d32" }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: confirmed ? "#2e7d32" : "#555" }}>
                He apuntat el codi
              </span>
            </label>

            {/* Continue button */}
            <button
              onClick={onConfirmToken}
              disabled={!confirmed || loading}
              style={{
                width: "100%", padding: "15px", fontSize: 17, fontWeight: 800,
                border: "none", borderRadius: 14, fontFamily: "inherit",
                background: confirmed
                  ? "linear-gradient(90deg, #16788c, #17b1af)"
                  : "#e0e0e0",
                color: confirmed ? "white" : "#aaa",
                cursor: confirmed ? "pointer" : "not-allowed",
                boxShadow: confirmed ? "0 4px 14px rgba(21,164,192,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              {loading ? "⏳ Carregant…" : "Continuar →"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
