<div align="center">

# 👁️ University Eye Attendance System

**An Intelligent, Automated, Full-Stack Biometric Attendance Ecosystem**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)]()
[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)]()
[![Status: Active Development](https://img.shields.io/badge/Status-Active_Development-orange?style=for-the-badge)]()

*Architected with precision for modern academic institutions.*

</div>

---

## 🚀 About The Project

The **University Eye Attendance System** is a long-term development initiative aimed at revolutionizing how academic attendance is recorded. By leveraging real-time facial recognition directly through the web browser, this system eliminates manual roll calls, prevents proxy attendance, and provides professors with a highly secure, dynamic control panel.

Currently in its foundational phase, we have successfully migrated to a robust **Full-Stack Web Architecture**, ensuring maximum scalability and performance.

### ✨ Key Features
- 📸 **Real-Time Browser Recognition:** Captures and processes video streams and facial data directly via the web browser without needing a dedicated mobile app.
- ⏱️ **Dynamic Academic Windows:** Professors can create, open, and close `RegistrationWindows` dynamically. The system automatically rejects attendance attempts outside these active periods.
- 🛡️ **Seamless & Secure Architecture:** Custom API routes bridging the Django backend and React frontend, with carefully handled CORS and CSRF bypass mechanisms for secure data flow.
- 📊 **Smart Dashboards:** Tailored interfaces for Students (Portal), Professors (Control), and Admins (System Management).

---

## 🛠️ Technology Stack

Our architecture is strictly divided to ensure clean code separation and maintainability:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | High-performance, blazing-fast user interface. |
| **Backend** | Django + DRF | Secure, robust API routing and core business logic. |
| **Database** | PostgreSQL | Relational database for structured student logs and active windows. |

---

## 📂 Project Structure

```text
eye_attendance_system/
├── backend/                  # Django Core System
│   ├── attendance_system/    # Main settings, URLs, and WSGI/ASGI
│   ├── attendance/           # Core app (Models, Views, Face Recognition Logic)
│   ├── media/                # Stored student reference photos
│   ├── manage.py             # Django entry point
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React + Vite UI
    ├── src/                  # React components and assets
    ├── index.html            # Vite entry point
    ├── package.json          # Node dependencies
    └── vite.config.js        # Vite configurations
