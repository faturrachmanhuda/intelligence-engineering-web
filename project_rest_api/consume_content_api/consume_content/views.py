import requests
from django.shortcuts import render

def show_all_content(request):
    url = 'http://pm_web:8000/api/content/'
    headers = {
        'Authorization': 'Token 11f525ecc92068c6b182b558601b15491d04da31'
    }
    response = requests.get(url, headers=headers)
    data = response.json()
    context = {
        'content': data
    }
    
    return render(request, 'base.html', context)
