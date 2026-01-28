# ==========================================
# WEBSOCKET CONSUMERS FOR REAL-TIME ORDER UPDATES
# Create this file as: your_app/consumers.py
# ==========================================

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Order, FoodEstablishment

User = get_user_model()


class OrderConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time order updates
    Handles connections from food establishment owners
    """

    async def connect(self):
        """
        Called when WebSocket connection is opened
        """
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
        """
        Called when WebSocket connection is closed
        """
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Called when message is received from WebSocket
        """
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

    # ==========================================
    # Group message handlers
    # ==========================================

    async def new_order(self, event):
        """
        Called when a new order is created
        """
        await self.send(text_data=json.dumps({
            'type': 'new_order',
            'order': event['order']
        }))

    async def order_status_update(self, event):
        """
        Called when order status is updated
        """
        await self.send(text_data=json.dumps({
            'type': 'order_status_changed',
            'order_id': event['order_id'],
            'payment_status': event['payment_status'],
            'fulfillment_status': event['fulfillment_status']
        }))

    async def order_payment_update(self, event):
        """
        Called when order payment is updated
        """
        await self.send(text_data=json.dumps({
            'type': 'order_payment_updated',
            'order_id': event['order_id'],
            'payment_status': event['payment_status']
        }))

    # ==========================================
    # Database queries
    # ==========================================

    @database_sync_to_async
    def verify_establishment_owner(self):
        """
        Verify that the connected user owns the establishment
        """
        try:
            establishment = FoodEstablishment.objects.get(id=self.establishment_id)
            return establishment.owner == self.user
        except FoodEstablishment.DoesNotExist:
            return False

    @database_sync_to_async
    def get_establishment_stats(self):
        """
        Get current statistics for the establishment
        """
        try:
            establishment = FoodEstablishment.objects.get(id=self.establishment_id)

            from django.utils import timezone
            from django.db.models import Sum

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


class CustomerOrderConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for customer order updates
    Allows customers to receive real-time updates about their orders
    """

    async def connect(self):
        """
        Called when WebSocket connection is opened
        """
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
        """
        Called when WebSocket connection is closed
        """
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Called when message is received from WebSocket
        """
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

    # ==========================================
    # Group message handlers
    # ==========================================

    async def order_status_update(self, event):
        """
        Called when order status is updated
        """
        await self.send(text_data=json.dumps({
            'type': 'order_status_update',
            'order_id': event['order_id'],
            'establishment_name': event['establishment_name'],
            'payment_status': event['payment_status'],
            'fulfillment_status': event['fulfillment_status']
        }))

    async def order_ready(self, event):
        """
        Called when order is ready for pickup
        """
        await self.send(text_data=json.dumps({
            'type': 'order_ready',
            'order_id': event['order_id'],
            'establishment_name': event['establishment_name'],
            'message': event['message']
        }))