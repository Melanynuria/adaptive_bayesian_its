import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAssignment } from "../api/sessionApi";
import { getClassStatus } from "../api/classroomApi";

const FINAL_ASSESSMENT_IDS = ["level1Easy_v5", "level2Easy_v5", "level3Easy_v5"];

type LocationState = {
  sessionId: string;
  classCode: string;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  Easy: "Fàcil",
  Medium: "Mitjà",
  Difficult: "Difícil",
};

export default function WaitingPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const st  = loc.state as LocationState | null;

  const [dots, setDots]         = useState(".");
  const [assigned, setAssigned] = useState<{ level: string; difficulty: string } | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Animated dots while waiting
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      500,
    );
    return () => clearInterval(id);
  }, []);

  // Poll class status every 10 s for session end
  useEffect(() => {
    if (!st?.classCode) return;
    const id = setInterval(async () => {
      try {
        const { ended } = await getClassStatus(st.classCode);
        if (ended) setSessionEnded(true);
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [st?.classCode]);

  // Poll every 3 s for the personalised assignment
  useEffect(() => {
    if (!st?.sessionId) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getAssignment(st!.sessionId);
        if (cancelled || !data.ready) return;

        setAssigned({ level: data.level, difficulty: data.difficulty });

        // Brief pause so the student sees what was assigned before navigating
        setTimeout(() => {
          if (!cancelled) {
            nav("/tutor", {
              state: {
                sessionId:  st!.sessionId,
                problemIds: data.problem_ids,
                classCode:  st!.classCode,
              },
            });
          }
        }, 2500);
      } catch {
        // silent — BKT may not be done yet
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [st, nav]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Verdana",
        backgroundColor: "#f5f6f8",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: 48,
          backgroundColor: "white",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          maxWidth: 520,
          width: "90%",
        }}
      >
        {sessionEnded ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <h2 style={{ marginBottom: 12, color: "#e65100" }}>
              El professor ha finalitzat la sessió
            </h2>
            <p style={{ color: "#555", fontSize: 15, marginBottom: 20 }}>
              És hora de fer la prova final per veure tot el que has après!
            </p>
            <button
              onClick={() => nav("/tutor", {
                state: {
                  sessionId: st!.sessionId,
                  problemIds: FINAL_ASSESSMENT_IDS,
                  classCode: st!.classCode,
                  isFinalAssessment: true,
                },
              })}
              style={{
                padding: "12px 28px", backgroundColor: "#e65100",
                color: "white", border: "none", borderRadius: 8,
                cursor: "pointer", fontSize: 15, fontWeight: "bold",
              }}
            >
              Fer la prova final
            </button>
          </>
        ) : !assigned ? (
          <>
            <Spinner />
            <h2 style={{ marginBottom: 12, marginTop: 20, color: "#1a1a2e" }}>
              Molt bé, segueix així!
            </h2>
            <p style={{ color: "#555", fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
              Analitzant el teu progrés{dots}
            </p>
            <p style={{ color: "#aaa", fontSize: 13 }}>
              En un moment rebràs els teus pròxims exercicis personalitzats.
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 52,
                color: "#2e7d32",
                marginBottom: 12,
                lineHeight: 1,
              }}
            >
              ✓
            </div>
            <h2 style={{ marginBottom: 12, color: "#2e7d32" }}>
              Exercicis assignats!
            </h2>
            <p style={{ fontSize: 15, color: "#555", marginBottom: 6 }}>
              Nivell:{" "}
              <strong>{assigned.level.replace("level", "Nivell ")}</strong>
              {"   ·   "}
              Dificultat:{" "}
              <strong>
                {DIFFICULTY_LABEL[assigned.difficulty] ?? assigned.difficulty}
              </strong>
            </p>
            <p style={{ color: "#aaa", fontSize: 13 }}>
              Carregant els exercicis{dots}
            </p>
          </>
        )}

        {st?.classCode && (
          <p style={{ color: "#ccc", fontSize: 12, marginTop: 32 }}>
            Classe: {st.classCode}
          </p>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      style={{ display: "block", margin: "0 auto" }}
    >
      <circle cx="28" cy="28" r="22" fill="none" stroke="#e0e0e0" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r="22"
        fill="none"
        stroke="#2196F3"
        strokeWidth="5"
        strokeDasharray="60 80"
        strokeLinecap="round"
        style={{
          transformOrigin: "28px 28px",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
