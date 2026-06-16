// src/pages/StudentPortal.tsx — بوابة الطالب لمتابعة الغياب والحضور

import React, { useState } from "react";
import { getStudentSummary } from "../api/attendanceApi";

interface CourseRecord { date: string; status: string; time_in: string; }
interface CourseData {
  course_id: string; course_name: string; doctor_name: string;
  present: number; absent: number; total_sessions: number;
  attendance_pct: number; at_risk: boolean;
  recent_records: CourseRecord[];
}
interface Summary { student_id: string; student_name: string; department: string; courses: CourseData[]; }

export default function StudentPortal() {
  const [studentId, setStudentId] = useState("");
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const handleSearch = async () => {
    if (!studentId.trim()) return;
    setLoading(true); setError(""); setSummary(null);
    try {
      const data = await getStudentSummary(studentId.trim());
      setSummary(data);
    } catch {
      setError("Student not found. Please check your ID.");
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <span style={{ fontSize: 52 }}>🎓</span>
          <h1 style={s.title}>Student Portal</h1>
          <p style={s.subtitle}>Track your attendance & avoid academic suspension</p>
        </div>

        {/* Search */}
        <div style={s.searchBox}>
          <input
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Enter your Student ID..."
            style={s.searchInput}
          />
          <button onClick={handleSearch} style={s.searchBtn} disabled={loading}>
            {loading ? "⏳" : "🔍"}
          </button>
        </div>

        {error && <div style={s.errorBox}>❌ {error}</div>}

        {/* Student Info */}
        {summary && (
          <>
            <div style={s.studentCard}>
              <div style={{ fontSize: 48 }}>👤</div>
              <div>
                <div style={s.studentName}>{summary.student_name}</div>
                <div style={s.studentMeta}>
                  ID: {summary.student_id} &nbsp;|&nbsp; {summary.department}
                </div>
              </div>
              {summary.courses.some(c => c.at_risk) && (
                <div style={s.riskAlert}>⚠️ At Risk of Ban</div>
              )}
            </div>

            {/* Courses */}
            <div style={s.coursesGrid}>
              {summary.courses.map(course => (
                <div key={course.course_id} style={{
                  ...s.courseCard,
                  borderLeft: `5px solid ${course.at_risk ? "#dc2626" : "#16a34a"}`,
                }}>
                  {/* Course header */}
                  <div style={s.courseHeader}>
                    <div>
                      <div style={s.courseName}>{course.course_name}</div>
                      <div style={s.courseId}>{course.course_id} — Dr. {course.doctor_name}</div>
                    </div>
                    <div style={{
                      ...s.pctBadge,
                      background: course.at_risk ? "#fee2e2" : "#dcfce7",
                      color:      course.at_risk ? "#dc2626" : "#16a34a",
                    }}>
                      {course.attendance_pct}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={s.progressTrack}>
                    <div style={{
                      ...s.progressFill,
                      width:      `${course.attendance_pct}%`,
                      background: course.at_risk
                        ? "linear-gradient(90deg,#dc2626,#ef4444)"
                        : "linear-gradient(90deg,#16a34a,#22c55e)",
                    }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6b7280", marginTop:4 }}>
                    <span>0%</span>
                    <span style={{ color:"#f59e0b", fontWeight:700 }}>75% Minimum</span>
                    <span>100%</span>
                  </div>

                  {/* Stats */}
                  <div style={s.statsRow}>
                    <div style={{ ...s.statBox, background:"#eff6ff" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:"#2563eb" }}>{course.total_sessions}</div>
                      <div style={{ fontSize:11, color:"#3b82f6" }}>Total</div>
                    </div>
                    <div style={{ ...s.statBox, background:"#dcfce7" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:"#16a34a" }}>{course.present}</div>
                      <div style={{ fontSize:11, color:"#16a34a" }}>✅ Present</div>
                    </div>
                    <div style={{ ...s.statBox, background:"#fee2e2" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:"#dc2626" }}>{course.absent}</div>
                      <div style={{ fontSize:11, color:"#dc2626" }}>❌ Absent</div>
                    </div>
                  </div>

                  {/* Risk warning */}
                  {course.at_risk && (
                    <div style={s.riskBox}>
                      ⚠️ Your attendance is below 75%. You are at risk of academic suspension.
                      {course.total_sessions > 0 && (
                        <span> You need at least <strong>
                          {Math.ceil(0.75 * course.total_sessions) - course.present}
                        </strong> more sessions present to be safe.</span>
                      )}
                    </div>
                  )}

                  {/* Recent records */}
                  {course.recent_records.length > 0 && (
                    <div style={s.recentSection}>
                      <div style={s.recentTitle}>Recent Sessions</div>
                      {course.recent_records.map((r, i) => (
                        <div key={i} style={s.recentRow}>
                          <span>{r.date}</span>
                          <span style={{ color:"#9ca3af" }}>{r.time_in}</span>
                          <span style={{
                            padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: r.status === "Present" ? "#dcfce7" : "#fee2e2",
                            color:      r.status === "Present" ? "#166534" : "#991b1b",
                          }}>
                            {r.status === "Present" ? "✅" : "❌"} {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight:"100vh", background:"linear-gradient(135deg,#1e3a5f,#0f172a)", padding:"24px 16px" },
  container: { maxWidth:800, margin:"0 auto" },
  header:    { textAlign:"center", color:"#fff", marginBottom:28, paddingTop:12 },
  title:     { margin:"8px 0 4px", fontSize:28, fontWeight:800 },
  subtitle:  { margin:0, color:"#94a3b8", fontSize:14 },

  searchBox:   { display:"flex", gap:10, marginBottom:20 },
  searchInput: { flex:1, padding:"14px 18px", borderRadius:12, border:"none", fontSize:16,
                 background:"rgba(255,255,255,0.1)", color:"#fff", outline:"none" },
  searchBtn:   { padding:"14px 22px", borderRadius:12, border:"none", background:"#3b82f6",
                 color:"#fff", fontSize:20, cursor:"pointer" },

  errorBox: { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10,
              padding:"12px 16px", color:"#dc2626", marginBottom:16 },

  studentCard: { background:"rgba(255,255,255,0.07)", borderRadius:16, padding:"20px 24px",
                 display:"flex", alignItems:"center", gap:16, marginBottom:20,
                 border:"1px solid rgba(255,255,255,0.1)" },
  studentName: { fontSize:20, fontWeight:800, color:"#fff" },
  studentMeta: { fontSize:13, color:"#94a3b8", marginTop:4 },
  riskAlert:   { marginLeft:"auto", background:"#fef3c7", color:"#92400e",
                 padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:700 },

  coursesGrid: { display:"flex", flexDirection:"column", gap:16 },
  courseCard:  { background:"#fff", borderRadius:14, padding:"20px 22px",
                 boxShadow:"0 4px 20px rgba(0,0,0,0.15)" },
  courseHeader:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 },
  courseName:  { fontWeight:800, fontSize:16, color:"#0f172a" },
  courseId:    { fontSize:12, color:"#64748b", marginTop:3 },
  pctBadge:    { fontSize:22, fontWeight:900, padding:"6px 14px", borderRadius:12 },

  progressTrack: { background:"#e5e7eb", borderRadius:20, height:14, overflow:"hidden", marginTop:8 },
  progressFill:  { height:"100%", borderRadius:20, transition:"width .5s" },

  statsRow: { display:"flex", gap:12, marginTop:14 },
  statBox:  { flex:1, padding:"12px", borderRadius:12, textAlign:"center" },

  riskBox: { marginTop:12, background:"#fff7ed", border:"1px solid #fed7aa",
             borderRadius:10, padding:"10px 14px", fontSize:13, color:"#92400e" },

  recentSection: { marginTop:14, borderTop:"1px solid #f1f5f9", paddingTop:12 },
  recentTitle:   { fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8,
                   textTransform:"uppercase", letterSpacing:0.8 },
  recentRow:     { display:"flex", justifyContent:"space-between", alignItems:"center",
                   padding:"6px 0", fontSize:13, color:"#374151",
                   borderBottom:"1px solid #f8fafc" },
};
