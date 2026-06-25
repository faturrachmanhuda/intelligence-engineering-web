"""
Generate html_draft from json_draft (mobile format) so the web UI can render it.

The web UI's loadDraft() does: $('.tabs-content').html(SERVER_HTML_DRAFT)
So we need to produce the exact HTML structure that lives inside .tabs-content.

Mobile json_draft uses keys: step_1..step_5
Web json_draft uses keys: objectives, experiences, implementation, creation, orchestration
"""
import json
from html import escape


def _e(val):
    """Escape HTML and handle None."""
    if val is None:
        return ''
    return escape(str(val))


def generate_html_from_json(json_draft_str):
    """Convert json_draft (string or dict) into the html_draft that the web UI expects."""
    if isinstance(json_draft_str, str):
        try:
            data = json.loads(json_draft_str)
        except (json.JSONDecodeError, TypeError):
            return ''
    elif isinstance(json_draft_str, dict):
        data = json_draft_str
    else:
        return ''

    if not data:
        return ''

    # Normalize keys: mobile uses step_1..step_5, web uses section names
    obj = data.get('step_1') or data.get('objectives') or {}
    exp = data.get('step_2') or data.get('experiences') or {}
    imp = data.get('step_3') or data.get('implementation') or {}
    cre = data.get('step_4') or data.get('creation') or {}
    orc = data.get('step_5') or data.get('orchestration') or {}

    html_parts = ['<input type="hidden" id="ic-submitted" value="false">']

    # ── TAB 1: Meaningful Objectives ──
    html_parts.append('<div class="tab-panel active" id="tab-objectives">')

    # Organizational Objectives
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Organizational Objectives</h3></div>
<p class="form-hint" style="margin-top:-6px;">Apa nilai bisnis utama yang ingin dicapai perusahaan melalui sistem cerdas ini?</p>
<div class="obj-tabs"><div class="obj-tabs-nav">''')

    orgs = obj.get('organizational', [])
    if not orgs:
        orgs = [{}]
    for i, _ in enumerate(orgs):
        active = ' active' if i == 0 else ''
        html_parts.append(f'<button class="obj-tab-btn{active}" data-obj="{i+1}">Objective {i+1}</button>')
    html_parts.append('<button class="obj-tab-add" id="add-objective">+</button></div>')
    html_parts.append('<div class="obj-tabs-content">')
    for i, o in enumerate(orgs):
        active = ' active' if i == 0 else ''
        goal = _e(o.get('objective', o.get('goal', '')))
        strategy = _e(o.get('strategy', ''))
        metrics = _e(o.get('metrics', ''))
        html_parts.append(f'''<div class="obj-tab-panel{active}" id="obj-panel-{i+1}">
