"""
serializers.py — REST API Serializers for University Attendance System
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Student, UserRole


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile with role info"""
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    
    class Meta:
        model = UserProfile
        fields = ['email', 'username', 'first_name', 'last_name', 'role', 'created_at']
        read_only_fields = ['created_at']


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth token"""
    token = serializers.CharField(required=True, help_text="Google ID token from frontend")
    
    def validate_token(self, value):
        if not value or len(value) < 10:
            raise serializers.ValidationError("Invalid token format.")
        return value


class LinkedInAuthSerializer(serializers.Serializer):
    """Serializer for LinkedIn OAuth token"""
    token = serializers.CharField(required=True, help_text="LinkedIn access token from frontend")
    
    def validate_token(self, value):
        if not value or len(value) < 10:
            raise serializers.ValidationError("Invalid token format.")
        return value


class AuthResponseSerializer(serializers.Serializer):
    """Serializer for authentication response"""
    access_token = serializers.CharField(help_text="JWT access token")
    refresh_token = serializers.CharField(help_text="JWT refresh token (optional)")
    user = UserProfileSerializer(help_text="Authenticated user profile")
    role = serializers.ChoiceField(choices=UserRole.choices)
    message = serializers.CharField(help_text="Success message")
