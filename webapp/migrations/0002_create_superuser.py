# webapp/migrations/0002_create_superuser.py
# Copy this file to your webapp/migrations/ folder
# Rename it to the next available migration number (e.g., 0005_create_superuser.py)

from django.db import migrations
from django.contrib.auth import get_user_model
import os


def create_superuser(apps, schema_editor):
    """
    Creates a superuser if one doesn't exist
    """
    User = get_user_model()

    username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admindev')
    email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admindev@kabsueats.com')
    password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admindev')

    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f'✅ Migration auto-created superuser: {username}')
    else:
        print(f'ℹ️  Superuser "{username}" already exists')


def remove_superuser(apps, schema_editor):
    """
    Reverse migration - removes the superuser
    """
    User = get_user_model()
    username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admindev')

    User.objects.filter(username=username).delete()
    print(f'🗑️  Removed superuser: {username}')


class Migration(migrations.Migration):
    dependencies = [
        ('webapp', '0001_initial'),  # ← PALITAN MO ITO sa latest migration number mo
    ]

    operations = [
        migrations.RunPython(create_superuser, remove_superuser),
    ]