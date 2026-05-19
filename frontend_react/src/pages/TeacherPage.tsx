import { useState, useEffect } from "react";
import { startClass, getProgress } from "../api/classroomApi";

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

// KC short labels and full names for the header tooltip
const KC_LIST: { key: string; short: string; full: string }[] = [
  { key: "move_constants",               short: "MC",  full: "Move constants" },
  { key: "remove_coefficient",           short: "RC",  full: "Remove coefficient" },
  { key: "combine_like_terms",           short: "CLT", full: "Combine like terms" },
  { key: "expand_eliminate_parentheses", short: "EEP", full: "Expand / eliminate parentheses" },
  { key: "normalize_negative_sign",      short: "NNS", full: "Normalize negative sign" },
];

function kcBackground(p: number): string {
  if (p < 0.40) return "#ffcdd2";   // red   — struggling
  if (p < 0.80) return "#fff9c4";   // yellow — partial
  return "#c8e6c9";                  // green  — mastered
}

function kcTextColor(p: number): string {
  if (p < 0.40) return "#b71c1c";
  if (p < 0.80) return "#f57f17";
  return "#1b5e20";
}

export default function TeacherPage() {
  const [classCodeInput, setClassCodeInput] = useState("");
  const [activeClass, setActiveClass]       = useState<string | null>(null);
  const [students, setStudents]             = useState<StudentProgress[]>([]);
  const [error, setError]                   = useState<string | null>(null);
  const [starting, setStarting]             = useState(false);
  const [lastUpdate, setLastUpdate]         = useState<Date | null>(null);

  useEffect(() => {
    if (!activeClass) return;

    async function fetchProgress() {
      try {
        const data = await getProgress(activeClass!);
        setStudents(data.students as StudentProgress[]);
        setLastUpdate(new Date());
      } catch {
        // silent — may be empty at start
      }
    }

    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [activeClass]);

  async function onStartClass() {
    const cc = classCodeInput.trim();
    if (!cc) return setError("Introdueix un codi de classe.");
    setError(null);
    setStarting(true);
    try {
      await startClass(cc);
      setActiveClass(cc);
    } catch {
      setError("No s'ha pogut iniciar la classe. Comprova que FastAPI està en marxa.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "Verdana", margin: "0 auto" }}>
      <style>{`
        @keyframes handWave {
          from { transform: rotate(-10deg); }
          to   { transform: rotate(15deg); }
        }
      `}</style>
      <h2 style={{ marginBottom: 24 }}>Tauler del professor</h2>

      {!activeClass ? (
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
            Codi de classe
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={classCodeInput}
              onChange={(e) => setClassCodeInput(e.target.value)}
              placeholder="Per exemple: 1ESO_A"
              style={{
                padding: "10px 12px", width: 260, fontSize: 14,
                borderRadius: 6, border: "1px solid #ccc",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") onStartClass(); }}
            />
            <button
              onClick={onStartClass}
              disabled={starting}
              style={{
                padding: "10px 24px", backgroundColor: "#2196F3", color: "white",
                border: "none", borderRadius: 6,
                cursor: starting ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: "bold", opacity: starting ? 0.7 : 1,
              }}
            >
              {starting ? "Iniciant…" : "Iniciar classe"}
            </button>
          </div>
          {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
        </div>
      ) : (
        <>
          {/* Active class banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 20, padding: "12px 16px",
            backgroundColor: "#e8f5e9", borderRadius: 8, border: "1px solid #a5d6a7",
          }}>
            <span style={{ fontSize: 18 }}>
              Classe activa: <strong>{activeClass}</strong>
            </span>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              backgroundColor: "#4CAF50", display: "inline-block",
            }} />
            {lastUpdate && (
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
                Actualitzat: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* KC legend */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "6px 16px",
            marginBottom: 16, fontSize: 12, color: "#666",
          }}>
            {KC_LIST.map(({ short, full }) => (
              <span key={short}>
                <strong>{short}</strong> = {full}
              </span>
            ))}
          </div>

          {/* Colour legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 12 }}>
            {[
              { bg: "#ffcdd2", color: "#b71c1c", label: "P(L) < 0.40  Dificultat" },
              { bg: "#fff9c4", color: "#f57f17", label: "0.40 ≤ P(L) < 0.80  Parcialment après" },
              { bg: "#c8e6c9", color: "#1b5e20", label: "P(L) ≥ 0.80  Après" },
            ].map(({ bg, color, label }) => (
              <span key={label} style={{
                padding: "3px 10px", borderRadius: 4,
                backgroundColor: bg, color, fontWeight: "bold",
              }}>
                {label}
              </span>
            ))}
          </div>

          <h3 style={{ marginBottom: 12 }}>
            Progrés dels alumnes ({students.length})
          </h3>

          {students.length === 0 ? (
            <p style={{ color: "#888" }}>Cap alumne connectat encara.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1565C0" }}>
                    {/* Fixed columns */}
                    <Th>Alumne</Th>
                    <Th>Exercicis</Th>
                    <Th style={{ color: "#a5d6a7" }}>Passos correctes</Th>
                    <Th style={{ color: "#ef9a9a" }}>Passos incorrectes</Th>
                    <Th>Assignat a</Th>
                    {/* One column per KC */}
                    {KC_LIST.map(({ short }) => (
                      <Th key={short}>{short}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr
                      key={s.session_id}
                      style={{
                        backgroundColor: s.hand_raised
                          ? "#fff8e1"
                          : i % 2 === 0 ? "#ffffff" : "#f9f9f9",
                        outline: s.hand_raised ? "2px solid #ff9800" : "none",
                      }}
                    >
                      <Td>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                          {s.hand_raised && (
                            <span
                              title="L'alumne demana ajuda"
                              style={{ fontSize: 18, animation: "handWave 0.8s ease-in-out infinite alternate" }}
                            >
                              🖐
                            </span>
                          )}
                          <strong>{s.student_id}</strong>
                        </span>
                      </Td>
                      <Td>{Object.keys(s.problems).length}</Td>
                      <Td style={{ color: "#2e7d32", fontWeight: "bold" }}>
                        {s.total_correct ?? 0}
                      </Td>
                      <Td style={{ color: "#c62828", fontWeight: "bold" }}>
                        {s.total_incorrect ?? 0}
                      </Td>
                      <Td>
                        {s.assigned_to ? (
                          <span style={{
                            padding: "2px 8px", borderRadius: 4,
                            backgroundColor: "#e3f2fd", color: "#1565C0",
                            fontSize: 12, fontWeight: "bold",
                          }}>
                            {s.assigned_to}
                          </span>
                        ) : (
                          <span style={{ color: "#bbb", fontSize: 12 }}>—</span>
                        )}
                      </Td>
                      {KC_LIST.map(({ key }) => {
                        const p = s.knowledge_states?.[key];
                        return (
                          <Td key={key} style={{
                            backgroundColor: p != null ? kcBackground(p) : "transparent",
                            color:           p != null ? kcTextColor(p)  : "#bbb",
                            fontWeight: "bold",
                            textAlign: "center",
                          }}>
                            {p != null ? (p * 100).toFixed(0) + "%" : "—"}
                          </Td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "center",
        color: "white",
        fontWeight: "bold",
        borderRight: "1px solid rgba(255,255,255,0.15)",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "9px 14px",
        borderBottom: "1px solid #e0e0e0",
        borderRight: "1px solid #e0e0e0",
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
