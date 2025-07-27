# users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from import_export.admin import ImportExportModelAdmin
from import_export import resources
from .models import CustomUser
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomUserResource(resources.ModelResource):
    def before_import_row(self, row, **kwargs):
        password = row.get("password")
        if password and not password.startswith("pbkdf2_"):
            user = User()
            user.set_password(password)
            row["password"] = user.password

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_student', 'is_active', 'student_class',)


@admin.register(CustomUser)
class CustomUserAdmin(ImportExportModelAdmin, BaseUserAdmin):
    resource_class = CustomUserResource

    list_display = ('email', 'username', 'first_name', 'last_name', 'is_student', 'is_staff', 'is_active', 'is_superuser', 'student_id', 'student_class',)
    list_filter = ('is_student', 'is_staff', 'is_superuser', 'is_active', 'student_class')
    readonly_fields = ('student_id',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('username', 'first_name', 'last_name', 'student_id', 'student_class')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_student', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'username', 'first_name', 'last_name',
                'password1', 'password2', 'is_student', 'is_staff', 'is_active'
            ),
        }),
    )

    search_fields = ('email', 'username', 'student_id', 'student_class')
    ordering = ('email',)