<label class="form-label">Tujuan Utama <span class="required">*</span></label>
<textarea class="form-textarea" placeholder="Apa tujuan utama organisasi yang ingin dicapai?">{goal}</textarea>
<div class="form-row-2col">
<div class="form-col"><label class="form-label">Bagaimana cara mencapainya? <span class="required">*</span></label>
<textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana strategi untuk mencapainya?">{strategy}</textarea></div>
<div class="form-col"><label class="form-label">Bagaimana cara mengukurnya? <span class="required">*</span></label>
<textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana metrik keberhasilannya?">{metrics}</textarea></div>
</div></div>''')
    html_parts.append('</div></div></div>')

    # Leading Indicators
    leads = obj.get('leading_indicators', [])
    if isinstance(leads, dict):
        leads = leads.get('data', [])
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Leading Indicators <span class="required">*</span></h3>
<div class="leading-toolbar"><button class="btn-add" id="add-leading-row">+ Tambah Baris</button>
<button class="btn-add" id="add-leading-col">+ Tambah Kolom</button></div></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Indikator metrik apa saja yang bisa memprediksi keberhasilan sistem ini dibandingkan dengan produk kompetitor?</p>
<div class="leading-table-wrapper"><table class="dynamic-table leading-table" id="leading-table"><thead><tr>
<th class="leading-th-no" style="width: 40px;">No</th><th class="leading-th-fixed">Fitur</th>
<th><input type="text" class="form-input leading-col-header leading-col-system" placeholder="Nama Sistem" value=""></th>
<th><input type="text" class="form-input leading-col-header" placeholder="Produk Lain" value=""><button class="leading-col-delete">x</button></th>
<th class="leading-th-action"></th></tr></thead><tbody>''')
    if not leads:
        leads = [{}]
    for i, l in enumerate(leads):
        metric = _e(l.get('metric', l.get('feature', '')))
        vals = l.get('values', ['', ''])
        v1 = _e(vals[0] if len(vals) > 0 else '')
        v2 = _e(vals[1] if len(vals) > 1 else '')
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td><input type="text" class="form-input" placeholder="Nama fitur..." value="{metric}"></td>
<td><input type="text" class="form-input" placeholder="Nilai..." value="{v1}"></td>
<td><input type="text" class="form-input" placeholder="Nilai..." value="{v2}"></td>
<td class="leading-row-delete-cell"><button class="btn-icon btn-delete leading-row-delete">x</button></td></tr>''')
    html_parts.append('</tbody></table></div></div>')

    # User Outcomes
    outcomes = obj.get('user_outcomes', [])
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>User Outcomes</h3></div>
<p class="form-hint" style="margin-top:-6px;">Manfaat nyata apa yang akan dirasakan oleh pengguna saat berinteraksi dengan sistem ini?</p>
<div class="obj-tabs"><div class="obj-tabs-nav" id="outcome-tabs-nav">''')
    if not outcomes:
        outcomes = [{}]
    for i, _ in enumerate(outcomes):
        active = ' active' if i == 0 else ''
        html_parts.append(f'<button class="obj-tab-btn{active}" data-obj="outcome-{i+1}" data-group="outcome">Outcome {i+1}</button>')
    html_parts.append('<button class="obj-tab-add" id="add-outcome">+</button></div>')
    html_parts.append('<div class="obj-tabs-content" id="outcome-tabs-content">')
    for i, o in enumerate(outcomes):
        active = ' active' if i == 0 else ''
        outcome = _e(o.get('outcome', ''))
        strategy = _e(o.get('strategy', ''))
        metrics = _e(o.get('metrics', ''))
        html_parts.append(f'''<div class="obj-tab-panel{active}" id="obj-panel-outcome-{i+1}">
<label class="form-label">Manfaat Pengguna <span class="required">*</span></label>
<textarea class="form-textarea" placeholder="Apa manfaat yang akan dirasakan pengguna?">{outcome}</textarea>
<div class="form-row-2col">
<div class="form-col"><label class="form-label">Bagaimana cara mencapainya? <span class="required">*</span></label>
<textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana strategi untuk mencapainya?">{strategy}</textarea></div>
<div class="form-col"><label class="form-label">Bagaimana cara mengukurnya? <span class="required">*</span></label>
<textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana metrik keberhasilannya?">{metrics}</textarea></div>
</div></div>''')
    html_parts.append('</div></div></div>')

    # Model Properties
    props = obj.get('model_properties', [])
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Model Properties</h3></div>
<p class="form-hint" style="margin-top:-6px;">Spesifikasi teknis dan kriteria akurasi yang harus dipenuhi oleh model AI/Machine Learning-nya.</p>
<div class="obj-tabs"><div class="obj-tabs-nav" id="property-tabs-nav">''')
    if not props:
        props = [{}]
    for i, _ in enumerate(props):
        active = ' active' if i == 0 else ''
        html_parts.append(f'<button class="obj-tab-btn{active}" data-obj="property-{i+1}" data-group="property">Property {i+1}</button>')
    html_parts.append('<button class="obj-tab-add" id="add-property">+</button></div>')
    html_parts.append('<div class="obj-tabs-content" id="property-tabs-content">')
    for i, p in enumerate(props):
        active = ' active' if i == 0 else ''
        prop = _e(p.get('property', ''))
        strategy = _e(p.get('strategy', ''))
        metrics = _e(p.get('metrics', ''))
        html_parts.append(f'''<div class="obj-tab-panel{active}" id="obj-panel-property-{i+1}">
