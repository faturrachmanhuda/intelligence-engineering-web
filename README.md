<p align="center">
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/REST_API-FF6F00?style=for-the-badge&logo=fastapi&logoColor=white" />
</p>

# Intelligence Engineering - Web

> **Subsistem Perencanaan & Perancangan Proyek AI**
>
> Bagian dari ekosistem **Intelligence System** - Platform Terintegrasi untuk Siklus Hidup Pengembangan Kecerdasan Buatan.

## Tentang Proyek

**Intelligence Engineerings** adalah platform terintegrasi yang dirancang untuk mendukung seluruh siklus hidup (*lifecycle*) pengembangan proyek berbasis kecerdasan buatan (AI). Platform ini dikembangkan sebagai bagian dari mata kuliah **Sistem Cerdas Blok** di **Universitas Trisakti**, dengan tujuan memberikan pengalaman langsung kepada mahasiswa dalam membangun sistem perangkat lunak berskala besar yang saling terintegrasi.

Platform ini terdiri dari **5 subsistem** yang masing-masing menangani fase berbeda dalam *lifecycle* pengembangan AI:

| No | Subsistem | Deskripsi |
|----|-----------|-----------|
| 1 | **Intelligence Engineering** | Perencanaan & perancangan blueprint proyek AI |
| 2 | **Project Management** | Manajemen proyek, tugas, dan timeline |
| 3 | **Intelligence Creation** | Pembuatan & pelatihan model machine learning |
| 4 | **Dataset Management** | Pengelolaan dataset dan distribusi data |
| 5 | **Implementation** | Deployment, monitoring, dan pemeliharaan model AI |

Aplikasi web ini merupakan sistem utama untuk subsistem **Intelligence Engineering**, yang memungkinkan pengguna merancang blueprint proyek AI secara lengkap melalui antarmuka berbasis browser.

## Fitur Utama

- **Dashboard Proyek** - Ringkasan visual seluruh proyek AI beserta statistik progress dan status terkini
- **Project Creation Wizard** - Pembuatan proyek AI baru dengan form multi-langkah yang terstruktur
- **Blueprint Editor** - Editor blueprint interaktif dengan 5 tab perencanaan: Objectives, Experiences, Implementation, Creation, dan Orchestration
- **PDF Blueprint Export** - Generate dan unduh blueprint proyek dalam format PDF
- **Monthly Reports** - Laporan bulanan yang dapat diunduh sebagai PDF dengan ringkasan aktivitas proyek
- **Project Archive** - Arsip proyek yang sudah selesai untuk referensi di masa depan
- **File Attachment** - Upload dokumen pendukung langsung ke halaman detail proyek
- **Notification System** - Notifikasi real-time untuk update status proyek lintas subsistem
- **Profile Management** - Pengaturan profil pengguna dengan upload avatar
- **Cross-System Integration** - Sinkronisasi otomatis dengan Project Management dan Intelligence Creation melalui REST API

## Tech Stack

| Teknologi | Versi | Keterangan |
|-----------|-------|------------|
| Python | 3.12 | Bahasa pemrograman utama |
| Django | 5.2 | Web framework |
| Django REST Framework | 3.17 | API layer |
| JavaScript | ES6+ | Frontend interactivity |
| TailwindCSS | CDN | Styling framework |
| SQLite | 3 | Database |
| Docker | Latest | Containerization |
| Nginx | Alpine | Reverse proxy |
| Gunicorn | 21.2 | WSGI HTTP server |

## Getting Started

### Prerequisites

