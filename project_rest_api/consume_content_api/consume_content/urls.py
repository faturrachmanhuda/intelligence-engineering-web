from django.urls import path
from . import views

urlpatterns = [
    path('content/', views.show_all_content, name='show_content'),
]
