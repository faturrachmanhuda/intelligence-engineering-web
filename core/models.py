from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, default="Proyek Baru")
    description = models.TextField(blank=True)
    division = models.CharField(max_length=255, blank=True)
    supervisor = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    progress = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='New')
    pm_project_id = models.CharField(max_length=100, blank=True, default='')
    is_archived = models.BooleanField(default=False)
    
    # Store the actual HTML draft here
    html_draft = models.TextField(blank=True)
    json_draft = models.TextField(blank=True)
    active_tab = models.CharField(max_length=50, blank=True, default='objectives')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def active_tab_index(self):
        tabs = ['objectives', 'experiences', 'implementation', 'creation', 'orchestration']
        if self.active_tab in tabs:
            return tabs.index(self.active_tab)
        return 0

    @property
    def highest_unlocked_tab_index(self):
        if self.status and self.status.lower() == 'completed':
            return 5
        import re
        if self.html_draft:
            match = re.search(r'id="highest-unlocked-index" value="(\d+)"', self.html_draft)
            if match:
                return int(match.group(1))
        return self.active_tab_index

    def __str__(self):
        return self.name

    def get_module_statuses(self):
        import json
        try:
            if not self.json_draft:
                return None
            data = json.loads(self.json_draft)
            if 'creation' in data and 'module_statuses' in data['creation']:
                return data['creation']['module_statuses']
        except Exception:
            pass
        return None

class ProjectFile(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='project_files/')
    original_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        UserProfile.objects.create(user=instance)

class Content(models.Model):
    title = models.CharField(max_length=255)
    body = models.TextField()
    set_view = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.message


