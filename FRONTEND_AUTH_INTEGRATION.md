# Frontend OAuth Integration Guide

This guide explains how to implement Google and LinkedIn OAuth authentication in the React frontend and integrate with the backend API.

## Overview

The authentication flow:

```
1. User clicks "Sign in with Google/LinkedIn"
   ↓
2. OAuth provider shows login/consent screen
   ↓
3. Frontend receives OAuth token
   ↓
4. Frontend sends token to backend
   ↓
5. Backend verifies token and returns JWT
   ↓
6. Frontend stores JWT and makes authenticated requests
```

## Prerequisites

1. Node.js 18+ with npm or yarn
2. React 18+
3. TypeScript support
4. `axios` package for HTTP requests
5. Google OAuth SDK (for Google Sign-In)
6. LinkedIn SDK (for LinkedIn Sign-In)

## Installation

### 1. Install Required Packages

```bash
cd frontend
npm install axios
```

### 2. Add Google OAuth Support

Add to `public/index.html`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 3. Add LinkedIn OAuth Support

Add to `public/index.html`:

```html
<script type="text/javascript" src="https://platform.linkedin.com/scripts/isdk.js" async></script>
```

## API Integration

All authentication functions are available in `src/api/attendanceApi.ts`:

### Google Authentication

```typescript
import { authenticateWithGoogle, AuthResponse } from "./api/attendanceApi";

// After receiving token from Google
try {
  const response: AuthResponse = await authenticateWithGoogle(googleIdToken);
  
  console.log("User authenticated:", response.user);
  console.log("User role:", response.role);
  console.log("Message:", response.message);
  
  // Redirect based on role
  switch(response.role) {
    case 'STUDENT':
      navigate('/portal');
      break;
    case 'PROFESSOR':
      navigate('/professor');
      break;
    case 'ADMIN':
      navigate('/admin');
      break;
  }
} catch (error) {
  console.error("Authentication failed:", error.message);
}
```

### LinkedIn Authentication

```typescript
import { authenticateWithLinkedIn, AuthResponse } from "./api/attendanceApi";

// After receiving token from LinkedIn
try {
  const response: AuthResponse = await authenticateWithLinkedIn(linkedinAccessToken);
  
  console.log("User authenticated:", response.user);
  console.log("User role:", response.role);
  
  // Redirect based on role
  switch(response.role) {
    case 'STUDENT':
      navigate('/portal');
      break;
    case 'PROFESSOR':
      navigate('/professor');
      break;
    case 'ADMIN':
      navigate('/admin');
      break;
  }
} catch (error) {
  console.error("Authentication failed:", error.message);
}
```

## Complete Login Component Example

Here's a complete implementation with Google and LinkedIn OAuth:

```typescript
// src/pages/LoginPage.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateWithGoogle, authenticateWithLinkedIn } from '../api/attendanceApi';

declare global {
  interface Window {
    google: any;
    IN: any;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
        callback: handleGoogleResponse,
      });

      // Render Google Sign-In button
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'outline', 
          size: 'large',
          text: 'signin_with'
        }
      );
    }

    // Initialize LinkedIn (optional)
    if (window.IN) {
      window.IN.Event.on(window.IN, 'auth', handleLinkedInAuth);
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setLoading(true);
    setError(null);

    try {
      // response.credential is the JWT ID token from Google
      const authResponse = await authenticateWithGoogle(response.credential);
      
      // Navigate based on role
      navigateByRole(authResponse.role);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get LinkedIn access token
      window.IN.API.Raw.me((profile: any) => {
        // You'll need to handle LinkedIn token retrieval differently
        // This is a simplified example
        console.log('LinkedIn profile:', profile);
      });
    } catch (err: any) {
      setError(err.message || 'LinkedIn authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use LinkedIn SDK to get access token
      const response = await window.IN.API.Raw.me();
      
      if (response.accessToken) {
        const authResponse = await authenticateWithLinkedIn(response.accessToken);
        navigateByRole(authResponse.role);
      }
    } catch (err: any) {
      setError(err.message || 'LinkedIn authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const navigateByRole = (role: string) => {
    switch (role) {
      case 'STUDENT':
        navigate('/portal');
        break;
      case 'PROFESSOR':
        navigate('/professor');
        break;
      case 'ADMIN':
        navigate('/admin');
        break;
      default:
        navigate('/portal');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '420px', width: '100%', padding: '40px' }}>
        <h2>University Attendance Portal</h2>
        
        {error && (
          <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fee', borderRadius: '8px', color: '#c33' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center' }} />
        </div>

        <button 
          onClick={handleLinkedInClick}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#0A66C2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Sign in with LinkedIn'}
        </button>
      </div>
    </div>
  );
}
```

