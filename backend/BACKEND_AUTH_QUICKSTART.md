# Backend OAuth Authentication - Quick Start Guide

## Overview

This Django backend now supports OAuth 2.0 authentication with Google and LinkedIn, using JWT tokens for API requests. The system automatically assigns user roles (STUDENT, PROFESSOR, ADMIN) based on email domain.

## What's New

### Files Added/Modified

1. **New Files:**
   - `attendance/auth_views.py` - OAuth authentication views
   - `attendance/serializers.py` - REST API serializers
   - `backend/OAUTH_SETUP.md` - Detailed OAuth setup guide
   - `.env.example` - Environment variables template

2. **Modified Files:**
   - `attendance/models.py` - Added `UserProfile` and `UserRole` models
   - `attendance/admin.py` - Registered `UserProfile` in Django admin
   - `attendance/urls.py` - Added OAuth endpoints
   - `attendance_system/settings.py` - JWT and OAuth configuration
   - `requirements.txt` - Added JWT and OAuth packages

3. **Frontend Updates:**
   - `frontend/src/api/attendanceApi.ts` - OAuth functions and JWT handling

## Installation

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New packages installed:
- `djangorestframework-simplejwt` - JWT token generation
- `google-auth-oauthlib` - Google OAuth verification
- `google-auth` - Google token validation
- `requests` - HTTP requests for LinkedIn API

### Step 2: Set Environment Variables

Create `.env` file in `backend/` directory:

```bash
# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=face_attendance_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DJANGO_ENV=development

# OAuth - Get these from Google Cloud Console
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth - Get these from LinkedIn Developer Portal
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Step 3: Run Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

This creates the `UserProfile` table linked to Django's User model.

### Step 4: Create Admin User (Optional)

```bash
python manage.py createsuperuser
```

### Step 5: Start Django Server

```bash
python manage.py runserver
```

Server will run on `http://localhost:8000`

## API Endpoints

### Authentication Endpoints

#### 1. Google OAuth
**POST** `/api/auth/google/`

```bash
curl -X POST http://localhost:8000/api/auth/google/ \
  -H "Content-Type: application/json" \
  -d '{"token":"<google_id_token>"}'
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "email": "user@example.com",
    "username": "user",
    "first_name": "John",
    "last_name": "Doe",
    "role": "STUDENT"
  },
  "role": "STUDENT",
  "message": "Successfully authenticated with Google"
}
```

#### 2. LinkedIn OAuth
**POST** `/api/auth/linkedin/`

```bash
curl -X POST http://localhost:8000/api/auth/linkedin/ \
  -H "Content-Type: application/json" \
  -d '{"token":"<linkedin_access_token>"}'
```

#### 3. Get User Profile
**GET** `/api/auth/me/`

```bash
curl -H "Authorization: Bearer <access_token>" \
     http://localhost:8000/api/auth/me/
```

#### 4. Logout
**POST** `/api/auth/logout/`

```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

## Frontend Integration

### Updated API File

The frontend API client (`src/api/attendanceApi.ts`) now includes:

- `authenticateWithGoogle(token)` - Google OAuth authentication
- `authenticateWithLinkedIn(token)` - LinkedIn OAuth authentication
- `getUserProfile()` - Get authenticated user info
- `logout()` - Logout and clear tokens
- `isAuthenticated()` - Check if user is logged in
- `getUserRole()` - Get user's role

### Example Usage

```typescript
import { authenticateWithGoogle, getUserRole } from './api/attendanceApi';

// Handle Google auth response
const response = await authenticateWithGoogle(googleIdToken);

// Check user role
const role = getUserRole(); // Returns: 'STUDENT' | 'PROFESSOR' | 'ADMIN'

// Redirect based on role
if (role === 'STUDENT') {
  navigate('/portal');
} else if (role === 'PROFESSOR') {
  navigate('/professor');
} else if (role === 'ADMIN') {
  navigate('/admin');
}
```

## User Roles

Roles are automatically assigned based on email domain:

| Email Domain | Role | Access |
|---|---|---|
| `@professor.edu`, `@faculty.edu` | PROFESSOR | Professor interface |
| `@admin.edu` | ADMIN | Full admin dashboard |
| Any other | STUDENT | Student portal |

**Manual Role Assignment:**
Edit roles in Django Admin at `http://localhost:8000/admin/attendance/userprofile/`

## JWT Token Details

### Access Token
- **Lifetime:** 1 hour
- **Purpose:** Authenticate API requests
- **Format:** Bearer token in Authorization header