<label class="form-label">Kriteria Model <span class="required">*</span></label>
<textarea class="form-textarea" placeholder="Apa sifat atau kemampuan teknis model AI?">{prop}</textarea>
<div class="form-row-2col">
<div class="form-col"><label class="form-label">Bagaimana cara mencapainya? <span class="required">*</span></label>
<textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana cara mencapainya?">{strategy}</textarea></div>
<div class="form-col"><label class="form-label">Bagaimana cara mengukurnya? <span class="required">*</span></label>
<textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana cara mengukurnya?">{metrics}</textarea></div>
</div></div>''')
    html_parts.append('</div></div></div>')
    html_parts.append('</div>')  # close tab-objectives

    # ── TAB 2: Intelligence Experiences ──
    html_parts.append('<div class="tab-panel" id="tab-experiences">')

    # Presentations
    pres_types = exp.get('presentations', [])
    pres_desc = exp.get('presentation_description', '')
    if isinstance(exp.get('presentation'), dict):
        pres_types = [t.get('label', t) if isinstance(t, dict) else t for t in exp['presentation'].get('types', [])]
        pres_desc = exp['presentation'].get('description', '')

    checkbox_map = {
        'Automate': 'automate',
        'Prompt': 'prompt',
        'Organisation': 'organisation',
        'Annotate': 'annotate',
    }
    checkbox_descs = {
        'Automate': 'Sistem otomatis melakukan aksi tanpa diminta',
        'Prompt': 'User input, sistem memberikan jawaban',
        'Organisation': 'Mengorganisir informasi secara cerdas',
        'Annotate': 'Memberikan label/anotasi pada data',
    }

    html_parts.append('<div class="form-section"><h3>Penyajian Kecerdasan <span class="required">*</span></h3>')
    html_parts.append('<p class="form-hint">Pilih satu atau lebih cara penyajian:</p>')
    html_parts.append('<div class="checkbox-group">')

    # Normalize pres_types to list of label strings
    pres_labels = []
    for t in pres_types:
        if isinstance(t, dict):
            pres_labels.append(t.get('label', ''))
        else:
            pres_labels.append(str(t))

    for label, val in checkbox_map.items():
        checked = 'checked="checked"' if label in pres_labels else ''
        desc = checkbox_descs[label]
        html_parts.append(f'''<div class="checkbox-wrapper"><label class="checkbox-item">
<input type="checkbox" value="{val}" {checked}>
<span class="checkbox-label">{label}</span>
<span class="checkbox-desc">{desc}</span></label>
<a href="#" class="example-link" data-example="{val}">Lihat Contoh</a></div>''')
    html_parts.append('</div>')
    html_parts.append(f'<textarea class="form-textarea" placeholder="Jelaskan cara penyajiannya...">{_e(pres_desc)}</textarea>')
    html_parts.append('</div>')

    # Functions
    funcs = exp.get('functions', [])
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Fungsi-fungsi Realisasi Objectives <span class="required">*</span></h3>
<button class="btn-add" data-table="functions-table" data-numbered="true">+ Tambah Fungsi</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Rincian fungsi spesifik apa saja yang perlu dibangun untuk merealisasikan tujuan di atas.</p>
<table class="dynamic-table table-fixed" id="functions-table"><colgroup>
<col style="width: 40px;"><col style="width: 30%;"><col style="width: auto;"><col style="width: 48px;">
</colgroup><thead><tr><th>No</th><th>Nama Fungsi</th><th>Deskripsi</th><th></th></tr></thead><tbody>''')
    if not funcs:
        funcs = [{}]
    for i, f in enumerate(funcs):
        name = _e(f.get('name', ''))
        desc = _e(f.get('description', ''))
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td><input type="text" class="form-input" placeholder="Nama fungsi" value="{name}"></td>
<td><input type="text" class="form-input" placeholder="Deskripsi fungsi" value="{desc}"></td>
<td><button class="btn-icon btn-delete">x</button></td></tr>''')
    html_parts.append('</tbody></table></div>')

    # Error Minimization
    errors = exp.get('error_minimizations', exp.get('error_minimization', []))
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Minimalisasi Kesalahan <span class="required">*</span></h3>
<button class="btn-add" data-target="error-minimization">+ Tambah Strategi</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Bagaimana sistem menangani potensi kesalahan dari prediksi AI agar tidak fatal.</p>
<div class="dynamic-list" id="error-minimization">''')
    if not errors:
        errors = [{}]
    for e_item in errors:
        func_name = _e(e_item.get('function', e_item.get('name', '')))
        strat = _e(e_item.get('strategy', e_item.get('description', '')))
        html_parts.append(f'''<div class="list-item list-item-with-select">
<select class="form-select func-select"><option value="">Pilih Fungsi...</option>
<option value="{func_name}" selected="selected">{func_name}</option></select>
<input type="text" class="form-input" placeholder="Strategi minimalisasi error" value="{strat}">
<button class="btn-icon btn-delete">x</button></div>''')
    html_parts.append('</div></div>')

    # Data Collection
    datacol = exp.get('data_collections', exp.get('data_collection', []))
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Pengumpulan Data untuk Perbaikan <span class="required">*</span></h3>
<button class="btn-add" data-target="data-collection">+ Tambah Rencana</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Bagaimana cara sistem mengumpulkan data baru secara berkala untuk melatih ulang (re-train) model.</p>
<div class="dynamic-list" id="data-collection">''')
    if not datacol:
        datacol = [{}]
    for d_item in datacol:
        func_name = _e(d_item.get('function', d_item.get('name', '')))
        plan = _e(d_item.get('plan', d_item.get('description', '')))
        html_parts.append(f'''<div class="list-item list-item-with-select">
