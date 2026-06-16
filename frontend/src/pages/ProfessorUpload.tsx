// src/pages/ProfessorUpload.tsx
// واجهة الدكتور — Professor Interface for uploading lecture hall photos

import React, { useEffect, useRef, useState } from "react";
import { getCourses, uploadLectureSession, getSessionStatus } from "../api/attendanceApi";

type UploadState = "idle" | "uploading" | "polling" | "done" | "error";

interface Course { course_id: string; course_name: string; doctor_name: string; }
interface SessionResult {
  status: string;
  present_count?: number;
  absent_count?:  number;
  processed_at?:  string;
}

export default function ProfessorUpload() {
  const [courses,      setCourses]     = useState<Course[]>([]);
  const [courseId,     setCourseId]    = useState("");
  const [doctorName,   setDoctorName]  = useState("");
  const [sessionDate,  setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview,      setPreview]     = useState<string | null>(null);
  const [uploadState,  setUploadState] = useState<UploadState>("idle");
  const [sessionId,    setSessionId]   = useState<number | null>(null);
  const [result,       setResult]      = useState<SessionResult | null>(null);
  const [message,      setMessage]     = useState("");
  const [pollCount,    setPollCount]   = useState(0);

  const fileRef    = useRef<HTMLInputElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load courses on mount
  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  // Poll session status every 3s when processing
  useEffect(() => {
    if (uploadState === "polling" && sessionId) {
      pollRef.current = setInterval(async () => {
        try {
          const data = await getSessionStatus(sessionId);
          setResult(data);
          setPollCount(c => c + 1);
          if (data.status === "done" || data.status === "failed") {
            clearInterval(pollRef.current!);
            setUploadState(data.status === "done" ? "done" : "error");
            setMessage(
              data.status === "done"
                ? `✅ Processing complete! ${data.present_count} students marked present.`
                : "❌ Processing failed. Please try again."
            );
          }
        } catch {
          clearInterval(pollRef.current!);
        }
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [uploadState, sessionId]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    const photo = fileRef.current?.files?.[0];
    if (!photo)      { setMessage("Please select a lecture hall photo."); return; }
    if (!courseId)   { setMessage("Please select a course."); return; }
    if (!doctorName) { setMessage("Please enter your name."); return; }

    setUploadState("uploading");
    setMessage("");

    const form = new FormData();
    form.append("course_id",     courseId);
    form.append("uploaded_by",   doctorName);
    form.append("date",          sessionDate);
    form.append("lecture_image", photo);

    try {
      const res = await uploadLectureSession(form);
      setSessionId(res.session_id);
      setUploadState("polling");
      setMessage("⏳ Image uploaded. AI is processing faces in the background...");
    } catch (err: any) {
      setUploadState("error");
      setMessage(err.response?.data?.error ?? "Upload failed. Try again.");
    }
  };

  const handleReset = () => {
    setUploadState("idle");
    setPreview(null);
    setSessionId(null);
    setResult(null);
    setMessage("");
    setPollCount(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isLoading = uploadState === "uploading" || uploadState === "polling";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>👨‍🏫</div>
          <h1 style={styles.title}>Professor Interface</h1>
          <p style={styles.subtitle}>Upload lecture hall photo to record attendance</p>
        </div>

        {/* Result screen */}
        {uploadState === "done" && result ? (
          <div style={styles.resultBox}>
            <div style={{ fontSize: 64 }}>🎉</div>
            <h2 style={{ color: "#166534", margin: "12px 0 8px" }}>Attendance Recorded!</h2>

            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, background: "#dcfce7" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#16a34a" }}>
                  {result.present_count}
                </div>
                <div style={{ color: "#166534", fontSize: 13 }}>✅ Present</div>
              </div>
              <div style={{ ...styles.statCard, background: "#fee2e2" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#dc2626" }}>
                  {result.absent_count}
                </div>
                <div style={{ color: "#991b1b", fontSize: 13 }}>❌ Absent</div>
              </div>
            </div>

            <button onClick={handleReset} style={styles.resetBtn}>
              📷 Upload Another Photo
            </button>
          </div>
        ) : (
          <>
            {/* Form */}
            <div style={styles.form}>
              {/* Photo upload */}
              <div
                style={styles.dropZone}
                onClick={() => !isLoading && fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Lecture" style={styles.previewImg} />
                ) : (
                  <div style={styles.dropPlaceholder}>
                    <span style={{ fontSize: 48 }}>🏛️</span>
                    <p style={{ margin: "8px 0 4px", fontWeight: 600, color: "#374151" }}>
                      Click to upload lecture hall photo
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                      JPG, PNG up to 20MB — ensure all faces are visible
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef} type="file"
                accept="image/*"
                onChange={handlePhoto}
                style={{ display: "none" }}
              />

              {/* Controls */}
              <div style={styles.controls}>
                <div style={styles.field}>
                  <label style={styles.label}>Course</label>
                  <select
                    value={courseId}
                    onChange={e => setCourseId(e.target.value)}
                    style={styles.input}
                    disabled={isLoading}
                  >
                    <option value="">— Select Course —</option>
                    {courses.map(c => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_id} — {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date" value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    style={styles.input}
                    disabled={isLoading}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Doctor Name</label>
                  <input
                    type="text" value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    placeholder="Dr. Ahmed Mohamed"
                    style={styles.input}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Message */}
              {message && (
                <div style={{
                  ...styles.msgBox,
                  background: uploadState === "error" ? "#fef2f2" : "#eff6ff",
                  borderColor: uploadState === "error" ? "#fca5a5" : "#93c5fd",
                  color: uploadState === "error" ? "#dc2626" : "#1d4ed8",
                }}>
                  {message}
                  {uploadState === "polling" && (
                    <span style={styles.dots}>
                      {".".repeat((pollCount % 3) + 1)}
                    </span>
                  )}
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={isLoading}
                style={{
                  ...styles.uploadBtn,
                  opacity: isLoading ? 0.7 : 1,
                  cursor:  isLoading ? "not-allowed" : "pointer",
                }}
              >
                {uploadState === "uploading" ? "⏳ Uploading..." :
                 uploadState === "polling"   ? "🔄 Processing..." :
                 "🚀 Start AI Processing"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px 16px",
  },
  card: {
    background: "#fff", borderRadius: 20, padding: "40px 36px",
    width: "100%", maxWidth: 600, boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
  },
  header: { textAlign: "center", marginBottom: 28 },
  logo:   { fontSize: 52, marginBottom: 8 },
  title:  { margin: 0, fontSize: 26, fontWeight: 800, color: "#0f172a" },
  subtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 14 },

  form: { display: "flex", flexDirection: "column", gap: 20 },

  dropZone: {
    border: "2px dashed #94a3b8", borderRadius: 14, minHeight: 180,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", overflow: "hidden", background: "#f8fafc",
    transition: "border-color .2s",
  },
  dropPlaceholder: { textAlign: "center", padding: 20 },
  previewImg: { width: "100%", maxHeight: 300, objectFit: "cover" },

  controls: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  field:    { display: "flex", flexDirection: "column", gap: 6 },
  label:    { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: {
    padding: "10px 12px", border: "1.5px solid #e2e8f0",
    borderRadius: 10, fontSize: 14, color: "#0f172a",
    background: "#f8fafc", width: "100%", boxSizing: "border-box",
  },

  msgBox: {
    padding: "12px 16px", borderRadius: 10, border: "1px solid",
    fontSize: 14, fontWeight: 500,
  },
  dots: { fontWeight: 800, letterSpacing: 2 },

  uploadBtn: {
    padding: "14px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff", border: "none", borderRadius: 12,
    fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
    transition: "opacity .2s",
  },

  resultBox: { textAlign: "center", padding: "10px 0" },
  statsRow: { display: "flex", gap: 20, justifyContent: "center", margin: "20px 0" },
  statCard: {
    padding: "20px 32px", borderRadius: 14, textAlign: "center",
    flex: 1, maxWidth: 140,
  },
  resetBtn: {
    marginTop: 8, padding: "12px 32px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
};
