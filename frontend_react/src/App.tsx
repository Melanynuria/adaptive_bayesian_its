import { BrowserRouter, Routes, Route } from "react-router-dom";
import StartSessionPage from "./pages/StartSessionPage";
import TutorPage from "./pages/TutorPage";
import WaitingPage from "./pages/WaitingPage";
import TeacherPage from "./pages/TeacherPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartSessionPage />} />
        <Route path="/tutor" element={<TutorPage />} />
        <Route path="/waiting" element={<WaitingPage />} />
        <Route path="/teacher" element={<TeacherPage />} />
      </Routes>
    </BrowserRouter>
  );
}
