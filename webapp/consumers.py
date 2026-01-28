# webapplication/consumers.py
"""
WebSocket Consumers for Chat and Order Management
This file combines your existing ChatConsumer with new OrderConsumer
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import ChatRoom, Message, FoodEstablishment, Order


# ==========================================
# EXISTING CHAT CONSUMER (YOUR CODE)
# ==========================================
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

        elif message_type == 'unsend_message':
            message_id = data.get('message_id')
            unsend_type = data.get('unsend_type')
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
                # Mark as hidden for sender
                pass

            return {'success': True}

        except Message.DoesNotExist:
            return {'success': False, 'error': 'Message not found'}
        except Exception as e:
            print(f"Error unsending message: {e}")
            return {'success': False, 'error': str(e)}


# ==========================================
# NEW: ORDER MANAGEMENT CONSUMER
# ==========================================
class OrderConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time order updates
    Handles connections from food establishment owners
    """

    async def connect(self):
        """Called when WebSocket connection is opened"""
        self.user = self.scope['user']
        self.establishment_id = self.scope['url_route']['kwargs']['establishment_id']
        self.room_group_name = f'orders_{self.establishment_id}'

        # Verify user owns this establishment
        is_owner = await self.verify_establishment_owner()

        if not is_owner:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to order updates'
        }))

    async def disconnect(self, close_code):
        """Called when WebSocket connection is closed"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Called when message is received from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                # Respond to ping with pong
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))

            elif message_type == 'request_stats':
                # Send current statistics
                stats = await self.get_establishment_stats()
                await self.send(text_data=json.dumps({
                    'type': 'stats_update',
                    'stats': stats
                }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    # Group message handlers
    async def new_order(self, event):
        """Called when a new order is created"""
        await self.send(text_data=json.dumps({
            'type': 'new_order',
            'order': event['order']
        }))

    async def order_status_update(self, event):
        """Called when order status is updated"""
        await self.send(text_data=json.dumps({
            'type': 'order_status_changed',
            'order_id': event['order_id'],
            'payment_status': event['payment_status'],
            'fulfillment_status': event['fulfillment_status']
        }))

    async def order_payment_update(self, event):
        """Called when order payment is updated"""
        await self.send(text_data=json.dumps({
            'type': 'order_payment_updated',
            'order_id': event['order_id'],
            'payment_status': event['payment_status']
        }))

    # Database queries
    @database_sync_to_async
    def verify_establishment_owner(self):
        """Verify that the connected user owns the establishment"""
        try:
            establishment = FoodEstablishment.objects.get(id=self.establishment_id)
            return establishment.owner == self.user
        except FoodEstablishment.DoesNotExist:
            return False

    @database_sync_to_async
    def get_establishment_stats(self):
        """Get current statistics for the establishment"""
        try:
            from django.utils import timezone
            from django.db.models import Sum

            establishment = FoodEstablishment.objects.get(id=self.establishment_id)
            today = timezone.now().date()

            stats = {
                'pending': Order.objects.filter(
                    establishment=establishment,
                    fulfillment_status='pending'
                ).count(),
                'completed': Order.objects.filter(
                    establishment=establishment,
                    fulfillment_status='claimed'
                ).count(),
                'unpaid': Order.objects.filter(
                    establishment=establishment,
                    payment_status='unpaid'
                ).count(),
                'today_orders': Order.objects.filter(
                    establishment=establishment,
                    created_at__date=today
                ).count(),
            }

            return stats

        except FoodEstablishment.DoesNotExist:
            return {}


# ==========================================
# NEW: CUSTOMER ORDER CONSUMER
# ==========================================
class CustomerOrderConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for customer order updates
    Allows customers to receive real-time updates about their orders
    """

    async def connect(self):
        """Called when WebSocket connection is opened"""
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        self.room_group_name = f'customer_{self.user.id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to order updates'
        }))

    async def disconnect(self, close_code):
        """Called when WebSocket connection is closed"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Called when message is received from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    # Group message handlers
    async def order_status_update(self, event):
        """Called when order status is updated"""
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'order_id': event['order_id'],
            'establishment_name': event['establishment_name'],
            'payment_status': event['payment_status'],
            'fulfillment_status': event['fulfillment_status']
        }))

    async def order_ready(self, event):
        """Called when order is ready for pickup"""
        await self.send(text_data=json.dumps({
            'type': 'order_ready',
            'order_id': event['order_id'],
            'establishment_name': event['establishment_name'],
            'message': event['message']
        }))