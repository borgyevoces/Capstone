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
        Renders db_error.html (place at webapp/templates/webapplication/db_error.html).
        Falls back to inline HTML if template rendering itself fails.
        """
        try:
            html = render_to_string(
                'webapplication/db_error.html',
                {
                    'error_message': (
                        'Our database is temporarily unavailable. '
                        'Please try again in a few minutes.'
                    ),
                },
                request=request,
            )
            return HttpResponse(html, status=503)
        except Exception as tmpl_err:
            logger.error(
                f"[DatabaseErrorMiddleware] Template render failed: {tmpl_err}"
            )
            return HttpResponse(_FALLBACK_HTML, status=503,
                                content_type='text/html; charset=utf-8')


# ── Fallback HTML (zero template dependencies) ───────────────────────────────
_FALLBACK_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Temporarily Unavailable – KabsuEats</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Poppins',sans-serif;background:#f9fafb;min-height:100vh;
         display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:20px;padding:48px 36px;max-width:420px;
          width:100%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.12)}
    .icon-wrap{width:72px;height:72px;background:#fee2e2;border-radius:50%;
               display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
    .icon-wrap i{font-size:2rem;color:#dc2626}
    .brand{font-size:1.3rem;font-weight:800;color:#dc2626;margin-bottom:28px}
    h1{font-size:1.4rem;font-weight:800;color:#111;margin-bottom:12px}
    p{color:#6b7280;font-size:.9rem;line-height:1.6;margin-bottom:28px}
    .btn{display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);
         color:#fff;font-weight:700;font-size:.95rem;padding:12px 28px;
         border-radius:50px;text-decoration:none;border:none;cursor:pointer}
    #cd{font-weight:700;color:#dc2626}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">KabsuEats</div>
    <div class="icon-wrap"><i class="fas fa-database"></i></div>
    <h1>Service Temporarily Unavailable</h1>
    <p>Our database is temporarily unreachable. Auto-retrying in
       <span id="cd">30</span>s. You can also try manually.</p>
    <a href="/" class="btn"><i class="fas fa-redo"></i>&nbsp; Try Again</a>
  </div>
  <script>
    var s=30,el=document.getElementById('cd');
    var t=setInterval(function(){s--;if(el)el.textContent=s;
      if(s<=0){clearInterval(t);location.reload();}},1000);
  </script>
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