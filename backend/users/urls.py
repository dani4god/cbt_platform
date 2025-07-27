# users/urls.py

from django.urls import path
# Make sure these imported names match the class names in your views.py
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile')
    # If you have a 'me/' endpoint for retrieving user details,
    # you would need to define UserRetrieveView in your views.py first.
    # For now, let's keep it commented out or remove if not yet implemented.
    # path('me/', UserRetrieveView.as_view(), name='user-details'), # Remove or comment if not in views.py
]

