from django.db import models
import uuid
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import random
from django.db.models import Sum, F
import string
from datetime import timedelta
from decimal import Decimal
import logging

# ✅ ADD THIS: Logger for error handling
logger = logging.getLogger(__name__)


# ================================
# Helper Functions
# ================================
def generate_uuid():
    """Generates a unique UUID string."""
    return str(uuid.uuid4())


def generate_access_code():
    """Generates a random 6-character uppercase alphanumeric code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# ================================
# Categorization and Feature Models
# ================================
class Category(models.Model):
    """Represents a category for food establishments."""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Feature(models.Model):
    """Represents a special feature of a food establishment (e.g., 'Live Music')."""
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Day(models.Model):
    """Represents a day of the week for business hours."""
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name


class Amenity(models.Model):
    """Represents an amenity of a food establishment (e.g., 'Wi-Fi', 'Parking')."""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


# ================================
# Main Models
# ================================
class FoodEstablishment(models.Model):
    # Ang OneToOneField ay nagsisiguro na ang isang User account ay may-ari lamang ng ISANG establishment.
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    # Basic Information
    is_approved = models.BooleanField(default=False)
    name = models.CharField(max_length=255)
    address = models.TextField()
    is_active = models.BooleanField(
        default=True,
        help_text="If False, hidden from customers."
    )
    opening_time = models.TimeField(
        help_text="Time when establishment opens (e.g., 08:00 AM)",
        null=True,
        blank=True
    )
    closing_time = models.TimeField(
        help_text="Time when establishment closes (e.g., 10:00 PM)",
        null=True,
        blank=True
    )

    image = models.ImageField(upload_to='establishment_images/', null=True, blank=True)

    # ✅ CHANGED: Multiple categories support (was single ForeignKey, now ManyToManyField)
    categories = models.ManyToManyField('Category', blank=True, related_name='establishments')
    # ✅ NEW: Custom category text for "Other" option
    other_category = models.CharField(max_length=200, blank=True, null=True,
                                      help_text="Custom category when 'Other' is selected")

    # Multiple amenities (already existed, kept as-is)
    amenities = models.ManyToManyField('Amenity', blank=True)
    # ✅ NEW: Custom amenity text for "Other" option
    other_amenity = models.CharField(max_length=200, blank=True, null=True,
                                     help_text="Custom amenity when 'Other' is selected")

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    payment_methods = models.CharField(max_length=255, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    # ✅ Philippine-time aware status using per-day BusinessHours
    def _get_ph_now(self):
        """Returns current datetime in Philippine time (Asia/Manila)."""
        from datetime import datetime
        try:
            from zoneinfo import ZoneInfo
            return datetime.now(ZoneInfo('Asia/Manila'))
        except Exception:
            pass
        try:
            import pytz
            return datetime.now(pytz.timezone('Asia/Manila'))
        except Exception:
            pass
        return datetime.now()

    @property
    def status(self):
        """
        Automatically determine Open/Closed.
        Checks per-day BusinessHours first; falls back to global opening/closing_time.
        """
        now_dt = self._get_ph_now()
        current_day = now_dt.weekday()   # 0 = Monday … 6 = Sunday
        current_time = now_dt.time()

        # ── Per-day schedule ──────────────────────────────────
        try:
            day_hours = self.business_hours.filter(day_of_week=current_day).first()
            if day_hours is not None:
                if day_hours.is_closed or not day_hours.opening_time or not day_hours.closing_time:
                    return "Closed"
                o, c = day_hours.opening_time, day_hours.closing_time
                if o <= c:
                    return "Open" if o <= current_time <= c else "Closed"
                return "Open" if current_time >= o or current_time <= c else "Closed"
        except Exception:
            pass

        # ── Fallback: global times ────────────────────────────
        if not self.opening_time or not self.closing_time:
            return "Closed"
        o, c = self.opening_time, self.closing_time
        if o <= c:
            return "Open" if o <= current_time <= c else "Closed"
        return "Open" if current_time >= o or current_time <= c else "Closed"

    @property
    def today_opening_time(self):
        """Today's opening time from BusinessHours (falls back to global opening_time)."""
        today = self._get_ph_now().weekday()
        try:
            bh = self.business_hours.filter(day_of_week=today).first()
            if bh and not bh.is_closed and bh.opening_time:
                return bh.opening_time
        except Exception:
            pass
        return self.opening_time

    @property
    def today_closing_time(self):
        """Today's closing time from BusinessHours (falls back to global closing_time)."""
        today = self._get_ph_now().weekday()
        try:
            bh = self.business_hours.filter(day_of_week=today).first()
            if bh and not bh.is_closed and bh.closing_time:
                return bh.closing_time
        except Exception:
            pass
        return self.closing_time

    # ✅ NEW: Helper method to get all categories including custom
    def get_all_categories(self):
        """Returns list of all category names including custom 'Other' category"""
        category_names = list(self.categories.values_list('name', flat=True))
        if self.other_category:
            category_names.append(f"Other: {self.other_category}")
        return category_names

    # ✅ NEW: Helper method to get all amenities including custom
    def get_all_amenities(self):
        """Returns list of all amenity names including custom 'Other' amenity"""
        amenity_names = list(self.amenities.values_list('name', flat=True))
        if self.other_amenity:
            amenity_names.append(f"Other: {self.other_amenity}")
        return amenity_names


