# webapplication/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/chat/(?P<customer_id>\d+)/(?P<establishment_id>\d+)/$',
        consumers.ChatConsumer.as_asgi()
    ),
    # ✅ NEW: Real-time inventory / stock updates per establishment
    # All clients on kabsueats.html subscribe to their viewed establishments'
    # channels, and receive instant quantity_update events when orders come in.
    re_path(
        r'ws/inventory/(?P<establishment_id>\d+)/$',
        consumers.InventoryConsumer.as_asgi()
    ),
    # ✅ NEW: Real-time order status push — owner side (per establishment)
    re_path(
        r'ws/order-status/establishment/(?P<scope_type>establishment)/(?P<scope_id>\d+)/$',
        consumers.OrderStatusConsumer.as_asgi()
    ),
    # ✅ NEW: Real-time order status push — customer side (per user)
    re_path(
        r'ws/order-status/user/(?P<scope_type>user)/(?P<scope_id>\d+)/$',
        consumers.OrderStatusConsumer.as_asgi()
    ),
]