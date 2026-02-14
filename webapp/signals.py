# webapp/signals.py
from django.db.models.signals import post_save, post_delete, post_migrate
from django.dispatch import receiver
from .models import MenuItem, FoodEstablishment
from django.utils import timezone
from django.contrib.auth import get_user_model
import os


@receiver(post_save, sender=MenuItem)
def update_establishment_timestamp_on_menu_item_save(sender, instance, **kwargs):
    # Kukunin ang parent FoodEstablishment at i-update ang timestamp
    instance.food_establishment.last_updated = timezone.now()
    instance.food_establishment.save()


@receiver(post_delete, sender=MenuItem)
def update_establishment_timestamp_on_menu_item_delete(sender, instance, **kwargs):
    # Kukunin ang parent FoodEstablishment at i-update ang timestamp
    instance.food_establishment.last_updated = timezone.now()
    instance.food_establishment.save()


@receiver(post_migrate)
def create_default_admin(sender, **kwargs):
    """
    Create default admin superuser after migrations.
    Only runs for the webapp app to avoid duplicate execution.
    """
    if sender.name == 'webapp':
        User = get_user_model()

        # Get credentials from environment variables
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admindev')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admindev@kabsueats.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admindev')

        # Check if user already exists
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            print(f'✅ Created default admin superuser: {username}')
        else:
            # Update password to ensure it matches environment variable
            user = User.objects.get(username=username)
            user.set_password(password)
            user.is_superuser = True
            user.is_staff = True
            user.save()
            print(f'✅ Updated admin superuser: {username}')