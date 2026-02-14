# webapp/middleware.py
"""
Custom middleware for KabsuEats application
Includes:
- Async error handling (CancelledError suppression)
- Authentication redirects
"""

import asyncio
import logging
from django.http import HttpResponse
from django.urls import reverse_lazy

logger = logging.getLogger(__name__)


class AsyncErrorHandlerMiddleware:
    """
    Middleware to gracefully handle CancelledError exceptions from client disconnections.
    These are normal when clients close connections before responses complete.
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
            # Client disconnected - this is normal, don't log as error
            logger.debug(
                f"Client disconnected: {request.method} {request.path}"
            )
            # Return empty response (won't be delivered anyway)
            return HttpResponse(status=499)  # 499 = Client Closed Request
        except Exception as e:
            # Log other exceptions normally
            logger.error(
                f"Error processing request {request.method} {request.path}: {e}",
                exc_info=True
            )
            raise


class AuthenticationMiddleware:
    """
    Custom authentication middleware for handling login redirects
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.login_url = str(reverse_lazy('user_login_register'))

    def __call__(self, request):
        """Process request through middleware"""
        # Your middleware logic here
        response = self.get_response(request)
        return response