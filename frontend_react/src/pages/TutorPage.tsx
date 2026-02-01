import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { diagnosticComplete } from "../api/sessionApi";
import { sendLogs } from "../api/logApi";
import type { CTATMessage } from "../types/ctat";

type LocationState = {
  sessionId: string;
  firstProblemId: string;
};

export default function TutorPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const st = loc.state as LocationState | null;

  const [sessionId] = useState(st?.sessionId ?? "");
  const [queue, setQueue] = useState<string[]>(
    st?.firstProblemId ? [st.firstProblemId] : []
  );
  const [idx, setIdx] = useState(0);
  const [assigned, setAssigned] = useState(false);

  const bufferRef = useRef<CTATMessage[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  const currentProblemId = queue[idx];

  const iframeSrc = useMemo(() => {
    if (!currentProblemId) return "";
    return `/CTAT/${currentProblemId}/HTML/${currentProblemId}.html?session_id=${encodeURIComponent(
      sessionId
    )}`;
  }, [currentProblemId, sessionId]);

  // Redirect if user enters /tutor directly
  useEffect(() => {
    if (!st?.sessionId || !st?.firstProblemId) nav("/");
  }, [st, nav]);

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

  useEffect(() => {
    async function handleDone() {
      // diagnostic finished
      if (!assigned && idx === 0) {
        const res = await diagnosticComplete(sessionId);
        setAssigned(true);
        setQueue([queue[0], ...res.assigned_problem_ids]);
        setIdx(1);
        return;
      }

      // next or end
      if (idx + 1 < queue.length) setIdx(idx + 1);
      else nav("/end");
    }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCTATMessage(value: unknown): value is CTATMessage {
  if (!isObject(value)) return false;
  if (typeof value.kind !== "string") return false;
  if (typeof value.ts !== "string") return false;
  return "payload" in value;
}
function extractCdata(tag: string, xml: string): string | null {
  const re = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[(.*?)\\]\\]>\\s*</${tag}>`,
    "s"
  );
  const m = xml.match(re);
  return m ? m[1] : null;
}

function onMessage(ev: MessageEvent<unknown>) {
  const raw = ev.data;

  if (!isCTATMessage(raw)) return;

  if (raw.kind === "CTAT_LOG_EVENT") {
    // ✅ read XML safely from payload (payload is Record<string, unknown>)
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

    // ✅ build an enriched event (no duplicates)
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
      },
    };

    // ✅ THESE are the logs you want to see clearly
    console.log("CTAT_LOG_EVENT payload (snapshot):", JSON.parse(JSON.stringify(enriched.payload)));
    console.log("Typed input:", input);

    bufferRef.current.push(enriched);
    scheduleFlush();
    return;
  }

  if (raw.kind === "CTAT_PROBLEM_DONE") {
    console.log("CTAT_PROBLEM_DONE payload:", raw.payload);

    bufferRef.current.push({
      kind: "CTAT_PROBLEM_DONE",
      ts: new Date().toISOString(),
      payload: { problemId: currentProblemId },
    });
    scheduleFlush();
    void handleDone();
  }
}


    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [assigned, idx, queue, sessionId, currentProblemId, nav]);

  if (!currentProblemId) {
    return <div style={{ padding: 24 }}>Loading…</div>;
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
          padding: "10px 12px",
          borderBottom: "1px solid #ddd",
          fontFamily: "Arial",
        }}
      >
        <strong>Session:</strong> {sessionId} &nbsp; | &nbsp;
        <strong>Problem:</strong> {currentProblemId} &nbsp; | &nbsp;
        <strong>Step:</strong> {idx + 1}/{queue.length}
      </div>

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
