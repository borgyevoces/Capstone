# webapp/signals.py
from django.db.models.signals import post_save, post_delete, post_migrate
from django.dispatch import receiver
from .models import MenuItem, FoodEstablishment
from django.utils import timezone
from django.contrib.auth import get_user_model
import os
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


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


# ============================================================
# ESTABLISHMENT SIGNALS — Real-time map updates
# ============================================================
@receiver(post_save, sender=FoodEstablishment)
def broadcast_establishment_change(sender, instance, created, **kwargs):
    """
    Broadcast establishment creation or update to all connected map clients.
    When an establishment is created or updated, send data to all map websockets.
    """
    try:
        channel_layer = get_channel_layer()
        
        # Prepare establishment data for broadcast
        est_data = {
            'id': instance.id,
            'name': instance.name,
            'address': instance.address,
            'image': instance.image.url if instance.image else '',
            'status': instance.status.lower() if instance.status else 'closed',
            'is_active': instance.is_active,  # Include active status for filtering
            'latitude': float(instance.latitude) if instance.latitude else 0,
            'longitude': float(instance.longitude) if instance.longitude else 0,
            'distance': 0,  # Will be calculated on frontend
            'categories': ', '.join(instance.categories.values_list('name', flat=True)) if instance.categories else '',
            'other_category': instance.other_category or '',
            'other_amenity': instance.other_amenity or ''
        }
        
        if created:
            # New establishment created
            async_to_sync(channel_layer.group_send)(
                'establishment_updates',
                {
                    'type': 'est.created',
                    'establishment': est_data
                }
            )
            print(f'[Signal] Broadcasted new establishment #{instance.id}: {instance.name}')
        else:
            # Existing establishment updated
            async_to_sync(channel_layer.group_send)(
                'establishment_updates',
                {
                    'type': 'est.updated',
                    'establishment': est_data
                }
            )
            print(f'[Signal] Broadcasted updated establishment #{instance.id}: {instance.name}')
    
    except Exception as e:
        print(f'[Signal] Error broadcasting establishment change: {e}')


@receiver(post_delete, sender=FoodEstablishment)
def broadcast_establishment_deletion(sender, instance, **kwargs):
    """
    Broadcast establishment deletion to all connected map clients.
    """
    try:
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            'establishment_updates',
            {
                'type': 'est.deleted',
                'establishment_id': instance.id
            }
        )
        print(f'[Signal] Broadcasted deletion of establishment #{instance.id}: {instance.name}')
    
    except Exception as e:
        print(f'[Signal] Error broadcasting establishment deletion: {e}')


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