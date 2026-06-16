// App.tsx — Main Router
import React, { useState } from "react";
import StudentRegister  from "./pages/StudentRegister";
import ProfessorUpload  from "./pages/ProfessorUpload";
import AdminDashboard   from "./pages/AdminDashboard";
import StudentPortal    from "./pages/StudentPortal";

type Page = "student-register" | "professor" | "admin" | "student-portal";

const NAV: { id: Page; icon: string; label: string; color: string }[] = [
  { id: "student-register", icon: "📝", label: "Student Registration", color: "#2563eb" },
  { id: "professor",        icon: "👨‍🏫", label: "Professor Interface",  color: "#7c3aed" },
  { id: "admin",            icon: "📊", label: "Admin Dashboard",       color: "#0f172a" },
  { id: "student-portal",  icon: "👤", label: "Student Portal",         color: "#16a34a" },
];

export default function App() {
  const [page, setPage] = useState<Page>("student-register");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Top Navigation */}
      <nav style={{
        background: "#0f172a", padding: "12px 24px",
        display: "flex", gap: 8, alignItems: "center",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        flexWrap: "wrap",
      }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, marginRight: 16 }}>
          🎓 Smart Attendance
        </span>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, transition: "all .2s",
            background: page === n.id ? n.color : "rgba(255,255,255,0.08)",
            color: page === n.id ? "#fff" : "#94a3b8",
          }}>
            {n.icon} {n.label}
          </button>
        ))}
      </nav>

      {/* Pages */}
      {page === "student-register" && <StudentRegister />}
      {page === "professor"        && <ProfessorUpload />}
      {page === "admin"            && <AdminDashboard />}
      {page === "student-portal"   && <StudentPortal />}
    </div>
  );
}
