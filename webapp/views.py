# ==========================================
# Standard Library Imports
# ==========================================
import os
import re
import json
import time
import uuid
import base64
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Prefetch
from .models import Order, OrderItem, FoodEstablishment, MenuItem, Cart, CartItem
import string
from django.db.models import Count, Sum, Q, F
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.http import require_http_methods
import random
import hashlib
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count, Avg, F
from datetime import datetime, timedelta
from decimal import Decimal
import csv
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import xlsxwriter
import requests
import logging
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.db import transaction
from decimal import Decimal
from django.urls import reverse
import base64
import requests
from math import radians, sin, cos, sqrt, atan2
from decimal import Decimal
from urllib.parse import urlencode
from .models import MenuItem, Order, OrderItem, FoodEstablishment
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
# ==========================================
# Django Core Imports
# ==========================================
from django.conf import settings
from django.shortcuts import render, redirect, get_object_or_404
from django.http import (
    HttpResponse, JsonResponse, HttpResponseForbidden,
    HttpResponseBadRequest, Http404
)
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.views.decorators.http import require_POST, require_http_methods
from django.db import transaction
from django.db.models import Avg, Count, Sum, Q
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.views import PasswordResetConfirmView
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail as django_send_mail
from django.template.loader import render_to_string
from django.core.files.base import ContentFile

# ==========================================
# Third-Party Imports
# ==========================================
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# ==========================================
# Local Application Imports
# ==========================================
from .models import (
    FoodEstablishment, MenuItem, Review, Order, OrderItem,
    OTP, Amenity, Category, InvitationCode, UserProfile, OrderNotification
)
from .forms import (
    UserProfileUpdateForm, AccessCodeForm,
    FoodEstablishmentForm, FoodEstablishmentUpdateForm,
    MenuItemForm, InvitationCodeForm, ReviewForm
)
import base64
import json
import requests

from django.core.cache import cache
from datetime import datetime, time as dt_time


# ✅ ADD THIS HELPER FUNCTION at the top of views.py (after imports)
def get_current_status(opening_time, closing_time):
    """
    Calculate real-time open/closed status using Philippine time (Asia/Manila).
    CRITICAL: Server runs in UTC (Render.com). Opening/closing times stored in DB
    are Philippine local time — must use PH time or status is 8 hours off.
    """
    if not opening_time or not closing_time:
        return "Closed"

    try:
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo('Asia/Manila')).time()
    except Exception:
        try:
            import pytz
            now = datetime.now(pytz.timezone('Asia/Manila')).time()
        except Exception:
            now = datetime.now().time()

    if opening_time <= closing_time:
        return "Open" if opening_time <= now <= closing_time else "Closed"
    else:
        return "Open" if now >= opening_time or now <= closing_time else "Closed"


def invalidate_establishment_cache(establishment_id):
    """
    Bump a per-establishment 'last_modified' timestamp in Django's cache.
    Called after any dashboard/profile mutation so client-side JS detects
    the change and re-fetches immediately instead of waiting 30 seconds.
    """
    import time as _time
    cache.set(f'est_{establishment_id}_last_modified', _time.time(), timeout=86400)


def normalize_payment_method(raw):
    """
    Normalize stored gcash_payment_method to one of two display values:
    - 'cash'  → Cash on Pickup
    - 'gcash' → GCash / Online Payment (all non-cash methods)
    This matches the two payment options offered on the checkout page.
    """
    if not raw:
        return 'cash'
    r = raw.strip().lower()
    if r == 'cash':
        return 'cash'
    # All online methods (gcash, paymaya, card, etc.) → gcash
    return 'gcash'


def about_page(request):
    return render(request, 'webapplication/about.html')


# ===================================================================================================================
# ===================================================CLIENT=========================================================
# ===================================================================================================================
def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points on the Earth using the Haversine formula.
    """
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def user_login_register(request):
    User = get_user_model()
    show_done_modal = 'reset_done' in request.GET or 'reset_complete' in request.GET
    active_tab = 'login'

    if request.method == "POST":
        if "login_submit" in request.POST:
            username = request.POST.get("username")
            password = request.POST.get("password")

            try:
                user_obj = User.objects.get(email=username)
                username_for_auth = user_obj.username
            except User.DoesNotExist:
                username_for_auth = username

            user = authenticate(request, username=username_for_auth, password=password)
            if user is not None:
                login(request, user)
                subject = "Login Successful"
                message = f"Hello {user.username},\n\nThis is to confirm that your account has been successfully logged in."
                send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=True)

                messages.success(request, "Successfully logged in!")
                return redirect("kabsueats_home")
            else:
                messages.error(request, "Invalid Gmail or Password.")
                active_tab = 'login'

        elif "register_submit" in request.POST:
            username = request.POST.get("username")
            password = request.POST.get("password")
            confirm_password = request.POST.get("confirm_password")

            if password != confirm_password:
                messages.error(request, "Passwords do not match.")
                active_tab = 'register'

            elif len(password) < 8 or not re.search(r'[A-Z]', password) or not re.search(r'\d', password):
                messages.error(request,
                               "Password must be at least 8 characters long and include at least one uppercase letter and one number.")
                active_tab = 'register'

            elif User.objects.filter(email=username).exists():
                messages.error(request, "This Gmail is already registered.")
                active_tab = 'register'

            else:
                # Gumawa ng bagong user account
                user = User.objects.create_user(username=username, email=username, password=password)

                # Send registration confirmation email
                subject = "Account Registration Confirmed"
                message = f"Hello {user.username},\n\nWelcome to our service! Your account has been successfully registered."
                send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=True)

                # PAGBABAGO: Hindi na automatic magla-log in. Sa halip, ire-redirect ang user sa login page.
                messages.success(request, "Account created successfully! You can now log in.")
                return redirect("user_login_register")

        # New code for guest login
        elif "guest_login" in request.POST:
            messages.info(request, "Logged in as Guest.")
            return redirect("kabsueats_home")

    return render(request, "webapplication/login.html", {'show_done_modal': show_done_modal, 'active_tab': active_tab})


@login_required
def user_logout(request):
    """
    Logs out the currently logged-in user and redirects them to the kabsueats landing page.
    """
    logout(request)
    messages.success(request, "Successfully logged out.")
    return redirect(reverse_lazy('kabsueats_home'))


def google_login(request):
    params = {
        'response_type': 'code',
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'scope': 'openid email profile',
        'access_type': 'offline'
    }
    google_auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
    return redirect(google_auth_url)


def google_callback(request):
    User = get_user_model()
    code = request.GET.get('code')
    if not code:
        messages.error(request, 'Google authentication failed. Please try again.')
        return redirect('user_login_register')

    token_url = 'https://oauth2.googleapis.com/token'
    token_params = {
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'grant_type': 'authorization_code'
    }
    try:
        token_response = requests.post(token_url, data=token_params)
        try:
            token_response.raise_for_status()
        except requests.exceptions.HTTPError:
            logging.getLogger('django').error(
                f"Google token endpoint error: status={token_response.status_code} body={token_response.text}"
            )
            if getattr(settings, 'DEBUG', False):
                messages.error(request,
                               f'Google token exchange failed (status {token_response.status_code}): {token_response.text}')
            else:
                messages.error(request, f'Google token exchange failed (status {token_response.status_code}).')
            return redirect('user_login_register')

        try:
            token_data = token_response.json()
        except json.JSONDecodeError:
            logging.getLogger('django').error(
                f"Google token endpoint returned non-JSON: {token_response.text}"
            )
            messages.error(request, 'Failed to decode Google token response.')
            return redirect('user_login_register')

        access_token = token_data.get('access_token')

        if not access_token:
            logging.getLogger('django').error(f"No access_token in token response: {token_data}")
            messages.error(request, 'Failed to get Google access token.')
            return redirect('user_login_register')

        user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_info_response = requests.get(user_info_url, headers=headers)
        try:
            user_info_response.raise_for_status()
        except requests.exceptions.HTTPError:
            logging.getLogger('django').error(
                f"Google userinfo error: status={user_info_response.status_code} body={user_info_response.text}"
            )
            # Surface a friendly message but include body when DEBUG so we can see the 403 reason
            if getattr(settings, 'DEBUG', False):
                messages.error(request,
                               f'Google userinfo request failed (status {user_info_response.status_code}): {user_info_response.text}')
            else:
                messages.error(request, f'Google userinfo request failed (status {user_info_response.status_code}).')
            return redirect('user_login_register')

        try:
            user_info = user_info_response.json()
        except json.JSONDecodeError:
            logging.getLogger('django').error(f"Google userinfo returned non-JSON: {user_info_response.text}")
            messages.error(request, 'Failed to decode Google user info response.')
            return redirect('user_login_register')
    except requests.exceptions.RequestException as e:
        logging.getLogger('django').exception('Exception during Google OAuth flow')
        messages.error(request, f'An error occurred during Google authentication: {e}')
        return redirect('user_login_register')

    email = user_info.get('email')

    try:
        user = User.objects.filter(email=email).first()
        if user:
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)

            subject = "Login Successful via Google"
            message = f"Hello {user.username},\n\nThis is to confirm that your account was logged in using your Google account."
            send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=True)

            messages.success(request, f'🎉 Welcome back, {user.username}!')
            return redirect('kabsueats_home')
        else:
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create_user(username=username, email=email)
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)

            # ✅ Ensure UserProfile exists for Google-registered users
            # (signal may not fire in all environments)
            try:
                from .models import UserProfile
                UserProfile.objects.get_or_create(user=user)
            except Exception:
                pass

            messages.success(request, f'✨ Welcome to KabsuEats, {user.username}! Your account has been created.')
            return redirect('kabsueats_home')
    except Exception as e:
        messages.error(request, f'An error occurred while retrieving user data: {e}')
        return redirect('user_login_register')


def _build_client_reset_email(username, reset_url, email):
    """Client password reset email — clean gold/white, matches client dashboard."""
    subject = "Password Reset — KabsuEats Student Account"
    text = f"""Hello {username},

You requested a password reset for your KabsuEats Student account.

Reset your password here: {reset_url}

This link expires in 24 hours.
If you did not request this, ignore this email.

— The KabsuEats Team"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header: gold -->
        <tr><td style="background:#e59b20;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#fff;letter-spacing:0.5px;">KabsuEats</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Campus Food Reservation</div>
        </td></tr>

        <!-- Account badge row -->
        <tr><td style="background:#fff8ee;padding:12px 32px;border-bottom:1px solid #fde8b0;">
          <span style="font-size:13px;color:#b87400;font-weight:600;">&#127891; Student / School Personnel Account</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;font-weight:600;">Password Reset Request</p>
          <p style="margin:0 0 20px;font-size:13px;color:#777;">We received a request to reset your password.</p>

          <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.7;">
            Hello <strong>{username}</strong>, click the button below to set a new password.
            This link is valid for <strong>24 hours</strong>.
          </p>

          <!-- Button -->
          <div style="text-align:center;margin:24px 0;">
            <a href="{reset_url}" style="display:inline-block;background:#e59b20;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 40px;border-radius:8px;">
              Reset My Password
            </a>
          </div>

          <p style="font-size:12px;color:#aaa;margin:0 0 6px;">Or copy this link into your browser:</p>
          <p style="font-size:11px;color:#e59b20;word-break:break-all;background:#fff8ee;border:1px solid #fde8b0;border-radius:6px;padding:8px 12px;margin:0 0 20px;">{reset_url}</p>

          <p style="font-size:12px;color:#999;margin:0;">If you did not request this, you can safely ignore this email.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:14px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#bbb;">Sent to {email} &bull; KabsuEats &bull; CvSU Bacoor Campus</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html


def _build_owner_reset_email(username, reset_url, email):
    """Owner password reset email — clean dark/white, matches owner dashboard."""
    subject = "Password Reset — KabsuEats Business Owner Account"
    text = f"""Hello {username},

You requested a password reset for your KabsuEats Business Owner account.

Reset your password here: {reset_url}

This link expires in 24 hours.
If you did not request this, ignore this email.

— The KabsuEats Team"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header: dark navy -->
        <tr><td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:bold;color:#e59b20;letter-spacing:0.5px;">KabsuEats</div>
          <div style="font-size:11px;color:rgba(229,155,32,0.7);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Business Owner Portal</div>
        </td></tr>

        <!-- Account badge row -->
        <tr><td style="background:#f0f0f0;padding:12px 32px;border-bottom:1px solid #ddd;">
          <span style="font-size:13px;color:#1a1a2e;font-weight:600;">&#127978; Business Owner Account</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;font-weight:600;">Password Reset Request</p>
          <p style="margin:0 0 20px;font-size:13px;color:#777;">We received a request to reset your business owner password.</p>

          <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.7;">
            Hello <strong>{username}</strong>, click the button below to set a new password.
            This link is valid for <strong>24 hours</strong>.
          </p>

          <!-- Button -->
          <div style="text-align:center;margin:24px 0;">
            <a href="{reset_url}" style="display:inline-block;background:#1a1a2e;color:#e59b20;text-decoration:none;font-size:15px;font-weight:700;padding:13px 40px;border-radius:8px;border:2px solid #e59b20;">
              Reset My Password
            </a>
          </div>

          <p style="font-size:12px;color:#aaa;margin:0 0 6px;">Or copy this link into your browser:</p>
          <p style="font-size:11px;color:#1a1a2e;word-break:break-all;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:8px 12px;margin:0 0 20px;">{reset_url}</p>

          <p style="font-size:12px;color:#999;margin:0;">If you did not request this, you can safely ignore this email.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:14px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#bbb;">Sent to {email} &bull; KabsuEats &bull; CvSU Bacoor Campus</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html


class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    """
    Preserves ?at= (account_type) param across the confirm → complete redirect.
    When user lands on confirm page, saves account_type to session.
    On form submit, success_url carries ?at= to the complete view.
    """
    def dispatch(self, request, *args, **kwargs):
        at = request.GET.get('at', '').strip().lower()
        if at in ('owner', 'client'):
            request.session['reset_account_type'] = at
        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        at = self.request.session.get('reset_account_type', 'client')
        return reverse('password_reset_complete') + f'?at={at}'


def forgot_password(request):
    """
    Forgot password — sends completely different email designs for Client vs Owner.
    Fires in background thread for instant response.
    """
    if request.method != 'POST':
        return redirect('user_login_register')

    email = request.POST.get('email', '').strip()
    User = get_user_model()

    try:
        user = User.objects.get(email=email)

        # Generate reset token
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # ✅ Fix for Render reverse proxy: X-Forwarded-Proto gives real protocol
        forwarded_proto = request.META.get('HTTP_X_FORWARDED_PROTO', '')
        protocol = forwarded_proto if forwarded_proto in ('http', 'https') else (
            'https' if request.is_secure() else 'http'
        )
        domain = request.get_host()

        # ✅ Use account_type from POST — reliable, no DB ambiguity.
        account_type = request.POST.get('account_type', 'client').strip().lower()
        is_owner = (account_type == 'owner')

        # ✅ Embed ?at= in reset URL so it survives new tabs / fresh sessions
        confirm_path = reverse('password_reset_confirm', kwargs={'uidb64': uid, 'token': token})
        reset_url = f"{protocol}://{domain}{confirm_path}?at={account_type}"

        if is_owner:
            subject, text_message, html_message = _build_owner_reset_email(user.username, reset_url, email)
        else:
            subject, text_message, html_message = _build_client_reset_email(user.username, reset_url, email)

        from_email = getattr(settings, 'SENDER_EMAIL', None) or settings.DEFAULT_FROM_EMAIL

        # ✅ Fire email in background — return instantly, never block the request
        import threading
        def _send_reset_email():
            try:
                send_mail(
                    subject=subject,
                    message=text_message,
                    from_email=from_email,
                    recipient_list=[email],
                    fail_silently=True,
                    html_message=html_message
                )
                print(f"✅ Password reset email sent to {email} ({'owner' if is_owner else 'client'})")
            except Exception as e:
                print(f"❌ Background reset email error: {e}")

        threading.Thread(target=_send_reset_email, daemon=True).start()

        # ✅ Save account_type to session so password_reset_complete knows where to redirect
        request.session['reset_account_type'] = account_type

    except User.DoesNotExist:
        pass  # Security: never reveal whether an email is registered

    # Always redirect — don't reveal if email was found or not
    messages.success(request, "If an account with that email exists, we've sent password reset instructions.")
    return redirect('password_reset_done_redirect')


def password_reset_done_redirect(request):
    """Redirect to login with success message"""
    messages.info(request,
                  "We've emailed you instructions for setting your password. Please check your inbox and spam folder.")
    return redirect(reverse('user_login_register') + '?reset_done=true')


def password_reset_complete_redirect(request):
    """
    Reads account_type from ?at= URL param first (survives new tabs/incognito),
    falls back to session. Owners go to owner login, clients go to client login.
    """
    account_type = request.GET.get('at', '').strip().lower()
    if account_type not in ('owner', 'client'):
        account_type = request.session.pop('reset_account_type', 'client')
    is_owner = (account_type == 'owner')

    if is_owner:
        login_url = reverse('owner_login')
        login_label = 'Go to Owner Login'
        portal_label = 'Business Owner Portal'
    else:
        login_url = reverse('user_login_register')
        login_label = 'Go to Login'
        portal_label = 'Student / School Personnel'

    return render(request, 'webapplication/password_reset_complete.html', {
        'login_url': login_url,
        'login_label': login_label,
        'portal_label': portal_label,
        'is_owner': is_owner,
    })



def _ensure_user_profile(user):
    """
    Ensure UserProfile exists for a user — safe to call on every request.
    Google OAuth users may not have a profile created via signal.
    """
    if user and user.is_authenticated:
        try:
            UserProfile.objects.get_or_create(user=user)
        except Exception:
            pass


def kabsueats_main_view(request):
    """
    Central view for displaying all food establishments with various filters.
    ✅ FIXED: Real-time status calculation on every page load
    ✅ FIXED: Only shows is_active=True establishments
    """
    _ensure_user_profile(request.user)
    from datetime import datetime

    category_name = request.GET.get('category', '')
    search_query = request.GET.get('q', '')
    status_filter = request.GET.get('status', '')
    alpha_filter = request.GET.get('alpha', '')

    # Fetch all categories for the dropdown filter
    all_categories = Category.objects.all().order_by('name')

    # ✅ CHANGED: was FoodEstablishment.objects.all()
    # Now excludes deactivated establishments from customer view
    food_establishments_queryset = FoodEstablishment.objects.filter(is_active=True)

    current_category = None

    # Category filter
    if category_name:
        try:
            current_category = Category.objects.get(name__iexact=category_name)
            food_establishments_queryset = food_establishments_queryset.filter(category=current_category)
        except Category.DoesNotExist:
            current_category = None
            messages.error(request, f"Category '{category_name}' not found.")

    # Search filter
    if search_query:
        food_establishments_queryset = food_establishments_queryset.filter(
            Q(name__icontains=search_query) |
            Q(amenities__name__icontains=search_query)
        ).distinct()

    # Alphabetical filter
    if alpha_filter:
        food_establishments_queryset = food_establishments_queryset.filter(name__istartswith=alpha_filter)

    # ✅ Calculate real-time status and other data
    ref_lat = 14.4607
    ref_lon = 120.9822

    # CRITICAL FIX: Use Philippine time (UTC+8) — server runs in UTC on Render.com
    try:
        from zoneinfo import ZoneInfo
        current_time = datetime.now(ZoneInfo('Asia/Manila')).time()
    except Exception:
        try:
            import pytz
            current_time = datetime.now(pytz.timezone('Asia/Manila')).time()
        except Exception:
            current_time = datetime.now().time()

    food_establishments_with_data = []
    try:
        food_establishments_queryset = list(food_establishments_queryset)
    except Exception as db_err:
        import logging
        logging.getLogger(__name__).error(f"DB connection failed in kabsueats_main_view: {db_err}")
        return render(request, 'webapplication/kabsueats.html', {
            'food_establishments': [],
            'all_categories': [],
            'db_error': True,
            'error_message': 'Our database is temporarily unavailable. Please try again in a few minutes.',
        })
    for est in food_establishments_queryset:
        # Calculate distance
        if est.latitude is not None and est.longitude is not None:
            distance_km = haversine(ref_lat, ref_lon, est.latitude, est.longitude)
            est.distance_meters = distance_km * 1000
            est.distance = distance_km
        else:
            est.distance_meters = 0
            est.distance = 0

        # Calculate ratings
        rating_data = est.reviews.aggregate(Avg('rating'), Count('id'))
        est.average_rating = rating_data['rating__avg'] if rating_data['rating__avg'] is not None else 0
        est.review_count = rating_data['id__count']

        # ✅ CRITICAL FIX: Calculate fresh status on every request
        if est.opening_time and est.closing_time:
            if est.opening_time <= est.closing_time:
                if est.opening_time <= current_time <= est.closing_time:
                    est.calculated_status = "Open"
                else:
                    est.calculated_status = "Closed"
            else:
                if current_time >= est.opening_time or current_time <= est.closing_time:
                    est.calculated_status = "Open"
                else:
                    est.calculated_status = "Closed"
        else:
            est.calculated_status = "Closed"

        food_establishments_with_data.append(est)

    # ✅ Apply status filter using calculated_status
    if status_filter:
        food_establishments_with_data = [
            est for est in food_establishments_with_data
            if est.calculated_status == status_filter
        ]

    # Sort by distance
    food_establishments_sorted = sorted(food_establishments_with_data, key=lambda x: x.distance)

    # Calculate cart count for authenticated users
    cart_count = 0
    if request.user.is_authenticated:
        # Include both PENDING (cart) and 'request' (submitted, awaiting owner) orders
        cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

    context = {
        'food_establishments': food_establishments_sorted,
        'category': {'name': current_category.name} if current_category else None,
        'all_categories': all_categories,
        'status_filter': status_filter,
        'alpha_filter': alpha_filter,
        'q': search_query,
        'cart_count': cart_count,
    }
    return render(request, 'webapplication/kabsueats.html', context)


def kabsueats_map_view(request):
    """
    Standalone map page — shows all food establishments on a Leaflet map.
    Uses the same establishment data as kabsueats_main_view.
    """
    from datetime import datetime

    all_categories = Category.objects.all().order_by('name')
    food_establishments_queryset = FoodEstablishment.objects.filter(is_active=True)

    ref_lat = 14.4607
    ref_lon = 120.9822

    try:
        from zoneinfo import ZoneInfo
        current_time = datetime.now(ZoneInfo('Asia/Manila')).time()
    except Exception:
        try:
            import pytz
            current_time = datetime.now(pytz.timezone('Asia/Manila')).time()
        except Exception:
            current_time = datetime.now().time()

    food_establishments_with_data = []
    try:
        food_establishments_queryset = list(food_establishments_queryset)
    except Exception as db_err:
        import logging
        logging.getLogger(__name__).error(f"DB connection failed in kabsueats_map_view: {db_err}")
        return render(request, 'webapplication/map.html', {
            'food_establishments': [],
            'all_categories': [],
            'db_error': True,
        })

    for est in food_establishments_queryset:
        if est.latitude is not None and est.longitude is not None:
            distance_km = haversine(ref_lat, ref_lon, est.latitude, est.longitude)
            est.distance_meters = distance_km * 1000
            est.distance = distance_km
        else:
            est.distance_meters = 0
            est.distance = 0

        rating_data = est.reviews.aggregate(Avg('rating'), Count('id'))
        est.average_rating = rating_data['rating__avg'] if rating_data['rating__avg'] is not None else 0
        est.review_count = rating_data['id__count']

        if est.opening_time and est.closing_time:
            if est.opening_time <= est.closing_time:
                est.calculated_status = "Open" if est.opening_time <= current_time <= est.closing_time else "Closed"
            else:
                est.calculated_status = "Open" if current_time >= est.opening_time or current_time <= est.closing_time else "Closed"
        else:
            est.calculated_status = "Closed"

        food_establishments_with_data.append(est)

    food_establishments_sorted = sorted(food_establishments_with_data, key=lambda x: x.distance)

    cart_count = 0
    if request.user.is_authenticated:
        cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

    context = {
        'food_establishments': food_establishments_sorted,
        'all_categories': all_categories,
        'cart_count': cart_count,
        'CVSU_LATITUDE': 14.412768,
        'CVSU_LONGITUDE': 120.981348,
    }
    return render(request, 'webapplication/map.html', context)
    query = request.GET.get('q', '')
    if query:
        food_establishments = FoodEstablishment.objects.filter(name__icontains=query)
    else:
        food_establishments = FoodEstablishment.objects.all()

    return render(request, 'webapplication/kabsueats.html', {
        'food_establishments': food_establishments,
        'q': query
    })


@login_required
def update_profile(request):
    """
    ✅ SIMPLIFIED: Update profile picture only
    Removed phone_number, first_name, last_name fields completely
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method'}, status=400)

    try:
        # Get or create UserProfile (with error handling)
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        # Handle profile picture upload
        if 'profile_picture' in request.FILES:
            profile.profile_image = request.FILES['profile_picture']
            profile.save()

            # Get profile picture URL
            profile_pic_url = profile.profile_image.url if profile.profile_image else '/static/images/default-avatar.png'

            return JsonResponse({
                'success': True,
                'message': 'Profile picture updated successfully!',
                'profile_picture_url': profile_pic_url
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': 'No profile picture provided'
            }, status=400)

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Profile update error: {str(e)}")

        return JsonResponse({
            'success': False,
            'errors': f'Error updating profile: {str(e)}'
        }, status=500)


def category_establishments_view(request, category_name):
    try:
        category = Category.objects.get(name__iexact=category_name)
    except Category.DoesNotExist:
        raise Http404("Category does not exist")

    food_establishments = category.foodestablishment_set.all().annotate(
        review_count=Count('review'),
        average_rating=Avg('review__rating')
    ).order_by('?')  # Default sort

    status_filter = request.GET.get('status', '')
    alpha_filter = request.GET.get('alpha', '')
    distance_sort = request.GET.get('distance', '')
    rating_sort = request.GET.get('rating', '')
    query = request.GET.get('q', '')

    if status_filter:
        food_establishments = food_establishments.filter(status=status_filter)

    if alpha_filter:
        food_establishments = food_establishments.filter(name__startswith=alpha_filter)

    if query:
        food_establishments = food_establishments.filter(name__icontains=query)

    if distance_sort == 'nearest':
        food_establishments = food_establishments.order_by('distance')
    elif distance_sort == 'farthest':
        food_establishments = food_establishments.order_by('-distance')

    if rating_sort == 'highest':
        food_establishments = food_establishments.order_by('-average_rating')
    elif rating_sort == 'lowest':
        food_establishments = food_establishments.order_by('average_rating')
    context = {
        'category': category,
        'food_establishments': food_establishments,
        'status_filter': status_filter,
        'alpha_filter': alpha_filter,
        'q': query,
    }
    return render(request, 'home.html', context)


@require_POST
@login_required
@require_http_methods(['POST'])
def submit_review(request, establishment_id):
    establishment = get_object_or_404(FoodEstablishment, pk=establishment_id)

    if not request.user.is_authenticated:
        messages.error(request, "Please log in to submit a review.")
        return redirect('food_establishment_details', establishment_id=establishment_id)

    existing_review = Review.objects.filter(user=request.user, establishment=establishment).first()
    if existing_review:
        messages.error(request,
                       "You have already submitted a review for this establishment. You can edit your existing review instead.")
        return redirect('food_establishment_details', establishment_id=establishment_id)

    if request.method == 'POST':
        form = ReviewForm(request.POST, request.FILES)
        if form.is_valid():
            review = form.save(commit=False)
            review.user = request.user
            review.establishment = establishment
            review.save()
            cache.delete(f'establishment_{establishment_id}_reviews')

            messages.success(request, "Your review has been submitted successfully!")
            return redirect('food_establishment_details', establishment_id=establishment_id)
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"Error in {field}: {error}")
            return redirect('food_establishment_details', establishment_id=establishment_id)

    return redirect('food_establishment_details', establishment_id=establishment_id)


@login_required
def edit_review(request, establishment_id, review_id):
    """
    Endpoint for editing a user's review for a given establishment.
    """
    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
    review = get_object_or_404(Review, id=review_id, establishment=establishment)

    if review.user != request.user:
        return HttpResponseForbidden("You are not authorized to edit this review.")

    if request.method == 'POST':
        form = ReviewForm(request.POST, request.FILES, instance=review)
        if form.is_valid():
            form.save()
            from django.core.cache import cache
            cache.delete(f'establishment_{establishment_id}_reviews')

            messages.success(request, 'Review updated successfully!')
            return redirect('food_establishment_details', establishment_id=establishment_id)
        else:
            all_reviews = Review.objects.filter(establishment=establishment).order_by('-created_at')
            user_review = review
            other_reviews = all_reviews.exclude(id=review.id)
            context = {
                'establishment': establishment,
                'menu_items': MenuItem.objects.filter(food_establishment=establishment),
                'average_rating': all_reviews.aggregate(Avg('rating'))['rating__avg'],
                'review_form': form,
                'user_review': user_review,
                'other_reviews': other_reviews,
            }
            messages.error(request, 'There was an error updating your review. Please check the form.')
            return render(request, 'webapplication/food_establishment_details.html', context)
    return redirect('food_establishment_details', establishment_id=establishment_id)


@login_required
@require_POST
def delete_review(request, establishment_id, review_id):
    review = get_object_or_404(Review, pk=review_id)

    if review.user != request.user:
        return HttpResponseForbidden("You are not authorized to delete this review.")
    est_id = review.establishment.id
    review.delete()

    cache.delete(f'establishment_{est_id}_reviews')

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    if is_ajax:
        return JsonResponse({'success': True, 'message': 'Review deleted successfully!'})

    messages.success(request, 'Review deleted successfully!')
    return redirect('food_establishment_details', establishment_id=est_id)


def get_gravatar_url(email, size=80):
    """Return Gravatar URL for a given email address."""
    email_hash = hashlib.md5(email.strip().lower().encode('utf-8')).hexdigest()
    return f"https://www.gravatar.com/avatar/{email_hash}?s={size}&d=mp"


