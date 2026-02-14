"""
Management command to create default admin superuser account.
Usage: python manage.py create_default_admin
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = 'Creates a default admin superuser if it does not exist'

    def handle(self, *args, **options):
        User = get_user_model()

        # Get credentials from environment variables
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admindev')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admindev@kabsueats.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admindev')

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            self.stdout.write(
                self.style.WARNING(f'✓ Admin user "{username}" already exists')
            )

            # Update password to ensure it matches environment variable
            user.set_password(password)
            user.is_superuser = True
            user.is_staff = True
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Updated "{username}" password and permissions')
            )
        else:
            # Create new superuser
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created admin superuser "{username}"')
            )

        self.stdout.write(
            self.style.SUCCESS(f'\n👤 Admin credentials:')
        )
        self.stdout.write(f'   Username: {username}')
        self.stdout.write(f'   Password: {password}')
        self.stdout.write(f'   Email: {email}')