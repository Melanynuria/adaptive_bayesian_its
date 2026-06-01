import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAssignment } from "../api/sessionApi";
import { getClassStatus } from "../api/classroomApi";

type LocationState = {
  sessionId: string;
  classCode: string;
};

const DIFFICULTY_LABEL: Record<string, string> = {
  Easy:      "Fàcil",
  Medium:    "Mitjà",
  Difficult: "Difícil",
};

export default function WaitingPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const st  = loc.state as LocationState | null;

  const [dots, setDots]               = useState(".");
  const [assigned, setAssigned]       = useState<{ level: string; difficulty: string } | null>(null);
  const [mastered, setMastered]       = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Animated dots while waiting
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
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

  // Navigate to results when teacher ends the session
  useEffect(() => {
    if (!sessionEnded || !st?.sessionId) return;
    nav("/end", { state: { sessionId: st.sessionId } });
  }, [sessionEnded, st?.sessionId, nav]);

  // Poll every 3 s for the personalised assignment
  useEffect(() => {
    if (!st?.sessionId) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getAssignment(st!.sessionId);
        if (cancelled || !data.ready) return;
        if (data.mastery) { setMastered(true); return; }
        setAssigned({ level: data.level, difficulty: data.difficulty });
        setTimeout(() => {
          if (!cancelled)
            nav("/tutor", { state: { sessionId: st!.sessionId, problemIds: data.problem_ids, classCode: st!.classCode } });
        }, 2500);
      } catch { /* silent — BKT may still be running */ }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [st, nav]);

  return (
    <>
      <style>{`
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
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
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 36 }}>✏️</span>
          <div style={{ color: "white", fontWeight: 900, fontSize: 22, letterSpacing: 0.5, marginTop: 4 }}>
            Solve2Learn
          </div>
        </div>

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 480,
          backgroundColor: "white", borderRadius: 24,
          padding: "40px 36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          textAlign: "center",
          animation: "fadeUp 0.4s ease",
        }}>

          {mastered ? (
            <>
              <div style={{ fontSize: 60, marginBottom: 14 }}>🏆</div>
              <h2 style={{ margin: "0 0 12px", color: "#2e7d32", fontSize: 22 }}>
                Has dominat tots els conceptes!
              </h2>
              <p style={{ color: "#555", fontSize: 15, lineHeight: 1.7, margin: "0 0 16px" }}>
                Has assolit un nivell alt de domini en tots els conceptes de la sessió.
                <br /><strong>Molt ben fet!</strong>
              </p>
              <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>
                Espera que el professor finalitzi la sessió per veure els resultats.
              </p>
            </>

          ) : !assigned ? (
            <>
              <TealSpinner />
              <h2 style={{ margin: "20px 0 10px", color: "#1a1a2e", fontSize: 20 }}>
                Molt bé, segueix així! 💪
              </h2>
              <p style={{ color: "#555", fontSize: 15, lineHeight: 1.7, margin: "0 0 8px" }}>
                Analitzant el teu progrés{dots}
              </p>
              <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>
                En un moment rebràs els teus pròxims exercicis personalitzats.
              </p>
            </>

          ) : (
            <>
              <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>✅</div>
              <h2 style={{ margin: "0 0 12px", color: "#2e7d32", fontSize: 20 }}>
                Exercicis assignats!
              </h2>
              <div style={{
                display: "inline-flex", gap: 16,
                padding: "10px 20px", borderRadius: 12,
                backgroundColor: "#e3f2fd",
                border: "1.5px solid #90caf9",
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 14, color: "#1565C0", fontWeight: 700 }}>
                  Nivell: <strong>{assigned.level.replace("level", "Nivell ")}</strong>
                </span>
                <span style={{ color: "#bbb" }}>·</span>
                <span style={{ fontSize: 14, color: "#1565C0", fontWeight: 700 }}>
                  Dificultat: <strong>{DIFFICULTY_LABEL[assigned.difficulty] ?? assigned.difficulty}</strong>
                </span>
              </div>
              <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>
                Carregant els exercicis{dots}
              </p>
            </>
          )}

          {st?.classCode && (
            <p style={{ color: "#ccc", fontSize: 11, marginTop: 28, marginBottom: 0 }}>
              Classe: {st.classCode}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function TealSpinner() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ display: "block", margin: "0 auto" }}>
      <circle cx="28" cy="28" r="22" fill="none" stroke="#e0e0e0" strokeWidth="5" />
      <circle
        cx="28" cy="28" r="22"
        fill="none" stroke="#15a4c0" strokeWidth="5"
        strokeDasharray="60 80" strokeLinecap="round"
        style={{ transformOrigin: "28px 28px", animation: "spin 1s linear infinite" }}
      />
    </svg>
  );
}