<select class="form-select func-select"><option value="">Pilih Fungsi...</option>
<option value="{func_name}" selected="selected">{func_name}</option></select>
<input type="text" class="form-input" placeholder="Rencana pengumpulan data" value="{plan}">
<button class="btn-icon btn-delete">x</button></div>''')
    html_parts.append('</div></div>')
    html_parts.append('</div>')  # close tab-experiences

    # ── TAB 3: Intelligence Implementation ──
    html_parts.append('<div class="tab-panel" id="tab-implementation">')
    processes = imp.get('business_processes', [])

    # Process table
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Proses Bisnis Sistem Cerdas <span class="required">*</span></h3>
<button class="btn-add" data-table="process-table" data-numbered="true">+ Tambah Proses</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Alur kerja atau tahapan proses yang terjadi di dalam sistem ini secara berurutan.</p>
<table class="dynamic-table" id="process-table"><colgroup>
<col style="width: 40px;"><col style="width: 35%;"><col style="width: auto;"><col style="width: 48px;">
</colgroup><thead><tr><th>No</th><th>Nama Proses</th><th>Deskripsi</th><th></th></tr></thead><tbody>''')
    if not processes:
        processes = [{}]
    for i, p in enumerate(processes):
        name = _e(p.get('name', ''))
        desc = _e(p.get('description', ''))
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td><input type="text" class="form-input process-name-input" placeholder="Nama proses" value="{name}"></td>
<td><input type="text" class="form-input" placeholder="Deskripsi proses" value="{desc}"></td>
<td><button class="btn-icon btn-delete">x</button></td></tr>''')
    html_parts.append('</tbody></table></div>')

    # Tech table
    techs = imp.get('technologies', [])
    html_parts.append('''<div class="form-section"><h3>Teknologi per Proses <span class="required">*</span></h3>
