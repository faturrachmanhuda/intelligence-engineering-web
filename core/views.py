import json
import base64
from collections import Counter
from django.utils import timezone
from django.db.models import Q
from django.core.files.base import ContentFile
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib import messages
from .forms import LoginForm, RegisterForm
from .models import Project, UserProfile

# TEMP HELPER FOR FIGMA - remove after screenshots
def _get_user(request):
    if request.user.is_authenticated:
        return request.user
    from django.contrib.auth.models import User
    return User.objects.first()

def _get_project_or_404(project_id, request):
    """Get project by id. PM-broadcasted projects are accessible by any user."""
    try:
        project = Project.objects.get(id=project_id)
        # PM projects (has pm_project_id) are accessible to all
        if project.pm_project_id:
            return project
        # Own projects only
        if project.user == _get_user(request):
            return project
        from django.http import Http404
        raise Http404
    except Project.DoesNotExist:
        from django.http import Http404
        raise Http404

def landing(request):
    return render(request, 'core/landing.html')

def about(request):
    return render(request, 'core/about.html')

def login_view(request):
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('core:dashboard')
            else:
                messages.error(request, 'Invalid username or password.')
    else:
        form = LoginForm()
    return render(request, 'core/login.html', {'form': form})

@login_required
def settings_view(request):
    return render(request, 'core/settings.html')

def register_view(request):
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Account created successfully. Please login.')
            return redirect('core:login')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = RegisterForm()
    return render(request, 'core/register.html', {'form': form})

