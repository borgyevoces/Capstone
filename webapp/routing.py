from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Owner/Establishment WebSocket for real-time order updates
    re_path(r'ws/orders/(?P<establishment_id>\d+)/$', consumers.OrderConsumer.as_asgi()),

    # Customer WebSocket for order status updates
    re_path(r'ws/customer/orders/$', consumers.CustomerOrderConsumer.as_asgi()),
]