def food_establishment_details(request, establishment_id):
    _ensure_user_profile(request.user)
    establishment = get_object_or_404(
        FoodEstablishment.objects.annotate(
            average_rating=Avg('reviews__rating'),
            review_count=Count('reviews')
        ).prefetch_related('categories', 'amenities'),
        id=establishment_id
    )

    _ = establishment.status

    all_reviews = Review.objects.filter(establishment=establishment).select_related('user').order_by('-created_at')

    user_review = None
    other_reviews = all_reviews

    if request.user.is_authenticated:
        user_review = all_reviews.filter(user=request.user).first()
        if user_review:
            other_reviews = all_reviews.exclude(id=user_review.id)

    # Attach gravatar URL to each review for use in template
    for review in other_reviews:
        review.gravatar_url = get_gravatar_url(review.user.email or review.user.username)
    if user_review:
        user_review.gravatar_url = get_gravatar_url(request.user.email or request.user.username)

    review_form = ReviewForm(instance=user_review) if user_review else ReviewForm()

    # Menu Item Filters
    menu_items = MenuItem.objects.filter(food_establishment=establishment)

    search_query = request.GET.get('search')
    filter_first_letter = request.GET.get('filter_first_letter')
    sort_price = request.GET.get('sort_price')
    filter_availability = request.GET.get('filter_availability')
    filter_top_seller = request.GET.get('filter_top_seller')

    if search_query:
        menu_items = menu_items.filter(name__icontains=search_query)

    if filter_first_letter:
        menu_items = menu_items.filter(name__istartswith=filter_first_letter)

    if filter_availability == 'available':
        menu_items = menu_items.filter(quantity__gt=0)
    elif filter_availability == 'sold_out':
        menu_items = menu_items.filter(quantity=0)

    if filter_top_seller == 'yes':
        menu_items = menu_items.filter(is_top_seller=True)

    if sort_price == 'asc':
        menu_items = menu_items.order_by('price')
    elif sort_price == 'desc':
        menu_items = menu_items.order_by('-price')
    else:
        menu_items = menu_items.order_by('-is_top_seller', 'name')

    current_user_gravatar = ''
    if request.user.is_authenticated:
        current_user_gravatar = get_gravatar_url(request.user.email or request.user.username)

    # ✅ Cart badge — count pending cart items so the sidebar badge shows instantly on page load
    # (same query used by kabsueats_home and get_cart_count)
    cart_count = 0
    if request.user.is_authenticated:
        cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

    context = {
        'establishment': establishment,
        'menu_items': menu_items,
        'latitude': establishment.latitude,
        'longitude': establishment.longitude,
        'average_rating': establishment.average_rating if establishment.average_rating is not None else 0,
        'review_form': review_form,
        'user_review': user_review,
        'reviews': other_reviews,
        'is_guest': not request.user.is_authenticated,
        'current_user_gravatar': current_user_gravatar,
        'cart_count': cart_count,  # ✅ powers #cart-count-badge on initial render
    }
    return render(request, 'webapplication/food_establishment_details.html', context)


@require_POST
@login_required
@require_http_methods(['POST'])
def submit_review(request, establishment_id):
    establishment = get_object_or_404(FoodEstablishment, pk=establishment_id)

    if not request.user.is_authenticated:
        messages.error(request, "Please log in to submit a review.")
        return redirect('food_establishment_details', establishment_id=establishment_id)

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == 'POST':
        # Check if user already submitted a review (for non-AJAX path duplicate guard)
        existing_review = Review.objects.filter(user=request.user, establishment=establishment).first()
        if existing_review:
            if is_ajax:
                return JsonResponse({'success': False, 'error': 'You have already submitted a review.'}, status=400)
            messages.error(request, "You have already submitted a review for this establishment.")
            return redirect('food_establishment_details', establishment_id=establishment_id)

        form = ReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.user = request.user
            review.establishment = establishment
            review.save()
            from django.core.cache import cache
            cache.delete(f'establishment_{establishment_id}_reviews')
            if is_ajax:
                return JsonResponse({'success': True, 'review_id': review.id, 'message': 'Review submitted!'})
            messages.success(request, "Your review has been submitted successfully!")
            return redirect('food_establishment_details', establishment_id=establishment_id)
        else:
            if is_ajax:
                return JsonResponse({'success': False, 'error': str(form.errors)}, status=400)
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"Error in {field}: {error}")
            return redirect('food_establishment_details', establishment_id=establishment_id)
    return redirect('food_establishment_details', establishment_id=establishment_id)


@login_required
def edit_review(request, establishment_id, review_id):
    """
    Endpoint for editing a user's review for a given establishment.
    This matches the frontend's URL structure: /food_establishment/<establishment_id>/edit_review/<review_id>/
    """
    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
    review = get_object_or_404(Review, id=review_id, establishment=establishment)

    if review.user != request.user:
        return HttpResponseForbidden("You are not authorized to edit this review.")

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == 'POST':
        form = ReviewForm(request.POST, request.FILES, instance=review)
        if form.is_valid():
            form.save()
            from django.core.cache import cache
            cache.delete(f'establishment_{establishment_id}_reviews')
            if is_ajax:
                return JsonResponse({'success': True, 'review_id': review.id, 'message': 'Review updated!'})
            messages.success(request, 'Review updated successfully!')
            return redirect('food_establishment_details', establishment_id=establishment_id)
        else:
            if is_ajax:
                return JsonResponse({'success': False, 'error': str(form.errors)}, status=400)
            all_reviews = Review.objects.filter(establishment=establishment).order_by('-created_at')
            user_review = review
            other_reviews = all_reviews.exclude(id=review.id)
            context = {
                'establishment': establishment,
                'menu_items': MenuItem.objects.filter(food_establishment=establishment),
                'average_rating': all_reviews.aggregate(Avg('rating'))['rating__avg'],
                'review_form': form,
                'user_review': user_review,
                'other_reviews': other_reviews,
            }
            messages.error(request, 'There was an error updating your review. Please check the form.')
            return render(request, 'webapplication/food_establishment_details.html', context)
    return redirect('food_establishment_details', establishment_id=establishment_id)


@login_required(login_url='user_login_register')
def view_directions(request, establishment_id):
    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
    latitude = establishment.latitude
    longitude = establishment.longitude
    name = establishment.name

    if latitude is None or longitude is None:
        return render(request, 'webapplication/view_directions.html',
                      {'error': 'Location not set for this establishment.'})

    context = {
        'establishment': establishment,
        'latitude': latitude,
        'longitude': longitude,
    }
    return render(request, 'webapplication/view_directions.html', context)


@login_required(login_url='user_login_register')
def toggle_item_availability(request, item_id):
    if request.method == 'POST':
        item = get_object_or_404(MenuItem, id=item_id)
        establishment_id_in_session = request.session.get('food_establishment_id')

        if not establishment_id_in_session or item.food_establishment.id != int(establishment_id_in_session):
            messages.error(request, "You are not authorized to perform this action.")
            return redirect(reverse_lazy('food_establishment_dashboard'))

        item.is_available = not item.is_available
        item.save()

        if item.is_available:
            messages.success(request, f"'{item.name}' is now available.")
        else:
            messages.warning(request, f"'{item.name}' is now out of stock.")

        return redirect(reverse_lazy('food_establishment_dashboard'))

    messages.error(request, "Invalid request method.")
    return redirect(reverse_lazy('food_establishment_dashboard'))


@csrf_exempt
def send_registration_otp(request):
    """
    COMPLETELY FIXED: Send OTP for customer registration
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        body = request.body.decode('utf-8') or '{}'
        data = json.loads(body) if body else {}
    except Exception:
        data = {}

    email = data.get('email') or request.POST.get('email')

    if not email:
        return JsonResponse({'error': 'Email is required'}, status=400)

    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return JsonResponse({'error': 'Invalid email format'}, status=400)

    # Check if email already exists
    if User.objects.filter(email=email).exists():
        return JsonResponse({'error': 'This email is already registered'}, status=400)

    # Generate 6-digit OTP
    otp_code = ''.join(random.choices(string.digits, k=6))

    # Save OTP to database with timestamp reset
    try:
        otp_obj, created = OTP.objects.update_or_create(
            email=email,
            defaults={
                'code': otp_code,
                'attempts': 0
            }
        )
        # Force update the created_at timestamp
        if not created:
            otp_obj.created_at = timezone.now()
            otp_obj.save()
    except Exception as e:
        print(f"OTP DB save error: {e}")
        return JsonResponse({'error': 'Failed to generate OTP'}, status=500)

    # Also save in session for redundancy
    try:
        request.session['otp'] = otp_code
        request.session['otp_email'] = email
        request.session.modified = True
    except Exception as e:
        print(f"Session OTP save error: {e}")

    # Check if SENDER_EMAIL is configured
    from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)

    if not from_email:
        print("❌ CRITICAL: No sender email configured")
        print(f"⚠️ OTP saved for {email}: {otp_code}")
        return JsonResponse({
            'success': True,
            'message': 'OTP generated (email not configured)',
            'warning': 'SENDER_EMAIL not set. Add it to .env file.',
            'debug_otp': otp_code  # REMOVE IN PRODUCTION
        })

    # Prepare email content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background-color: #e59b20; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; }}
            .otp-box {{ background-color: #f9f9f9; border: 2px dashed #e59b20; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }}
            .otp-code {{ font-size: 36px; font-weight: bold; color: #e59b20; letter-spacing: 8px; }}
            .footer {{ background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777; }}
            .warning {{ color: #d9534f; font-size: 14px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>KabsuEats Verification</h1>
            </div>
            <div class="content">
                <h2>Hello!</h2>
                <p>Thank you for registering with KabsuEats. To complete your registration, please use the following One-Time Password (OTP):</p>

                <div class="otp-box">
                    <div class="otp-code">{otp_code}</div>
                </div>

                <p>This OTP is valid for <strong>10 minutes</strong>.</p>

                <p class="warning">⚠️ Do not share this code with anyone. KabsuEats staff will never ask for your OTP.</p>

                <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 KabsuEats. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Fire email in background — respond instantly to user
    import threading
    def _send_otp_email():
        try:
            send_mail(
                subject='Your KabsuEats Verification Code',
                message=f'Your verification code is: {otp_code}',
                from_email=from_email,
                recipient_list=[email],
                fail_silently=True,
                html_message=html_content
            )
            print(f"✅ OTP email sent to {email}")
        except Exception as e:
            print(f"❌ Background OTP email error: {e}")

    threading.Thread(target=_send_otp_email, daemon=True).start()

    return JsonResponse({
        'success': True,
        'message': 'OTP sent successfully to your email'
    })


@csrf_exempt
def verify_otp_and_register(request):
    """
    COMPLETE FIX: Verify OTP and register user WITHOUT blocking operations
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        # Parse request body
        try:
            body = request.body.decode('utf-8') or '{}'
            data = json.loads(body) if body else {}
        except Exception as e:
            print(f"❌ JSON parse error: {e}")
            data = request.POST.dict()

        email = data.get('email')
        otp_code = data.get('otp')
        password = data.get('password')

        # CRITICAL: Log received data
        print(f"📥 Verification attempt:")
        print(f"   Email: {email}")
        print(f"   OTP received: {otp_code}")
        print(f"   Password length: {len(password) if password else 0}")

        # Validate required fields
        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)

        if not otp_code:
            return JsonResponse({'error': 'OTP is required'}, status=400)

        if not password:
            return JsonResponse({'error': 'Password is required'}, status=400)

        # Verify OTP from database
        otp_valid = False

        try:
            from datetime import timedelta
            otp_entry = OTP.objects.get(email=email)
            print(f"🔍 DB OTP: {otp_entry.code}, Received: {otp_code}")

            if otp_entry.code == str(otp_code).strip():
                # Check expiration
                if timezone.now() - otp_entry.created_at > timedelta(minutes=10):
                    print("❌ OTP expired")
                    return JsonResponse({
                        'error': 'OTP has expired. Please request a new one.'
                    }, status=400)

                # Check if blocked
                if otp_entry.is_blocked():
                    print("❌ OTP blocked")
                    return JsonResponse({
                        'error': 'Too many failed attempts. Please request a new OTP.'
                    }, status=400)

                otp_valid = True
                print("✅ OTP valid from database")
            else:
                otp_entry.increment_attempts()
                print(f"❌ OTP mismatch")

        except OTP.DoesNotExist:
            print("⚠️ OTP not found in database")
            return JsonResponse({
                'error': 'Invalid or expired OTP.'
            }, status=400)

        if not otp_valid:
            return JsonResponse({
                'error': 'Invalid OTP. Please check your code.'
            }, status=400)

        print(f"✅ OTP validated from database")

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            print(f"❌ Email already registered: {email}")
            return JsonResponse({
                'error': 'This email is already registered.'
            }, status=400)

        # Validate password
        if len(password) < 8:
            return JsonResponse({'error': 'Password must be at least 8 characters'}, status=400)

        import re
        if not re.search(r'[A-Z]', password):
            return JsonResponse({'error': 'Password must contain at least one uppercase letter'}, status=400)

        if not re.search(r'\d', password):
            return JsonResponse({'error': 'Password must contain at least one number'}, status=400)

        # ✅ CRITICAL FIX: Create user and return immediately
        try:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password
            )
            print(f"✅ User created: {user.username}")

            # ✅ Delete OTP after successful registration
            try:
                OTP.objects.filter(email=email).delete()
                print("✅ OTP cleaned up from database")
            except Exception as cleanup_error:
                print(f"⚠️ OTP cleanup error (non-critical): {cleanup_error}")

            # Clear session OTP
            try:
                request.session.pop('otp', None)
                request.session.pop('otp_email', None)
                print("✅ OTP cleaned up from session")
            except Exception:
                pass

            # ✅ CRITICAL: Return success IMMEDIATELY without waiting for email
            response_data = {
                'success': True,
                'message': 'Account created successfully! You can now log in.',
                'redirect_url': '/accounts/login_register/'
            }

            # ✅ Send welcome email in background (non-blocking)
            try:
                from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)
                if from_email:
                    import threading

                    def send_welcome_email_background():
                        try:
                            # Use simple text message to avoid memory issues
                            send_mail(
                                subject="Welcome to KabsuEats!",
                                message=f"Hello {user.username},\n\nWelcome to KabsuEats! Your account has been successfully created.",
                                from_email=from_email,
                                recipient_list=[user.email],
                                fail_silently=True
                            )
                            print(f"✅ Welcome email sent to {user.email}")
                        except Exception as e:
                            print(f"⚠️ Welcome email error (non-critical): {e}")

                    # Start background thread (daemon=True ensures it won't block)
                    email_thread = threading.Thread(
                        target=send_welcome_email_background,
                        daemon=True
                    )
                    email_thread.start()

            except Exception as email_setup_error:
                print(f"⚠️ Email setup error (non-critical): {email_setup_error}")

            # Return success immediately
            return JsonResponse(response_data)

        except Exception as user_create_error:
            print(f"❌ User creation error: {user_create_error}")
            import traceback
            traceback.print_exc()

            return JsonResponse({
                'error': f'Failed to create account: {str(user_create_error)}'
            }, status=500)

    except Exception as outer_error:
        print(f"❌ Outer exception: {outer_error}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'error': 'An unexpected error occurred. Please try again.'
        }, status=500)


@csrf_exempt
def verify_otp_only(request):
    """
    ✅ NEW: Verify OTP code BEFORE password step
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        body = request.body.decode('utf-8') or '{}'
        data = json.loads(body) if body else {}
    except Exception:
        data = {}

    email = data.get('email')
    otp_code = data.get('otp')

    if not email or not otp_code:
        return JsonResponse({'error': 'Email and OTP are required'}, status=400)

    # Verify OTP from database
    try:
        from datetime import timedelta
        otp_entry = OTP.objects.get(email=email)

        if otp_entry.code == str(otp_code).strip():
            # Check expiration
            if timezone.now() - otp_entry.created_at > timedelta(minutes=10):
                return JsonResponse({
                    'error': 'OTP has expired. Please request a new one.'
                }, status=400)

            # Check if blocked
            if otp_entry.is_blocked():
                return JsonResponse({
                    'error': 'Too many failed attempts. Please request a new OTP.'
                }, status=400)

            # Mark as verified by deleting after a short delay or just keep it
            # No need to mark as verified, we'll delete it after user registration completes
            # otp_entry is still valid until user completes registration

            return JsonResponse({'success': True, 'message': 'OTP verified'})
        else:
            # Increment failed attempts
            otp_entry.increment_attempts()
            return JsonResponse({
                'error': 'Invalid OTP. Please check your code.'
            }, status=400)

    except OTP.DoesNotExist:
        # Fallback to session
        session_otp = request.session.get('otp')
        session_email = request.session.get('otp_email')

        if session_email == email and session_otp == str(otp_code).strip():
            return JsonResponse({'success': True, 'message': 'OTP verified'})
        else:
            return JsonResponse({
                'error': 'Invalid OTP. Please check your code.'
            }, status=400)


@csrf_exempt
def resend_otp(request):
    """
    FIXED: Resend OTP if user didn't receive it
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        body = request.body.decode('utf-8') or '{}'
        data = json.loads(body) if body else {}
    except Exception:
        data = {}

    email = data.get('email') or request.POST.get('email')

    if not email:
        return JsonResponse({'error': 'Email is required'}, status=400)

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return JsonResponse({
            'error': 'This email is already registered'
        }, status=400)

    # Generate new OTP
    otp_code = ''.join(random.choices(string.digits, k=6))

    # Save OTP to database with fresh timestamp
    try:
        otp_obj, created = OTP.objects.update_or_create(
            email=email,
            defaults={
                'code': otp_code,
                'attempts': 0
            }
        )
        # Force update the created_at timestamp
        otp_obj.created_at = timezone.now()
        otp_obj.save()

        print(f"✅ New OTP generated for {email}: {otp_code}")
    except Exception as e:
        print(f"❌ OTP save error: {e}")
        return JsonResponse({'error': 'Failed to generate OTP'}, status=500)

    # Update session
    try:
        request.session['otp'] = otp_code
        request.session['otp_email'] = email
        request.session.modified = True
    except Exception as e:
        print(f"⚠️ Session update error: {e}")

    # Send email
    from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)

    if not from_email:
        return JsonResponse({
            'success': True,
            'message': 'New OTP generated',
            'warning': 'Email not configured',
            'debug_otp': otp_code  # REMOVE IN PRODUCTION
        })

    # Use the same send logic as send_registration_otp
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>KabsuEats - Resend Verification Code</h2>
        <p>Your new verification code is:</p>
        <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #e59b20;">
            {otp_code}
        </div>
        <p>This code is valid for 10 minutes.</p>
    </div>
    """

    # Fire email in background — respond instantly to user
    import threading
    def _resend_otp_email():
        try:
            send_mail(
                subject='Your New KabsuEats Verification Code',
                message=f'Your new verification code is: {otp_code}',
                from_email=from_email,
                recipient_list=[email],
                fail_silently=True,
                html_message=html_content
            )
            print(f"✅ Resend OTP email sent to {email}")
        except Exception as e:
            print(f"❌ Background resend OTP error: {e}")

    threading.Thread(target=_resend_otp_email, daemon=True).start()

    return JsonResponse({
        'success': True,
        'message': 'New OTP sent successfully!'
    })


import base64
import json
import requests
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from decimal import Decimal


def get_csrf_token(request):
    """Helper to get CSRF token from cookies"""
    return request.COOKIES.get('csrftoken', '')


def send_mail(subject, message, from_email, recipient_list, fail_silently=False, html_message=None):
    """
    ✅ RELIABLE EMAIL SENDING — SendGrid with retry + timeout + Gmail fallback
    """
    import logging
    import time
    logger = logging.getLogger(__name__)

    # Resolve sender email
    if not from_email or from_email == 'webmaster@localhost':
        from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)
    if not from_email:
        logger.error("❌ CRITICAL: No sender email configured")
        if not fail_silently:
            raise ValueError("SENDER_EMAIL not configured")
        return 0

    if isinstance(recipient_list, str):
        recipient_list = [recipient_list]

    body = html_message if html_message else message

    # ── SendGrid (primary, with retry) ───────────────────────────────────────
    sendgrid_key = os.getenv('SENDGRID_API_KEY') or getattr(settings, 'SENDGRID_API_KEY', None)

    if sendgrid_key and sendgrid_key not in ('', '********************'):
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content
        from python_http_client.exceptions import HTTPError

        MAX_RETRIES = 3
        RETRY_DELAYS = [0, 0.5, 1]  # ✅ reduced: was [0,1,2] — background thread, short retries ok

        for attempt in range(MAX_RETRIES):
            try:
                sg_msg = Mail(
                    from_email=Email(from_email),
                    to_emails=[To(r) for r in recipient_list],
                    subject=subject,
                    html_content=Content("text/html", body)
                )
                # Add plain-text for better deliverability
                sg_msg.add_content(Content("text/plain", message))

                sg = SendGridAPIClient(sendgrid_key)
                # Set HTTP timeout to 10 s so it never hangs indefinitely
                sg.client.session.timeout = 10

                response = sg.send(sg_msg)

                if response.status_code in (200, 202):
                    logger.info(f"✅ SendGrid sent to {recipient_list} (attempt {attempt+1})")
                    return 1
                else:
                    logger.warning(f"⚠️ SendGrid status {response.status_code} on attempt {attempt+1}")

            except HTTPError as http_err:
                err_str = str(http_err).lower()
                if '403' in err_str:
                    logger.error("❌ SendGrid 403 — sender not verified. No point retrying.")
                    break  # Won't recover with retries
                elif '401' in err_str:
                    logger.error("❌ SendGrid 401 — invalid API key. No point retrying.")
                    break
                logger.error(f"❌ SendGrid HTTP error attempt {attempt+1}: {http_err}")

            except Exception as e:
                logger.error(f"❌ SendGrid error attempt {attempt+1}: {e}")

            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt + 1])

        logger.warning("⚠️ SendGrid failed after retries, trying Gmail SMTP fallback...")
    else:
        logger.warning("⚠️ SendGrid not configured, trying Gmail SMTP...")

    # ── Gmail SMTP fallback (works locally, may fail on Render) ─────────────
    try:
        result = django_send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
            html_message=html_message
        )
        if result and result > 0:
            logger.info(f"✅ Gmail SMTP sent to {recipient_list}")
            return result
    except Exception as smtp_error:
        err = str(smtp_error).lower()
        if 'network is unreachable' in err or 'errno 101' in err:
            logger.error("❌ Render blocks Gmail SMTP — use SendGrid in production")
        elif 'authentication' in err or '535' in err:
            logger.error("❌ Gmail auth failed — check App Password in .env")
        else:
            logger.error(f"❌ Gmail SMTP error: {smtp_error}")
        if not fail_silently:
            raise

    logger.error(f"❌ All email methods failed for {recipient_list}")
    if not fail_silently:
        raise Exception("Email sending failed — SendGrid and Gmail both unavailable")
    return 0


@login_required
@require_POST
def gcash_payment_request(request):
    """
    Handles GCash payment initiation for immediate purchase (Buy Now).
    Creates an Order and returns payment instructions.
    """
    try:
        menu_item_id = request.POST.get('menu_item_id')
        quantity = request.POST.get('quantity', 1)

        # Validate inputs
        if not menu_item_id:
            return JsonResponse({
                'success': False,
                'message': 'Menu item ID is required'
            }, status=400)

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return JsonResponse({
                'success': False,
                'message': 'Invalid quantity'
            }, status=400)

        if quantity < 1:
            return JsonResponse({
                'success': False,
                'message': 'Quantity must be at least 1'
            }, status=400)

        # Get menu item and establishment
        menu_item = get_object_or_404(MenuItem, id=menu_item_id)
        establishment = menu_item.food_establishment

        # Check stock availability
        if menu_item.quantity < quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {menu_item.quantity} items available in stock'
            }, status=400)

        # Calculate total amount
        total_amount = Decimal(str(menu_item.price)) * quantity

        # Create order with PENDING status
        order = Order.objects.create(
            user=request.user,
            establishment=establishment,
            status='PENDING',
            total_amount=total_amount,
            gcash_payment_method='gcash'
        )

        # Create order item
        OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            quantity=quantity,
            price_at_order=menu_item.price
        )

        # Generate unique reference number
        reference_number = f"KBE-{order.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        order.gcash_reference_number = reference_number
        order.save()

        # Return payment instructions
        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'reference_number': reference_number,
            'total_amount': float(total_amount),
            'establishment_name': establishment.name,
            'gcash_number': '09382514213',  # Store owner's GCash number
            'item_name': menu_item.name,
            'item_quantity': quantity
        })

    except MenuItem.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Menu item not found'
        }, status=404)
    except Exception as e:
        print(f"Error in gcash_payment_request: {e}")
        return JsonResponse({
            'success': False,
            'message': f'An error occurred: {str(e)}'
        }, status=500)


@login_required
@require_POST
def confirm_gcash_payment(request):
    """
    Confirms GCash payment after user sends money.
    Updates order status, reduces item quantity, and sends confirmation emails.
    """
    try:
        order_id = request.POST.get('order_id')
        sender_reference = request.POST.get('sender_reference')

        # Validate inputs
        if not order_id:
            return JsonResponse({
                'success': False,
                'message': 'Order ID is required'
            }, status=400)

        # Get order and verify ownership
        order = get_object_or_404(Order, id=order_id, user=request.user)

        # Verify order is still pending
        if order.status != 'PENDING':
            return JsonResponse({
                'success': False,
                'message': f'Order is no longer pending. Current status: {order.status}'
            }, status=400)

        # Update order status to PAID
        order.status = 'PAID'
        order.payment_confirmed_at = timezone.now()
        order.save()

        # Reduce stock for each item in the order
        for order_item in order.orderitem_set.all():
            menu_item = order_item.menu_item

            # Check if enough stock is available
            if menu_item.quantity < order_item.quantity:
                # Rollback: set order back to pending
                order.status = 'PENDING'
                order.payment_confirmed_at = None
                order.save()

                return JsonResponse({
                    'success': False,
                    'message': f'Insufficient stock for {menu_item.name}. Please contact support.'
                }, status=400)

            # Reduce the stock
            menu_item.quantity = max(menu_item.quantity - order_item.quantity, 0)
            menu_item.save()

        # Send confirmation emails
        try:
            send_order_confirmation_email(order)
        except Exception as email_error:
            print(f"Error sending confirmation email: {email_error}")
            # Continue even if email fails

        # Return success response
        return JsonResponse({
            'success': True,
            'message': 'Payment confirmed! Your order is being prepared.',
            'order_id': order.id,
            'redirect_url': reverse('view_order_confirmation', kwargs={'order_id': order.id})
        })

    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Order not found'
        }, status=404)
    except Exception as e:
        print(f"Error in confirm_gcash_payment: {e}")
        return JsonResponse({
            'success': False,
            'message': f'Error confirming payment: {str(e)}'
        }, status=500)


@login_required
def view_order_confirmation(request, order_id):
    """
    Display order confirmation page after successful payment.
    """
    order = get_object_or_404(Order, id=order_id, user=request.user)
    order_items = order.orderitem_set.select_related('menu_item').all()

    context = {
        'order': order,
        'order_items': order_items,
        'payment_method': order.gcash_payment_method or 'cash',
    }

    return render(request, 'webapplication/order_confirmation.html', context)


@login_required
@require_POST
def create_gcash_payment_link(request):
    """
    Create PayMongo payment link for a SPECIFIC establishment cart.
    Now supports multi-establishment by accepting order_id.
    """
    try:
        # Get order_id from request (support form-encoded and JSON bodies)
        order_id = None
        if request.content_type and request.content_type.startswith('application/json'):
            try:
                body = json.loads(request.body.decode('utf-8') or '{}')
                order_id = body.get('order_id')
            except Exception:
                order_id = None
        if not order_id:
            order_id = request.POST.get('order_id')

        if not order_id:
            return JsonResponse({
                'success': False,
                'message': 'Order ID is required'
            }, status=400)

        # Get the specific order — accept PENDING (legacy), to_pay (accepted), or request (new)
        from django.db.models import Q
        order = get_object_or_404(
            Order.objects.prefetch_related('orderitem_set__menu_item').filter(
                Q(status='PENDING') | Q(status='to_pay') | Q(status='request')
            ),
            id=order_id,
            user=request.user,
        )

        cart_items = order.orderitem_set.all()
        if not cart_items.exists():
            return JsonResponse({
                'success': False,
                'message': 'This cart is empty'
            }, status=400)

        # Calculate total
        total_amount = float(order.total_amount)
        amount_in_centavos = int(total_amount * 100)

        # Defensive validation: amount must be > 0
        if amount_in_centavos <= 0:
            return JsonResponse({
                'success': False,
                'message': 'Order total must be greater than zero.'
            }, status=400)

        # ✅ No minimum amount restriction — PayMongo handles any amount.

        # PayMongo API setup
        auth_string = f"{settings.PAYMONGO_SECRET_KEY}:"
        auth_base64 = base64.b64encode(auth_string.encode()).decode()

        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        # build.sh URLs
        success_url = request.build_absolute_uri(
            reverse('gcash_payment_success')
        ) + f'?order_id={order.id}'

        # ✅ cancel_url points back to the KabsuEats checkout page
        # so when user clicks the back button on PayMongo they return here
        cancel_url = request.build_absolute_uri(
            reverse('checkout_page')
        ) + f'?order_id={order.id}'

        # build.sh description
        item_names = [item.menu_item.name for item in cart_items[:3]]
        description = f"Order from {order.establishment.name}: {', '.join(item_names)}"
        if cart_items.count() > 3:
            description += f" and {cart_items.count() - 3} more items"

        # Add return_to param for post-payment routing on success only
        success_url = success_url + '&return_to=cart'

        # Build line items for checkout session
        line_items = []
        for item in cart_items:
            line_items.append({
                "currency": "PHP",
                "amount": int(float(item.menu_item.price) * 100),
                "description": item.menu_item.name[:255],
                "name": item.menu_item.name[:255],
                "quantity": item.quantity,
            })

        # Use PayMongo Checkout Sessions (supports GCash, Cards, redirect URLs)
        payload = {
            "data": {
                "attributes": {
                    "billing": {
                        "name": request.user.get_full_name() or request.user.username,
                        "email": request.user.email or "",
                        "phone": getattr(request.user, 'phone_number', '') or "",
                    },
                    "line_items": line_items,
                    "payment_method_types": ["gcash", "card", "paymaya"],
                    "success_url": success_url,
                    "cancel_url": cancel_url,
                    "description": description,
                    "reference_number": f"ORDER-{order.id}",
                    "metadata": {
                        "order_id": str(order.id),
                        "establishment": order.establishment.name,
                    }
                }
            }
        }

        # Call PayMongo Checkout Sessions API
        api_url = "https://api.paymongo.com/v1/checkout_sessions"

        import logging
        logging.getLogger(__name__).debug('PayMongo payload: %s', json.dumps(payload))

        response = requests.post(api_url, headers=headers, json=payload, timeout=30)

        if response.status_code in [200, 201]:
            response_data = response.json()
            checkout_url = response_data['data']['attributes']['checkout_url']
            session_id = response_data['data']['id']

            # Save checkout session ID for webhook matching
            order.gcash_reference_number = session_id
            if hasattr(order, 'paymongo_checkout_id'):
                order.paymongo_checkout_id = session_id
                order.save(update_fields=['gcash_reference_number', 'paymongo_checkout_id'])
            else:
                order.save(update_fields=['gcash_reference_number'])

            return JsonResponse({
                'success': True,
                'checkout_url': checkout_url,
                'order_id': order.id,
                'reference_number': session_id,
                'total_amount': float(total_amount)
            })
        else:
            # Try to include upstream response for debugging
            try:
                resp_text = response.text
                error_data = response.json() if response.content else {}
            except Exception:
                resp_text = response.text if hasattr(response, 'text') else ''
                error_data = {}

            error_message = error_data.get('errors', [{}])[0].get('detail') if isinstance(error_data, dict) else None
            if not error_message:
                error_message = resp_text or 'Payment service error'

            import logging
            logging.getLogger(__name__).error('PayMongo /links returned %s: %s', response.status_code, resp_text)

            return JsonResponse({
                'success': False,
                'message': error_message,
                'upstream_status': response.status_code,
                'upstream_body': resp_text
            }, status=502)

    except Exception as e:
        import logging, traceback
        logging.getLogger(__name__).exception('Unexpected error in create_gcash_payment_link')
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'message': 'Internal server error while creating payment link'
        }, status=500)


@login_required
def debug_create_gcash_payload(request, order_id):
    """
    Debug endpoint: build and return the PayMongo payload for the given order_id
    without calling PayMongo. Use this to inspect the payload, amount, and URLs.
    """
    try:
        from django.db.models import Q
        order = get_object_or_404(
            Order.objects.prefetch_related('orderitem_set__menu_item').filter(
                Q(status='PENDING') | Q(status='to_pay')
            ),
            id=order_id,
            user=request.user,
        )

        cart_items = order.orderitem_set.all()
        if not cart_items.exists():
            return JsonResponse({'success': False, 'message': 'This cart is empty'}, status=400)

        total_amount = float(order.total_amount)
        amount_in_centavos = int(total_amount * 100)

        success_url = request.build_absolute_uri(reverse('gcash_payment_success')) + f'?order_id={order.id}'
        cancel_url = request.build_absolute_uri(reverse('gcash_payment_cancel')) + f'?order_id={order.id}'

        item_names = [item.menu_item.name for item in cart_items[:3]]
        description = f"Order from {order.establishment.name}: {', '.join(item_names)}"
        if cart_items.count() > 3:
            description += f" and {cart_items.count() - 3} more items"

        payload = {
            "data": {
                "attributes": {
                    "amount": amount_in_centavos,
                    "description": description,
                    "remarks": f"Order #{order.id} - KabsuEats",
                    "payment_method_allowed": ["gcash"],
                    "success_url": success_url,
                    "failed_url": cancel_url
                }
            }
        }

        api_url = f"{settings.PAYMONGO_API_URL}/links"

        # Return payload and helpful debug info (do NOT include secret keys)
        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'total_amount': total_amount,
            'amount_in_centavos': amount_in_centavos,
            'api_url': api_url,
            'payload': payload,
            'note': 'This endpoint does NOT call PayMongo. Use the payload to test the API separately.'
        })

    except Exception:
        import logging, traceback
        logging.getLogger(__name__).exception('Error building debug payload')
        traceback.print_exc()
        return JsonResponse({'success': False, 'message': 'Error building payload'}, status=500)


@login_required
def gcash_payment_cancel(request):
    """Handle cancelled payment"""
    order_id = request.GET.get('order_id')

    if order_id:
        try:
            order = Order.objects.get(id=order_id, user=request.user)
            messages.warning(request,
                             f'Payment was cancelled for {order.establishment.name}. You can try again from your cart.')
        except Order.DoesNotExist:
            pass

    return redirect('view_cart')


@login_required
def checkout_page(request):
    """
    Checkout page - shows order items, customer info, establishment details, and payment options.
    Called from cart with ?order_id=<id> or from My Orders Pay Now button.
    Accepts orders with status 'PENDING' (legacy) or 'to_pay' (new flow).
    """
    order_id = request.GET.get('order_id')
    if not order_id:
        return redirect('view_cart')

    from django.db.models import Q
    order = get_object_or_404(
        Order.objects.select_related('establishment', 'user').filter(
            Q(status='PENDING') | Q(status='to_pay')
        ),
        id=order_id,
        user=request.user,
    )
    items = order.orderitem_set.select_related('menu_item').all()

    context = {
        'order': order,
        'items': items,
        'user': request.user,
    }
    return render(request, 'webapplication/checkout.html', context)


@login_required
def check_order_status(request):
    """
    ✅ Lightweight API — returns the current status of an order.
    Used by the checkout page's back-navigation guard to verify
    whether the order is still payable before showing the page.

    GET /checkout/status/?order_id=<id>
    Returns: { success: true, status: 'PENDING'|'to_pay'|'preparing'|... }
    """
    order_id = request.GET.get('order_id')
    if not order_id:
        return JsonResponse({'success': False, 'message': 'No order_id'}, status=400)
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        return JsonResponse({'success': True, 'status': order.status})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Order not found'}, status=404)


@login_required
def order_confirmation_view(request, order_id):
    """Display order confirmation"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    order_items = order.orderitem_set.select_related('menu_item').all()

    context = {
        'order': order,
        'order_items': order_items,
        'payment_method': order.gcash_payment_method or 'cash',
    }
    return render(request, 'webapplication/order_confirmation.html', context)


