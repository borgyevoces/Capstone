# webapp/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.core.cache import cache
from .models import ChatRoom, Message, FoodEstablishment


# ============================================================
# INVENTORY CONSUMER — real-time stock broadcast per establishment
# ============================================================
class InventoryConsumer(AsyncWebsocketConsumer):
    """
    Clients (kabsueats.html) connect to:
        ws/inventory/<establishment_id>/

    When any order request deducts stock, views.py calls
    channel_layer.group_send(f'inventory_{est_id}', {...})
    and every connected client receives the new quantities instantly
    without a page refresh.
    """

    async def connect(self):
        self.establishment_id = self.scope['url_route']['kwargs']['establishment_id']
        self.group_name = f'inventory_{self.establishment_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ── Handler called when views.py sends a group_send ──
    async def inventory_quantity_update(self, event):
        """
        Forward stock update to the browser.
        event format:
          {
            'type': 'inventory.quantity_update',   ← Django channels replaces . with _
            'updates': [{'menu_item_id': X, 'new_quantity': Y}, ...]
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'quantity_update',
            'updates': event['updates'],
        }))

    # ✅ NEW: Handler — establishment open/closed status changed
    async def inventory_establishment_status(self, event):
        """
        Forward establishment open/closed change to the cart page.
        Tinatawag ng views.py sa:
          - toggle_establishment_status      → owner nag-toggle ng Open/Disabled
          - update_establishment_details_ajax → owner nag-update ng hours/details
          - update_business_hours_ajax        → owner nag-save ng per-day hours

        event format:
          {
            'type': 'inventory.establishment_status',
            'establishment_id': X,
            'status':           'Open',      # 'Open' or 'Disabled'/'Closed'
            'opening_time':     '08:00 AM',  # display string, optional
            'closing_time':     '09:00 PM',  # display string, optional
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'establishment_status',
            'establishment_id': event['establishment_id'],
            'status':           event['status'],
            'opening_time':     event.get('opening_time', ''),
            'closing_time':     event.get('closing_time', ''),
        }))

    # ✅ NEW: Handler — full menu item data changed (price, name, qty, availability)
    async def inventory_item_updated(self, event):
        """
        Forward full item data change to all cart pages watching this establishment.
        Tinatawag ng views.py sa:
          - edit_menu_item       → owner nag-edit ng price/name/qty/image
          - toggle_item_availability → owner nag-toggle ng availability
          - add_menu_item (stacked)  → owner nag-restock (quantity added)

        event format:
          {
            'type': 'inventory.item_updated',
            'update': {
              'menu_item_id': X,
              'name':         'Sinigang na Baboy',
              'price':        '120.00',
              'quantity':     15,
              'is_available': True,
              'image_url':    '/media/...',   # optional
            }
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'item_updated',
            'update': event['update'],
        }))


# ============================================================
# ORDER STATUS CONSUMER — real-time order lifecycle events
# ============================================================
class OrderStatusConsumer(AsyncWebsocketConsumer):
    """
    Two group types subscribe to this consumer:

    1. Owner group  →  ws/order-status/establishment/<establishment_id>/
       Receives events for every order that belongs to their establishment.

    2. Customer group  →  ws/order-status/user/<user_id>/
       Receives events for the customer's own orders only.

    views.py calls _broadcast_order_status_update() whenever an order
    status changes (accept, prepare, cancel, reject, complete).
    """

    async def connect(self):
        kwargs = self.scope['url_route']['kwargs']
        # Supports both:
        #   ws/order-status/establishment/<id>/  →  scope_type + scope_id kwargs
        #   ws/orders/<establishment_id>/        →  establishment_id kwarg only
        self.scope_type = kwargs.get('scope_type', 'establishment')
        self.scope_id = kwargs.get('scope_id') or kwargs.get('establishment_id')
        self.group_name = f'order_status_{self.scope_type}_{self.scope_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Handler invoked by group_send from views.py
    async def order_status_update(self, event):
        """
        Forward order status change to the browser.
        event format:
          {
            'type': 'order.status.update',
            'order_id': 42,
            'new_status': 'cancelled',
            'establishment_id': 5,
            'user_id': 3,
            'cancel_reason': '...',   # optional
            'cancelled_from_status': 'request',  # owner-rejected orders
            'cancelled_by_owner': True,  # whether owner initiated rejection
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'order_id': event['order_id'],
            'new_status': event['new_status'],
            'establishment_id': event['establishment_id'],
            'user_id': event['user_id'],
            'cancel_reason': event.get('cancel_reason', ''),
            'cancelled_from_status': event.get('cancelled_from_status', ''),
            'cancelled_by_owner': event.get('cancelled_by_owner', False),
        }))

    # ✅ NEW: Handler for client dismissing a cancelled order
    async def order_dismissed_by_client(self, event):
        """
        Forward order dismissal to the owner dashboard.
        When client dismisses a cancelled order, owner sees it auto-removed.
        event format:
          {
            'type': 'order.dismissed_by_client',
            'order_id': 42,
            'establishment_id': 5,
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'order_dismissed_by_client',
            'order_id': event['order_id'],
            'establishment_id': event['establishment_id'],
        }))


# ============================================================
# CHAT CONSUMER — unchanged
# ============================================================
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Called when WebSocket connects"""
        self.customer_id = self.scope['url_route']['kwargs']['customer_id']
        self.establishment_id = self.scope['url_route']['kwargs']['establishment_id']
        self.room_name = f'chat_{self.customer_id}_{self.establishment_id}'
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to chat'
        }))

    async def disconnect(self, close_code):
        """Called when WebSocket disconnects"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Receive message from WebSocket"""
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'chat_message':
            message_content = data['message']
            sender_id = data['sender_id']

            # Save message to database
            message_obj = await self.save_message(
                sender_id,
                message_content
            )

            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message_content,
                    'sender_id': sender_id,
                    'sender_name': message_obj['sender_name'],
                    'timestamp': message_obj['timestamp'],
                    'message_id': message_obj['id']
                }
            )

        elif message_type == 'mark_read':
            message_id = data.get('message_id')
            await self.mark_message_read(message_id)

        elif message_type == 'typing':
            # Broadcast typing indicator
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'sender_id': data['sender_id'],
                    'is_typing': data['is_typing']
                }
            )

        # ✅ NEW: Unsend Message Handler
        elif message_type == 'unsend_message':
            message_id = data.get('message_id')
            unsend_type = data.get('unsend_type')  # 'everyone' or 'you'
            sender_id = data.get('sender_id')

            result = await self.unsend_message(message_id, unsend_type, sender_id)

            if result['success']:
                # Broadcast unsend to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_unsent',
                        'message_id': message_id,
                        'unsend_type': unsend_type,
                        'unsent_by': sender_id
                    }
                )

    async def chat_message(self, event):
        """Receive message from room group"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'timestamp': event['timestamp'],
            'message_id': event['message_id']
        }))

    async def typing_indicator(self, event):
        """Send typing indicator"""
        await self.send(text_data=json.dumps({
            'type': 'typing_indicator',
            'sender_id': event['sender_id'],
            'is_typing': event['is_typing']
        }))

    # ✅ NEW: Message Unsent Handler
    async def message_unsent(self, event):
        """Broadcast message unsend"""
        await self.send(text_data=json.dumps({
            'type': 'message_unsent',
            'message_id': event['message_id'],
            'unsend_type': event['unsend_type'],
            'unsent_by': event['unsent_by']
        }))

    @database_sync_to_async
    def save_message(self, sender_id, content):
        """Save message to database"""
        try:
            sender = User.objects.get(id=sender_id)
            customer = User.objects.get(id=self.customer_id)
            establishment = FoodEstablishment.objects.get(id=self.establishment_id)

            # Get or create chat room
            chat_room, created = ChatRoom.objects.get_or_create(
                customer=customer,
                establishment=establishment
            )

            # Create message
            message = Message.objects.create(
                chat_room=chat_room,
                sender=sender,
                content=content
            )

            # Update unread count
            if message.is_customer_message:
                chat_room.owner_unread_count += 1
            else:
                chat_room.customer_unread_count += 1

            chat_room.save()

            return {
                'id': message.id,
                'sender_name': sender.username,
                'timestamp': message.created_at.strftime('%I:%M %p')
            }

        except Exception as e:
            print(f"Error saving message: {e}")
            return {
                'id': 0,
                'sender_name': 'Unknown',
                'timestamp': ''
            }

    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read"""
        try:
            message = Message.objects.get(id=message_id)
            message.mark_as_read()
        except Message.DoesNotExist:
            pass

    # ✅ NEW: Unsend Message Function
    @database_sync_to_async
    def unsend_message(self, message_id, unsend_type, sender_id):
        """Handle message unsend"""
        try:
            message = Message.objects.get(id=message_id)

            # Verify sender owns this message
            if message.sender.id != int(sender_id):
                return {'success': False, 'error': 'Unauthorized'}

            if unsend_type == 'everyone':
                # Delete from database
                message.delete()
            elif unsend_type == 'you':
                # Mark as hidden for sender (add is_hidden_for_sender field if needed)
                # For now, we'll just return success without deletion
                pass

            return {'success': True}

        except Message.DoesNotExist:
            return {'success': False, 'error': 'Message not found'}
        except Exception as e:
            print(f"Error unsending message: {e}")
            return {'success': False, 'error': str(e)}


