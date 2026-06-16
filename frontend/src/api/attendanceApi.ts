import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

export const getRegistrationStatus  = ()           => api.get("/api/registration/status/").then(r => r.data);
export const registerStudent        = (form: FormData) => api.post("/api/students/register/", form, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
export const uploadLectureSession   = (form: FormData) => api.post("/api/sessions/upload/", form, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
export const getSessionStatus       = (id: number) => api.get(`/api/sessions/${id}/status/`).then(r => r.data);
export const getAttendanceList      = (courseId: string, date: string) => api.get("/api/attendance/", { params: { course_id: courseId, date } }).then(r => r.data);
export const getAttendanceReport    = (courseId: string) => api.get("/api/attendance/report/", { params: { course_id: courseId } }).then(r => r.data);
export const getAttendanceExportUrl = (courseId: string, date?: string, mode = "daily") =>
  `${API_BASE_URL}/api/attendance/export/?course_id=${courseId}&date=${date ?? ""}&mode=${mode}`;
export const getStudentSummary      = (studentId: string) => api.get(`/api/student/${studentId}/summary/`).then(r => r.data);
export const getCourses             = () => api.get("/api/courses/").then(r => r.data);

export default api;
