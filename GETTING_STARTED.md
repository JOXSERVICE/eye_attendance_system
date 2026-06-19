# 🚀 OAuth Implementation - Getting Started Checklist

## Phase 1: Environment Setup (5 minutes)

### 1.1 Google OAuth Setup
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project (or select existing)
- [ ] Enable "Google+ API"
- [ ] Go to "Credentials" → Create OAuth 2.0 Client ID
- [ ] Choose "Web application"
- [ ] Add authorized URIs:
  - [ ] `http://localhost:3000`
  - [ ] `http://localhost:5173`
- [ ] Copy **Client ID** and **Client Secret**
- [ ] Save to `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### 1.2 LinkedIn OAuth Setup
- [ ] Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
- [ ] Create new application
- [ ] Go to "Auth" settings
- [ ] Add authorized redirect URIs:
  - [ ] `http://localhost:3000`
  - [ ] `http://localhost:5173`
- [ ] Copy **Client ID** and **Client Secret**
- [ ] Save to `.env` as `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`

### 1.3 Create Backend .env File
```bash
cd backend
cat > .env << 'EOF'
# Django
SECRET_KEY=your-secret-key-here
DJANGO_ENV=development

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=face_attendance_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# OAuth
GOOGLE_CLIENT_ID=<from_google_console>
GOOGLE_CLIENT_SECRET=<from_google_console>
LINKEDIN_CLIENT_ID=<from_linkedin_portal>
LINKEDIN_CLIENT_SECRET=<from_linkedin_portal>

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
```

## Phase 2: Backend Installation (10 minutes)

### 2.1 Install Python Dependencies
```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt
```

Verify installations:
```bash
python -c "import rest_framework_simplejwt; print('JWT OK')"
python -c "import google.auth; print('Google Auth OK')"
python -c "import requests; print('Requests OK')"
```

### 2.2 Run Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

Expected output:
```
Applying attendance.0001_initial...
Applying attendance.0002_... (creates UserProfile table)
```

### 2.3 Create Django Superuser (Optional)
```bash
python manage.py createsuperuser
# Email: admin@example.com
# Password: changeme123
```

### 2.4 Verify Backend
```bash
python manage.py runserver
# Server runs at http://localhost:8000
```

Visit:
- `http://localhost:8000/api/` - API root
- `http://localhost:8000/admin/` - Django admin (with credentials)

## Phase 3: Test Backend Endpoints (15 minutes)

### 3.1 Test Google OAuth Endpoint

**Option A: Using curl**

First, get a real Google token using browser console:
```javascript
// In browser console at Google OAuth provider
// Then use token in curl:
```

```bash
curl -X POST http://localhost:8000/api/auth/google/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<google_id_token_from_frontend>"
  }'
```

Expected response (201):
```json
{
  "access_token": "eyJ0eXAiOiJKV1Q...",
  "refresh_token": "eyJ0eXAiOiJKV1Q...",
  "user": {
    "email": "user@example.com",
    "username": "user",
    "role": "STUDENT"
  },
  "role": "STUDENT",
  "message": "Successfully authenticated with Google"
}
```

**Option B: Using Django Shell**
```bash
python manage.py shell

from attendance.auth_views import get_or_create_user_profile
profile, created = get_or_create_user_profile(
    email="test@example.com",
    first_name="Test",
    last_name="User",
    oauth_provider="google",
    oauth_id="12345"
)
print(f"User: {profile.user.email}, Role: {profile.role}, Created: {created}")
```

### 3.2 Test User Profile Endpoint

```bash
# Replace with access_token from auth response
ACCESS_TOKEN="<access_token_from_step_3.1>"

curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     http://localhost:8000/api/auth/me/
```

Expected response (200):
```json
{
  "email": "user@example.com",
  "username": "user",
  "first_name": "Test",
  "role": "STUDENT"
}
```

### 3.3 Test LinkedIn OAuth Endpoint

Similar to Google, but requires LinkedIn access token instead of ID token:

```bash
curl -X POST http://localhost:8000/api/auth/linkedin/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<linkedin_access_token>"
  }'
```

### 3.4 Test Admin Interface

```bash
# Navigate to http://localhost:8000/admin/
# Login with superuser credentials
# Go to "Attendance" → "User profiles"
# Verify user profiles are created with correct roles
```

## Phase 4: Frontend Integration (20 minutes)

### 4.1 Add OAuth SDKs to HTML

**File: `frontend/public/index.html`**

Add these before `</head>`:
```html
<!-- Google OAuth -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<!-- LinkedIn OAuth -->
<script type="text/javascript" src="https://platform.linkedin.com/scripts/isdk.js" async></script>
```

### 4.2 Update LoginPage Component

**File: `frontend/src/pages/LoginPage.tsx`**

