# ==========================================
# Standard Library Imports
# ==========================================
import os
import re
import json
import time
import uuid
import base64
import random
import hashlib
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
from django.core.cache import cache
from django.core.mail import send_mail
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
    OTP, Amenity, Category, InvitationCode, UserProfile
)
from .forms import (
    UserProfileUpdateForm, AccessCodeForm,
    FoodEstablishmentForm, FoodEstablishmentUpdateForm,
    MenuItemForm, InvitationCodeForm, ReviewForm
)
import base64
import json
import requests
def about_page(request):
    return render(request, 'webapplication/about.html')
#===================================================================================================================
# ===================================================CLIENT=========================================================
#===================================================================================================================
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
                send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=False)

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
                messages.error(request, "Password must be at least 8 characters long and include at least one uppercase letter and one number.")
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
                send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=False)

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
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            messages.error(request, 'Failed to get Google access token.')
            return redirect('user_login_register')

        user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_info_response = requests.get(user_info_url, headers=headers)
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
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
            send_mail(subject, message, settings.EMAIL_HOST_USER, [user.email], fail_silently=False)

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
    if request.method == 'POST':
        email = request.POST.get('email')
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            subject = "Password Reset Requested"
            email_template_name = "webapplication/password_reset_email.html"
            context = {
                'email': user.email,
                'domain': request.get_host(),
                'site_name': 'Kabsueats',
                'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': default_token_generator.make_token(user),
                'protocol': 'https' if request.is_secure() else 'http',
            }
            email_content = render_to_string(email_template_name, context)

            send_mail(
                subject,
                email_content,
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False
            )

            messages.info(request, "If an account with that email exists, we've sent instructions to reset your password.")
            return redirect('password_reset_done_redirect')

        except User.DoesNotExist:
            messages.error(request, "An account with that email does not exist.")
            return redirect('user_login_register')

    return redirect('user_login_register')

def password_reset_done_redirect(request):
    messages.info(request, "We've emailed you instructions for setting your password, if an account exists with the email you entered. You should receive them shortly.")
    return redirect(reverse('user_login_register') + '?reset_done=true')

def password_reset_complete_redirect(request):
    messages.success(request, "Your password has been reset. You may now log in with your new password.")
    return redirect(reverse('user_login_register') + '?reset_complete=true')

