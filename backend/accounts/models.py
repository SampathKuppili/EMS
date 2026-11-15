from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom user manager supporting email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set.'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model with email as unique identifier and built-in role management.
    """

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        HR_MANAGER = 'HR_MANAGER', _('HR Manager')
        MANAGER = 'MANAGER', _('Team Manager')
        EMPLOYEE = 'EMPLOYEE', _('Employee')
        INTERN = 'INTERN', _('Intern')

    email = models.EmailField(_('email address'), unique=True, db_index=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    role = models.CharField(
        _('role'),
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
        db_index=True,
    )
    is_active = models.BooleanField(_('active'), default=True)
    is_staff = models.BooleanField(_('staff status'), default=False)
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    @property
    def is_hr(self):
        return self.role in [self.Role.ADMIN, self.Role.HR_MANAGER] or self.is_superuser

    @property
    def is_admin_or_hr(self):
        return self.is_hr

    @property
    def is_manager(self):
        return self.role in [self.Role.MANAGER, self.Role.HR_MANAGER, self.Role.ADMIN]

    @property
    def is_employee(self):
        return self.role == self.Role.EMPLOYEE

    @property
    def is_intern(self):
        return self.role == self.Role.INTERN
