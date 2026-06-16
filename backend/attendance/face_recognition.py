"""
face_recognition.py — AI Face Recognition Pipeline
====================================================
University Attendance System

Pipeline:
1. Load lecture hall image
2. Super-Resolution (EDSR) — enhance image quality
3. OpenCV face detection — find all faces
4. DeepFace embedding — extract 128-D vector per face
5. Cosine similarity vs stored embeddings
6. Return matched student IDs

For niqabi students → periocular (eye region) recognition fallback
"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from deepface import DeepFace

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SIMILARITY_THRESHOLD  = 0.68   # cosine similarity ≥ this → match
FACE_DETECTOR         = "retinaface"   # best accuracy: retinaface / mtcnn / opencv
EMBEDDING_MODEL       = "Facenet"      # Facenet (128-D) or VGG-Face (2622-D)
DISTANCE_METRIC       = "cosine"

# Periocular (eye region) constants for niqabi students
LEFT_EYE_LANDMARKS   = [33, 7, 163, 144, 145, 153, 154, 155,
                         133, 173, 157, 158, 159, 160, 161, 246]
RIGHT_EYE_LANDMARKS  = [362, 382, 381, 380, 374, 373, 390, 249,
                         263, 466, 388, 387, 386, 385, 384, 398]
EYE_PAD_FRACTION     = 0.40


# ---------------------------------------------------------------------------
# 1. Super-Resolution (EDSR) — enhance blurry lecture hall images
# ---------------------------------------------------------------------------

def enhance_image(img_bgr: np.ndarray) -> np.ndarray:
    """
    Upscale image using OpenCV's built-in EDSR Super Resolution model.
    Falls back to bicubic interpolation if model not available.
    """
    try:
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        model_path = Path(__file__).parent / "models" / "EDSR_x2.pb"

        if model_path.exists():
            sr.readModel(str(model_path))
            sr.setModel("edsr", 2)
            upscaled = sr.upsample(img_bgr)
            logger.info("EDSR Super-Resolution applied (x2)")
            return upscaled
        else:
            # Fallback: bicubic x2
            h, w = img_bgr.shape[:2]
            upscaled = cv2.resize(img_bgr, (w * 2, h * 2),
                                  interpolation=cv2.INTER_CUBIC)
            logger.info("Bicubic upscale applied (EDSR model not found at %s)", model_path)
            return upscaled
    except Exception as e:
        logger.warning("Super-resolution failed: %s — using original", e)
        return img_bgr


# ---------------------------------------------------------------------------
# 2. Extract single-face embedding (for student registration)
# ---------------------------------------------------------------------------

def extract_face_embedding(image_path: str | Path) -> list[float]:
    """
    Extract a 128-D face embedding from a student's registration photo.

    Parameters
    ----------
    image_path : path to the student's clear frontal photo

    Returns
    -------
    list[float] — 128-D L2-normalised DeepFace embedding

    Raises
    ------
    ValueError  — if no face detected
    FileNotFoundError — if image not found
    """
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    try:
        result = DeepFace.represent(
            img_path     = str(image_path),
            model_name   = EMBEDDING_MODEL,
            detector_backend = FACE_DETECTOR,
            enforce_detection = True,
        )

        if not result:
            raise ValueError("No face detected in the image.")

        embedding = np.array(result[0]["embedding"], dtype=np.float32)
        embedding = embedding / (np.linalg.norm(embedding) + 1e-10)

        logger.info("Face embedding extracted — dim=%d  source=%s",
                    len(embedding), image_path.name)
        return embedding.tolist()

    except ValueError as e:
        raise ValueError(f"Face not detected in {image_path.name}: {e}")
    except Exception as e:
        raise RuntimeError(f"DeepFace error for {image_path.name}: {e}")


# ---------------------------------------------------------------------------
# 3. Process lecture hall image → list of embeddings
# ---------------------------------------------------------------------------

def process_lecture_image(image_path: str | Path) -> list[dict]:
    """
    Detect ALL faces in a lecture hall image and return their embeddings.

    Steps:
      1. Load & enhance with Super-Resolution
      2. Detect all faces with RetinaFace
      3. Extract DeepFace embedding per face

    Returns
    -------
    list of dicts:
      [
        {
          "face_index": 0,
          "embedding": [float, ...],   # 128-D
          "region": {"x": int, "y": int, "w": int, "h": int},
          "confidence": float,
        },
        ...
      ]
    """
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise RuntimeError(f"OpenCV could not read: {image_path}")

    # Step 1 — Super-Resolution
    img_enhanced = enhance_image(img_bgr)

    # Save enhanced image to temp file for DeepFace
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = tmp.name
        cv2.imwrite(tmp_path, img_enhanced)

    try:
        # Step 2 & 3 — Detect + embed all faces
        results = DeepFace.represent(
            img_path         = tmp_path,
            model_name       = EMBEDDING_MODEL,
            detector_backend = FACE_DETECTOR,
            enforce_detection = False,   # don't raise if some faces missed
        )
    except Exception as e:
        logger.error("DeepFace.represent failed: %s", e)
        results = []
    finally:
        os.unlink(tmp_path)

    faces = []
    for i, r in enumerate(results):
        emb = np.array(r["embedding"], dtype=np.float32)
        emb = emb / (np.linalg.norm(emb) + 1e-10)
        faces.append({
            "face_index": i,
            "embedding":  emb.tolist(),
            "region":     r.get("facial_area", {}),
            "confidence": r.get("face_confidence", 1.0),
        })

    logger.info("Detected %d faces in %s", len(faces), image_path.name)
    return faces


# ---------------------------------------------------------------------------
# 4. Match faces against enrolled students
# ---------------------------------------------------------------------------

def match_faces_to_students(
    detected_faces: list[dict],
    students: list,                # list of Student model instances
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict]:
    """
    Match each detected face embedding against every enrolled student.

    Parameters
    ----------
    detected_faces : output of process_lecture_image()
    students       : queryset / list of Student ORM objects
    threshold      : cosine similarity threshold

    Returns
    -------
    list of match dicts:
      [
        {
          "student_id":   str,
          "student_name": str,
          "similarity":   float,
          "face_index":   int,
        },
        ...
      ]
    """
    matched = []
    used_faces = set()   # prevent double-counting one face

    for student in students:
        if not student.has_embedding():
            logger.warning("Student %s has no embedding — skipping", student.student_id)
            continue

        stored_emb = np.array(student.face_embedding, dtype=np.float32)
        best_sim   = -1.0
        best_idx   = -1

        for face in detected_faces:
            if face["face_index"] in used_faces:
                continue
            detected_emb = np.array(face["embedding"], dtype=np.float32)
            sim = float(np.dot(stored_emb, detected_emb) /
                        (np.linalg.norm(stored_emb) * np.linalg.norm(detected_emb) + 1e-10))
            if sim > best_sim:
                best_sim = sim
                best_idx = face["face_index"]

        if best_sim >= threshold and best_idx >= 0:
            used_faces.add(best_idx)
            matched.append({
                "student_id":   student.student_id,
                "student_name": student.name,
                "similarity":   round(best_sim, 4),
                "face_index":   best_idx,
            })
            logger.info("✅ Match: %s — sim=%.4f", student.student_id, best_sim)
        else:
            logger.debug("No match for %s — best_sim=%.4f", student.student_id, best_sim)

    return matched


# ---------------------------------------------------------------------------
# 5. Periocular recognition (for niqabi students)
# ---------------------------------------------------------------------------

try:
    import mediapipe as mp
    _MP_AVAILABLE = True
except ImportError:
    _MP_AVAILABLE = False
    logger.warning("MediaPipe not installed — periocular recognition unavailable")


def extract_periocular_embedding(image_path: str | Path) -> list[float]:
    """
    Extract eye-region embedding for students who wear niqab.
    Falls back gracefully if MediaPipe is unavailable.
    """
    if not _MP_AVAILABLE:
        raise RuntimeError("MediaPipe is required for periocular recognition.")

    from skimage.feature import local_binary_pattern

    image_path = Path(image_path)
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise FileNotFoundError(f"Cannot read: {image_path}")

    img_h, img_w = img_bgr.shape[:2]
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5
    )
    results = face_mesh.process(img_rgb)

    if not results.multi_face_landmarks:
        raise ValueError("No face landmarks detected for periocular recognition.")

    lm = results.multi_face_landmarks[0].landmark

    def get_crop(indices):
        xs = [lm[i].x * img_w for i in indices]
        ys = [lm[i].y * img_h for i in indices]
        pad_x = (max(xs) - min(xs)) * EYE_PAD_FRACTION
        pad_y = (max(ys) - min(ys)) * EYE_PAD_FRACTION
        x1 = int(max(min(xs) - pad_x, 0))
        y1 = int(max(min(ys) - pad_y, 0))
        x2 = int(min(max(xs) + pad_x, img_w))
        y2 = int(min(max(ys) + pad_y, img_h))
        return img_bgr[y1:y2, x1:x2] if x2 > x1 and y2 > y1 else None

    left  = get_crop(LEFT_EYE_LANDMARKS)
    right = get_crop(RIGHT_EYE_LANDMARKS)

    crops = [c for c in [left, right] if c is not None]
    if not crops:
        raise ValueError("Eye region crop failed.")

    # Resize & concatenate
    h = max(c.shape[0] for c in crops)
    w = max(c.shape[1] for c in crops)
    resized = [cv2.resize(c, (w, h)) for c in crops]
    strip = np.concatenate(resized, axis=1)

    # CLAHE + LBP
    gray  = cv2.cvtColor(strip, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    gray  = clahe.apply(gray)
    lbp   = local_binary_pattern(gray, 24, 3, method="uniform")
    hist, _ = np.histogram(lbp.ravel(), bins=26, range=(0, 26), density=True)
    vec = hist.astype(np.float32)
    vec = vec / (np.linalg.norm(vec) + 1e-10)
    return vec.tolist()


# ---------------------------------------------------------------------------
# 6. Similarity utilities
# ---------------------------------------------------------------------------

def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb) + 1e-10))
