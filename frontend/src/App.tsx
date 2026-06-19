// App.tsx — Enterprise University Architecture (Premium Layout & Routing)
import React, { useState, useEffect, ReactNode } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  Navigate, 
  useLocation, 
  useNavigate 
} from "react-router-dom";

// استيراد الصفحات من الفولدرات الخاصة بها
import StudentRegister from "./pages/StudentRegister";
import ProfessorUpload from "./pages/ProfessorUpload";
import AdminDashboard from "./pages/AdminDashboard";
import StudentPortal from "./pages/StudentPortal";

// تحديد أنواع المستخدمين في السيستم الجامعي
type UserRole = "STUDENT" | "PROFESSOR" | "ADMIN" | null;
type Language = "en" | "ar";

// ==========================================
// 🔧 TypeScript Interfaces for Component Props
// ==========================================
interface LoginPageProps {
  setUserRole: (role: UserRole) => void;
  lang: Language;
  toggleLanguage: () => void;
}

interface StudentLayoutProps {
  children: ReactNode;
  lang: Language;
  setUserRole: (role: UserRole) => void;
}

interface AdminLayoutProps {
  children: ReactNode;
  lang: Language;
  setUserRole: (role: UserRole) => void;
  role: UserRole;
  toggleLanguage: () => void;
}

interface ProtectedRouteProps {
  isAllowed: boolean;
  children: ReactNode;
}

