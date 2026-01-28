# webapplication/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/chat/(?P<customer_id>\d+)/(?P<establishment_id>\d+)/$',
        consumers.ChatConsumer.as_asgi()
    ),
]