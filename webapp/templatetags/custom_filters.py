# webapp/templatetags/custom_filters.py

from django import template
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal # Import Decimal for get_cart_total

register = template.Library()

@register.filter
def recently_updated(value, days=1):
    """
    Checks if a datetime value (e.g., establishment.last_updated) 
    is within the last X days (default is 1 day).
    """
    if not value:
        return False
    
    # 1. Handle Naive vs. Aware datetimes for proper comparison
    if not hasattr(value, 'tzinfo') or value.tzinfo is None:
        # Create an aware 'now' for comparison
        now = timezone.make_aware(timezone.datetime.now())
        # Make the 'value' aware (assuming current timezone)
        try:
            value = timezone.make_aware(value) 
        except Exception:
            # Handle case where value is not a valid datetime
            return False
    else:
        now = timezone.now() # Already aware
        
    # 2. Calculate the cutoff time
    cutoff_time = now - timedelta(days=float(days))
    
    # 3. Perform comparison (is the update time later than the cutoff time?)
    return value >= cutoff_time


@register.filter
def get_review_type(rating):
    """
    Returns a class name based on the review rating for styling purposes.
    Ratings: 1-5
    """
    try:
        rating = int(rating)
    except (ValueError, TypeError):
        return 'neutral' 

    if rating >= 4:
        return 'positive'
    elif rating == 3:
        return 'neutral'
    else: # 1 or 2
        return 'negative'
    

@register.filter
def get_cart_total(cart_items):
    """
    Kinukwenta ang kabuuang halaga ng mga item sa cart.
    Ang cart_items ay isang QuerySet ng OrderItem.
    """
    total = Decimal('0.00')
    for item in cart_items:
        # Assuming OrderItem model has a total_price property or price_at_order * quantity is used
        try:
            # Paggamit ng Decimal para sa financial calculations
            total += Decimal(item.total_price) if hasattr(item, 'total_price') else (Decimal(str(item.price_at_order)) * item.quantity)
        except Exception:
            # Fallback kung may error sa data type
            continue
            
    return total

@register.filter
def add(value, arg):
    """Adds the argument to the value."""
    try:
        # Gumamit ng Decimal kung posible
        return Decimal(value) + Decimal(arg)
    except Exception:
        # Fallback sa float
        try:
            return float(value) + float(arg)
        except Exception:
            return value # Ibalik ang original value kung hindi ma-compute

@register.filter
def recently_updated(value):
    """
    Returns True if the datetime value is within the last 24 hours.
    Used for showing a 'New' or 'Updated' badge on establishments.
    """
    if not value:
        return False
    # Ang value ay dapat na datetime object (e.g., establishment.last_updated)
    return value >= timezone.now() - timedelta(hours=24)