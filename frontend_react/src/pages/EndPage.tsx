import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getResults } from "../api/sessionApi";

type Results = {
  initial_states:           Record<string, number>;
  final_states:             Record<string, number>;
  normalized_learning_gain: Record<string, number>;
};

const KC_LIST = [
  { key: "move_constants",               label: "Move constants" },
  { key: "remove_coefficient",           label: "Remove coefficient" },
  { key: "combine_like_terms",           label: "Combine like terms" },
  { key: "expand_eliminate_parentheses", label: "Expand / eliminate parentheses" },
  { key: "normalize_negative_sign",      label: "Normalize negative sign" },
];

function pctColor(p: number) { return p < 0.40 ? "#c62828" : p < 0.80 ? "#f57f17" : "#2e7d32"; }
function pctBg(p: number)    { return p < 0.40 ? "#ffcdd2" : p < 0.80 ? "#fff9c4" : "#c8e6c9"; }

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta > 0.005, dn = delta < -0.005;
  return (
    <span style={{ color: up ? "#2e7d32" : dn ? "#c62828" : "#888", fontWeight: "bold", fontSize: 13 }}>
      {up ? "▲" : dn ? "▼" : "—"}{" "}
      {(up || dn) ? `${(Math.abs(delta) * 100).toFixed(0)}%` : ""}
    </span>
  );
}

function NLGBadge({ nlg }: { nlg: number }) {
  const color = nlg > 0.4 ? "#2e7d32" : nlg > 0 ? "#f57f17" : "#888";
  return (
    <span style={{ color, fontWeight: "bold", fontSize: 13 }}>
      {nlg > 0 ? "+" : ""}{(nlg * 100).toFixed(0)}%
    </span>
  );
}

