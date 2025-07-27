# users/models.py

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid
class CustomUserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifiers
    for authentication instead of usernames.
    """
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError(_("The Email must be set"))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password) # This hashes the password!
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    # Ensure 'email' is unique. This is essential for email-based login.
    email = models.EmailField(_("email address"), unique=True)

    # Add your custom fields from your previous image here
    is_student = models.BooleanField(default=False)
    student = models.BooleanField(default=False) # Consider if this is redundant with is_student
    student_id = models.CharField(max_length=50, unique=True, blank=True, null=True, editable=False)
    student_class = models.CharField(max_length=100, blank=True, null=True)

    # AbstractUser already provides 'groups' and 'user_permissions'.
    # You only need to explicitly define them if you want to add 'related_name'
    # to avoid potential clashes if you were to define this model in another app
    # or have multiple custom user models. If you have only one custom user model
    # and it's in a dedicated app, you might not strictly need these explicit definitions.
    # However, it's harmless to keep them if they were already there and correctly defined.
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name="custom_user_groups", # Use a unique related_name
        related_query_name="custom_user_group",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name="custom_user_permissions", # Use a unique related_name
        related_query_name="custom_user_permission",
    )

    # --- CRITICAL FOR EMAIL LOGIN ---
    USERNAME_FIELD = "email" # This tells Django to use 'email' for authentication.
    # These fields are prompted when you run `createsuperuser`.
    # 'email' is implicitly required because it's the USERNAME_FIELD.
    REQUIRED_FIELDS = ["username"] # 'username' is still stored from AbstractUser

    objects = CustomUserManager() # Assign our custom manager to the model

    
    def save(self, *args, **kwargs):
        if self.is_student and not self.student_id:
            # Example: STU-UUID
            self.student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    
    def __str__(self):
        return f"{self.first_name} ({self.last_name})" 






    