<p class="form-hint">Teknologi yang digunakan untuk setiap proses.</p>
<table class="dynamic-table" id="tech-table"><colgroup>
<col style="width: 40px;"><col style="width: 35%;"><col style="width: auto;"><col style="width: 48px;">
</colgroup><thead><tr><th>No</th><th>Proses</th><th>Teknologi</th><th></th></tr></thead><tbody>''')
    for i in range(max(len(processes), len(techs), 1)):
        pname = _e(processes[i].get('name', '-') if i < len(processes) else '-')
        tech = _e(techs[i].get('technology', techs[i].get('technologies', '')) if i < len(techs) else '')
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td class="process-name">{pname}</td>
<td><input type="text" class="form-input tech-input" placeholder="Teknologi yang digunakan" value="{tech}"></td>
<td><button class="btn-icon tech-list-btn" title="Pilih dari daftar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button></td></tr>''')
    html_parts.append('</tbody></table></div>')

    # Smart processes
    smarts = imp.get('smart_processes', [])
    html_parts.append('''<div class="form-section"><h3>Identifikasi Proses Cerdas <span class="required">*</span></h3>
<p class="form-hint">Centang proses yang menjadikan sistem ini CERDAS:</p>
<div class="smart-process-list" id="smart-processes">''')
    for i in range(max(len(processes), len(smarts), 1)):
        pname = _e(processes[i].get('name', '-') if i < len(processes) else '-')
        is_smart = smarts[i].get('is_smart', False) if i < len(smarts) else False
        reason = _e(smarts[i].get('reason', '') if i < len(smarts) else '')
        checked = 'checked="checked"' if is_smart else ''
        display = '' if is_smart else 'display:none;'
        html_parts.append(f'''<div class="smart-process-item">
<label class="checkbox-item"><input type="checkbox" class="smart-check" {checked}>
<span class="checkbox-label">{pname}</span></label>
<div class="smart-reason" style="{display}">
<input type="text" class="form-input" placeholder="Alasan perlunya AI untuk proses ini" value="{reason}">
<p class="upload-hint">Format: JPG, PNG, PDF, DOC (Maks. 5MB)</p></div></div>''')
    html_parts.append('</div></div>')

    # Upload area
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Upload Diagram Proses Bisnis</h3></div>
<div class="upload-area" id="upload-implementation"><div class="upload-dropzone">
<input type="file" class="upload-input" id="file-implementation" accept="image/*,.pdf,.doc,.docx" multiple>
<div class="upload-placeholder"><span class="upload-icon">&#8593;</span>
<p>Drag & drop file di sini atau <span class="upload-browse">pilih file</span></p>
<p class="upload-hint">Format: JPG, PNG, PDF, DOC (Maks. 5MB)</p></div></div>
<div class="upload-preview" id="preview-implementation"></div></div></div>''')
    html_parts.append('</div>')  # close tab-implementation

    # ── TAB 4: Creation Status ──
    html_parts.append('<div class="tab-panel" id="tab-creation">')
    constraints = cre.get('constraints', [])
    modules = cre.get('module_statuses', cre.get('modules', []))

    # Constraints
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Batasan Pengembangan <span class="required">*</span></h3>
<button class="btn-add" data-table="constraints-table" data-numbered="true" data-has-select="true">+ Tambah Batasan</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Apa saja limitasi teknis, sumber daya, atau waktu yang perlu diperhatikan dalam proyek ini.</p>
<table class="dynamic-table" id="constraints-table"><colgroup>
<col style="width: 40px;"><col style="width: 160px;"><col style="width: auto;"><col style="width: 48px;">
</colgroup><thead><tr><th>No</th><th>Kategori</th><th>Deskripsi</th><th></th></tr></thead><tbody>''')
    if not constraints:
        constraints = [{}]
    cat_options = ['data', 'infra', 'waktu', 'sdm', 'biaya', 'lainnya']
    cat_labels = {'data': 'Data', 'infra': 'Infrastruktur', 'waktu': 'Waktu', 'sdm': 'SDM', 'biaya': 'Biaya', 'lainnya': 'Lainnya'}
    for i, c in enumerate(constraints):
        cat = c.get('category', '')
        desc = _e(c.get('description', ''))
        opts = '<option value="">Pilih...</option>'
        for cv in cat_options:
            sel = ' selected="selected"' if cv == cat else ''
            opts += f'<option value="{cv}"{sel}>{cat_labels[cv]}</option>'
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td><select class="form-select">{opts}</select></td>
<td><input type="text" class="form-input" placeholder="Deskripsi batasan" value="{desc}"></td>
<td><button class="btn-icon btn-delete">x</button></td></tr>''')
    html_parts.append('</tbody></table></div>')

    # Module status
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Status Realisasi Modul Cerdas <span class="required">*</span></h3></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Pantau sejauh mana status pengembangan tiap modul cerdas saat ini.</p>
<table class="dynamic-table" id="status-table"><colgroup>
<col style="width: 40px;"><col style="width: 30%;"><col style="width: 35%;"><col style="width: auto;">
</colgroup><thead><tr><th>No</th><th>Modul/Fungsi</th><th>Status</th><th>Catatan</th></tr></thead><tbody>''')
    if not modules:
        # Use functions as module names
        modules = [{'module': f.get('name', '-'), 'status': 'not_started', 'notes': ''} for f in (funcs if funcs else [{}])]
    status_options = {'not_started': 'Belum Mulai', 'in_progress': 'In Progress', 'done': 'Done', 'blocked': 'Blocked'}
    done_count = 0
    progress_count = 0
    pending_count = 0
    blocked_count = 0
    for i, m in enumerate(modules):
        mod_name = _e(m.get('module', '-'))
        status = m.get('status', 'not_started')
        notes = _e(m.get('notes', ''))
        if status == 'done':
            done_count += 1
        elif status == 'in_progress':
            progress_count += 1
        elif status == 'blocked':
            blocked_count += 1
        else:
            pending_count += 1
        opts = ''
        for sv, sl in status_options.items():
            sel = ' selected="selected"' if sv == status else ''
            opts += f'<option value="{sv}"{sel}>{sl}</option>'
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td class="module-name">{mod_name}</td>
<td><select class="form-select status-select">{opts}</select></td>
<td><input type="text" class="form-input optional-input" placeholder="Catatan tambahan" value="{notes}"></td></tr>''')
    html_parts.append('</tbody></table></div>')

    # Progress bar
    total_mod = len(modules)
    pct = round((done_count / total_mod) * 100) if total_mod > 0 else 0
    html_parts.append(f'''<div class="form-section"><h3>Progress Keseluruhan <span class="required">*</span></h3>
