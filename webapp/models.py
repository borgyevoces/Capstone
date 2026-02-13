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

    # ✅ Automatic status calculation based on time
    @property
    def status(self):
        """
        Automatically determine if establishment is Open or Closed based on current time.
        Returns 'Open' or 'Closed' string.
        """
        if not self.opening_time or not self.closing_time:
            return "Closed"

        from datetime import datetime
        now = datetime.now().time()

        if self.opening_time <= self.closing_time:
            return "Open" if self.opening_time <= now <= self.closing_time else "Closed"
        else:
            return "Open" if now >= self.opening_time or now <= self.closing_time else "Closed"

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


class UserProfile(models.Model):
    """Extension of the User model to store additional user information."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)

    # Location preferences (for future features)
    default_latitude = models.FloatField(null=True, blank=True)
    default_longitude = models.FloatField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create UserProfile when a User is created."""
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile whenever User is saved."""
    if hasattr(instance, 'profile'):
        instance.profile.save()


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
        ('order_received', 'Order Received'),
        ('preparing', 'Preparing'),
        ('ready_for_pickup', 'Ready for Pickup'),
        ('completed', 'Completed'),
        # Legacy statuses (for backward compatibility)
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    establishment = models.ForeignKey('FoodEstablishment', on_delete=models.CASCADE)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='order_received')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # GCash/PayMongo Fields
    gcash_reference_number = models.CharField(max_length=100, blank=True, null=True)
    gcash_payment_method = models.CharField(max_length=50, default='gcash')
    payment_confirmed_at = models.DateTimeField(null=True, blank=True)
    paymongo_checkout_id = models.CharField(max_length=100, blank=True, null=True)

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