@login_required
def dashboard(request):
    projects = Project.objects.filter(
        Q(user=_get_user(request)) | (~Q(pm_project_id='') & Q(pm_project_id__isnull=False))
    ).distinct()
    
    total_projects = projects.count()
    completed_projects = projects.filter(status__iexact='completed').count()
    active_projects = projects.filter(status__iexact='Active').count()
    new_projects = projects.filter(status__iexact='new').count()
    
    # Calculate overall progress
    total_progress = sum(p.progress for p in projects) if total_projects > 0 else 0
    avg_progress = int(total_progress / total_projects) if total_projects > 0 else 0
    
    # Timeline aggregations
    now = timezone.now()
    current_year = now.year
    current_month = now.month
    
    monthly_counts = [0] * 12
    monthly_update_counts = [0] * 12
    weekly_counts_all = {m: [0, 0, 0, 0, 0] for m in range(1, 13)}
    weekly_update_counts_all = {m: [0, 0, 0, 0, 0] for m in range(1, 13)}
    
    for p in projects:
        if p.created_at.year == current_year:
            m = p.created_at.month
            monthly_counts[m - 1] += 1
            
            day = p.created_at.day
            if day <= 7: weekly_counts_all[m][0] += 1
            elif day <= 14: weekly_counts_all[m][1] += 1
            elif day <= 21: weekly_counts_all[m][2] += 1
            elif day <= 28: weekly_counts_all[m][3] += 1
            else: weekly_counts_all[m][4] += 1
            
        if p.updated_at.year == current_year:
            m_upd = p.updated_at.month
            monthly_update_counts[m_upd - 1] += 1
            
            day_upd = p.updated_at.day
            if day_upd <= 7: weekly_update_counts_all[m_upd][0] += 1
            elif day_upd <= 14: weekly_update_counts_all[m_upd][1] += 1
            elif day_upd <= 21: weekly_update_counts_all[m_upd][2] += 1
            elif day_upd <= 28: weekly_update_counts_all[m_upd][3] += 1
            else: weekly_update_counts_all[m_upd][4] += 1
                
    month_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    week_labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Minggu 5']
    
    context = {
        'total_projects': total_projects,
        'completed_projects': completed_projects,
        'active_projects': active_projects,
        'new_projects': new_projects,
        'avg_progress': avg_progress,
        'projects': projects,
        'month_labels': json.dumps(month_labels),
        'monthly_counts': json.dumps(monthly_counts),
        'monthly_update_counts': json.dumps(monthly_update_counts),
        'week_labels': json.dumps(week_labels),
        'weekly_counts_all': json.dumps(weekly_counts_all),
        'weekly_update_counts_all': json.dumps(weekly_update_counts_all),
        'current_month': current_month,
    }
    
    # Detailed Chart Data Aggregation
    from collections import Counter
    tech_counter = Counter()
    pic_counter = Counter()
    constraint_counter = Counter()
    module_status_counter = Counter()
    exp_counter = Counter()
    function_counter = Counter()
    orch_category_counter = Counter()
    biz_process_counter = Counter()
    timeline_status_counter = Counter()
    
    obj_org = 0
    obj_user = 0
    obj_model = 0
    
    total_smart_processes = 0
    total_standard_processes = 0
    total_error_strategies = 0
    total_data_plans = 0
    total_attachments = 0
    total_leading_features = 0

    for p in projects:
        if p.json_draft:
            try:
                data = json.loads(p.json_draft)
                
                techs = data.get('implementation', {}).get('technologies', [])
                for t in techs:
                    tech_list = [x.strip() for x in t.get('technologies', '').split(',')]
                    for tech in tech_list:
                        if tech: tech_counter[tech] += 1
                        
                timeline = data.get('orchestration', {}).get('timeline', [])
                for t in timeline:
                    pic = t.get('pic', '').strip()
                    if pic: pic_counter[pic] += 1
                    cat = t.get('category', '').strip().lower()
                    if cat: orch_category_counter[cat] += 1
                    ts = t.get('status', '').strip().lower()
                    if ts: timeline_status_counter[ts] += 1
                    
                constraints = data.get('creation', {}).get('constraints', [])
                for c in constraints:
                    cat = c.get('category', '').strip()
                    if cat: constraint_counter[cat] += 1
                    
                modules = data.get('creation', {}).get('module_statuses', [])
                for m in modules:
                    status = m.get('status', '').strip().lower()
                    if status: module_status_counter[status] += 1
                    
                objs = data.get('objectives', {})
                obj_org += len(objs.get('organizational', []))
                obj_user += len(objs.get('user_outcomes', []))
                obj_model += len(objs.get('model_properties', []))
                total_leading_features += len(objs.get('leading_indicators', {}).get('data', []))
                
                biz_procs = data.get('implementation', {}).get('business_processes', [])
                smart_procs_list = data.get('implementation', {}).get('smart_processes', [])
                total_smart_processes += len(smart_procs_list)
                total_standard_processes += max(0, len(biz_procs) - len(smart_procs_list))
                for bp in biz_procs:
                    name = bp.get('name', '').strip()
                    if name: biz_process_counter[name] += 1
                
                total_attachments += len(data.get('implementation', {}).get('attachments', []))
                
                types = data.get('experiences', {}).get('presentation', {}).get('types', [])
                if types:
                    labels = sorted([t.get('label', '') for t in types if t.get('label')])
                    if labels:
                        combo = " + ".join(labels)
                        exp_counter[combo] += 1
                
                functions = data.get('experiences', {}).get('functions', [])
                for f in functions:
                    name = f.get('name', '').strip()
                    if name: function_counter[name] += 1
                
                total_error_strategies += len(data.get('experiences', {}).get('error_minimization', []))
                total_data_plans += len(data.get('experiences', {}).get('data_collection', []))
                
            except Exception:
                pass

    sorted_combos = exp_counter.most_common(10)
    
    detail_data = {
        'tech_labels': [x[0] for x in tech_counter.most_common(10)],
        'tech_data': [x[1] for x in tech_counter.most_common(10)],
        'pic_labels': [x[0] for x in pic_counter.most_common(10)],
        'pic_data': [x[1] for x in pic_counter.most_common(10)],
        'constraint_labels': [x[0] for x in constraint_counter.most_common()],
        'constraint_data': [x[1] for x in constraint_counter.most_common()],
        'mod_status_data': [
            module_status_counter.get('not_started', 0),
            module_status_counter.get('in_progress', 0),
            module_status_counter.get('done', 0),
            module_status_counter.get('blocked', 0)
        ],
        'obj_data': [obj_org, obj_user, obj_model],
        'process_data': [total_smart_processes, total_standard_processes],
        'exp_labels': [item[0] for item in sorted_combos],
        'exp_data': [item[1] for item in sorted_combos],
        'function_labels': [x[0] for x in function_counter.most_common(10)],
        'function_data': [x[1] for x in function_counter.most_common(10)],
        'orch_cat_labels': [x[0].title() for x in orch_category_counter.most_common()],
        'orch_cat_data': [x[1] for x in orch_category_counter.most_common()],
        'biz_proc_labels': [x[0] for x in biz_process_counter.most_common(10)],
        'biz_proc_data': [x[1] for x in biz_process_counter.most_common(10)],
        'timeline_status_data': [
            timeline_status_counter.get('backlog', 0),
            timeline_status_counter.get('todo', 0),
            timeline_status_counter.get('in_progress', 0),
            timeline_status_counter.get('done', 0)
        ],
        
        # Simple Counters for Detailed View
        'total_tech': len(tech_counter),
        'total_pic': len(pic_counter),
        'total_smart_processes': total_smart_processes,
        'total_modules_done': module_status_counter.get('done', 0),
        'total_objectives': obj_org + obj_user + obj_model,
        'total_ai_combos': len(exp_counter),
        'total_functions': len(function_counter),
        'total_constraints': sum(constraint_counter.values()),
        'total_error_strategies': total_error_strategies,
        'total_data_plans': total_data_plans,
        'total_attachments': total_attachments,
        'total_leading_features': total_leading_features,
        'total_biz_processes': sum(biz_process_counter.values()),
        'total_timeline_phases': sum(orch_category_counter.values()),
    }
    context['detail_data'] = json.dumps(detail_data)

    return render(request, 'core/dashboard.html', context)