<div class="progress-overview"><div class="progress-bar-large">
<div class="progress-fill-large" id="creation-progress" style="width: {pct}%"></div></div>
<span class="progress-percentage" id="creation-percentage">{pct}%</span></div>
<div class="progress-stats" id="creation-stats">
<span class="stat-item stat-done">Done: {done_count}</span>
<span class="stat-item stat-progress">Progress: {progress_count}</span>
<span class="stat-item stat-pending">Belum: {pending_count}</span>
<span class="stat-item stat-blocked">Blocked: {blocked_count}</span></div></div>''')

    # Upload
    html_parts.append('''<div class="form-section"><h3>Upload Bukti/Evidence <span class="optional">(Opsional)</span></h3>
<div class="upload-area" id="upload-creation"><div class="upload-dropzone">
<input type="file" class="upload-input" id="file-creation" accept="image/*,.pdf,.doc,.docx" multiple>
<div class="upload-placeholder"><span class="upload-icon">&#8593;</span>
<p>Drag & drop file di sini atau <span class="upload-browse">pilih file</span></p>
<p class="upload-hint">Format: JPG, PNG, PDF, DOC (Maks. 5MB)</p></div></div>
<div class="upload-preview" id="preview-creation"></div></div></div>''')
    html_parts.append('</div>')  # close tab-creation

    # ── TAB 5: Orchestration ──
    html_parts.append('<div class="tab-panel" id="tab-orchestration">')
    timelines = orc.get('timelines', orc.get('timeline', []))
    operators = orc.get('operators', [])

    # Gantt table
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Timeline Orchestration <span class="required">*</span></h3>
<button class="btn-add" id="add-phase-btn">+ Fase Baru</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Kapan setiap fase pengembangan akan dilakukan dan siapa penanggung jawabnya.</p>
<table class="dynamic-table gantt-table" id="gantt-table"><colgroup>
<col style="width: 40px;"><col style="width: auto;"><col style="width: 20%;"><col style="width: 15%;">
<col style="width: 15%;"><col style="width: 15%;"><col style="width: 15%;"><col style="width: 48px;">
</colgroup><thead><tr><th>No</th><th>Kategori</th><th>Nama Fase</th><th>Mulai</th><th>Selesai</th><th>PIC</th><th>Status</th><th></th></tr></thead><tbody>''')
    if not timelines:
        timelines = [{}]
    cat_tl = {'deployment': 'Deployment', 'maintenance': 'Pemeliharaan', 'operation': 'Operasi'}
    status_tl = {'backlog': 'Backlog', 'todo': 'To Do', 'in_progress': 'In Progress', 'done': 'Done'}
    for i, t in enumerate(timelines):
        tcat = t.get('category', 'deployment')
        phase = _e(t.get('phase_name', t.get('phase', '')))
        start = _e(t.get('start_date', ''))
        end = _e(t.get('end_date', ''))
        pic = _e(t.get('pic', ''))
        tstatus = t.get('status', 'backlog')
        cat_opts = ''
        for cv, cl in cat_tl.items():
            sel = ' selected="selected"' if cv == tcat else ''
            cat_opts += f'<option value="{cv}"{sel}>{cl}</option>'
        stat_opts = ''
        for sv, sl in status_tl.items():
            sel = ' selected="selected"' if sv == tstatus else ''
            stat_opts += f'<option value="{sv}"{sel}>{sl}</option>'
        # Clean date format for input[type=date]
        if start and 'T' in start:
            start = start.split('T')[0]
        if end and 'T' in end:
            end = end.split('T')[0]
        html_parts.append(f'''<tr class="phase-row" data-category="{_e(tcat)}"><td class="row-number">{i+1}</td>
<td><select class="form-select form-select-sm">{cat_opts}</select></td>
<td><input type="text" class="form-input" placeholder="Nama fase" value="{phase}"></td>
<td><input type="date" class="form-input form-input-date" value="{start}"></td>
<td><input type="date" class="form-input form-input-date" value="{end}"></td>
<td><input type="text" class="form-input" placeholder="PIC" value="{pic}"></td>
<td><select class="form-select status-select">{stat_opts}</select></td>
<td><button class="btn-icon btn-delete">x</button></td></tr>''')
    html_parts.append('</tbody></table></div>')

    # Upload SOP
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Upload SOP Deployment <span class="optional">(Opsional)</span></h3></div>
<div class="upload-area" id="upload-orchestration"><div class="upload-dropzone">
<input type="file" class="upload-input" id="file-orchestration" accept="image/*,.pdf,.doc,.docx" multiple>
<div class="upload-placeholder"><span class="upload-icon">&#8593;</span>
<p>Drag & drop file di sini atau <span class="upload-browse">pilih file</span></p>
<p class="upload-hint">Format: JPG, PNG, PDF, DOC (Maks. 5MB)</p></div></div>
<div class="upload-preview" id="preview-orchestration"></div></div></div>''')

    # Operators
    html_parts.append('''<div class="form-section">