export default function App() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  
  // المحرك الأساسي للسيستم: تخزين صلاحية المستخدم الحالي (الافتراضي null لصفحة الدخول)
  const [userRole, setUserRole] = useState<UserRole>(null); 

  // تفعيل قلب اتجاه الموقع تلقائياً (RTL للعربي و LTR للإنجليزي)
  useEffect(() => {
    document.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "ar" : "en"));
  };

  return (
    <Router>
      <Routes>
        {/* 🔐 صفحة الدخول الموحدة الشاملة (Google / LinkedIn) */}
        <Route path="/login" element={<LoginPage setUserRole={setUserRole} lang={lang} toggleLanguage={toggleLanguage} />} />

        {/* 📝 لوحة إنشاء الحساب الجديد للطلبة */}
        <Route path="/register" element={
          <StudentLayout lang={lang} setUserRole={setUserRole}>
            <StudentRegister />
          </StudentLayout>
        } />

        {/* 🎓 بوابة الطالب الشخصية: محمية ومفتوحة فقط للطلبة أو الأدمن */}
        <Route path="/portal" element={
          <ProtectedRoute isAllowed={userRole === "STUDENT" || userRole === "ADMIN"}>
            <StudentLayout lang={lang} setUserRole={setUserRole}>
              <StudentPortal />
            </StudentLayout>
          </ProtectedRoute>
        } />

        {/* 👨‍🏫 واجهة الدكتور: محمية ومفتوحة فقط للدكاترة أو الأدمن */}
        <Route path="/professor" element={
          <ProtectedRoute isAllowed={userRole === "PROFESSOR" || userRole === "ADMIN"}>
            <AdminLayout lang={lang} setUserRole={setUserRole} role={userRole} toggleLanguage={toggleLanguage}>
              <ProfessorUpload />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* 📊 لوحة تحكم الأدمن: محمية وصارمة جداً (مفتوحة للأدمن فقط) */}
        <Route path="/admin" element={
          <ProtectedRoute isAllowed={userRole === "ADMIN"}>
            <AdminLayout lang={lang} setUserRole={setUserRole} role={userRole} toggleLanguage={toggleLanguage}>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* توجيه تلقائي لصفحة الدخول في حالة كتابة أي رابط خطأ */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

// ==========================================
// 🛡️ مكون الحماية الصارم (Route Guard)
// ==========================================
function ProtectedRoute({ isAllowed, children }: ProtectedRouteProps): React.ReactElement {
  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// ==========================================
// 🔐 صفحة الدخول الموحدة (LoginPage Component)
// ==========================================
function LoginPage({ setUserRole, lang, toggleLanguage }: LoginPageProps): React.ReactElement {
  const [id, setId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    // تسجيل دخول تجريبي بناءً على الحسابات المكتوبة
    if (id === "admin" && password === "admin123") {
      setUserRole("ADMIN");
      navigate("/admin");
    } else if (id === "prof" && password === "prof123") {
      setUserRole("PROFESSOR");
      navigate("/professor");
    } else {
      setUserRole("STUDENT");
      navigate("/portal");
    }
  };

  const handleSocialLogin = (platform: "google" | "linkedin"): void => {
    console.log(`Connecting via ${platform}...`);
    // هنا بيتم الربط مع API الـ Django لاحقاً
  };

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <form onSubmit={handleLogin} style={{ backgroundColor: "#fff", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)", width: "100%", maxWidth: "420px" }}>
        
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ fontSize: "36px" }}>👁️</span>
          <h2 style={{ margin: "10px 0 4px 0", color: "#0f172a", fontSize: "22px", fontWeight: 700 }}>
            {lang === "en" ? "University Portal" : "البوابة الجامعية الموحدة"}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            {lang === "en" ? "Sign in to manage your attendance" : "سجل دخولك لإدارة ومتابعة الحضور الجامعي"}
          </p>
        </div>
        
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>{lang === "en" ? "Academic ID / Email" : "الرقم الجامعي / البريد الإلكتروني"}</label>
          <input type="text" value={id} onChange={e => setId(e.target.value)} required style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>{lang === "en" ? "Password" : "كلمة المرور"}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} />
        </div>

        <button type="submit" style={{ width: "100%", backgroundColor: "#0f172a", color: "#fff", padding: "12px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer", marginBottom: "16px" }}>
          {lang === "en" ? "Sign In" : "تسجيل الدخول"}
        </button>

        {/* 📝 رابط إنشاء حساب جديد الفخم */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            {lang === "en" ? "Don't have an account? " : "ليس لديك حساب؟ "}
          </span>
          <Link to="/register" style={{ color: "#2563eb", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            {lang === "en" ? "Create an Account" : "إنشاء حساب جديد"}
          </Link>
        </div>

        {/* خط فاصل شيك بين الفورم والسوشيال */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }}></div>
          <span style={{ padding: "0 10px", fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>{lang === "en" ? "OR CONTINUE WITH" : "أو سجل عبر"}</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }}></div>
        </div>

        {/* 🌐 أزرار السوشيال ميديا (Google & LinkedIn) */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button type="button" onClick={() => handleSocialLogin("google")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", fontSize: "13.5px", fontWeight: 500, color: "#334155" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.36 1 3.4 3.65 1.5 7.5l3.6 2.8C6.04 7.04 8.76 5.04 12 5.04z"/><path fill="#4285F4" d="M23.5 12.25c0-.82-.07-1.6-.2-2.38H12v4.5h6.48c-.28 1.48-1.12 2.73-2.38 3.58l3.6 2.8c2.1-1.94 3.3-4.8 3.3-8.5z"/><path fill="#FBBC05" d="M5.1 14.7c-.25-.75-.4-1.55-.4-2.4s.15-1.65.4-2.4L1.5 7.1C.54 9.05 0 11.24 0 13.5s.54 4.45 1.5 6.4l3.6-2.8z"/><path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.6-2.8c-1.2.8-2.73 1.28-4.36 1.28-3.24 0-5.96-2-6.9-4.86l-3.6 2.8C3.4 20.35 7.36 23 12 23z"/></svg>
            Google
          </button>

          <button type="button" onClick={() => handleSocialLogin("linkedin")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", fontSize: "13.5px", fontWeight: 500, color: "#334155" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            LinkedIn
          </button>
        </div>

        <center>
          <button type="button" onClick={toggleLanguage} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
            🌐 {lang === "en" ? "العربية" : "English"}
          </button>
        </center>
      </form>
    </div>
  );
}

// ==========================================
// 🎓 أولاً: واجهة الطالب الشاملة (رؤية نظيفة بدون سايد بار)
// ==========================================
function StudentLayout({ children, lang, setUserRole }: StudentLayoutProps): React.ReactElement {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ height: "70px", backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🎓</span>
          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "16px" }}>
            {lang === "en" ? "Smart Attendance Portal" : "بوابة الحضور الذكي للمستندات"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link to="/login" onClick={() => setUserRole(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #f43f5e", backgroundColor: "transparent", color: "#f43f5e", cursor: "pointer", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            {lang === "en" ? "Sign Out" : "تسجيل الخروج"}
          </Link>
        </div>
      </header>
      <main style={{ padding: "40px 20px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// ⚙️ ثانياً: واجهة الإدارة والدكاترة (يحتوي على السايد بار الغامق الشيك)
// ==========================================
function AdminLayout({ children, lang, setUserRole, role, toggleLanguage }: AdminLayoutProps): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  interface LanguageStrings {
    title: string;
    forProfessors: string;
    forAdmins: string;
    navProfessor: string;
    navAdmin: string;
    logout: string;
  }

  const strings: Record<Language, LanguageStrings> = {
    en: {
      title: "Eye Attendance System",
      forProfessors: "Faculty Services",
      forAdmins: "System Admin",
      navProfessor: "Professor Interface",
      navAdmin: "Admin Dashboard",
      logout: "Sign Out",
    },
    ar: {
      title: "نظام عين للحضور",
      forProfessors: "بوابة أعضاء هيئة التدريس",
      forAdmins: "الإدارة والنظام",
      navProfessor: "واجهة الأستاذ",
      navAdmin: "لوحة تحكم المسؤول",
      logout: "تسجيل الخروج",
    },
  };

  const currentStrings = strings[lang];

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f8fafc", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      
      {/* القائمة الجانبية */}
      <aside style={{ width: "280px", backgroundColor: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column", borderRight: lang === "en" ? "1px solid #1e293b" : "none", borderLeft: lang === "ar" ? "1px solid #1e293b" : "none", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "24px", borderBottom: "1px solid #1e293b", marginBottom: "20px" }}>
          <span style={{ fontSize: "24px" }}>👁️</span>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>{currentStrings.title}</span>
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
          {/* جزء الدكتور */}
          {(role === "PROFESSOR" || role === "ADMIN") && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", margin: "0 8px 8px 8px" }}>{currentStrings.forProfessors}</p>
              <Link to="/professor" style={navLinkStyle(location.pathname === "/professor", "#7c3aed")}>👨‍🏫 {currentStrings.navProfessor}</Link>
            </div>
          )}
          
          {/* جزء الأدمن */}
          {role === "ADMIN" && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", margin: "0 8px 8px 8px" }}>{currentStrings.forAdmins}</p>
              <Link to="/admin" style={navLinkStyle(location.pathname === "/admin", "#38bdf8")}>📊 {currentStrings.navAdmin}</Link>
            </div>
          )}
        </div>

        <div style={{ paddingTop: "16px", borderTop: "1px solid #1e293b" }}>
          <button onClick={() => { setUserRole(null); navigate("/login"); }} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "transparent", color: "#f43f5e", textAlign: lang === "en" ? "left" : "right", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", gap: "10px", alignItems: "center" }}>
            🚪 {currentStrings.logout}
          </button>
        </div>
      </aside>

      {/* منطقة الفيو اليمين */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: "70px", backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 32px" }}>
          <button onClick={toggleLanguage} style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#334155", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            🌐 {lang === "en" ? "العربية" : "English"}
          </button>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
          {children}
        </main>
      </div>

    </div>
  );
}

// دالة ستايل الروابط الاحترافية
function navLinkStyle(isActive: boolean, activeColor: string): React.CSSProperties {
  return { 
    width: "100%", 
    padding: "12px 14px", 
    borderRadius: "8px", 
    cursor: "pointer", 
    fontSize: "13.5px", 
    fontWeight: 500, 
    display: "flex", 
    alignItems: "center", 
    gap: "12px", 
    transition: "all 0.15s ease", 
    textDecoration: "none", 
    background: isActive ? activeColor : "transparent", 
    color: isActive ? "#fff" : "#94a3b8" 
  };
}