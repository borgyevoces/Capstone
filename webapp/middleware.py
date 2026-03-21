# webapp/middleware.py
"""
Custom middleware for KabsuEats application.
Includes:
- DatabaseErrorMiddleware  — catches DB OperationalError on ALL views/pages
  so users never see the yellow Django debug screen when PostgreSQL is down.
- AsyncErrorHandlerMiddleware — gracefully handles CancelledError from
  client disconnections in async views.
- AuthenticationMiddleware — custom login-redirect helper.
"""

import asyncio
import logging
from django.db import OperationalError, DatabaseError
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.urls import reverse_lazy

logger = logging.getLogger(__name__)


# ============================================================
# 1.  DATABASE ERROR MIDDLEWARE
#     Must be listed FIRST in settings.MIDDLEWARE so it wraps
#     every other middleware and every view.
# ============================================================
class DatabaseErrorMiddleware:
    """
    Intercepts psycopg2 / SQLite OperationalError and DatabaseError on every
    request and returns a user-friendly HTML 503 page instead of the yellow
    Django debug error screen.

    Covers:
      - Sync views  (__call__)
      - process_exception hook (catches errors bubbled up by Django itself)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except (OperationalError, DatabaseError) as e:
            logger.error(
                f"[DatabaseErrorMiddleware] DB error on {request.path}: {e}"
            )
            return self._db_error_response(request)
        except Exception:
            raise  # Everything else bubbles up normally

    def process_exception(self, request, exception):
        """Catches DB exceptions that bubble up through Django's view layer."""
        if isinstance(exception, (OperationalError, DatabaseError)):
            logger.error(
                f"[DatabaseErrorMiddleware] DB exception on {request.path}: {exception}"
            )
            return self._db_error_response(request)
        return None  # Let Django handle everything else

    def _db_error_response(self, request):
        """
        - AJAX/fetch calls  → JSON 503 so JS blurs the current page in-place
        - Direct page visit → JSON 503 as well (browser stays on same URL,
          JS fetch interceptor will catch it on next poll and blur in-place)
        """
        import json

        logger.error(f"[DatabaseErrorMiddleware] DB unavailable: {request.path}")
        return HttpResponse(
            json.dumps({'error': 'database_unavailable', 'message': 'Our database is temporarily unavailable.'}),
            status=503,
            content_type='application/json'
        )


# ── _FALLBACK_HTML kept for compatibility ──
_FALLBACK_HTML = ""


# ============================================================
# 2.  ASYNC ERROR HANDLER MIDDLEWARE
#     Gracefully handles CancelledError from client disconnects.
#     Also wraps async views for DB error catching.
# ============================================================
class AsyncErrorHandlerMiddleware:
    """
    Middleware to gracefully handle CancelledError exceptions from client
    disconnections in async views. Also catches DB errors in async context.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """Synchronous request handling"""
        return self.get_response(request)

    async def __acall__(self, request):
        """Asynchronous request handling with error catching"""
        try:
            response = await self.get_response(request)
            return response
        except asyncio.CancelledError:
            logger.debug(
                f"Client disconnected: {request.method} {request.path}"
            )
            return HttpResponse(status=499)  # 499 = Client Closed Request
        except (OperationalError, DatabaseError) as e:
            logger.error(
                f"[AsyncErrorHandlerMiddleware] Async DB error on {request.path}: {e}"
            )
            return DatabaseErrorMiddleware(self.get_response)._db_error_response(request)
        except Exception as e:
            logger.error(
                f"Error processing request {request.method} {request.path}: {e}",
                exc_info=True
            )
            raise


# ============================================================
# 3.  AUTHENTICATION MIDDLEWARE
# ============================================================
class AuthenticationMiddleware:
    """
    Custom authentication middleware for handling login redirects.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.login_url = str(reverse_lazy('user_login_register'))

    def __call__(self, request):
        response = self.get_response(request)
        return response