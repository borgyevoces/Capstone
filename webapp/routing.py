# webapplication/routing.py
"""
WebSocket URL routing for the webapplication app
Handles real-time chat and order management
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Chat WebSocket - existing
    re_path(r'ws/chat/(?P<customer_id>\d+)/(?P<establishment_id>\d+)/$',
            consumers.ChatConsumer.as_asgi()),

    # Order Management WebSocket - NEW
    re_path(r'ws/orders/(?P<establishment_id>\d+)/$',
            consumers.OrderConsumer.as_asgi()),

    # Customer Order Updates WebSocket - NEW
    re_path(r'ws/customer/orders/$',
            consumers.CustomerOrderConsumer.as_asgi()),
]