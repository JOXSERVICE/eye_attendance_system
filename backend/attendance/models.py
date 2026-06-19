"""
models.py — University Smart Attendance System
"""
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
import json


class FloatListField(models.TextField):
    def from_db_value(self, value, expression, connection):
        return self.to_python(value)
    def to_python(self, value):
        if value is None or value == "": return []
        if isinstance(value, list): return value
        try: return [float(v) for v in json.loads(value)]
        except: return []
    def get_prep_value(self, value):
        if value is None: return None
        if isinstance(value, list): return json.dumps([float(v) for v in value])
        return value


class UserRole(models.TextChoices):
    """User roles in the system"""
    STUDENT   = "STUDENT",   "Student"
    PROFESSOR = "PROFESSOR", "Professor"
    ADMIN     = "ADMIN",     "Administrator"


class UserProfile(models.Model):
    """
    Extended user profile to track roles and OAuth info.
    Links to Django's built-in User model.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.STUDENT)
    
    # OAuth/Social authentication
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    linkedin_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
    
    def __str__(self):
        return f"{self.user.email} — {self.role}"


class Department(models.TextChoices):
    CS   = "CS",   "Computer Science"
    IT   = "IT",   "Information Technology"
    EE   = "EE",   "Electrical Engineering"
    ME   = "ME",   "Mechanical Engineering"
    CE   = "CE",   "Civil Engineering"
    BIO  = "BIO",  "Biomedical Engineering"
    MATH = "MATH", "Mathematics"
    OTHER= "OTH",  "Other"


class AttendanceStatus(models.TextChoices):
    PRESENT = "Present", "Present"
    ABSENT  = "Absent",  "Absent"


# ── Registration Window ──────────────────────────────────────────────────────
class RegistrationWindow(models.Model):
    """
    Admin opens/closes this window at the start of the academic year.
    Students can only register when is_open = True.
    """
    is_open   = models.BooleanField(default=False)
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Registration Window"

    def __str__(self):
        return f"Registration Window — {'OPEN' if self.is_open else 'CLOSED'}"

    def open_window(self):
        self.is_open   = True
        self.opened_at = timezone.now()
        self.closed_at = None
        self.save()

    def close_window(self):
        self.is_open   = False
        self.closed_at = timezone.now()
        self.save()


# ── Student ──────────────────────────────────────────────────────────────────
class Student(models.Model):
    student_id     = models.CharField(primary_key=True, max_length=20)
    name           = models.CharField(max_length=150)
    email          = models.EmailField(unique=True)
    department     = models.CharField(max_length=10, choices=Department.choices, default=Department.CS)
    photo          = models.ImageField(upload_to="students/photos/", null=True, blank=True)
    face_embedding = FloatListField(blank=True, default=list)
    is_niqabi      = models.BooleanField(default=False,
                         help_text="If True → periocular recognition used")
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.student_id} — {self.name}"

    def has_embedding(self):
        return bool(self.face_embedding)

    @property
    def embedding_dim(self):
        return len(self.face_embedding)


# ── Course ───────────────────────────────────────────────────────────────────
class Course(models.Model):
    course_id         = models.CharField(primary_key=True, max_length=20)
    course_name       = models.CharField(max_length=200)
    doctor_name       = models.CharField(max_length=150)
    enrolled_students = models.ManyToManyField(Student, blank=True, related_name="courses")
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["course_id"]

    def __str__(self):
        return f"{self.course_id} — {self.course_name}"

    @property
    def student_count(self):
        return self.enrolled_students.count()


# ── LectureSession ───────────────────────────────────────────────────────────
class LectureSession(models.Model):
    STATUS = [("pending","Pending"),("processing","Processing"),
              ("done","Done"),("failed","Failed")]

    course         = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sessions")
    date           = models.DateField(default=timezone.now)
    lecture_image  = models.ImageField(upload_to="lectures/%Y/%m/%d/")
    uploaded_by    = models.CharField(max_length=150)
    status         = models.CharField(max_length=15, choices=STATUS, default="pending")
    processed_at   = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.course.course_id} | {self.date} [{self.status}]"


# ── Attendance ───────────────────────────────────────────────────────────────
class Attendance(models.Model):
    student          = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendances")
    course           = models.ForeignKey(Course,  on_delete=models.CASCADE, related_name="attendances")
    session          = models.ForeignKey(LectureSession, on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name="attendances")
    date             = models.DateField(default=timezone.now)
    time_in          = models.TimeField()
    status           = models.CharField(max_length=10, choices=AttendanceStatus.choices,
                                        default=AttendanceStatus.PRESENT)
    similarity_score = models.FloatField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering        = ["-date", "-time_in"]
        unique_together = [("student", "course", "date")]

    def __str__(self):
        return f"{self.student.name} | {self.course.course_id} | {self.date} [{self.status}]"
