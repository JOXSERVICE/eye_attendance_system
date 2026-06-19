"""
tasks.py — Celery Background Tasks
====================================
University Face Attendance System

Tasks:
- process_lecture_session: process lecture hall image asynchronously
- enroll_student_face: extract and store student face embedding
"""

from __future__ import annotations

import logging
from datetime import datetime

from django.utils import timezone

logger = logging.getLogger(__name__)

# Make Celery optional for development
try:
    from celery import shared_task
except ImportError:
    # Celery not installed - define a dummy decorator
    def shared_task(*args, **kwargs):
        def decorator(func):
            return func
        if len(args) == 1 and callable(args[0]):
            return args[0]
        return decorator


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def process_lecture_session(self, session_id: int):
    """
    Celery task — runs in background after professor uploads lecture photo.

    Steps:
    1. Load LectureSession from DB
    2. Run Super-Resolution + DeepFace on the image
    3. Match detected faces to enrolled students
    4. Create Attendance records for matched students
    5. Mark absent students
    6. Update session status → "done"
    """
    from .models import Attendance, AttendanceStatus, LectureSession, Student
    from .face_recognition import match_faces_to_students, process_lecture_image

    try:
        session = LectureSession.objects.select_related("course").get(pk=session_id)
    except LectureSession.DoesNotExist:
        logger.error("LectureSession #%d not found", session_id)
        return

    # Mark as processing
    session.status = "processing"
    session.save(update_fields=["status"])
    logger.info("🔄 Processing session #%d — course=%s date=%s",
                session_id, session.course.course_id, session.date)

    try:
        # ── Step 1: Detect all faces in lecture image ──────────────────────
        detected_faces = process_lecture_image(session.lecture_image.path)
        logger.info("Detected %d faces in session #%d", len(detected_faces), session_id)

        # ── Step 2: Get enrolled students ──────────────────────────────────
        enrolled = list(
            session.course.enrolled_students.filter(face_embedding__isnull=False)
            .exclude(face_embedding="[]")
            .exclude(face_embedding="")
        )

        # ── Step 3: Match faces → students ─────────────────────────────────
        matches = match_faces_to_students(detected_faces, enrolled)
        matched_ids = {m["student_id"] for m in matches}

        now = timezone.now()
        present_count = 0
        absent_count  = 0

        # ── Step 4: Create Present records ─────────────────────────────────
        for match in matches:
            student = next(s for s in enrolled if s.student_id == match["student_id"])
            _, created = Attendance.objects.get_or_create(
                student = student,
                course  = session.course,
                date    = session.date,
                defaults={
                    "session":          session,
                    "time_in":          now.time(),
                    "status":           AttendanceStatus.PRESENT,
                    "similarity_score": match["similarity"],
                },
            )
            if created:
                present_count += 1

        # ── Step 5: Mark unmatched students as Absent ──────────────────────
        for student in enrolled:
            if student.student_id not in matched_ids:
                _, created = Attendance.objects.get_or_create(
                    student = student,
                    course  = session.course,
                    date    = session.date,
                    defaults={
                        "session":  session,
                        "time_in":  now.time(),
                        "status":   AttendanceStatus.ABSENT,
                    },
                )
                if created:
                    absent_count += 1

        # ── Step 6: Mark session done ──────────────────────────────────────
        session.status       = "done"
        session.processed_at = now
        session.save(update_fields=["status", "processed_at"])

        logger.info(
            "✅ Session #%d done — Present: %d | Absent: %d",
            session_id, present_count, absent_count,
        )
        return {
            "session_id":    session_id,
            "present_count": present_count,
            "absent_count":  absent_count,
            "total_faces":   len(detected_faces),
        }

    except Exception as exc:
        session.status = "failed"
        session.save(update_fields=["status"])
        logger.exception("❌ Session #%d failed: %s", session_id, exc)
        raise self.retry(exc=exc)


@shared_task
def enroll_student_face(student_id: str, image_path: str):
    """
    Celery task — extract and store face embedding after student registration.
    """
    from .models import Student
    from .face_recognition import (extract_face_embedding,
                                   extract_periocular_embedding)

    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        logger.error("Student %s not found for enrollment", student_id)
        return

    try:
        if student.is_niqabi:
            embedding = extract_periocular_embedding(image_path)
            logger.info("Periocular embedding stored for %s", student_id)
        else:
            embedding = extract_face_embedding(image_path)
            logger.info("Face embedding stored for %s", student_id)

        student.face_embedding = embedding
        student.save(update_fields=["face_embedding", "updated_at"])

    except Exception as exc:
        logger.exception("Enrollment failed for %s: %s", student_id, exc)