@login_required
def projects_list(request):
    projects = Project.objects.filter(
        Q(user=_get_user(request)) | Q(pm_project_id__isnull=False)
    ).exclude(pm_project_id='').distinct()
    
    # --- Archive Filter ---
    show_archived = request.GET.get('archived') == '1'
    if show_archived:
        projects = projects.filter(is_archived=True)
    else:
        projects = projects.filter(is_archived=False)
    
    # --- Search & Filter Logic ---
    q = request.GET.get('q', '').strip()
    if q:
        projects = projects.filter(
            Q(name__icontains=q) | 
            Q(description__icontains=q) |
            Q(division__icontains=q)
        )
        
    status_filter = request.GET.get('status')
    if status_filter:
        projects = projects.filter(status__iexact=status_filter)
        
    progress_filter = request.GET.get('progress')
    if progress_filter == '0':
        projects = projects.filter(progress=0)
    elif progress_filter == '1-99':
        projects = projects.filter(progress__gt=0, progress__lt=100)
    elif progress_filter == '100':
        projects = projects.filter(progress=100)
        
    timeframe = request.GET.get('timeframe')
    if timeframe:
        import datetime
        now = timezone.now()
        if timeframe == 'today':
            projects = projects.filter(created_at__date=now.date())
        elif timeframe == 'this_week':
            start_of_week = now - datetime.timedelta(days=now.weekday())
            projects = projects.filter(created_at__gte=start_of_week)
        elif timeframe == 'this_month':
            projects = projects.filter(created_at__year=now.year, created_at__month=now.month)
        elif timeframe == 'this_year':
            projects = projects.filter(created_at__year=now.year)
            
    projects = projects.order_by('-updated_at')
    
    return render(request, 'core/projects_list.html', {'projects': projects, 'show_archived': show_archived})

@login_required
def create_project(request):
    if request.method == 'POST':
        name = request.POST.get('name', 'Proyek Cerdas Baru')
        description = request.POST.get('description', '')
        division = request.POST.get('division', '')
        supervisor = request.POST.get('supervisor', '')
        start_date = request.POST.get('start_date') or None
        end_date = request.POST.get('end_date') or None

        new_project = Project.objects.create(
            user=_get_user(request),
            name=name,
            description=description,
            division=division,
            supervisor=supervisor,
            start_date=start_date,
            end_date=end_date,
            status='New',
            progress=0
        )
        return redirect('core:projects_list')

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login