def kabsueats_main_view(request):
    """
    Central view for displaying all food establishments with various filters.
    This view handles category, status, search, and alphabetical filtering.
    """
    category_name = request.GET.get('category', '')
    search_query = request.GET.get('q', '')
    status_filter = request.GET.get('status', '')
    alpha_filter = request.GET.get('alpha', '')

    # Fetch all categories for the new dropdown filter
    all_categories = Category.objects.all().order_by('name')

    food_establishments_queryset = FoodEstablishment.objects.all()
    current_category = None

    if category_name:
        try:
            current_category = Category.objects.get(name__iexact=category_name)
            food_establishments_queryset = food_establishments_queryset.filter(category=current_category)
        except Category.DoesNotExist:
            current_category = None
            messages.error(request, f"Category '{category_name}' not found.")

    if search_query:
        food_establishments_queryset = food_establishments_queryset.filter(
            Q(name__icontains=search_query) |
            Q(amenities__name__icontains=search_query)
        ).distinct()

    if status_filter == 'Open':
        food_establishments_queryset = food_establishments_queryset.filter(status='Open')
    elif status_filter == 'Closed':
        food_establishments_queryset = food_establishments_queryset.filter(status='Closed')

    if alpha_filter:
        food_establishments_queryset = food_establishments_queryset.filter(name__istartswith=alpha_filter)

    ref_lat = 14.4607
    ref_lon = 120.9822

    food_establishments_with_data = []
    for est in food_establishments_queryset:
        if est.latitude is not None and est.longitude is not None:
            distance_km = haversine(ref_lat, ref_lon, est.latitude, est.longitude)
            est.distance_meters = distance_km * 70
            est.distance = distance_km
        else:
            est.distance_meters = 0
            est.distance = 0

        rating_data = est.reviews.aggregate(Avg('rating'), Count('id'))
        est.average_rating = rating_data['rating__avg'] if rating_data['rating__avg'] is not None else 0
        est.review_count = rating_data['id__count']

        food_establishments_with_data.append(est)

    food_establishments_sorted = sorted(food_establishments_with_data, key=lambda x: x.distance)

    context = {
        'food_establishments': food_establishments_sorted,
        'category': {'name': current_category.name} if current_category else None,
        'all_categories': all_categories,  # Add this line
        'status_filter': status_filter,
        'alpha_filter': alpha_filter,
        'q': search_query,
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
    ).order_by('?') # Default sort

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
    """
    Show establishment details, menu items, and reviews.
    """

    # 1. Kunin ang establishment, kasama ang Average Rating at Review Count
    establishment = get_object_or_404(
        FoodEstablishment.objects.annotate(
            average_rating=Avg('reviews__rating'),
            review_count=Count('reviews')
        ),
        id=establishment_id
    )

    # 2. Kunin ang lahat ng reviews
    all_reviews = Review.objects.filter(establishment=establishment).order_by('-created_at')

    user_review = None
    other_reviews = all_reviews

    # 3. Ihiwalay ang review ng user
    if request.user.is_authenticated:
        user_review = all_reviews.filter(user=request.user).first()
        if user_review:
            other_reviews = all_reviews.exclude(id=user_review.id)

    # Review form setup
    review_form = ReviewForm(instance=user_review) if user_review else ReviewForm()

    # --- Menu Item Filters (Hindi ginalaw) ---
    menu_items = MenuItem.objects.filter(food_establishment=establishment)
    search_query = request.GET.get('search')
    filter_first_letter = request.GET.get('filter_first_letter')
    sort_price = request.GET.get('sort_price')
    filter_availability = request.GET.get('filter_availability')
    filter_top_seller = request.GET.get('filter_top_seller')

    if search_query:
        menu_items = menu_items.filter(name__icontains=search_query)
    # ... (iba pang filters)
    if filter_first_letter:
        menu_items = menu_items.filter(name__istartswith=filter_first_letter)

    if filter_availability == 'available':
        menu_items = menu_items.filter(is_available=True)
    elif filter_availability == 'sold_out':
        menu_items = menu_items.filter(is_available=False)

    if filter_top_seller == 'yes':
        menu_items = menu_items.filter(is_top_seller=True)

    if sort_price == 'asc':
        menu_items = menu_items.order_by('price')
    elif sort_price == 'desc':
        menu_items = menu_items.order_by('-price')
    else:
        menu_items = menu_items.order_by('-is_top_seller', 'name')
    # ----------------------------------------

    # 4. Final Context para sa Template
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
        return render(request, 'webapplication/view_directions.html', {'error': 'Location not set for this establishment.'})

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