- [Python](https://www.python.org/downloads/) (>= 3.12)
- [Docker](https://docs.docker.com/get-docker/) (untuk deployment via container)
- Git

### Installation (Local Development)

```bash
# Clone repository
git clone https://github.com/faturrachmanhuda/intelligence-engineering-web.git

# Masuk ke direktori proyek
cd intelligence-engineering-web

# Buat virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Jalankan migrasi database
python manage.py migrate

# Jalankan development server
python manage.py runserver
```

### Deployment (Docker)

```bash
# Dari root project (folder yang berisi docker-compose.yml)
docker compose up -d --build ie_web

# Akses di browser
# http://localhost/tif2/engineering/
```

### Konfigurasi

Pengaturan utama terdapat di `ie_project/settings.py`. Untuk deployment, pastikan variabel environment berikut sudah dikonfigurasi:

```
DEBUG=0
DJANGO_SETTINGS_MODULE=ie_project.settings
FORCE_SCRIPT_NAME=/tif2/engineering
```

## Struktur Proyek

```
ie_project/
|-- manage.py
|-- requirements.txt
|-- Dockerfile
|-- entrypoint.sh
|-- ie_project/              # Konfigurasi Django
|   |-- settings.py
|   |-- urls.py
|   +-- wsgi.py
|-- core/                    # Aplikasi utama
|   |-- models.py            # Project, ProjectFile, Notification
|   |-- views.py             # View functions & API endpoints
|   |-- urls.py              # URL routing
|   |-- utils.py             # Helper functions
|   |-- forms.py             # Django forms
|   |-- serializers.py       # DRF serializers
|   |-- json_to_html.py      # Blueprint HTML generator
|   |-- templates/core/      # HTML templates
|   |   |-- landing.html     # Landing page
|   |   |-- dashboard.html   # Dashboard utama
|   |   |-- projects_list.html
|   |   |-- project_detail.html  # Editor blueprint 5-tab
|   |   |-- blueprint.html   # View blueprint read-only
|   |   |-- blueprints_list.html
|   |   |-- reports.html     # Monthly reports
|   |   +-- profile.html
|   +-- static/core/         # Static assets
|       |-- css/
|       +-- js/
+-- project_rest_api/        # REST API module
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login/` | Autentikasi pengguna |
| GET | `/api/projects/list/` | Daftar semua proyek |
| GET/PUT | `/api/projects/<id>/` | Detail proyek lengkap |
| GET | `/api/projects/<id>/objectives/` | Data tab Objectives |
| GET | `/api/projects/<id>/experiences/` | Data tab Experiences |
| GET | `/api/projects/<id>/implementation/` | Data tab Implementation |
| GET | `/api/projects/<id>/creation/` | Data tab Creation |
| GET | `/api/projects/<id>/orchestration/` | Data tab Orchestration |
| GET | `/api/notifications/` | Daftar notifikasi |
| POST | `/api/receive-pm-project/` | Terima proyek dari Project Management |

## Integrasi Antar-Subsistem

Intelligence Engineering terintegrasi dengan subsistem lain melalui mekanisme berikut:

| Arah | Subsistem | Mekanisme |
|------|-----------|-----------|
| IE -> PM | Project Management | Kirim data proyek saat pembuatan blueprint baru |
| IE -> IC | Intelligence Creation | Kirim konfigurasi sistem cerdas dari tab Creation |
| IE -> IMPL | Implementation | Kirim timeline orchestration dan blueprint link |
| PM -> IE | Project Management | Terima project assignment melalui webhook |

## Dokumentasi

| Dokumen | Link |
|---------|------|
| User Guide | [Download PDF](https://drive.google.com/file/d/1WTeHLY9JuE3rY4PTO3hp7VTAXNJax0UE/view?usp=sharing) |
| UML Diagrams (APPL) | [Download PDF](https://drive.google.com/file/d/1feMkxV2QAGJ4yXbWxB_K1bZZDuGjGf61/view?usp=sharing) |
| Figma Design | [Open in Figma](https://www.figma.com/design/hf44nu47pby70p3se21fSj/Untitled?node-id=0-1&t=1Udfm1RHOPRNGRU6-1) |
| Live Demo | [Open Web App](http://38.47.94.194/tif2/engineering/) |

## Subsistem Terkait

| Subsistem | Web | Mobile |
|-----------|-----|--------|
| Intelligence Engineering | *You are here* | [GitHub](https://github.com/faturrachmanhuda/intelligence-engineering-mobile) |
| Project Management | [GitHub](https://github.com/faturrachmanhuda/project-management-web) | [GitHub](https://github.com/faturrachmanhuda/project-management-mobile) |
| Intelligence Creation | [GitHub](https://github.com/faturrachmanhuda/intelligence-creation-web) | [GitHub](https://github.com/faturrachmanhuda/intelligence-creation-mobile) |
| Dataset Management | [GitHub](https://github.com/faturrachmanhuda/dataset-management-web) | [GitHub](https://github.com/faturrachmanhuda/dataset-management-mobile) |
| Implementation | [GitHub](https://github.com/faturrachmanhuda/implementation-web) | [GitHub](https://github.com/faturrachmanhuda/implementation-mobile) |

## Tim Pengembang

Dikembangkan oleh mahasiswa **Universitas Trisakti**, Fakultas Teknologi Industri, Program Studi Teknik Informatika.

## Lisensi

Proyek ini dikembangkan untuk keperluan akademis dalam rangka mata kuliah **Sistem Cerdas Blok**.

<p align="center">
  <b>Intelligence Engineerings</b> - Integrated AI Development Lifecycle Platform<br/>
  <sub>Universitas Trisakti | 2024/2025</sub>
</p>
