from django.urls import path
from .views import (
    RegistrationWindowStatusView, StudentRegistrationView,
    LectureSessionUploadView, SessionStatusView,
    AttendanceListView, AttendanceReportView,
    AttendanceExportView, StudentSummaryView, CourseListView,
)
from .auth_views import (
    GoogleAuthView, LinkedInAuthView, UserProfileView, LogoutView
)

app_name = "attendance"

urlpatterns = [
    # ── Authentication Endpoints ──────────────────────────────────────────────
    path("auth/google/",              GoogleAuthView.as_view(),        name="auth-google"),
    path("auth/linkedin/",            LinkedInAuthView.as_view(),      name="auth-linkedin"),
    path("auth/me/",                  UserProfileView.as_view(),       name="auth-profile"),
    path("auth/logout/",              LogoutView.as_view(),            name="auth-logout"),
    
    # ── Registration & Student Endpoints ──────────────────────────────────────
    path("registration/status/",              RegistrationWindowStatusView.as_view(), name="reg-status"),
    path("students/register/",                StudentRegistrationView.as_view(),      name="student-register"),
    
    # ── Lecture Session & Attendance Endpoints ────────────────────────────────
    path("sessions/upload/",                  LectureSessionUploadView.as_view(),     name="session-upload"),
    path("sessions/<int:session_id>/status/", SessionStatusView.as_view(),            name="session-status"),
    path("attendance/",                       AttendanceListView.as_view(),           name="attendance-list"),
    path("attendance/report/",                AttendanceReportView.as_view(),         name="attendance-report"),
    path("attendance/export/",                AttendanceExportView.as_view(),         name="attendance-export"),
    path("student/<str:student_id>/summary/", StudentSummaryView.as_view(),          name="student-summary"),
    path("courses/",                          CourseListView.as_view(),               name="course-list"),
]