def send_order_confirmation_email(order):
    """
    Sends confirmation emails to customer and store owner.
    (This function already exists in your code, keeping it for completeness)
    """
    try:
        user_email = order.user.email
        owner_email = order.establishment.owner.email

        # Email to customer
        user_subject = f"Order #{order.id} Confirmed - KabsuEats"
        user_message = f"""
Hello {order.user.username},

Your order from {order.establishment.name} has been confirmed!

Order Details:
- Order ID: {order.id}
- Reference Number: {order.gcash_reference_number}
- Total Amount: ₱{order.total_amount:.2f}
- Status: Payment Confirmed

Items Ordered:
"""
        for item in order.orderitem_set.all():
            user_message += f"\n- {item.menu_item.name} x{item.quantity} @ ₱{item.price_at_order:.2f} = ₱{item.total_price:.2f}"

        user_message += f"\n\nThank you for ordering with KabsuEats!"

        send_mail(
            user_subject,
            user_message,
            settings.EMAIL_HOST_USER,
            [user_email],
            fail_silently=True
        )

        # Email to owner
        owner_subject = f"New Order #{order.id} - {order.establishment.name}"
        owner_message = f"""
New order received for {order.establishment.name}!

Customer: {order.user.username}
Email: {order.user.email}

Order Details:
- Order ID: {order.id}
- Reference Number: {order.gcash_reference_number}
- Total Amount: ₱{order.total_amount:.2f}
- Payment Method: GCash (PayMongo)

Items to Prepare:
"""
        for item in order.orderitem_set.all():
            owner_message += f"\n- {item.menu_item.name} x{item.quantity}"

        owner_message += "\n\nPlease prepare this order as soon as possible."

        send_mail(
            owner_subject,
            owner_message,
            settings.EMAIL_HOST_USER,
            [owner_email],
            fail_silently=True
        )

        print(f"✅ Confirmation emails sent for Order #{order.id}")

    except Exception as e:
        print(f"❌ Error sending emails: {e}")

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
        # Get order_id from request
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

        # PayMongo API setup
        auth_string = f"{settings.PAYMONGO_SECRET_KEY}:"
        auth_base64 = base64.b64encode(auth_string.encode()).decode()

        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        # Build URLs
        success_url = request.build_absolute_uri(
            reverse('gcash_payment_success')
        ) + f'?order_id={order.id}'

        cancel_url = request.build_absolute_uri(
            reverse('gcash_payment_cancel')
        ) + f'?order_id={order.id}'

        # Build description
        item_names = [item.menu_item.name for item in cart_items[:3]]
        description = f"Order from {order.establishment.name}: {', '.join(item_names)}"
        if cart_items.count() > 3:
            description += f" and {cart_items.count() - 3} more items"

        # Payment link payload
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
        response = requests.post(api_url, headers=headers, json=payload)

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
            error_data = response.json() if response.content else {}
            error_message = error_data.get('errors', [{}])[0].get('detail', 'Payment service error')

            return JsonResponse({
                'success': False,
                'message': error_message
            }, status=500)

    except Exception as e:
        print(f"❌ Error creating payment link: {e}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'success': False,
            'message': f'An error occurred: {str(e)}'
        }, status=500)


@login_required
def gcash_payment_success(request):
    """
    Handle successful payment - UPDATED with stock reduction
    """
    order_id = request.GET.get('order_id')

    if not order_id:
        messages.error(request, 'Invalid payment confirmation')
        return redirect('view_cart')

    try:
        order = Order.objects.get(id=order_id, user=request.user)

        # Update order status
        order.status = 'PAID'
        order.payment_confirmed_at = timezone.now()
        order.save()

        # ✅ REDUCE STOCK for each item
        for order_item in order.orderitem_set.all():
            menu_item = order_item.menu_item
            if menu_item.quantity >= order_item.quantity:
                menu_item.quantity -= order_item.quantity
                menu_item.save()
            else:
                print(f"⚠️ Warning: Insufficient stock for {menu_item.name}")

        # Send confirmation emails
        try:
            send_order_confirmation_email(order)
        except Exception as e:
            print(f"Email error: {e}")

        messages.success(request, 'Payment successful! Your order has been confirmed.')
        return redirect('order_confirmation', order_id=order.id)

    except Order.DoesNotExist:
        messages.error(request, 'Order not found')
        return redirect('view_cart')

@login_required
def gcash_payment_cancel(request):
    """Handle cancelled payment"""
    order_id = request.GET.get('order_id')

    if order_id:
        try:
            order = Order.objects.get(id=order_id, user=request.user)
            messages.warning(request, f'Payment was cancelled for {order.establishment.name}. You can try again from your cart.')
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

