from django.db import models
import uuid
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import random
from django.db.models import Sum
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

    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, blank=True)
    amenities = models.ManyToManyField('Amenity', blank=True)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    payment_methods = models.CharField(max_length=255, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    # ✅ FIXED: Automatic status calculation based on time
    # ✅ KEEP THIS - Already correct in models.py (lines 58-72)
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


class OTP(models.Model):
    """OTP for email verification with expiration"""
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)

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
    top_seller_marked_at = models.DateTimeField(null=True, blank=True)

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
        return f"{self.user.username}'s review for {self.establishment.name} ({self.rating}⭐)"


class UserProfile(models.Model):
    """Extended User Profile Model"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


# ===== Signal to auto-create UserProfile when a new User is created =====
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Create a UserProfile when a User instance is created.
    """
    if created:
        UserProfile.objects.create(user=instance)


class Cart(models.Model):
    """Isang Cart para sa User."""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    establishment = models.ForeignKey('FoodEstablishment', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)  # Para malaman kung cart pa o naging Order na
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username} at {self.establishment.name} (Active: {self.is_active})"


class CartItem(models.Model):
    """Isang item sa loob ng Cart."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

    def total_price(self):
        """Kalkulahin ang subtotal para sa item na ito."""
        return self.menu_item.price * self.quantity

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} in Cart {self.cart.id}"


# ==========================================
# ORDER MANAGEMENT SYSTEM - UPDATED ORDER MODEL
# ==========================================
class Order(models.Model):
    """
    Complete Order model with payment and fulfillment status tracking.
    Supports both legacy status and new management system statuses.
    """
    # Legacy status choices (for backward compatibility)
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready for Pick-up/Delivery'),
        ('COMPLETED', 'Completed'),
    ]

    # New management system status choices
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
    ]

    FULFILLMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('claimed', 'Claimed'),
    ]

    # ===== Core Relationships =====
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    establishment = models.ForeignKey('FoodEstablishment', on_delete=models.CASCADE, related_name='orders')

    # ===== Legacy Status Field (Kept for backward compatibility) =====
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')

    # ===== New Order Management System Fields =====
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid',
        db_index=True,
        help_text='Payment status: unpaid or paid'
    )

    fulfillment_status = models.CharField(
        max_length=20,
        choices=FULFILLMENT_STATUS_CHOICES,
        default='pending',
        db_index=True,
        help_text='Fulfillment status: pending or claimed'
    )

    # ===== Financial Fields =====
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Subtotal before delivery fee and discounts'
    )

    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Delivery fee for this order'
    )

    discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        blank=True,
        null=True,
        help_text='Any applicable discount'
    )

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text='Total order amount')

    # ===== Additional Information =====
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Internal notes about this order'
    )

    special_instructions = models.TextField(
        blank=True,
        null=True,
        help_text='Customer special instructions'
    )

    # ===== Payment Fields =====
    gcash_reference_number = models.CharField(max_length=100, blank=True, null=True)
    gcash_payment_method = models.CharField(max_length=50, default='gcash')
    payment_confirmed_at = models.DateTimeField(null=True, blank=True)
    paymongo_checkout_id = models.CharField(max_length=100, blank=True, null=True)

    # ===== Timestamps =====
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    # ===== Metadata =====
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['establishment', '-created_at']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['fulfillment_status']),
        ]
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return f"Order #{self.id} - {self.establishment.name} ({self.status})"

    def update_total(self):
        """
        Recalculate total amount from order items.
        Includes subtotal, delivery fee, and discounts.
        """
        items_total = self.items.aggregate(
            sum_total=Sum('price_at_order', field='price_at_order * quantity')
        )['sum_total'] or Decimal('0.00')

        self.subtotal = items_total
        self.total_amount = self.subtotal + self.delivery_fee - (self.discount or Decimal('0.00'))
        self.save(update_fields=['subtotal', 'total_amount', 'updated_at'])

    def create_notification(self, notification_type='new_order'):
        """
        Create a notification for the establishment owner about this order.
        """
        messages_map = {
            'new_order': f'New order #{self.id} from {self.user.username}',
            'payment_confirmed': f'Payment confirmed for order #{self.id}',
            'order_cancelled': f'Order #{self.id} was cancelled',
        }

        OrderNotification.objects.create(
            establishment=self.establishment,
            order=self,
            notification_type=notification_type,
            message=messages_map.get(notification_type, 'New order received')
        )

    def save(self, *args, **kwargs):
        """
        Override save to automatically calculate total if needed.
        """
        if not self.total_amount:
            self.total_amount = self.subtotal + self.delivery_fee - (self.discount or Decimal('0.00'))
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """
    Individual item in an order.
    Maintains price snapshot at time of order.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='order_items')
    quantity = models.IntegerField(default=1)

    # Tiyakin na ang price_at_order ay DecimalField
    price_at_order = models.DecimalField(max_digits=10, decimal_places=2)

    special_notes = models.TextField(
        blank=True,
        null=True,
        help_text='Special preparation notes for this item'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} in Order #{self.order.id}"

    @property
    def total_price(self):
        """Kino-compute ang subtotal ng OrderItem (Presyo * Quantity)."""
        # Tiyakin na gumagamit tayo ng Decimal() para sa computation
        return Decimal(self.price_at_order) * self.quantity


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

    # ✅ NEW: For "Unsend for you" functionality
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