# ===================================================================================================================
# ===================================================END CLIENT=====================================================
# ===================================================================================================================

# ===================================================================================================================
# =================================================== OWNER ========================================================
# ===================================================================================================================
User = get_user_model()
def get_nearby_establishments(request):
    """
    API endpoint to get establishments within a given radius.
    ✅ FIXED: Only returns is_active=True establishments
    ✅ FIXED: Returns full details for rich map popups
    """
    try:
        lat = float(request.GET.get('lat'))
        lng = float(request.GET.get('lng'))
        radius_meters = float(request.GET.get('radius', 500))
        current_establishment_id = request.GET.get('establishment_id')

        # ✅ CHANGED: added is_active=True + prefetch related for efficiency
        query = FoodEstablishment.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False,
            is_active=True,
        ).prefetch_related('categories', 'amenities')

        # Exclude the current owner's own establishment from map pins
        if current_establishment_id:
            query = query.exclude(id=current_establishment_id)

        nearby_establishments = []

        for est in query:
            distance = calculate_distance(
                lat, lng,
                float(est.latitude), float(est.longitude)
            )

            if distance > radius_meters:
                continue

            # ✅ Build categories string (standard + other_category)
            cat_names = list(est.categories.values_list('name', flat=True))
            if est.other_category:
                cat_names.append(est.other_category)
            categories_str = ', '.join(cat_names) if cat_names else ''

            # ✅ Build amenities string (standard + other_amenity)
            amen_names = list(est.amenities.values_list('name', flat=True))
            if est.other_amenity:
                amen_names.append(est.other_amenity)
            amenities_str = ', '.join(amen_names) if amen_names else ''

            # ✅ Opening/closing hours display
            opening = est.opening_time.strftime('%I:%M %p') if est.opening_time else None
            closing  = est.closing_time.strftime('%I:%M %p') if est.closing_time else None

            # Build absolute image URL
            image_url = ''
            if est.image:
                try:
                    image_url = request.build_absolute_uri(est.image.url)
                except Exception:
                    image_url = ''

            nearby_establishments.append({
                'id':              est.id,
                'name':            est.name,
                'address':         est.address,
                'latitude':        float(est.latitude),
                'longitude':       float(est.longitude),
                'distance':        round(distance, 2),
                'status':          est.status,
                'categories':      categories_str,
                'amenities':       amenities_str,
                'payment_methods': est.payment_methods or '',
                'opening_time':    opening,
                'closing_time':    closing,
                'image_url':       image_url,
            })

        # Sort by distance ascending
        nearby_establishments.sort(key=lambda x: x['distance'])

        return JsonResponse({
            'success': True,
            'establishments': nearby_establishments,
            'count': len(nearby_establishments)
        })

    except (ValueError, TypeError):
        return JsonResponse({
            'success': False,
            'error': 'Invalid parameters'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in meters.
    """
    R = 6371000  # Earth's radius in meters

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return distance


def owner_login(request):
    """
    Owner login: accepts email & password, authenticates, sets session 'food_establishment_id'
    âœ… FIXED: Redirects with login_success parameter for notification
    """
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()

        if not email or not password:
            messages.error(request, "Email and password are required.")
            return redirect('owner_login')

        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            est = FoodEstablishment.objects.filter(owner=user).first()
            if est:
                request.session['food_establishment_id'] = est.id

                # âœ… REDIRECT WITH SUCCESS PARAMETER
                return redirect(reverse('food_establishment_dashboard') + '?login_success=true')
            else:
                messages.error(request, "No establishment found for this account.")
                return redirect('owner_login')
        else:
            messages.error(request, "Invalid email or password.")
            return redirect('owner_login')

    # GET request -> render login page
    return render(request, 'webapplication/owner_login.html')


def owner_logout(request):
    """Nag-logout sa owner at nire-redirect sa owner login page."""
    if 'food_establishment_id' in request.session:
        del request.session['food_establishment_id']
    logout(request)
    messages.success(request, "You have been successfully logged out.")
    return redirect('owner_login')


@login_required
@require_POST
def delete_establishment(request):
    """
    Delete the food establishment owned by the current user.
    This will cascade delete all related data (menu items, orders, reviews, etc.)
    """
    try:
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

        # Block deletion if there are any non-completed orders
        active_statuses = ['request', 'to_pay', 'preparing', 'to_claim', 'PENDING', 'order_received']
        active_orders = Order.objects.filter(
            establishment=establishment,
            status__in=active_statuses
        )
        if active_orders.exists():
            return JsonResponse({
                'success': False,
                'error': f'Cannot delete — there are {active_orders.count()} active order(s) still in progress. Please wait until all orders are completed before deleting your establishment.'
            }, status=400)

        establishment_name = establishment.name

        # Delete the establishment (cascade will handle related objects)
        establishment.delete()

        # Clear session data
        if 'food_establishment_id' in request.session:
            del request.session['food_establishment_id']

        # Logout the user
        logout(request)

        return JsonResponse({
            'success': True,
            'message': f'{establishment_name} has been successfully deleted.',
            'redirect_url': reverse('owner_login')
        })

    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'No establishment found for this account.'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }, status=500)


def owner_register_step1_location(request):
    # FIXED: Include image, real-time status (PH timezone), and category
    # so the map markers show the actual photo and correct Open/Closed badge.
    establishments_qs = FoodEstablishment.objects.filter(
        is_active=True,
        latitude__isnull=False,
        longitude__isnull=False,
    ).prefetch_related('categories')

    establishments_list = []
    for est in establishments_qs:
        # Build absolute image URL so the browser can actually fetch it
        image_url = ''
        if est.image:
            try:
                image_url = request.build_absolute_uri(est.image.url)
            except Exception:
                image_url = ''

        # Use get_current_status() which correctly uses PH timezone (Asia/Manila)
        # NOT est.status — the model property uses UTC datetime.now() and is 8h off on Render
        status = get_current_status(est.opening_time, est.closing_time)

        # First category name (or empty string)
        category_name = ''
        cats = est.categories.all()
        if cats.exists():
            category_name = cats.first().name
        elif est.other_category:
            category_name = est.other_category

        establishments_list.append({
            'name':           est.name,
            'address':        est.address or '',
            'latitude':       float(est.latitude),
            'longitude':      float(est.longitude),
            'image_url':      image_url,      # full absolute URL
            'status':         status,         # real-time PH timezone Open/Closed
            'category__name': category_name,
        })

    return render(request, 'webapplication/register_step1_location.html', {
        'CVSU_LATITUDE':           os.getenv('CVSU_LATITUDE'),
        'CVSU_LONGITUDE':          os.getenv('CVSU_LONGITUDE'),
        'existing_establishments': json.dumps(establishments_list),
    })


def owner_register_step2_details(request):
    payment_methods = ["Cash", "GCash"]
    context = {
        "payment_methods": payment_methods,
        'categories': Category.objects.all().order_by('name'),
        'amenities': Amenity.objects.all().order_by('name')
    }
    return render(request, 'webapplication/register_step2_details.html', context)


def owner_register_step3_credentials(request):
    return render(request, 'webapplication/register_step3_credentials.html')


@csrf_exempt
def send_otp(request):
    """
    ✅ COMPLETELY FIXED: Owner registration OTP with comprehensive debugging
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        # Parse request body
        try:
            body = request.body.decode('utf-8') or '{}'
            data = json.loads(body) if body else {}
        except Exception as parse_error:
            print(f"❌ JSON parse error: {parse_error}")
            data = request.POST.dict()

        email = data.get('email') or request.POST.get('email')

        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)

        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return JsonResponse({'error': 'Invalid email format'}, status=400)

        # ✅ CHECK IF EMAIL IS ALREADY REGISTERED
        User = get_user_model()
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'This email is already registered. Please use a different email or login instead.'
            }, status=400)

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999)).zfill(6)

        print(f"🔐 Generating OTP for {email}: {otp_code}")

        # Save OTP to database with fresh timestamp
        try:
            otp_obj, created = OTP.objects.update_or_create(
                email=email,
                defaults={
                    'code': otp_code,
                    'attempts': 0
                }
            )
            # Force timestamp update
            if not created:
                otp_obj.created_at = timezone.now()
                otp_obj.save()

            print(f"✅ OTP saved to database: {otp_obj.code}")
        except Exception as db_error:
            print(f"❌ OTP DB save error: {db_error}")
            return JsonResponse({'error': 'Failed to generate OTP'}, status=500)

        # Save in session as backup
        try:
            request.session['otp'] = otp_code
            request.session['otp_email'] = email
            request.session.modified = True
            print(f"✅ OTP saved to session")
        except Exception as session_error:
            print(f"⚠️ Session OTP save error (non-critical): {session_error}")

        # ============================================================================
        # EMAIL SENDING WITH COMPREHENSIVE DIAGNOSTICS
        # ============================================================================

        # Get sender email
        from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)

        if not from_email:
            print("❌ CRITICAL: No SENDER_EMAIL configured")
            return JsonResponse({
                'success': True,
                'warning': 'Email not configured - check .env file',
                'debug_otp': otp_code,  # REMOVE IN PRODUCTION
                'message': 'OTP generated but email not sent'
            })

        print(f"📧 Attempting to send OTP email from: {from_email}")

        # Prepare HTML content
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background-color: #e59b20; color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .content {{ padding: 40px 30px; }}
        .otp-box {{ background-color: #f9f9f9; border: 2px dashed #e59b20; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }}
        .otp-code {{ font-size: 36px; font-weight: bold; color: #e59b20; letter-spacing: 8px; }}
        .footer {{ background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>KabsuEats - Business Registration</h1>
        </div>
        <div class="content">
            <h2>Email Verification</h2>
            <p>Thank you for registering your business with KabsuEats. To complete your registration, please use the following One-Time Password (OTP):</p>

            <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
            </div>

            <p>This OTP is valid for <strong>10 minutes</strong>.</p>
            <p style="color: #d9534f;">⚠️ Do not share this code with anyone.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 KabsuEats. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """

        # Plain text fallback
        text_message = f"""
KabsuEats Business Registration

Your verification code is: {otp_code}

This code is valid for 10 minutes.

Do not share this code with anyone.

Thank you,
The KabsuEats Team
        """

        # ============================================================================
        # SEND EMAIL IN BACKGROUND THREAD — respond to user instantly
        # ============================================================================
        import threading

        def _send_otp_email():
            try:
                print("📤 [BG] Sending OTP email...")
                result = send_mail(
                    subject='KabsuEats Business Registration - Verification Code',
                    message=text_message,
                    from_email=from_email,
                    recipient_list=[email],
                    fail_silently=True,  # Suppress errors in background thread
                    html_message=html_content
                )
                if result and result > 0:
                    print(f"✅ [BG] OTP email sent successfully to {email}")
                else:
                    print(f"⚠️ [BG] Email send returned 0 — check SendGrid config")
            except Exception as email_error:
                print(f"❌ [BG] OTP email error: {email_error}")
                import traceback
                traceback.print_exc()

        threading.Thread(target=_send_otp_email, daemon=True).start()

        # ✅ Return success IMMEDIATELY — don't wait for email
        return JsonResponse({
            'success': True,
            'message': 'OTP sent successfully to your email'
        })

    except Exception as outer_error:
        print(f"❌ Outer exception in send_otp: {outer_error}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'error': f'Server error: {str(outer_error)}'
        }, status=500)


@csrf_exempt
def verify_and_register(request):
    """
    ✅ UPDATED: Support for multiple categories and amenities with "Other" option
    Handles business owner registration with OTP verification
    """
    if request.method != "POST":
        return JsonResponse({'error': 'Invalid request method.'}, status=405)

    otp_code = request.POST.get('otp')
    registration_data = request.POST.get('registrationData')

    if not otp_code or not registration_data:
        return JsonResponse({'error': 'Missing otp or registrationData.'}, status=400)

    try:
        data = json.loads(registration_data)
    except Exception:
        return JsonResponse({'error': 'Invalid registrationData format.'}, status=400)

    # Extract basic registration data
    email = data.get('email')
    password = data.get('password')
    name = data.get('name') or data.get('establishment_name') or data.get('store_name')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    address = data.get('address') or data.get('display_address') or ''

    # ============================================================
    # ✅ NEW: Extract multiple categories and "Other" category
    # ============================================================
    categories_ids = data.get('categories') or []  # Array of category IDs: ["1", "2", "3"]
    other_category = data.get('other_category')  # Custom category text: "Vegan Cafe"

    # Payment methods
    payment_methods = ', '.join(data.get('paymentMethods', [])) if data.get('paymentMethods') else data.get(
        'payment_methods', '')

    # ============================================================
    # ✅ NEW: Extract multiple amenities and "Other" amenity
    # ============================================================
    amenities_ids = data.get('amenities') or []  # Array of amenity IDs: ["1", "4", "7"]
    other_amenity = data.get('other_amenity')  # Custom amenity text: "Pet-Friendly"

    # Validate required fields
    if not email or not password or not name:
        return JsonResponse({'error': 'Missing required registration fields.'}, status=400)

    # ============================================================
    # Verify OTP
    # ============================================================
    otp_ok = False
    try:
        otp_entry = OTP.objects.get(email=email)
        if otp_entry.code == otp_code:
            otp_ok = True
    except OTP.DoesNotExist:
        session_otp = request.session.get('otp')
        session_email = request.session.get('otp_email')
        if session_email == email and session_otp == otp_code:
            otp_ok = True

    if not otp_ok:
        return JsonResponse({'error': 'Invalid or expired OTP.'}, status=400)

    # ============================================================
    # Create User
    # ============================================================
    user, created = User.objects.get_or_create(username=email, defaults={'email': email})
    user.set_password(password)
    user.is_active = True
    user.save()

    # ============================================================
    # Parse time strings to time objects
    # ============================================================
    from datetime import time as dt_time

    opening_time_str = data.get('opening_time')
    closing_time_str = data.get('closing_time')

    opening_time = None
    closing_time = None

    if opening_time_str:
        try:
            opening_time = dt_time.fromisoformat(opening_time_str)
        except ValueError as e:
            print(f"⚠️ Invalid opening_time format: {opening_time_str} - {e}")

    if closing_time_str:
        try:
            closing_time = dt_time.fromisoformat(closing_time_str)
        except ValueError as e:
            print(f"⚠️ Invalid closing_time format: {closing_time_str} - {e}")

    # ============================================================
    # ✅ UPDATED: Create establishment without single 'category' field
    # Note: We now use 'categories' (ManyToMany) and 'other_category' (CharField)
    # ============================================================
    establishment = FoodEstablishment.objects.create(
        owner=user,
        name=name,
        address=address,
        opening_time=opening_time,
        closing_time=closing_time,
        latitude=float(latitude) if latitude else None,
        longitude=float(longitude) if longitude else None,
        payment_methods=payment_methods or '',
        other_category=other_category,  # ✅ NEW: Store custom category text
        other_amenity=other_amenity  # ✅ NEW: Store custom amenity text
    )

    # ============================================================
    # ✅ NEW: Link multiple categories (ManyToMany relationship)
    # ============================================================
    if categories_ids:
        try:
            # Convert string IDs to integers and filter valid categories
            valid_category_ids = [int(cid) for cid in categories_ids if str(cid).isdigit()]
            if valid_category_ids:
                establishment.categories.set(Category.objects.filter(id__in=valid_category_ids))
                print(f"✅ Linked {len(valid_category_ids)} categories to establishment: {name}")
            else:
                print(f"⚠️ No valid category IDs found")
        except Exception as e:
            print(f"⚠️ Error setting categories: {e}")
            establishment.categories.clear()

    # ============================================================
    # ✅ UPDATED: Link multiple amenities
    # ============================================================
    if amenities_ids:
        try:
            # Convert string IDs to integers and filter valid amenities
            valid_amenity_ids = [int(aid) for aid in amenities_ids if str(aid).isdigit()]
            if valid_amenity_ids:
                establishment.amenities.set(Amenity.objects.filter(id__in=valid_amenity_ids))
                print(f"✅ Linked {len(valid_amenity_ids)} amenities to establishment: {name}")
            else:
                print(f"⚠️ No valid amenity IDs found")
        except Exception as e:
            print(f"⚠️ Error setting amenities: {e}")
            establishment.amenities.clear()

    # ============================================================
    # Handle uploaded image
    # ============================================================
    if 'profile_image' in request.FILES:
        establishment.image = request.FILES['profile_image']
    elif 'cover_image' in request.FILES:
        establishment.image = request.FILES['cover_image']

    establishment.save()

    # ============================================================
    # Auto-login user
    # ============================================================
    user = authenticate(request, username=email, password=password)
    if user:
        login(request, user)
        request.session['food_establishment_id'] = establishment.id
    else:
        try:
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            request.session['food_establishment_id'] = establishment.id
        except Exception as e:
            print(f"⚠️ Auto-login failed: {e}")

    # ============================================================
    # Clean up OTPs
    # ============================================================
    OTP.objects.filter(email=email).delete()
    request.session.pop('otp', None)
    request.session.pop('otp_email', None)

    print(f"✅ Registration successful for {name}")
    print(f"   - Categories: {list(establishment.categories.values_list('name', flat=True))}")
    print(f"   - Other Category: {establishment.other_category}")
    print(f"   - Amenities: {list(establishment.amenities.values_list('name', flat=True))}")
    print(f"   - Other Amenity: {establishment.other_amenity}")

    return JsonResponse({'success': True, 'redirect_url': '/food_establishment/dashboard/'})


@login_required(login_url='owner_login')
def food_establishment_dashboard(request):
    establishment_id = request.session.get('food_establishment_id')
    if not establishment_id:
        messages.error(request, 'You must be logged in to view this page.')
        return redirect('owner_login')

    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
    is_suspended = establishment.status == 'Disabled'

    if request.method == 'POST':
        # ========================================
        # ✅ ADD NEW MENU ITEM - COMPLETE FIX WITH BETTER ERROR HANDLING
        # ========================================
        if 'add_menu_item' in request.POST:
            try:
                menu_token = request.POST.get('menu_add_token')

                # Deduplication
                if menu_token:
                    try:
                        processed_menu = request.session.get('processed_menu_add_tokens', {})
                        now_ts = time.time()
                        # Clean old tokens
                        for tkn, ts in list(processed_menu.items()):
                            if now_ts - float(ts) > 300:
                                processed_menu.pop(tkn, None)
                        # Check if already processed
                        if menu_token in processed_menu:
                            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                                return JsonResponse({'success': True, 'skipped': True})
                            return redirect('food_establishment_dashboard')
                        # Mark as processed
                        processed_menu[menu_token] = now_ts
                        request.session['processed_menu_add_tokens'] = processed_menu
                        request.session.modified = True
                    except Exception as token_error:
                        print(f"Token handling error: {token_error}")
                        # Continue anyway - don't fail because of token issues

                menu_item_form = MenuItemForm(request.POST, request.FILES)

                if menu_item_form.is_valid():
                    try:
                        menu_item = menu_item_form.save(commit=False)
                        menu_item.food_establishment = establishment

                        # Set default quantity if not provided
                        if not hasattr(menu_item, 'quantity') or menu_item.quantity is None:
                            menu_item.quantity = 0

                        # ✅ Duplicate name guard: if an item with the same name already
                        # exists for this establishment, stack the quantity instead of
                        # creating a duplicate entry.
                        existing = MenuItem.objects.filter(
                            food_establishment=establishment,
                            name__iexact=menu_item.name.strip()
                        ).first()

                        if existing:
                            added_qty = menu_item.quantity or 0
                            existing.quantity = (existing.quantity or 0) + added_qty
                            # Update price/description/image if the owner filled them in
                            if menu_item_form.cleaned_data.get('price'):
                                existing.price = menu_item_form.cleaned_data['price']
                            if menu_item_form.cleaned_data.get('description'):
                                existing.description = menu_item_form.cleaned_data['description']
                            if request.FILES.get('image'):
                                existing.image = menu_item_form.cleaned_data['image']
                            existing.save()
                            invalidate_establishment_cache(establishment.id)
                            menu_item = existing
                            stacked = True
                        else:
                            menu_item.save()
                            invalidate_establishment_cache(establishment.id)  # ✅ instant client sync
                            stacked = False

                        # ✅ CRITICAL: Return complete item data for AJAX
                        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                            # Get absolute URL for image
                            image_url = ''
                            if menu_item.image:
                                try:
                                    image_url = request.build_absolute_uri(menu_item.image.url)
                                except Exception as img_error:
                                    print(f"Image URL error: {img_error}")
                                    image_url = ''

                            item_data = {
                                'id': menu_item.id,
                                'name': menu_item.name,
                                'description': menu_item.description,
                                'price': str(menu_item.price),
                                'quantity': menu_item.quantity,
                                'is_top_seller': menu_item.is_top_seller,
                                'image_url': image_url,
                            }

                            return JsonResponse({
                                'success': True,
                                'message': f"'{menu_item.name}' already exists — quantity updated to {menu_item.quantity}!" if stacked else f"'{menu_item.name}' added successfully!",
                                'stacked': stacked,
                                'item': item_data,
                                'new_menu_token': str(uuid.uuid4())
                            })

                        if stacked:
                            messages.success(request, f"'{menu_item.name}' already exists — quantity updated to {menu_item.quantity}!")
                        else:
                            messages.success(request, f"'{menu_item.name}' added to your menu!")
                        return redirect('food_establishment_dashboard')

                    except Exception as save_error:
                        print(f"❌ Error saving menu item: {save_error}")
                        import traceback
                        traceback.print_exc()

                        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                            return JsonResponse({
                                'success': False,
                                'error': f'Error saving item: {str(save_error)}'
                            }, status=400)
                        messages.error(request, f"Error saving menu item: {str(save_error)}")
                        return redirect('food_establishment_dashboard')
                else:
                    # Return validation errors
                    print(f"❌ Form validation errors: {menu_item_form.errors}")

                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        errors = {}
                        for field, error_list in menu_item_form.errors.items():
                            errors[field] = [str(e) for e in error_list]

                        error_message = '; '.join([
                            f"{field}: {', '.join(errs)}"
                            for field, errs in errors.items()
                        ])

                        return JsonResponse({
                            'success': False,
                            'error': f"Validation failed: {error_message}",
                            'errors': errors
                        }, status=400)

                    messages.error(request, "Please correct the errors in the form.")
                    for field, errors in menu_item_form.errors.items():
                        for error in errors:
                            messages.error(request, f"{field}: {error}")
                    return redirect('food_establishment_dashboard')

            except Exception as outer_error:
                print(f"❌ Outer exception in add_menu_item: {outer_error}")
                import traceback
                traceback.print_exc()

                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'error': f'Unexpected error: {str(outer_error)}'
                    }, status=500)

                messages.error(request, f"An error occurred: {str(outer_error)}")
                return redirect('food_establishment_dashboard')

        # UPDATE STORE DETAILS
        elif 'update_status' in request.POST:
            try:
                status_form = FoodEstablishmentUpdateForm(request.POST, request.FILES, instance=establishment)
                if status_form.is_valid():
                    status_form.save()
                    invalidate_establishment_cache(establishment.id)
                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        return JsonResponse({'success': True, 'message': 'Store details updated successfully!'})
                    messages.success(request, 'Store details updated successfully!')
                else:
                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        errors = {field: [str(e) for e in errs] for field, errs in status_form.errors.items()}
                        return JsonResponse({'success': False, 'errors': errors}, status=400)
                    for field, errs in status_form.errors.items():
                        for error in errs:
                            messages.error(request, f"{field}: {error}")
            except Exception as e:
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'error': str(e)}, status=500)
                messages.error(request, f"Error updating store details: {str(e)}")
            return redirect('food_establishment_dashboard')

    # GET request
    status_form = FoodEstablishmentUpdateForm(instance=establishment)
    menu_item_form = MenuItemForm()
    menu_items = MenuItem.objects.filter(food_establishment=establishment).order_by('-is_top_seller', 'name')
    dashboard_reviews = Review.objects.filter(establishment=establishment).order_by('-created_at')
    total_reviews = dashboard_reviews.count()
    average_rating = round(dashboard_reviews.aggregate(Avg('rating'))['rating__avg'] or 0, 1)
    top_sellers_count = sum(1 for item in menu_items if item.is_top_seller)

    context = {
        'establishment': establishment,
        'status_form': status_form,
        'menu_items': menu_items,
        'menu_item_form': menu_item_form,
        'is_suspended': is_suspended,
        'dashboard_reviews': dashboard_reviews,
        'total_reviews': total_reviews,
        'average_rating': average_rating,
        'update_token': str(uuid.uuid4()),
        'menu_add_token': str(uuid.uuid4()),
        'pk': establishment.pk,
        'top_sellers_count': top_sellers_count,
    }

    return render(request, 'webapplication/food_establishment_dashboard.html', context)


def toggle_item_availability(request, item_id):
    if request.method == 'POST':
        item = get_object_or_404(MenuItem, id=item_id, establishment=request.user.food_establishment)
        item.is_available = not item.is_available
        item.save()
        return redirect('food_establishment_dashboard')
    return HttpResponseBadRequest()


@login_required(login_url='owner_login')
@require_POST
@transaction.atomic
def delete_menu_item(request, item_id):
    """
    Delete a menu item.
    1. Reads { delete_reason } from the JSON body (sent by the dashboard modal).
    2. Finds all active 'request' orders that contain this item.
    3. Cancels those orders (status → 'cancelled') so the client order history
       shows "Cancelled by Owner" with the delete reason in real time.
    4. Broadcasts order_status_update (with cancel_reason) to each affected user
       so buildCancelledByOwnerBadge(reason) renders immediately on the client.
    5. Broadcasts the inventory quantity_update (deleted=True) for any cart pages.
    """
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': 'You must be logged in as an owner.'}, status=403)
        messages.error(request, "You must be logged in as an owner.")
        return redirect('owner_login')

    try:
        food_establishment = get_object_or_404(FoodEstablishment, pk=establishment_id)
        menu_item = get_object_or_404(MenuItem, pk=item_id, food_establishment=food_establishment)
        item_name = menu_item.name
        _est_id_for_cache = menu_item.food_establishment_id

        # ── 1. Read delete reason from JSON body ─────────────────────
        delete_reason = ''
        try:
            body = json.loads(request.body or '{}')
            delete_reason = str(body.get('delete_reason', '')).strip()
        except Exception:
            delete_reason = request.POST.get('delete_reason', '').strip()

        if not delete_reason:
            delete_reason = f'"{item_name}" was removed from the menu.'

        # ── 2. Collect affected orders BEFORE deleting anything ──────
        # 'request' orders → cancel them fully (not yet accepted/paid)
        # 'to_pay' orders  → notify client only (timer stops, reason shown,
        #                     Pay Now removed) but do NOT force-cancel since
        #                     payment may already be in flight. The client
        #                     will see "Cancelled by Owner" + reason + Remove.
        affected_request_orders = []
        affected_topay_orders   = []
        try:
            for oi in OrderItem.objects.filter(
                menu_item=menu_item,
                order__status__in=['request', 'to_pay']
            ).select_related('order__user', 'order__establishment').distinct():
                if oi.order.status == 'request':
                    affected_request_orders.append(oi.order)
                else:
                    affected_topay_orders.append(oi.order)
        except Exception as _e:
            print(f"WARNING: Could not collect affected orders: {_e}")

        # Merge for broadcast loop
        affected_orders = affected_request_orders + affected_topay_orders

        # ── 3. Cancel 'request' orders in DB (to_pay left as-is) ────
        for order in affected_request_orders:
            try:
                with transaction.atomic():
                    order.status = 'cancelled'
                    order.save(update_fields=['status', 'updated_at'])
            except Exception as _ce:
                print(f"WARNING: Could not cancel order #{order.id}: {_ce}")

        # ── 4. Delete ALL related OrderItems (includes non-request) ──
        try:
            related_order_items = OrderItem.objects.filter(menu_item=menu_item)
            if related_order_items.exists():
                print(f"Deleting {related_order_items.count()} related OrderItem(s) for menu item {item_id}...")
                related_order_items.delete()
        except Exception as e:
            print(f"WARNING: Could not delete related OrderItems: {e}")

        # ── 5. Delete the menu item itself ───────────────────────────
        MenuItem.objects.filter(pk=item_id)._raw_delete(using=MenuItem.objects.db)
        invalidate_establishment_cache(_est_id_for_cache)

        # ── 6. Broadcast to all affected users via WS ────────────────
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                sync_send = async_to_sync(channel_layer.group_send)

                # 6a. Inventory channel — updates cart pages + dashboard badges
                sync_send(
                    f'inventory_{_est_id_for_cache}',
                    {
                        'type':    'inventory.quantity_update',
                        'updates': [{
                            'menu_item_id': item_id,
                            'new_quantity': -1,
                            'deleted':      True,
                            'item_name':    item_name,
                            'delete_reason': delete_reason,
                        }]
                    }
                )

                # 6b. Per-user order_status_update — triggers buildCancelledByOwnerBadge
                # on the client order history page with the real reason text.
                # Sent for BOTH 'request' (cancelled) and 'to_pay' (timer stopped, reason shown).
                seen = set()
                for order in affected_orders:
                    uid = order.user_id
                    if uid in seen:
                        continue
                    seen.add(uid)
                    cancel_msg = f'Menu item "{item_name}" was deleted by the establishment. Reason: {delete_reason}'
                    try:
                        sync_send(
                            f'order_status_user_{uid}',
                            {
                                'type':             'order.status.update',
                                'order_id':         order.id,
                                'new_status':       'cancelled',
                                'establishment_id': _est_id_for_cache,
                                'user_id':          uid,
                                'cancel_reason':    cancel_msg,
                            }
                        )
                    except Exception as _ue:
                        print(f"WARNING: WS push failed for user {uid}: {_ue}")

        except Exception as e:
            print(f"WARNING: Could not broadcast item deletion: {e}")

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'"{item_name}" has been deleted from your menu.',
                'item_id': item_id
            })

        messages.success(request, f'"{item_name}" has been deleted from your menu.', extra_tags='owner_only')
        return redirect('food_establishment_dashboard')

    except Exception as e:
        print(f"Error deleting menu item: {e}")

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'An error occurred while deleting: {str(e)}'
            }, status=500)

        messages.error(request, f'An error occurred while deleting the menu item: {str(e)}', extra_tags='owner_only')
        return redirect('food_establishment_dashboard')


@login_required(login_url='owner_login')
@login_required(login_url='owner_login')
def store_ratings(request):
    """
    Full-page ratings & reviews dashboard for the food establishment owner.
    URL:      /owner/ratings/
    Template: webapplication/store_ratings.html
    """
    establishment = get_object_or_404(FoodEstablishment, owner=request.user)
    reviews = Review.objects.filter(
        establishment=establishment
    ).select_related('user').order_by('-created_at')

    rating_data    = reviews.aggregate(avg=Avg('rating'), count=Count('id'))
    average_rating = round(rating_data['avg'] or 0, 1)
    total_reviews  = rating_data['count'] or 0

    context = {
        'establishment':  establishment,
        'reviews':        reviews,
        'average_rating': average_rating,
        'total_reviews':  total_reviews,
        'pk':             establishment.pk,
    }
    return render(request, 'webapplication/store_ratings.html', context)


def store_reviews_view(request):
    """
    Legacy view — kept for backward compatibility.
    Renders the page for the food establishment owner to view their store's reviews.
    """
    establishment_id = request.session.get('food_establishment_id')
    if not establishment_id:
        messages.error(request, "You must be logged in to view this page.")
        return redirect('food_establishment_login')

    establishment = get_object_or_404(FoodEstablishment, pk=establishment_id)
    reviews = Review.objects.filter(establishment=establishment).order_by('-created_at')

    context = {
        'establishment': establishment,
        'reviews': reviews,
    }
    return render(request, 'webapplication/store_reviews.html', context)


@login_required(login_url='owner_login')
@require_POST
def edit_menu_item(request, item_id):
    """Edit menu item with AJAX support for real-time updates"""
    food_establishment_id = request.session.get('food_establishment_id')

    if not food_establishment_id:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Not authorized'}, status=403)
        messages.error(request, "You must be logged in as an owner.")
        return redirect('owner_login')

    establishment = get_object_or_404(FoodEstablishment, id=food_establishment_id)
    menu_item = get_object_or_404(MenuItem, id=item_id, food_establishment=establishment)

    form = MenuItemForm(request.POST, request.FILES, instance=menu_item)

    if form.is_valid():
        form.save()
        menu_item.refresh_from_db()
        invalidate_establishment_cache(menu_item.food_establishment_id)  # ✅ instant client sync

        # ✅ CRITICAL: Return item data for real-time update
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            item_data = {
                'id': menu_item.id,
                'name': menu_item.name,
                'description': menu_item.description,
                'price': str(menu_item.price),
                'quantity': menu_item.quantity if hasattr(menu_item, 'quantity') else 0,
                'is_top_seller': menu_item.is_top_seller,
                'image_url': menu_item.image.url if menu_item.image else '',
            }
            return JsonResponse({
                'success': True,
                'message': f"'{menu_item.name}' updated successfully!",
                'item': item_data
            })

        messages.success(request, f"'{menu_item.name}' updated successfully.")
        return redirect("food_establishment_dashboard")
    else:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            errors = '; '.join([f"{field}: {', '.join(errors)}" for field, errors in form.errors.items()])
            return JsonResponse({
                'success': False,
                'error': f"Validation failed: {errors}"
            })

        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"Error in '{form.fields[field].label}': {error}")
        return redirect("food_establishment_dashboard")


@csrf_exempt
@require_http_methods(["PATCH"])
def toggle_establishment_status(request, establishment_id):
    """
    Toggles the status of a food establishment between 'Open' and 'Disabled'.
    """
    try:
        establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
        current_status = establishment.status

        if current_status == 'Open':
            establishment.status = 'Disabled'
            message = "Food establishment successfully disabled."
        else:
            establishment.status = 'Open'
            message = "Food establishment successfully enabled."

        establishment.save()
        return JsonResponse({'message': message, 'status': establishment.status})
    except FoodEstablishment.DoesNotExist:
        return HttpResponseBadRequest("Food establishment not found.")


@login_required(login_url='owner_login')
@require_POST
def toggle_top_seller(request, item_id):
    """
    Toggles a specific menu item's 'is_top_seller' status.
    Returns JSON for AJAX requests; redirects for normal form POSTs.
    """
    item = get_object_or_404(MenuItem, id=item_id)
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id or item.food_establishment.id != int(establishment_id):
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': 'Not authorized.'}, status=403)
        messages.error(request, "You are not authorized to perform this action.", extra_tags='owner_only')
        return redirect(reverse_lazy('food_establishment_dashboard'))

    item.is_top_seller = not item.is_top_seller

    if item.is_top_seller:
        item.top_seller_marked_at = timezone.now()
    else:
        item.top_seller_marked_at = None

    item.save()
    invalidate_establishment_cache(item.food_establishment_id)  # ✅ instant client sync

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if is_ajax:
        # AJAX: return JSON only — no Django session messages so nothing leaks to kabsueats
        return JsonResponse({
            'success': True,
            'is_top_seller': item.is_top_seller,
            'message': f"'{item.name}' has been {'marked' if item.is_top_seller else 'unmarked'} as a top seller.",
            'item_id': item_id,
        })

    # Non-AJAX fallback: tag as owner_only so kabsueats filters it out
    if item.is_top_seller:
        messages.success(request, f"'{item.name}' has been marked as a top seller.", extra_tags='owner_only')
    else:
        messages.info(request, f"'{item.name}' has been unmarked as a top seller.", extra_tags='owner_only')

    return redirect(reverse_lazy('food_establishment_dashboard'))


@login_required(login_url='owner_login')
@require_http_methods(["POST"])
def update_establishment_details_ajax(request, pk):
    """
    AJAX endpoint for updating establishment details in real-time.
    Bypasses FoodEstablishmentUpdateForm to avoid false validation errors.
    Returns JSON response with updated data for instant UI updates.
    """
    from datetime import time as dt_time

    # ── Ownership check ────────────────────────────────────────────────────
    try:
        establishment = FoodEstablishment.objects.get(pk=pk, owner=request.user)
    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Establishment not found or access denied.'
        }, status=404)

    try:
        # ── Name (required) ────────────────────────────────────────────────
        import re
        name = request.POST.get('name', '').strip()
        if not name:
            return JsonResponse({'success': False, 'error': 'Establishment name is required.'}, status=400)
        if len(name) < 3:
            return JsonResponse({'success': False, 'error': 'Establishment name must be at least 3 characters.'}, status=400)
        if len(name) > 80:
            return JsonResponse({'success': False, 'error': 'Establishment name must be 80 characters or fewer.'}, status=400)
        if not re.match(r"^[a-zA-Z0-9\s'\-&.,áéíóúÁÉÍÓÚñÑ]+$", name):
            return JsonResponse({'success': False, 'error': 'Establishment name contains invalid characters.'}, status=400)
        establishment.name = name

        # ── Payment Methods ────────────────────────────────────────────────
        payment_methods = request.POST.get('payment_methods', '').strip()
        allowed_payments = {'Cash', 'GCash'}
        if payment_methods:
            submitted = {p.strip() for p in payment_methods.split(',')}
            invalid = submitted - allowed_payments
            if invalid:
                return JsonResponse({'success': False, 'error': f'Invalid payment method(s): {", ".join(invalid)}'}, status=400)
        establishment.payment_methods = payment_methods

        # ── Address ────────────────────────────────────────────────────────
        address = request.POST.get('address', '').strip()
        if address:
            establishment.address = address

        # ── Coordinates ────────────────────────────────────────────────────
        lat = request.POST.get('latitude', '').strip()
        lng = request.POST.get('longitude', '').strip()
        if lat:
            try:
                establishment.latitude = float(lat)
            except ValueError:
                pass
        if lng:
            try:
                establishment.longitude = float(lng)
            except ValueError:
                pass

        # ── Opening / Closing Time ─────────────────────────────────────────
        opening_time_str = request.POST.get('opening_time', '').strip()
        closing_time_str = request.POST.get('closing_time', '').strip()

        if opening_time_str:
            try:
                establishment.opening_time = dt_time.fromisoformat(opening_time_str)
            except ValueError:
                pass  # keep existing value if parse fails

        if closing_time_str:
            try:
                establishment.closing_time = dt_time.fromisoformat(closing_time_str)
            except ValueError:
                pass

        # ── Other category / amenity free-text ────────────────────────────
        establishment.other_category = request.POST.get('other_category', '').strip() or None
        establishment.other_amenity = request.POST.get('other_amenity', '').strip() or None

        # ── Image upload ───────────────────────────────────────────────────
        if 'image' in request.FILES:
            image_file = request.FILES['image']
            # Reject files over 5 MB
            if image_file.size > 5 * 1024 * 1024:
                return JsonResponse({
                    'success': False,
                    'error': 'Image must be under 5 MB.'
                }, status=400)
            # Reject non-image content types
            allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
            if image_file.content_type not in allowed_types:
                return JsonResponse({
                    'success': False,
                    'error': 'Only JPG, PNG, or WEBP images are accepted.'
                }, status=400)
            establishment.image = image_file

        # ── Save scalar fields ─────────────────────────────────────────────
        establishment.save()
        invalidate_establishment_cache(establishment.id)  # ✅ instant client sync

        # ── Categories (M2M) ──────────────────────────────────────────────
        category_ids = request.POST.getlist('categories')
        if category_ids:
            from .models import Category
            valid_categories = Category.objects.filter(id__in=category_ids)
            establishment.categories.set(valid_categories)
        else:
            establishment.categories.clear()

        # ── Amenities (M2M) ───────────────────────────────────────────────
        amenity_ids = request.POST.getlist('amenities')
        if amenity_ids:
            from .models import Amenity
            valid_amenities = Amenity.objects.filter(id__in=amenity_ids)
            establishment.amenities.set(valid_amenities)
        else:
            establishment.amenities.clear()

        # ── Refresh to get accurate M2M data ──────────────────────────────
        establishment.refresh_from_db()

        # ── Build response payload ─────────────────────────────────────────
        # Support both `calculated_status` property name variants
        if hasattr(establishment, 'calculated_status'):
            status_val = establishment.calculated_status
        else:
            status_val = establishment.status

        data = {
            'success': True,
            'message': 'Establishment details updated successfully.',
            'name': establishment.name,
            'address': establishment.address,
            'status': status_val,
            'opening_time': establishment.opening_time.strftime('%I:%M %p') if establishment.opening_time else None,
            'closing_time': establishment.closing_time.strftime('%I:%M %p') if establishment.closing_time else None,
            'categories': [{'id': cat.id, 'name': cat.name} for cat in establishment.categories.all()],
            'categories_str': ', '.join([cat.name for cat in establishment.categories.all()]),
            'other_category': establishment.other_category,
            'payment_methods': establishment.payment_methods,
            'latitude': str(establishment.latitude) if establishment.latitude else None,
            'longitude': str(establishment.longitude) if establishment.longitude else None,
            'image_url': establishment.image.url if establishment.image else '',
            'amenities': ', '.join([a.name for a in establishment.amenities.all()]),
            'amenities_list': [{'id': a.id, 'name': a.name} for a in establishment.amenities.all()],
            'other_amenity': establishment.other_amenity,
        }

        return JsonResponse(data)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'A server error occurred: {str(e)}'
        }, status=500)

@login_required(login_url='owner_login')
@require_http_methods(["GET"])
def get_establishment_details_ajax(request, pk):
    """
    AJAX endpoint to get current establishment details.
    Useful for refreshing data without page reload.
    """
    try:
        establishment = FoodEstablishment.objects.get(pk=pk, owner=request.user)

        data = {
            'success': True,
            'establishment': {
                'id': establishment.id,
                'name': establishment.name,
                'address': establishment.address,
                'status': establishment.calculated_status,
                'opening_time': establishment.opening_time.strftime('%I:%M %p') if establishment.opening_time else None,
                'closing_time': establishment.closing_time.strftime('%I:%M %p') if establishment.closing_time else None,
                'opening_time_24h': establishment.opening_time.strftime(
                    '%H:%M') if establishment.opening_time else None,
                'closing_time_24h': establishment.closing_time.strftime(
                    '%H:%M') if establishment.closing_time else None,
                'categories': [{'id': cat.id, 'name': cat.name} for cat in establishment.categories.all()],
                'categories_str': ', '.join([cat.name for cat in establishment.categories.all()]),
                'other_category': establishment.other_category,
                'payment_methods': establishment.payment_methods,
                'latitude': float(establishment.latitude) if establishment.latitude else None,
                'longitude': float(establishment.longitude) if establishment.longitude else None,
                'image_url': establishment.image.url if establishment.image else None,
                'amenities': [{'id': a.id, 'name': a.name} for a in establishment.amenities.all()],
                'other_amenity': establishment.other_amenity,
            }
        }

        return JsonResponse(data)

    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Establishment not found or access denied.'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# ===================================================================================================================
# ================================================END OWNER ========================================================
# ===================================================================================================================
# =======================================================================
# CART MANAGEMENT
# =======================================================================
from django.db import transaction
from .models import MenuItem, OrderItem


@transaction.atomic
def handle_payment_success(order):
    """When payment is confirmed, reduce item stock."""
    for item in order.items.all():
        menu_item = item.menu_item
        menu_item.reduce_stock(item.quantity)

@login_required
@require_POST
def add_to_cart(request):
    """
    ✅ FIXED: Now properly handles JSON requests from Best Sellers section
    Adds a MenuItem to cart. Supports multiple establishments.
    """
    try:
        # ✅ FIX: Parse JSON body instead of POST data
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            menu_item_id = data.get('menu_item_id')
            establishment_id = data.get('establishment_id')
            quantity = int(data.get('quantity', 1))
        else:
            # Support form-encoded data too
            menu_item_id = request.POST.get('menu_item_id')
            establishment_id = request.POST.get('establishment_id')
            quantity = int(request.POST.get('quantity', 1))

        if not menu_item_id or quantity <= 0:
            return JsonResponse({
                'success': False,
                'message': 'Invalid item or quantity.'
            }, status=400)

        # Fetch the menu item with establishment
        menu_item = get_object_or_404(
            MenuItem.objects.select_related('food_establishment'),
            pk=menu_item_id
        )

        establishment = menu_item.food_establishment

        # ✅ Verify establishment_id matches (if provided)
        if establishment_id and str(establishment.id) != str(establishment_id):
            return JsonResponse({
                'success': False,
                'message': 'Establishment mismatch error.'
            }, status=400)

        # ✅ If no stock at all, block early
        if menu_item.quantity <= 0:
            return JsonResponse({
                'success': False,
                'message': f'{menu_item.name} is out of stock.'
            }, status=400)

        # ✅ Block if customer has already committed max stock across request + to_pay orders
        committed_qty = OrderItem.objects.filter(
            order__user=request.user,
            order__establishment=establishment,
            order__status__in=('request', 'to_pay'),
            menu_item=menu_item,
        ).aggregate(total=Sum('quantity'))['total'] or 0
        remaining_stock = max(0, menu_item.quantity - committed_qty)
        if remaining_stock <= 0:
            return JsonResponse({
                'success': False,
                'message': (
                    f'You already have {committed_qty}x {menu_item.name} in an active order '
                    f'(max stock is {menu_item.quantity}). '
                    f'Wait for it to be fulfilled before ordering more.'
                )
            }, status=400)

        stacked_on_request = False
        existing_request_qty = 0
        request_order_qty = 0  # qty in the request order only — used for accurate display message

        with transaction.atomic():
            # ── Find the best existing open order to stack items onto ────
            # Priority 1: an existing PENDING (cart) order for this establishment
            # Priority 2: an existing 'request' order still waiting for owner
            #             acceptance — customer is adding more items before the
            #             owner has acted on the original request.
            # If neither exists, create a fresh PENDING order.
            pending_order = Order.objects.filter(
                user=request.user,
                establishment=establishment,
                status='PENDING'
            ).order_by('-created_at').first()

            request_order = Order.objects.filter(
                user=request.user,
                establishment=establishment,
                status='request'
            ).order_by('-created_at').first()

            order = pending_order or request_order

            # ── Check if stacking on a 'request' order ────────────────────
            if request_order:
                stacked_on_request = True
                existing_req_item = OrderItem.objects.filter(
                    order=request_order,
                    menu_item=menu_item
                ).first()
                # request_order_qty = qty in the request order ONLY (for display in modal message)
                request_order_qty  = existing_req_item.quantity if existing_req_item else 0
                # existing_request_qty = combined total (request + pending cart) used for the
                # combined > max_stock check on the frontend
                existing_request_qty = request_order_qty

                if pending_order:
                    pending_item = OrderItem.objects.filter(
                        order=pending_order,
                        menu_item=menu_item
                    ).first()
                    if pending_item:
                        existing_request_qty += pending_item.quantity

                # Always route new items into a PENDING cart order so cart
                # is never empty — merge happens at create_cash_order time.
                if not pending_order:
                    order = Order.objects.create(
                        user=request.user,
                        establishment=establishment,
                        status='PENDING',
                        total_amount=0,
                    )
                    pending_order = order
                else:
                    order = pending_order

            if order is None:
                order = Order.objects.create(
                    user=request.user,
                    establishment=establishment,
                    status='PENDING',
                    total_amount=0,
                )

            # Clean up any extra duplicate PENDING orders for this establishment
            duplicate_pending = Order.objects.filter(
                user=request.user,
                establishment=establishment,
                status='PENDING'
            ).exclude(pk=order.pk).values_list('id', flat=True)
            if duplicate_pending:
                Order.objects.filter(id__in=list(duplicate_pending)).delete()

            # Get or create OrderItem — stack quantity if item already exists
            order_item, item_created = OrderItem.objects.get_or_create(
                order=order,
                menu_item=menu_item,
                defaults={
                    'quantity': min(quantity, menu_item.quantity),
                    'price_at_order': menu_item.price,
                }
            )

            if not item_created:
                # Accumulate — clamp to available stock
                new_quantity = min(order_item.quantity + quantity, menu_item.quantity)
                order_item.quantity = new_quantity
                order_item.save()

            # Update order total
            order_total = sum(
                item.quantity * item.price_at_order
                for item in order.orderitem_set.all()
            )
            order.total_amount = order_total
            order.save()

        # Calculate total cart count across PENDING + request orders
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        actual_qty = min(quantity, menu_item.quantity)
        return JsonResponse({
            'success': True,
            'message': f'{actual_qty}x {menu_item.name} added to cart',
            'cart_count': total_cart_count,
            # ── Extra info for the cart page ──────────────────────────────
            # stacked_on_request = True means the customer already has a
            # submitted (pending-owner) 'request' order for this establishment.
            # The new item goes into a PENDING cart order as usual, but when
            # the customer hits "Request Order" on the cart page the two orders
            # will be merged.  We surface these flags so the cart page can
            # show the customer an appropriate informational message.
            'stacked_on_request': stacked_on_request,
            'existing_request_qty': existing_request_qty,  # combined (request + pending) — for combined > max check
            'request_order_qty': request_order_qty,         # request order only — for accurate display message
            'max_stock': menu_item.quantity,
        })

    except ValueError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid quantity value.'
        }, status=400)
    except Exception as e:
        import traceback
        print(f"❌ Error in add_to_cart: {e}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': 'An error occurred while adding to cart.'
        }, status=500)

@login_required
@require_POST
def paymongo_checkout(request):
    """Alternative checkout method - redirects to payment link creation"""
    try:
        # This just calls create_gcash_payment_link
        return create_gcash_payment_link(request)
    except Exception as e:
        print(f"Checkout error: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Checkout failed'
        }, status=500)


def payment_status(request, status):
    """payment status page"""
    if status == 'success':
        title = "Payment Successful!"
        message = "Your order has been placed successfully."
    elif status == 'cancel':
        title = "Payment Cancelled"
        message = "Your payment was cancelled. You can try again from your cart."
    else:
        title = "Payment Status"
        message = "Unknown payment status."

    context = {
        'title': title,
        'message': message,
        'is_success': status == 'success',
        'home_url': reverse('kabsueats_home')
    }
    return render(request, 'webapplication/payment_status.html', context)


@login_required
@require_POST
def clear_cart(request):
    """Clear cart"""
    try:
        Order.objects.filter(user=request.user, status='PENDING').delete()
        return JsonResponse({
            'success': True,
            'message': 'Cart cleared',
            'cart_count': 0
        })
    except Exception as e:
        print(f"Error clearing cart: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error clearing cart'
        }, status=500)


@login_required
@require_POST
def update_cart_item(request):
    """
    Update quantity of an item in cart
    ✅ FIXED: Real-time quantity updates with stock checking
    """
    try:
        order_item_id = request.POST.get('order_item_id')
        new_quantity = int(request.POST.get('quantity', 1))

        if not order_item_id or new_quantity < 1:
            return JsonResponse({
                'success': False,
                'message': 'Invalid quantity'
            }, status=400)

        # Get the order item
        order_item = get_object_or_404(
            OrderItem.objects.select_related('order', 'menu_item'),
            pk=order_item_id,
            order__user=request.user
        )

        # Check stock availability
        if new_quantity > order_item.menu_item.quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {order_item.menu_item.quantity} items available'
            }, status=400)

        with transaction.atomic():
            # Update quantity
            order_item.quantity = new_quantity
            order_item.save()

            # Update order total
            order = order_item.order
            order_total = sum(
                item.quantity * item.price_at_order
                for item in order.orderitem_set.all()
            )
            order.total_amount = order_total
            order.save()

        # Calculate total cart count (PENDING cart + request orders awaiting acceptance)
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'message': 'Cart updated',
            'cart_count': total_cart_count,
            'item_total': float(order_item.quantity * order_item.price_at_order),
            'order_total': float(order.total_amount)
        })

    except ValueError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid quantity value'
        }, status=400)
    except Exception as e:
        print(f"Error updating cart: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'message': 'An error occurred while updating cart.'
        }, status=500)


@login_required
@require_POST
def remove_from_cart(request):
    """
    Remove an item from cart
    ✅ FIXED: Proper deletion and cart count update
    """
    try:
        order_item_id = request.POST.get('order_item_id')

        if not order_item_id:
            return JsonResponse({
                'success': False,
                'message': 'Invalid item ID'
            }, status=400)

        # Get the order item
        order_item = get_object_or_404(
            OrderItem.objects.select_related('order', 'menu_item'),
            pk=order_item_id,
            order__user=request.user
        )

        order = order_item.order
        establishment_id = order.establishment_id

        with transaction.atomic():
            # Delete the item
            order_item.delete()

            # Check if order has any remaining items
            remaining_items = order.orderitem_set.count()

            if remaining_items == 0:
                # Delete the entire order if empty
                order.delete()
                order_deleted = True
            else:
                # Update order total
                order_total = sum(
                    item.quantity * item.price_at_order
                    for item in order.orderitem_set.all()
                )
                order.total_amount = order_total
                order.save()
                order_deleted = False

        # Calculate total cart count (PENDING cart + request orders awaiting acceptance)
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'message': 'Item removed from cart',
            'cart_count': total_cart_count,
            'order_deleted': order_deleted,
            'establishment_id': establishment_id
        })

    except Exception as e:
        print(f"Error removing from cart: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'message': 'An error occurred while removing item.'
        }, status=500)


@login_required
def get_cart_count(request):
    """
    Get current cart count for the user
    """
    try:
        cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'cart_count': cart_count
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_POST
def clear_establishment_cart(request):
    """
    Clear all items from a specific establishment's cart
    """
    try:
        establishment_id = request.POST.get('establishment_id')

        if not establishment_id:
            return JsonResponse({
                'success': False,
                'message': 'Invalid establishment ID'
            }, status=400)

        # Delete all pending orders for this establishment
        deleted_count, _ = Order.objects.filter(
            user=request.user,
            establishment_id=establishment_id,
            status='PENDING'
        ).delete()

        # Calculate remaining cart count (PENDING + request)
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'message': 'Cart cleared',
            'cart_count': total_cart_count
        })

    except Exception as e:
        print(f"Error clearing cart: {e}")
        return JsonResponse({
            'success': False,
            'message': 'An error occurred.'
        }, status=500)


# =======ORIGINAL CODE==========

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import ChatRoom, Message, FoodEstablishment
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib.auth.models import User
from .models import ChatRoom, Message, FoodEstablishment


@login_required
def customer_chat_view(request, establishment_id):
    """
    Customer's chat interface with a food establishment.
    Called from food_establishment_details.html
    """
    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)

    # Get or create chat room
    chat_room, created = ChatRoom.objects.get_or_create(
        customer=request.user,
        establishment=establishment
    )

    # Get all messages
    messages = chat_room.messages.all().order_by('created_at')

    # Mark owner's messages as read
    unread_messages = messages.filter(
        is_read=False,
        sender=establishment.owner
    )
    for msg in unread_messages:
        msg.mark_as_read()

    context = {
        'establishment': establishment,
        'chat_room': chat_room,
        'messages': messages,
        'customer_id': request.user.id,
        'establishment_id': establishment_id,
    }

    return render(request, 'webapplication/customer_chat.html', context)


@login_required
def owner_chat_view(request, customer_id):
    """
    Owner's chat interface with a specific customer.
    Called from food_establishment_dashboard.html
    """
    establishment_id = request.session.get('food_establishment_id')
    if not establishment_id:
        return redirect('owner_login')

    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
    customer = get_object_or_404(User, id=customer_id)

    # Get chat room
    chat_room = get_object_or_404(
        ChatRoom,
        customer=customer,
        establishment=establishment
    )

    # Get all messages
    messages = chat_room.messages.all().order_by('created_at')

    # Mark customer's messages as read
    unread_messages = messages.filter(
        is_read=False,
        sender=customer
    )
    for msg in unread_messages:
        msg.mark_as_read()

    context = {
        'establishment': establishment,
        'chat_room': chat_room,
        'messages': messages,
        'customer': customer,
        'customer_id': customer_id,
        'establishment_id': establishment_id,
    }

    return render(request, 'webapplication/owner_chat.html', context)


@login_required
def owner_inbox_view(request):
    """
    Owner's inbox showing all customer conversations.
    """
    establishment_id = request.session.get('food_establishment_id')
    if not establishment_id:
        return redirect('owner_login')

    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)

    # Get all chat rooms for this establishment
    chat_rooms = ChatRoom.objects.filter(
        establishment=establishment
    ).select_related('customer').prefetch_related('messages')

    # Add latest message to each chat room
    for room in chat_rooms:
        room.latest_message = room.messages.last()

    context = {
        'establishment': establishment,
        'chat_rooms': chat_rooms,
    }

    return render(request, 'webapplication/owner_inbox.html', context)


@login_required
def get_chat_messages(request, customer_id, establishment_id):
    """
    API endpoint to fetch chat messages for CUSTOMER view.
    Customer's messages go RIGHT, Owner's messages go LEFT.
    """
    try:
        customer = User.objects.get(id=customer_id)
        establishment = FoodEstablishment.objects.get(id=establishment_id)

        # Verify requesting user is the customer
        if request.user.id != int(customer_id):
            return JsonResponse({
                'success': False,
                'error': 'Unauthorized'
            }, status=403)

        # Get or create chat room
        chat_room, created = ChatRoom.objects.get_or_create(
            customer=customer,
            establishment=establishment
        )

        # Get all messages
        messages = chat_room.messages.all().order_by('created_at')

        # Mark establishment messages as read
        unread_messages = messages.filter(
            is_read=False,
            sender=establishment.owner
        )
        for msg in unread_messages:
            msg.mark_as_read()

        # ✅ CRITICAL: Include sender_id for proper alignment
        messages_data = [{
            'id': msg.id,
            'sender_id': msg.sender.id,  # Essential for alignment logic
            'sender_name': msg.sender.username,
            'content': msg.content,
            'timestamp': msg.created_at.strftime('%I:%M %p'),
            'is_read': msg.is_read,
            'is_customer': msg.sender.id == customer.id  # For customer view
        } for msg in messages]

        return JsonResponse({
            'success': True,
            'messages': messages_data
        })

    except Exception as e:
        print(f"Error fetching chat messages: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
def get_owner_conversations(request, establishment_id):
    """
    API endpoint to get all conversations for OWNER.
    """
    try:
        establishment = get_object_or_404(FoodEstablishment, id=establishment_id, owner=request.user)

        chat_rooms = ChatRoom.objects.filter(
            establishment=establishment
        ).select_related('customer').prefetch_related('messages').order_by('-updated_at')

        conversations = []
        total_unread = 0

        for room in chat_rooms:
            latest_message = room.messages.order_by('-created_at').first()
            unread_count = room.messages.filter(
                is_read=False,
                sender=room.customer
            ).count()

            total_unread += unread_count

            conversations.append({
                'customer_id': room.customer.id,
                'customer_name': room.customer.username,
                'last_message': latest_message.content if latest_message else None,
                'time': latest_message.created_at.strftime('%I:%M %p') if latest_message else None,
                'unread_count': unread_count
            })

        return JsonResponse({
            'success': True,
            'conversations': conversations,
            'total_unread': total_unread
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
def get_chat_messages_api(request, customer_id, establishment_id):
    """
    API endpoint to get messages for OWNER's conversation view.
    Owner's messages go RIGHT, Customer's messages go LEFT.
    """
    try:
        establishment = get_object_or_404(FoodEstablishment, id=establishment_id, owner=request.user)
        customer = get_object_or_404(User, id=customer_id)

        chat_room = get_object_or_404(
            ChatRoom,
            customer=customer,
            establishment=establishment
        )

        messages = chat_room.messages.all().order_by('created_at')

        # Mark customer messages as read
        unread_messages = messages.filter(
            is_read=False,
            sender=customer
        )
        for msg in unread_messages:
            msg.mark_as_read()

        # ✅ CRITICAL: Include sender_id for proper alignment
        messages_data = [{
            'id': msg.id,
            'sender_id': msg.sender.id,  # Essential for alignment
            'sender_name': msg.sender.username,
            'content': msg.content,
            'timestamp': msg.created_at.strftime('%I:%M %p'),
            'is_read': msg.is_read,
            'is_owner': msg.sender.id == establishment.owner.id  # For owner view
        } for msg in messages]

        return JsonResponse({
            'success': True,
            'messages': messages_data
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)




# =======================================================
# ✅ REALTIME: Owner unread message count API
# GET /api/unread-messages/
# Called by owner dashboard JS every 10s to update chat badge
# =======================================================
@login_required
def get_owner_unread_message_count(request):
    try:
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()
        if not establishment:
            return JsonResponse({'success': True, 'unread_count': 0})

        from .models import ChatRoom
        chat_rooms = ChatRoom.objects.filter(establishment=establishment)

        total_unread = 0
        for room in chat_rooms:
            total_unread += room.messages.filter(
                is_read=False,
                sender=room.customer
            ).count()

        return JsonResponse({'success': True, 'unread_count': total_unread})

    except Exception as e:
        return JsonResponse({'success': False, 'unread_count': 0, 'error': str(e)})


# =======================================================
# ✅ REALTIME: Client unread message count API
# GET /api/client-unread-messages/?establishment_id=<id>
# Called by establishment_details.js every 10s to update badge
# =======================================================
@login_required
def get_client_unread_message_count(request):
    try:
        establishment_id = request.GET.get('establishment_id')
        if not establishment_id:
            return JsonResponse({'success': True, 'unread_count': 0})

        from .models import ChatRoom
        establishment = get_object_or_404(FoodEstablishment, id=establishment_id)

        try:
            chat_room = ChatRoom.objects.get(
                customer=request.user,
                establishment=establishment
            )
        except ChatRoom.DoesNotExist:
            return JsonResponse({'success': True, 'unread_count': 0})

        unread_count = chat_room.messages.filter(
            is_read=False,
            sender=establishment.owner
        ).count()

        return JsonResponse({'success': True, 'unread_count': unread_count})

    except Exception as e:
        return JsonResponse({'success': False, 'unread_count': 0, 'error': str(e)})


@csrf_exempt
def test_email_config(request):
    """
    🔧 Diagnostic endpoint to test email configuration
    Access at: /api/test-email-config/
    """
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Use POST method',
            'instructions': 'Send POST request with {"email": "your@email.com"}'
        }, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        test_email = data.get('email')

        if not test_email:
            return JsonResponse({
                'error': 'Email required',
                'example': '{"email": "your@email.com"}'
            }, status=400)

        # Check environment variables
        diagnostics = {
            'timestamp': timezone.now().isoformat(),
            'test_email': test_email,
            'environment_check': {
                'SENDER_EMAIL': '✅ Set' if os.getenv('SENDER_EMAIL') else '❌ Missing',
                'SENDER_EMAIL_value': os.getenv('SENDER_EMAIL'),
                'EMAIL_HOST': os.getenv('EMAIL_HOST'),
                'EMAIL_PORT': os.getenv('EMAIL_PORT'),
                'EMAIL_USE_TLS': os.getenv('EMAIL_USE_TLS'),
                'SENDGRID_API_KEY': '✅ Set' if os.getenv('SENDGRID_API_KEY') else '❌ Missing',
                'EMAIL_HOST_PASSWORD': '✅ Set' if os.getenv('EMAIL_HOST_PASSWORD') else '❌ Missing',
            },
            'django_settings': {
                'EMAIL_BACKEND': settings.EMAIL_BACKEND,
            },
            'tests': {}
        }

        # Test 1: Check sender email
        from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)

        if not from_email:
            diagnostics['tests']['sender_email'] = '❌ FAILED - No sender email configured'
            diagnostics['error'] = 'SENDER_EMAIL not set in environment'
            diagnostics['fix'] = 'Add SENDER_EMAIL=robbyrosstanaelmajaba16@gmail.com to .env and Render'
            return JsonResponse(diagnostics)

        diagnostics['tests']['sender_email'] = f'✅ PASSED - Using {from_email}'

        # Test 2: Try sending test email
        print(f"\n🧪 Testing email configuration...")
        print(f"📧 From: {from_email}")
        print(f"📧 To: {test_email}")

        try:
            test_subject = '🧪 KabsuEats Email Configuration Test'
            test_message = f"""
KabsuEats Email Configuration Test

This is a test email to verify your email settings.

✅ If you receive this, your email configuration is working!

Timestamp: {timezone.now()}
From: {from_email}
To: {test_email}
            """

            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }}
        .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: #e59b20; color: white; padding: 30px; text-align: center; }}
        .content {{ padding: 30px; }}
        .success-box {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .footer {{ background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 KabsuEats Email Test</h1>
        </div>
        <div class="content">
            <h2>Email Configuration Test</h2>
            <div class="success-box">
                <strong>✅ SUCCESS!</strong><br>
                If you're reading this, your email configuration is working correctly!
            </div>
            <p><strong>Details:</strong></p>
            <ul>
                <li>From: {from_email}</li>
                <li>To: {test_email}</li>
                <li>Timestamp: {timezone.now()}</li>
            </ul>
        </div>
        <div class="footer">
            <p>&copy; 2024 KabsuEats. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            """

            print("📤 Attempting to send test email...")

            result = send_mail(
                subject=test_subject,
                message=test_message,
                from_email=from_email,
                recipient_list=[test_email],
                fail_silently=False,
                html_message=html_message
            )

            print(f"📬 Email send result: {result}")

            if result and result > 0:
                diagnostics['tests']['email_send'] = '✅ PASSED - Test email sent successfully'
                diagnostics['status'] = 'success'
                diagnostics['message'] = f'✅ Test email sent to {test_email}. Check your inbox and spam folder!'
                print(f"✅ SUCCESS: Test email sent to {test_email}")
            else:
                diagnostics['tests']['email_send'] = '⚠️ WARNING - Email function returned 0'
                diagnostics['status'] = 'warning'
                diagnostics['message'] = 'Email may have been sent but confirmation uncertain'
                print(f"⚠️ WARNING: Email send returned 0")

        except Exception as email_error:
            print(f"❌ EMAIL ERROR: {email_error}")
            import traceback
            traceback.print_exc()

            diagnostics['tests']['email_send'] = f'❌ FAILED - {str(email_error)}'
            diagnostics['status'] = 'error'
            diagnostics['error_details'] = str(email_error)

            # Provide specific recommendations
            error_msg = str(email_error).lower()

            if 'authentication' in error_msg or '535' in error_msg:
                diagnostics['fix'] = [
                    '❌ Gmail Authentication Failed',
                    '1. Go to https://myaccount.google.com/apppasswords',
                    '2. Enable 2-Step Verification first',
                    '3. Generate App Password for "Mail"',
                    '4. Copy 16-character password (remove spaces)',
                    '5. Update EMAIL_HOST_PASSWORD in .env and Render'
                ]
            elif 'sendgrid' in error_msg or '403' in error_msg or '401' in error_msg:
                diagnostics['fix'] = [
                    '❌ SendGrid Authentication Failed',
                    '1. Go to https://app.sendgrid.com/settings/api_keys',
                    '2. Create NEW API key with "Mail Send" permission',
                    '3. Copy FULL key (starts with SG.)',
                    '4. Update SENDGRID_API_KEY in .env and Render',
                    '5. Verify sender email at https://app.sendgrid.com/settings/sender_auth'
                ]
            elif 'connection' in error_msg or 'timeout' in error_msg:
                diagnostics['fix'] = [
                    '❌ Connection Issue',
                    '1. Check EMAIL_HOST=smtp.gmail.com',
                    '2. Check EMAIL_PORT=587',
                    '3. Check EMAIL_USE_TLS=True',
                    '4. Verify internet connection'
                ]
            else:
                diagnostics['fix'] = [
                    '❌ Unknown Error',
                    f'Error: {str(email_error)}',
                    'Check all email settings in .env file'
                ]

        return JsonResponse(diagnostics)

    except Exception as e:
        print(f"❌ OUTER ERROR: {e}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=500)  # ==========================================


# ==========================================
# NOTIFICATION API ENDPOINTS
# ==========================================

@login_required
def get_notifications(request):
    """
    ✅ FIXED: Uses defer() to exclude payment_status + proper queryset ordering
    """
    try:
        print(f"🔍 Notification request from user: {request.user.username}")

        # Get the establishment owned by the current user
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            print(f"❌ No establishment found for user: {request.user.username}")
            return JsonResponse({
                'success': False,
                'message': 'No establishment found for this user',
                'notifications': [],
                'unread_count': 0
            })

        print(f"✅ Found establishment: {establishment.name}")

        # ✅ CRITICAL FIX: Use defer() to exclude payment_status from Order queries
        notifications_base = OrderNotification.objects.filter(
            establishment=establishment
        ).select_related(
            'order__user',
            'order__establishment'
        ).prefetch_related(
            'order__orderitem_set__menu_item'
        ).order_by('-created_at')

        # ✅ Count unread BEFORE slicing
        unread_count = notifications_base.filter(is_read=False).count()
        print(f"🔔 Unread count: {unread_count}")

        # ✅ NOW slice to get only the first 50 notifications
        notifications = notifications_base[:50]

        # Format notifications data
        notifications_data = []
        for notif in notifications:
            try:
                # ✅ CRITICAL: Defer payment_status when accessing order
                order = notif.order

                # Get order items
                order_items = []
                for item in order.orderitem_set.all():
                    order_items.append({
                        'name': item.menu_item.name,
                        'quantity': item.quantity,
                        'price': float(item.price_at_order),
                        'total': float(item.total_price)
                    })

                notifications_data.append({
                    'id': notif.id,
                    'type': notif.notification_type,
                    'message': notif.message,
                    'is_new': not notif.is_read,
                    'created_at': notif.created_at.strftime('%b %d, %Y %I:%M %p'),
                    'time_ago': get_time_ago(notif.created_at),
                    'is_paid': order.status == 'PAID',
                    'payment_confirmed_at': order.payment_confirmed_at.strftime(
                        '%b %d, %Y %I:%M %p') if hasattr(order,
                                                         'payment_confirmed_at') and order.payment_confirmed_at else None,
                    'customer': {
                        'name': order.user.username,
                        'email': order.user.email
                    },
                    'order': {
                        'id': order.id,
                        'status': order.status,
                        'total_amount': float(order.total_amount),
                        'reference_number': getattr(order, 'gcash_reference_number', None) or 'N/A',
                        'items': order_items
                    }
                })

            except Exception as item_error:
                print(f"⚠️ Error processing notification {notif.id}: {item_error}")
                continue

        print(f"✅ Successfully formatted {len(notifications_data)} notifications")

        return JsonResponse({
            'success': True,
            'notifications': notifications_data,
            'unread_count': unread_count
        })

    except Exception as e:
        import traceback
        print(f"❌ Error in get_notifications: {e}")
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'message': 'An error occurred while fetching notifications.',
            'error': str(e)
        }, status=500)


@login_required
def get_user_order_notifications(request):
    """
    Returns order status notifications for the logged-in customer.
    Uses the existing OrderNotification model, filtered by order__user.
    """
    try:
        notifications_qs = OrderNotification.objects.filter(
            order__user=request.user
        ).select_related(
            'order__establishment',
            'order__user'
        ).order_by('-created_at')[:30]

        unread_count = OrderNotification.objects.filter(
            order__user=request.user,
            is_read=False
        ).count()

        STATUS_ICONS = {
            'to_pay':        ('fa-check-circle',   '#16a34a', 'Order Accepted'),
            'preparing':     ('fa-fire',            '#f59e0b', 'Being Prepared'),
            'to_claim':      ('fa-bell',            '#2563eb', 'Ready for Pickup'),
            'completed':     ('fa-flag-checkered',  '#6d28d9', 'Completed'),
            'cancelled':     ('fa-times-circle',    '#dc2626', 'Cancelled'),
            'order_cancelled':('fa-times-circle',   '#dc2626', 'Cancelled'),
            'order_update':  ('fa-info-circle',     '#6b7280', 'Update'),
            'new_order':     ('fa-shopping-bag',    '#b71c1c', 'New Order'),
            'payment_confirmed': ('fa-credit-card', '#16a34a', 'Payment Confirmed'),
        }

        data = []
        for n in notifications_qs:
            order_status = n.order.status
            notif_type   = n.notification_type
            # pick icon by notif_type first, fallback to order status
            icon_key = notif_type if notif_type in STATUS_ICONS else order_status
            icon, color, label = STATUS_ICONS.get(icon_key, ('fa-info-circle', '#6b7280', 'Update'))
            data.append({
                'id':           n.id,
                'message':      n.message,
                'is_read':      n.is_read,
                'time_ago':     get_time_ago(n.created_at),
                'created_at':   n.created_at.strftime('%b %d, %Y %I:%M %p'),
                'order_id':     n.order.id,
                'order_status': order_status,
                'est_name':     n.order.establishment.name,
                'icon':         icon,
                'color':        color,
                'label':        label,
            })

        return JsonResponse({
            'success':      True,
            'notifications': data,
            'unread_count': unread_count,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@require_POST
def mark_user_notifications_read(request):
    """
    Mark all unread order notifications as read for the logged-in customer.
    """
    try:
        updated = OrderNotification.objects.filter(
            order__user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return JsonResponse({'success': True, 'marked': updated})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def get_time_ago(timestamp):
    """
    Convert timestamp to human-readable time ago
    """
    from django.utils.timezone import now

    diff = now() - timestamp

    if diff.days > 0:
        if diff.days == 1:
            return "1 day ago"
        elif diff.days < 7:
            return f"{diff.days} days ago"
        elif diff.days < 30:
            weeks = diff.days // 7
            return f"{weeks} week{'s' if weeks > 1 else ''} ago"
        else:
            months = diff.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"

    hours = diff.seconds // 3600
    if hours > 0:
        if hours == 1:
            return "1 hour ago"
        return f"{hours} hours ago"

    minutes = diff.seconds // 60
    if minutes > 0:
        if minutes == 1:
            return "1 minute ago"
        return f"{minutes} minutes ago"

    return "Just now"


@login_required
@require_POST
def mark_notification_read(request, notification_id):
    """
    Mark a single notification as read
    """
    try:
        notification = OrderNotification.objects.get(
            id=notification_id,
            establishment__owner=request.user
        )
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

        return JsonResponse({
            'success': True,
            'message': 'Notification marked as read'
        })
    except OrderNotification.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Notification not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
@require_POST
def mark_all_notifications_read(request):
    """
    Mark all notifications as read for the establishment owner
    """
    try:
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            return JsonResponse({
                'success': False,
                'message': 'No establishment found'
            })

        # Mark all unread notifications as read
        updated_count = OrderNotification.objects.filter(
            establishment=establishment,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

        return JsonResponse({
            'success': True,
            'message': f'{updated_count} notifications marked as read'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def _fetch_paymongo_payment_method(session_id):
    """
    ✅ NEW HELPER: Query PayMongo Checkout Sessions API to get the actual payment method used.
    Returns: 'gcash', 'paymaya', 'card', or None if unavailable.
    Called after a successful PayMongo payment to detect which method the customer chose.
    """
    try:
        if not session_id or session_id.startswith(('SIM-', 'CASH-', 'CASH_ON_PICKUP')):
            return None  # Not a real PayMongo checkout session

        auth_string = f"{settings.PAYMONGO_SECRET_KEY}:"
        auth_header = "Basic " + base64.b64encode(auth_string.encode()).decode()

        response = requests.get(
            f"https://api.paymongo.com/v1/checkout_sessions/{session_id}",
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/json",
            },
            timeout=10
        )

        if response.status_code == 200:
            session_data = response.json()
            payments = (
                session_data
                .get('data', {})
                .get('attributes', {})
                .get('payments', [])
            )
            if payments:
                # Extract payment method type from first completed payment
                payment_type = (
                    payments[0]
                    .get('data', {})
                    .get('attributes', {})
                    .get('source', {})
                    .get('type', None)
                )
                print(f"✅ PayMongo payment method detected: {payment_type}")
                return payment_type  # Returns 'gcash', 'paymaya', 'card', etc.
        else:
            print(f"⚠️ PayMongo session fetch returned {response.status_code}")

    except Exception as e:
        print(f"⚠️ Could not fetch PayMongo payment method: {e}")

    return None


def gcash_payment_success(request):
    """
    ✅ ENHANCED: Handle successful payment with ORDER NOTIFICATIONS and STOCK REDUCTION
    """
    order_id = request.GET.get('order_id')

    if not order_id:
        messages.error(request, 'Invalid payment confirmation')
        return redirect('view_cart')

    try:
        order = Order.objects.filter(id=order_id).select_related('user', 'establishment').first()
        if not order:
            messages.error(request, 'Order not found')
            return redirect('view_cart')

        # ✅ NEW: Detect actual payment method from PayMongo before the transaction
        # This queries PayMongo API to know if user paid via GCash, Maya, or Card
        detected_method = _fetch_paymongo_payment_method(order.gcash_reference_number)
        if detected_method and not order.gcash_payment_method:
            print(f"✅ Payment method '{detected_method}' detected for Order #{order.id}")

        # Update order status if still pending/to_pay
        if order.status not in ('preparing', 'to_claim', 'completed'):
            with transaction.atomic():
                # ── Real-time stock check before confirming payment ──────
                # Another order may have already consumed this stock while
                # this customer was on the PayMongo payment page.
                # If any item is now insufficient, auto-cancel this order
                # and restore it to 'cancelled' so the customer is informed.
                order_items = list(
                    order.orderitem_set.select_related('menu_item').all()
                )
                insufficient = []
                for oi in order_items:
                    mi = oi.menu_item
                    if mi.quantity < oi.quantity:
                        insufficient.append(
                            f"{mi.name} (need {oi.quantity}, only {mi.quantity} left)"
                        )

                if insufficient:
                    # Mark order as cancelled — stock was never deducted for
                    # this order so nothing to restore.
                    order.status = 'cancelled'
                    order.save(update_fields=['status', 'updated_at'])
                    _broadcast_order_status_update(order, 'cancelled')
                    try:
                        OrderNotification.objects.create(
                            establishment=order.establishment,
                            order=order,
                            notification_type='order_cancelled',
                            message=(
                                f'Order #{order.id} auto-cancelled: items ran out of stock — '
                                + ', '.join(insufficient)
                            )
                        )
                    except Exception:
                        pass
                    messages.error(
                        request,
                        'Sorry, some items in your order are no longer available: '
                        + ', '.join(insufficient)
                        + '. Your order has been cancelled. Please try again.'
                    )
                    return redirect('kabsueats_home')

                # If order was in to_pay (accepted by owner), move to preparing
                # If order was PENDING (legacy), move to preparing as well
                order.status = 'preparing'
                order.payment_confirmed_at = timezone.now()
                # ✅ Save the actual payment method (gcash, paymaya, card)
                # Always update away from 'cash' since this is an online payment
                if detected_method:
                    order.gcash_payment_method = detected_method
                elif order.gcash_payment_method == 'cash':
                    order.gcash_payment_method = 'gcash'  # default online method
                order.save()

                # 2. ✅ CREATE ORDER NOTIFICATION FOR OWNER
                try:
                    OrderNotification.objects.create(
                        establishment=order.establishment,
                        order=order,
                        notification_type='new_order',
                        message=f'New order #{order.id} from {order.user.username} - ₱{order.total_amount:.2f}'
                    )
                    print(f"✅ Notification created for Order #{order.id}")
                except Exception as notif_error:
                    print(f"⚠️ Notification creation error: {notif_error}")

                # 3. ✅ REDUCE STOCK + CLEAR CART (online payment → preparing)
                _deduct_stock_and_clear_cart(order)
                # Broadcast updated inventory quantities to all WS clients
                try:
                    updated_items = list(order.orderitem_set.select_related('menu_item').all())
                    id_qty_pairs = [(oi.menu_item_id, MenuItem.objects.get(pk=oi.menu_item_id).quantity) for oi in updated_items]
                    _broadcast_inventory_update_from_items(order.establishment_id, id_qty_pairs)
                    _broadcast_order_status_update(order, order.status)
                except Exception as _bcast_err:
                    print(f"WARNING broadcast after payment: {_bcast_err}")

            # 4. Send confirmation emails (best-effort)
            try:
                send_order_confirmation_email(order)
            except Exception as e:
                print(f"Email error: {e}")

        # ✅ Redirect to order confirmation — customer sees their order as "received"
        # If order was already PAID by webhook but payment method missing, save it now
        if detected_method and not order.gcash_payment_method:
            order.gcash_payment_method = detected_method
            order.save(update_fields=['gcash_payment_method'])

        messages.success(request, '✅ Payment successful! Your order has been placed.')
        return redirect('order_confirmation', order_id=order.id)

    except Order.DoesNotExist:
        messages.error(request, 'Order not found')
        return redirect('view_cart')
    except Exception as e:
        print(f"❌ Error in payment success handler: {e}")
        messages.error(request, 'An error occurred processing your payment')
        return redirect('view_cart')


def view_cart(request):
    _ensure_user_profile(request.user)
    """
    Display all cart items grouped by establishment.
    Accessible without login — shows empty cart for unauthenticated users.
    """
    if not request.user.is_authenticated:
        return render(request, 'webapplication/cart.html', {
            'carts_data': [],
            'total_cart_count': 0,
            'cart_count': 0,
        })
    try:
        # Get all pending orders for current user
        all_carts = Order.objects.filter(
            user=request.user,
            status='PENDING'
        ).select_related(
            'establishment'
        ).prefetch_related(
            'orderitem_set__menu_item'
        ).order_by('establishment__name')

        carts_data = []
        total_cart_count = 0

        for order in all_carts:
            items = order.orderitem_set.all()
            cart_item_count = sum(item.quantity for item in items)
            total_cart_count += cart_item_count

            # ── Check for active orders ('request' or 'to_pay') for this establishment ──
            # Compute how many more of each item the customer can still add
            # (max_stock − already committed across request + to_pay orders).
            active_orders = Order.objects.filter(
                user=request.user,
                establishment=order.establishment,
                status__in=('request', 'to_pay'),
            ).prefetch_related('orderitem_set__menu_item')

            # Build a map: menu_item_id → total qty already committed
            request_qty_map = {}
            has_active_order = False
            for active_order in active_orders:
                has_active_order = True
                for req_item in active_order.orderitem_set.all():
                    mid = req_item.menu_item_id
                    request_qty_map[mid] = request_qty_map.get(mid, 0) + req_item.quantity

            # Annotate each cart item with remaining_allowed and existing_request_qty
            enriched_items = []
            items_to_delete = []
            for item in items:
                mid = item.menu_item_id
                max_stock = item.menu_item.quantity
                in_request = request_qty_map.get(mid, 0)
                remaining = max(0, max_stock - in_request)
                # Clamp cart qty to remaining allowed (auto-fix over-qty)
                clamped_qty = min(item.quantity, remaining) if has_active_order else item.quantity

                # Auto-remove items that have 0 remaining — no point keeping them
                if clamped_qty <= 0 and has_active_order:
                    items_to_delete.append(item.id)
                    continue

                item.display_qty        = clamped_qty
                item.remaining_allowed  = remaining if has_active_order else max_stock
                item.existing_req_qty   = in_request
                item.has_request_limit  = has_active_order and in_request > 0
                enriched_items.append(item)

            # Delete zero-remaining items from the DB quietly
            if items_to_delete:
                OrderItem.objects.filter(id__in=items_to_delete).delete()

            est = order.establishment
            carts_data.append({
                'establishment':      est,
                'order':              order,
                'items':              enriched_items,
                'item_count':         cart_item_count,
                'has_request_order':  has_active_order,
                'is_open': get_current_status(
                    est.opening_time,
                    est.closing_time
                ) == "Open",
                'opening_time_display': est.opening_time.strftime('%I:%M %p') if est.opening_time else None,
                'closing_time_display': est.closing_time.strftime('%I:%M %p') if est.closing_time else None,
            })

        context = {
            'carts_data': carts_data,
            'total_cart_count': total_cart_count,
            'cart_count': total_cart_count
        }

        return render(request, 'webapplication/cart.html', context)

    except Exception as e:
        print(f"Error loading cart: {e}")
        import traceback
        traceback.print_exc()

        # Return empty cart on error
        context = {
            'carts_data': [],
            'total_cart_count': 0,
            'cart_count': 0
        }
        return render(request, 'webapplication/cart.html', context)


@csrf_exempt
@require_POST
def paymongo_webhook(request):
    """
    ✅ ENHANCED: Webhook endpoint for PayMongo payment events with notifications

    To set up:
    1. Go to PayMongo Dashboard → Developers → Webhooks
    2. Add webhook URL: https://yourdomain.com/payment/webhook/
    3. Subscribe to events: payment.paid, payment.failed
    """
    try:
        payload = json.loads(request.body.decode('utf-8'))
        event_type = payload.get('data', {}).get('attributes', {}).get('type')

        if event_type == 'payment.paid':
            # Handle successful payment
            payment_data = payload.get('data', {}).get('attributes', {}).get('data', {})
            reference_number = payment_data.get('id')

            if reference_number:
                try:
                    order = Order.objects.select_related('establishment', 'user').get(
                        gcash_reference_number=reference_number
                    )

                    if order.status == 'PENDING':
                        with transaction.atomic():
                            # Update order
                            order.status = 'preparing'
                            order.payment_confirmed_at = timezone.now()

                            # ✅ Extract payment method from webhook payload
                            try:
                                pm_method = (
                                    payment_data
                                    .get('attributes', {})
                                    .get('source', {})
                                    .get('type', None)
                                )
                                if pm_method and not order.gcash_payment_method:
                                    order.gcash_payment_method = pm_method
                                    print(f"✅ Webhook: Payment method '{pm_method}' saved for Order #{order.id}")
                            except Exception as pm_err:
                                print(f"⚠️ Webhook: Could not extract payment method: {pm_err}")

                            order.save()

                            # Create notification
                            OrderNotification.objects.create(
                                establishment=order.establishment,
                                order=order,
                                notification_type='new_order',
                                message=f'New order #{order.id} from {order.user.username} - ₱{order.total_amount:.2f}'
                            )
                            print(f"✅ Webhook: Notification created for Order #{order.id}")

                            # ✅ Use shared helper — stock_deducted flag prevents
                            # double-deduction if gcash_payment_success already ran.
                            _deduct_stock_and_clear_cart(order)
                            print(f"✅ Webhook: Stock deduction attempted for Order #{order.id}")

                        # Send email
                        try:
                            send_order_confirmation_email(order)
                        except Exception as email_err:
                            print(f"Email error in webhook: {email_err}")

                except Order.DoesNotExist:
                    print(f"⚠️ Webhook: Order not found for reference {reference_number}")
                except Exception as order_err:
                    print(f"❌ Webhook error processing order: {order_err}")

        elif event_type == 'payment.failed':
            # Handle failed payment
            payment_data = payload.get('data', {}).get('attributes', {}).get('data', {})
            reference_number = payment_data.get('id')

            if reference_number:
                try:
                    order = Order.objects.get(gcash_reference_number=reference_number)
                    order.status = 'CANCELLED'
                    order.save()
                    print(f"✅ Webhook: Order #{order.id} marked as CANCELLED")
                except Order.DoesNotExist:
                    print(f"⚠️ Webhook: Order not found for reference {reference_number}")

        return HttpResponse(status=200)

    except Exception as e:
        print(f"❌ Webhook error: {e}")
        import traceback
        traceback.print_exc()
        return HttpResponse(status=400)


def send_order_confirmation_email(order):
    """Send confirmation emails to customer and store owner"""
    try:
        user_email = order.user.email
        owner_email = order.establishment.owner.email

        # Customer email
        user_subject = f"Order #{order.id} Confirmed - KabsuEats"
        user_message = f"""
Hello {order.user.username},

Your order from {order.establishment.name} has been confirmed!

Order Details:
- Order ID: {order.id}
- Reference: {order.gcash_reference_number}
- Total: ₱{order.total_amount:.2f}
- Status: Payment Confirmed

Items:
"""
        for item in order.orderitem_set.all():
            user_message += f"\n- {item.menu_item.name} x{item.quantity} @ ₱{item.price_at_order:.2f} = ₱{item.total_price:.2f}"

        user_message += "\n\nThank you for ordering with KabsuEats!"

        send_mail(
            user_subject,
            user_message,
            settings.EMAIL_HOST_USER,
            [user_email],
            fail_silently=True
        )

        # Owner email
        owner_subject = f"New Order #{order.id} - {order.establishment.name}"
        owner_message = f"""
New order for {order.establishment.name}!

Customer: {order.user.username}
Email: {order.user.email}

Order Details:
- Order ID: {order.id}
- Reference: {order.gcash_reference_number}
- Total: ₱{order.total_amount:.2f}

Items to Prepare:
"""
        for item in order.orderitem_set.all():
            owner_message += f"\n- {item.menu_item.name} x{item.quantity}"

        owner_message += "\n\nPlease prepare this order."

        send_mail(
            owner_subject,
            owner_message,
            settings.EMAIL_HOST_USER,
            [owner_email],
            fail_silently=True
        )

        print(f"✅ Emails sent for Order #{order.id}")

    except Exception as e:
        print(f"❌ Email error: {e}")
        import traceback
        traceback.print_exc()


@login_required
def get_owner_notifications(request):
    """
    ✅ ENHANCED: Get detailed notifications with complete order information
    """
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id:
        return JsonResponse({
            'success': False,
            'error': 'Not authorized'
        }, status=403)

    try:
        establishment = FoodEstablishment.objects.get(id=establishment_id, owner=request.user)

        # Get unread notifications with complete order details
        notifications = OrderNotification.objects.filter(
            establishment=establishment,
            is_read=False
        ).select_related(
            'order',
            'order__user',
            'order__establishment'
        ).prefetch_related(
            'order__orderitem_set__menu_item'
        ).order_by('-created_at')[:20]

        notifications_data = []

        for notif in notifications:
            order = notif.order

            # Get order items with details
            order_items = []
            for item in order.orderitem_set.all():
                order_items.append({
                    'name': item.menu_item.name,
                    'quantity': item.quantity,
                    'price': float(item.price_at_order),
                    'total': float(item.total_price)
                })

            # Format notification data
            notifications_data.append({
                'id': notif.id,
                'type': notif.notification_type,
                'message': notif.message,

                # Order Details
                'order': {
                    'id': order.id,
                    'reference_number': order.gcash_reference_number or 'N/A',
                    'status': order.status,
                    'total_amount': float(order.total_amount),
                    'items': order_items,
                    'item_count': order.orderitem_set.count(),
                },

                # Customer Details
                'customer': {
                    'name': order.user.username,
                    'email': order.user.email,
                    'id': order.user.id
                },

                # Timestamps
                'created_at': notif.created_at.strftime('%B %d, %Y at %I:%M %p'),
                'payment_confirmed_at': order.payment_confirmed_at.strftime(
                    '%B %d, %Y at %I:%M %p') if order.payment_confirmed_at else None,
                'time_ago': get_time_ago(notif.created_at),

                # Status indicators
                'is_new': not notif.is_read,
                'is_paid': order.status == 'PAID',
            })

        # Get total unread count
        unread_count = OrderNotification.objects.filter(
            establishment=establishment,
            is_read=False
        ).count()

        return JsonResponse({
            'success': True,
            'notifications': notifications_data,
            'unread_count': unread_count
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
def create_test_notification(request):
    """
    🧪 TEST ENDPOINT: Creates a test notification manually
    Access at: /api/test-notification/
    """
    try:
        print(f"🧪 Test notification request from user: {request.user.username}")

        # Get the establishment
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            print(f"❌ No establishment found for user: {request.user.username}")
            return JsonResponse({
                'success': False,
                'message': 'No establishment found for this user'
            })

        print(f"✅ Found establishment: {establishment.name}")

        # Get any PAID order for this establishment
        order = Order.objects.filter(
            establishment=establishment,
            status='PAID'
        ).order_by('-created_at').first()

        if not order:
            print(f"❌ No paid orders found for {establishment.name}")

            # Check if there are ANY orders
            any_order = Order.objects.filter(establishment=establishment).first()
            if not any_order:
                return JsonResponse({
                    'success': False,
                    'message': 'No orders found. Please make a test order first.'
                })

            # Use the first available order even if not paid (for testing)
            order = any_order
            print(f"⚠️ Using order #{order.id} with status: {order.status}")

        # Create test notification
        notification = OrderNotification.objects.create(
            establishment=establishment,
            order=order,
            notification_type='new_order',
            message=f'🧪 TEST NOTIFICATION: Order #{order.id} from {order.user.username} - ₱{order.total_amount:.2f}'
        )

        print(f"✅ Test notification created! ID: {notification.id}")

        return JsonResponse({
            'success': True,
            'message': f'Test notification created successfully!',
            'notification_id': notification.id,
            'order_id': order.id,
            'customer': order.user.username,
            'establishment': establishment.name
        })

    except Exception as e:
        print(f"❌ Error creating test notification: {e}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


# ==========================================
# ORDER TRANSACTION HISTORY VIEWS - COMPLETE CODE           FOR OWNER SIDE

# ==========================================

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Prefetch, Count, Sum
from .models import Order, OrderItem, FoodEstablishment
import json

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import FoodEstablishment


@login_required(login_url='owner_login')
def food_establishment_profile(request):
    """
    Display the food establishment profile settings page with inline editing.
    """
    try:
        from .models import Category, Amenity
        import os

        # Get the establishment owned by the current user
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

        context = {
            'establishment': establishment,
            'categories': Category.objects.all().order_by('name'),
            'amenities': Amenity.objects.all().order_by('name'),
            'pk': establishment.pk,
            'CVSU_LATITUDE': os.getenv('CVSU_LATITUDE', '14.1649'),
            'CVSU_LONGITUDE': os.getenv('CVSU_LONGITUDE', '120.9881'),
        }

        return render(request, 'webapplication/food_establishment_profile.html', context)

    except FoodEstablishment.DoesNotExist:
        return redirect('owner_login')
    except Exception as e:
        return redirect('food_establishment_dashboard')

@login_required(login_url='owner_login')
@require_http_methods(["POST"])
def deactivate_establishment(request):
    """
    Toggle active/inactive status of the establishment.
    ✅ If currently active  → deactivate (hide from customers)
    ✅ If currently inactive → reactivate (show to customers again)
    ✅ Messages tagged 'owner_only' so they only show on owner pages.
    """
    try:
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)
        name = establishment.name

        # Only block deactivation (not reactivation)
        if establishment.is_active:
            active_statuses = ['request', 'to_pay', 'preparing', 'to_claim', 'PENDING', 'order_received']
            active_orders = Order.objects.filter(
                establishment=establishment,
                status__in=active_statuses
            )
            if active_orders.exists():
                messages.error(
                    request,
                    f'Cannot deactivate "{name}" — there are {active_orders.count()} active order(s) still in progress. Please wait until all orders are completed before deactivating.',
                    extra_tags='owner_only'
                )
                return redirect('food_establishment_profile')

            establishment.is_active = False
            establishment.save()
            messages.success(
                request,
                f'"{name}" has been deactivated and is now hidden from customers. '
                f'You can reactivate it anytime from Profile Settings.',
                extra_tags='owner_only'    # ← hides this from kabsueats.html
            )
        else:
            establishment.is_active = True
            establishment.save()
            messages.success(
                request,
                f'"{name}" has been reactivated and is now visible to customers again!',
                extra_tags='owner_only'    # ← hides this from kabsueats.html
            )

        return redirect('food_establishment_dashboard')

    except FoodEstablishment.DoesNotExist:
        messages.error(request, 'No establishment found for this account.')
        return redirect('owner_login')
    except Exception as e:
        messages.error(request, f'An error occurred: {str(e)}')
        return redirect('food_establishment_dashboard')

@login_required
def get_establishment_profile(request):
    """
    API endpoint para kunin ang establishment profile details
    Returns JSON data ng establishment info
    """
    try:
        # Get the establishment owned by the current user
        establishment = get_object_or_404(
            FoodEstablishment,
            owner=request.user
        )

        # Prepare amenities list
        amenities_list = [amenity.name for amenity in establishment.amenities.all()]

        # Prepare profile data
        profile_data = {
            'id': establishment.id,
            'name': establishment.name,
            'address': establishment.address,
            'categories': ', '.join([cat.name for cat in establishment.categories.all()]) or 'N/A',
            'categories_list': [{'id': cat.id, 'name': cat.name} for cat in establishment.categories.all()],
            'other_category': establishment.other_category,
            'opening_time': establishment.opening_time.strftime('%I:%M %p') if establishment.opening_time else None,
            'closing_time': establishment.closing_time.strftime('%I:%M %p') if establishment.closing_time else None,
            'status': establishment.calculated_status,
            'amenities': amenities_list,
            'other_amenity': establishment.other_amenity,
            'payment_methods': establishment.payment_methods or 'N/A',
            'latitude': float(establishment.latitude) if establishment.latitude else None,
            'longitude': float(establishment.longitude) if establishment.longitude else None,
            'image_url': establishment.image.url if establishment.image else None,
        }

        return JsonResponse({
            'success': True,
            'profile': profile_data
        })

    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Establishment not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
@require_http_methods(["GET"])
def get_establishment_orders(request):
    """
    API endpoint to get all orders for the food establishment owner
    Returns orders grouped by status with detailed information

    Endpoint: /api/food-establishment/orders/
    Method: GET

    Returns JSON:
    {
        "success": true,
        "orders": [
            {
                "id": 1,
                "customer_name": "John Doe",
                "customer_email": "john@example.com",
                "status": "order_received",
                "total_amount": "150.00",
                "items_count": 3,
                "items_preview": "2x Burger, 1x Fries",
                "items": [...],
                "created_at": "2026-02-06T10:30:00",
                "payment_method": "cash",
                "gcash_reference": ""
            },
            ...
        ],
        "total_orders": 10
    }
    """
    try:
        # Get the establishment owned by the current user
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            return JsonResponse({
                'success': False,
                'message': 'No establishment found for this user'
            }, status=404)

        # Get all orders for this establishment with related data
        # EXCLUDE 'PENDING' orders — those are unpaid cart items, not confirmed orders yet
        # EXCLUDE owner_dismissed orders — owner already cleared them from the request tab
        orders = Order.objects.filter(
            establishment=establishment
        ).exclude(
            status='PENDING'
        ).exclude(
            owner_dismissed=True
        ).exclude(
            # Owner-rejected request orders stay cancelled with owner_dismissed=False
            # so the client can still see the rejection reason. Exclude them from the
            # owner dashboard — the row already vanished via WS broadcast at rejection time.
            status='cancelled',
            stock_deducted=False,
            owner_dismissed=False,
        ).select_related(
            'user', 'establishment'
        ).prefetch_related(
            Prefetch('orderitem_set', queryset=OrderItem.objects.select_related('menu_item'))
        ).order_by('created_at')

        # Build the response data
        orders_data = []
        for order in orders:
            # Get order items info
            items = []
            items_preview = []

            out_of_stock_count = 0
            for order_item in order.orderitem_set.all():
                is_out = order_item.menu_item.quantity < order_item.quantity
                if is_out:
                    out_of_stock_count += 1
                items.append({
                    'name':            order_item.menu_item.name,
                    'quantity':        order_item.quantity,
                    'price':           str(order_item.price_at_order),
                    'menu_item_id':    order_item.menu_item.id,
                    'order_item_id':   order_item.id,
                    'available_stock': order_item.menu_item.quantity,
                })
                items_preview.append(f"{order_item.quantity}x {order_item.menu_item.name}")

            # Limit preview to first 2 items
            preview_text = ', '.join(items_preview[:2])
            if len(items_preview) > 2:
                preview_text += f' +{len(items_preview) - 2} more'

            # Ensure status is always lowercase and valid
            order_status = order.status.lower() if order.status else 'order_received'

            # Normalize legacy statuses
            # 'paid' = confirmed online payment -> show as order_received for owner
            # 'pending' orders are EXCLUDED above (those are just unpaid cart items)
            status_mapping = {
                'paid': 'order_received',
            }
            order_status = status_mapping.get(order_status, order_status)

            # ✅ FIX: Detect if this cancelled order was cancelled while still in 'request' status.
            # Stock is NOT deducted at the 'request' stage, so if status is 'cancelled' and
            # stock_deducted is False, it was cancelled before being accepted — show it in the
            # request tab so the owner can see it even after a page reload.
            # This now covers BOTH client-cancelled AND owner-rejected request orders.
            cancelled_from_request = (
                order_status == 'cancelled'
                and not order.stock_deducted
                and not order.owner_dismissed
            )
            # Retrieve the cancel_reason stored on the order (if available)
            cancel_reason_value = getattr(order, 'cancel_reason', '') or ''

            # Detect if this was rejected by the owner (not cancelled by client).
            # owner_dismissed=False + cancelled = owner rejected but hasn't dismissed yet,
            # OR client self-cancelled (cancel_reason set by client).
            # We distinguish: owner_rejected means cancelled AND not stock_deducted AND
            # cancel_reason is present but the order was NOT cancelled by the client's own action.
            # Since both cases share cancelled_from_request=True, we add an extra flag
            # cancelled_by_owner so the frontend can show the right badge.
            # Logic: if the order has a cancel_reason that was NOT set by the client cancel flow,
            # then it was rejected by the owner. The safest heuristic: check if the
            # cancellation originated from the owner's reject_order view by inspecting
            # whether stock was NOT deducted AND owner_dismissed=False (still pending owner dismiss).
            # Client self-cancels always set owner_dismissed=False too, so we use cancel_reason
            # presence as a secondary signal — but we can't be 100% sure from the DB alone.
            # Best approach: store a separate flag. For now we use the convention that
            # owner-rejected orders have cancel_reason set (owner typed a reason) while
            # client-cancelled orders have cancel_reason empty or set to client's own message.
            # The frontend already has WS real-time for live sessions; this API flag is for
            # page-reload recovery. We set cancelled_by_owner=True when the order was
            # cancelled while in 'request' status (owner_dismissed=False means owner has
            # not yet triggered the legacy dismiss path — the client still needs to see it).
            # We do NOT require cancel_reason to be non-empty; owner may reject without a reason.
            cancelled_by_owner_flag = cancelled_from_request

            order_data = {
                'id': order.id,
                'customer_name': order.user.username if order.user else 'Unknown',
                'customer_email': order.user.email if order.user else '',
                'status': order_status,
                'total_amount': str(order.total_amount),
                'items_count': order.get_item_count(),
                'items_preview': preview_text,
                'items': items,
                'out_of_stock_item_count': out_of_stock_count,  # 0=none, 1=show Remove, 2+=show banner only
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'gcash_reference': order.gcash_reference_number or '',
                'payment_method': normalize_payment_method(order.gcash_payment_method),
                # ✅ NEW: tells the owner dashboard to show this row in the request tab
                'cancelled_from_request': cancelled_from_request,
                'cancel_reason': cancel_reason_value,
                # ✅ NEW: tells owner dashboard which rows are owner-rejected (vs client-cancelled)
                'cancelled_by_owner': cancelled_by_owner_flag,
            }
            orders_data.append(order_data)

        return JsonResponse({
            'success': True,
            'orders': orders_data,
            'total_orders': len(orders_data)
        })

    except Exception as e:
        import traceback
        print(f"ERROR in get_establishment_orders: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@login_required
@require_http_methods(["POST"])
def owner_remove_order_item(request, order_id, item_id):
    """
    Owner removes a single item from a 'request' order in real-time.
    Used when stock runs out and the owner wants to partially fulfil the order
    instead of rejecting it entirely.

    Rules:
    - Only allowed on orders with status='request' (not yet paid/processing).
    - If removing the item would leave the order empty, the entire order is
      cancelled and stock is restored (none was deducted at request stage).
    - Order total is recalculated after removal.

    Endpoint: POST /api/food-establishment/orders/<order_id>/remove-item/<item_id>/
    """
    try:
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()
        if not establishment:
            return JsonResponse({'success': False, 'message': 'No establishment found'}, status=404)

        order = get_object_or_404(
            Order.objects.select_related('establishment', 'user')
                 .prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            establishment=establishment,
        )

        if order.status != 'request':
            return JsonResponse({
                'success': False,
                'message': f'Can only remove items from orders in request status (current: {order.status})'
            }, status=400)

        order_item = get_object_or_404(OrderItem, id=item_id, order=order)
        item_name = order_item.menu_item.name

        with transaction.atomic():
            order_item.delete()

            remaining = order.orderitem_set.count()
            if remaining == 0:
                # Empty order — cancel it entirely (no stock was deducted at request stage)
                order.status = 'cancelled'
                order.save(update_fields=['status', 'updated_at'])
                _broadcast_order_status_update(order, 'cancelled',
                    cancel_reason=f'Order cancelled — all items removed by establishment')
                # Notify customer
                try:
                    OrderNotification.objects.create(
                        establishment=establishment,
                        order=order,
                        notification_type='order_cancelled',
                        message=(f'Your order #{order.id} was cancelled because all items '
                                 f'are now out of stock.')
                    )
                except Exception:
                    pass
                return JsonResponse({
                    'success': True,
                    'order_cancelled': True,
                    'message': f'Last item removed — order #{order.id} cancelled.',
                })
            else:
                # Recalculate total
                order.update_total()
                # ✅ Broadcast realtime item-removed event to client AND owner WS
                _broadcast_order_item_removed(
                    order, item_name, item_id, order.total_amount
                )
                # Notify customer via DB notification
                try:
                    OrderNotification.objects.create(
                        establishment=establishment,
                        order=order,
                        notification_type='order_cancelled',
                        message=(f'Item "{item_name}" was removed from your order #{order.id} '
                                 f'by the establishment (out of stock).')
                    )
                except Exception:
                    pass
                return JsonResponse({
                    'success': True,
                    'order_cancelled': False,
                    'new_total': str(order.total_amount),
                    'message': f'"{item_name}" removed from order #{order.id}.',
                })

    except Exception as e:
        import traceback
        print(f'ERROR owner_remove_order_item: {e}')
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


def _deduct_stock_and_clear_cart(order):
    """
    Deduct menu item quantities for all items in the order,
    and remove those items from the customer's cart.
    Safe to call from anywhere — wraps itself in transaction.atomic().
    """
    import traceback as _tb
    try:
        with transaction.atomic():
            # ✅ Re-fetch order with a row-level lock so concurrent requests
            # cannot both pass the idempotency check at the same time.
            order = Order.objects.select_for_update().select_related('user').get(pk=order.pk)

            # ✅ IDEMPOTENCY GUARD — skip if stock was already deducted for this order.
            # This prevents double-deduction when both the payment callback AND
            # the owner moving the order to 'preparing' would otherwise both call
            # this helper (e.g. GCash paid → preparing, then owner presses Preparing again).
            if order.stock_deducted:
                print(f"DEBUG _deduct_stock: Order #{order.pk} already deducted — skipping.")
                return

            order_items = list(order.orderitem_set.select_related('menu_item').all())
            if not order_items:
                print(f"DEBUG _deduct_stock: No items found for Order #{order.pk}")
                return

            # Build deduct map: menu_item_id → total qty to deduct
            deduct_map = {}
            for oi in order_items:
                deduct_map[oi.menu_item_id] = deduct_map.get(oi.menu_item_id, 0) + oi.quantity

            print(f"DEBUG _deduct_stock: Order #{order.pk} → deducting {deduct_map}")

            # Update MenuItem rows directly (select_for_update only on non-SQLite)
            from django.db import connection
            use_lock = 'sqlite' not in connection.vendor
            qs = MenuItem.objects.filter(id__in=list(deduct_map.keys()))
            menu_items = qs.select_for_update() if use_lock else qs
            for menu_item in menu_items:
                qty_to_deduct = deduct_map.get(menu_item.id, 0)
                old_qty = menu_item.quantity
                menu_item.quantity = max(menu_item.quantity - qty_to_deduct, 0)
                menu_item.save(update_fields=['quantity'])
                print(f"DEBUG _deduct_stock: {menu_item.name} {old_qty} → {menu_item.quantity}")

            # ✅ Mark order so this helper will never run a second time for it.
            order.stock_deducted = True
            order.save(update_fields=['stock_deducted'])

            # Remove matching cart items for this customer
            menu_item_ids = list(deduct_map.keys())
            try:
                customer_cart = Cart.objects.get(user=order.user)
                deleted_count, _ = CartItem.objects.filter(
                    cart=customer_cart,
                    menu_item_id__in=menu_item_ids
                ).delete()
                print(f"DEBUG _deduct_stock: Removed {deleted_count} cart items for user {order.user_id}")
            except Cart.DoesNotExist:
                pass  # No cart to clean up

    except Exception as e:
        print(f"ERROR in _deduct_stock_and_clear_cart: {e}")
        print(_tb.format_exc())
        raise  # Re-raise so caller's atomic block rolls back

def update_order_status(request, order_id):
    """
    API endpoint to update the status of a specific order

    Endpoint: /api/food-establishment/orders/<order_id>/update-status/
    Method: POST
    Body: { "status": "preparing" | "to_claim" | "completed" }

    Returns JSON:
    {
        "success": true,
        "message": "Order status updated to preparing",
        "order": {
            "id": 1,
            "status": "preparing",
            "updated_at": "2026-02-06T10:35:00"
        }
    }
    """
    try:
        # Get the establishment owned by the current user
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            return JsonResponse({
                'success': False,
                'message': 'No establishment found for this user'
            }, status=404)

        # Get the order and verify it belongs to this establishment
        order = get_object_or_404(
            Order.objects.select_related('establishment', 'user'),
            id=order_id,
            establishment=establishment
        )

        # Parse the request body
        data = json.loads(request.body)
        new_status = data.get('status', '').lower()

        # Validate status
        valid_statuses = ['request', 'to_pay', 'order_received', 'preparing', 'to_claim', 'completed']
        if new_status not in valid_statuses:
            return JsonResponse({
                'success': False,
                'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }, status=400)

        # ============================================================
        # When order moves to 'preparing':
        # 1. Deduct menu item quantities for ALL items in the order
        # 2. Remove the ordered items from the customer's cart
        # Everything runs inside ONE atomic block so it fully
        # rolls back (including the status change) if anything fails.
        # ============================================================
        with transaction.atomic():
            old_status = order.status

            # ── Stock availability check ─────────────────────────────────
            # When owner accepts a 'request' order (→ 'to_pay') or moves
            # a cash order to 'preparing', verify stock is still sufficient.
            # Another order may have consumed stock while this one was waiting.
            if new_status in ('to_pay', 'preparing'):
                order_items = list(
                    order.orderitem_set.select_related('menu_item').all()
                )
                insufficient_ids = []
                insufficient_names = []
                for oi in order_items:
                    mi = oi.menu_item
                    if mi.quantity < oi.quantity:
                        insufficient_ids.append(oi.id)
                        insufficient_names.append(mi.name)

                if insufficient_ids:
                    # Auto-remove only the out-of-stock items so the rest can proceed
                    order.orderitem_set.filter(id__in=insufficient_ids).delete()
                    # Refresh remaining valid items
                    order_items = list(
                        order.orderitem_set.select_related('menu_item').all()
                    )
                    if not order_items:
                        # Every item was out of stock — cannot accept at all
                        return JsonResponse({
                            'success': False,
                            'message': (
                                'Cannot accept order — all items are out of stock: '
                                + ', '.join(insufficient_names)
                                + '. Please reject this order so the customer can reorder.'
                            ),
                            'insufficient_stock': insufficient_names,
                        }, status=409)
                    # Recalculate total with the remaining valid items
                    new_total = sum(
                        oi.quantity * oi.price_at_order for oi in order_items
                    )
                    order.total_amount = new_total
                    order.save(update_fields=['total_amount'])

            # ── Merge into existing to_pay order (same client) ───────────
            # If owner accepts a 'request' order and the same client already
            # has a 'to_pay' order for this establishment, merge the new items
            # into that existing to_pay order and reset its 10-minute timer
            # (by updating updated_at). The accepted 'request' order is then
            # deleted since its items have been folded into the to_pay order.
            if new_status == 'to_pay' and old_status == 'request':
                existing_to_pay = Order.objects.filter(
                    user=order.user,
                    establishment=establishment,
                    status='to_pay',
                ).exclude(id=order.id).order_by('-created_at').first()

                if existing_to_pay:
                    # Merge each item from the accepted request into the to_pay order
                    for req_oi in order.orderitem_set.select_related('menu_item').all():
                        existing_item = OrderItem.objects.filter(
                            order=existing_to_pay,
                            menu_item=req_oi.menu_item,
                        ).first()
                        if existing_item:
                            existing_item.quantity += req_oi.quantity
                            existing_item.save(update_fields=['quantity'])
                        else:
                            OrderItem.objects.create(
                                order=existing_to_pay,
                                menu_item=req_oi.menu_item,
                                quantity=req_oi.quantity,
                                price_at_order=req_oi.price_at_order,
                            )

                    # Recalculate total of the merged to_pay order
                    merged_total = sum(
                        oi.quantity * oi.price_at_order
                        for oi in existing_to_pay.orderitem_set.all()
                    )
                    existing_to_pay.total_amount = merged_total
                    # Reset the 10-minute payment timer by bumping updated_at
                    existing_to_pay.updated_at = timezone.now()
                    existing_to_pay.save(update_fields=['total_amount', 'updated_at'])

                    # Delete the now-merged request order
                    order.delete()

                    # Notify client and broadcast the updated to_pay order
                    _broadcast_order_status_update(existing_to_pay, 'to_pay')

                    try:
                        OrderNotification.objects.create(
                            establishment=establishment,
                            order=existing_to_pay,
                            notification_type='order_update',
                            message=(
                                f'Your order #{existing_to_pay.id} has been updated with new items! '
                                f'Payment window reset to 10 minutes.'
                            ),
                        )
                    except Exception:
                        pass

                    return JsonResponse({
                        'success': True,
                        'merged': True,
                        'message': 'Order accepted and merged into existing to-pay order. Timer reset to 10 minutes.',
                        'order': {
                            'id': existing_to_pay.id,
                            'status': 'to_pay',
                            'updated_at': existing_to_pay.updated_at.isoformat(),
                        },
                    })
            # ── End merge-into-to_pay logic ──────────────────────────────

            order.status = new_status
            order.save(update_fields=['status', 'updated_at'])

            # ── Stock deduction ─────────────────────────────────────────
            # Rules:
            #   • Cash orders: deduct when owner confirms (→ 'preparing').
            #   • GCash/online: deducted in gcash_payment_success / webhook.
            #   • The stock_deducted flag on Order makes every call idempotent.
            if new_status == 'preparing':
                _deduct_stock_and_clear_cart(order)

        # Broadcast real-time order status change to owner + customer
        _broadcast_order_status_update(order, new_status)

        # Create notification for status change
        try:
            notification_messages = {
                'request': f'New order request #{order.id} from {order.user.username}',
                'to_pay': f'Your order #{order.id} has been accepted! Please proceed to payment.',
                'order_received': f'Order #{order.id} has been received',
                'preparing': f'Your order #{order.id} is now being prepared',
                'to_claim': f'Your order #{order.id} is ready for pickup!',
                'completed': f'Order #{order.id} has been completed'
            }

            OrderNotification.objects.create(
                establishment=establishment,
                order=order,
                notification_type='order_update',
                message=notification_messages.get(new_status, f'Order #{order.id} status updated')
            )
        except Exception as notif_error:
            # Don't fail the request if notification creation fails
            print(f"Warning: Could not create notification: {notif_error}")

        return JsonResponse({
            'success': True,
            'message': f'Order status updated to {new_status.replace("_", " ").title()}',
            'order': {
                'id': order.id,
                'status': order.status,
                'updated_at': order.updated_at.isoformat()
            }
        })

    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Order not found'
        }, status=404)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        import traceback
        print(f"ERROR in update_order_status: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST"])
def reject_order(request, order_id):
    """
    Owner rejects a 'to_pay' order after the 8-minute waiting period expires.
    Restores stock for all items in the order and marks the order as 'cancelled'.

    Endpoint: /api/food-establishment/orders/<order_id>/reject/
    Method: POST
    """
    try:
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()
        if not establishment:
            return JsonResponse({'success': False, 'message': 'No establishment found'}, status=404)

        order = get_object_or_404(
            Order.objects.select_related('establishment', 'user')
                 .prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            establishment=establishment
        )

        # Parse optional cancellation reason from request body
        cancel_reason = ''
        try:
            body_data = json.loads(request.body)
            cancel_reason = body_data.get('reason', '')
        except Exception:
            pass

        # Allow rejecting orders that are in 'to_pay', 'request', or 'to_claim' status.
        # Also allow dismissing already-cancelled orders (e.g. client self-cancelled while
        # still in 'request' — those appear in the owner's request tab until dismissed).
        if order.status not in ('to_pay', 'request', 'to_claim', 'cancelled'):
            return JsonResponse({
                'success': False,
                'message': f'Cannot reject order with status: {order.status}'
            }, status=400)

        # ── Short-circuit: already cancelled (client self-cancel) ──────────
        # The client already cancelled this order themselves — nothing to restore.
        # Just mark as owner_dismissed so it disappears from the owner's request tab.
        # DO NOT broadcast cancelled_by_owner=True — the client cancelled this order
        # themselves and must NOT see a "Cancelled by Owner" badge on their side.
        if order.status == 'cancelled':
            order.owner_dismissed = True
            order.save(update_fields=['owner_dismissed'])
            return JsonResponse({
                'success': True,
                'message': f'Order #{order.id} dismissed.',
                'order_id': order.id
            })

        with transaction.atomic():
            # ── Restore stock only if it was actually deducted ───────────
            # Stock is NOT deducted at 'request' stage — only when the order
            # moves to 'preparing' (cash) or payment is confirmed (GCash).
            # Restoring when nothing was deducted would inflate quantities.
            from django.db import connection
            use_lock = 'sqlite' not in connection.vendor
            item_ids = [oi.menu_item_id for oi in order.orderitem_set.all()]
            qs = MenuItem.objects.filter(id__in=item_ids)
            menu_items_map = {mi.id: mi for mi in (qs.select_for_update() if use_lock else qs)}

            if order.stock_deducted:
                for oi in order.orderitem_set.all():
                    mi = menu_items_map.get(oi.menu_item_id)
                    if mi:
                        mi.quantity += oi.quantity
                        mi.save(update_fields=['quantity'])
                        print(f"DEBUG reject_order: Restored {oi.quantity} × {mi.name} → new qty {mi.quantity}")
                order.stock_deducted = False
                order.save(update_fields=['stock_deducted'])
            else:
                print(f"DEBUG reject_order: Order #{order.pk} stock was not deducted — nothing to restore")

            # ── Update order status ───────────────────────────────────────
            original_status = order.status   # capture BEFORE changing
            order.status = 'cancelled'

            # ✅ Do NOT set owner_dismissed=True here.
            # The owner's row disappears via the WS broadcast below.
            # owner_dismissed stays False so the client API still returns this
            # order with cancelled_by_owner=True, letting the client see the
            # rejection reason and dismiss it themselves via the Remove button.
            # owner_dismissed is set to True only when the client clicks Remove
            # (via the client_dismiss_rejected_order endpoint).

            # Save cancel_reason + cancelled_from_status so the client sees
            # the rejection badge in the CORRECT tab after a hard page refresh.
            # cancelled_from_status is ONLY written here (reject_order) and never
            # by the client cancel_order() — making it the definitive signal to
            # identify owner-rejected orders when re-loading from the DB.
            order.cancel_reason = cancel_reason
            order.cancelled_from_status = original_status   # 'request', 'to_pay', or 'to_claim'
            order.save(update_fields=['status', 'cancel_reason', 'cancelled_from_status', 'updated_at'])

        # Broadcast restored quantities to all browser clients
        _broadcast_inventory_update_from_items(
            establishment.id,
            [(oi.menu_item_id, menu_items_map[oi.menu_item_id].quantity)
             for oi in order.orderitem_set.all()
             if oi.menu_item_id in menu_items_map]
        )

        # Broadcast order status change (removes row from owner to_pay tab + client history)
        _broadcast_order_status_update(order, 'cancelled', cancel_reason=cancel_reason,
                                       cancelled_from_status=original_status,
                                       cancelled_by_owner=True)
        try:
            OrderNotification.objects.create(
                establishment=establishment,
                order=order,
                notification_type='order_cancelled',
                message=f'Your order #{order.id} has been rejected by the establishment.'
            )
        except Exception as e:
            print(f"WARNING: notification failed: {e}")

        return JsonResponse({
            'success': True,
            'message': f'Order #{order.id} rejected and stock restored.',
            'order_id': order.id
        })

    except Exception as e:
        import traceback
        print(f"ERROR in reject_order: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)




@login_required
@require_http_methods(["POST"])
def owner_dismiss_cancelled_order(request, order_id):
    """
    Owner permanently dismisses a single client-cancelled order from the
    request tab. Sets owner_dismissed=True so it is excluded from all
    future API responses and never reappears after a page reload.

    Endpoint: POST /api/food-establishment/orders/<order_id>/dismiss/
    """
    try:
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()
        if not establishment:
            return JsonResponse({'success': False, 'message': 'No establishment found.'}, status=404)

        order = get_object_or_404(Order, id=order_id, establishment=establishment)

        if order.status != 'cancelled':
            return JsonResponse({
                'success': False,
                'message': 'Only cancelled orders can be dismissed.'
            }, status=400)

        order.owner_dismissed = True
        order.save(update_fields=['owner_dismissed'])

        return JsonResponse({
            'success': True,
            'message': f'Order #{order.id} dismissed.',
            'order_id': order.id
        })

    except Exception as e:
        import traceback
        print(f"ERROR in owner_dismiss_cancelled_order: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def client_dismiss_rejected_order(request, order_id):
    """
    Client permanently dismisses an owner-rejected order by clicking Remove.
    Sets owner_dismissed=True so the order is excluded from all future API
    responses and never reappears after a page reload.

    Called from: Client_order_history.html → doRemoveCancelledRow()
    Endpoint: POST /api/orders/<order_id>/client-dismiss/
    """
    try:
        order = get_object_or_404(
            Order,
            id=order_id,
            user=request.user,
            status='cancelled',
        )

        # Safety check — only dismiss orders the owner actually rejected
        # (not client self-cancels, which have stock_deducted=False too but
        #  owner_dismissed is already False by default — we just mark it done).
        order.owner_dismissed = True
        order.save(update_fields=['owner_dismissed'])

        return JsonResponse({
            'success': True,
            'message': f'Order #{order.id} dismissed.',
            'order_id': order.id,
        })

    except Exception as e:
        import traceback
        print(f"ERROR in client_dismiss_rejected_order: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def owner_dismiss_all_cancelled_orders(request):
    """
    Owner permanently dismisses ALL client-cancelled request orders
    in one shot. Sets owner_dismissed=True on every cancelled order
    (status='cancelled', stock_deducted=False) for this establishment
    so they never reappear after a page reload.

    Endpoint: POST /api/food-establishment/orders/dismiss-all-cancelled/
    """
    try:
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()
        if not establishment:
            return JsonResponse({'success': False, 'message': 'No establishment found.'}, status=404)

        updated = Order.objects.filter(
            establishment=establishment,
            status='cancelled',
            stock_deducted=False,
            owner_dismissed=False,
        ).update(owner_dismissed=True)

        return JsonResponse({
            'success': True,
            'dismissed_count': updated,
            'message': f'{updated} cancelled order(s) permanently dismissed.'
        })

    except Exception as e:
        import traceback
        print(f"ERROR in owner_dismiss_all_cancelled_orders: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def cancel_order(request, order_id):
    """
    Customer cancels their own order while it is still in 'request' status.
    Restores stock for all items and marks the order as 'cancelled'.

    Endpoint: /api/order/<order_id>/cancel/
    Method: POST
    """
    try:
        order = get_object_or_404(
            Order.objects.select_related('establishment', 'user')
                 .prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            user=request.user
        )

        # Customers can cancel while 'request' (pending acceptance)
        # OR while 'to_pay' (accepted but payment timer expired)
        # If already 'cancelled' (e.g. owner auto-rejected first), return success silently
        if order.status == 'cancelled':
            return JsonResponse({
                'success': True,
                'message': f'Order #{order.id} already cancelled.',
                'order_id': order.id
            })

        if order.status not in ('request', 'to_pay'):
            return JsonResponse({
                'success': False,
                'message': 'You can only cancel an order that is pending or awaiting payment.'
            }, status=400)

        # ✅ Accept optional cancel_reason from client
        cancel_reason = ''
        try:
            body_data = json.loads(request.body)
            cancel_reason = body_data.get('cancel_reason', '').strip()
        except Exception:
            pass

        with transaction.atomic():
            # ── Restore stock only if it was actually deducted ───────────
            # Stock is NOT deducted at 'request' or 'to_pay' stage.
            # Only restore if stock_deducted=True (meaning the order had
            # already reached 'preparing' or was a confirmed GCash payment).
            from django.db import connection
            use_lock = 'sqlite' not in connection.vendor
            item_ids = [oi.menu_item_id for oi in order.orderitem_set.all()]
            qs = MenuItem.objects.filter(id__in=item_ids)
            menu_items_map = {mi.id: mi for mi in (qs.select_for_update() if use_lock else qs)}

            if order.stock_deducted:
                for oi in order.orderitem_set.all():
                    mi = menu_items_map.get(oi.menu_item_id)
                    if mi:
                        mi.quantity += oi.quantity
                        mi.save(update_fields=['quantity'])
                        print(f"DEBUG cancel_order: Restored {oi.quantity} × {mi.name} → new qty {mi.quantity}")
                order.stock_deducted = False
                order.save(update_fields=['stock_deducted'])
            else:
                print(f"DEBUG cancel_order: Order #{order.pk} stock was not deducted — nothing to restore")

            order.status = 'cancelled'
            # ✅ FIX: Persist cancel_reason so it survives page reloads.
            # Use hasattr check to avoid AttributeError if model field not yet added.
            if hasattr(order, 'cancel_reason'):
                order.cancel_reason = cancel_reason
                order.save(update_fields=['status', 'updated_at', 'cancel_reason'])
            else:
                order.save(update_fields=['status', 'updated_at'])

        # Broadcast restored quantities
        _broadcast_inventory_update_from_items(
            order.establishment_id,
            [(oi.menu_item_id, menu_items_map[oi.menu_item_id].quantity)
             for oi in order.orderitem_set.all()
             if oi.menu_item_id in menu_items_map]
        )

        # Broadcast order status change → owner request tab row disappears instantly
        # cancelled_by_owner=False → client WS knows this was a self-cancel and silently
        # cleans up instead of showing a "Cancelled by Owner" badge.
        _broadcast_order_status_update(order, 'cancelled', cancel_reason=cancel_reason,
                                       cancelled_by_owner=False)

        try:
            OrderNotification.objects.create(
                establishment=order.establishment,
                order=order,
                notification_type='order_cancelled',
                message=f'Order #{order.id} was cancelled by the customer.'
            )
        except Exception as e:
            print(f"WARNING: notification failed: {e}")

        return JsonResponse({
            'success': True,
            'message': f'Order #{order.id} cancelled successfully.',
            'order_id': order.id
        })

    except Exception as e:
        import traceback
        print(f"ERROR in cancel_order: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def re_request_order(request, order_id):
    """
    Customer re-requests an expired to_pay order.
    Resets status back to 'request' — stock stays deducted (already reserved).
    Endpoint: /api/order/<order_id>/re-request/
    """
    try:
        order = get_object_or_404(
            Order.objects.select_related('establishment', 'user')
                 .prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            user=request.user
        )

        # Accept 'to_pay' (timer hasn't fired yet) OR 'cancelled' (auto-cancelled after timer)
        if order.status not in ('to_pay', 'cancelled'):
            return JsonResponse({
                'success': False,
                'message': 'Only expired or awaiting-payment orders can be re-requested.'
            }, status=400)

        with transaction.atomic():
            # ── Re-check stock availability before re-requesting ────────────
            order_items = list(order.orderitem_set.select_related('menu_item').all())
            for oi in order_items:
                mi = oi.menu_item
                if mi.quantity < oi.quantity:
                    return JsonResponse({
                        'success': False,
                        'message': f'Sorry, {mi.name} only has {mi.quantity} left '
                                   f'(you need {oi.quantity}). Please cancel and reorder with less.'
                    }, status=400)

            # ── No stock deduction on re-request ────────────────────────
            # Stock is only deducted when payment is confirmed (GCash) or
            # when the owner moves the order to 'preparing' (cash).
            # Re-requesting just resets the order back to 'request' status
            # so the owner can accept it again — no quantity change needed.
            menu_items_map = {}  # kept for broadcast below (no-op, empty)

            order.status = 'request'
            order.gcash_reference_number = None
            order.payment_confirmed_at = None
            order.stock_deducted = False
            order.save(update_fields=['status', 'gcash_reference_number',
                                      'payment_confirmed_at', 'stock_deducted', 'updated_at'])

        # No inventory broadcast needed — quantities did not change

        # Broadcast order status change (owner sees new request, client row moves tab)
        _broadcast_order_status_update(order, 'request')

        try:
            OrderNotification.objects.create(
                establishment=order.establishment,
                order=order,
                notification_type='new_order',
                message=f'Order #{order.id} re-requested by {request.user.username}'
            )
        except Exception as e:
            print(f"WARNING: notification failed: {e}")

        return JsonResponse({
            'success': True,
            'message': f'Order #{order.id} re-requested successfully.',
            'order_id': order.id
        })

    except Exception as e:
        import traceback
        print(f"ERROR in re_request_order: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def _broadcast_inventory_update_from_items(establishment_id, id_qty_pairs):
    """
    Broadcast stock restoration to all WebSocket clients watching an establishment.
    id_qty_pairs = [(menu_item_id, new_quantity), ...]
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if not channel_layer or not id_qty_pairs:
            return
        updates = [{'menu_item_id': mid, 'new_quantity': qty} for mid, qty in id_qty_pairs]
        async_to_sync(channel_layer.group_send)(
            f'inventory_{establishment_id}',
            {'type': 'inventory.quantity_update', 'updates': updates}
        )
    except Exception as e:
        print(f"WARNING _broadcast_inventory_update_from_items: {e}")


def _broadcast_order_status_update(order, new_status, cancel_reason='', cancelled_from_status='', cancelled_by_owner=False):
    """
    Broadcast an order-status change to:
      • The owner's establishment group  →  order_status_establishment_<est_id>
      • The customer's user group        →  order_status_user_<user_id>

    Called from: update_order_status, reject_order, cancel_order, create_cash_order
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        payload = {
            'type':                   'order.status.update',
            'order_id':               order.id,
            'new_status':             new_status,
            'establishment_id':       order.establishment_id,
            'user_id':                order.user_id,
            'cancel_reason':          cancel_reason,
            'cancelled_from_status':  cancelled_from_status,
            'cancelled_by_owner':     cancelled_by_owner,
        }
        sync_send = async_to_sync(channel_layer.group_send)
        # Notify the owner dashboard
        sync_send(f'order_status_establishment_{order.establishment_id}', payload)
        # Notify the customer's order history page
        sync_send(f'order_status_user_{order.user_id}', payload)
    except Exception as e:
        print(f"WARNING _broadcast_order_status_update: {e}")


def _broadcast_order_item_removed(order, item_name, order_item_id, new_total):
    """
    Broadcast a single-item removal event (partial order edit) to:
      • The owner's establishment group  →  order_status_establishment_<est_id>
      • The customer's user group        →  order_status_user_<user_id>

    Called from owner_remove_order_item when only ONE item is deleted
    from a 'request' order (not a full cancellation).
    The client-side WS handler (initClientOrderStatusWs) uses type='order_item_removed'
    to strike out the removed item row and update the order total in real time.
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        payload = {
            'type':             'order.item.removed',   # dots → method name in consumer
            'order_id':         order.id,
            'order_item_id':    order_item_id,
            'item_name':        item_name,
            'new_total':        str(new_total),
            'establishment_id': order.establishment_id,
            'user_id':          order.user_id,
        }
        sync_send = async_to_sync(channel_layer.group_send)
        # Notify both owner dashboard and customer order history page
        sync_send(f'order_status_establishment_{order.establishment_id}', payload)
        sync_send(f'order_status_user_{order.user_id}', payload)
    except Exception as e:
        print(f"WARNING _broadcast_order_item_removed: {e}")


@login_required
@require_http_methods(["GET"])
def get_order_details_establishment(request, order_id):
    """
    API endpoint to get detailed information about a specific order
    For establishment owners only

    Endpoint: /api/food-establishment/orders/<order_id>/details/
    Method: GET

    Returns JSON with complete order details including items
    """
    try:
        # Get the establishment owned by the current user
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            return JsonResponse({
                'success': False,
                'message': 'No establishment found for this user'
            }, status=404)

        # Get the order with all related data
        order = get_object_or_404(
            Order.objects.select_related('user', 'establishment')
            .prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            establishment=establishment
        )

        # Build items list
        items = []
        for order_item in order.orderitem_set.all():
            items.append({
                'id': order_item.id,
                'name': order_item.menu_item.name,
                'quantity': order_item.quantity,
                'price_at_order': str(order_item.price_at_order),
                'total_price': str(order_item.total_price),
            })

        order_data = {
            'id': order.id,
            'customer_name': order.user.username if order.user else 'Unknown',
            'customer_email': order.user.email if order.user else '',
            'status': order.status,
            'total_amount': str(order.total_amount),
            'payment_method': order.gcash_payment_method or 'cash',
            'gcash_reference': order.gcash_reference_number or '',
            'items': items,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
        }

        return JsonResponse({
            'success': True,
            'order': order_data
        })

    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Order not found'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"ERROR in get_order_details_establishment: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
def food_establishment_orders_view(request):
    """
    Main view for the orders management page
    Renders the orders list template with proper authentication

    URL: /owner/orders/
    Template: webapplication/orders_list.html
    """
    try:
        # Get the establishment owned by the current user
        establishment = FoodEstablishment.objects.filter(owner=request.user).first()

        if not establishment:
            messages.error(request, 'No establishment found for your account.')
            return redirect('owner_login')

        context = {
            'establishment': establishment,
            'pk': establishment.pk,
        }

        return render(request, 'webapplication/orders_list.html', context)

    except Exception as e:
        import traceback
        print(f"Error in food_establishment_orders_view: {str(e)}")
        print(traceback.format_exc())
        messages.error(request, 'Error loading orders page.')
        return redirect('food_establishment_dashboard')


@login_required
@require_POST
def create_cash_order(request):
    """
    Process a cash payment order.
    Updates order status, reduces stock, and creates notification.

    ✅ FIXED: Improved transaction handling and notifications
    ✅ FIXED: Better error messages and debugging

    Expected POST data:
    - order_id: The ID of the order to process

    Returns:
    - JSON response with success status

    Endpoint: /payment/create-cash-order/
    Called from: cart.js -> proceedToCashPayment()
    """
    try:
        # Get order ID from POST data
        order_id = request.POST.get('order_id')

        # Validate order ID
        if not order_id:
            return JsonResponse({
                'success': False,
                'message': 'Order ID is required'
            }, status=400)

        # Get the order and verify it belongs to the logged-in user
        order = get_object_or_404(Order, id=order_id, user=request.user)

        # Debug logging
        print(f"DEBUG: Processing cash order #{order_id}")
        print(f"DEBUG: Order establishment: {order.establishment.name}")
        print(f"DEBUG: Order user: {request.user.username}")

        # Start atomic transaction to ensure data consistency
        with transaction.atomic():
            # Determine new status based on source:
            # - From cart (order is PENDING): set to 'request' waiting for owner acceptance
            # - From checkout (order is 'to_pay'): owner already accepted, set to 'preparing'
            source = request.POST.get('source', 'cart')
            if order.status == 'to_pay' or source == 'checkout':
                new_status = 'preparing'
            else:
                new_status = 'request'

            # ── Existing-request-order merge / block logic ─────────────────
            # Only applies when the cart order is PENDING (new submission from cart).
            # If the customer already has a 'request' order for the same establishment
            # that the owner has NOT yet accepted, we must merge the items rather than
            # creating a second parallel request.
            #
            # Rules:
            #   1. For each item in the cart being submitted, check whether the same
            #      menu item already exists in the existing 'request' order.
            #   2. If combined quantity would EXCEED the menu item's max stock →
            #      BLOCK the submission entirely and return an error message.
            #   3. If combined quantity is within max stock → MERGE: add the new
            #      quantities onto the existing request order items, delete the
            #      PENDING cart order, and return a success + info message.
            if order.status == 'PENDING' and new_status == 'request':
                existing_request = Order.objects.filter(
                    user=request.user,
                    establishment=order.establishment,
                    status='request'
                ).order_by('-created_at').first()

                if existing_request:
                    # Determine which cart items we're about to submit
                    selected_item_ids_raw = request.POST.getlist('selected_item_ids[]')
                    selected_item_ids = [int(i) for i in selected_item_ids_raw if str(i).isdigit()]
                    if selected_item_ids:
                        cart_items_to_submit = order.orderitem_set.filter(id__in=selected_item_ids)
                    else:
                        cart_items_to_submit = order.orderitem_set.all()

                    # ── Step 1: Auto-clamp each cart item's qty to what's actually remaining ──
                    # Build a lookup of existing request quantities once, to avoid repeated DB hits.
                    req_qty_map = {}
                    for req_oi in existing_request.orderitem_set.select_related('menu_item').all():
                        req_qty_map[req_oi.menu_item_id] = req_oi.quantity

                    # Clamp in memory — do NOT save yet; we use the clamped value during merge.
                    clamped_qtys = {}  # cart_oi.id → clamped quantity
                    for cart_oi in cart_items_to_submit:
                        menu_item = cart_oi.menu_item
                        existing_qty = req_qty_map.get(menu_item.id, 0)
                        remaining = max(0, menu_item.quantity - existing_qty)
                        clamped_qtys[cart_oi.id] = min(cart_oi.quantity, remaining)

                    # ── Step 2: Merge — stack clamped quantities onto existing request ─
                    for cart_oi in cart_items_to_submit:
                        qty_to_add = clamped_qtys.get(cart_oi.id, 0)
                        if qty_to_add <= 0:
                            continue  # nothing left to add for this item — skip silently
                        menu_item = cart_oi.menu_item
                        existing_req_item = OrderItem.objects.filter(
                            order=existing_request,
                            menu_item=menu_item
                        ).first()
                        if existing_req_item:
                            existing_req_item.quantity = min(
                                existing_req_item.quantity + qty_to_add,
                                menu_item.quantity
                            )
                            existing_req_item.save()
                        else:
                            OrderItem.objects.create(
                                order=existing_request,
                                menu_item=menu_item,
                                quantity=qty_to_add,
                                price_at_order=cart_oi.price_at_order,
                            )

                    # Recalculate total of the existing request order
                    new_total = sum(
                        oi.quantity * oi.price_at_order
                        for oi in existing_request.orderitem_set.all()
                    )
                    existing_request.total_amount = new_total
                    existing_request.save(update_fields=['total_amount'])

                    # Remove submitted items from the PENDING cart order
                    if selected_item_ids:
                        order.orderitem_set.filter(id__in=selected_item_ids).delete()
                    else:
                        order.orderitem_set.all().delete()

                    # Delete the (now empty) PENDING cart order
                    if not order.orderitem_set.exists():
                        order.delete()

                    # Broadcast the update
                    _broadcast_order_status_update(existing_request, existing_request.status)

                    return JsonResponse({
                        'success': True,
                        'merged': True,
                        'message': (
                            'Your order has been updated! The items have been added to your '
                            'existing pending order request. The establishment will be notified.'
                        ),
                        'order_id': existing_request.id,
                    })

            # ── End of merge/block logic ───────────────────────────────────

            # ✅ Handle partial selection (only checked items go into the new order)
            # selected_item_ids[] are OrderItem IDs the user checked in the cart.
            # IMPORTANT: We do NOT delete unchecked items from the original order.
            # Instead, we create a brand-new Order for the checked items only,
            # so unchecked items remain in the original cart order untouched.
            selected_item_ids_raw = request.POST.getlist('selected_item_ids[]')
            selected_item_ids = [int(i) for i in selected_item_ids_raw if str(i).isdigit()]

            if selected_item_ids:
                # Get only the checked OrderItems
                checked_items = order.orderitem_set.filter(id__in=selected_item_ids)

                if not checked_items.exists():
                    return JsonResponse({
                        'success': False,
                        'message': 'No valid items selected.'
                    }, status=400)

                # Create a brand-new Order for the checked items only
                new_order = Order.objects.create(
                    user=order.user,
                    establishment=order.establishment,
                    status=new_status,
                    gcash_payment_method='cash',
                    gcash_reference_number=f'CASH-{order.id}-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                    payment_confirmed_at=timezone.now(),
                )

                # Copy checked OrderItems into the new order
                total = Decimal('0.00')
                for oi in checked_items:
                    OrderItem.objects.create(
                        order=new_order,
                        menu_item=oi.menu_item,
                        quantity=oi.quantity,
                        price_at_order=oi.price_at_order,
                    )
                    total += oi.price_at_order * oi.quantity

                new_order.total_amount = total
                new_order.save(update_fields=['total_amount'])

                # Remove checked items from the original cart-order
                # (they now belong to new_order; unchecked items stay intact)
                checked_items.delete()

                # If original order is now empty, clean it up
                if not order.orderitem_set.exists():
                    order.delete()

                active_order = new_order

            else:
                # No filter provided — process entire order (checkout flow or legacy)
                # Accept payment_method param but always store in gcash_payment_method field
                payment_method = request.POST.get('payment_method', 'cash')
                order.status = new_status
                order.gcash_payment_method = payment_method
                order.gcash_reference_number = f'CASH-{order.id}-{timezone.now().strftime("%Y%m%d%H%M%S")}'
                order.payment_confirmed_at = timezone.now()
                order.save()
                active_order = order

            print(f"DEBUG: Order saved with status: {active_order.status}")

            # ── Stock deduction rule ─────────────────────────────────────
            # Deduct ONLY when payment is actually confirmed:
            #   • 'preparing': owner accepted a cash order from checkout
            #     (source=checkout or order was already 'to_pay').
            #     Stock is deducted immediately here.
            #   • 'request': customer just submitted — waiting for owner to
            #     accept. Do NOT deduct yet. Stock will be deducted when the
            #     owner moves the order to 'preparing' in update_order_status.
            #   • GCash/online orders are handled in gcash_payment_success /
            #     paymongo_webhook — never in create_cash_order.
            if new_status == 'preparing':
                _deduct_stock_and_clear_cart(active_order)
                # Broadcast updated quantities to all WS clients
                updated_items = list(active_order.orderitem_set.select_related('menu_item').all())
                id_qty_pairs = [(oi.menu_item_id, MenuItem.objects.get(pk=oi.menu_item_id).quantity) for oi in updated_items]
                _broadcast_inventory_update_from_items(active_order.establishment_id, id_qty_pairs)

            # ✅ FIXED: Create notification for establishment owner
            try:
                notification = OrderNotification.objects.create(
                    order=active_order,
                    establishment=active_order.establishment,
                    notification_type='new_order',
                    message=f'New cash order #{active_order.id} from {request.user.username}'
                )
                print(f"DEBUG: Created notification #{notification.id}")
            except Exception as notification_error:
                # Log notification error but don't fail the order
                print(f"WARNING: Failed to create notification: {str(notification_error)}")
                import traceback
                print(traceback.format_exc())
                # Order will still complete successfully

        print(f"DEBUG: Order #{active_order.id} processed successfully")

        # Broadcast order status change to owner dashboard + customer history
        _broadcast_order_status_update(active_order, active_order.status)

        # Return success response
        return JsonResponse({
            'success': True,
            'message': 'Order placed successfully',
            'order_id': active_order.id
        })

    except Order.DoesNotExist:
        print(f"ERROR: Order {order_id} not found")
        return JsonResponse({
            'success': False,
            'message': 'Order not found or does not belong to you'
        }, status=404)

    except Exception as e:
        # Log the full error for debugging
        print(f"ERROR in create_cash_order: {str(e)}")
        import traceback
        print(traceback.format_exc())

        return JsonResponse({
            'success': False,
            'message': f'An error occurred while processing your order: {str(e)}'
        }, status=500)


@login_required
def debug_order_status(request, order_id):
    """
    Debug endpoint to check order status and details
    Add this route to urls.py: path('debug/order/<int:order_id>/', views.debug_order_status, name='debug_order')
    """
    try:
        order = Order.objects.get(id=order_id)

        items = []
        for item in order.orderitem_set.all():
            items.append({
                'name': item.menu_item.name,
                'quantity': item.quantity,
                'price': str(item.price_at_order)
            })

        debug_info = {
            'order_id': order.id,
            'status': order.status,
            'establishment_id': order.establishment.id,
            'establishment_name': order.establishment.name,
            'establishment_owner': order.establishment.owner.username,
            'customer': order.user.username,
            'total_amount': str(order.total_amount),
            'payment_method': order.gcash_payment_method,
            'reference': order.gcash_reference_number,
            'created_at': order.created_at.isoformat(),
            'payment_confirmed_at': order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
            'items': items,
            'items_count': order.get_item_count(),
        }

        return JsonResponse({
            'success': True,
            'order': debug_info
        })

    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Order not found'
        }, status=404)
    except Exception as e:
        import traceback
        return JsonResponse({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


def payment_success(request):
    """
    Display the payment success page after order completion.
    Works for both cash and online payments.

    ✅ FIXED: Better error handling and context

    Query parameters:
    - order_id: The ID of the completed order (required)
    - payment_method: 'cash' or 'online' (optional, defaults to 'online')

    Returns:
    - Rendered payment_success.html template with order details

    Endpoint: /payment/success/
    Accessed from:
    - Cash payment: cart.js after create_cash_order success
    - Online payment: PayMongo callback redirect
    """
    try:
        # Get query parameters
        order_id = request.GET.get('order_id')
        payment_method = request.GET.get('payment_method', 'online')

        print(f"DEBUG: payment_success called - order_id: {order_id}, payment_method: {payment_method}")

        # Validate order ID
        if not order_id:
            print("ERROR: No order_id provided")
            messages.error(request, 'No order ID provided')
            return redirect('view_cart')

        # Get the order and verify it belongs to the logged-in user
        order = get_object_or_404(Order, id=order_id, user=request.user)

        print(f"DEBUG: Order found - ID: {order.id}, Status: {order.status}")

        # Get all order items for the confirmation page
        order_items = order.orderitem_set.select_related('menu_item').all()

        # Prepare context data for template
        context = {
            'order': order,
            'order_items': order_items,
            'payment_method': payment_method,  # 'cash' or 'online'
        }

        # Render the unified order confirmation page (works for both cash and online)
        return render(request, 'webapplication/order_confirmation.html', context)

    except Order.DoesNotExist:
        # Order not found or doesn't belong to user
        print(f"ERROR: Order {order_id} not found for user {request.user.username}")
        messages.error(request, 'Order not found')
        return redirect('view_cart')

    except Exception as e:
        # Log error and redirect to cart
        print(f"ERROR in payment_success: {str(e)}")
        import traceback
        print(traceback.format_exc())
        messages.error(request, 'Error loading payment success page')
        return redirect('view_cart')


@login_required
def paymongo_payment_success(request):
    """
    Handler for PayMongo payment success callback.
    This redirects to the unified payment_success view.

    Query parameters from PayMongo:
    - checkout_id: The PayMongo checkout session ID

    Returns:
    - Redirect to payment_success view with order details

    Endpoint: /payment/paymongo/success/
    Called from: PayMongo redirect after successful payment
    """
    try:
        # Get checkout session ID from PayMongo callback
        checkout_id = request.GET.get('checkout_id')

        if not checkout_id:
            return redirect('cart_view')

        # Find the order associated with this PayMongo checkout session
        order = Order.objects.filter(
            paymongo_checkout_id=checkout_id,
            user=request.user
        ).first()

        if not order:
            return redirect('cart_view')

        # Optional: Verify payment status with PayMongo API here
        # ... your existing PayMongo verification code ...

        # Update order if needed (if not already updated by webhook)
        if order.status in ('PENDING', 'to_pay'):
            with transaction.atomic():
                order.status = 'preparing'  # Payment done → move to preparing
                order.payment_confirmed_at = timezone.now()
                order.gcash_payment_method = 'gcash'  # online payment
                order.save()

                # ✅ Use shared helper so the stock_deducted flag is set and
                # double-deduction is impossible (e.g. if webhook already ran).
                _deduct_stock_and_clear_cart(order)

                # Broadcast updated inventory to all WS clients
                try:
                    updated_items = list(order.orderitem_set.select_related('menu_item').all())
                    id_qty_pairs = [(oi.menu_item_id, MenuItem.objects.get(pk=oi.menu_item_id).quantity) for oi in updated_items]
                    _broadcast_inventory_update_from_items(order.establishment_id, id_qty_pairs)
                    _broadcast_order_status_update(order, order.status)
                except Exception as _bcast_err:
                    print(f"WARNING broadcast after paymongo payment: {_bcast_err}")

                # Create notification
                try:
                    OrderNotification.objects.create(
                        order=order,
                        establishment=order.establishment,
                        notification_type='new_order',
                        message=f'New online order #{order.id} from {request.user.username}'
                    )
                except Exception as e:
                    print(f"Warning: Failed to create notification: {str(e)}")

        # Redirect to the unified success page
        return redirect(f'/payment/success/?order_id={order.id}&payment_method=online')

    except Exception as e:
        print(f"Error in paymongo_payment_success: {str(e)}")
        print(traceback.format_exc())
        return redirect('cart_view')


@login_required
def food_establishment_transaction_history(request):
    """
    Display transaction history page for food establishment owners
    Shows a dashboard with all payment transactions

    URL: /owner/transactions/
    Template: transaction_history.html
    """
    try:
        # Get the food establishment owned by the current user
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

        context = {
            'establishment': establishment,
            'pk': establishment.pk,
        }

        return render(request, 'webapplication/transaction_history.html', context)

    except FoodEstablishment.DoesNotExist:
        return render(request, 'webapplication/error.html', {
            'error_message': 'You do not have a registered food establishment.'
        })


def get_establishment_transactions(request):
    """
    API endpoint to get all transactions for the food establishment
    Returns JSON with transaction details and statistics

    URL: /api/establishment/transactions/
    Method: GET
    Returns: JSON with transactions and statistics
    """
    try:
        # Get the food establishment owned by the current user
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

        # ✅ FIXED: Only show COMPLETED orders in transaction history
        orders = Order.objects.filter(
            establishment=establishment,
            status='completed'
        ).select_related(
            'user', 'establishment'
        ).prefetch_related(
            'orderitem_set__menu_item'
        ).order_by('-created_at')

        # Build transactions data
        transactions_data = []

        for order in orders:
            # Get order items
            items = []
            for order_item in order.orderitem_set.all():
                items.append({
                    'name': order_item.menu_item.name,
                    'quantity': order_item.quantity,
                    'price': str(order_item.price_at_order),
                    'total': str(order_item.total_price),
                })

            # Determine payment method display name
            payment_method = order.gcash_payment_method or 'cash'
            payment_method_display_map = {
                'gcash': 'GCash',
                'paymaya': 'PayMaya',
                'cash': 'Cash',
                'card': 'Credit/Debit Card',
                'paymongo': 'PayMongo',
            }
            payment_method_display = payment_method_display_map.get(
                payment_method.lower(),
                payment_method.upper()
            )

            # Build transaction data
            transaction_data = {
                'order_id': order.id,
                'order_number': order.gcash_reference_number or f"ORD-{order.id}",
                'created_at': order.created_at.isoformat(),
                'payment_confirmed_at': order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
                'customer_name': f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username,
                'customer_email': order.user.email,
                'amount': str(order.total_amount),
                'payment_method': payment_method.lower(),
                'payment_method_display': payment_method_display,
                'reference_number': order.gcash_reference_number or order.paymongo_checkout_id or 'N/A',
                'status': order.status,
                'items': items,
            }

            transactions_data.append(transaction_data)

        # Calculate statistics
        # ✅ Total revenue — only from completed orders
        total_revenue = orders.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')

        # ✅ Total transactions count — only completed
        total_transactions = orders.count()

        # ✅ Monthly revenue (current month) — only completed
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = orders.filter(
            created_at__gte=month_start
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')

        # ✅ Success rate: completed orders vs ALL orders
        all_orders_count = Order.objects.filter(establishment=establishment).count()
        completed_orders_count = orders.count()

        if all_orders_count > 0:
            success_rate = round((completed_orders_count / all_orders_count) * 100, 1)
        else:
            success_rate = 0

        statistics = {
            'total_revenue': str(total_revenue),
            'total_transactions': total_transactions,
            'monthly_revenue': str(monthly_revenue),
            'success_rate': success_rate,
        }

        return JsonResponse({
            'success': True,
            'transactions': transactions_data,
            'statistics': statistics,
            'establishment_name': establishment.name,
        })

    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Food establishment not found'
        }, status=404)

    except Exception as e:
        import traceback
        print(f"Error in get_establishment_transactions: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@login_required
def get_establishment_transaction_statistics(request):
    """
    Get detailed transaction statistics for charts and analytics

    URL: /api/establishment/transaction-stats/
    Method: GET
    Returns: JSON with detailed statistics
    """
    try:
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

        # Get date range (last 30 days by default)
        days = int(request.GET.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Get orders in date range
        orders = Order.objects.filter(
            establishment=establishment,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Revenue by payment method
        revenue_by_method = orders.values('gcash_payment_method').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        ).order_by('-total')

        # Revenue by day (for charts)
        daily_revenue = {}
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_orders = orders.filter(
                created_at__date=date.date()
            )
            daily_revenue[date.strftime('%Y-%m-%d')] = {
                'revenue': str(day_orders.aggregate(total=Sum('total_amount'))['total'] or 0),
                'count': day_orders.count()
            }

        # Top customers
        top_customers = orders.values(
            'user__username',
            'user__first_name',
            'user__last_name'
        ).annotate(
            total_spent=Sum('total_amount'),
            order_count=Count('id')
        ).order_by('-total_spent')[:10]

        return JsonResponse({
            'success': True,
            'revenue_by_method': list(revenue_by_method),
            'daily_revenue': daily_revenue,
            'top_customers': list(top_customers),
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


# ==========================================
# ORDER HISTORY VIEWS - UPDATED           FOR CLIENT SIDE
# ==========================================


def order_history_view(request):
    _ensure_user_profile(request.user)
    """
    Display the order history page.
    Accessible without login — shows empty state for unauthenticated users.
    """
    cart_count = 0
    if request.user.is_authenticated:
        cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

    return render(request, 'webapplication/Client_order_history.html', {
        'cart_count': cart_count,
    })


@login_required
def my_receipts_view(request):
    """
    My Receipts page — shows all confirmed orders with printable receipts.
    URL: /my-receipts/
    """
    orders = Order.objects.filter(
        user=request.user
    ).exclude(
        status__in=['PENDING', 'cancelled', 'CANCELLED']
    ).select_related(
        'establishment'
    ).prefetch_related(
        Prefetch('orderitem_set', queryset=OrderItem.objects.select_related('menu_item'))
    ).order_by('-created_at')

    orders_data = []
    for order in orders:
        items = []
        for oi in order.orderitem_set.all():
            items.append({
                'name':       oi.menu_item.name,
                'quantity':   oi.quantity,
                'price':      float(oi.price_at_order),
                'subtotal':   float(oi.price_at_order * oi.quantity),
                'image':      oi.menu_item.image.url if oi.menu_item.image else None,
            })

        status_map = {
            'request': 'Order Request',
            'to_pay': 'To Pay',
            'order_received': 'Preparing',
            'preparing': 'Preparing',
            'to_claim': 'To Claim',
            'completed': 'Completed',
        }
        status_label = status_map.get(order.status, order.status.capitalize())

        payment_map = {
            'cash': 'Cash on Pickup',
            'gcash': 'GCash',
            'paymaya': 'Maya',
            'card': 'Card',
        }
        payment_label = payment_map.get(order.gcash_payment_method or '', 'Online Payment')

        orders_data.append({
            'id':              order.id,
            'status':          order.status,
            'status_label':    status_label,
            'total_amount':    float(order.total_amount),
            'payment_method':  payment_label,
            'reference':       order.gcash_reference_number or '',
            'created_at':      order.created_at.strftime('%b %d, %Y · %I:%M %p'),
            'created_date':    order.created_at.strftime('%b %d, %Y'),
            'establishment': {
                'name':    order.establishment.name,
                'address': order.establishment.address or '',
                'image':   order.establishment.image.url if order.establishment.image else None,
            },
            'items': items,
            'item_count': len(items),
        })

    return render(request, 'webapplication/my_receipts.html', {
        'orders':      orders_data,
        'orders_json': json.dumps(orders_data, ensure_ascii=False),
    })

def get_user_transaction_history(request):
    """
    API endpoint to get all orders for the logged-in user.
    Returns JSON with order details including items.
    Endpoint: /api/user/transactions/
    """
    if not request.user.is_authenticated:
        return JsonResponse({'success': True, 'orders': []})

    try:
        # Get all orders for the user that have been formally submitted (status = 'request' or beyond).
        # EXCLUDE 'PENDING' — these are cart orders that haven't been submitted yet.
        # INCLUDE owner-rejected 'cancelled' orders so the client can show the reason
        # even after a page refresh (not just via WS). Client uses lsIsDismissed to
        # hide rows the user has already dismissed.
        # EXCLUDE client-self-cancelled orders (cancel_reason may be set but owner_dismissed=False
        # means it was a client cancel — actually simpler: exclude cancelled where stock_deducted
        # matches a client cancel pattern). Simplest rule: return cancelled only if owner_dismissed=True
        # (owner rejected) OR if it's not cancelled at all.
        from django.db.models import Q as Q
        # ✅ FIX: Include ALL owner-rejected cancelled orders so client sees the reason
        # after a page refresh — regardless of which stage the order was in when rejected:
        #   • request  → stock_deducted=False (stock was never taken)
        #   • to_pay   → stock_deducted=True  (stock was deducted at acceptance)
        #   • to_claim → stock_deducted=True  (stock was deducted at acceptance)
        # We identify owner-rejected orders by: status='cancelled', owner_dismissed=False.
        # Client-self-cancelled orders are excluded via the owner_dismissed check because
        # the owner dismisses them (owner_dismissed=True) after they cancel. Orders that
        # the client cancelled themselves and the owner hasn't dismissed yet would still
        # appear, but those are harmless — the client already knows they cancelled.
        # Include owner-rejected cancelled orders (cancelled_from_status is non-empty)
        # Exclude client-self-cancelled orders (cancelled_from_status is empty/null)
        # Exclude owner-dismissed orders (fully handled on both sides)
        orders = Order.objects.filter(
            user=request.user
        ).exclude(
            status__in=['PENDING', 'CANCELLED']
        ).filter(
            Q(~Q(status='cancelled')) |
            Q(status='cancelled', owner_dismissed=False, cancelled_from_status__gt='')
        ).exclude(
            status='cancelled', owner_dismissed=True
        ).select_related(
            'establishment'
        ).prefetch_related(
            Prefetch('orderitem_set', queryset=OrderItem.objects.select_related('menu_item'))
        ).order_by('-created_at')

        client_status_map = {
            'request':        'request',
            'to_pay':         'to_pay',
            'PAID':           'preparing',
            'order_received': 'preparing',
            'preparing':      'preparing',
            'to_claim':       'to_claim',
            'completed':      'completed',
            # ✅ 'cancelled' is NOT mapped here — it is handled per-order below
            # using cancelled_from_status so the row appears in the correct tab:
            # request → request tab, to_pay → to_pay tab, to_claim → to_claim tab.
        }

        orders_data = []
        for order in orders:
            raw_status        = order.status or 'PENDING'

            # ✅ For owner-rejected (cancelled) orders, route to the tab they came from.
            # cancelled_from_status is stored on the model (request / to_pay / to_claim).
            # Fall back to 'request' if not available (older orders before this fix).
            if raw_status == 'cancelled':
                cf = order.cancelled_from_status or ''
                if cf in ('to_pay', 'to_claim'):
                    normalized_status = cf
                else:
                    normalized_status = 'request'
            else:
                normalized_status = client_status_map.get(raw_status, raw_status.lower())

            items = []
            for oi in order.orderitem_set.all():
                items.append({
                    'name':             oi.menu_item.name,
                    'quantity':         oi.quantity,
                    'price':            str(oi.price_at_order),
                    'total_price':      str(oi.price_at_order * oi.quantity),
                    'menu_item_id':     oi.menu_item.id,
                    # ✅ available_stock = live menu item quantity at this moment.
                    # Used by the client order history page to warn customers in
                    # 'to_pay' orders when another order has consumed the same item.
                    'available_stock':  oi.menu_item.quantity,
                    'image':            oi.menu_item.image.url if oi.menu_item.image else None,
                })

            orders_data.append({
                'id':                  order.id,
                'order_number':        order.gcash_reference_number or f"ORD-{order.id}",
                'status':              normalized_status,
                'raw_status':          raw_status,
                'total_amount':        str(order.total_amount),
                'payment_method':      normalize_payment_method(order.gcash_payment_method),
                'created_at':          order.created_at.isoformat(),
                'updated_at':          order.updated_at.isoformat(),
                'payment_confirmed_at': order.payment_confirmed_at.isoformat()
                                        if order.payment_confirmed_at else None,
                'establishment_id':    order.establishment.id,
                'establishment_name':  order.establishment.name,
                'establishment_address': order.establishment.address,
                'establishment_image': order.establishment.image.url
                                       if order.establishment.image else None,
                'items': items,
                # ✅ Include cancel info so client can show reason after page refresh.
                # cancelled_by_owner=True for ALL owner-rejected orders regardless of stage.
                # cancelled_from_status tells the client which tab to show the row in.
                'cancelled_by_owner': (
                    raw_status == 'cancelled'
                    and not order.owner_dismissed
                    and bool(order.cancelled_from_status)
                ),
                'cancelled_from_status': order.cancelled_from_status or '',
                'cancel_reason':         order.cancel_reason or '',
            })

        return JsonResponse({
            'success':      True,
            'orders':       orders_data,
            'total_orders': len(orders_data),
        })

    except Exception as e:
        import traceback
        print(f"ERROR in get_user_transaction_history: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@login_required
def reorder_items(request, order_id):
    """
    API endpoint to add all items from a previous order to the cart.
    Supports optional custom quantities passed as JSON body: { "quantities": { "Item Name": qty } }

    Used by: Client_order_history.html (Reorder modal)
    Endpoint: /api/reorder/<order_id>/
    Method: POST
    """
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': 'Invalid request method'
        }, status=405)

    try:
        from .models import Cart, CartItem
        from django.db import transaction

        # Parse optional custom quantities
        custom_quantities = {}
        try:
            body = json.loads(request.body or '{}')
            custom_quantities = body.get('quantities', {})
        except (json.JSONDecodeError, AttributeError):
            pass

        # Get the order and verify it belongs to the user
        order = Order.objects.get(id=order_id, user=request.user)

        # Get or create the user's cart (Cart is per-user, not per-establishment)
        cart, created = Cart.objects.get_or_create(user=request.user)

        # Add each item from the order to the cart
        with transaction.atomic():
            for order_item in order.orderitem_set.all():
                # Use custom quantity if provided, else fall back to original qty
                qty = custom_quantities.get(order_item.menu_item.name, order_item.quantity)
                try:
                    qty = max(1, int(qty))
                except (ValueError, TypeError):
                    qty = order_item.quantity

                # Clamp to available stock
                available = order_item.menu_item.quantity
                if available == 0:
                    continue  # Skip out-of-stock items silently
                qty = min(qty, available)

                cart_item, item_created = CartItem.objects.get_or_create(
                    cart=cart,
                    menu_item=order_item.menu_item,
                    defaults={'quantity': qty}
                )

                if not item_created:
                    # If item already in cart, update to the new qty
                    cart_item.quantity = min(cart_item.quantity + qty, available)
                    cart_item.save()

        return JsonResponse({
            'success': True,
            'message': 'Items added to cart successfully',
            'cart_count': CartItem.objects.filter(cart__user=request.user).count()
        })

    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Order not found or does not belong to you'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"Error in reorder_items: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@login_required
@require_http_methods(["GET"])
def check_order_stock(request, order_id):
    """
    Real-time stock availability check for a specific order.
    Called by the checkout page every ~10 seconds so customers are warned
    immediately when another order consumes the same item while they wait.

    Returns per-item availability so the frontend can highlight exactly
    which items are no longer available.

    Endpoint: GET /api/order/<order_id>/check-stock/
    Response:
    {
        "available": true,          // false if ANY item has insufficient stock
        "items": [
            {
                "name": "Sinigang na manok",
                "ordered_qty": 10,
                "available_qty": 3,
                "sufficient": false
            },
            ...
        ]
    }
    """
    try:
        order = get_object_or_404(
            Order.objects.prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            user=request.user,
        )

        items_status = []
        all_available = True

        for oi in order.orderitem_set.select_related('menu_item').all():
            mi = oi.menu_item
            sufficient = mi.quantity >= oi.quantity
            if not sufficient:
                all_available = False
            items_status.append({
                'name': mi.name,
                'ordered_qty': oi.quantity,
                'available_qty': mi.quantity,
                'sufficient': sufficient,
            })

        return JsonResponse({
            'available': all_available,
            'order_status': order.status,
            'items': items_status,
        })

    except Exception as e:
        return JsonResponse({'available': False, 'error': str(e)}, status=500)


def get_order_details(request, order_id):
    """
    API endpoint to get detailed information about a specific order

    Used by: Order details page
    Endpoint: /api/order/<order_id>/
    Method: GET
    """
    try:
        order = Order.objects.select_related(
            'establishment', 'user'
        ).prefetch_related(
            Prefetch('orderitem_set', queryset=OrderItem.objects.select_related('menu_item'))
        ).get(id=order_id, user=request.user)

        # Get order items
        items = []
        for order_item in order.orderitem_set.all():
            # Calculate item price and total
            if hasattr(order_item, 'price') and order_item.price:
                item_price = order_item.price
            else:
                item_price = order_item.menu_item.price

            item_total = order_item.quantity * item_price

            items.append({
                'id': order_item.menu_item.id,   # ← needed for /cart/add/ realtime reorder
                'name': order_item.menu_item.name,
                'quantity': order_item.quantity,
                'price': str(item_price),
                'total_price': str(item_total),
                'image': order_item.menu_item.image.url if order_item.menu_item.image else None,
                'available_stock': order_item.menu_item.quantity,  # live stock count
            })

        order_data = {
            'id': order.id,
            'order_number': order.gcash_reference_number or f"ORD-{order.id}",
            'status': order.status,
            'total_amount': str(order.total_amount),
            'created_at': order.created_at.isoformat(),
            'payment_confirmed_at': order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
            'establishment': {
                'id': order.establishment.id,
                'name': order.establishment.name,
                'address': order.establishment.address,
                'image': order.establishment.image.url if order.establishment.image else None,
            },
            'items': items,
        }

        return JsonResponse({
            'success': True,
            'order': order_data
        })

    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Order not found'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"Error in get_order_details: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
import os

@csrf_exempt
def create_admin_user(request):
    """
    Emergency endpoint to create superuser via browser
    URL: /create-admin/?secret=create-admin-2024

    ⚠️ SECURITY WARNING: Remove this URL after creating admin!
    """
    # Check secret key
    secret = request.GET.get('secret', '')
    expected_secret = os.getenv('ADMIN_CREATION_SECRET', 'create-admin-2024')

    if secret != expected_secret:
        return JsonResponse({
            'error': 'Access Denied',
            'message': 'Invalid secret key',
            'hint': 'Add ?secret=create-admin-2024 to the URL'
        }, status=403)

    try:
        User = get_user_model()

        # Get credentials from environment or use defaults
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admindev')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admindev@kabsueats.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admindev')

        # Check if superuser already exists
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()

            return JsonResponse({
                'status': 'success',
                'action': 'updated',
                'message': f'✅ Superuser "{username}" already existed. Password has been reset.',
                'credentials': {
                    'username': username,
                    'password': password
                },
                'next_step': 'Go to /admin/ to login',
                'admin_url': f'{request.scheme}://{request.get_host()}/admin/',
                'warning': '⚠️ Remember to remove /create-admin/ URL after logging in!'
            })
        else:
            # Create new superuser
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )

            return JsonResponse({
                'status': 'success',
                'action': 'created',
                'message': f'✅ Superuser "{username}" created successfully!',
                'credentials': {
                    'username': username,
                    'password': password
                },
                'next_step': 'Go to /admin/ to login',
                'admin_url': f'{request.scheme}://{request.get_host()}/admin/',
                'warning': '⚠️ Remember to remove /create-admin/ URL after logging in!'
            })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'❌ Failed to create superuser: {str(e)}',
            'type': type(e).__name__
        }, status=500)


# ============================================================
# ✅ NEW: REALTIME API — single establishment live data
# ============================================================
def get_establishment_realtime(request, establishment_id):
    """
    Returns live status, menu item quantities/availability/top-seller flags,
    rating, and review count for a specific establishment.
    Called by status_updater.js every 30 seconds on the details page.
    """
    from django.db.models import Avg, Count as DjCount
    try:
        establishment = get_object_or_404(
            FoodEstablishment.objects.prefetch_related('categories', 'amenities'),
            id=establishment_id,
            is_active=True,
        )

        status = get_current_status(establishment.opening_time, establishment.closing_time)

        # ── Menu items (only fields needed by frontend) ──
        menu_items_data = list(
            MenuItem.objects.filter(food_establishment=establishment)
            .values('id', 'name', 'quantity', 'is_top_seller', 'price')
        )
        for m in menu_items_data:
            m['is_available'] = m['quantity'] > 0
            m['price'] = float(m['price'])

        # ── Rating ──
        rating_agg = establishment.reviews.aggregate(
            avg=Avg('rating'),
            count=DjCount('id'),
        )
        avg_rating   = round(float(rating_agg['avg']), 1) if rating_agg['avg'] else 0.0
        review_count = rating_agg['count'] or 0

        # ── Categories string ──
        cat_names = list(establishment.categories.values_list('name', flat=True))
        if establishment.other_category:
            cat_names.append(establishment.other_category)

        return JsonResponse({
            'success':         True,
            'establishment_id': establishment_id,
            'status':          status,
            'name':            establishment.name,
            'address':         establishment.address,
            'payment_methods': establishment.payment_methods or '',
            'opening_time':    establishment.opening_time.strftime('%I:%M %p') if establishment.opening_time else None,
            'closing_time':    establishment.closing_time.strftime('%I:%M %p') if establishment.closing_time else None,
            'opening_24h':     establishment.opening_time.strftime('%H:%M') if establishment.opening_time else '',
            'closing_24h':     establishment.closing_time.strftime('%H:%M') if establishment.closing_time else '',
            'categories':      ', '.join(cat_names) if cat_names else 'N/A',
            'average_rating':  avg_rating,
            'review_count':    review_count,
            'image_url':       request.build_absolute_uri(establishment.image.url) if establishment.image else None,
            'menu_items':      menu_items_data,
            'last_modified':   cache.get(f'est_{establishment_id}_last_modified', 0),  # ✅ sync signal
        })

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'get_establishment_realtime error: {e}')
        return JsonResponse({'error': 'database_unavailable'}, status=503)



# ============================================================
# ✅ Lightweight Open/Closed Status API for Cart Page Polling
# URL: /api/establishment/<id>/status/
# Returns just the current open/closed status for the cart.
# ============================================================
def get_establishment_open_status(request, establishment_id):
    """
    Returns only the open/closed status for a given establishment.
    Used by the cart page to poll every 60 seconds for realtime open/closed state.
    """
    try:
        establishment = get_object_or_404(
            FoodEstablishment,
            id=establishment_id,
            is_active=True,
        )
        status = get_current_status(establishment.opening_time, establishment.closing_time)
        return JsonResponse({
            'success': True,
            'establishment_id': establishment_id,
            'status': status,
            'opening_time': establishment.opening_time.strftime('%I:%M %p') if establishment.opening_time else None,
            'closing_time': establishment.closing_time.strftime('%I:%M %p') if establishment.closing_time else None,
        })
    except Exception as e:
        return JsonResponse({'error': 'not_found'}, status=404)


# ============================================================
# ✅ NEW: REALTIME API — lightweight status for ALL establishments
# ============================================================
def get_all_establishments_status(request):
    """
    Returns status + rating + review count + all detail fields for all active
    establishments. Used by kabsueats.js to refresh establishment cards every 30s.
    ✅ Now includes name, image, categories, payment_methods, opening/closing time,
    and amenities so card details update in real-time when owner saves from dashboard/profile.
    """
    from django.db.models import Avg, Count as DjCount
    try:
        ests = FoodEstablishment.objects.filter(is_active=True).prefetch_related(
            'categories', 'amenities'
        ).annotate(
            avg_rating=Avg('reviews__rating'),
            review_count=DjCount('reviews', distinct=True),
        )

        data = []
        for est in ests:
            status     = get_current_status(est.opening_time, est.closing_time)
            avg_rating = round(float(est.avg_rating), 1) if est.avg_rating else 0.0

            # Build categories string
            cat_names = list(est.categories.values_list('name', flat=True))
            if est.other_category:
                cat_names.append(est.other_category)
            categories_str = ', '.join(cat_names) if cat_names else 'Uncategorized'

            # Build amenities string
            amenity_names = list(est.amenities.values_list('name', flat=True))
            if est.other_amenity:
                amenity_names.append(est.other_amenity)
            amenities_str = ', '.join(amenity_names) if amenity_names else ''

            data.append({
                'id':              est.id,
                'status':          status,
                'average_rating':  avg_rating,
                'review_count':    est.review_count or 0,
                'last_modified':   cache.get(f'est_{est.id}_last_modified', 0),  # ✅ sync signal
                # ✅ Detail fields — update card DOM on change
                'name':            est.name,
                'image_url':       est.image.url if est.image else None,
                'categories':      categories_str,
                'payment_methods': est.payment_methods or '',
                'opening_time':    est.opening_time.strftime('%I:%M %p') if est.opening_time else '',
                'closing_time':    est.closing_time.strftime('%I:%M %p') if est.closing_time else '',
                'amenities':       amenities_str,
            })

        return JsonResponse({'success': True, 'establishments': data})

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'get_all_establishments_status error: {e}')
        return JsonResponse({'error': 'database_unavailable'}, status=503)


def get_request_qtys(request):
    """
    Returns a map of menu_item_id → qty already committed in the user's active
    orders (status 'request' OR 'to_pay') for a given establishment.
    Used by the item detail modals on both the kabsueats home page and the
    establishment details page so customers can see how many of each item
    they've already requested/accepted before adding more.

    Query params:
        establishment_id  (required)

    Response:
        { "success": true, "qtys": { "<menu_item_id>": <qty>, ... } }
    """
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'qtys': {}})

    establishment_id = request.GET.get('establishment_id')
    if not establishment_id:
        return JsonResponse({'success': False, 'message': 'establishment_id required'}, status=400)

    try:
        # Include both 'request' (pending acceptance) and 'to_pay' (accepted, awaiting payment)
        active_orders = Order.objects.filter(
            user=request.user,
            establishment_id=establishment_id,
            status__in=('request', 'to_pay'),
        ).prefetch_related('orderitem_set')

        qtys = {}
        for order in active_orders:
            for oi in order.orderitem_set.all():
                key = str(oi.menu_item_id)
                qtys[key] = qtys.get(key, 0) + oi.quantity

        return JsonResponse({'success': True, 'qtys': qtys})

    except Exception as e:
        return JsonResponse({'success': False, 'qtys': {}, 'error': str(e)})


def get_pending_cart_qtys(request):
    """
    Returns a map of menu_item_id → qty already in the user's PENDING cart
    for a given establishment.
    Used by item detail modals so customers can see how many of each item
    they already have in their cart before adding more.

    Query params:
        establishment_id  (required)

    Response:
        { "success": true, "qtys": { "<menu_item_id>": <qty>, ... } }
    """
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'qtys': {}})

    establishment_id = request.GET.get('establishment_id')
    if not establishment_id:
        return JsonResponse({'success': False, 'message': 'establishment_id required'}, status=400)

    try:
        pending_orders = Order.objects.filter(
            user=request.user,
            establishment_id=establishment_id,
            status='PENDING',
        ).prefetch_related('orderitem_set')

        qtys = {}
        for order in pending_orders:
            for oi in order.orderitem_set.all():
                key = str(oi.menu_item_id)
                qtys[key] = qtys.get(key, 0) + oi.quantity

        return JsonResponse({'success': True, 'qtys': qtys})

    except Exception as e:
        return JsonResponse({'success': False, 'qtys': {}, 'error': str(e)})


def get_bestsellers(request):
    """
    Get all top seller items across all establishments.
    Returns real-time bestseller data with establishment info.
    ✅ FIXED: Excludes items from deactivated (is_active=False) establishments.
    """
    try:
        bestsellers = MenuItem.objects.filter(
            is_top_seller=True,
            quantity__gt=0,                          # in stock only
            food_establishment__is_active=True,      # ✅ hide deactivated
        ).select_related(
            'food_establishment'
        ).annotate(
            total_orders=Count('orderitem')
        ).order_by('-top_seller_marked_at', '-total_orders')[:20]

        bestsellers_data = []
        for item in bestsellers:
            establishment = item.food_establishment

            status = get_current_status(establishment.opening_time, establishment.closing_time)

            bestsellers_data.append({
                'id':          item.id,
                'name':        item.name,
                'description': item.description,
                'price':       float(item.price),
                'image':       item.image.url if item.image else None,
                'quantity':    item.quantity,
                'total_orders': item.total_orders,
                'establishment': {
                    'id':            establishment.id,
                    'name':          establishment.name,
                    'address':       establishment.address,
                    'status':        status,
                    'latitude':      establishment.latitude,
                    'longitude':     establishment.longitude,
                    'last_modified': cache.get(f'est_{establishment.id}_last_modified', 0),  # ✅ sync signal
                }
            })

        return JsonResponse({
            'success': True,
            'bestsellers': bestsellers_data,
            'count': len(bestsellers_data)
        })

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"DB error in get_bestsellers: {e}")
        return JsonResponse({'error': 'database_unavailable'}, status=503)

def search_menu_items(request):
    """
    Search all menu items across all active establishments.
    Returns items matching the query (by name or description).
    Used by the hero search bar for real-time menu search.
    """
    from django.db.models import Count, Q
    query = request.GET.get('q', '').strip()

    if not query or len(query) < 2:
        return JsonResponse({'success': True, 'items': [], 'count': 0})

    try:
        items = MenuItem.objects.filter(
            Q(name__icontains=query) | Q(description__icontains=query),
            food_establishment__is_active=True,
            quantity__gt=0,
        ).select_related('food_establishment').annotate(
            total_orders=Count('orderitem')
        ).order_by('-is_top_seller', '-total_orders')[:30]

        items_data = []
        for item in items:
            est = item.food_establishment
            status = get_current_status(est.opening_time, est.closing_time)
            items_data.append({
                'id': item.id,
                'name': item.name,
                'description': item.description or '',
                'price': float(item.price),
                'image': item.image.url if item.image else None,
                'quantity': item.quantity,
                'total_orders': item.total_orders,
                'is_top_seller': item.is_top_seller,
                'establishment': {
                    'id': est.id,
                    'name': est.name,
                    'address': est.address or '',
                    'status': status,
                },
            })

        return JsonResponse({'success': True, 'items': items_data, 'count': len(items_data)})

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error in search_menu_items: {e}")
        return JsonResponse({'success': True, 'items': [], 'count': 0})
# ============================================================
# BUY NOW — 2-STEP CHECKOUT FLOW
# ============================================================
