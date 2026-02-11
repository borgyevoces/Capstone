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
    """Calculate real-time status"""
    if not opening_time or not closing_time:
        return "Closed"

    now = datetime.now().time()

    if opening_time <= closing_time:
        # Normal hours (e.g., 8 AM - 10 PM)
        return "Open" if opening_time <= now <= closing_time else "Closed"
    else:
        # Overnight hours (e.g., 10 PM - 2 AM)
        return "Open" if now >= opening_time or now <= closing_time else "Closed"

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

            messages.success(request, f'✨ Welcome to KabsuEats, {user.username}! Your account has been created.')
            return redirect('kabsueats_home')
    except Exception as e:
        messages.error(request, f'An error occurred while retrieving user data: {e}')
        return redirect('user_login_register')

def forgot_password(request):
    """
    Handle forgot password requests with proper email sending
    """
    if request.method == 'POST':
        email = request.POST.get('email')
        User = get_user_model()

        try:
            user = User.objects.get(email=email)

            # Generate reset token
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # build.sh reset URL
            protocol = 'https' if request.is_secure() else 'http'
            domain = request.get_host()
            reset_url = f"{protocol}://{domain}{reverse('password_reset_confirm', kwargs={'uidb64': uid, 'token': token})}"

            # Email subject and content
            subject = "Password Reset Request - KabsuEats"

            # Plain text message (fallback)
            text_message = f"""
Hello {user.username},

We received a request to reset the password for your KabsuEats account.

To reset your password, please click the link below or copy and paste it into your browser:

{reset_url}

This link will expire in 24 hours.

If you did not request a password reset, please ignore this email. Your password will remain unchanged.

Thank you,
The KabsuEats Team
            """

            # HTML message (better formatting)
            html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #e59b20; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
        .button {{ display: inline-block; padding: 12px 30px; background-color: #e59b20; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Password Reset Request</h2>
        </div>
        <div class="content">
            <p>Hello <strong>{user.username}</strong>,</p>

            <p>We received a request to reset the password for your KabsuEats account.</p>

            <p>Click the button below to reset your password:</p>

            <a href="{reset_url}" class="button">Reset Password</a>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e59b20;">{reset_url}</p>

            <p><strong>This link will expire in 24 hours.</strong></p>

            <div class="footer">
                <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                <p>Thank you,<br>The KabsuEats Team</p>
            </div>
        </div>
    </div>
</body>
</html>
            """

            # Send email using the wrapper function
            try:
                send_mail(
                    subject=subject,
                    message=text_message,
                    from_email=settings.SENDER_EMAIL or settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                    html_message=html_message
                )

                messages.success(request, "Password reset instructions have been sent to your email.")
                return redirect('password_reset_done_redirect')

            except Exception as email_error:
                print(f"Email sending error: {email_error}")
                messages.error(request, "There was an error sending the reset email. Please try again later.")
                return redirect('user_login_register')

        except User.DoesNotExist:
            # Don't reveal if email exists (security best practice)
            messages.success(request, "If an account with that email exists, we've sent password reset instructions.")
            return redirect('password_reset_done_redirect')

    return redirect('user_login_register')

def password_reset_done_redirect(request):
    """Redirect to login with success message"""
    messages.info(request,
                  "We've emailed you instructions for setting your password. Please check your inbox and spam folder.")
    return redirect(reverse('user_login_register') + '?reset_done=true')

def password_reset_complete_redirect(request):
    """Custom redirect after password reset"""
    messages.success(request, 'Your password has been reset successfully! You can now log in.')
    return redirect('user_login_register')

def kabsueats_main_view(request):
    """
    Central view for displaying all food establishments with various filters.
    ✅ FIXED: Real-time status calculation on every page load
    """
    from datetime import datetime

    category_name = request.GET.get('category', '')
    search_query = request.GET.get('q', '')
    status_filter = request.GET.get('status', '')
    alpha_filter = request.GET.get('alpha', '')

    # Fetch all categories for the dropdown filter
    all_categories = Category.objects.all().order_by('name')

    food_establishments_queryset = FoodEstablishment.objects.all()

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

    # Get current time for status calculation
    current_time = datetime.now().time()

    food_establishments_with_data = []
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
                # Normal hours (e.g., 8 AM - 10 PM same day)
                if est.opening_time <= current_time <= est.closing_time:
                    est.calculated_status = "Open"
                else:
                    est.calculated_status = "Closed"
            else:
                # Overnight hours (e.g., 10 PM - 2 AM next day)
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

@login_required(login_url='user_login_register')
def search_food_establishments(request):
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
@require_http_methods(["POST"])
def update_profile(request):
    """
    Handles the POST request for updating the user's profile (picture and username).
    It returns a JSON response for the AJAX call.
    """
    try:
        # Kunin ang UserProfile instance, o gumawa kung wala pa (highly recommended)
        profile, created = UserProfile.objects.get_or_create(user=request.user)
    except Exception as e:
        return JsonResponse({'success': False, 'errors': 'Failed to retrieve/create user profile.'}, status=400)

    # I-instantiate ang form gamit ang POST data at FILES (para sa image)
    form = UserProfileUpdateForm(request.POST, request.FILES, instance=profile)

    if form.is_valid():
        try:
            profile = form.save()

            # Kunin ang URL ng bagong profile picture
            profile_pic_url = profile.profile_picture.url if profile.profile_picture else '/static/images/placeholder_profile.png'

            # I-return ang success JSON response
            return JsonResponse({
                'success': True,
                'message': 'Profile updated successfully!',
                'username': profile.user.username,
                'profile_picture_url': profile_pic_url
            })
        except Exception as e:
            # Error sa pag-save sa database
            return JsonResponse({'success': False, 'errors': f'Database error: {str(e)}'}, status=500)
    else:
        # I-extract ang errors para i-display
        errors = '; '.join([f"{k}: {v[0]}" for k, v in form.errors.items()])
        return JsonResponse({'success': False, 'errors': errors}, status=400)

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
    establishment_id = review.establishment.id
    review.delete()

    cache.delete(f'establishment_{establishment_id}_reviews')
    messages.success(request, 'Review deleted successfully!')
    return redirect('food_establishment_details', establishment_id=establishment_id)

def food_establishment_details(request, establishment_id):
    establishment = get_object_or_404(
        FoodEstablishment.objects.annotate(
            average_rating=Avg('reviews__rating'),
            review_count=Count('reviews')
        ).select_related('category').prefetch_related('amenities'),
        id=establishment_id
    )

    _ = establishment.status

    all_reviews = Review.objects.filter(establishment=establishment).order_by('-created_at')

    user_review = None
    other_reviews = all_reviews

    if request.user.is_authenticated:
        user_review = all_reviews.filter(user=request.user).first()
        if user_review:
            other_reviews = all_reviews.exclude(id=user_review.id)

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

    if request.method == 'POST':
        form = ReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.user = request.user
            review.establishment = establishment
            review.save()
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
    This matches the frontend's URL structure: /food_establishment/<establishment_id>/edit_review/<review_id>/
    """
    establishment = get_object_or_404(FoodEstablishment, id=establishment_id)
    review = get_object_or_404(Review, id=review_id, establishment=establishment)

    if review.user != request.user:
        return HttpResponseForbidden("You are not authorized to edit this review.")

    if request.method == 'POST':
        form = ReviewForm(request.POST, request.FILES, instance=review)
        if form.is_valid():
            form.save()
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
                'attempts': 0,
                'is_verified': False
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

    # Send email with proper error handling
    try:
        result = send_mail(
            subject='Your KabsuEats Verification Code',
            message=f'Your verification code is: {otp_code}',
            from_email=from_email,
            recipient_list=[email],
            fail_silently=True,
            html_message=html_content
        )

        if result:
            print(f"✅ OTP sent to {email}: {otp_code}")
            return JsonResponse({
                'success': True,
                'message': 'OTP sent successfully to your email'
            })
        else:
            print(f"⚠️ Email failed but OTP saved for {email}: {otp_code}")
            return JsonResponse({
                'success': True,
                'message': 'OTP generated',
                'warning': 'Email delivery may be delayed. Check spam folder.',
                'debug_otp': otp_code  # REMOVE IN PRODUCTION
            })

    except Exception as e:
        print(f"❌ Error sending OTP email: {e}")
        return JsonResponse({
            'success': True,
            'message': 'OTP generated',
            'warning': 'Email sending failed',
            'debug_otp': otp_code  # REMOVE IN PRODUCTION
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

            # Mark as verified (but don't delete yet)
            otp_entry.is_verified = True
            otp_entry.save()

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
                'attempts': 0,
                'is_verified': False
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

    try:
        result = send_mail(
            subject='Your New KabsuEats Verification Code',
            message=f'Your new verification code is: {otp_code}',
            from_email=from_email,
            recipient_list=[email],
            fail_silently=True,
            html_message=html_content
        )

        return JsonResponse({
            'success': True,
            'message': 'New OTP sent successfully!',
            'debug_otp': otp_code  # REMOVE IN PRODUCTION
        })

    except Exception as e:
        print(f"❌ Resend email error: {e}")
        return JsonResponse({
            'success': True,
            'message': 'New OTP generated',
            'warning': 'Email may be delayed',
            'debug_otp': otp_code  # REMOVE IN PRODUCTION
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
    ✅ PRODUCTION-READY EMAIL SENDING WITH SENDGRID PRIMARY + GMAIL FALLBACK
    Priority: SendGrid (reliable on Render) → Gmail SMTP (local backup)
    """
    import logging
    logger = logging.getLogger(__name__)

    # ============================================================================
    # STEP 1: VALIDATE SENDER EMAIL
    # ============================================================================
    if not from_email or from_email == 'webmaster@localhost':
        from_email = os.getenv('SENDER_EMAIL') or getattr(settings, 'SENDER_EMAIL', None)

    if not from_email:
        logger.error("❌ CRITICAL: No sender email configured")
        if not fail_silently:
            raise ValueError("SENDER_EMAIL not configured in environment variables")
        return 0

    # Ensure recipient_list is a list
    if isinstance(recipient_list, str):
        recipient_list = [recipient_list]

    # ============================================================================
    # STEP 2: TRY SENDGRID FIRST (BEST FOR RENDER/PRODUCTION)
    # ============================================================================
    sendgrid_key = os.getenv('SENDGRID_API_KEY') or getattr(settings, 'SENDGRID_API_KEY', None)

    if sendgrid_key and sendgrid_key != '********************':
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content

            logger.info(f"📧 Attempting SendGrid email to {recipient_list}")

            # Create SendGrid message
            sg_msg = Mail(
                from_email=Email(from_email),
                to_emails=[To(email) for email in recipient_list],
                subject=subject,
                html_content=Content("text/html", html_message if html_message else message)
            )

            # Send with timeout
            sg = SendGridAPIClient(sendgrid_key)
            response = sg.send(sg_msg)

            if response.status_code in (200, 202):
                logger.info(f"✅ SendGrid email sent successfully to {recipient_list}")
                return 1
            else:
                logger.warning(f"⚠️ SendGrid returned status {response.status_code}")

        except Exception as sg_error:
            logger.error(f"❌ SendGrid error: {sg_error}")

            # Provide specific diagnostics
            error_msg = str(sg_error).lower()
            if '403' in error_msg or 'forbidden' in error_msg:
                logger.error("❌ SendGrid 403 Error - Possible causes:")
                logger.error("   1. API Key is invalid or expired")
                logger.error("   2. Sender email not verified in SendGrid")
                logger.error("   3. Free trial expired")
                logger.error("   Fix: Go to https://app.sendgrid.com/settings/sender_auth")
            elif '401' in error_msg:
                logger.error("❌ SendGrid 401 - API Key authentication failed")

            # Continue to Gmail fallback
    else:
        logger.warning("⚠️ SendGrid not configured, trying Gmail SMTP...")

    # ============================================================================
    # STEP 3: FALLBACK TO GMAIL SMTP (LOCAL DEVELOPMENT)
    # ============================================================================
    # NOTE: Gmail SMTP often fails on Render due to network restrictions
    # This fallback is mainly for local development

    try:
        logger.info(f"📧 Attempting Gmail SMTP fallback to {recipient_list}")

        result = django_send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
            html_message=html_message
        )

        if result and result > 0:
            logger.info(f"✅ Gmail SMTP email sent successfully to {recipient_list}")
            return result
        else:
            logger.warning(f"⚠️ Gmail SMTP returned {result}")

    except Exception as smtp_error:
        logger.error(f"❌ Gmail SMTP error: {smtp_error}")

        # Provide specific diagnostics
        error_msg = str(smtp_error).lower()
        if 'network is unreachable' in error_msg or 'errno 101' in error_msg:
            logger.error("❌ Network Error - Render cannot reach Gmail SMTP")
            logger.error("   Solution: Use SendGrid instead (set SENDGRID_API_KEY)")
        elif 'authentication' in error_msg or '535' in error_msg:
            logger.error("❌ Gmail Authentication Failed")
            logger.error("   1. Enable 2-Step Verification: https://myaccount.google.com/security")
            logger.error("   2. Generate App Password: https://myaccount.google.com/apppasswords")
            logger.error("   3. Update EMAIL_HOST_PASSWORD in .env")

        if not fail_silently:
            raise

    # ============================================================================
    # STEP 4: ALL METHODS FAILED
    # ============================================================================
    logger.error(f"❌ All email sending methods failed for {recipient_list}")

    if not fail_silently:
        raise Exception("Email sending failed - both SendGrid and Gmail SMTP unavailable")

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

    # Get all order items
    order_items = order.orderitem_set.select_related('menu_item').all()

    context = {
        'order': order,
        'order_items': order_items,
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

        # Get the specific order
        order = get_object_or_404(
            Order.objects.prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            user=request.user,
            status='PENDING'
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

        # PayMongo enforces a minimum amount (typically ₱100). If the order is
        # below that threshold we cannot create a PayMongo link. For local
        # development (DEBUG=True) we simulate a successful payment so you can
        # test the checkout flow without calling the external API. In
        # production we return a clear error to the client.
        MIN_AMOUNT_CENTAVOS = int(getattr(settings, 'PAYMONGO_MINIMUM_AMOUNT_CENTAVOS', 10000))
        if amount_in_centavos < MIN_AMOUNT_CENTAVOS:
            if settings.DEBUG:
                # Simulate immediate successful payment for testing
                order.status = 'PAID'
                order.payment_confirmed_at = timezone.now()
                order.gcash_reference_number = f"SIM-{uuid.uuid4()}"
                order.save()

                # Reduce stock for order items
                for order_item in order.orderitem_set.all():
                    menu_item = order_item.menu_item
                    try:
                        if menu_item.quantity >= order_item.quantity:
                            menu_item.quantity -= order_item.quantity
                            menu_item.save()
                    except Exception as stock_err:
                        print(f"Error reducing stock for {menu_item.id}: {stock_err}")

                # Send confirmation emails (best-effort)
                try:
                    send_order_confirmation_email(order)
                except Exception as e:
                    print(f"Email error (simulated payment): {e}")

                # Return a redirect URL so the frontend can continue the happy path
                redirect_url = request.build_absolute_uri(reverse('gcash_payment_success')) + f'?order_id={order.id}'
                return JsonResponse({
                    'success': True,
                    'checkout_url': redirect_url,
                    'order_id': order.id,
                    'reference_number': order.gcash_reference_number,
                    'total_amount': float(total_amount),
                    'note': 'Simulated payment because amount below PayMongo minimum and DEBUG=True'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': f'PayMongo requires a minimum payment of ₱{MIN_AMOUNT_CENTAVOS / 100:.2f}. Please increase your order or use another payment method.'
                }, status=400)

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

        cancel_url = request.build_absolute_uri(
            reverse('gcash_payment_cancel')
        ) + f'?order_id={order.id}'

        # build.sh description
        item_names = [item.menu_item.name for item in cart_items[:3]]
        description = f"Order from {order.establishment.name}: {', '.join(item_names)}"
        if cart_items.count() > 3:
            description += f" and {cart_items.count() - 3} more items"

        # Payment link payload
        # Include a return indicator so we can redirect the user back to the
        # appropriate page after PayMongo completes the flow.
        # For cart checkout, use return_to=cart
        success_url = success_url + '&return_to=cart'
        cancel_url = cancel_url + '&return_to=cart'

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

        # Call PayMongo API
        api_url = f"{settings.PAYMONGO_API_URL}/links"

        # Log payload for debugging
        import logging
        logging.getLogger(__name__).debug('PayMongo payload: %s', json.dumps(payload))

        response = requests.post(api_url, headers=headers, json=payload, timeout=30)

        if response.status_code in [200, 201]:
            response_data = response.json()
            checkout_url = response_data['data']['attributes']['checkout_url']
            reference_number = response_data['data']['id']

            # Save reference number
            order.gcash_reference_number = reference_number
            order.save(update_fields=['gcash_reference_number'])

            return JsonResponse({
                'success': True,
                'checkout_url': checkout_url,
                'order_id': order.id,
                'reference_number': reference_number,
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
        order = get_object_or_404(
            Order.objects.prefetch_related('orderitem_set__menu_item'),
            id=order_id,
            user=request.user,
            status='PENDING'
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
def order_confirmation_view(request, order_id):
    """Display order confirmation"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    order_items = order.orderitem_set.select_related('menu_item').all()

    context = {
        'order': order,
        'order_items': order_items,
    }
    return render(request, 'webapplication/order_confirmation.html', context)

@login_required
@require_POST
def create_buynow_payment_link(request):
    """
    Create PayMongo payment link for immediate Buy Now (single item)
    ✅ This handles the Buy Now button click and redirects to PayMongo
    """
    try:
        # Log the request for debugging
        print(f"🛒 Buy Now request from user: {request.user.username}")

        menu_item_id = request.POST.get('menu_item_id')
        quantity = int(request.POST.get('quantity', 1))

        print(f"📦 Item ID: {menu_item_id}, Quantity: {quantity}")

        # Validation
        if not menu_item_id or quantity < 1:
            return JsonResponse({
                'success': False,
                'message': 'Invalid item or quantity'
            }, status=400)

        # Get menu item
        menu_item = get_object_or_404(MenuItem, id=menu_item_id)
        establishment = menu_item.food_establishment

        print(f"✅ Found item: {menu_item.name} from {establishment.name}")

        # ✅ CHECK STOCK AVAILABILITY
        if menu_item.quantity < quantity:
            print(f"❌ Insufficient stock: {menu_item.quantity} < {quantity}")
            return JsonResponse({
                'success': False,
                'message': f'Only {menu_item.quantity} items available in stock'
            }, status=400)

        # Calculate total
        item_total = Decimal(str(menu_item.price)) * quantity
        grand_total = item_total
        amount_in_centavos = int(grand_total * 100)

        print(f"💰 Total: ₱{grand_total} ({amount_in_centavos} centavos)")

        # ✅ CREATE ORDER WITH PENDING STATUS
        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                establishment=establishment,
                status='PENDING',
                total_amount=grand_total,
                gcash_payment_method='gcash'
            )

            # Create order item
            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=quantity,
                price_at_order=menu_item.price
            )

        print(f"✅ Created Order #{order.id}")

        # ✅ CHECK IF PAYMONGO IS CONFIGURED
        if not hasattr(settings, 'PAYMONGO_SECRET_KEY') or not settings.PAYMONGO_SECRET_KEY:
            print("❌ PAYMONGO_SECRET_KEY not configured")
            order.delete()
            return JsonResponse({
                'success': False,
                'message': 'Payment service not configured. Please contact support.'
            }, status=500)

        if not hasattr(settings, 'PAYMONGO_API_URL') or not settings.PAYMONGO_API_URL:
            print("❌ PAYMONGO_API_URL not configured")
            order.delete()
            return JsonResponse({
                'success': False,
                'message': 'Payment service not configured. Please contact support.'
            }, status=500)

        # ✅ PAYMONGO API SETUP
        auth_string = f"{settings.PAYMONGO_SECRET_KEY}:"
        auth_base64 = base64.b64encode(auth_string.encode()).decode()

        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        # Build success and cancel URLs
        success_url = request.build_absolute_uri(
            reverse('gcash_payment_success')
        ) + f'?order_id={order.id}&return_to=buynow'

        cancel_url = request.build_absolute_uri(
            reverse('gcash_payment_cancel')
        ) + f'?order_id={order.id}&return_to=buynow'

        print(f"🔗 Success URL: {success_url}")
        print(f"🔗 Cancel URL: {cancel_url}")

        # Description for PayMongo
        description = f"Buy Now: {menu_item.name} x{quantity} from {establishment.name}"

        # ✅ PAYMENT LINK PAYLOAD
        payload = {
            "data": {
                "attributes": {
                    "amount": amount_in_centavos,
                    "description": description[:255],  # PayMongo limit
                    "remarks": f"Order #{order.id} - KabsuEats Buy Now",
                    "payment_method_allowed": ["gcash"],
                    "success_url": success_url,
                    "failed_url": cancel_url
                }
            }
        }

        print(f"📤 Sending payload to PayMongo...")

        # ✅ CALL PAYMONGO API
        api_url = f"{settings.PAYMONGO_API_URL}/links"

        try:
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            print(f"📥 PayMongo response status: {response.status_code}")

        except requests.exceptions.Timeout:
            print("❌ PayMongo API timeout")
            order.delete()
            return JsonResponse({
                'success': False,
                'message': 'Payment service timeout. Please try again.'
            }, status=500)
        except requests.exceptions.RequestException as e:
            print(f"❌ PayMongo API error: {e}")
            order.delete()
            return JsonResponse({
                'success': False,
                'message': 'Payment service error. Please try again.'
            }, status=500)

        if response.status_code in [200, 201]:
            response_data = response.json()
            checkout_url = response_data['data']['attributes']['checkout_url']
            reference_number = response_data['data']['id']

            print(f"✅ Payment link created: {checkout_url}")
            print(f"🔑 Reference: {reference_number}")

            # Save reference number
            order.gcash_reference_number = reference_number
            order.save(update_fields=['gcash_reference_number'])

            return JsonResponse({
                'success': True,
                'checkout_url': checkout_url,  # ✅ This is where user gets redirected
                'order_id': order.id,
                'reference_number': reference_number,
                'total_amount': float(grand_total)
            })
        else:
            # Payment link creation failed - delete order
            print(f"❌ PayMongo error response: {response.text}")
            order.delete()

            try:
                error_data = response.json()
                error_message = error_data.get('errors', [{}])[0].get('detail', 'Payment service error')
            except:
                error_message = 'Payment service error'

            return JsonResponse({
                'success': False,
                'message': error_message
            }, status=500)

    except MenuItem.DoesNotExist:
        print("❌ MenuItem not found")
        return JsonResponse({
            'success': False,
            'message': 'Item not found'
        }, status=404)
    except ValueError as e:
        print(f"❌ ValueError: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Invalid quantity value'
        }, status=400)
    except Exception as e:
        print(f"❌ Unexpected error in Buy Now payment: {e}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'success': False,
            'message': f'Server error: {str(e)}'
        }, status=500)
# ===================================================================================================================
# ===================================================END CLIENT=====================================================
# ===================================================================================================================

# ===================================================================================================================
# =================================================== OWNER ========================================================
# ===================================================================================================================
User = get_user_model()

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
        # Get the establishment owned by the current user
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

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
    """Nagre-render ng Page 1: Location Pinning."""
    return render(request, 'webapplication/register_step1_location.html', {
        'CVSU_LATITUDE': os.getenv('CVSU_LATITUDE'),
        'CVSU_LONGITUDE': os.getenv('CVSU_LONGITUDE')
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

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999)).zfill(6)

        print(f"🔐 Generating OTP for {email}: {otp_code}")

        # Save OTP to database with fresh timestamp
        try:
            otp_obj, created = OTP.objects.update_or_create(
                email=email,
                defaults={
                    'code': otp_code,
                    'attempts': 0,
                    'is_verified': False
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
        # SEND EMAIL WITH DETAILED ERROR LOGGING
        # ============================================================================
        try:
            print("📤 Calling send_mail function...")

            result = send_mail(
                subject='KabsuEats Business Registration - Verification Code',
                message=text_message,
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,  # Don't suppress errors
                html_message=html_content
            )

            print(f"📬 Email send result: {result}")

            if result and result > 0:
                print(f"✅ OTP email sent successfully to {email}")
                return JsonResponse({
                    'success': True,
                    'message': 'OTP sent successfully to your email'
                })
            else:
                print(f"⚠️ Email send returned 0 or None")
                return JsonResponse({
                    'success': True,
                    'warning': 'OTP generated but email may be delayed',
                    'message': 'OTP generated. Check spam folder if not received.',
                    'debug_otp': otp_code  # REMOVE IN PRODUCTION
                })

        except Exception as email_error:
            print(f"❌ Email sending error: {email_error}")
            import traceback
            traceback.print_exc()

            # Check specific error types
            error_msg = str(email_error).lower()

            if 'authentication' in error_msg or '535' in error_msg:
                hint = "Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env"
            elif 'connection' in error_msg or 'timeout' in error_msg:
                hint = "Check EMAIL_HOST and EMAIL_PORT settings"
            elif 'sendgrid' in error_msg or '403' in error_msg:
                hint = "Check SENDGRID_API_KEY and verify sender email in SendGrid dashboard"
            else:
                hint = "Check email configuration in .env file"

            return JsonResponse({
                'success': True,
                'warning': 'OTP generated but email failed',
                'error_details': str(email_error),
                'hint': hint,
                'debug_otp': otp_code,  # REMOVE IN PRODUCTION
                'message': 'OTP generated. Email may be delayed.'
            })

    except Exception as outer_error:
        print(f"❌ Outer exception in send_otp: {outer_error}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'error': f'Server error: {str(outer_error)}'
        }, status=500)

@csrf_exempt
@transaction.atomic
def verify_and_register(request):
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

    email = data.get('email')
    password = data.get('password')
    name = data.get('name') or data.get('establishment_name') or data.get('store_name')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    address = data.get('address') or data.get('display_address') or ''
    category_id = data.get('category')
    payment_methods = ', '.join(data.get('paymentMethods', [])) if data.get('paymentMethods') else data.get(
        'payment_methods', '')
    amenities_ids = data.get('amenities') or []

    if not email or not password or not name:
        return JsonResponse({'error': 'Missing required registration fields.'}, status=400)

    # Verify OTP
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

    # Create user (username = email)
    user, created = User.objects.get_or_create(username=email, defaults={'email': email})
    user.set_password(password)
    user.is_active = True
    user.save()

    # Create establishment
    category = Category.objects.filter(id=category_id).first() if category_id else None
    from datetime import time as dt_time

    # ✅ Parse time strings to time objects
    opening_time_str = data.get('opening_time')
    closing_time_str = data.get('closing_time')

    opening_time = None
    closing_time = None

    if opening_time_str:
        try:
            # Handle both "HH:MM" and "HH:MM:SS" formats
            opening_time = dt_time.fromisoformat(opening_time_str)
        except ValueError as e:
            print(f"⚠️ Invalid opening_time format: {opening_time_str} - {e}")

    if closing_time_str:
        try:
            closing_time = dt_time.fromisoformat(closing_time_str)
        except ValueError as e:
            print(f"⚠️ Invalid closing_time format: {closing_time_str} - {e}")

    establishment = FoodEstablishment.objects.create(
        owner=user,
        name=name,
        address=address,
        opening_time=opening_time,  # ✅ Changed
        closing_time=closing_time,  # ✅ Added
        latitude=float(latitude) if latitude else None,
        longitude=float(longitude) if longitude else None,
        category=category,
        payment_methods=payment_methods or ''
    )

    # Link amenities if any
    if amenities_ids:
        try:
            establishment.amenities.set(Amenity.objects.filter(id__in=amenities_ids))
        except Exception:
            establishment.amenities.clear()

    # ✅ Handle uploaded image (profile or cover)
    if 'profile_image' in request.FILES:
        establishment.image = request.FILES['profile_image']
    elif 'cover_image' in request.FILES:
        establishment.image = request.FILES['cover_image']

    establishment.save()

    # ✅ Auto-login user
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
            print("Auto-login failed:", e)

    # Clean up OTPs
    OTP.objects.filter(email=email).delete()
    request.session.pop('otp', None)
    request.session.pop('otp_email', None)

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

                        menu_item.save()

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
                                'message': f"'{menu_item.name}' added successfully!",
                                'item': item_data,
                                'new_menu_token': str(uuid.uuid4())
                            })

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
            # Your existing update code here
            pass

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
    """Delete a menu item - AJAX-enabled with real-time response"""
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'You must be logged in as an owner.'
            }, status=403)
        messages.error(request, "You must be logged in as an owner.")
        return redirect('owner_login')

    try:
        food_establishment = get_object_or_404(FoodEstablishment, pk=establishment_id)
        menu_item = get_object_or_404(MenuItem, pk=item_id, food_establishment=food_establishment)
        item_name = menu_item.name

        # Manually delete related OrderItems first
        try:
            related_order_items = OrderItem.objects.filter(menu_item=menu_item)
            if related_order_items.exists():
                print(f"Deleting {related_order_items.count()} related OrderItem(s) for menu item {item_id}...")
                related_order_items.delete()
                print("Related OrderItem(s) deleted.")
        except Exception as e:
            print(f"WARNING: Could not manually delete related OrderItems: {e}")
            pass

        # Use low-level _raw_delete() to bypass broken ORM cascade checks
        MenuItem.objects.filter(pk=item_id)._raw_delete(using=MenuItem.objects.db)

        # Return JSON for AJAX requests
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f'"{item_name}" has been deleted from your menu.',
                'item_id': item_id
            })

        messages.success(request, f'"{item_name}" has been deleted from your menu.')
        return redirect('food_establishment_dashboard')

    except Exception as e:
        print(f"Error deleting menu item: {e}")

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': f'An error occurred while deleting: {str(e)}'
            }, status=500)

        messages.error(request, f'An error occurred while deleting the menu item: {str(e)}')
        return redirect('food_establishment_dashboard')

