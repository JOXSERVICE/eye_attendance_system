"""
auth_views.py — OAuth Authentication Views for Google & LinkedIn
"""
import logging
import requests
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .models import UserProfile, UserRole
from .serializers import GoogleAuthSerializer, LinkedInAuthSerializer, AuthResponseSerializer

logger = logging.getLogger(__name__)

# Google OAuth Configuration
GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"  # Set via env variable
GOOGLE_CLIENT_SECRET = "YOUR_GOOGLE_CLIENT_SECRET_HERE"  # Set via env variable

# LinkedIn OAuth Configuration  
LINKEDIN_CLIENT_ID = "YOUR_LINKEDIN_CLIENT_ID_HERE"  # Set via env variable
LINKEDIN_CLIENT_SECRET = "YOUR_LINKEDIN_CLIENT_SECRET_HERE"  # Set via env variable


def get_or_create_user_profile(email: str, first_name: str = "", last_name: str = "", 
                               oauth_provider: str = None, oauth_id: str = None,
                               role: str = UserRole.STUDENT) -> tuple[UserProfile, bool]:
    """
    Get or create a user profile based on email and OAuth info.
    
    Returns:
        tuple: (UserProfile instance, created flag)
    """
    user, user_created = User.objects.get_or_create(
        username=email.split('@')[0],
        defaults={
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
        }
    )
    
    # Create or get profile
    profile, profile_created = UserProfile.objects.get_or_create(user=user)
    
    # Update OAuth info if provided
    if oauth_provider and oauth_id:
        if oauth_provider == 'google':
            profile.google_id = oauth_id
        elif oauth_provider == 'linkedin':
            profile.linkedin_id = oauth_id
        profile.save()
    
    # Set role based on email domain or defaults
    if profile.role == UserRole.STUDENT:
        if email.endswith('@professor.edu') or email.endswith('@faculty.edu'):
            profile.role = UserRole.PROFESSOR
            profile.save()
        elif email.endswith('@admin.edu'):
            profile.role = UserRole.ADMIN
            profile.save()
    
    return profile, user_created or profile_created