<div class="form-section-header"><h3>Pelaksana Operasi <span class="required">*</span></h3>
<button class="btn-add" data-table="operators-table" data-numbered="true">+ Tambah Operator</button></div>
<p class="form-hint" style="margin-top:-6px; margin-bottom:12px;">Definisikan siapa yang akan mengoperasikan sistem setelah deployment</p>
<table class="dynamic-table" id="operators-table"><colgroup>
<col style="width: 40px;"><col style="width: 30%;"><col style="width: 30%;"><col style="width: auto;"><col style="width: 48px;">
</colgroup><thead><tr><th>No</th><th>Nama</th><th>Peran</th><th>Kontak</th><th></th></tr></thead><tbody>''')
    if not operators:
        operators = [{}]
    for i, op in enumerate(operators):
        name = _e(op.get('name', ''))
        role = _e(op.get('role', ''))
        contact = _e(op.get('contact', ''))
        html_parts.append(f'''<tr><td class="row-number">{i+1}</td>
<td><input type="text" class="form-input" placeholder="Nama" value="{name}"></td>
<td><input type="text" class="form-input" placeholder="Peran" value="{role}"></td>
<td><input type="text" class="form-input" placeholder="Kontak (Email / No. HP)" value="{contact}"></td>
<td><button class="btn-icon btn-delete">x</button></td></tr>''')
    html_parts.append('</tbody></table></div>')
    html_parts.append('</div>')  # close tab-orchestration

    # Hidden field for highest unlocked tab
    html_parts.append('<input type="hidden" id="highest-unlocked-index" value="5">')

    return '\n'.join(html_parts)