@csrf_exempt
@require_POST
def paymongo_webhook(request):
    """
    Webhook endpoint for PayMongo payment events.
    This is optional but recommended for production to handle payment confirmations.

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
                    order = Order.objects.get(gcash_reference_number=reference_number)
                    if order.status == 'PENDING':
                        order.status = 'PAID'
                        order.payment_confirmed_at = timezone.now()
                        order.save()

                        # Reduce stock
                        for order_item in order.orderitem_set.all():
                            menu_item = order_item.menu_item
                            menu_item.quantity = max(menu_item.quantity - order_item.quantity, 0)
                            menu_item.save()

                        # Send email
                        send_order_confirmation_email(order)

                except Order.DoesNotExist:
                    pass

        elif event_type == 'payment.failed':
            # Handle failed payment
            payment_data = payload.get('data', {}).get('attributes', {}).get('data', {})
            reference_number = payment_data.get('id')

            if reference_number:
                try:
                    order = Order.objects.get(gcash_reference_number=reference_number)
                    order.status = 'CANCELLED'
                    order.save()
                except Order.DoesNotExist:
                    pass

        return HttpResponse(status=200)

    except Exception as e:
        print(f"Webhook error: {e}")
        return HttpResponse(status=400)

def send_order_confirmation_email(order):
    """Send confirmation emails to customer and store owner"""
    from django.core.mail import send_mail

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

@login_required
@require_POST
def create_buynow_payment_link(request):
    """
    Create PayMongo payment link for immediate Buy Now (single item) - NO DELIVERY FEE
    """
    try:
        menu_item_id = request.POST.get('menu_item_id')
        quantity = int(request.POST.get('quantity', 1))

        if not menu_item_id or quantity < 1:
            return JsonResponse({
                'success': False,
                'message': 'Invalid item or quantity'
            }, status=400)

        # Get menu item
        menu_item = get_object_or_404(MenuItem, id=menu_item_id)
        establishment = menu_item.food_establishment

        # Check stock availability
        if menu_item.quantity < quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {menu_item.quantity} items available in stock'
            }, status=400)

        # ✅ REMOVED DELIVERY FEE - Calculate item total only
        item_total = Decimal(str(menu_item.price)) * quantity
        grand_total = item_total  # No delivery fee
        amount_in_centavos = int(grand_total * 100)

        # Create order WITHOUT delivery fee
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

        # PayMongo API setup
        auth_string = f"{settings.PAYMONGO_SECRET_KEY}:"
        auth_base64 = base64.b64encode(auth_string.encode()).decode()

        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        # Build URLs
        success_url = request.build_absolute_uri(
            reverse('gcash_payment_success')
        ) + f'?order_id={order.id}'

        cancel_url = request.build_absolute_uri(
            reverse('gcash_payment_cancel')
        ) + f'?order_id={order.id}'

        # Description
        description = f"Buy Now: {menu_item.name} x{quantity} from {establishment.name}"

        # Payment link payload
        payload = {
            "data": {
                "attributes": {
                    "amount": amount_in_centavos,
                    "description": description,
                    "remarks": f"Order #{order.id} - KabsuEats Buy Now",
                    "payment_method_allowed": ["gcash"],
                    "success_url": success_url,
                    "failed_url": cancel_url
                }
            }
        }

        # Call PayMongo API
        api_url = f"{settings.PAYMONGO_API_URL}/links"
        response = requests.post(api_url, headers=headers, json=payload)

        if response.status_code in [200, 201]:
            response_data = response.json()
            checkout_url = response_data['data']['attributes']['checkout_url']
            reference_number = response_data['data']['id']

            # Save reference number
            try:
                order.gcash_reference_number = reference_number
                order.save(update_fields=['gcash_reference_number'])
            except Exception as e:
                print(f"⚠️ Warning: Could not save reference number: {e}")

            return JsonResponse({
                'success': True,
                'checkout_url': checkout_url,
                'order_id': order.id,
                'reference_number': reference_number,
                'total_amount': float(grand_total)
            })
        else:
            # Payment link creation failed - delete order
            order.delete()
            error_data = response.json() if response.content else {}
            error_message = error_data.get('errors', [{}])[0].get('detail', 'Payment service error')

            return JsonResponse({
                'success': False,
                'message': error_message
            }, status=500)

    except Exception as e:
        print(f"❌ Error creating Buy Now payment: {e}")
        import traceback
        traceback.print_exc()

        return JsonResponse({
            'success': False,
            'message': f'An error occurred: {str(e)}'
        }, status=500)

@login_required
def get_owner_notifications(request):
    """
    API endpoint to get unread notifications for establishment owner
    """
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id:
        return JsonResponse({
            'success': False,
            'error': 'Not authorized'
        }, status=403)

    try:
        establishment = FoodEstablishment.objects.get(id=establishment_id, owner=request.user)

        # Get unread notifications
        notifications = OrderNotification.objects.filter(
            establishment=establishment,
            is_read=False
        ).select_related('order', 'order__user').order_by('-created_at')[:10]

        notifications_data = [{
            'id': notif.id,
            'type': notif.notification_type,
            'message': notif.message,
            'order_id': notif.order.id,
            'customer_name': notif.order.user.username,
            'total_amount': float(notif.order.total_amount),
            'created_at': notif.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'time_ago': get_time_ago(notif.created_at)
        } for notif in notifications]

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
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
@require_POST
def mark_notification_read(request, notification_id):
    """
    Mark a notification as read
    """
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id:
        return JsonResponse({
            'success': False,
            'error': 'Not authorized'
        }, status=403)

    try:
        establishment = FoodEstablishment.objects.get(id=establishment_id, owner=request.user)
        notification = OrderNotification.objects.get(
            id=notification_id,
            establishment=establishment
        )

        notification.mark_as_read()

        # Get updated unread count
        unread_count = OrderNotification.objects.filter(
            establishment=establishment,
            is_read=False
        ).count()

        return JsonResponse({
            'success': True,
            'unread_count': unread_count
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
    Mark all notifications as read
    """
    establishment_id = request.session.get('food_establishment_id')

    if not establishment_id:
        return JsonResponse({
            'success': False,
            'error': 'Not authorized'
        }, status=403)

    try:
        establishment = FoodEstablishment.objects.get(id=establishment_id, owner=request.user)

        OrderNotification.objects.filter(
            establishment=establishment,
            is_read=False
        ).update(is_read=True)

        return JsonResponse({
            'success': True,
            'unread_count': 0
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
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
        return f"{diff.days} days ago"

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
#===================================================================================================================
# ===================================================END CLIENT=====================================================
#===================================================================================================================

#===================================================================================================================
# =================================================== OWNER ========================================================
#===================================================================================================================
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
    Accepts POST with JSON { "email": "owner@gmail.com" } or form-encoded.
    Saves the OTP into OTP model and session, sends via SendGrid.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    # Get email from JSON or POST
    try:
        body = request.body.decode('utf-8') or ''
        data = json.loads(body) if body else {}
    except Exception:
        data = {}

    email = data.get('email') or request.POST.get('email')
    if not email:
        return JsonResponse({'error': 'Email is required'}, status=400)

    otp_code = str(random.randint(100000, 999999)).zfill(6)

    # Save OTP in DB (create or update)
    try:
        otp_obj, created = OTP.objects.update_or_create(email=email, defaults={'code': otp_code})
    except Exception as e:
        # If OTP model isn't available for some reason, still store in session
        print("OTP DB save error:", e)
        otp_obj = None

    # Also save in session for redundancy
    try:
        request.session['otp'] = otp_code
        request.session['otp_email'] = email
        request.session.modified = True
    except Exception as e:
        print("Session OTP save error:", e)

    # Prepare SendGrid message
    from_email = os.getenv('SENDER_EMAIL') or getattr(__import__('django.conf').conf.settings, 'DEFAULT_FROM_EMAIL', None)
    sendgrid_key = os.getenv('SENDGRID_API_KEY')

    html_content = f"<p>Your KabsuEats verification code is: <strong>{otp_code}</strong></p>"

    if sendgrid_key:
        try:
            message = Mail(
                from_email=from_email,
                to_emails=email,
                subject='Your KabsuEats OTP Code',
                html_content=html_content
            )
            sg = SendGridAPIClient(sendgrid_key)
            response = sg.send(message)

            # 202 is accepted by SendGrid
            if response.status_code in (200, 202):
                print(f"✅ OTP sent via SendGrid to {email}: {otp_code}")
                return JsonResponse({'success': True})
            else:
                print("SendGrid response:", response.status_code, response.body)
                return JsonResponse({'error': 'Failed to send OTP via SendGrid.'}, status=500)
        except Exception as e:
            print(f"❌ SendGrid error: {e}")
            # Fall through to return success (OTP stored) or error depending on your choice
            # We'll return success because OTP is already stored in DB/session — frontend can continue.
            return JsonResponse({'success': True, 'warning': 'OTP saved but failed sending email.'})
    else:
        # No SendGrid configured — return success because OTP saved (you may want to log or send via Django email)
        print(f"⚠️ SENDGRID_API_KEY not configured. OTP for {email}: {otp_code}")
        return JsonResponse({'success': True, 'warning': 'SendGrid not configured; OTP generated (check server logs).'})

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
    payment_methods = ', '.join(data.get('paymentMethods', [])) if data.get('paymentMethods') else data.get('payment_methods', '')
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
    establishment = FoodEstablishment.objects.create(
        owner=user,
        name=name,
        address=address,
        status=data.get('status', 'Open'),
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

@login_required
@require_POST
def update_establishment_details_ajax(request, pk):
    """Update establishment details via AJAX"""
    try:
        establishment = FoodEstablishment.objects.get(pk=pk, owner=request.user)
    except FoodEstablishment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Establishment not found or access denied.'
        }, status=404)

    form = FoodEstablishmentUpdateForm(request.POST, request.FILES, instance=establishment)

    if form.is_valid():
        try:
            instance = form.save()

            # Prepare response data
            data = {
                'success': True,
                'message': 'Establishment details updated successfully.',
                'name': instance.name,
                'address': instance.address,
                'status': instance.status,
                'category': instance.category.name if instance.category else None,
                'payment_methods': instance.payment_methods,
                'latitude': str(instance.latitude),
                'longitude': str(instance.longitude),
                'image_url': instance.image.url if instance.image else '',
                'amenities': ', '.join([a.name for a in instance.amenities.all()]),
            }

            return JsonResponse(data)

        except Exception as e:
            print(f"Database save error: {e}")
            return JsonResponse({
                'success': False,
                'error': 'A database error occurred during update.'
            }, status=500)
    else:
        errors = {k: v for k, v in form.errors.items()}
        return JsonResponse({
            'success': False,
            'error': 'Validation failed. Please check your inputs.',
            'errors': errors
        }, status=400)
#===================================================================================================================
# ================================================END OWNER ========================================================
#===================================================================================================================

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

@require_POST
@login_required
@transaction.atomic
def add_to_cart(request):
    """
    Adds a MenuItem to cart. Supports multiple establishments.
    Each establishment has its own separate cart.
    """
    try:
        menu_item_id = request.POST.get('menu_item_id')
        quantity = int(request.POST.get('quantity', 1))

        if not menu_item_id or quantity <= 0:
            return JsonResponse({
                'success': False,
                'message': 'Invalid item or quantity.'
            }, status=400)

        # Fetch the menu item
        menu_item = get_object_or_404(
            MenuItem.objects.select_related('food_establishment'),
            pk=menu_item_id
        )

        establishment = menu_item.food_establishment

        # Check stock availability
        if menu_item.quantity < quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {menu_item.quantity} items available in stock'
            }, status=400)

        # Get or create cart for THIS establishment
        order, created = Order.objects.get_or_create(
            user=request.user,
            establishment=establishment,
            status='PENDING',
            defaults={'total_amount': 0}
        )

        # Add or update OrderItem
        order_item, item_created = OrderItem.objects.get_or_create(
            order=order,
            menu_item=menu_item,
            defaults={
                'quantity': quantity,
                'price_at_order': menu_item.price,
            }
        )

        if not item_created:
            # Check if adding would exceed stock
            new_quantity = order_item.quantity + quantity
            if new_quantity > menu_item.quantity:
                return JsonResponse({
                    'success': False,
                    'message': f'Cannot add {quantity} more. Only {menu_item.quantity - order_item.quantity} items available.'
                }, status=400)
            order_item.quantity = new_quantity
            order_item.save()

        # Update order total
        order.total_amount = sum(
            item.quantity * item.price_at_order
            for item in order.orderitem_set.all()
        )
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

    except Exception as e:
        print(f"Error in add_to_cart: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error adding item to cart.'
        }, status=500)

