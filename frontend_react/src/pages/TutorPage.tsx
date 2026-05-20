import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendLogs } from "../api/logApi";
import { raiseHand } from "../api/sessionApi";
import { getClassStatus } from "../api/classroomApi";
import type { CTATMessage } from "../types/ctat";

const FINAL_ASSESSMENT_IDS = ["level1Easy_v5", "level2Easy_v5", "level3Easy_v5"];

type LocationState = {
  sessionId: string;
  problemIds: string[];
  classCode: string;
  isFinalAssessment?: boolean;
};

const MOTIVATIONAL_MESSAGES = [
  "No passa res, la següent anirà millor!",
  "Un error és insignificant quan hi ha aprenentatge darrere!",
  "Equivoca't i aprèn, és la millor manera de progressar!",
  "Cada error t'acosta més a la solució correcta!",
  "No et rendeixis, ho pots aconseguir!",
  "Els errors formen part del procés d'aprenentatge!",
  "Intenta-ho de nou, estàs més a prop del que creus!",
  "Tots els grans matemàtics s'han equivocat alguna vegada!",
  "Endavant! Cada intent és un pas cap a la comprensió!",
  "No hi ha errors, només oportunitats per aprendre!",
  "Continua, estàs fent un gran esforç!",
  "Equivocar-se és d'humans. Persistir, de campions!",
  "Això és complicat, però tu ets capaç!",
  "Revisa el teu raonament i torna a intentar-ho!",
  "No t'amoïnis, tots passem per aquí quan aprenem!",
  "Amb cada intent, el teu cervell s'enforteix!",
  "Prova d'una altra manera, segur que hi arribes!",
  "La perseverança és la clau de l'èxit. Segueix endavant!",
  "Gairebé! Revisa els teus càlculs i ho tindràs!",
  "Cada error que superes et fa millor en matemàtiques!",
];