class BusinessHours(models.Model):
    """Per-day opening/closing hours for a food establishment."""
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    establishment = models.ForeignKey(
        'FoodEstablishment',
        on_delete=models.CASCADE,
        related_name='business_hours'
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(
        default=False,
        help_text="Set True for days the establishment is fully closed."
    )

    class Meta:
        unique_together = ('establishment', 'day_of_week')
        ordering = ['day_of_week']
        verbose_name = "Business Hours"
        verbose_name_plural = "Business Hours"

    def __str__(self):
        day = dict(self.DAY_CHOICES).get(self.day_of_week, '?')
        if self.is_closed:
            return f"{self.establishment.name} – {day}: Closed"
        return f"{self.establishment.name} – {day}: {self.opening_time} – {self.closing_time}"


class OTP(models.Model):
    """OTP for email verification with expiration"""
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.IntegerField(default=0)

    class Meta:
        verbose_name = "OTP"
        verbose_name_plural = "OTPs"

    def __str__(self):
        return f"OTP for {self.email} - {self.code}"

    def is_expired(self):
        """Check if OTP is expired (10 minutes)"""
        expiry_time = self.created_at + timedelta(minutes=10)
        return timezone.now() > expiry_time

    def increment_attempts(self):
        """Increment failed attempts"""
        self.attempts += 1
        self.save()

    def is_blocked(self):
        """Block after 5 failed attempts"""
        return self.attempts >= 5


class InvitationCode(models.Model):
    """
    Model for invitation codes used by new food establishments to register.
    The code is automatically generated upon saving if not provided.
    """
    code = models.CharField(max_length=12, unique=True, blank=True)
    is_used = models.BooleanField(default=False)
    # Use OneToOneField to ensure one code is used by only one establishment
    used_by = models.OneToOneField('FoodEstablishment', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        # Generate a code only if it's not already set
        if not self.code:
            self.code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
        super().save(*args, **kwargs)


class MenuItem(models.Model):
    """Represents a single item on a food establishment's menu."""
    food_establishment = models.ForeignKey(
        'FoodEstablishment',
        on_delete=models.CASCADE,
        related_name='menu_items'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to='menu_images/', null=True, blank=True)
    quantity = models.PositiveIntegerField(
        default=0,
        help_text="Available stock or servings"
    )
    is_top_seller = models.BooleanField(default=False)
    top_seller_marked_at = models.DateTimeField(null=True, blank=True, default=None)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Menu Item"
        verbose_name_plural = "Menu Items"

    def __str__(self):
        """Readable representation for admin/debug."""
        status = "Available" if self.is_available else "Out of Stock"
        return f"{self.name} ({status})"

    # 🧠 Read-only property for compatibility with templates
    @property
    def is_available(self):
        """Return True if quantity > 0."""
        return self.quantity > 0

    # 🔄 Save override ensures no negative stock
    def save(self, *args, **kwargs):
        if self.quantity < 0:
            self.quantity = 0
        super().save(*args, **kwargs)

    # 🧮 Called after successful payment/checkout
    def reduce_stock(self, amount):
        """Reduce stock after successful order/payment."""
        self.quantity = max(self.quantity - amount, 0)
        self.save()


class Review(models.Model):
    """Represents a user's review and rating for a food establishment."""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    establishment = models.ForeignKey(FoodEstablishment, related_name='reviews', on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='review_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'establishment')
        ordering = ['-created_at']

    def __str__(self):
        return f"Review for {self.establishment.name} by {self.user.username}"


# ✅✅✅ FIXED USERPROFILE MODEL - PHONE_NUMBER REMOVED ✅✅✅
class UserProfile(models.Model):
    """Extension of the User model to store additional user information."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # ✅ REMOVED: phone_number field (hindi naman ginagamit)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)

    # Location preferences (for future features)
    default_latitude = models.FloatField(null=True, blank=True)
    default_longitude = models.FloatField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


# ✅✅✅ IMPROVED SIGNALS WITH ERROR HANDLING ✅✅✅
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically create UserProfile when a User is created.
    ✅ IMPROVED: Has error handling to prevent crashes
    """
    if created:
        try:
            UserProfile.objects.get_or_create(user=instance)
        except Exception as e:
            logger.error(f"Failed to create profile for user {instance.id}: {e}")


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Save UserProfile whenever User is saved.
    ✅ FIXED: Won't crash if database schema is mismatched or profile doesn't exist
    """
    try:
        # ✅ Use filter() instead of hasattr() to avoid implicit database query that can fail
        profile = UserProfile.objects.filter(user=instance).first()
        if profile:
            profile.save()
        elif not kwargs.get('created', False):
            # If profile doesn't exist and user is not being created, try to create it
            UserProfile.objects.create(user=instance)
    except Exception as e:
        # ✅ Log but don't crash - allows login to proceed even if there's a database issue
        logger.warning(f"Could not save/create profile for user {instance.id}: {e}")


class Cart(models.Model):
    """Shopping cart for a user to collect items before checkout."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

    def get_total_price(self):
        """Calculate the total price of all items in the cart."""
        return sum(item.total_price for item in self.items.all())

    def get_item_count(self):
        """Count total number of items in cart."""
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    """Individual item in a shopping cart."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'menu_item')

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} in cart"

    @property
    def total_price(self):
        """Calculate the total price for this cart item."""
        return self.menu_item.price * self.quantity


class Order(models.Model):
    """Represents a customer's order from a food establishment."""
    STATUS_CHOICES = [
        ('request', 'Request'),
        ('to_pay', 'To Pay'),
        ('preparing', 'Preparing'),
        ('to_claim', 'To Claim'),
        ('completed', 'Completed'),
        # Legacy statuses (for backward compatibility)
        ('order_received', 'Order Received'),
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    establishment = models.ForeignKey('FoodEstablishment', on_delete=models.CASCADE)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='request')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # GCash/PayMongo Fields
    gcash_reference_number = models.CharField(max_length=100, blank=True, null=True)
    gcash_payment_method = models.CharField(max_length=50, default='gcash')
    payment_confirmed_at = models.DateTimeField(null=True, blank=True)
    paymongo_checkout_id = models.CharField(max_length=100, blank=True, null=True)

    # ✅ Idempotency guard — True once _deduct_stock_and_clear_cart has run for
    # this order. Prevents double-deduction when multiple code paths (payment
    # webhook + owner moving to 'preparing') could otherwise both call the helper.
    stock_deducted = models.BooleanField(
        default=False,
        help_text="Set to True after menu-item quantities have been deducted for this order."
    )

    # ✅ NEW: owner_dismissed — True after the owner manually removes a
    # cancelled-by-client order from the request tab. Excluded from the
    # owner orders API so it never reappears after a page reload.
    owner_dismissed = models.BooleanField(
        default=False,
        help_text="Set to True when the owner dismisses a client-cancelled order from the request tab."
    )

    # ✅ NEW: cancel_reason — stores the reason given by the client (or owner)
    # when an order is cancelled. Shown in the owner's request tab status cell.
    cancel_reason = models.TextField(
        blank=True,
        default='',
        help_text="Reason provided when this order was cancelled."
    )

    # ✅ NEW: cancelled_from_status — records which status the order was in
    # when the owner rejected it ('request', 'to_pay', or 'to_claim').
    # This is the ONLY reliable way to route a rejected order to the correct
    # tab on the client order history page after a hard page refresh.
    # ONLY set by reject_order(). NEVER set by the client cancel_order().
    # Empty string = client self-cancelled (no owner rejection).
    cancelled_from_status = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text="Status the order was in when owner rejected it (request/to_pay/to_claim)."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} - {self.establishment.name} ({self.status})"

    def get_item_count(self):
        """Return the total number of items (sum of quantities) in this order"""
        from django.db.models import Sum
        result = self.orderitem_set.aggregate(total=Sum('quantity'))
        return result['total'] or 0

    def update_total(self):
        """Update the total amount based on order items"""
        from django.db.models import Sum, F
        from decimal import Decimal
        total = self.orderitem_set.aggregate(
            total=Sum(F('price_at_order') * F('quantity'))
        )['total'] or Decimal('0.00')
        self.total_amount = total
        self.save(update_fields=['total_amount'])


# ✅✅✅ FIXED ORDERITEM MODEL - CRITICAL CHANGES ✅✅✅
class OrderItem(models.Model):
    """
    ✅ FIXED: Proper OrderItem with correct related_name
    Individual item within an order
    """
    # ✅ CRITICAL: Use related_name='orderitem_set' to match views.py expectations
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='orderitem_set'  # ✅ THIS IS THE KEY FIX!
    )
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price_at_order = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price of the item at the time of order"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.quantity} x {self.menu_item.name} in Order #{self.order.id}"

    @property
    def total_price(self):
        """Calculate subtotal for this item"""
        return Decimal(self.price_at_order) * self.quantity

    # ✅ NEW: Auto-update order total on save
    def save(self, *args, **kwargs):
        """Override save to update order total automatically"""
        super().save(*args, **kwargs)
        # Update parent order total
        if self.order:
            self.order.update_total()

    # ✅ NEW: Auto-update order total on delete
    def delete(self, *args, **kwargs):
        """Override delete to update order total automatically"""
        order = self.order
        super().delete(*args, **kwargs)
        # Update parent order total after deletion
        if order:
            order.update_total()


# ================================
# Chat Models
# ================================

class ChatRoom(models.Model):
    """
    Represents a conversation between a customer and a food establishment.
    """
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='customer_chats'
    )
    establishment = models.ForeignKey(
        'FoodEstablishment',
        on_delete=models.CASCADE,
        related_name='establishment_chats'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Track unread messages
    customer_unread_count = models.IntegerField(default=0)
    owner_unread_count = models.IntegerField(default=0)

    class Meta:
        unique_together = ('customer', 'establishment')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat: {self.customer.username} - {self.establishment.name}"

    def get_room_name(self):
        """Generate unique room name for WebSocket"""
        return f"chat_{self.customer.id}_{self.establishment.id}"


class Message(models.Model):
    """
    Individual message in a chat room.
    """
    chat_room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # For "Unsend for you" functionality
    is_hidden_for_sender = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"

    @property
    def is_customer_message(self):
        """Check if message is from customer"""
        return self.sender == self.chat_room.customer

    def mark_as_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])

            # Update unread count
            if self.is_customer_message:
                if self.chat_room.owner_unread_count > 0:
                    self.chat_room.owner_unread_count -= 1
            else:
                if self.chat_room.customer_unread_count > 0:
                    self.chat_room.customer_unread_count -= 1

            self.chat_room.save(update_fields=[
                'customer_unread_count',
                'owner_unread_count'
            ])


