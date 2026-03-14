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
        - API/fetch calls → JSON 503 (JS fetch interceptor shows modal)
        - Owner dashboard  → food_establishment_dashboard.html with db_error=True
        - All other pages  → kabsueats.html with db_error=True
        - Fallback         → inline HTML if template fails
        """
        import json

        # ── API / fetch calls → JSON 503
        is_ajax = (
            request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            or request.path.startswith('/api/')
            or request.headers.get('Accept', '').startswith('application/json')
        )
        if is_ajax:
            return HttpResponse(
                json.dumps({'error': 'database_unavailable', 'message': 'Our database is temporarily unavailable.'}),
                status=503,
                content_type='application/json'
            )

        # ── Pick the right template based on URL
        path = request.path
        if path.startswith('/food_establishment/dashboard') or path.startswith('/owner/'):
            template = 'webapplication/food_establishment_dashboard.html'
            context  = {'db_error': True, 'error_message': 'Our database is temporarily unavailable. Please try again in a few minutes.'}
        else:
            template = 'webapplication/kabsueats.html'
            context  = {'db_error': True, 'error_message': 'Our database is temporarily unavailable. Please try again in a few minutes.', 'food_establishments': [], 'all_categories': []}

        try:
            html = render_to_string(template, context, request=request)
            return HttpResponse(html, status=503)
        except Exception as tmpl_err:
            logger.error(f"[DatabaseErrorMiddleware] Template render failed: {tmpl_err}")
            return HttpResponse(_FALLBACK_HTML, status=503, content_type='text/html; charset=utf-8')


# ── Fallback HTML — modal overlay style, no template dependencies ─────────────
_FALLBACK_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KabsuEats</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Poppins',Arial,sans-serif;background:#f3f4f6;min-height:100vh;}
    #overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);
             backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
             display:flex;align-items:center;justify-content:center;z-index:999999;}
    .box{background:#fff;border-radius:18px;padding:40px 32px;max-width:380px;
         width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.25);
         animation:pop .25s cubic-bezier(.34,1.56,.64,1);}
    @keyframes pop{from{transform:scale(.88) translateY(16px);opacity:0}
                   to{transform:scale(1) translateY(0);opacity:1}}
    .db-icon{font-size:2.2rem;color:#B71C1C;margin-bottom:12px;}
    h3{font-size:1.15rem;font-weight:800;color:#111;margin:0 0 8px;}
    p{color:#6B7280;font-size:.88rem;line-height:1.55;margin:0 0 20px;}
    .btn{background:linear-gradient(135deg,#B71C1C,#7f1111);color:#fff;border:none;
         padding:11px 28px;border-radius:50px;font-weight:700;font-size:.92rem;
         cursor:pointer;transition:transform .2s;}
    .btn:hover{transform:scale(1.04);}
  </style>
</head>
<body>
  <div id="overlay">
    <div class="box">
      <div class="db-icon"><i class="fas fa-database"></i></div>
      <h3>Database Unavailable</h3>
      <p>Our database is temporarily unreachable.<br>Please try again in a moment.</p>
      <button class="btn" onclick="location.reload()">
        <i class="fas fa-redo"></i> Try Again
      </button>
    </div>
  </div>
</body>
</html>"""


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