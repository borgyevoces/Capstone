from django.contrib import admin
from django.conf import settings  # Correct import
from django.conf.urls.static import static  # Correct import
from django.urls import path, include
from webapp.views import create_admin_user

urlpatterns = [
    path('admin/', admin.site.urls),
    path('create-admin/', create_admin_user, name='create_admin'),
    path('', include('webapp.urls')),
]
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)







