# webapp/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import MenuItem, FoodEstablishment
from django.utils import timezone

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