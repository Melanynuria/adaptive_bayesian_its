# main.py — General Overview

`main.py` is the **entry point of the FastAPI backend**. 
It has two main responsibilities:

1. Provide API endpoints to manage student sessions and receive CTAT interaction logs.
2. Serve the built React frontend (and optionally CTAT static files), so the entire web application can run from a single server.

---

## High-Level Architecture Role

Within the overall system:

Browser (React + CTAT)
        ↓
FastAPI (main.py)
        ↓
Session storage (currently in memory)

`main.py` acts as the bridge between:
- The frontend (React + CTAT)
- The backend logic (session creation, log collection, adaptive assignment)

---

## Core Functionalities

### 1. Application Initialization
- Creates the FastAPI app instance.
- Configures CORS to allow frontend–backend communication.

### 2. Session Management
- Generates unique session IDs using UUID.
- Stores session metadata (class code, student ID).
- Maintains a list of interaction events per session.

### 3. Log Collection
- Receives CTAT interaction events.
- Associates events with the correct student session.
- Enables future analytics or adaptive decision logic.

### 4. Diagnostic Completion Handling
- Receives notification when the diagnostic phase ends.
- Returns assigned problem IDs.
- Currently uses placeholder logic (static assignment).

This is where adaptive logic will later be implemented.

### 5. Frontend Hosting
- Serves the built React application from the `/` route.
- Optionally serves CTAT files under `/CTAT`.
- Ensures the frontend is built before allowing server startup.

This allows deployment as a single unified application.

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|-----------|--------|----------|
| `/api/health` | GET | Server health check |
| `/api/session/start` | POST | Create new session |
| `/api/logs` | POST | Receive CTAT interaction events |
| `/api/session/diagnostic-complete` | POST | Return assigned problems |

---

## Data Flow Overview

1. Student opens the web app.
2. Frontend calls `/api/session/start`.
3. Backend creates a session and returns a `session_id`.
4. CTAT sends interaction events to `/api/logs`.
5. When the diagnostic ends, frontend calls `/api/session/diagnostic-complete`.
6. Backend returns assigned next problems.

---

## Current Limitations

- Session data is stored only in memory.
- Logs are not persisted.
- Adaptive assignment logic is not yet implemented.
- CORS is fully open (development configuration).
