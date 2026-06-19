# OAuth Authentication Setup Guide

This guide walks you through setting up Google and LinkedIn OAuth for the University Attendance System.

## Overview

The system uses OAuth 2.0 for social authentication with support for:
- **Google OAuth** - Verify Google ID tokens from frontend
- **LinkedIn OAuth** - Verify LinkedIn access tokens from frontend
- **JWT Tokens** - Generate secure JWT tokens for API authentication
- **User Roles** - Automatic role assignment (STUDENT, PROFESSOR, ADMIN) based on email domain

## Architecture

```
Frontend (React)
    ↓ (sends OAuth token)
API Endpoint (/api/auth/google/ or /api/auth/linkedin/)
    ↓ (verifies token)
Backend (Django)
    ↓ (creates/updates user profile)
Database (User + UserProfile)
    ↓ (generates JWT)
Frontend (stores JWT in localStorage)
    ↓ (sends JWT in all API requests)
Protected Endpoints
```

## Prerequisites

1. Python 3.9+ with Django 4.2+
2. PostgreSQL database
3. pip packages: `pip install -r requirements.txt`

## Step 1: Google OAuth Setup

### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the "Google+ API"
4. Go to "Credentials" → "Create OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000` (for local development)
   - `http://localhost:5173` (if using Vite)
   - Your production domain
7. Copy the **Client ID** and **Client Secret**

### Set Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# .env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Update Backend Configuration

Edit `backend/attendance/auth_views.py`:

```python
import os
from decouple import config

GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = config('GOOGLE_CLIENT_SECRET')
```

## Step 2: LinkedIn OAuth Setup

### Get LinkedIn OAuth Credentials

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new application
3. In "Auth" settings, add Authorized redirect URLs:
   - `http://localhost:3000` (for local development)
   - `http://localhost:5173` (if using Vite)
   - Your production domain
4. Copy the **Client ID** and **Client Secret** from "Auth" tab

### Set Environment Variables

Add to your `.env` file:

```bash
# .env
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
```

### Update Backend Configuration

Edit `backend/attendance/auth_views.py`:

```python
import os
from decouple import config

LINKEDIN_CLIENT_ID = config('LINKEDIN_CLIENT_ID')
LINKEDIN_CLIENT_SECRET = config('LINKEDIN_CLIENT_SECRET')
```

## Step 3: Frontend Implementation

### Google Authentication

```typescript
// frontend/src/api/attendanceApi.ts

export const authenticateWithGoogle = async (googleToken: string) => {
    const response = await fetch('http://localhost:8000/api/auth/google/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token: googleToken
        })
    });
    
    if (!response.ok) {
        throw new Error('Google authentication failed');
    }
    
    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
};
```

### LinkedIn Authentication

```typescript
// frontend/src/api/attendanceApi.ts

export const authenticateWithLinkedIn = async (linkedinToken: string) => {
    const response = await fetch('http://localhost:8000/api/auth/linkedin/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token: linkedinToken
        })
    });
    
    if (!response.ok) {
        throw new Error('LinkedIn authentication failed');
    }
    
    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
};
```

## Step 4: Database Migrations

Run migrations to create the UserProfile table:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## Step 5: Run Development Server

```bash
cd backend
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Google Authentication
**POST** `/api/auth/google/`

Request:
```json
{
    "token": "<google_id_token_from_frontend>"
}
```

Response (201):
```json
{
    "access_token": "<jwt_access_token>",
    "refresh_token": "<jwt_refresh_token>",
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

### LinkedIn Authentication
**POST** `/api/auth/linkedin/`

Request:
```json
{
    "token": "<linkedin_access_token_from_frontend>"
}
```

Response (201):
```json
{
    "access_token": "<jwt_access_token>",
    "refresh_token": "<jwt_refresh_token>",
    "user": {
        "email": "user@example.com",
        "username": "user",
        "first_name": "John",
        "last_name": "Doe",
        "role": "STUDENT"
    },
    "role": "STUDENT",
    "message": "Successfully authenticated with LinkedIn"
}
```

### Get User Profile
**GET** `/api/auth/me/`

Headers:
```
Authorization: Bearer <access_token>
```

Response (200):
```json
{
    "email": "user@example.com",
    "username": "user",
    "first_name": "John",
    "last_name": "Doe",
    "role": "STUDENT"
}
```

### Logout
**POST** `/api/auth/logout/`

Request:
```json
{
    "refresh_token": "<jwt_refresh_token>"
}
```

Response (200):
```json
{
    "message": "Successfully logged out"
}
```

## User Roles Assignment

The system automatically assigns roles based on email domain:

- `@professor.edu` or `@faculty.edu` → **PROFESSOR**
- `@admin.edu` → **ADMIN**
- All others → **STUDENT** (default)

You can manually update user roles in Django Admin:
```
http://localhost:8000/admin/attendance/userprofile/
```

## Using JWT Tokens in Protected Endpoints

All protected endpoints require the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer <access_token>" \
     http://localhost:8000/api/attendance/
```

In your frontend:

```typescript
const getAttendance = async (courseId: string, date: string) => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(
        `http://localhost:8000/api/attendance/?course_id=${courseId}&date=${date}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );
    
    return response.json();
};
```

## Troubleshooting

### Issue: "Invalid Google token" error

**Solution:**
- Verify CLIENT_ID matches your Google Cloud project
- Check that the token was generated with the same CLIENT_ID
- Ensure the token hasn't expired

### Issue: "LinkedIn API error"

**Solution:**
- Verify LinkedIn Client ID and Secret are correct
- Check that your app has permission to access user profile and email
- Ensure the access token hasn't expired

### Issue: User profile not created

**Solution:**
- Check database connection
- Run migrations: `python manage.py migrate`
- Check logs for specific error messages

## Production Deployment

### Security Checklist

1. **Set environment variables** on your production server:
   ```bash
   export GOOGLE_CLIENT_ID=...
   export GOOGLE_CLIENT_SECRET=...
   export LINKEDIN_CLIENT_ID=...
   export LINKEDIN_CLIENT_SECRET=...
   export SECRET_KEY=<long-random-string>
   export DJANGO_ENV=production
   ```

2. **Update CORS settings** in `settings.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "https://yourdomain.com",
   ]
   ```

3. **Enable HTTPS** - JWT tokens should only be transmitted over HTTPS

4. **Rotate SECRET_KEY** regularly

5. **Use strong database credentials**

6. **Enable CSRF protection** in production

## Customizing Role Assignment

To customize how roles are assigned based on email, edit the `get_or_create_user_profile()` function in `backend/attendance/auth_views.py`:

```python
def get_or_create_user_profile(...):
    # ... existing code ...
    
    # Customize role assignment here
    if profile.role == UserRole.STUDENT:
        if email.endswith('@professor.edu'):
            profile.role = UserRole.PROFESSOR
            profile.save()
        elif email.endswith('@admin.edu'):
            profile.role = UserRole.ADMIN
            profile.save()
```

## Next Steps

1. Implement token refresh logic in frontend
2. Add token blacklist for logout functionality
3. Set up email verification for new users
4. Add rate limiting for auth endpoints
5. Implement two-factor authentication (optional)

For more information, see:
- [Django REST Framework JWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
