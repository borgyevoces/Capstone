"""
ASGI config for Capstone project.
Updated for WebSocket support with Django Channels
"""

import os
from django.core.asgi import get_asgi_application

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Capstone.settings')

# Initialize Django ASGI application early
# This is important to ensure the AppRegistry is populated before importing code
django_asgi_app = get_asgi_application()

# NOW import channels and routing (after Django is initialized)
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from webapplication import routing

# Configure the ASGI application
application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests
    "http": django_asgi_app,

    # WebSocket handler
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                routing.websocket_urlpatterns
            )
        )
    ),
})