@csrf_exempt
def api_login(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({
                    'success': True, 
                    'message': 'Login successful', 
                    'username': user.username,
                    'email': user.email
                })
            else:
                return JsonResponse({'success': False, 'message': 'Username atau password salah'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def api_register(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            
            from django.contrib.auth.models import User
            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'message': 'Username sudah digunakan'}, status=400)
                
            user = User.objects.create_user(username=username, email=email, password=password)
            user.save()
            return JsonResponse({'success': True, 'message': 'Registrasi berhasil', 'username': user.username})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

def logout_view(request):
    logout(request)
    return redirect('core:landing')

@login_required
def profile_settings(request):
    user = _get_user(request)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'update_profile':
            username = request.POST.get('username')
            first_name = request.POST.get('first_name')
            last_name = request.POST.get('last_name')
            email = request.POST.get('email')
            
            # Update user info
            if username: user.username = username
            if first_name is not None: user.first_name = first_name
            if last_name is not None: user.last_name = last_name
            if email: user.email = email
            user.save()
            
            # Handle avatar upload
            webcam_image = request.POST.get('webcam_image')
            avatar_file = request.FILES.get('avatar')
            
            if webcam_image:
                # Format: data:image/png;base64,iVBORw0KGgo...
                format, imgstr = webcam_image.split(';base64,') 
                ext = format.split('/')[-1] 
                data = ContentFile(base64.b64decode(imgstr), name=f'{user.username}_avatar.{ext}')
                user.profile.avatar = data
                user.profile.save()
            elif avatar_file:
                user.profile.avatar = avatar_file
                user.profile.save()
                
            messages.success(request, 'Profil berhasil diperbarui.')
            return redirect('core:profile')
            
        elif action == 'change_password':
            old_password = request.POST.get('old_password')
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            
            if not user.check_password(old_password):
                messages.error(request, 'Password saat ini salah.')
            elif new_password != confirm_password:
                messages.error(request, 'Konfirmasi password baru tidak cocok.')
            elif len(new_password) < 8:
                messages.error(request, 'Password baru harus minimal 8 karakter.')
            else:
                user.set_password(new_password)
                user.save()
                update_session_auth_hash(request, user)  # Keep user logged in
                messages.success(request, 'Password berhasil diubah.')
            
            return redirect('core:profile')
            
    return render(request, 'core/profile.html')

@login_required
def project_detail(request, project_id):
    project = _get_project_or_404(project_id, request)
    return render(request, 'core/project_detail.html', {'project': project, 'is_project_detail': True})

@login_required
@csrf_exempt
def save_project(request, project_id):
    if request.method == 'POST':
        project = _get_project_or_404(project_id, request)
        try:
            data = json.loads(request.body)
            
            project.html_draft = data.get('html', '')
            project.active_tab = data.get('active_tab', data.get('activeTab', 'objectives'))
            
            try:
                from .utils import parse_html_draft
                project.json_draft = parse_html_draft(project.html_draft)
            except Exception as e:
                print("Failed to parse json_draft:", e)
            
            # Extract name and description if available
            name = data.get('name')
            description = data.get('description')
            if name:
                project.name = name
            if description:
                project.description = description
                
            project.progress = int(data.get('progress', 0))
            
            if project.progress == 100:
                project.status = 'Completed'
            elif project.progress > 0:
                project.status = 'Active'
            else:
                project.status = 'New'
                
            project.save()

            # Kirim data ke IC (selalu kirim pada setiap save)
            import requests
            try:
                blueprint_data = json.loads(project.json_draft) if project.json_draft else {}
                
                # Coba ambil model dari property
                model_str = "-"
                if 'objectives' in blueprint_data and 'model_properties' in blueprint_data['objectives']:
                    props = blueprint_data['objectives']['model_properties']
                    if props and len(props) > 0:
                        model_str = props[0].get('property', '-')
                        
                # Ambil SEMUA fungsi realisasi (fitur)
                features = []
                if 'experiences' in blueprint_data and 'functions' in blueprint_data['experiences']:
                    funcs = blueprint_data['experiences']['functions']
                    for func in funcs:
                        features.append({
                            'name': func.get('name', 'Sistem Cerdas Default'),
                            'description': func.get('description', '')
                        })
                
                if not features:
                    features.append({
                        'name': 'Sistem Cerdas Default',
                        'description': ''
                    })
                        
                payload = {
                    'project_id': str(project.id),
                    'project_name': project.name,
                    'pm_project_id': project.pm_project_id,
                    'blueprint_link': f"/tif2/engineering/projects/{project.id}/blueprint/",
                    'model': model_str,
                    'features': features
                }
                
                # POST ke IC
                ic_url = 'http://nginx/tif2/creation/api/receive-ie-project/'
                requests.post(ic_url, json=payload, timeout=5)
            except Exception as req_e:
                print("Gagal mengirim data ke IC:", req_e)

            # NOTE: IE no longer sends data to Implementation directly.
            # Implementation receives data from IC instead.

            # Kirim data ke PM Laporan Tugas
            if project.progress == 100:
                try:
                    pm_payload = {
                        "project_id": getattr(project, 'pm_project_id', ''),
                        "project_name": project.name,
                        "category": "engineering",
                        "source_label": "Intelligence Engineering",
                        "activity_name": "Spesifikasi/Blueprint telah selesai",
                        "activity_detail": f"Proyek '{project.name}' telah menyelesaikan seluruh perancangan (100%)",
                        "links": [{"title": "Buka Blueprint", "url": f"/tif2/engineering/projects/{project.id}/blueprint/"}]
                    }
                    pm_url = 'http://nginx/tif2/pm/api/integration/sync/'
                    requests.post(pm_url, json=pm_payload, timeout=5)
                except Exception as pm_e:
                    print("Gagal mengirim data ke PM:", pm_e)
            elif project.progress > 0:
                # Sync partial progress to PM as well
                try:
                    active_tab = data.get('active_tab', data.get('activeTab', 'objectives'))
                    tab_labels = {
                        'objectives': 'Meaningful Objectives',
                        'experiences': 'Intelligence Experiences',
                        'implementation': 'Intelligence Implementation',
                        'creation': 'Creation Status',
                        'orchestration': 'Intelligence Orchestration',
                    }
                    tab_label = tab_labels.get(active_tab, active_tab)
                    pm_payload = {
                        "project_id": getattr(project, 'pm_project_id', ''),
                        "project_name": project.name,
                        "category": "engineering",
                        "source_label": "Intelligence Engineering",
                        "activity_name": f"Memperbarui {tab_label}",
                        "activity_detail": f"Progress: {project.progress}%",
                        "links": []
                    }
                    pm_url = 'http://nginx/tif2/pm/api/integration/sync/'
                    requests.post(pm_url, json=pm_payload, timeout=5)
                except Exception as pm_e:
                    print("Gagal mengirim progress ke PM:", pm_e)

            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'invalid method'}, status=405)

