"""
admin.py — University Smart Attendance System
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Student, Course, Attendance, LectureSession, RegistrationWindow, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user_email", "role_badge", "oauth_providers", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("user__email", "user__username")
    readonly_fields = ("created_at", "updated_at")
    
    @admin.display(description="Email")
    def user_email(self, obj):
        return obj.user.email
    
    @admin.display(description="Role")
    def role_badge(self, obj):
        colors = {
            "STUDENT": "blue",
            "PROFESSOR": "green",
            "ADMIN": "red"
        }
        color = colors.get(obj.role, "gray")
        return format_html(
            '<span style="color:{};font-weight:bold;font-size:14px">🔹 {}</span>',
            color, obj.role
        )
    
    @admin.display(description="OAuth")
    def oauth_providers(self, obj):
        providers = []
        if obj.google_id:
            providers.append("Google ✓")
        if obj.linkedin_id:
            providers.append("LinkedIn ✓")
        return ", ".join(providers) if providers else "—"


@admin.register(RegistrationWindow)
class RegistrationWindowAdmin(admin.ModelAdmin):
    list_display  = ("status_badge", "opened_at", "closed_at")
    readonly_fields = ("opened_at", "closed_at")
    actions       = ["open_window", "close_window"]

    @admin.display(description="Status")
    def status_badge(self, obj):
        if obj.is_open:
            return format_html('<span style="color:green;font-weight:bold;font-size:16px">🟢 OPEN</span>')
        return format_html('<span style="color:red;font-weight:bold;font-size:16px">🔴 CLOSED</span>')

    @admin.action(description="✅ Open Registration Window")
    def open_window(self, request, queryset):
        for w in queryset: w.open_window()
        self.message_user(request, "Registration window is now OPEN.")

    @admin.action(description="🔒 Close Registration Window")
    def close_window(self, request, queryset):
        for w in queryset: w.close_window()
        self.message_user(request, "Registration window is now CLOSED.")


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ("student_id", "name", "email", "department",
                     "is_niqabi", "embedding_badge", "created_at")
    list_filter   = ("department", "is_niqabi")
    search_fields = ("student_id", "name", "email")

    @admin.display(description="Embedding")
    def embedding_badge(self, obj):
        if obj.has_embedding():
            return format_html('<span style="color:green">✔ {}D</span>', obj.embedding_dim)
        return format_html('<span style="color:red">✘ Not enrolled</span>')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display      = ("course_id", "course_name", "doctor_name", "student_count")
    search_fields     = ("course_id", "course_name", "doctor_name")
    filter_horizontal = ("enrolled_students",)


@admin.register(LectureSession)
class LectureSessionAdmin(admin.ModelAdmin):
    list_display = ("course", "date", "uploaded_by", "status_badge", "processed_at")
    list_filter  = ("status", "date", "course")

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {"pending":"#f59e0b","processing":"#3b82f6","done":"#16a34a","failed":"#dc2626"}
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>',
            colors.get(obj.status, "#000"), obj.status.upper()
        )


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display   = ("student", "course", "date", "time_in", "status_badge", "similarity_score")
    list_filter    = ("status", "date", "course")
    search_fields  = ("student__name", "student__student_id")
    date_hierarchy = "date"

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = "#16a34a" if obj.status == "Present" else "#dc2626"
        return format_html('<span style="color:{};font-weight:bold">{}</span>', color, obj.status)