def generate_jwt_tokens(user: User) -> dict:
    """Generate JWT access and refresh tokens for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
    }


def verify_google_token(token: str) -> dict:
    """
    Verify Google ID token and extract user info.
    
    Returns:
        dict with 'id', 'email', 'name', 'picture' on success
        
    Raises:
        ValueError if token is invalid
    """
    try:
        # Using google-auth to verify token
        # Note: In production, set GOOGLE_CLIENT_ID from environment
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid issuer.')
        
        return {
            'id': idinfo['sub'],
            'email': idinfo.get('email'),
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture'),
        }
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise ValueError(f"Invalid Google token: {str(e)}")


def verify_linkedin_token(token: str) -> dict:
    """
    Verify LinkedIn access token and extract user info via API.
    
    Returns:
        dict with 'id', 'email', 'localizedFirstName', 'localizedLastName'
        
    Raises:
        ValueError if token is invalid
    """
    try:
        # Get user profile info
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        }
        
        # LinkedIn v2 API endpoint
        response = requests.get(
            'https://api.linkedin.com/v2/me',
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            raise ValueError(f"LinkedIn API error: {response.status_code}")
        
        profile_data = response.json()
        
        # Get email address
        email_response = requests.get(
            'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
            headers=headers,
            timeout=10
        )
        
        email = None
        if email_response.status_code == 200:
            email_data = email_response.json()
            if 'elements' in email_data and len(email_data['elements']) > 0:
                email = email_data['elements'][0].get('handle~', {}).get('emailAddress')
        
        return {
            'id': profile_data['id'],
            'email': email or f"linkedin_{profile_data['id']}@linkedin.local",
            'localizedFirstName': profile_data.get('localizedFirstName', ''),
            'localizedLastName': profile_data.get('localizedLastName', ''),
        }
    except Exception as e:
        logger.error(f"LinkedIn token verification failed: {e}")
        raise ValueError(f"Invalid LinkedIn token: {str(e)}")


# ==========================================
# 🔐 Google OAuth Authentication Endpoint
# ==========================================
class GoogleAuthView(APIView):
    """POST /api/auth/google/
    
    Request body:
    {
        "token": "<google_id_token_from_frontend>"
    }
    
    Response (201):
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
    """
    
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = serializer.validated_data['token']
        
        try:
            # Verify token and get user info
            google_user_info = verify_google_token(token)
            
            # Extract name parts
            full_name = google_user_info.get('name', '').split(' ', 1)
            first_name = full_name[0] if len(full_name) > 0 else ''
            last_name = full_name[1] if len(full_name) > 1 else ''
            
            # Get or create user profile
            profile, created = get_or_create_user_profile(
                email=google_user_info['email'],
                first_name=first_name,
                last_name=last_name,
                oauth_provider='google',
                oauth_id=google_user_info['id']
            )
            
            # Generate JWT tokens
            tokens = generate_jwt_tokens(profile.user)
            
            # Build response
            user_data = {
                'email': profile.user.email,
                'username': profile.user.username,
                'first_name': profile.user.first_name,
                'last_name': profile.user.last_name,
                'role': profile.role,
            }
            
            return Response({
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'user': user_data,
                'role': profile.role,
                'message': f"Successfully authenticated with Google. {'(New user created)' if created else ''}"
            }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            logger.warning(f"Google auth failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.exception("Unexpected error in Google auth")
            return Response(
                {"error": "Authentication failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==========================================
# 🔐 LinkedIn OAuth Authentication Endpoint
# ==========================================
class LinkedInAuthView(APIView):
    """POST /api/auth/linkedin/
    
    Request body:
    {
        "token": "<linkedin_access_token_from_frontend>"
    }
    
    Response (201):
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
    """
    
    def post(self, request):
        serializer = LinkedInAuthSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {"error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = serializer.validated_data['token']
        
        try:
            # Verify token and get user info
            linkedin_user_info = verify_linkedin_token(token)
            
            # Get or create user profile
            profile, created = get_or_create_user_profile(
                email=linkedin_user_info['email'],
                first_name=linkedin_user_info.get('localizedFirstName', ''),
                last_name=linkedin_user_info.get('localizedLastName', ''),
                oauth_provider='linkedin',
                oauth_id=linkedin_user_info['id']
            )
            
            # Generate JWT tokens
            tokens = generate_jwt_tokens(profile.user)
            
            # Build response
            user_data = {
                'email': profile.user.email,
                'username': profile.user.username,
                'first_name': profile.user.first_name,
                'last_name': profile.user.last_name,
                'role': profile.role,
            }
            
            return Response({
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'user': user_data,
                'role': profile.role,
                'message': f"Successfully authenticated with LinkedIn. {'(New user created)' if created else ''}"
            }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            logger.warning(f"LinkedIn auth failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.exception("Unexpected error in LinkedIn auth")
            return Response(
                {"error": "Authentication failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==========================================
# 🔍 User Profile Endpoint (Protected)
# ==========================================
class UserProfileView(APIView):
    """GET /api/auth/me/
    
    Returns current authenticated user's profile info.
    Requires JWT token in Authorization header.
    
    Response (200):
    {
        "email": "user@example.com",
        "username": "user",
        "first_name": "John",
        "last_name": "Doe",
        "role": "STUDENT"
    }
    """
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            profile = request.user.profile
            user_data = {
                'email': request.user.email,
                'username': request.user.username,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'role': profile.role,
            }
            return Response(user_data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )


# ==========================================
# 🚪 Logout Endpoint (optional)
# ==========================================
class LogoutView(APIView):
    """POST /api/auth/logout/
    
    Invalidates the refresh token (optional implementation).
    In production, you might store blacklisted tokens.
    
    Request body:
    {
        "refresh_token": "<jwt_refresh_token>"
    }
    """
    
    def post(self, request):
        # Simple logout - in production, add token to blacklist
        return Response(
            {"message": "Successfully logged out"},
            status=status.HTTP_200_OK
        )
