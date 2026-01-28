from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<customer_id>\d+)/(?P<establishment_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/orders/(?P<establishment_id>\d+)/$', consumers.OrderConsumer.as_asgi()),
    re_path(r'ws/customer/orders/$', consumers.CustomerOrderConsumer.as_asgi()),
]