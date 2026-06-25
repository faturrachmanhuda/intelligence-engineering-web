from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework import routers
from core.viewset_api import ContentViewset, ProjectViewset

router = routers.DefaultRouter()
router.register('content', ContentViewset)
router.register('projects', ProjectViewset, basename='project')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
