import axios, { AxiosInstance } from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000";

// ── Axios Instance with JWT Interceptor ────────────────────────────────────
const api: AxiosInstance = axios.create({ 
  baseURL: API_BASE_URL, 
  timeout: 30_000 
});

// Request interceptor to add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration - clear storage and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── OAuth Authentication ───────────────────────────────────────────────────
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  };
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  message: string;
}

export interface UserProfile {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
}

/**
 * Authenticate with Google OAuth token
 * @param googleIdToken - Google ID token from google-auth-library-gapi
 * @returns Promise with auth response including JWT tokens and user info
 */
export const authenticateWithGoogle = async (googleIdToken: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>("/api/auth/google/", {
      token: googleIdToken
    });
    
    const data = response.data;
    
    // Store tokens and user info in localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_email', data.user.email);
    
    return data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || 'Google authentication failed';
    throw new Error(errorMsg);
  }
};

/**
 * Authenticate with LinkedIn OAuth token
 * @param linkedinAccessToken - LinkedIn access token from LinkedIn SDK
 * @returns Promise with auth response including JWT tokens and user info
 */
export const authenticateWithLinkedIn = async (linkedinAccessToken: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>("/api/auth/linkedin/", {
      token: linkedinAccessToken
    });
    
    const data = response.data;
    
    // Store tokens and user info in localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_email', data.user.email);
    
    return data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || 'LinkedIn authentication failed';
    throw new Error(errorMsg);
  }
};

/**
 * Get current authenticated user's profile
 * Requires valid JWT token in Authorization header
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get<UserProfile>("/api/auth/me/");
    return response.data;
  } catch (error: any) {
    throw new Error('Failed to fetch user profile');
  }
};

/**
 * Logout and clear stored tokens
 * Optionally blacklists the refresh token on server
 */
export const logout = async (): Promise<void> => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await api.post("/api/auth/logout/", {
        refresh_token: refreshToken
      });
    }
  } catch (error) {
    console.warn('Logout request failed, but clearing local tokens');
  } finally {
    // Always clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

/**
 * Get user role from localStorage
 */
export const getUserRole = (): 'STUDENT' | 'PROFESSOR' | 'ADMIN' | null => {
  return (localStorage.getItem('user_role') as any) || null;
};

// ── Attendance Management Endpoints ────────────────────────────────────────
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
