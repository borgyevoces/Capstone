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
    @property
    def status(self):
        """
        Automatically determine if establishment is Open or Closed based on current time.
        Returns 'Open' or 'Closed' string.
        """
        if not self.opening_time or not self.closing_time:
            return "Closed"  # Default to closed if times not set

        from datetime import datetime
        now = datetime.now().time()

        if self.opening_time <= self.closing_time:
            # Normal case: opens and closes on same day (e.g., 8 AM - 10 PM)
            return "Open" if self.opening_time <= now <= self.closing_time else "Closed"
        else:
            # Overnight case: closes after midnight (e.g., 10 PM - 2 AM)
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
    """Extends the built-in Django User model with a profile picture."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='userprofile')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

    def __str__(self):
        return f'{self.user.username}\'s Profile'

# ================================
# Signals
# ================================
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Signal receiver to create a UserProfile when a new User is created."""
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Signal receiver to save the UserProfile whenever the User is saved."""
    try:
        instance.userprofile.save()
    except UserProfile.DoesNotExist:
        # Create a new profile if it doesn't exist for some reason
        UserProfile.objects.create(user=instance)

# ================================
# Deprecated/Redundant Models (as noted in original code)
# ================================
class PaymentMethod(models.Model):
    """Represents a payment method.
    NOTE: The PaymentMethod model is now deprecated. Payment methods are now stored as a CharField in FoodEstablishment.
    """
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class FoodEstablishmentCode(models.Model):
    """
    Represents a login code for a food establishment.
    NOTE: This is likely redundant since FoodEstablishment already has an 'access_code'.
    """
    food_establishment = models.OneToOneField(FoodEstablishment, on_delete=models.CASCADE)
    code = models.CharField(max_length=6, unique=True)

    def __str__(self):
        return f"{self.food_establishment.name} - {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_access_code()
        super().save(*args, **kwargs)

# ===============================
# Shopping Cart & Order Models
# ===============================

class Cart(models.Model):
    """
    Kumakatawan sa isang shopping cart.
    Kailangan ng user at establishment para malaman kung kanino at saan nag-oorder.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    establishment = models.ForeignKey('FoodEstablishment', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True) # Para malaman kung cart pa o naging Order na
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

class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready for Pick-up/Delivery'),
        ('COMPLETED', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    establishment = models.ForeignKey('FoodEstablishment', on_delete=models.CASCADE)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # GCash Fields
    gcash_reference_number = models.CharField(max_length=100, blank=True, null=True)
    gcash_payment_method = models.CharField(max_length=50, default='gcash')
    payment_confirmed_at = models.DateTimeField(null=True, blank=True)

    # ✅ THIS FIELD MUST EXIST
    paymongo_checkout_id = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def update_total(self):
        total = self.orderitem_set.aggregate(
            sum_total=Sum('price_at_order', field='price_at_order * quantity')
        )['sum_total'] or 0.00
        self.total_amount = total
        self.save(update_fields=['total_amount', 'updated_at'])

    def __str__(self):
        return f"Order #{self.id} - {self.establishment.name} ({self.status})"

    def create_notification(self, notification_type='new_order'):
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

class OrderItem(models.Model):
    """Isang item sa loob ng isang Order."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    # Tiyakin na ang price_at_order ay DecimalField
    price_at_order = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def total_price(self):
        """Kino-compute ang subtotal ng OrderItem (Presyo * Quantity)."""
        # Tiyakin na gumagamit tayo ng Decimal() para sa computation
        from decimal import Decimal
        return Decimal(self.price_at_order) * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.menu_item.name} in Order #{self.order.id}"

from django.db import models
from django.contrib.auth.models import User

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
    Real-time notifications for store owners when orders are placed
    """
    NOTIFICATION_TYPES = [
        ('new_order', 'New Order'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('order_cancelled', 'Order Cancelled'),
    ]

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

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} - {self.establishment.name} - Order #{self.order.id}"

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])
