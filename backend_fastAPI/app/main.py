from fastapi import FastAPI                             #API
from fastapi.staticfiles import StaticFiles             #serves static files
from fastapi.responses import FileResponse              
from starlette.middleware.cors import CORSMiddleware    #allows frontend and backend communication through browser
from pydantic import BaseModel
from typing import Any, Dict, List
from pathlib import Path
import uuid      
from datetime import datetime, timezone
import json
import sqlite3

app = FastAPI()

#Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
#-----------------------------------
# DATABASE SETUP
#-----------------------------------

# -----------------------------------
# DATABASE SETUP
# -----------------------------------

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "app.db"
DB_PATH.parent.mkdir(exist_ok=True)

def init_db():
    print("Initializing DB at:", DB_PATH.resolve())

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            problem_id TEXT,
            step_index INTEGER,
            selection TEXT,
            input TEXT,
            correctness TEXT,
            timestamp TEXT
        )
    """)

    conn.commit()
    conn.close()

    print("Database initialized.")


# Initialize database when app starts
init_db()


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


def append_jsonl(path: Path, obj: dict):
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

@app.post("/api/logs")
async def logs(req: LogsRequest):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for e in req.events:
        p = e.get("payload", {})
        xml = p.get("xml", "")

        is_attempt = 'name="ATTEMPT"' in xml

        if is_attempt:
            student_input = p.get("input")
            session_id = req.session_id
            problem_id = p.get("problemId")
            step_index = p.get("stepIndex")
            selection = p.get("selection")
            timestamp = e.get("ts")
            

            correctness = None
            if "INCORRECT" in xml:
                correctness = "INCORRECT"
            elif "CORRECT" in xml:
                correctness = "CORRECT"

            cursor.execute("""
                INSERT INTO attempts
                (session_id, problem_id, step_index, selection, input, correctness, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                problem_id,
                step_index,
                selection,
                student_input,
                correctness,
                timestamp
            ))

    conn.commit()
    conn.close()

    return {"status": "saved"}


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
if not DIST_DIR.exists():
    raise RuntimeError(f"Frontend build not found at {DIST_DIR}. Run: cd frontend_react && npm run build")

app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")