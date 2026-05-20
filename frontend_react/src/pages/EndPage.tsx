import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getResults } from "../api/sessionApi";

type Results = {
  initial_states: Record<string, number>;
  final_states:   Record<string, number>;
};

const KC_LIST = [
  { key: "move_constants",               label: "Move constants" },
  { key: "remove_coefficient",           label: "Remove coefficient" },
  { key: "combine_like_terms",           label: "Combine like terms" },
  { key: "expand_eliminate_parentheses", label: "Expand / eliminate parentheses" },
  { key: "normalize_negative_sign",      label: "Normalize negative sign" },
];

function pctColor(p: number): string {
  if (p < 0.40) return "#c62828";
  if (p < 0.80) return "#f57f17";
  return "#2e7d32";
}

function pctBg(p: number): string {
  if (p < 0.40) return "#ffcdd2";
  if (p < 0.80) return "#fff9c4";
  return "#c8e6c9";
}

function DeltaBadge({ delta }: { delta: number }) {
  const improved = delta > 0.005;
  const declined = delta < -0.005;
  const symbol = improved ? "▲" : declined ? "▼" : "—";
  const color  = improved ? "#2e7d32" : declined ? "#c62828" : "#888";
  return (
    <span style={{ color, fontWeight: "bold", fontSize: 13 }}>
      {symbol} {improved || declined ? `${(Math.abs(delta) * 100).toFixed(0)}%` : ""}
    </span>
  );
}

export default function EndPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const st  = loc.state as { sessionId?: string } | null;
  const sessionId = st?.sessionId ?? "";

  const [results, setResults] = useState<Results | null>(null);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    getResults(sessionId)
      .then(setResults)
      .catch(() => setError(true));
  }, [sessionId]);

  const masteredCount = results
    ? KC_LIST.filter(({ key }) => (results.final_states[key] ?? 0) >= 0.80).length
    : 0;

  return (
    <div
      style={{
        minHeight: "100vh", width: "100vw",
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#f5f6f8", fontFamily: "Verdana",
      }}
    >
      <div
        style={{
          width: "min(680px, 94vw)", padding: 36,
          backgroundColor: "white", borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#1a1a2e", marginBottom: 6 }}>
          Sessió completada!
        </h2>
        <p style={{ textAlign: "center", color: "#666", marginBottom: 28, fontSize: 14 }}>
          Aquí tens el resum del teu progrés al llarg de la sessió.
        </p>

        {error && (
          <p style={{ color: "crimson", textAlign: "center" }}>
            No s'han pogut carregar els resultats.
          </p>
        )}

        {results && (
          <>
            {/* Summary pill */}
            <div style={{
              textAlign: "center", marginBottom: 28,
              padding: "12px 20px", borderRadius: 10,
              backgroundColor: masteredCount === KC_LIST.length ? "#e8f5e9" : "#fff3e0",
              border: `1px solid ${masteredCount === KC_LIST.length ? "#a5d6a7" : "#ffcc80"}`,
            }}>
              <span style={{ fontSize: 15, fontWeight: "bold",
                color: masteredCount === KC_LIST.length ? "#2e7d32" : "#e65100" }}>
                {masteredCount === KC_LIST.length
                  ? "Has dominat tots els conceptes. Excel·lent feina!"
                  : `Has dominat ${masteredCount} de ${KC_LIST.length} conceptes. Continua practicant!`}
              </span>
            </div>

            {/* Results table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#1565C0" }}>
                  {["Concepte", "Inici (diagnosi)", "Final (prova)", "Canvi"].map(h => (
                    <th key={h} style={{
                      padding: "10px 12px", color: "white",
                      fontWeight: "bold", textAlign: "center",
                      borderRight: "1px solid rgba(255,255,255,0.15)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KC_LIST.map(({ key, label }, i) => {
                  const ini   = results.initial_states[key] ?? 0;
                  const fin   = results.final_states[key]   ?? 0;
                  const delta = fin - ini;
                  return (
                    <tr key={key} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                        {label}
                      </td>
                      <td style={{
                        padding: "10px 12px", textAlign: "center",
                        borderBottom: "1px solid #eee",
                        backgroundColor: pctBg(ini), color: pctColor(ini), fontWeight: "bold",
                      }}>
                        {(ini * 100).toFixed(0)}%
                      </td>
                      <td style={{
                        padding: "10px 12px", textAlign: "center",
                        borderBottom: "1px solid #eee",
                        backgroundColor: pctBg(fin), color: pctColor(fin), fontWeight: "bold",
                      }}>
                        {(fin * 100).toFixed(0)}%
                      </td>
                      <td style={{
                        padding: "10px 12px", textAlign: "center",
                        borderBottom: "1px solid #eee",
                      }}>
                        <DeltaBadge delta={delta} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", fontSize: 11 }}>
              {[
                { bg: "#ffcdd2", color: "#c62828", label: "P(L) < 0.40  En dificultat" },
                { bg: "#fff9c4", color: "#f57f17", label: "0.40 ≤ P(L) < 0.80  Parcialment après" },
                { bg: "#c8e6c9", color: "#2e7d32", label: "P(L) ≥ 0.80  Après" },
              ].map(({ bg, color, label }) => (
                <span key={label} style={{
                  padding: "3px 10px", borderRadius: 4,
                  backgroundColor: bg, color, fontWeight: "bold",
                }}>{label}</span>
              ))}
            </div>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={() => nav("/")}
            style={{
              padding: "10px 28px", backgroundColor: "#1565C0",
              color: "white", border: "none", borderRadius: 8,
              cursor: "pointer", fontSize: 14, fontWeight: "bold",
            }}
          >
            Tornar a l'inici
          </button>
        </div>
      </div>
    </div>
  );
}