export default function TutorPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const st = loc.state as LocationState | null;

  const [sessionId] = useState(st?.sessionId ?? "");
  const [queue] = useState<string[]>(st?.problemIds ?? []);
  const [idx, setIdx] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [toast, setToast] = useState<{ message: string; top: string; left: string } | null>(null);
  const [handEnabled, setHandEnabled] = useState(false);
  const [handRaised, setHandRaised]   = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const isFinalAssessment = st?.isFinalAssessment ?? false;

  const bufferRef       = useRef<CTATMessage[]>([]);
  const flushTimerRef   = useRef<number | null>(null);
  const toastTimerRef   = useRef<number | null>(null);
  // stepAttempts: counts total ATTEMPT events per selection within the current problem
  const stepAttemptsRef = useRef<Record<string, number>>({});

  const currentProblemId = queue[idx];
  const isLastProblem = idx === queue.length - 1;

  // Build the iframe URL for the current exercise.
  // Versioned IDs (e.g. "level1Easy_v3") map to  /CTAT/level1Easy/HTML/HTML_level1Easy_v3.html
  // Legacy IDs (e.g. "Ex1")               map to  /CTAT/Ex1/HTML/Ex1.html
  const iframeSrc = useMemo(() => {
    if (!currentProblemId) return "";
    const versionMatch = currentProblemId.match(/^(.+)(_v\d+)$/);
    const path = versionMatch
      ? `/CTAT/${versionMatch[1]}/HTML/HTML_${currentProblemId}.html`
      : `/CTAT/${currentProblemId}/HTML/${currentProblemId}.html`;
    return `${path}?session_id=${encodeURIComponent(sessionId)}`;
  }, [currentProblemId, sessionId]);

  // Reset all per-problem state whenever a new problem loads
  useEffect(() => {
    setIsDone(false);
    setHandEnabled(false);
    setHandRaised(false);
    stepAttemptsRef.current = {};
  }, [idx]);

  // Redirect if user enters /tutor directly without state
  useEffect(() => {
    if (!st?.sessionId || !st?.problemIds?.length) nav("/");
  }, [st, nav]);

  // Poll class status every 10 s — show the final-assessment button when teacher ends session
  useEffect(() => {
    if (!st?.classCode || isFinalAssessment) return;
    const id = setInterval(async () => {
      try {
        const { ended } = await getClassStatus(st.classCode);
        if (ended) setSessionEnded(true);
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [st?.classCode, isFinalAssessment]);

  // Show a random motivational message at a random screen position for 4 s.
  // top:  10–70 vh  (keeps the box away from the very top and bottom)
  // left: 5–55 vw   (box is max 400px wide, so 55 vw + 400px fits most screens)
  function showToast() {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    const msg =
      MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const top  = `${10 + Math.random() * 60}vh`;
    const left = `${5  + Math.random() * 50}vw`;
    setToast({ message: msg, top, left });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }

  // Debounce log uploads: wait 700 ms after the last event before sending.
  // If the POST fails (e.g. network hiccup) the events are pushed back to the
  // front of the buffer so they are retried on the next flush.
  function scheduleFlush() {
    if (flushTimerRef.current !== null) return;

    flushTimerRef.current = window.setTimeout(async () => {
      flushTimerRef.current = null;

      const events = bufferRef.current.splice(0);
      if (!events.length || !sessionId) return;

      try {
        await sendLogs(sessionId, events);
      } catch {
        bufferRef.current.unshift(...events);
      }
    }, 700);
  }

  async function handleRaiseHand() {
    if (!handEnabled || handRaised) return;
    setHandRaised(true);
    setHandEnabled(false);
    try {
      await raiseHand(sessionId);
    } catch {
      // best-effort — teacher will see it on next poll if it arrives
    }
  }

  // Advance to the next problem, or navigate to /waiting when the queue is exhausted.
  // On the last problem, flush the log buffer immediately (bypassing the 700 ms debounce)
  // so the backend processes the round completion and deletes the old assignment before
  // WaitingPage starts polling — otherwise it would receive the stale assignment.
  async function handleNext() {
    if (!isDone) return;
    if (isLastProblem) {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const pending = bufferRef.current.splice(0);
      if (pending.length && sessionId) {
        try { await sendLogs(sessionId, pending); } catch {}
      }
      if (isFinalAssessment) {
        nav("/end", { state: { sessionId } });
      } else {
        nav("/waiting", { state: { sessionId, classCode: st?.classCode } });
      }
    } else {
      setIdx(idx + 1);
    }
  }

  function handleStartFinalAssessment() {
    nav("/tutor", {
      state: {
        sessionId,
        problemIds: FINAL_ASSESSMENT_IDS,
        classCode: st?.classCode,
        isFinalAssessment: true,
      },
    });
  }

  useEffect(() => {
    // Type guard — rejects non-CTAT postMessage events (e.g. from browser extensions).
    function isObject(value: unknown): value is Record<string, unknown> {
      return typeof value === "object" && value !== null;
    }

    function isCTATMessage(value: unknown): value is CTATMessage {
      if (!isObject(value)) return false;
      if (typeof value.kind !== "string") return false;
      if (typeof value.ts !== "string") return false;
      return "payload" in value;
    }

    // Pull a CDATA-wrapped value out of a CTAT XML payload (e.g. <input><![CDATA[6]]></input>).
    function extractCdata(tag: string, xml: string): string | null {
      const re = new RegExp(
        `<${tag}[^>]*>\\s*<!\\[CDATA\\[(.*?)\\]\\]>\\s*</${tag}>`,
        "s"
      );
      const m = xml.match(re);
      return m ? m[1] : null;
    }

    // Handle postMessage events from the CTAT iframe.
    // Enriches each event with problem context before buffering for upload.
    function onMessage(ev: MessageEvent<unknown>) {
      const raw = ev.data;

      if (!isCTATMessage(raw)) return;

      if (raw.kind === "CTAT_LOG_EVENT") {
        const xml =
          typeof raw.payload["xml"] === "string" ? raw.payload["xml"] : "";

        const input = extractCdata("input", xml);
        const selection = (() => {
          const m = xml.match(/<selection>(.*?)<\/selection>/s);
          return m ? m[1] : null;
        })();
        const action = (() => {
          const m = xml.match(/<action>(.*?)<\/action>/s);
          return m ? m[1] : null;
        })();
        const kc = (() => {
          // DataShop format: <skill><name><![CDATA[KC_NAME]]></name>...
          const m = xml.match(/<skill[^>]*>.*?<name[^>]*>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/name>/s);
          if (m) return m[1].trim();
          // Fallback: <skill_label>...</skill_label>
          const m2 = xml.match(/<skill_label[^>]*>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/skill_label>/s);
          return m2 ? m2[1].trim() : null;
        })();

        const enriched: CTATMessage = {
          kind: "CTAT_LOG_EVENT",
          ts: raw.ts,
          payload: {
            ...raw.payload,
            problemId: currentProblemId,
            stepIndex: idx,
            selection,
            action,
            input,
            kc,
          },
        };

        console.log("CTAT_LOG_EVENT:", JSON.parse(JSON.stringify(enriched.payload)));

        // Count attempts per step — enable hand button after 3 on the same step
        if (xml.includes('name="ATTEMPT"') && selection) {
          const counts = stepAttemptsRef.current;
          counts[selection] = (counts[selection] ?? 0) + 1;
          if (counts[selection] >= 3 && !handRaised) {
            setHandEnabled(true);
          }
        }

        if (xml.includes("INCORRECT")) showToast();

        bufferRef.current.push(enriched);
        scheduleFlush();
        return;
      }

      if (raw.kind === "CTAT_PROBLEM_DONE") {
        console.log("CTAT_PROBLEM_DONE:", raw.payload);

        bufferRef.current.push({
          kind: "CTAT_PROBLEM_DONE",
          ts: new Date().toISOString(),
          payload: { problemId: currentProblemId },
        });
        scheduleFlush();

        // Unlock the next button — student must click it to proceed
        setIsDone(true);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [idx, queue, sessionId, currentProblemId]);

  if (!currentProblemId) {
    return <div style={{ padding: 24 }}>Carregant…</div>;
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #ddd",
          fontFamily: "Arial",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <span><strong>Problema:</strong> {currentProblemId}</span>
        <span><strong>Exercici:</strong> {idx + 1} / {queue.length}</span>

        {/* Session-ended banner */}
        {sessionEnded && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 14px", backgroundColor: "#fff3e0",
            borderRadius: 8, border: "1px solid #ffb74d",
          }}>
            <span style={{ fontSize: 13, color: "#e65100", fontWeight: "bold" }}>
              El professor ha finalitzat la sessió
            </span>
            <button
              onClick={handleStartFinalAssessment}
              style={{
                padding: "5px 12px", backgroundColor: "#e65100",
                color: "white", border: "none", borderRadius: 6,
                cursor: "pointer", fontSize: 12, fontWeight: "bold",
              }}
            >
              Fer prova final
            </button>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Hand button — enabled after 3 attempts on the same step */}
          <button
            onClick={handleRaiseHand}
            disabled={!handEnabled}
            title={
              handRaised
                ? "Professor notificat!"
                : handEnabled
                ? "Demanar ajuda al professor"
                : "Disponible després de 3 intents al mateix pas"
            }
            style={{
              fontSize: 22,
              padding: "4px 12px",
              borderRadius: 8,
              border: `2px solid ${handRaised ? "#4caf50" : handEnabled ? "#ff9800" : "#ddd"}`,
              backgroundColor: handRaised ? "#e8f5e9" : handEnabled ? "#fff3e0" : "#f5f5f5",
              color: handRaised ? "#2e7d32" : "#555",
              cursor: handEnabled ? "pointer" : "not-allowed",
              animation: handEnabled && !handRaised ? "handPulse 1.2s ease-in-out infinite" : "none",
              transition: "all 0.2s",
            }}
          >
            {handRaised ? "✓" : "🖐"}
          </button>

          <button
            onClick={handleNext}
            disabled={!isDone}
            style={{
              padding: "8px 20px",
              backgroundColor: isDone ? "#4CAF50" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: isDone ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: 14,
              transition: "background-color 0.2s",
            }}
          >
            {isLastProblem ? "Finalitzar" : "Següent →"}
          </button>
        </div>
      </div>

      {/* Motivational toast — appears at a random position when a step is incorrect */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes handPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(255,152,0,0.5); }
          50%       { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(255,152,0,0); }
        }
      `}</style>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: toast.top,
            left: toast.left,
            backgroundColor: "#e65100",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: 12,
            fontFamily: "Arial",
            fontSize: 15,
            fontWeight: "bold",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            maxWidth: 400,
            zIndex: 9999,
            animation: "toastIn 0.25s ease",
            pointerEvents: "none",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Iframe */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f8",
        }}
      >
        <iframe
          title="CTAT Tutor"
          src={iframeSrc}
          style={{
            width: "100vw",
            maxWidth: 1200,
            height: "80vh",
            border: "none",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(173, 173, 173, 0.1)",
            background: "white",
          }}
        />
      </div>
    </div>
  );
}