# ================================
# Notification Models
# ================================

class OrderNotification(models.Model):
    """
    Stores notifications for food establishment owners about new orders
    """
    NOTIFICATION_TYPES = (
        ('new_order', 'New Order'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('order_cancelled', 'Order Cancelled'),
        ('order_completed', 'Order Completed'),
    )

    establishment = models.ForeignKey(
        'FoodEstablishment',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    order = models.ForeignKey(
        'Order',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        default='new_order'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['establishment', '-created_at']),
            models.Index(fields=['is_read', '-created_at']),
        ]

    def __str__(self):
        return f"Notification for {self.establishment.name} - Order #{self.order.id}"

    def mark_as_read(self):
        """Mark this notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class FavoriteEstablishment(models.Model):
    """
    Tracks which establishments a user has starred as favorites.
    Toggle: kung nandoon na → tanggalin; kung wala pa → idagdag.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_establishments'
    )
    establishment = models.ForeignKey(
        'FoodEstablishment',
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'establishment')
        ordering = ['-created_at']
        verbose_name = "Favorite Establishment"
        verbose_name_plural = "Favorite Establishments"

    def __str__(self):
        return f"{self.user.username} ♥ {self.establishment.name}"


class FavoriteMenuItem(models.Model):
    """
    Tracks which menu items a user has hearted as favorites.
    Toggle: kung nandoon na → tanggalin; kung wala pa → idagdag.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_menu_items'
    )
    menu_item = models.ForeignKey(
        'MenuItem',
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'menu_item')
        ordering = ['-created_at']
        verbose_name = "Favorite Menu Item"
        verbose_name_plural = "Favorite Menu Items"

    def __str__(self):
        return f"{self.user.username} ♥ {self.menu_item.name}"


# ─────────────────────────────────────────────────────────────────────────────
# EstablishmentContactLink  –  dynamic label + URL/email pairs per establishment
# ─────────────────────────────────────────────────────────────────────────────
class EstablishmentContactLink(models.Model):
    establishment = models.ForeignKey(
        'FoodEstablishment',
        on_delete=models.CASCADE,
        related_name='contact_links'
    )
    label = models.CharField(
        max_length=50,
        help_text="Short display label, e.g. 'FB', 'Gmail', 'TikTok'"
    )
    value = models.CharField(
        max_length=500,
        help_text="Full URL (https://…) or e-mail address"
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = "Contact / Social Link"
        verbose_name_plural = "Contact / Social Links"

    def __str__(self):
        return f"{self.establishment.name} – {self.label}: {self.value}"

    @property
    def href(self):
        """Return a clickable href: mailto: for e-mails, raw URL for everything else."""
        import re
        if re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', self.value.strip()):
            return f"mailto:{self.value.strip()}"
        return self.value.strip()

    @property
    def icon_class(self):
        """Best-effort Font Awesome icon based on the label text."""
        lbl = self.label.lower()
        if 'fb' in lbl or 'facebook' in lbl:           return 'fab fa-facebook-f'
        if 'ig' in lbl or 'instagram' in lbl or 'insta' in lbl: return 'fab fa-instagram'
        if 'tiktok' in lbl or 'tik tok' in lbl or lbl == 'tt':  return 'fab fa-tiktok'
        if 'youtube' in lbl or lbl == 'yt':             return 'fab fa-youtube'
        if 'gmail' in lbl or 'email' in lbl or 'mail' in lbl:   return 'fas fa-envelope'
        if 'twitter' in lbl or lbl == 'x':              return 'fab fa-x-twitter'
        if 'whatsapp' in lbl or lbl == 'wa':            return 'fab fa-whatsapp'
        if 'viber' in lbl:                              return 'fab fa-viber'
        if 'discord' in lbl:                            return 'fab fa-discord'
        if 'linkedin' in lbl:                           return 'fab fa-linkedin-in'
        if 'website' in lbl or 'web' in lbl or 'site' in lbl:   return 'fas fa-globe'
        if 'phone' in lbl or 'tel' in lbl or 'call' in lbl:     return 'fas fa-phone'
        return 'fas fa-link'

    @property
    def icon_bg(self):
        """Platform brand colour for the icon bubble in templates."""
        lbl = self.label.lower()
        if 'fb' in lbl or 'facebook' in lbl:            return '#1877f2'
        if 'ig' in lbl or 'instagram' in lbl or 'insta' in lbl: return '#e1306c'
        if 'tiktok' in lbl or lbl == 'tt':              return '#010101'
        if 'youtube' in lbl or lbl == 'yt':             return '#ff0000'
        if 'gmail' in lbl or 'email' in lbl or 'mail' in lbl:   return '#ea4335'
        if 'twitter' in lbl or lbl == 'x':              return '#000000'
        if 'whatsapp' in lbl or lbl == 'wa':            return '#25d366'
        if 'viber' in lbl:                              return '#7360f2'
        if 'discord' in lbl:                            return '#5865f2'
        if 'linkedin' in lbl:                           return '#0a66c2'
        return '#8b0000'