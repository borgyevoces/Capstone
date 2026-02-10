# Add this to webapp/views.py

from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
import os


@csrf_exempt
def create_admin_user(request):
    """
    Emergency endpoint to create superuser
    URL: /create-admin/

    ⚠️ SECURITY WARNING: Remove this after creating admin!
    Or add SECRET_KEY validation for security
    """

    # Optional: Add secret key validation
    secret = request.GET.get('secret', '')
    expected_secret = os.getenv('ADMIN_CREATION_SECRET', 'create-admin-2024')

    if secret != expected_secret:
        return JsonResponse({
            'error': 'Invalid secret key',
            'hint': 'Add ?secret=create-admin-2024 to URL'
        }, status=403)

    try:
        User = get_user_model()

        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admindev')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admindev@kabsueats.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admindev')

        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()

            return JsonResponse({
                'status': 'updated',
                'message': f'Superuser "{username}" already existed. Password updated.',
                'username': username,
                'admin_url': '/admin/'
            })
        else:
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )

            return JsonResponse({
                'status': 'created',
                'message': f'Superuser "{username}" created successfully!',
                'username': username,
                'admin_url': '/admin/'
            })

    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)