from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List
from pathlib import Path
import uuid

app = FastAPI()

#Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Classes for Data validation

class StartSessionRequest(BaseModel):
    class_code: str
    student_id: str

class DiagnosticCompleteRequest(BaseModel):
    session_id: str

class LogsRequest(BaseModel):
    session_id: str
    events: List[Dict[str, Any]] #List for CTAT interaction events

# SESSION STORAGE (temporary) 
SESSIONS: Dict[str, Dict[str, Any]] = {} #Reseted when the server stops

# ROUTES
@app.get("/api/health")
def health():
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
        "first_problem_id": "Ex1",
    }

#Receive interaciton events from CTAT and attach them to the correct session
@app.post("/api/logs")
def receive_logs(req: LogsRequest):
    if req.session_id in SESSIONS:
        SESSIONS[req.session_id]["events"].extend(req.events)

    return {"ok": True, "received": len(req.events)}

#Called when the diagnostic finishes
@app.post("/api/session/diagnostic-complete")
def diagnostic_complete(req: DiagnosticCompleteRequest):
    # Temporary static assignment logic
    return {
        "assigned_problem_ids": ["eq_02", "eq_03"] #modify 
    }

# Project root = backend_fastAPI/app/main.py -> parents:
# parents[0]=app, [1]=backend_fastAPI, [2]=project root
PROJECT_ROOT = Path(__file__).resolve().parents[2]

DIST_DIR = PROJECT_ROOT / "frontend_react" / "dist"
CTAT_DIR = PROJECT_ROOT / "frontend_react" / "public" / "CTAT"

# Serve CTAT files (optional if CTAT already ends up inside dist/CTAT after build)
if CTAT_DIR.exists():
    app.mount("/CTAT", StaticFiles(directory=CTAT_DIR), name="ctat")

# Serve built React app
# This makes "/" return your React index.html, and serves assets from dist/
if not DIST_DIR.exists():
    raise RuntimeError(f"Frontend build not found at {DIST_DIR}. Run: cd frontend_react && npm run build")

app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")