# ============================================================
# ESTABLISHMENT CONSUMER — real-time map updates
# ============================================================
class EstablishmentConsumer(AsyncWebsocketConsumer):
    """
    Clients (map on kabsueats.html, map.html) connect to:
        ws/establishments/

    When an establishment is created, updated, deactivated, or deleted,
    signals trigger channel_layer.group_send() to 'establishment_updates'
    group and every connected client receives the update instantly.

    Message types:
      - est_created: New establishment added to map
      - est_updated: Establishment info changed (status, name, address)
      - est_deleted: Establishment removed from system
      - est_deactivated: Establishment temporarily closed/deactivated
    """

    async def connect(self):
        self.group_name = 'establishment_updates'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print('[EstablishmentConsumer] Client connected to map updates')

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print('[EstablishmentConsumer] Client disconnected from map updates')

    # Handler for establishment creation
    async def est_created(self, event):
        """
        Forward new establishment to all connected map clients.
        event format from signals:
          {
            'type': 'est.created',
            'establishment': {
              'id': X, 'name': Y, 'status': Z, 'latitude': A, 'longitude': B, ...
            }
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'est_created',
            'establishment': event['establishment']
        }))

    # Handler for establishment update
    async def est_updated(self, event):
        """Forward updated establishment data."""
        await self.send(text_data=json.dumps({
            'type': 'est_updated',
            'establishment': event['establishment']
        }))

    # Handler for establishment deletion
    async def est_deleted(self, event):
        """Forward establishment deletion (remove from map)."""
        await self.send(text_data=json.dumps({
            'type': 'est_deleted',
            'establishment_id': event['establishment_id']
        }))

    # Handler for establishment deactivation
    async def est_deactivated(self, event):
        """Forward establishment deactivation."""
        await self.send(text_data=json.dumps({
            'type': 'est_deactivated',
            'establishment_id': event['establishment_id']
        }))


# ============================================================
# ✅ NEW: CART CONSUMER — real-time cart sync per user
# ============================================================
class CartConsumer(AsyncWebsocketConsumer):
    """
    Clients (cart.html) connect to:
        ws/cart/<user_id>/

    Ini-broadcast nito ang lahat ng cart mutations (quantity update,
    remove item, clear establishment, order sent) sa LAHAT ng
    tabs/devices ng same user para real-time ang cart kahit bukas
    sa iba pang window o device.

    Message types pababa sa browser:
      - cart_quantity_updated       → quantity ng item nabago
      - cart_item_removed           → item na-delete mula sa cart
      - cart_establishment_cleared  → lahat ng items ng establishment na-clear
      - cart_order_sent             → order request na-send na

    Tinatawag ng views.py ang _broadcast_cart_update() helper
    pagkatapos ng bawat cart DB mutation.
    """

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'cart_user_{self.user_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ── Handler: quantity ng item na-update ──
    async def cart_quantity_updated(self, event):
        """
        event format (galing sa views.py _broadcast_cart_update):
          {
            'type': 'cart.quantity_updated',
            'order_item_id': 12,
            'new_quantity':  3,
            'item_total':    150.00,
            'order_total':   450.00,
            'cart_count':    7,
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'cart_quantity_updated',
            'order_item_id': event['order_item_id'],
            'new_quantity': event['new_quantity'],
            'item_total': event['item_total'],
            'order_total': event['order_total'],
            'cart_count': event['cart_count'],
        }))

    # ── Handler: item na-remove mula sa cart ──
    async def cart_item_removed(self, event):
        """
        event format:
          {
            'type': 'cart.item_removed',
            'order_item_id':    12,
            'establishment_id': 5,
            'order_deleted':    False,
            'cart_count':       4,
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'cart_item_removed',
            'order_item_id': event['order_item_id'],
            'establishment_id': event['establishment_id'],
            'order_deleted': event['order_deleted'],
            'cart_count': event['cart_count'],
        }))

    # ── Handler: establishment cart na-clear ──
    async def cart_establishment_cleared(self, event):
        """
        event format:
          {
            'type': 'cart.establishment_cleared',
            'establishment_id': 5,
            'cart_count':       2,
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'cart_establishment_cleared',
            'establishment_id': event['establishment_id'],
            'cart_count': event['cart_count'],
        }))

    # ── Handler: order request na-send ──
    async def cart_order_sent(self, event):
        """
        event format:
          {
            'type': 'cart.order_sent',
            'establishment_id': 5,
            'order_id':         42,
            'cart_count':       0,
          }
        """
        await self.send(text_data=json.dumps({
            'type': 'cart_order_sent',
            'establishment_id': event['establishment_id'],
            'order_id': event['order_id'],
            'cart_count': event['cart_count'],
        }))

