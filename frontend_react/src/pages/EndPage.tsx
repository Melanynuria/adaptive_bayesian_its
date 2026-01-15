import { Link } from "react-router-dom";

export default function EndPage() {
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>Session completed</h2>
      <p>You can close the page or start again.</p>
      <Link to="/">Back to start</Link>
    </div>
  );
}
