import { useState } from "react"; // Returns a stateful value, and a function to update it.
import { useNavigate } from "react-router-dom"; // clien-side navigation
import { startSession } from "../api/sessionApi"; //Api helper function

export default function StartSessionPage() {  //Exported as default to be used in routing 
  const nav = useNavigate();
  const [classCode, setClassCode] = useState(""); 
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null); //will store an error message if needed 

  async function onStart() {
    setError(null); // Reset previous errors
    const cc = classCode.trim();
    if (!cc) return setError("Class code is required.");

    try { 
      const sid = studentId.trim() || crypto.randomUUID();
      const data = await startSession(cc, sid); // call the backend and wait for the response 
      // pass the data to the tutor page
      nav("/tutor", { state: { sessionId: data.session_id, firstProblemId: data.first_problem_id } });
    } 
    catch {
      setError("Could not start session. Is FastAPI running?");
    }
    }
  return (
    <div 
      style={{
        height: "100vh", width: "100vw", display: "flex",alignItems: "center", justifyContent: "center", fontFamily: "Verdana", backgroundColor: "#bcbcbc"
      }}
    > 
      <div
        style={{
          width: 620,
          padding: 25,
          border: "1px solid #c0c0c0",
          borderRadius: 10,
          boxShadow: "0 0px 70px rgba(255, 255, 255, 0.08)",
          backgroundColor: "#ffffff",

        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>
          Inici de sessió
        </h2>

        <label>Codi de classe</label>
        <input
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          style={{ width: "95%", padding: 10, margin: "8px 0 16px" }}
          placeholder=" Per exemple: 1ESO_A"
        />

        <label>Student ID (curs + número de llista)</label>
        <input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{ width: "95%", padding: 10, margin: "8px 0 16px" }}
          placeholder="Per exemple, si curs 4rt i número de llista 05:  405"
        />

        {error && (
          <p style={{ color: "crimson", marginBottom: 16 }}>
            {error}
          </p>
        )}

        <button
          onClick={onStart}
          style={{
            width: "100%",
            padding: "12px 16px",
            marginTop: 8,
            cursor: "pointer",
          }}
        >
          Start
        </button>
      </div>
    </div>
  );}