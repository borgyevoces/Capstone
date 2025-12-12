# Capstone/settings.py
"""
Django settings for Capstone project.
"""
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

# Base dir and load .env early
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

# ============================================================================
# CRITICAL: Load DEBUG and SECRET_KEY FIRST
# ============================================================================
DEBUG = os.getenv('DEBUG', 'True') == 'True'

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-placeholder'
        import warnings
        warnings.warn('SECRET_KEY not set — using insecure dev fallback.', RuntimeWarning)
    else:
        raise RuntimeError('SECRET_KEY environment variable is not set.')

# ============================================================================
# SITE URL AND ALLOWED HOSTS
# ============================================================================
SITE_URL = os.getenv('SITE_URL', 'http://127.0.0.1:8000')

# Normalize SITE_URL
if not SITE_URL.startswith(('http://', 'https://')):
    SITE_URL = 'http://' + SITE_URL
SITE_URL = SITE_URL.rstrip('/')

# Compute ALLOWED_HOSTS
raw_allowed = os.getenv('ALLOWED_HOSTS', '').strip()
if raw_allowed:
    ALLOWED_HOSTS = [h.strip() for h in raw_allowed.split(',') if h.strip()]
else:
    try:
        from urllib.parse import urlparse
        parsed = urlparse(SITE_URL)
        host_from_site = parsed.hostname
    except Exception:
        host_from_site = None
    ALLOWED_HOSTS = [host_from_site] if host_from_site else []

# Always allow local hosts in DEBUG mode
if DEBUG:
    for local_host in ('127.0.0.1', 'localhost'):
        if local_host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(local_host)

# Always include Render domain
if 'capstone-kbqh.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('capstone-kbqh.onrender.com')

# ============================================================================
# INSTALLED APPS
# ============================================================================
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'cloudinary_storage',
    'cloudinary',
    'webapp.apps.WebappConfig',
]

# ============================================================================
# MIDDLEWARE (CRITICAL ORDER FOR ADMIN)
# ============================================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'Capstone.urls'

# ============================================================================
# TEMPLATES (REQUIRED FOR ADMIN)
# ============================================================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Capstone.wsgi.application'
ASGI_APPLICATION = 'Capstone.asgi.application'

# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Production: PostgreSQL
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Local: SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ============================================================================
# CHANNEL LAYERS
# ============================================================================
REDIS_URL = os.getenv('REDIS_URL')
if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer'
        }
    }

# ============================================================================
# CLOUDINARY
# ============================================================================
import cloudinary
import cloudinary.uploader
import cloudinary.api

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET'),
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# ============================================================================
# STATIC FILES
# ============================================================================
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Use STORAGES instead of deprecated STATICFILES_STORAGE
STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ============================================================================
# MEDIA FILES
# ============================================================================
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ============================================================================
# PASSWORD VALIDATION
# ============================================================================
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ============================================================================
# INTERNATIONALIZATION
# ============================================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================================
# CSRF TRUSTED ORIGINS
# ============================================================================
CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:8000',
    'https://capstone-kbqh.onrender.com',
]

# ============================================================================
# AUTHENTICATION
# ============================================================================
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

LOGIN_URL = 'user_login_register'
LOGIN_REDIRECT_URL = 'kabsueats_home'
LOGOUT_REDIRECT_URL = 'user_login_register'

# ============================================================================
# GOOGLE OAUTH
# ============================================================================
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = f"{SITE_URL}/accounts/google/callback"

print(f"[DEBUG] Effective GOOGLE_REDIRECT_URI={GOOGLE_REDIRECT_URI}")

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_TIMEOUT = 10

# ============================================================================
# SENDGRID
# ============================================================================
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
SENDER_EMAIL = os.getenv('SENDER_EMAIL')
DEFAULT_FROM_EMAIL = SENDER_EMAIL or 'noreply@kabsueats.com'

# ============================================================================
# PAYMONGO
# ============================================================================
PAYMONGO_SECRET_KEY = os.getenv('PAYMONGO_SECRET_KEY', '')
PAYMONGO_PUBLIC_KEY = os.getenv('PAYMONGO_PUBLIC_KEY', '')
PAYMONGO_API_URL = os.getenv('PAYMONGO_API_URL', 'https://api.paymongo.com/v1')
PAYMONGO_GCASH_SOURCE_URL = os.getenv('PAYMONGO_GCASH_SOURCE_URL', 'https://api.paymongo.com/v1/sources')
PAYMONGO_GCASH_CHECKOUT_URL = os.getenv('PAYMONGO_GCASH_CHECKOUT_URL', 'https://api.paymongo.com/v1/checkout_sessions')
PAYMONGO_MINIMUM_AMOUNT_CENTAVOS = int(os.getenv('PAYMONGO_MINIMUM_AMOUNT_CENTAVOS', '10000'))

# ============================================================================
# CVSU COORDINATES
# ============================================================================
CVSU_LATITUDE = os.getenv('CVSU_LATITUDE', '14.412768')
CVSU_LONGITUDE = os.getenv('CVSU_LONGITUDE', '120.981348')

# ============================================================================
# SECURITY SETTINGS (PRODUCTION)
# ============================================================================
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# ============================================================================
# ⚠️ REMOVED: Database queries during settings load
# Use management command instead: python manage.py create_superuser
# ============================================================================