@login_required
@csrf_exempt
def upload_file(request, project_id):
    if request.method == 'POST':
        project = _get_project_or_404(project_id, request)
        if 'file' not in request.FILES:
            return JsonResponse({'status': 'error', 'message': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        from .models import ProjectFile
        project_file = ProjectFile.objects.create(
            project=project,
            file=uploaded_file,
            original_name=uploaded_file.name
        )
        return JsonResponse({'status': 'success', 'file_url': project_file.file.url})
    
    return JsonResponse({'status': 'invalid method'}, status=405)

# @login_required  # TEMP DISABLED FOR FIGMA
def blueprints_list(request):
    projects = Project.objects.filter(user=_get_user(request), status='Completed').order_by('-updated_at')
    
    query = request.GET.get('q')
    if query:
        projects = projects.filter(
            models.Q(name__icontains=query) | 
            models.Q(description__icontains=query)
        )
        
    return render(request, 'core/blueprints_list.html', {
        'projects': projects,
        'query': query
    })

def project_blueprint(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    return render(request, 'core/blueprint.html', {'project': project})

@login_required
def reports_view(request):
    import datetime
    now = timezone.now()
    month = int(request.GET.get('month', now.month))
    year = int(request.GET.get('year', now.year))
    
    projects = Project.objects.filter(user=_get_user(request))
    
    # Calculate stats based on created_at or updated_at
    active_projects = projects.filter(status='Active')
    completed_this_month = projects.filter(status='Completed', updated_at__year=year, updated_at__month=month)
    new_this_month = projects.filter(status='New', created_at__year=year, created_at__month=month)
    
    context = {
        'month': month,
        'year': year,
        'active_projects': active_projects,
        'completed_this_month': completed_this_month,
        'new_this_month': new_this_month,
        'total_active': active_projects.count(),
        'total_completed': completed_this_month.count(),
        'total_new': new_this_month.count(),
        'months': range(1, 13),
        'years': range(now.year - 5, now.year + 1),
    }
    return render(request, 'core/reports.html', context)

def download_report_pdf(request):
    import datetime
    from django.http import HttpResponse
    from django.template.loader import get_template
    try:
        from xhtml2pdf import pisa
    except ImportError:
        return HttpResponse("xhtml2pdf is not installed. Please run 'pip install xhtml2pdf'.", status=500)
        
    now = timezone.now()
    month = int(request.GET.get('month', now.month))
    year = int(request.GET.get('year', now.year))
    
    projects = Project.objects.filter(user=_get_user(request))
    active_projects = projects.filter(status='Active')
    completed_this_month = projects.filter(status='Completed', updated_at__year=year, updated_at__month=month)
    new_this_month = projects.filter(status='New', created_at__year=year, created_at__month=month)
    
    month_name = datetime.date(1900, month, 1).strftime('%B')
    
    context = {
        'month': month,
        'year': year,
        'month_name': month_name,
        'active_projects': active_projects,
        'completed_this_month': completed_this_month,
        'new_this_month': new_this_month,
        'total_active': active_projects.count(),
        'total_completed': completed_this_month.count(),
        'total_new': new_this_month.count(),
        'user': _get_user(request),
    }
    
    template = get_template('core/report_pdf_template.html')
    html = template.render(context)
    
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Laporan_Bulanan_{month_name}_{year}.pdf"'
    
    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
        return HttpResponse('We had some errors <pre>' + html + '</pre>')
    return response

# ====================
# API Endpoints
# ====================

def get_project_json(project):
    if not project.json_draft:
        return {}
    try:
        return json.loads(project.json_draft)
    except Exception:
        return {}

@login_required
def api_project_all(request, project_id):
    project = _get_project_or_404(project_id, request)
    return JsonResponse({'success': True, 'data': get_project_json(project)})

@login_required
def api_project_objectives(request, project_id):
    project = _get_project_or_404(project_id, request)
    data = get_project_json(project)
    return JsonResponse({'success': True, 'data': data.get('objectives', {})})

@login_required
def api_project_experiences(request, project_id):
    project = _get_project_or_404(project_id, request)
    data = get_project_json(project)
    return JsonResponse({'success': True, 'data': data.get('experiences', {})})

@login_required
def api_project_implementation(request, project_id):
    project = _get_project_or_404(project_id, request)
    data = get_project_json(project)
    return JsonResponse({'success': True, 'data': data.get('implementation', {})})

@login_required
def api_project_creation(request, project_id):
    project = _get_project_or_404(project_id, request)
    data = get_project_json(project)
    return JsonResponse({'success': True, 'data': data.get('creation', {})})

@login_required
def api_project_orchestration(request, project_id):
    project = _get_project_or_404(project_id, request)
    data = get_project_json(project)
    return JsonResponse({'success': True, 'data': data.get('orchestration', {})})

@csrf_exempt
def api_project_update_status(request, project_id):
    if request.method == 'PUT':
        project = get_object_or_404(Project, id=project_id)
        try:
            payload = json.loads(request.body)
            module_name = payload.get('module')
            new_status = payload.get('status')
            
            if not module_name or not new_status:
                return JsonResponse({'success': False, 'message': 'Missing module or status'}, status=400)
                
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(project.html_draft, 'html.parser')
            updated = False
            
            for tr in soup.select('#status-table tbody tr'):
                tds = tr.find_all('td')
                if len(tds) >= 4:
                    name = tds[1].text.strip()
                    if name == module_name:
                        # Find the option to select
                        status_sel = tds[2].find('select')
                        if status_sel:
                            for opt in status_sel.find_all('option'):
                                if opt.get('value') == new_status:
                                    opt['selected'] = 'selected'
                                else:
                                    if opt.has_attr('selected'):
                                        del opt['selected']
                            updated = True
            
            if updated:
                project.html_draft = str(soup)
                from .utils import parse_html_draft
                project.json_draft = parse_html_draft(project.html_draft)
                project.save()
                return JsonResponse({'success': True, 'message': 'Status updated'})
            else:
                return JsonResponse({'success': False, 'message': 'Module not found in HTML'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'message': 'Invalid method'}, status=405)

@csrf_exempt
def api_project_orchestration_status(request, project_id):
    if request.method == 'PUT':
        project = get_object_or_404(Project, id=project_id)
        try:
            payload = json.loads(request.body)
            phase_name = payload.get('phase')
            new_status = payload.get('status')
            
            if not phase_name or not new_status:
                return JsonResponse({'success': False, 'message': 'Missing phase or status'}, status=400)
                
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(project.html_draft, 'html.parser')
            updated = False
            
            for tr in soup.select('#gantt-table tbody tr'):
                tds = tr.find_all('td')
                if len(tds) >= 7:
                    name_inp = tds[2].find('input')
                    if name_inp and name_inp.get('value') == phase_name:
                        status_sel = tds[6].find('select')
                        if status_sel:
                            for opt in status_sel.find_all('option'):
                                if opt.get('value') == new_status:
                                    opt['selected'] = 'selected'
                                else:
                                    if opt.has_attr('selected'):
                                        del opt['selected']
                            updated = True
                            break
                            
            if updated:
                project.html_draft = str(soup)
                from .utils import parse_html_draft
                project.json_draft = parse_html_draft(project.html_draft)
                project.save()
                return JsonResponse({'success': True, 'message': 'Status updated'})
            else:
                return JsonResponse({'success': False, 'message': 'Phase not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'message': 'Invalid method'}, status=405)

@csrf_exempt
def api_orchestration_add_phase(request, project_id):
    """
    Webhook: Implementation sends a new phase/log here.
    Adds a new row to the gantt-table in html_draft, then re-parses json_draft.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid method'}, status=405)
    
    try:
        payload = json.loads(request.body)
        phase_name = payload.get('phase', '')
        category = payload.get('category', 'deployment')
        start_date = payload.get('start_date', '')
        end_date = payload.get('end_date', '')
        pic = payload.get('pic', '')
        status = payload.get('status', 'in_progress')
        
        if not phase_name:
            return JsonResponse({'success': False, 'message': 'phase is required'}, status=400)
        
        project = get_object_or_404(Project, id=project_id)
        
        if not project.html_draft:
            return JsonResponse({'success': False, 'message': 'Project has no HTML draft'}, status=400)
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(project.html_draft, 'html.parser')
        
        # Check if phase with same name already exists
        gantt_tbody = soup.select_one('#gantt-table tbody')
        if not gantt_tbody:
            return JsonResponse({'success': False, 'message': 'gantt-table not found in draft'}, status=400)
        
        for tr in gantt_tbody.find_all('tr'):
            tds = tr.find_all('td')
            if len(tds) >= 7:
                name_inp = tds[2].find('input')
                if name_inp and name_inp.get('value', '') == phase_name:
                    return JsonResponse({'success': True, 'message': 'Phase already exists', 'duplicate': True})
        
        # Count existing rows for row number
        existing_rows = gantt_tbody.find_all('tr')
        row_num = len(existing_rows) + 1
        
        # Valid categories for the select
        category_options = {
            'planning': 'Planning',
            'development': 'Development',
            'testing': 'Testing',
            'deployment': 'Deployment',
            'maintenance': 'Pemeliharaan',
            'operation': 'Operasi',
        }
        
        # Valid statuses for the select
        status_options = {
            'backlog': 'Backlog',
            'todo': 'To Do',
            'in_progress': 'In Progress',
            'done': 'Done',
        }
        
        # Build category select HTML
        cat_options_html = ''
        for val, label in category_options.items():
            selected = ' selected="selected"' if val == category else ''
            cat_options_html += f'<option value="{val}"{selected}>{label}</option>'
        
        # Build status select HTML
        stat_options_html = ''
        for val, label in status_options.items():
            selected = ' selected="selected"' if val == status else ''
            stat_options_html += f'<option value="{val}"{selected}>{label}</option>'
        
        # Create new row HTML
        new_row_html = f'''<tr class="phase-row" data-category="{category}">
<td class="row-number">{row_num}</td>
<td><select class="form-select form-select-sm">{cat_options_html}</select></td>
<td><input type="text" class="form-input" placeholder="Nama fase" value="{phase_name}"/></td>
<td><input type="date" class="form-input form-input-date" value="{start_date}"/></td>
<td><input type="date" class="form-input form-input-date" value="{end_date}"/></td>
<td><input type="text" class="form-input" placeholder="PIC" value="{pic}"/></td>
<td><select class="form-select status-select">{stat_options_html}</select></td>
<td><button class="btn-icon btn-delete">x</button></td>
</tr>'''
        
        new_row = BeautifulSoup(new_row_html, 'html.parser')
        gantt_tbody.append(new_row)
        
        # Save updated HTML and re-parse JSON
        project.html_draft = str(soup)
        from .utils import parse_html_draft
        project.json_draft = parse_html_draft(project.html_draft)
        project.save()
        
        return JsonResponse({'success': True, 'message': 'Phase added', 'row_number': row_num})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

@login_required
def api_notifications(request):
    notifications = _get_user(request).notifications.filter(is_read=False).order_by('-created_at')[:10]
    data = []
    for n in notifications:
        data.append({
            'id': n.id,
            'message': n.message,
            'link': n.link,
            'is_read': n.is_read,
            'created_at': n.created_at.strftime('%Y-%m-%d %H:%M')
        })
    return JsonResponse({'unread_count': _get_user(request).notifications.filter(is_read=False).count(), 'notifications': data})

@login_required
@csrf_exempt
def api_notifications_mark_read(request):
    if request.method == 'POST':
        _get_user(request).notifications.filter(is_read=False).update(is_read=True)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'invalid method'}, status=405)


@csrf_exempt
def receive_pm_project(request):
    """Receive project creation broadcast from PM. Creates a container with full data."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            pm_project_id = data.get('pm_project_id', '')
            nama_proyek = data.get('nama_proyek', 'Proyek Baru')

            if not pm_project_id:
                return JsonResponse({'error': 'pm_project_id required'}, status=400)

            # Check if project with this pm_project_id already exists
            existing = Project.objects.filter(pm_project_id=pm_project_id).first()
            if existing:
                # Update existing with new data
                existing.name = nama_proyek or existing.name
                existing.description = data.get('deskripsi', '') or existing.description
                existing.division = data.get('pelaksana', '') or existing.division
                existing.supervisor = data.get('pengawas', '') or existing.supervisor
                existing.start_date = data.get('tanggal_mulai') or existing.start_date
                existing.end_date = data.get('tanggal_selesai') or existing.end_date
                existing.save()
                return JsonResponse({'status': 'already_exists', 'project_id': existing.id})

            # Get default user (first superuser or first user)
            from django.contrib.auth.models import User
            default_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            if not default_user:
                return JsonResponse({'error': 'No user found in system'}, status=500)

            project = Project.objects.create(
                user=default_user,
                name=nama_proyek,
                description=data.get('deskripsi', ''),
                division=data.get('pelaksana', ''),
                supervisor=data.get('pengawas', ''),
                start_date=data.get('tanggal_mulai') or None,
                end_date=data.get('tanggal_selesai') or None,
                pm_project_id=pm_project_id,
                status='New',
                progress=0
            )
            return JsonResponse({'status': 'success', 'project_id': project.id})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'invalid method'}, status=405)


# ====================
# Project Management: Delete, Update, Archive
# ====================

@csrf_exempt
def delete_project(request, project_id):
    """Delete a project. Only self-created projects (no pm_project_id) can be deleted."""
    if request.method == 'POST':
        project = _get_project_or_404(project_id, request)
        if project.pm_project_id:
            return JsonResponse({'status': 'error', 'message': 'Proyek dari PM tidak bisa dihapus'}, status=403)
        project.delete()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'invalid method'}, status=405)

@csrf_exempt
def update_project(request, project_id):
    """Update a self-created project's metadata. PM projects cannot be edited."""
    if request.method == 'POST':
        project = _get_project_or_404(project_id, request)
        if project.pm_project_id:
            return JsonResponse({'status': 'error', 'message': 'Proyek dari PM tidak bisa diedit'}, status=403)
        try:
            data = json.loads(request.body)
            if data.get('name'):
                project.name = data['name']
            if 'description' in data:
                project.description = data['description']
            if 'division' in data:
                project.division = data['division']
            if 'supervisor' in data:
                project.supervisor = data['supervisor']
            if data.get('start_date'):
                project.start_date = data['start_date']
            if data.get('end_date'):
                project.end_date = data['end_date']
            project.save()
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'invalid method'}, status=405)

