# Capstone/asgi.py
"""
ASGI config for Capstone project.
Includes:
- Auto-migration on startup
- CancelledError handling for clean logs
- WebSocket support
"""

import os
import django
import asyncio
import logging
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Setup logging
logger = logging.getLogger(__name__)

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

# Base application with routing
base_application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})


# ============================================================================
# CancelledError Handler - Prevents log spam from client disconnections
# ============================================================================
class CancelledErrorHandler:
    """
    Wraps the ASGI application to catch and gracefully handle CancelledError.
    These errors occur when clients disconnect before responses complete -
    this is normal behavior and doesn't need to be logged as errors.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        try:
            await self.app(scope, receive, send)
        except asyncio.CancelledError:
            # Client disconnected - this is normal, just log at debug level
            logger.debug(
                f"Client disconnected: {scope.get('type', 'unknown')} "
                f"{scope.get('path', 'unknown')}"
            )
            # Don't re-raise - this prevents the error from appearing in logs
        except Exception as e:
            # Log other exceptions normally - these ARE real errors
            logger.error(
                f"Error in ASGI application: {e}",
                exc_info=True
            )
            raise


# Wrap the application to handle CancelledError gracefully
application = CancelledErrorHandler(base_application)