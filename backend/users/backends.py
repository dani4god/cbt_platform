# users/backends.py

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import BaseBackend
from django.db.models import Q

User = get_user_model()

class EmailBackend(BaseBackend):
    """
    Custom authentication backend that allows users to log in with email
    """
    
    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None or password is None:
            return None
        
        try:
            # Try to find user by email
            user = User.objects.get(Q(email__iexact=email))
            
            # Check if the password is correct
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a non-existing user
            User().set_password(password)
            return None
        
        return None
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
