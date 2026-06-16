# 🚀 دليل التثبيت الكامل — Smart Attendance System

---

## 🗄️ الخطوة 1 — قاعدة البيانات والـ Redis

```bash
# PostgreSQL
brew install postgresql@14
brew services start postgresql@14
psql postgres -c "CREATE DATABASE face_attendance_db;"

# Redis (للـ Celery)
brew install redis
brew services start redis
```

---

## 🐍 الخطوة 2 — Backend (Django)

```bash
cd face_attendance_system/backend

python3.12 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# عدّل .env: DB_USER=اسم المستخدم على جهازك

mkdir -p logs

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### في Terminal منفصل — شغّل Celery:
```bash
cd backend
source venv/bin/activate
celery -A attendance_system worker --loglevel=info
```

---

## 📱 الخطوة 3 — Frontend (React)

```bash
cd face_attendance_system/frontend
npm install
npm start
# هيفتح على: http://localhost:3000
```

---

## 🔗 API Endpoints

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| `GET`  | `/api/registration/status/` | حالة نافذة التسجيل |
| `POST` | `/api/students/register/` | تسجيل طالب جديد |
| `POST` | `/api/sessions/upload/` | رفع صورة المدرج |
| `GET`  | `/api/sessions/<id>/status/` | حالة المعالجة |
| `GET`  | `/api/attendance/?course_id=&date=` | سجلات الحضور |
| `GET`  | `/api/attendance/report/?course_id=` | تقرير كامل |
| `GET`  | `/api/attendance/export/?course_id=&mode=` | تحميل Excel |
| `GET`  | `/api/student/<id>/summary/` | ملخص الطالب |
| `GET`  | `/api/courses/` | قائمة المواد |
| `GET`  | `/admin/` | لوحة الإدارة |

---

## 🔒 فتح/إغلاق نافذة التسجيل (Admin فقط)

```
1. روح على: http://127.0.0.1:8000/admin
2. ادخل بـ superuser
3. Registration Windows → اختار الـ window
4. Actions → Open / Close Registration Window
```

---

## 📦 المكتبات

### Backend
| المكتبة | الوظيفة |
|---------|---------|
| Django + DRF | الـ Framework + API |
| psycopg2-binary | PostgreSQL |
| celery + redis | Background processing |
| deepface | Face Recognition (FaceNet) |
| opencv-contrib | EDSR Super-Resolution |
| mediapipe | Periocular (نقاب) |
| scikit-image | LBP Texture |
| openpyxl | Excel Export |

### Frontend
| المكتبة | الوظيفة |
|---------|---------|
| React 18 | UI Framework |
| react-webcam | كاميرا الموبايل عبر المتصفح |
| axios | HTTP requests |