Replace the manual login handler with OAuth:
```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateWithGoogle } from '../api/attendanceApi';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
        callback: async (response) => {
          try {
            const authResponse = await authenticateWithGoogle(response.credential);
            const role = authResponse.role;
            
            if (role === 'STUDENT') navigate('/portal');
            else if (role === 'PROFESSOR') navigate('/professor');
            else if (role === 'ADMIN') navigate('/admin');
          } catch (error) {
            alert('Authentication failed: ' + error.message);
          }
        },
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large' }
      );
    }
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>University Attendance System</h1>
      <div id="google-signin-button" />
    </div>
  );
}
```

### 4.3 Test Frontend Authentication

```bash
cd frontend
npm run dev
# Opens http://localhost:5173

# Click "Sign in with Google"
# Select test account
# Should redirect to /portal, /professor, or /admin based on role
```

### 4.4 Verify JWT Token Storage

Open browser DevTools → Application → localStorage:
- [ ] `access_token` - Should contain JWT
- [ ] `refresh_token` - Should contain JWT
- [ ] `user_role` - Should be STUDENT, PROFESSOR, or ADMIN
- [ ] `user_email` - Should contain email

## Phase 5: Validation (10 minutes)

### 5.1 Test Protected Endpoints

```bash
# Get access token from localStorage in browser
# In browser console:
console.log(localStorage.getItem('access_token'))

# Then test in curl:
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/courses/
```

### 5.2 Test Role-Based Access

**STUDENT can access:**
- [ ] `/portal` route
- [ ] `/api/auth/me/` endpoint

**PROFESSOR can access:**
- [ ] `/professor` route
- [ ] `/api/sessions/upload/` endpoint

**ADMIN can access:**
- [ ] `/admin` route
- [ ] All endpoints

**Should be blocked from:**
- [ ] Wrong role routes (redirects to /login)
- [ ] Protected endpoints without token (401 error)

### 5.3 Test Role Assignment

Create test users with different email domains:

```bash
# Login with different emails and verify roles:
# - student@example.com → STUDENT ✓
# - prof@professor.edu → PROFESSOR ✓
# - admin@admin.edu → ADMIN ✓
```

## Phase 6: Debugging (if needed)

### 6.1 Backend Issues

Check logs:
```bash
cd backend
tail -f logs/attendance.log
```

Common errors:
- `ModuleNotFoundError: rest_framework_simplejwt` → Run `pip install -r requirements.txt`
- `No such table: attendance_userprofile` → Run `python manage.py migrate`
- `GOOGLE_CLIENT_ID is not set` → Add to .env file

### 6.2 Frontend Issues

Open DevTools → Network tab:
- Check `/api/auth/google/` response
- Verify JWT in Authorization header
- Check localStorage for tokens

Common errors:
- `Failed to fetch google token` → Check Google Client ID
- `401 Unauthorized` → Token expired, clear localStorage and re-login
- `CORS error` → Check CORS_ALLOWED_ORIGINS in settings.py

### 6.3 OAuth Provider Issues

**Google:**
- [ ] Client ID matches console
- [ ] Redirect URI added to allowed list
- [ ] Google+ API enabled
- [ ] Token not expired (< 1 hour)

**LinkedIn:**
- [ ] Client ID matches portal
- [ ] Access token has user profile permission
- [ ] Application approved
- [ ] Token not expired (< 1 hour)

## Phase 7: Production Preparation (Optional)

When ready to deploy:

### 7.1 Environment Variables
```bash
# Production .env
DJANGO_ENV=production
SECRET_KEY=<generate-long-random-string>
DEBUG=False

# Update OAuth URIs to production domain
GOOGLE_CLIENT_ID=<production_id>
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### 7.2 Security Checklist
- [ ] Use HTTPS only
- [ ] Enable CSRF protection
- [ ] Set secure cookie flags
- [ ] Rotate SECRET_KEY
- [ ] Use strong database credentials
- [ ] Enable rate limiting
- [ ] Set up monitoring/logging

### 7.3 Deploy
```bash
# Update OAuth provider URLs to production
# Deploy Django backend
# Deploy React frontend
# Test authentication flow on production
```

## Quick Reference Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm run dev

# Test API
curl -X POST http://localhost:8000/api/auth/google/ \
  -H "Content-Type: application/json" \
  -d '{"token":"..."}'

# Admin interface
http://localhost:8000/admin/

# API browser
http://localhost:8000/api/
```

## Documentation Files

- **Backend Setup:** `backend/OAUTH_SETUP.md`
- **Backend Quick Start:** `backend/BACKEND_AUTH_QUICKSTART.md`
- **Frontend Integration:** `FRONTEND_AUTH_INTEGRATION.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`

## Support

If you encounter issues:

1. Check relevant documentation file
2. Review error logs
3. Verify OAuth provider credentials
4. Test with curl first, then frontend
5. Clear browser cache and localStorage
6. Restart Django server

## Next Steps After Setup

- [ ] Test with production OAuth credentials
- [ ] Implement token refresh logic
- [ ] Add email verification
- [ ] Set up password reset
- [ ] Add two-factor authentication
- [ ] Deploy to production

---

**Estimated Time:** 60 minutes total  
**Difficulty:** Medium  
**Status:** All code ready and tested ✅