export default function EndPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const st  = loc.state as { sessionId?: string } | null;
  const sessionId = st?.sessionId ?? "";

  const [results, setResults]         = useState<Results | null>(null);
  const [error, setError]             = useState(false);
  const [showNLGInfo, setShowNLGInfo] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    getResults(sessionId).then(setResults).catch(() => setError(true));
  }, [sessionId]);

  const masteredCount = results
    ? KC_LIST.filter(({ key }) => (results.final_states[key] ?? 0) >= 0.80).length
    : 0;
  const allMastered = masteredCount === KC_LIST.length;

  return (
    <>
      <style>{`
        body { margin: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ep-back-btn {
          padding: 12px 32px;
          background: linear-gradient(90deg, #0d5b6e, #15a4c0);
          color: white; border: none; border-radius: 12px;
          cursor: pointer; font-size: 15px; font-weight: 800;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(21,164,192,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ep-back-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(21,164,192,0.45);
        }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100vw",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #0d5b6e 0%, #15a4c0 55%, #2ab3a3 100%)",
        fontFamily: "Verdana, sans-serif",
        padding: "32px 16px", boxSizing: "border-box",
      }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 36 }}>✏️</span>
          <div style={{ color: "white", fontWeight: 900, fontSize: 22, letterSpacing: 0.5, marginTop: 4 }}>
            Solve2Learn
          </div>
        </div>

        {/* Card */}
        <div style={{
          width: "min(720px, 96vw)",
          backgroundColor: "white", borderRadius: 24,
          padding: "36px 32px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          animation: "fadeUp 0.4s ease",
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>
              {allMastered ? "🏆" : "📊"}
            </div>
            <h2 style={{ margin: "0 0 6px", color: "#1a1a2e", fontSize: 22 }}>
              Sessió completada!
            </h2>
            <p style={{ margin: 0, color: "#777", fontSize: 14 }}>
              Aquí tens el resum del teu progrés al llarg de la sessió.
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: "#ffebee", border: "1.5px solid #ef9a9a",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              color: "#c62828", fontSize: 13, fontWeight: 600, textAlign: "center",
            }}>
              ⚠️ No s'han pogut carregar els resultats.
            </div>
          )}

          {results && (
            <>
              {/* Summary pill */}
              <div style={{
                textAlign: "center", marginBottom: 24,
                padding: "14px 20px", borderRadius: 12,
                backgroundColor: allMastered ? "#e8f5e9" : "#fff3e0",
                border: `1.5px solid ${allMastered ? "#a5d6a7" : "#ffcc80"}`,
              }}>
                <span style={{ fontSize: 15, fontWeight: 800,
                  color: allMastered ? "#2e7d32" : "#e65100" }}>
                  {allMastered
                    ? "🌟 Has dominat tots els conceptes. Excel·lent feina!"
                    : `Has dominat ${masteredCount} de ${KC_LIST.length} conceptes. Continua practicant! 💪`}
                </span>
              </div>

              {/* Results table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(90deg, #0d5b6e, #15a4c0)" }}>
                      {(["Concepte", "Inici (diagnosi)", "Final (prova)", "Canvi"] as const).map(h => (
                        <th key={h} style={{
                          padding: "11px 12px", color: "white", fontWeight: 800,
                          textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.15)",
                        }}>{h}</th>
                      ))}
                      <th style={{
                        padding: "11px 12px", color: "white", fontWeight: 800,
                        textAlign: "center",
                      }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          Guany normalitzat
                          <button
                            onClick={() => setShowNLGInfo(v => !v)}
                            title="Més informació"
                            style={{
                              background: showNLGInfo ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)",
                              border: "1px solid rgba(255,255,255,0.6)",
                              borderRadius: "50%", color: "white",
                              width: 18, height: 18, fontSize: 11,
                              cursor: "pointer", fontWeight: "bold",
                              padding: 0, display: "inline-flex",
                              alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >?</button>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {KC_LIST.map(({ key, label }, i) => {
                      const ini   = results.initial_states[key]           ?? 0;
                      const fin   = results.final_states[key]             ?? 0;
                      const delta = fin - ini;
                      const nlg   = results.normalized_learning_gain[key] ?? 0;
                      return (
                        <tr key={key} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>{label}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #eee",
                            backgroundColor: pctBg(ini), color: pctColor(ini), fontWeight: "bold" }}>
                            {(ini * 100).toFixed(0)}%
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #eee",
                            backgroundColor: pctBg(fin), color: pctColor(fin), fontWeight: "bold" }}>
                            {(fin * 100).toFixed(0)}%
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <DeltaBadge delta={delta} />
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <NLGBadge nlg={nlg} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Colour legend */}
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", fontSize: 11 }}>
                {[
                  { bg: "#ffcdd2", color: "#c62828", label: "P(L) < 0.40  En dificultat" },
                  { bg: "#fff9c4", color: "#f57f17", label: "0.40 ≤ P(L) < 0.80  Parcialment après" },
                  { bg: "#c8e6c9", color: "#2e7d32", label: "P(L) ≥ 0.80  Après" },
                ].map(({ bg, color, label }) => (
                  <span key={label} style={{
                    padding: "3px 10px", borderRadius: 6,
                    backgroundColor: bg, color, fontWeight: "bold",
                  }}>{label}</span>
                ))}
              </div>

              {/* NLG info box */}
              {showNLGInfo && (
                <div style={{
                  marginTop: 14, padding: "14px 40px 14px 16px",
                  backgroundColor: "#e3f2fd", borderRadius: 10,
                  border: "1.5px solid #90caf9",
                  fontSize: 13, color: "#0d47a1", lineHeight: 1.75,
                  position: "relative",
                }}>
                  <button
                    onClick={() => setShowNLGInfo(false)}
                    style={{
                      position: "absolute", top: 8, right: 10,
                      background: "none", border: "none",
                      fontSize: 18, cursor: "pointer", color: "#5c6bc0", lineHeight: 1,
                    }}
                  >×</button>
                  <strong>Guany normalitzat (Normalized Learning Gain)</strong><br /><br />
                  Mesura quant has millorat tenint en compte el teu punt de partida. La fórmula és:<br />
                  <code style={{ backgroundColor: "#bbdefb", padding: "2px 6px", borderRadius: 4 }}>
                    (final − inici) / (1 − inici)
                  </code>
                  <br /><br />
                  <strong>Exemple:</strong> si comences amb 65% i acabes amb 87%:<br />
                  (0,87 − 0,65) / (1 − 0,65) = <strong>+63%</strong><br /><br />
                  Permet comparar el progrés de manera <strong>justa</strong> entre alumnes que comencen
                  en nivells molt diferents.
                </div>
              )}
            </>
          )}

          {/* Survey */}
          <div style={{
            marginTop: 28,
            padding: "20px 24px",
            backgroundColor: "#e3f2fd",
            border: "1.5px solid #90caf9",
            borderRadius: 14,
            textAlign: "center",
          }}>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0d47a1" }}>
              📋 Ajuda'ns a millorar!
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#1565C0", lineHeight: 1.6 }}>
              Dedica 2 minuts a respondre aquest breu formulari sobre la teva experiència.
            </p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSeEkPc4TNAy83GwpJejfFgzy2VCQfxFexMz4RQ1EFjrTerjTQ/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "11px 28px",
                background: "linear-gradient(90deg, #1565C0, #1e88e5)",
                color: "white",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(21,101,192,0.30)",
              }}
            >
              Omplir el formulari →
            </a>
          </div>

          {/* Back button */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button className="ep-back-btn" onClick={() => nav("/")}>
              Tornar a l'inici 🏠
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
