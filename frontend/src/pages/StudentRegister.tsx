// src/pages/StudentRegister.tsx
// صفحة تسجيل الطالب الذاتي — Student Self-Registration Portal

import React, { useRef, useState } from "react";
import { registerStudent } from "../api/attendanceApi";

type FormState = "idle" | "submitting" | "success" | "error";

const DEPARTMENTS = [
  { value: "CS",   label: "Computer Science" },
  { value: "IT",   label: "Information Technology" },
  { value: "EE",   label: "Electrical Engineering" },
  { value: "ME",   label: "Mechanical Engineering" },
  { value: "CE",   label: "Civil Engineering" },
  { value: "BIO",  label: "Biomedical Engineering" },
  { value: "MATH", label: "Mathematics" },
  { value: "OTH",  label: "Other" },
];

export default function StudentRegister() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [message,   setMessage]   = useState("");
  const [preview,   setPreview]   = useState<string | null>(null);
  const [isNiqabi,  setIsNiqabi]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    student_id:  "",
    name:        "",
    email:       "",
    department:  "CS",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const photo = fileRef.current?.files?.[0];
    if (!photo) { setMessage("Please upload your photo."); return; }

    setFormState("submitting");
    setMessage("");

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append("is_niqabi", String(isNiqabi));
    data.append("photo", photo);

    try {
      const res = await registerStudent(data);
      setFormState("success");
      setMessage(res.message);
    } catch (err: any) {
      setFormState("error");
      setMessage(err.response?.data?.error ?? "Registration failed. Try again.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🎓</div>
          <h1 style={styles.title}>Student Registration</h1>
          <p style={styles.subtitle}>University Attendance System</p>
        </div>

        {formState === "success" ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 64 }}>✅</div>
            <h2 style={{ color: "#166534", margin: "12px 0 8px" }}>Registered Successfully!</h2>
            <p style={{ color: "#15803d" }}>{message}</p>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>
              Your face embedding is being processed. You can now attend lectures.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Photo upload */}
            <div style={styles.photoSection}>
              <div
                style={styles.photoPreview}
                onClick={() => fileRef.current?.click()}
              >
                {preview
                  ? <img src={preview} alt="Preview" style={styles.previewImg} />
                  : <div style={styles.photoPlaceholder}>
                      <span style={{ fontSize: 40 }}>📷</span>
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b7280" }}>
                        Click to upload photo
                      </p>
                    </div>
                }
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                style={{ display: "none" }}
              />
              <p style={styles.photoHint}>
                📌 Please ensure your face is clearly visible and well-lit
              </p>
            </div>

            {/* Niqabi toggle */}
            <label style={styles.niqabiToggle}>
              <input
                type="checkbox"
                checked={isNiqabi}
                onChange={e => setIsNiqabi(e.target.checked)}
                style={{ marginLeft: 8, width: 16, height: 16 }}
              />
              <span>I wear niqab (periocular recognition will be used)</span>
            </label>

            {/* Form fields */}
            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Student ID *</label>
                <input
                  name="student_id" value={form.student_id}
                  onChange={handleChange} required
                  placeholder="e.g. 20230001"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Full Name *</label>
                <input
                  name="name" value={form.name}
                  onChange={handleChange} required
                  placeholder="e.g. Ahmed Hassan"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>University Email *</label>
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} required
                  placeholder="student@university.edu"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Department *</label>
                <select
                  name="department" value={form.department}
                  onChange={handleChange}
                  style={{ ...styles.input, cursor: "pointer" }}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error message */}
            {formState === "error" && (
              <div style={styles.errorBox}>❌ {message}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formState === "submitting"}
              style={{
                ...styles.submitBtn,
                opacity: formState === "submitting" ? 0.7 : 1,
                cursor:  formState === "submitting" ? "not-allowed" : "pointer",
              }}
            >
              {formState === "submitting" ? "⏳ Registering..." : "✅ Register"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:       "100vh",
    background:      "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         "24px 16px",
  },
  card: {
    background:   "#ffffff",
    borderRadius: 20,
    padding:      "40px 36px",
    width:        "100%",
    maxWidth:     560,
    boxShadow:    "0 25px 60px rgba(0,0,0,0.3)",
  },
  header: { textAlign: "center", marginBottom: 28 },
  logo:   { fontSize: 52, marginBottom: 8 },
  title:  { margin: 0, fontSize: 26, fontWeight: 800, color: "#0f172a" },
  subtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 14 },

  photoSection:  { textAlign: "center", marginBottom: 20 },
  photoPreview: {
    width:        150, height: 150, borderRadius: "50%",
    border:       "3px dashed #94a3b8",
    margin:       "0 auto 10px",
    display:      "flex", alignItems: "center", justifyContent: "center",
    cursor:       "pointer", overflow: "hidden",
    background:   "#f8fafc",
    transition:   "border-color .2s",
  },
  previewImg:      { width: "100%", height: "100%", objectFit: "cover" },
  photoPlaceholder: { textAlign: "center" },
  photoHint:       { fontSize: 12, color: "#94a3b8", margin: 0 },

  niqabiToggle: {
    display:       "flex",
    alignItems:    "center",
    gap:           8,
    fontSize:      13,
    color:         "#475569",
    marginBottom:  20,
    cursor:        "pointer",
    flexDirection: "row-reverse",
    justifyContent: "flex-end",
  },

  grid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: {
    padding:      "10px 14px",
    border:       "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize:     14,
    outline:      "none",
    color:        "#0f172a",
    background:   "#f8fafc",
    width:        "100%",
    boxSizing:    "border-box",
  },

  errorBox: {
    background:   "#fef2f2",
    border:       "1px solid #fca5a5",
    borderRadius: 10,
    padding:      "10px 14px",
    color:        "#dc2626",
    fontSize:     14,
    marginBottom: 16,
  },
  successBox: { textAlign: "center", padding: "20px 0" },

  submitBtn: {
    width:        "100%",
    padding:      "14px",
    background:   "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color:        "#fff",
    border:       "none",
    borderRadius: 12,
    fontSize:     16,
    fontWeight:   700,
    letterSpacing: 0.5,
    transition:   "opacity .2s",
  },
};