## Protected Routes

Create a component to protect routes based on authentication:

```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '../api/attendanceApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = getUserRole();
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
```

## Using Protected Routes in App

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import StudentPortal from './pages/StudentPortal';
import ProfessorUpload from './pages/ProfessorUpload';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          path="/portal" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
              <StudentPortal />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/professor" 
          element={
            <ProtectedRoute allowedRoles={['PROFESSOR', 'ADMIN']}>
              <ProfessorUpload />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

## Making Authenticated API Requests

The `attendanceApi` automatically includes the JWT token in all requests:

```typescript
import { getAttendanceList, getCourses, getUserProfile } from './api/attendanceApi';

// Get user profile
try {
  const profile = await getUserProfile();
  console.log('User:', profile);
} catch (error) {
  console.error('Failed to fetch profile:', error);
}

// Get courses (automatically includes JWT token)
try {
  const courses = await getCourses();
  console.log('Courses:', courses);
} catch (error) {
  console.error('Failed to fetch courses:', error);
}

// Get attendance list
try {
  const attendance = await getAttendanceList('CS401', '2025-01-15');
  console.log('Attendance:', attendance);
} catch (error) {
  console.error('Failed to fetch attendance:', error);
}
```

## Token Management

### Storing Tokens

Tokens are automatically stored in `localStorage`:

```typescript
// access_token - Used for API requests (expires in 1 hour)
// refresh_token - Used to get new access token (expires in 7 days)
// user_role - User's role (STUDENT, PROFESSOR, ADMIN)
// user_email - User's email
```

### Checking Authentication

```typescript
import { isAuthenticated, getUserRole } from './api/attendanceApi';

if (isAuthenticated()) {
  const role = getUserRole();
  console.log('User role:', role);
} else {
  // User not authenticated
  navigate('/login');
}
```

### Logout

```typescript
import { logout } from './api/attendanceApi';

const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

## Error Handling

The API client handles common errors:

```typescript
import { authenticateWithGoogle } from './api/attendanceApi';

try {
  const response = await authenticateWithGoogle(token);
} catch (error: any) {
  // Handle different error scenarios
  if (error.message.includes('Invalid')) {
    console.error('Invalid token:', error.message);
  } else if (error.message.includes('expired')) {
    console.error('Token expired:', error.message);
  } else {
    console.error('Authentication failed:', error.message);
  }
}
```

## Environment Variables

Create a `.env` file in the frontend root:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
```

Use in your code:

```typescript
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
```

## Testing Authentication Locally

1. **Start the backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test with dummy credentials:**
   ```bash
   # In browser console
   localStorage.setItem('access_token', 'test_token');
   localStorage.setItem('user_role', 'STUDENT');
   ```

4. **Test API calls:**
   ```bash
   curl -H "Authorization: Bearer test_token" \
        http://localhost:8000/api/auth/me/
   ```

## Common Issues

### Issue: "Invalid Google token"

**Solution:**
- Verify GOOGLE_CLIENT_ID matches your configuration
- Ensure token is sent immediately after generation
- Check token hasn't expired (typically 1 hour)

### Issue: CORS errors

**Solution:**
- Verify `CORS_ALLOWED_ORIGINS` in Django settings
- Add your frontend URL to allowed origins
- Check API base URL matches backend

### Issue: Token not included in requests

**Solution:**
- Verify token is stored in localStorage with key `access_token`
- Check axios interceptor is configured correctly
- Inspect network request headers for Authorization header

### Issue: 401 Unauthorized on protected endpoints

**Solution:**
- Verify token is valid and not expired
- Check token is being sent in Authorization header
- Verify user role has access to endpoint

## Next Steps

1. Implement token refresh logic
2. Add loading states for auth requests
3. Add error notifications to UI
4. Implement password reset functionality
5. Add two-factor authentication support

## Related Files

- Backend OAuth Setup: [OAUTH_SETUP.md](../backend/OAUTH_SETUP.md)
- API Types: [attendanceApi.ts](./src/api/attendanceApi.ts)
- Authentication Views: [auth_views.py](../backend/attendance/auth_views.py)

## Support

For issues with OAuth configuration, see:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Django REST Framework JWT](https://django-rest-framework-simplejwt.readthedocs.io/)
