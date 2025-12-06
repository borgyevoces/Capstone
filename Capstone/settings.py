# Capstone/settings.py
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

EMAIL_TIMEOUT = 10

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Secrets and config
PAYMONGO_SECRET_KEY = os.getenv('PAYMONGO_SECRET_KEY', '')
PAYMONGO_PUBLIC_KEY = os.getenv('PAYMONGO_PUBLIC_KEY', '')
PAYMONGO_API_URL = os.getenv('PAYMONGO_API_URL', 'https://api.paymongo.com/v1')
SITE_URL = os.getenv('SITE_URL', 'http://127.0.0.1:8000')
PAYMONGO_GCASH_SOURCE_URL = os.getenv('PAYMONGO_GCASH_SOURCE_URL', 'https://api.paymongo.com/v1/sources')
PAYMONGO_GCASH_CHECKOUT_URL = os.getenv('PAYMONGO_GCASH_CHECKOUT_URL', 'https://api.paymongo.com/v1/checkout_sessions')

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

LOGIN_URL = 'user_login_register'
LOGIN_REDIRECT_URL = 'kabsueats_home'
LOGOUT_REDIRECT_URL = 'user_login_register'

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'webapp.apps.WebappConfig',
]

ASGI_APPLICATION = 'Capstone.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

MIDDLEWARE = [
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'Capstone.urls'

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

# Database - Use PostgreSQL in production, SQLite locally
database_url = os.getenv('DATABASE_URL')
if database_url:
    DATABASES = {
        'default': dj_database_url.parse(database_url, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if not SITE_URL.startswith(('http://', 'https://')):
    SITE_URL = 'http://' + SITE_URL
SITE_URL = SITE_URL.rstrip('/')

GOOGLE_REDIRECT_URI = f"{SITE_URL}/accounts/google/callback"

try:
    import logging
    logging.getLogger('django').info(f"Effective GOOGLE_REDIRECT_URI set to: {GOOGLE_REDIRECT_URI}")
except Exception:
    pass
print(f"[DEBUG] Effective GOOGLE_REDIRECT_URI={GOOGLE_REDIRECT_URI}")

DEBUG = os.getenv('DEBUG', 'True') == 'True'

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-placeholder'
        import warnings
        warnings.warn('SECRET_KEY not set - using dev fallback.', RuntimeWarning)
    else:
        raise RuntimeError('SECRET_KEY environment variable is not set.')

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

if DEBUG:
    for local_host in ('127.0.0.1', 'localhost'):
        if local_host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(local_host)

CSRF_TRUSTED_ORIGINS = ['http://127.0.0.1:8000']
if not DEBUG and SITE_URL:
    CSRF_TRUSTED_ORIGINS.append(SITE_URL)

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
SENDER_EMAIL = os.getenv('SENDER_EMAIL')
CVSU_LATITUDE = os.getenv('CVSU_LATITUDE')
CVSU_LONGITUDE = os.getenv('CVSU_LONGITUDE')