@login_required(login_url='owner_login')
def store_reviews_view(request):
    """
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

@require_POST
def toggle_top_seller(request, item_id):
    """
    Toggles a specific menu item's 'is_top_seller' status.
    This now allows multiple items to be marked as a top seller.
    """
    item = get_object_or_404(MenuItem, id=item_id)
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id or item.food_establishment.id != int(establishment_id):
        messages.error(request, "You are not authorized to perform this action.")
        return redirect(reverse_lazy('food_establishment_dashboard'))

    item.is_top_seller = not item.is_top_seller

    if item.is_top_seller:
        item.top_seller_marked_at = timezone.now()
        messages.success(request, f"'{item.name}' has been marked as a top seller.")
    else:
        item.top_seller_marked_at = None
        messages.info(request, f"'{item.name}' has been unmarked as a top seller.")

    item.save()

    return redirect(reverse_lazy('food_establishment_dashboard'))

    # Dahil ginamit ang URL na ito sa 'Add New Menu Item' button mo, kailangan itong may view function.
    # Ito ay temporary placeholder lamang. Palitan ito ng actual logic mo.
    messages.info(request, "Please use the 'Add New Menu Item' modal on the dashboard page.")
    return redirect('food_establishment_dashboard')

@login_required(login_url='owner_login')
@require_http_methods(["POST"])
def update_establishment_details_ajax(request, pk):
    """
    AJAX endpoint for updating establishment details in real-time.
    Returns JSON response with updated data for instant UI updates.
    """
    try:
        # Get establishment owned by current user
        establishment = FoodEstablishment.objects.get(pk=pk, owner=request.user)
    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Establishment not found or access denied.'
        }, status=404)

    # Use the form for validation
    form = FoodEstablishmentUpdateForm(request.POST, request.FILES, instance=establishment)

    if form.is_valid():
        try:
            from datetime import time as dt_time

            instance = form.save(commit=False)

            # ✅ Handle time fields from POST data
            opening_time_str = request.POST.get('opening_time')
            closing_time_str = request.POST.get('closing_time')

            if opening_time_str:
                try:
                    instance.opening_time = dt_time.fromisoformat(opening_time_str)
                except ValueError:
                    pass

            if closing_time_str:
                try:
                    instance.closing_time = dt_time.fromisoformat(closing_time_str)
                except ValueError:
                    pass

            # ✅ Handle payment methods (checkboxes come as multiple values)
            payment_methods_list = request.POST.getlist('payment_methods')
            if payment_methods_list:
                instance.payment_methods = ', '.join(payment_methods_list)
            else:
                instance.payment_methods = ''

            # ✅ Save the instance
            instance.save()

            # ✅ Save many-to-many relationships (amenities)
            form.save_m2m()

            # ✅ Prepare comprehensive response data for real-time UI update
            data = {
                'success': True,
                'message': 'Establishment details updated successfully.',
                'name': instance.name,
                'address': instance.address,
                'status': instance.calculated_status,  # Use calculated_status property
                'opening_time': instance.opening_time.strftime('%I:%M %p') if instance.opening_time else None,
                'closing_time': instance.closing_time.strftime('%I:%M %p') if instance.closing_time else None,
                'category': instance.category.name if instance.category else None,
                'category_id': instance.category.id if instance.category else None,
                'payment_methods': instance.payment_methods,
                'latitude': str(instance.latitude) if instance.latitude else None,
                'longitude': str(instance.longitude) if instance.longitude else None,
                'image_url': instance.image.url if instance.image else '',
                'amenities': ', '.join([a.name for a in instance.amenities.all()]),
                'amenities_list': [{'id': a.id, 'name': a.name} for a in instance.amenities.all()],
            }

            return JsonResponse(data)

        except Exception as e:
            print(f"Database save error: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': f'A database error occurred: {str(e)}'
            }, status=500)
    else:
        # Return validation errors
        errors = {k: v[0] if isinstance(v, list) else v for k, v in form.errors.items()}
        return JsonResponse({
            'success': False,
            'error': 'Validation failed. Please check your inputs.',
            'errors': errors
        }, status=400)

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
                'category': establishment.category.name if establishment.category else None,
                'category_id': establishment.category.id if establishment.category else None,
                'payment_methods': establishment.payment_methods,
                'latitude': float(establishment.latitude) if establishment.latitude else None,
                'longitude': float(establishment.longitude) if establishment.longitude else None,
                'image_url': establishment.image.url if establishment.image else None,
                'amenities': [{'id': a.id, 'name': a.name} for a in establishment.amenities.all()],
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

        # Check stock availability
        if menu_item.quantity < quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {menu_item.quantity} items available in stock'
            }, status=400)

        with transaction.atomic():
            # Get or create PENDING order for this establishment
            order, created = Order.objects.get_or_create(
                user=request.user,
                establishment=establishment,
                status='PENDING',
                defaults={
                    'total_amount': 0,
                }
            )

            # Get or create OrderItem
            order_item, item_created = OrderItem.objects.get_or_create(
                order=order,
                menu_item=menu_item,
                defaults={
                    'quantity': quantity,
                    'price_at_order': menu_item.price,
                }
            )

            if not item_created:
                # Update existing item quantity
                new_quantity = order_item.quantity + quantity

                # Check if adding would exceed stock
                if new_quantity > menu_item.quantity:
                    return JsonResponse({
                        'success': False,
                        'message': f'Cannot add {quantity} more. Only {menu_item.quantity - order_item.quantity} items available.'
                    }, status=400)

                order_item.quantity = new_quantity
                order_item.save()

            # Update order total
            order_total = sum(
                item.quantity * item.price_at_order
                for item in order.orderitem_set.all()
            )
            order.total_amount = order_total
            order.save()

        # Calculate total cart count across ALL establishments
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'message': f'{quantity}x {menu_item.name} added to cart',
            'cart_count': total_cart_count
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

        # Calculate total cart count
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

        # Calculate total cart count
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
@require_POST
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

        # Calculate remaining cart count
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
                        '%b %d, %Y %I:%M %p') if hasattr(order, 'payment_confirmed_at') and order.payment_confirmed_at else None,
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

        # Update order status if still pending
        if order.status != 'PAID':
            with transaction.atomic():
                # 1. Update order status
                order.status = 'PAID'
                order.payment_confirmed_at = timezone.now()
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

                # 3. ✅ REDUCE STOCK FOR EACH ORDER ITEM
                for order_item in order.orderitem_set.select_related('menu_item'):
                    menu_item = order_item.menu_item
                    try:
                        if menu_item.quantity >= order_item.quantity:
                            # Reduce the quantity
                            menu_item.quantity -= order_item.quantity
                            menu_item.save()
                            print(f"✅ Stock reduced for {menu_item.name}: {order_item.quantity} units")
                        else:
                            print(
                                f"⚠️ Warning: Insufficient stock for {menu_item.name}. Available: {menu_item.quantity}, Ordered: {order_item.quantity}")
                            # Still process the order but log the issue
                            menu_item.quantity = 0
                            menu_item.save()
                    except Exception as stock_err:
                        print(f"❌ Error reducing stock for {menu_item.name}: {stock_err}")

            # 4. Send confirmation emails (best-effort)
            try:
                send_order_confirmation_email(order)
            except Exception as e:
                print(f"Email error: {e}")

        # Decide where to redirect
        return_to = request.GET.get('return_to')

        # ============================================================
        # 🔥 ITO LANG ANG BINAGO! (Lines 4197-4200)
        # ============================================================
        if request.user.is_authenticated and request.user == order.user:
            messages.success(request, 'Payment successful! Your order has been confirmed.')
            # ✅ FIXED: Redirect to unified payment_success view with payment_method=online
            return redirect(f'/payment/success/?order_id={order.id}&payment_method=online')
        # ============================================================

        if return_to == 'cart':
            return redirect('view_cart')

        if return_to == 'buynow':
            return redirect('payment_status', status='success')

        return redirect('payment_status', status='success')

    except Order.DoesNotExist:
        messages.error(request, 'Order not found')
        return redirect('view_cart')
    except Exception as e:
        print(f"❌ Error in payment success handler: {e}")
        messages.error(request, 'An error occurred processing your payment')
        return redirect('view_cart')

@login_required
def view_cart(request):
    """
    Display all cart items grouped by establishment
    ✅ FIXED: Proper queryset and error handling
    """
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

            carts_data.append({
                'establishment': order.establishment,
                'order': order,
                'items': items,
                'item_count': cart_item_count
            })

        context = {
            'carts_data': carts_data,
            'total_cart_count': total_cart_count
        }

        return render(request, 'webapplication/cart.html', context)

    except Exception as e:
        print(f"Error loading cart: {e}")
        import traceback
        traceback.print_exc()

        # Return empty cart on error
        context = {
            'carts_data': [],
            'total_cart_count': 0
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
                            order.status = 'PAID'
                            order.payment_confirmed_at = timezone.now()
                            order.save()

                            # Create notification
                            OrderNotification.objects.create(
                                establishment=order.establishment,
                                order=order,
                                notification_type='new_order',
                                message=f'New order #{order.id} from {order.user.username} - ₱{order.total_amount:.2f}'
                            )
                            print(f"✅ Webhook: Notification created for Order #{order.id}")

                            # Reduce stock
                            for order_item in order.orderitem_set.select_related('menu_item'):
                                menu_item = order_item.menu_item
                                if menu_item.quantity >= order_item.quantity:
                                    menu_item.quantity -= order_item.quantity
                                    menu_item.save()
                                    print(f"✅ Webhook: Stock reduced for {menu_item.name}")
                                else:
                                    menu_item.quantity = 0
                                    menu_item.save()
                                    print(f"⚠️ Webhook: Insufficient stock for {menu_item.name}")

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

@require_http_methods(["GET"])
def get_best_sellers(request):
    """
    ✅ FIXED: Handles payment_status gracefully in best sellers query
    """
    try:
        # Time threshold for "recent" orders (last 30 days)
        time_threshold = timezone.now() - timedelta(days=30)

        # ✅ FIXED: Use defer on orderitem__order to exclude payment_status
        best_sellers = MenuItem.objects.filter(
            Q(is_top_seller=True) |
            Q(
                orderitem__order__status__in=['PAID', 'PREPARING', 'READY', 'COMPLETED'],
                orderitem__order__created_at__gte=time_threshold
            )
        ).annotate(
            total_orders=Count('orderitem__order', distinct=True),
            total_quantity_sold=Sum('orderitem__quantity')
        ).filter(
            quantity__gt=0,
            food_establishment__isnull=False
        ).select_related(
            'food_establishment',
            'food_establishment__category'
        ).order_by(
            '-total_orders',
            '-total_quantity_sold',
            '-is_top_seller'
        )[:20]

        # Format response data
        items_data = []
        for item in best_sellers:
            establishment = item.food_establishment

            if not establishment:
                continue

            items_data.append({
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'price': float(item.price),
                'image_url': item.image.url if item.image else None,
                'is_available': item.quantity > 0,
                'quantity': item.quantity,
                'total_orders': item.total_orders or 0,
                'total_sold': item.total_quantity_sold or 0,
                'is_top_seller': item.is_top_seller,
                'establishment': {
                    'id': establishment.id,
                    'name': establishment.name,
                    'category': establishment.category.name if establishment.category else 'Other',
                    'address': establishment.address,
                    'image_url': establishment.image.url if establishment.image else None,
                    'opening_time': establishment.opening_time.strftime(
                        '%H:%M') if establishment.opening_time else None,
                    'closing_time': establishment.closing_time.strftime(
                        '%H:%M') if establishment.closing_time else None,
                }
            })

        return JsonResponse({
            'success': True,
            'count': len(items_data),
            'items': items_data,
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        import traceback
        print(f"Error in get_best_sellers: {e}")
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
    Deactivate the food establishment owned by the current user.
    This will hide the establishment from customer searches but keep all data intact.
    """
    try:
        # Get the establishment owned by the current user
        establishment = get_object_or_404(FoodEstablishment, owner=request.user)

        establishment_name = establishment.name

        # Set the establishment as inactive
        # NOTE: You need to add 'is_active' field to your FoodEstablishment model if it doesn't exist:
        # is_active = models.BooleanField(default=True)
        establishment.is_active = False
        establishment.save()

        # Redirect to dashboard with success message
        from django.contrib import messages
        messages.success(request,
                         f'{establishment_name} has been deactivated successfully. You can reactivate it anytime.')

        return redirect('food_establishment_dashboard')

    except FoodEstablishment.DoesNotExist:
        from django.contrib import messages
        messages.error(request, 'No establishment found for this account.')
        return redirect('owner_login')
    except Exception as e:
        from django.contrib import messages
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
            'category': establishment.category.name if establishment.category else 'N/A',
            'opening_time': establishment.opening_time.strftime('%I:%M %p') if establishment.opening_time else None,
            'closing_time': establishment.closing_time.strftime('%I:%M %p') if establishment.closing_time else None,
            'status': establishment.calculated_status,
            'amenities': amenities_list,
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
        orders = Order.objects.filter(
            establishment=establishment
        ).select_related(
            'user', 'establishment'
        ).prefetch_related(
            Prefetch('orderitem_set', queryset=OrderItem.objects.select_related('menu_item'))
        ).order_by('-created_at')

        # Build the response data
        orders_data = []
        for order in orders:
            # Get order items info
            items = []
            items_preview = []

            for order_item in order.orderitem_set.all():
                items.append({
                    'name': order_item.menu_item.name,
                    'quantity': order_item.quantity,
                    'price': str(order_item.price_at_order),
                })
                items_preview.append(f"{order_item.quantity}x {order_item.menu_item.name}")

            # Limit preview to first 2 items
            preview_text = ', '.join(items_preview[:2])
            if len(items_preview) > 2:
                preview_text += f' +{len(items_preview) - 2} more'

            # Ensure status is always lowercase and valid
            order_status = order.status.lower() if order.status else 'order_received'

            # Normalize legacy statuses
            status_mapping = {
                'pending': 'order_received',
                'paid': 'order_received',
            }
            order_status = status_mapping.get(order_status, order_status)

            order_data = {
                'id': order.id,
                'customer_name': order.user.username if order.user else 'Unknown',
                'customer_email': order.user.email if order.user else '',
                'status': order_status,
                'total_amount': str(order.total_amount),
                'items_count': order.get_item_count(),
                'items_preview': preview_text,
                'items': items,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'gcash_reference': order.gcash_reference_number or '',
                'payment_method': order.gcash_payment_method or 'cash',
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
@require_POST
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
        valid_statuses = ['order_received', 'preparing', 'to_claim', 'completed']
        if new_status not in valid_statuses:
            return JsonResponse({
                'success': False,
                'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }, status=400)

        # Update the order status
        old_status = order.status
        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])

        # Create notification for status change
        try:
            notification_messages = {
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
            # Update order details
            order.status = 'order_received'  # ✅ Set status to order received
            order.gcash_payment_method = 'cash'  # Mark as cash payment

            # Generate cash reference number
            order.gcash_reference_number = f'CASH-{order.id}-{timezone.now().strftime("%Y%m%d%H%M%S")}'

            # Set payment confirmed timestamp
            order.payment_confirmed_at = timezone.now()

            # Save the order
            order.save()

            print(f"DEBUG: Order saved with status: {order.status}")

            # Process each item in the order
            for order_item in order.orderitem_set.all():
                menu_item = order_item.menu_item

                # Validate stock availability
                if menu_item.quantity < order_item.quantity:
                    # Rollback will happen automatically due to transaction.atomic()
                    return JsonResponse({
                        'success': False,
                        'message': f'Not enough stock for {menu_item.name}. Available: {menu_item.quantity}, Requested: {order_item.quantity}'
                    }, status=400)

                # Reduce stock quantity
                menu_item.quantity -= order_item.quantity
                menu_item.save()

                print(f"DEBUG: Reduced stock for {menu_item.name}: {order_item.quantity} units")

            # ✅ FIXED: Create notification for establishment owner
            try:
                notification = OrderNotification.objects.create(
                    order=order,
                    establishment=order.establishment,
                    notification_type='new_order',
                    message=f'New cash order #{order.id} from {request.user.username}'
                )
                print(f"DEBUG: Created notification #{notification.id}")
            except Exception as notification_error:
                # Log notification error but don't fail the order
                print(f"WARNING: Failed to create notification: {str(notification_error)}")
                import traceback
                print(traceback.format_exc())
                # Order will still complete successfully

        print(f"DEBUG: Order #{order_id} processed successfully")

        # Return success response
        return JsonResponse({
            'success': True,
            'message': 'Order placed successfully',
            'order_id': order.id
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

        # Prepare context data for template
        context = {
            'order': order,
            'payment_method': payment_method,  # 'cash' or 'online'
        }

        # Render the success page
        return render(request, 'webapplication/payment_success.html', context)

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
        if order.status == 'PENDING':
            with transaction.atomic():
                order.status = 'order_received'
                order.payment_confirmed_at = timezone.now()
                order.save()

                # Reduce stock
                for order_item in order.orderitem_set.all():
                    menu_item = order_item.menu_item
                    menu_item.quantity -= order_item.quantity
                    menu_item.save()

                # Create notification
                try:
                    OrderNotification.objects.create(
                        order=order,
                        establishment=order.establishment,
                        notification_type='new_order',
                        message=f'New online order from {request.user.username}'
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

@login_required
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

        # Get all completed orders for this establishment
        # Include orders with these statuses that represent completed transactions
        completed_statuses = ['completed', 'to_claim', 'preparing', 'order_received']

        orders = Order.objects.filter(
            establishment=establishment,
            status__in=completed_statuses
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
        # Total revenue (all time)
        total_revenue = orders.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')

        # Total transactions count
        total_transactions = orders.count()

        # Monthly revenue (current month)
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = orders.filter(
            created_at__gte=month_start
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')

        # Success rate (completed vs all orders)
        all_orders_count = Order.objects.filter(establishment=establishment).count()
        completed_orders_count = orders.filter(status='completed').count()

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

@login_required
def order_history_view(request):
    """
    Display the order history page for the logged-in user
    Template: Client_order_history.html
    """
    return render(request, 'webapplication/Client_order_history.html')

@login_required
def get_user_transaction_history(request):
    """
    API endpoint to get all orders for the logged-in user
    Returns JSON with order details including items

    Used by: Client_order_history.html
    Endpoint: /api/user/transactions/
    """
    try:
        # Get all orders for the user, ordered by most recent first
        orders = Order.objects.filter(
            user=request.user
        ).select_related(
            'establishment'
        ).prefetch_related(
            Prefetch('orderitem_set', queryset=OrderItem.objects.select_related('menu_item'))
        ).order_by('-created_at')

        # Build the response data
        orders_data = []
        for order in orders:
            # Get order items
            items = []
            for order_item in order.orderitem_set.all():
                # Calculate item price and total
                # Try to get price from order_item first, then fall back to menu_item
                if hasattr(order_item, 'price') and order_item.price:
                    item_price = order_item.price
                else:
                    item_price = order_item.menu_item.price

                item_total = order_item.quantity * item_price

                items.append({
                    'name': order_item.menu_item.name,
                    'quantity': order_item.quantity,
                    'price': str(item_price),
                    'total_price': str(item_total),
                    'image': order_item.menu_item.image.url if order_item.menu_item.image else None,
                })

            # Build order data
            order_data = {
                'id': order.id,
                'order_number': order.gcash_reference_number or f"ORD-{order.id}",
                'status': order.status,
                'total_amount': str(order.total_amount),
                'created_at': order.created_at.isoformat(),
                'payment_confirmed_at': order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
                'establishment_id': order.establishment.id,
                'establishment_name': order.establishment.name,
                'establishment_address': order.establishment.address,
                'establishment_image': order.establishment.image.url if order.establishment.image else None,
                'items': items,
            }
            orders_data.append(order_data)

        return JsonResponse({
            'success': True,
            'orders': orders_data,
            'total_orders': len(orders_data)
        })

    except Exception as e:
        import traceback
        print(f"Error in get_user_transaction_history: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@login_required
def reorder_items(request, order_id):
    """
    API endpoint to add all items from a previous order to the cart

    Used by: Client_order_history.html (Reorder button)
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

        # Get the order and verify it belongs to the user
        order = Order.objects.get(id=order_id, user=request.user)

        # Get or create cart for the establishment
        cart, created = Cart.objects.get_or_create(
            user=request.user,
            establishment=order.establishment
        )

        # Add each item from the order to the cart
        with transaction.atomic():
            for order_item in order.orderitem_set.all():
                # Check if item already exists in cart
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    menu_item=order_item.menu_item,
                    defaults={'quantity': order_item.quantity}
                )

                if not created:
                    # If item exists, increase quantity
                    cart_item.quantity += order_item.quantity
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
                'name': order_item.menu_item.name,
                'quantity': order_item.quantity,
                'price': str(item_price),
                'total_price': str(item_total),
                'image': order_item.menu_item.image.url if order_item.menu_item.image else None,
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