### Refresh Token
- **Lifetime:** 7 days
- **Purpose:** Generate new access tokens
- **Usage:** Not implemented yet (optional)

## Database Schema

### New Tables

#### UserProfile
```
id              | integer (primary key)
user_id         | foreign key to User
role            | varchar(20) - STUDENT/PROFESSOR/ADMIN
google_id       | varchar(255) - unique OAuth ID
linkedin_id     | varchar(255) - unique OAuth ID
created_at      | datetime
updated_at      | datetime
```

### Modified Tables

#### User (Django built-in)
Linked to UserProfile via OneToOneField

## Development Workflow

1. **User clicks "Sign in with Google/LinkedIn"**
   - Frontend shows OAuth provider consent screen
   - User grants permission

2. **Frontend receives token**
   - Sends token to `/api/auth/google/` or `/api/auth/linkedin/`
   - Backend verifies token with provider

3. **Backend creates/updates user**
   - Creates User and UserProfile if new
   - Assigns role based on email domain
   - Links OAuth ID to prevent duplicates

4. **JWT tokens generated**
   - Access token: 1-hour expiration
   - Refresh token: 7-day expiration

5. **Frontend stores tokens**
   - Stored in localStorage
   - Sent with all API requests via Authorization header

6. **Protected endpoints**
   - Verify JWT token
   - Check user authentication
   - Return user-specific data

## Testing

### Test with cURL

```bash
# 1. Get Google ID token (manual - use browser)
# Then test the backend:

# 2. Test Google auth
curl -X POST http://localhost:8000/api/auth/google/ \
  -H "Content-Type: application/json" \
  -d '{"token":"<real_google_token>"}'

# 3. Test user profile (replace with real token)
curl -H "Authorization: Bearer <access_token>" \
     http://localhost:8000/api/auth/me/

# 4. Test protected endpoint
curl -H "Authorization: Bearer <access_token>" \
     http://localhost:8000/api/courses/
```

### Test in Django Shell

```bash
python manage.py shell

# Create test user
from django.contrib.auth.models import User
from attendance.models import UserProfile

user = User.objects.create_user(
    username='testuser',
    email='student@example.com',
    first_name='Test',
    last_name='User'
)

profile = UserProfile.objects.create(
    user=user,
    role='STUDENT',
    google_id='12345'
)

print(profile)
# Output: student@example.com — STUDENT
```

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'rest_framework_simplejwt'"

**Solution:**
```bash
pip install djangorestframework-simplejwt
```

### Issue: Migration errors

**Solution:**
```bash
python manage.py makemigrations attendance
python manage.py migrate
```

### Issue: "GOOGLE_CLIENT_ID not set"

**Solution:**
- Create `.env` file with GOOGLE_CLIENT_ID
- Use `python-decouple` to load from .env
- Or set environment variable: `export GOOGLE_CLIENT_ID=...`

### Issue: 401 Unauthorized on protected endpoints

**Solution:**
- Verify token is valid and not expired
- Check Authorization header format: `Bearer <token>`
- Ensure user is authenticated in the token

## Security Considerations

1. **Never commit secrets** - Use `.env` file and add to `.gitignore`
2. **Use HTTPS in production** - JWT tokens should only be sent over HTTPS
3. **Validate tokens** - Backend verifies all OAuth tokens with providers
4. **Rotate secrets** - Change CLIENT_SECRET regularly
5. **Database security** - Use strong PostgreSQL credentials
6. **CORS configuration** - Only allow trusted origins

## Next Steps

1. **Implement token refresh** - Use refresh tokens to extend sessions
2. **Add token blacklist** - Track logged-out tokens
3. **Email verification** - Verify user emails on signup
4. **Two-factor authentication** - Add extra security layer
5. **Rate limiting** - Prevent brute force attacks
6. **API versioning** - Version API endpoints for compatibility

## Documentation Files

- `OAUTH_SETUP.md` - Detailed OAuth provider setup
- `FRONTEND_AUTH_INTEGRATION.md` - Frontend implementation guide
- `attendance/auth_views.py` - OAuth view implementations
- `attendance/serializers.py` - API serializers

## Support

For help with:
- **Google OAuth:** [developers.google.com](https://developers.google.com/identity)
- **LinkedIn OAuth:** [linkedin.com/developers](https://www.linkedin.com/developers)
- **Django JWT:** [django-rest-framework-simplejwt](https://django-rest-framework-simplejwt.readthedocs.io/)
- **This project:** Check issue tracker

## License

See LICENSE file in project root
