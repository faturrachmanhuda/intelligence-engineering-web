# pyrefly: ignore [missing-import]
from .models import Content, Project
from rest_framework import serializers

class ContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Content
        exclude = ['set_view']

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'division', 'supervisor', 'start_date', 'end_date', 'status', 'progress', 'created_at', 'json_draft']
