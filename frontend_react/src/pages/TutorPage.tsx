import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendLogs } from "../api/logApi";
import { raiseHand } from "../api/sessionApi";
import { getClassStatus } from "../api/classroomApi";
import type { CTATMessage } from "../types/ctat";

type LocationState = {
  sessionId: string;
  problemIds: string[];
  classCode: string;
};

const MOTIVATIONAL_MESSAGES = [
  { emoji: "💪", text: "No passa res, la següent anirà millor!" },
  { emoji: "🧠", text: "Cada error enforteix el teu cervell!" },
  { emoji: "🎯", text: "Cada error t'acosta més a la solució correcta!" },
  { emoji: "🚀", text: "No et rendeixis, ho pots aconseguir!" },
  { emoji: "⭐", text: "Continua, estàs fent un gran esforç!" },
  { emoji: "🏆", text: "Equivocar-se és d'humans. Persistir, de campions!" },
  { emoji: "🔥", text: "Això és complicat, però tu ets capaç!" },
  { emoji: "💡", text: "Revisa el teu raonament i torna a intentar-ho!" },
  { emoji: "🌟", text: "Gairebé! Revisa els teus càlculs i ho tindràs!" },
  { emoji: "📚", text: "Tots els grans matemàtics s'han equivocat alguna vegada!" },
  { emoji: "✨", text: "Intenta-ho de nou, estàs més a prop del que creus!" },
  { emoji: "👊", text: "La perseverança és la clau de l'èxit. Segueix endavant!" },
  { emoji: "🎓", text: "Cada error que superes et fa millor en matemàtiques!" },
  { emoji: "💫", text: "Prova d'una altra manera, segur que hi arribes!" },
  { emoji: "🌈", text: "No t'amoïnis, tots passem per aquí quan aprenem!" },
];

