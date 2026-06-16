// src/pages/AdminDashboard.tsx
// لوحة تحكم الإدارة — Admin Dashboard

import React, { useEffect, useState } from "react";
import { getAttendanceList, getAttendanceReport, getCourses } from "../api/attendanceApi";

interface Course   { course_id: string; course_name: string; doctor_name: string; student_count: number; }
interface Record_  { student_id: string; student_name: string; department: string; status: string; time_in: string; similarity_score: number | null; }
interface Report   { student_id: string; student_name: string; department: string; present: number; absent: number; total_sessions: number; attendance_pct: number; at_risk: boolean; }

type ActiveTab = "attendance" | "report";

export default function AdminDashboard() {
  const [courses,     setCourses]    = useState<Course[]>([]);
  const [courseId,    setCourseId]   = useState("");
  const [date,        setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [activeTab,   setActiveTab]  = useState<ActiveTab>("attendance");
  const [records,     setRecords]    = useState<Record_[]>([]);
  const [report,      setReport]     = useState<Report[]>([]);
  const [summary,     setSummary]    = useState({ present: 0, absent: 0, total: 0 });
  const [loading,     setLoading]    = useState(false);
  const [courseName,  setCourseName] = useState("");
  const [doctorName,  setDoctorName] = useState("");

  useEffect(() => {
    getCourses().then(data => {
      setCourses(data);
      if (data.length > 0) setCourseId(data[0].course_id);
    });
  }, []);

  useEffect(() => {
    const c = courses.find(c => c.course_id === courseId);
    setCourseName(c?.course_name ?? "");
    setDoctorName(c?.doctor_name ?? "");
  }, [courseId, courses]);

  const fetchAttendance = async () => {
    if (!courseId || !date) return;
    setLoading(true);
    try {
      const data = await getAttendanceList(courseId, date);
      setRecords(data.records);
      setSummary({ present: data.present_count, absent: data.absent_count, total: data.total });
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  const fetchReport = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getAttendanceReport(courseId);
      setReport(data.report);
    } catch { setReport([]); }
    finally { setLoading(false); }
  };

  const handleSearch = () => {
    if (activeTab === "attendance") fetchAttendance();
    else fetchReport();
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={{ fontSize: 32 }}>🎓</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Attendance</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Admin Dashboard</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {[
            { id: "attendance", icon: "📋", label: "Daily Attendance" },
            { id: "report",     icon: "📊", label: "Student Report"   },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              style={{
                ...styles.navBtn,
                background: activeTab === tab.id ? "rgba(255,255,255,0.2)" : "transparent",
                fontWeight: activeTab === tab.id ? 700 : 400,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.pageTitle}>
              {activeTab === "attendance" ? "📋 Daily Attendance" : "📊 Student Report"}
            </h2>
            {courseName && (
              <p style={styles.pageSubtitle}>
                {courseName} — Dr. {doctorName}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            style={styles.filterInput}
          >
            {courses.map(c => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_id} — {c.course_name}
              </option>
            ))}
          </select>

          {activeTab === "attendance" && (
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
              style={styles.filterInput}
            />
          )}

          <button onClick={handleSearch} style={styles.searchBtn} disabled={loading}>
            {loading ? "⏳" : "🔍"} Search
          </button>
        </div>

        {/* Summary cards (attendance tab only) */}
        {activeTab === "attendance" && summary.total > 0 && (
          <div style={styles.statsRow}>
            {[
              { label: "Total",   value: summary.total,   color: "#3b82f6", bg: "#eff6ff" },
              { label: "Present", value: summary.present, color: "#16a34a", bg: "#dcfce7" },
              { label: "Absent",  value: summary.absent,  color: "#dc2626", bg: "#fee2e2" },
              {
                label: "Rate",
                value: `${summary.total > 0 ? Math.round(summary.present / summary.total * 100) : 0}%`,
                color: "#7c3aed", bg: "#f5f3ff"
              },
            ].map(s => (
              <div key={s.label} style={{ ...styles.statCard, background: s.bg }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={styles.tableWrapper}>
          {activeTab === "attendance" ? (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Student ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Time In</th>
                  <th style={styles.th}>Similarity</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={7} style={styles.empty}>No records found. Click Search.</td></tr>
                ) : records.map((r, i) => (
                  <tr key={r.student_id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{r.student_id}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{r.student_name}</td>
                    <td style={styles.td}>{r.department}</td>
                    <td style={styles.td}>{r.time_in}</td>
                    <td style={styles.td}>
                      {r.similarity_score != null
                        ? <span style={styles.simBadge}>{(r.similarity_score * 100).toFixed(1)}%</span>
                        : "—"
                      }
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: r.status === "Present" ? "#dcfce7" : "#fee2e2",
                        color:      r.status === "Present" ? "#166534" : "#991b1b",
                      }}>
                        {r.status === "Present" ? "✅" : "❌"} {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Student ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Present</th>
                  <th style={styles.th}>Absent</th>
                  <th style={styles.th}>Attendance %</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.length === 0 ? (
                  <tr><td colSpan={8} style={styles.empty}>No report data. Click Search.</td></tr>
                ) : report.map((r, i) => (
                  <tr key={r.student_id} style={{ background: r.at_risk ? "#fff7ed" : i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{r.student_id}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{r.student_name}</td>
                    <td style={styles.td}>{r.department}</td>
                    <td style={{ ...styles.td, color: "#16a34a", fontWeight: 700 }}>{r.present}</td>
                    <td style={{ ...styles.td, color: "#dc2626", fontWeight: 700 }}>{r.absent}</td>
                    <td style={styles.td}>
                      <div style={styles.progressBar}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${r.attendance_pct}%`,
                          background: r.attendance_pct >= 75 ? "#16a34a" : "#dc2626",
                        }} />
                        <span style={styles.progressLabel}>{r.attendance_pct}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {r.at_risk
                        ? <span style={{ ...styles.statusBadge, background: "#fef3c7", color: "#92400e" }}>⚠️ At Risk</span>
                        : <span style={{ ...styles.statusBadge, background: "#dcfce7", color: "#166534" }}>✅ Safe</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:    { display: "flex", minHeight: "100vh", background: "#f1f5f9" },
  sidebar: {
    width: 220, background: "linear-gradient(180deg, #1e3a5f, #0f172a)",
    color: "#fff", display: "flex", flexDirection: "column",
    padding: "24px 16px", gap: 8, flexShrink: 0,
  },
  sidebarLogo: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  nav:    { display: "flex", flexDirection: "column", gap: 6 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 10, border: "none",
    color: "#fff", fontSize: 14, cursor: "pointer", textAlign: "left",
    transition: "background .2s",
  },
  main:    { flex: 1, padding: "28px 32px", overflow: "auto" },
  topBar:  { marginBottom: 20 },
  pageTitle:   { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSubtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 14 },
  filters: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  filterInput: {
    padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 14, background: "#fff", color: "#0f172a",
    minWidth: 180,
  },
  searchBtn: {
    padding: "10px 24px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer",
  },
  statsRow: { display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    flex: "1 1 100px", padding: "16px 20px", borderRadius: 14,
    textAlign: "center", minWidth: 90,
  },
  tableWrapper: {
    background: "#fff", borderRadius: 14, overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  table:  { width: "100%", borderCollapse: "collapse" },
  thead:  { background: "#1e3a5f" },
  th:     { padding: "12px 16px", color: "#fff", fontSize: 12, fontWeight: 600,
             textAlign: "left", letterSpacing: 0.5, textTransform: "uppercase" },
  td:     { padding: "11px 16px", fontSize: 13, color: "#374151",
             borderBottom: "1px solid #f1f5f9" },
  empty:  { padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 },
  statusBadge: {
    display: "inline-block", padding: "4px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 600,
  },
  simBadge: {
    display: "inline-block", padding: "3px 8px", borderRadius: 20,
    fontSize: 12, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600,
  },
  progressBar: {
    position: "relative", background: "#e5e7eb", borderRadius: 20,
    height: 20, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 20, transition: "width .3s" },
  progressLabel: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%,-50%)", fontSize: 11,
    fontWeight: 700, color: "#fff",
  },
};
