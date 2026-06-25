from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.landing, name='landing'),
    path('about/', views.about, name='about'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('projects/', views.projects_list, name='projects_list'),
    path('blueprints/', views.blueprints_list, name='blueprints_list'),
    path('reports/', views.reports_view, name='reports'),
    path('reports/download/', views.download_report_pdf, name='download_report_pdf'),
    path('project/create/', views.create_project, name='create_project'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_settings, name='profile'),
    path('settings/', views.settings_view, name='settings'),
    path('projects/<int:project_id>/', views.project_detail, name='project_detail'),
    path('projects/<int:project_id>/save/', views.save_project, name='save_project'),
    path('projects/<int:project_id>/upload_file/', views.upload_file, name='upload_file'),
    path('projects/<int:project_id>/blueprint/', views.project_blueprint, name='project_blueprint'),
    
    # APIs
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/projects/<int:project_id>/', views.api_project_all, name='api_project_all'),
    path('api/projects/<int:project_id>/objectives/', views.api_project_objectives, name='api_project_objectives'),
    path('api/projects/<int:project_id>/experiences/', views.api_project_experiences, name='api_project_experiences'),
    path('api/projects/<int:project_id>/implementation/', views.api_project_implementation, name='api_project_implementation'),
    path('api/projects/<int:project_id>/creation/', views.api_project_creation, name='api_project_creation'),
    path('api/projects/<int:project_id>/orchestration/', views.api_project_orchestration, name='api_project_orchestration'),
    path('api/projects/<int:project_id>/creation/status/', views.api_project_update_status, name='api_project_update_status'),
    path('api/projects/<int:project_id>/orchestration/status/', views.api_project_orchestration_status, name='api_project_orchestration_status'),
    path('api/projects/<int:project_id>/orchestration/add-phase/', views.api_orchestration_add_phase, name='api_orchestration_add_phase'),
    path('api/notifications/', views.api_notifications, name='api_notifications'),
    path('api/notifications/mark_read/', views.api_notifications_mark_read, name='api_notifications_mark_read'),
    path('project/<int:project_id>/delete/', views.delete_project, name='delete_project'),
    path('project/<int:project_id>/update/', views.update_project, name='update_project'),
    path('project/<int:project_id>/archive/', views.archive_project, name='archive_project'),
    path('api/receive-pm-project/', views.receive_pm_project, name='receive_pm_project'),
    path('api/projects/mobile_save/', views.mobile_save_project, name='mobile_save_project'),
    path('api/projects/list/', views.api_projects_list, name='api_projects_list'),
]
