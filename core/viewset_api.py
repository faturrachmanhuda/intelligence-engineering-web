from .models import Content, Project
from .serializers import ContentSerializer, ProjectSerializer
from rest_framework import viewsets, permissions
from rest_framework.authentication import TokenAuthentication, SessionAuthentication

class ContentViewset(viewsets.ModelViewSet):
    queryset = Content.objects.all()
    serializer_class = ContentSerializer
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (permissions.IsAuthenticated,)

class ProjectViewset(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    # Using AllowAny for now for easy Flutter integration testing
    permission_classes = (permissions.AllowAny,)

    def perform_create(self, serializer):
        from django.contrib.auth.models import User
        from core.models import Notification
        # Default to first user if request is not authenticated
        user = self.request.user if self.request.user.is_authenticated else User.objects.first()
        project = serializer.save(user=user)
        Notification.objects.create(
            user=user,
            message=f"Proyek baru '{project.name}' telah diterima.",
            link=f"/projects/{project.id}/"
        )