# ============================================================
# OWNER PRESENCE CONSUMER — realtime ~1 second
# ============================================================
# TWO directions:
#   1. Owner → Customers:
#      Owner opens dashboard   → connects /ws/presence/<est>/owner/
#                              → broadcasts 'owner_online' to all customers
#      Owner closes tab        → auto-disconnect → broadcasts 'owner_offline'
#      Customer opens details  → connects /ws/presence/<est>/customer/<cust_id>/
#                              → immediately receives current owner status
#
#   2. Customer → Owner:
#      Customer opens details  → connects with customer_id
#                              → broadcasts 'customer_online' to owner dashboard
#      Customer closes tab     → auto-disconnect → broadcasts 'customer_offline'
#      Owner dashboard listens → shows online dot per customer in chat list
# ============================================================
class OwnerPresenceConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        kwargs = self.scope['url_route']['kwargs']
        self.establishment_id = kwargs['establishment_id']
        # Role is determined by which URL pattern was matched:
        #   /ws/presence/<est_id>/owner/          -> no customer_id -> owner
        #   /ws/presence/<est_id>/customer/<id>/  -> has customer_id -> customer
        self.customer_id = kwargs.get('customer_id', None)
        self.role        = 'customer' if self.customer_id else 'owner'
        self.group_name  = f'presence_{self.establishment_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        if self.role == 'owner':
            # Mark owner online (90s safety TTL)
            cache.set(f'owner_online_{self.establishment_id}', True, timeout=90)
            # Broadcast owner ONLINE to all customers on details page
            await self.channel_layer.group_send(
                self.group_name,
                {'type': 'presence.update', 'status': 'owner_online'}
            )
            # Send current online customers to the owner immediately
            online_customers = cache.get(f'online_customers_{self.establishment_id}', set())
            for cid in online_customers:
                await self.send(text_data=json.dumps({
                    'type':        'customer_presence',
                    'customer_id': cid,
                    'status':      'online',
                }))

        elif self.role == 'customer':
            # Send current owner status immediately to this customer
            is_owner_online = cache.get(f'owner_online_{self.establishment_id}', False)
            await self.send(text_data=json.dumps({
                'type':   'presence_update',
                'status': 'online' if is_owner_online else 'offline',
            }))
            # Track this customer as online
            online_customers = cache.get(f'online_customers_{self.establishment_id}', set())
            online_customers.add(str(self.customer_id))
            cache.set(f'online_customers_{self.establishment_id}', online_customers, timeout=90)
            # Broadcast customer ONLINE to the owner dashboard
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type':        'presence.update',
                    'status':      'customer_online',
                    'customer_id': str(self.customer_id),
                }
            )

    async def disconnect(self, close_code):
        if self.role == 'owner':
            cache.delete(f'owner_online_{self.establishment_id}')
            # Broadcast owner OFFLINE to all customers
            await self.channel_layer.group_send(
                self.group_name,
                {'type': 'presence.update', 'status': 'owner_offline'}
            )

        elif self.role == 'customer':
            # Remove from online customers set
            online_customers = cache.get(f'online_customers_{self.establishment_id}', set())
            online_customers.discard(str(self.customer_id))
            cache.set(f'online_customers_{self.establishment_id}', online_customers, timeout=90)
            # Broadcast customer OFFLINE to the owner dashboard
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type':        'presence.update',
                    'status':      'customer_offline',
                    'customer_id': str(self.customer_id),
                }
            )

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def presence_update(self, event):
        """Forward group broadcast to this WebSocket client — filtered by role."""
        status = event['status']

        if self.role == 'customer' and status in ('owner_online', 'owner_offline'):
            # Customers only care about owner status
            await self.send(text_data=json.dumps({
                'type':   'presence_update',
                'status': 'online' if status == 'owner_online' else 'offline',
            }))

        elif self.role == 'owner' and status in ('customer_online', 'customer_offline'):
            # Owner only cares about customer presence
            await self.send(text_data=json.dumps({
                'type':        'customer_presence',
                'customer_id': event.get('customer_id', ''),
                'status':      'online' if status == 'customer_online' else 'offline',
            }))