@csrf_exempt
def archive_project(request, project_id):
    """Archive/unarchive a project."""
    if request.method == 'POST':
        project = _get_project_or_404(project_id, request)
        project.is_archived = not project.is_archived
        project.save()
        return JsonResponse({'status': 'success', 'is_archived': project.is_archived})
    return JsonResponse({'status': 'invalid method'}, status=405)


@csrf_exempt
def mobile_save_project(request):
    """Receive and save project from Mobile IE app."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            pm_project_id = data.get('pm_project_id', '')
            nama_proyek = data.get('nama_proyek', 'Proyek Baru dari Mobile')
            json_draft = data.get('json_draft', {})
            
            if not pm_project_id:
                return JsonResponse({'error': 'pm_project_id required'}, status=400)
            
            from django.contrib.auth.models import User
            from .models import Project
            default_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            
            project = Project.objects.filter(pm_project_id=pm_project_id).first()
            print(f"[MOBILE_SAVE] pm_project_id='{pm_project_id}', found_existing={project is not None}, name='{nama_proyek}'")
            if not project:
                # Try finding by Django numeric ID (mobile may use server ID as pm_project_id)
                try:
                    int_id = int(pm_project_id)
                    project = Project.objects.filter(id=int_id).first()
                    if project:
                        project.pm_project_id = pm_project_id
                        print(f"[MOBILE_SAVE] Found by Django ID={int_id}")
                except (ValueError, TypeError):
                    pass
            
            if not project:
                # Also try finding by name as fallback
                project = Project.objects.filter(name=nama_proyek, user=default_user).first()
                if project and not project.pm_project_id:
                    project.pm_project_id = pm_project_id
                    print(f"[MOBILE_SAVE] Found by name, updating pm_project_id to '{pm_project_id}'")
                elif not project:
                    project = Project.objects.create(
                        user=default_user,
                        name=nama_proyek,
                        pm_project_id=pm_project_id,
                        status='New',
                        progress=0
                    )
                    print(f"[MOBILE_SAVE] CREATED new project id={project.id}")
            
            project.name = nama_proyek or project.name
            project.description = data.get('deskripsi', '') or project.description
            project.division = data.get('pelaksana', '') or project.division
            project.supervisor = data.get('pengawas', '') or project.supervisor
            project.start_date = data.get('tanggal_mulai') or project.start_date
            project.end_date = data.get('tanggal_selesai') or project.end_date
            
            if json_draft:
                project.json_draft = json.dumps(json_draft)
                
                # Generate html_draft from json_draft so web UI can render it
                try:
                    from .json_to_html import generate_html_from_json
                    project.html_draft = generate_html_from_json(json_draft)
                except Exception as html_e:
                    print("Failed to generate html_draft:", html_e)
            
            # Simple progress calc
            progress = 0
            if json_draft:
                step1 = json_draft.get('step_1', json_draft.get('objectives', {}))
                step2 = json_draft.get('step_2', json_draft.get('experiences', {}))
                step3 = json_draft.get('step_3', json_draft.get('implementation', {}))
                step4 = json_draft.get('step_4', json_draft.get('creation', {}))
                step5 = json_draft.get('step_5', json_draft.get('orchestration', {}))
                score = 0
                if step1.get('organizational'): score += 20
                if step2.get('presentation') or step2.get('presentations'): score += 20
                if step3.get('business_processes'): score += 20
                if step4.get('module_statuses') or step4.get('constraints'): score += 20
                if step5.get('timeline') or step5.get('timelines'): score += 20
                progress = score
                
            project.progress = progress
            if progress == 100:
                project.status = 'Completed'
            elif progress > 0:
                project.status = 'Active'
                
            project.save()
            
            import requests
            try:
                blueprint_data = json_draft if isinstance(json_draft, dict) else {}
                model_str = "-"
                if 'objectives' in blueprint_data and 'model_properties' in blueprint_data['objectives']:
                    props = blueprint_data['objectives']['model_properties']
                    if props and len(props) > 0:
                        model_str = props[0].get('property', '-')
                        
                features = []
                if 'experiences' in blueprint_data and 'functions' in blueprint_data['experiences']:
                    funcs = blueprint_data['experiences']['functions']
                    for func in funcs:
                        features.append({
                            'name': func.get('name', 'Sistem Cerdas Default'),
                            'description': func.get('description', '')
                        })
                
                if not features:
                    features.append({'name': 'Sistem Cerdas Default', 'description': ''})
                        
                payload = {
                    'project_id': str(project.id),
                    'project_name': project.name,
                    'pm_project_id': project.pm_project_id,
                    'blueprint_link': f"/tif2/engineering/projects/{project.id}/blueprint/",
                    'model': model_str,
                    'features': features
                }
                ic_url = 'http://nginx/tif2/creation/api/receive-ie-project/'
                requests.post(ic_url, json=payload, timeout=5)
            except Exception as req_e:
                print("Gagal mengirim data ke IC:", req_e)
                
            if project.progress == 100:
                try:
                    pm_payload = {
                        "project_id": getattr(project, 'pm_project_id', ''),
                        "project_name": project.name,
                        "category": "engineering",
                        "source_label": "Intelligence Engineering",
                        "activity_name": "Spesifikasi/Blueprint telah selesai",
                        "activity_detail": f"Proyek '{project.name}' telah menyelesaikan seluruh perancangan (100%)",
                        "links": [{"title": "Buka Blueprint", "url": f"/tif2/engineering/projects/{project.id}/blueprint/"}]
                    }
                    pm_url = 'http://nginx/tif2/pm/api/integration/sync/'
                    requests.post(pm_url, json=pm_payload, timeout=5)
                except Exception as pm_e:
                    print("Gagal mengirim data ke PM:", pm_e)
            
            return JsonResponse({'status': 'success', 'project_id': project.id})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'invalid method'}, status=405)


@csrf_exempt
def api_projects_list(request):
    """JSON API: Return list of all projects for mobile app."""
    if request.method != 'GET':
        return JsonResponse({'error': 'GET only'}, status=405)
    
    user = _get_user(request)
    projects = Project.objects.filter(user=user, is_archived=False).order_by('-updated_at')
    
    result = []
    for p in projects:
        result.append({
            'id': p.id,
            'name': p.name,
            'description': p.description or '',
            'status': p.status or 'New',
            'progress': p.progress or 0,
            'pm_project_id': p.pm_project_id or '',
            'division': p.division or '',
            'supervisor': p.supervisor or '',
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'end_date': p.end_date.isoformat() if p.end_date else None,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'updated_at': p.updated_at.isoformat() if p.updated_at else None,
            'json_draft': p.json_draft or '',
        })
    
    return JsonResponse(result, safe=False)