@login_required
def view_cart(request):
    """
    Display all carts grouped by establishment.
    Each establishment shows its own items and order summary.
    """
    try:
        # Get ALL pending orders (one per establishment)
        all_carts = Order.objects.filter(
            user=request.user,
            status='PENDING'
        ).select_related('establishment').prefetch_related(
            'orderitem_set__menu_item'
        ).order_by('establishment__name')

        # Prepare cart data for each establishment
        carts_data = []
        total_cart_count = 0

        for order in all_carts:
            cart_items = order.orderitem_set.all().order_by('menu_item__name')
            item_count = cart_items.aggregate(Sum('quantity'))['quantity__sum'] or 0
            total_cart_count += item_count

            carts_data.append({
                'order': order,
                'establishment': order.establishment,
                'items': cart_items,
                'item_count': item_count,
                'subtotal': order.total_amount
            })

    except Exception as e:
        print(f"Error loading cart: {e}")
        carts_data = []
        total_cart_count = 0

    context = {
        'carts_data': carts_data,
        'total_cart_count': total_cart_count,
    }
    return render(request, 'webapplication/cart.html', context)

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
    """Generic payment status page"""
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
    Update cart item quantity with stock validation.
    """
    try:
        order_item_id = request.POST.get('order_item_id')
        quantity = int(request.POST.get('quantity', 1))

        if quantity < 1:
            return JsonResponse({
                'success': False,
                'message': 'Quantity must be at least 1'
            }, status=400)

        # Get order item
        order_item = get_object_or_404(
            OrderItem.objects.select_related('order', 'menu_item'),
            id=order_item_id,
            order__user=request.user,
            order__status='PENDING'
        )

        # Check stock availability
        if order_item.menu_item.quantity < quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {order_item.menu_item.quantity} items available in stock'
            }, status=400)

        # Update quantity
        order_item.quantity = quantity
        order_item.save()

        # Update order total
        order = order_item.order
        order.total_amount = sum(
            item.quantity * item.price_at_order
            for item in order.orderitem_set.all()
        )
        order.save()

        # Calculate total cart count across ALL establishments
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'message': 'Cart updated',
            'item_total': float(order_item.quantity * order_item.price_at_order),
            'cart_total': float(order.total_amount),
            'cart_count': total_cart_count
        })

    except Exception as e:
        print(f"Error updating cart: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error updating cart'
        }, status=500)


@login_required
@require_POST
def remove_from_cart(request):
    """
    Remove item from cart. Delete order if last item removed.
    """
    try:
        order_item_id = request.POST.get('order_item_id')

        order_item = get_object_or_404(
            OrderItem,
            id=order_item_id,
            order__user=request.user,
            order__status='PENDING'
        )

        order = order_item.order
        order_item.delete()

        # Check if cart still has items
        remaining_items = order.orderitem_set.all()

        if remaining_items.exists():
            # Update total
            order.total_amount = sum(
                item.quantity * item.price_at_order
                for item in remaining_items
            )
            order.save()
        else:
            # Delete order if no items left
            order.delete()

        # Calculate total cart count across ALL establishments
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'message': 'Item removed from cart',
            'cart_count': total_cart_count,
            'order_deleted': not remaining_items.exists()
        })

    except Exception as e:
        print(f"Error removing from cart: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error removing item'
        }, status=500)

@login_required
def get_cart_count(request):
    """
    Get current cart item count across ALL establishments.
    """
    try:
        total_cart_count = OrderItem.objects.filter(
            order__user=request.user,
            order__status='PENDING'
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return JsonResponse({
            'success': True,
            'cart_count': total_cart_count
        })
    except Exception as e:
        print(f"Error getting cart count: {e}")
        return JsonResponse({
            'success': False,
            'cart_count': 0
        })


@login_required
@require_POST
def clear_establishment_cart(request):
    """
    Clear entire cart for a specific establishment.
    """
    try:
        establishment_id = request.POST.get('establishment_id')

        order = get_object_or_404(
            Order,
            user=request.user,
            establishment_id=establishment_id,
            status='PENDING'
        )

        order.delete()

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
            'message': 'Error clearing cart'
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