export default function TutorPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const st  = loc.state as LocationState | null;

  const [sessionId]  = useState(st?.sessionId ?? "");
  const [queue]      = useState<string[]>(st?.problemIds ?? []);
  const [idx, setIdx]          = useState(0);
  const [isDone, setIsDone]       = useState(false);
  const [shakeNext, setShakeNext] = useState(false);
  const [toast, setToast]      = useState<{ emoji: string; text: string; top: string; left: string } | null>(null);
  const [handEnabled, setHandEnabled]   = useState(false);
  const [handRaised,  setHandRaised]    = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [messagesEnabled, setMessagesEnabled] = useState(true);

  const bufferRef       = useRef<CTATMessage[]>([]);
  const flushTimerRef   = useRef<number | null>(null);
  const toastTimerRef   = useRef<number | null>(null);
  const stepAttemptsRef = useRef<Record<string, number>>({});

  const currentProblemId = queue[idx];
  const isLastProblem    = idx === queue.length - 1;

  const iframeSrc = useMemo(() => {
    if (!currentProblemId) return "";
    const versionMatch = currentProblemId.match(/^(.+)(_v\d+)$/);
    const path = versionMatch
      ? `/CTAT/${versionMatch[1]}/HTML/HTML_${currentProblemId}.html`
      : `/CTAT/${currentProblemId}/HTML/${currentProblemId}.html`;
    return `${path}?session_id=${encodeURIComponent(sessionId)}`;
  }, [currentProblemId, sessionId]);

  // Reset per-problem state on each new exercise
  useEffect(() => {
    setIsDone(false);
    setHandEnabled(false);
    setHandRaised(false);
    stepAttemptsRef.current = {};
  }, [idx]);

  // Redirect if navigated to /tutor without state
  useEffect(() => {
    if (!st?.sessionId || !st?.problemIds?.length) nav("/");
  }, [st, nav]);

  // Poll class status every 10 s
  useEffect(() => {
    if (!st?.classCode) return;
    async function fetchStatus() {
      try {
        const status = await getClassStatus(st!.classCode);
        if (status.ended) setSessionEnded(true);
        setMessagesEnabled(status.messages_enabled);
      } catch { /* silent */ }
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 10_000);
    return () => clearInterval(id);
  }, [st?.classCode]);

  function showToast() {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    const pick = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const top  = `${10 + Math.random() * 60}vh`;
    const left = `${5  + Math.random() * 50}vw`;
    setToast({ ...pick, top, left });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }

  async function flushBuffer() {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const events = bufferRef.current.splice(0);
    if (!events.length || !sessionId) return;
    try {
      await sendLogs(sessionId, events);
    } catch {
      bufferRef.current.unshift(...events);
    }
  }

  function scheduleFlush() {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushBuffer();
    }, 700);
  }

  async function handleRaiseHand() {
    if (!handEnabled || handRaised) return;
    setHandRaised(true);
    setHandEnabled(false);
    try { await raiseHand(sessionId); } catch { /* best-effort */ }
  }

  async function handleNext() {
    if (!isDone) return;
    if (isLastProblem) {
      await flushBuffer();
      if (sessionEnded) {
        nav("/end",     { state: { sessionId } });
      } else {
        nav("/waiting", { state: { sessionId, classCode: st?.classCode } });
      }
    } else {
      setIdx(idx + 1);
    }
  }

  useEffect(() => {
    function isObject(v: unknown): v is Record<string, unknown> {
      return typeof v === "object" && v !== null;
    }
    function isCTATMessage(v: unknown): v is CTATMessage {
      if (!isObject(v)) return false;
      return typeof v.kind === "string" && typeof v.ts === "string" && "payload" in v;
    }
    function extractCdata(tag: string, xml: string): string | null {
      const re = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[(.*?)\\]\\]>\\s*</${tag}>`, "s");
      const m = xml.match(re);
      return m ? m[1] : null;
    }

    function onMessage(ev: MessageEvent<unknown>) {
      const raw = ev.data;
      if (!isCTATMessage(raw)) return;

      if (raw.kind === "CTAT_LOG_EVENT") {
        const xml = typeof raw.payload["xml"] === "string" ? raw.payload["xml"] : "";
        const input     = extractCdata("input", xml);
        const selection = xml.match(/<selection>(.*?)<\/selection>/s)?.[1] ?? null;
        const action    = xml.match(/<action>(.*?)<\/action>/s)?.[1] ?? null;
        const kc = (() => {
          const m = xml.match(/<skill[^>]*>.*?<name[^>]*>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/name>/s);
          if (m) return m[1].trim();
          const m2 = xml.match(/<skill_label[^>]*>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/skill_label>/s);
          return m2 ? m2[1].trim() : null;
        })();

        const enriched: CTATMessage = {
          kind: "CTAT_LOG_EVENT",
          ts: raw.ts,
          payload: { ...raw.payload, problemId: currentProblemId, stepIndex: idx, selection, action, input, kc },
        };

        console.log("CTAT_LOG_EVENT:", JSON.parse(JSON.stringify(enriched.payload)));

        if (xml.includes('name="ATTEMPT"') && selection) {
          const counts = stepAttemptsRef.current;
          counts[selection] = (counts[selection] ?? 0) + 1;
          if (counts[selection] >= 3 && !handRaised) setHandEnabled(true);
        }

        if (xml.includes("INCORRECT") && messagesEnabled) showToast();

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
        flushBuffer();
        setIsDone(true);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [idx, queue, sessionId, currentProblemId]);

  if (!currentProblemId) {
    return <div style={{ padding: 24, fontFamily: "Verdana" }}>Carregant…</div>;
  }

  /* ── derived colours ── */
  const handColor = handRaised ? "#2e7d32" : handEnabled ? "#e65100" : "#9e9e9e";
  const handBg    = handRaised ? "#e8f5e9" : handEnabled ? "#fff3e0" : "#f0f0f0";
  const handBorder= handRaised ? "#81c784" : handEnabled ? "#ffb74d" : "#e0e0e0";

  return (
    <>
      <style>{`
        body { margin: 0; }

        /* ── progress dot ── */
        .tp-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.3s, transform 0.3s;
        }

        /* ── next button ── */
        .tp-next {
          padding: 10px 24px;
          font-size: 15px;
          font-weight: 800;
          font-family: inherit;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
          white-space: nowrap;
        }
        .tp-next:disabled {
          background: #e0e0e0 !important;
          color: #999 !important;
          cursor: not-allowed;
          box-shadow: none !important;
        }
        .tp-next.done {
          background: linear-gradient(90deg, #2e7d32, #43a047);
          color: white;
          box-shadow: 0 4px 14px rgba(46,125,50,0.40);
          animation: nextPulse 1.4s ease-in-out infinite;
        }
        .tp-next.done:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(46,125,50,0.50);
        }
        .tp-next.shake {
          animation: nextShake 0.4s ease !important;
        }
        @keyframes nextShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }

        /* ── hand button ── */
        .tp-hand {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          white-space: nowrap;
        }
        .tp-hand:disabled { cursor: not-allowed; opacity: 0.6; }
        .tp-hand.pulsing  { animation: handPulse 1.2s ease-in-out infinite; }

        /* ── toast ── */
        .tp-toast {
          animation: toastSlide 0.35s cubic-bezier(.22,.68,0,1.2);
        }

        @keyframes nextPulse {
          0%,100% { box-shadow: 0 4px 14px rgba(46,125,50,0.40); }
          50%      { box-shadow: 0 6px 22px rgba(46,125,50,0.70); }
        }
        @keyframes handPulse {
          0%,100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(230,81,0,0.45); }
          50%      { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(230,81,0,0); }
        }
        @keyframes toastSlide {
          from { opacity:0; transform: translateY(24px) scale(0.9); }
          to   { opacity:1; transform: translateY(0)    scale(1);   }
        }
      `}</style>

      <div style={{
        width: "100vw", height: "100vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden", fontFamily: "Verdana, sans-serif",
      }}>

        {/* ══════════════════ HEADER ══════════════════ */}
        <div style={{
          background: "linear-gradient(90deg, #0d5b6e 0%, #15a4c0 60%, #2ab3a3 100%)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 64,
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <span style={{ fontSize: 22 }}>✏️</span>
            <span style={{ color: "white", fontWeight: 900, fontSize: 17, letterSpacing: 0.5 }}>
              Solve2Learn
            </span>
          </div>

          {/* ── Progress track (centre) ── */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            overflow: "hidden",
          }}>
            {/* dots */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {queue.map((_, i) => (
                <div
                  key={i}
                  className="tp-dot"
                  style={{
                    background:
                      i < idx  ? "#ffffff"          // completed → solid white
                    : i === idx ? (isDone ? "#a5d6a7" : "#ffffff") // current: green if done, white if working
                    :             "rgba(255,255,255,0.25)", // upcoming → ghost
                    transform: "scale(1)",
                    boxShadow: "none",
                  }}
                />
              ))}
            </div>
            {/* label */}
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>
              Exercici {idx + 1} de {queue.length}
            </span>
          </div>

          {/* ── Right controls ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

            {/* Session-ended badge */}
            {sessionEnded && (
              <div style={{
                padding: "5px 12px",
                backgroundColor: "#fff3e0",
                borderRadius: 8,
                border: "1.5px solid #ffb74d",
                fontSize: 12,
                color: "#e65100",
                fontWeight: 700,
              }}>
                ⏱️ Acaba l'exercici actual
              </div>
            )}

            {/* Hand / help button */}
            <button
              className={`tp-hand${handEnabled && !handRaised ? " pulsing" : ""}`}
              onClick={handleRaiseHand}
              disabled={!handEnabled}
              title={
                handRaised  ? "Professor notificat!"
                : handEnabled ? "Demanar ajuda al professor"
                :               "Disponible després de 3 intents al mateix pas"
              }
              style={{
                background: handBg,
                border: `2px solid ${handBorder}`,
                color: handColor,
              }}
            >
              <span style={{ fontSize: 18 }}>{handRaised ? "✅" : "🖐️"}</span>
              <span style={{ fontSize: 13 }}>
                {handRaised ? "Ajuda sol·licitada" : handEnabled ? "Necessito ajuda" : "Ajuda"}
              </span>
            </button>

            {/* Next / finish button */}
            <button
              className={`tp-next${isDone ? " done" : ""}${shakeNext ? " shake" : ""}`}
              onClick={handleNext}
              disabled={!isDone}
              title={isDone ? "" : "Acaba l'exercici per continuar"}
              onPointerDown={() => {
                if (isDone) return;
                setShakeNext(true);
                setTimeout(() => setShakeNext(false), 450);
              }}
            >
              {isDone
                ? (isLastProblem ? "Finalitzar 🏁" : "Següent →")
                : "🔒 Acaba l'exercici"}
            </button>
          </div>
        </div>

        {/* ══════════════════ IFRAME AREA ══════════════════ */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef2f7",
          overflow: "hidden",
        }}>
          <iframe
            title="CTAT Tutor"
            src={iframeSrc}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "white",
              display: "block",
            }}
          />
        </div>

        {/* ══════════════════ MOTIVATIONAL TOAST ══════════════════ */}
        {toast && (
          <div
            className="tp-toast"
            style={{
              position: "fixed",
              top: toast.top,
              left: toast.left,
              maxWidth: 340,
              background: "linear-gradient(135deg, #e65100, #ff8f00)",
              color: "#fff",
              padding: "16px 20px",
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{toast.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>{toast.text}</span>
          </div>
        )}

      </div>
    </>
  );
}
