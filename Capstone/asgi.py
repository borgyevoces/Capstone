# Capstone/asgi.py
import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Capstone.settings')

# ✅ Auto-migrate on startup (for Render free plan without Shell access)
django.setup()
try:
    from django.core.management import call_command
    call_command('migrate', verbosity=1)
    print("✅ Auto-migrate done!")
except Exception as e:
    print(f"⚠️ Migration error: {e}")

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

# Import routing after Django setup
from webapp.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})