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
        Always return skeleton HTML for page visits, JSON only for explicit API/AJAX calls.
        Default is HTML — only skip to JSON if clearly an API/AJAX call.
        """
        import json

        # Only return JSON for explicit API/AJAX calls — everything else gets HTML
        is_explicit_api = (
            request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            or request.path.startswith('/api/')
        )

        if is_explicit_api:
            return HttpResponse(
                json.dumps({'error': 'database_unavailable'}),
                status=503,
                content_type='application/json'
            )

        # ALL page visits → skeleton HTML (browser, reload, direct URL, etc.)
        logger.error(f"[DatabaseErrorMiddleware] DB unavailable for page: {request.path}")
        return HttpResponse(_FALLBACK_HTML, status=503, content_type='text/html; charset=utf-8')


# ── Fallback HTML — fake KabsuEats skeleton (blurred) + overlay modal ──────────
_FALLBACK_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KabsuEats</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Poppins',Arial,sans-serif;background:#f3f4f6;min-height:100vh;overflow:hidden;}
    .fake-page{width:100%;height:100vh;background:#f3f4f6;filter:blur(3px);transform:scale(1.03);pointer-events:none;}
    .fake-nav{background:#fff;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.06);}
    .fake-brand{font-size:1.3rem;font-weight:800;color:#B71C1C;font-family:'Poppins',sans-serif;}
    .fake-avatar{width:36px;height:36px;border-radius:50%;background:#e5e7eb;}
    .fake-body{display:flex;height:calc(100vh - 57px);}
    .fake-sidebar{width:220px;background:#fff;border-right:1px solid #e5e7eb;padding:16px 12px;display:flex;flex-direction:column;gap:10px;}
    .fake-sb-item{height:42px;border-radius:8px;background:#f3f4f6;}
    .fake-sb-item.active{background:#B71C1C22;}
    .fake-main{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:14px;}
    .fake-search{height:50px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;}
    .fake-pills{display:flex;gap:8px;}
    .fake-pill{height:32px;width:90px;border-radius:20px;background:#fff;border:1px solid #e5e7eb;}
    .fake-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
    .fake-card{height:220px;border-radius:14px;background:#fff;border:1px solid #e5e7eb;}
    .fake-card-img{height:130px;border-radius:10px 10px 0 0;background:#e5e7eb;}
    .fake-card-line{height:12px;border-radius:6px;background:#f3f4f6;margin:10px 12px 6px;}
    .fake-card-line.short{width:60%;margin:0 12px;}
    #overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);
             backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
             display:flex;align-items:center;justify-content:center;z-index:999999;}
    .box{background:#fff;border-radius:18px;padding:40px 32px;max-width:380px;
         width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.25);
         animation:pop .3s cubic-bezier(.34,1.56,.64,1);}
    @keyframes pop{from{transform:scale(.88) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
    .db-icon{font-size:2.2rem;color:#B71C1C;margin-bottom:12px;}
    h3{font-size:1.15rem;font-weight:800;color:#111;margin:0 0 8px;font-family:'Poppins',sans-serif;}
    p{color:#6B7280;font-size:.88rem;line-height:1.55;margin:0 0 20px;font-family:'Poppins',sans-serif;}
    .btn{background:linear-gradient(135deg,#B71C1C,#7f1111);color:#fff;border:none;
         padding:11px 28px;border-radius:50px;font-weight:700;font-size:.92rem;
         cursor:pointer;transition:transform .2s;font-family:'Poppins',Arial,sans-serif;}
    .btn:hover{transform:scale(1.04);}
  </style>
</head>
<body>
  <div class="fake-page">
    <div class="fake-nav">
      <div class="fake-brand">KabsuEats</div>
      <div class="fake-avatar"></div>
    </div>
    <div class="fake-body">
      <div class="fake-sidebar">
        <div class="fake-sb-item active"></div>
        <div class="fake-sb-item"></div>
        <div class="fake-sb-item"></div>
        <div class="fake-sb-item"></div>
      </div>
      <div class="fake-main">
        <div class="fake-search"></div>
        <div class="fake-pills">
          <div class="fake-pill"></div><div class="fake-pill"></div><div class="fake-pill"></div>
        </div>
        <div class="fake-cards">
          <div class="fake-card"><div class="fake-card-img"></div><div class="fake-card-line"></div><div class="fake-card-line short"></div></div>
          <div class="fake-card"><div class="fake-card-img"></div><div class="fake-card-line"></div><div class="fake-card-line short"></div></div>
          <div class="fake-card"><div class="fake-card-img"></div><div class="fake-card-line"></div><div class="fake-card-line short"></div></div>
          <div class="fake-card"><div class="fake-card-img"></div><div class="fake-card-line"></div><div class="fake-card-line short"></div></div>
        </div>
      </div>
    </div>
  </div>
  <div id="overlay">
    <div class="box">
      <div class="db-icon"><i class="fas fa-database"></i></div>
      <h3>Database Unavailable</h3>
      <p>Our database is temporarily unreachable.<br>Please try again in a moment.</p>
      <button class="btn" id="retryBtn" onclick="tryAgain()">
        <i class="fas fa-redo"></i> Try Again
      </button>
  <script>
    function tryAgain() {
      var btn = document.getElementById('retryBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
      // Ping a lightweight endpoint first
      fetch('/api/establishments/status/', { method: 'GET', credentials: 'same-origin' })
        .then(function(r) {
          if (r.ok) {
            // DB is back — reload to actual page
            window.location.reload();
          } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
          }
        })
        .catch(function() {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
        });
    }
    // Auto-retry every 15s silently
    setInterval(function() {
      fetch('/api/establishments/status/', { method: 'GET', credentials: 'same-origin' })
        .then(function(r) { if (r.ok) window.location.reload(); })
        .catch(function() {});
    }, 15000);
  </script>
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