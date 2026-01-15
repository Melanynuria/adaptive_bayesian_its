import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { diagnosticComplete } from "../api/sessionApi";
import { sendLogs } from "../api/logApi";
import type { CTATMessage } from "../types/ctat";

type LocationState = {
  sessionId: string;
  firstProblemId: string;
};

// ---------- type guards ----------
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCTATMessage(value: unknown): value is CTATMessage {
  if (!isObject(value)) return false;
  if (typeof value.kind !== "string") return false;
  if (typeof value.ts !== "string") return false;
  if (!("payload" in value)) return false;
  return true;
}

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
    return `/ctat/problems/${currentProblemId}/index.html?session_id=${encodeURIComponent(
      sessionId
    )}`;
  }, [currentProblemId, sessionId]);

  // Redirect if user enters /tutor directly
  useEffect(() => {
    if (!st?.sessionId || !st?.firstProblemId) {
      nav("/");
    }
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
        // re-queue logs if backend is temporarily unavailable
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
      if (idx + 1 < queue.length) {
        setIdx(idx + 1);
      } else {
        nav("/end");
      }
    }

    function onMessage(ev: MessageEvent) {
      const raw = ev.data;

      if (!isCTATMessage(raw)) return;

      if (raw.kind === "CTAT_LOG_EVENT") {
        bufferRef.current.push(raw);
        scheduleFlush();
        return;
      }

      if (raw.kind === "CTAT_PROBLEM_DONE") {
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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
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

      <iframe
        title="CTAT Tutor"
        src={iframeSrc}
        style={{ flex: 1, border: "none" }}
      />
    </div>
  );
}
