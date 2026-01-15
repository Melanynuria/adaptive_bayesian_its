from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List
import uuid

app = FastAPI()

# Allow frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------
class StartSessionRequest(BaseModel):
    class_code: str
    student_id: str

class DiagnosticCompleteRequest(BaseModel):
    session_id: str

class LogsRequest(BaseModel):
    session_id: str
    events: List[Dict[str, Any]]

# ---------- In-memory store (temporary) ----------
SESSIONS: Dict[str, Dict[str, Any]] = {}

# ---------- Routes ----------
@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/session/start")
def start_session(req: StartSessionRequest):
    session_id = str(uuid.uuid4())

    print("New session created")
    print("Class:", req.class_code)
    print("Student:", req.student_id)

    SESSIONS[session_id] = {
        "class_code": req.class_code,
        "student_id": req.student_id,
        "events": [],
    }

    return {
        "session_id": session_id,
        "first_problem_id": "eq_01",
    }

@app.post("/api/logs")
def receive_logs(req: LogsRequest):
    if req.session_id in SESSIONS:
        SESSIONS[req.session_id]["events"].extend(req.events)

    return {"ok": True, "received": len(req.events)}

@app.post("/api/session/diagnostic-complete")
def diagnostic_complete(req: DiagnosticCompleteRequest):
    # Temporary static assignment logic
    return {
        "assigned_problem_ids": ["eq_02", "eq_03"]
    }
