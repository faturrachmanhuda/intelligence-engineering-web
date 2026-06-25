$(document).ready(function () {
    window.isDirty = false;
    window.updateSaveButtonState = function () {
        if (typeof isFormFullyFilled !== 'function') return;
        var $btn = $('#btn-save-project-nav');

        $('#nav-save-text').text('Simpan');

        if (window.isDirty) {
            $btn.css({ 'opacity': '1', 'pointer-events': 'auto', 'background': '' });
        } else {
            $btn.css({ 'opacity': '0.7', 'pointer-events': 'none', 'background': 'var(--color-gray)' });
        }
    };

    $(document).on('input change', '.dashboard-main input, .dashboard-main textarea, .dashboard-main select', function () {
        if (!window.isDirty) {
            window.isDirty = true;
            window.updateSaveButtonState();
        }
    });

    window.handleNavSaveClick = function () {
        if (typeof window.saveProjectToDB === 'function') {
            window.saveProjectToDB();
        }
    };

    // Unsaved changes warning
    window.addEventListener('beforeunload', function (e) {
        if (window.isDirty) {
            var confirmationMessage = 'Ada perubahan yang belum disimpan. Yakin ingin keluar?';
            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });

    $(document).on('click', 'a', function (e) {
        var href = $(this).attr('href');
        if (window.isDirty && href && !href.startsWith('#') && !href.startsWith('javascript:') && $(this).attr('target') !== '_blank') {
            e.preventDefault();
            window.pendingNavigationUrl = href;
            $('#unsaved-changes-modal').css('display', 'flex');
        }
    });

    // Modal buttons
    $('#btn-unsaved-cancel').on('click', function () {
        $('#unsaved-changes-modal').hide();
        window.pendingNavigationUrl = null;
    });
    $('#btn-unsaved-discard').on('click', function () {
        window.isDirty = false;
        if (window.pendingNavigationUrl) window.location.href = window.pendingNavigationUrl;
    });
    $('#btn-unsaved-save').on('click', function () {
        $('#unsaved-changes-modal').hide();
        window.saveProjectToDB(function () {
            if (window.pendingNavigationUrl) window.location.href = window.pendingNavigationUrl;
        });
    });

    $('#btn-final-cancel').on('click', function () {
        $('#finalization-modal').hide();
    });
    $('#btn-final-confirm').on('click', function () {
        $('#finalization-modal').hide();

        // Finalize draft
        PROJECT_STATUS = 'completed';

        // Show loading state
        var $btn = $(this);
        var oldText = $btn.text();
        $btn.prop('disabled', true).text('Memproses...');

        saveDraft(true, function () {
            // Redirect to projects list after successful finalization
            window.location.href = (typeof SCRIPT_PREFIX !== 'undefined' ? SCRIPT_PREFIX : '') + '/projects/';
        });
    });

    // ===== TAB SWITCHING =====
    $('.tab-btn').on('click', function () {
        // Skip disabled tabs
        if ($(this).hasClass('disabled')) return;

        var tabId = $(this).data('tab');

        // Save to localStorage
        localStorage.setItem('ie_active_tab', tabId);

        // Update active button
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        // Update active panel
        $('.tab-panel').removeClass('active');
        $('#tab-' + tabId).addClass('active');

        // Update step indicator and prev/next buttons
        updateTabNavigation();

        // Scroll to top of tabs
        $('html, body').animate({
            scrollTop: $('.project-tabs').offset().top - 80
        }, 300);
    });

    // Prevent clicking disabled tabs (delegated for dynamic elements)
    $(document).on('click', '.tab-btn.disabled', function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    // ===== DYNAMIC LIST - Add Item =====
    $(document).on('click', '.btn-add[data-target]', function () {
        var targetId = $(this).data('target');
        var $list = $('#' + targetId);
        var $firstItem = $list.find('.list-item:first');
        var $newItem = $firstItem.clone();

        // Clear input and textarea values
        $newItem.find('input, textarea').val('');
        $newItem.find('select').prop('selectedIndex', 0);
        $list.append($newItem);

        // Sync func selects if needed
        if ($newItem.find('.func-select').length) {
            syncFuncSelects();
        }
    });

    // ===== DYNAMIC LIST - Delete Item =====
    $(document).on('click', '.dynamic-list .btn-delete', function () {
        var $list = $(this).closest('.dynamic-list');
        if ($list.find('.list-item').length > 1) {
            $(this).closest('.list-item').remove();
        } else {
            // If last item, just clear the inputs and textareas
            $(this).closest('.list-item').find('input, textarea').val('');
        }
    });

    // ===== DYNAMIC TABLE - Add Row =====
    $(document).on('click', '.btn-add[data-table]', function () {
        var tableId = $(this).data('table');
        var isNumbered = $(this).data('numbered');
        var hasSelect = $(this).data('has-select');
        var hasStatus = $(this).data('has-status');
        var $table = $('#' + tableId);
        var $tbody = $table.find('tbody');
        var $lastRow = $tbody.find('tr:last');
        var $newRow = $lastRow.clone();

        // Clear input values
        $newRow.find('input').val('');
        $newRow.find('select').prop('selectedIndex', 0);

        // Update row number if numbered
        if (isNumbered) {
            var rowCount = $tbody.find('tr').length + 1;
            $newRow.find('.row-number').text(rowCount);
        }

        $tbody.append($newRow);

        // Trigger sync for process table
        if (tableId === 'process-table') {
            syncProcessData();
        }

        // Recalculate progress if status table
        if (tableId === 'status-table') {
            calculateProgress();
        }
    });

    // ===== DYNAMIC TABLE - Delete Row =====
    $(document).on('click', '.dynamic-table .btn-delete', function () {
        var $table = $(this).closest('.dynamic-table');
        var $tbody = $table.find('tbody');
        var tableId = $table.attr('id');

        if ($tbody.find('tr').length > 1) {
            $(this).closest('tr').remove();

            // Renumber rows if needed
            $tbody.find('.row-number').each(function (index) {
                $(this).text(index + 1);
            });

            // Sync process data if process table
            if (tableId === 'process-table') {
                syncProcessData();
            }

            // Recalculate progress if status table
            if (tableId === 'status-table') {
                calculateProgress();
            }
        } else {
            // If last row, just clear inputs
            var $row = $(this).closest('tr');
            $row.find('input').val('');
            $row.find('select').prop('selectedIndex', 0);

            if (tableId === 'process-table') {
                syncProcessData();
            }
            if (tableId === 'status-table') {
                calculateProgress();
            }
        }
    });

    // ===== LEADING INDICATORS - Dynamic Rows & Columns =====
    function recalcLeadingWidths() {
        // Force table layout to fixed so it respects exact widths
        $('#leading-table').css('table-layout', 'fixed');

        var colCount = $('#leading-table thead th').length - 2; // minus No and action columns
        var baseRatio = 1 / colCount;
        var fiturRatio = baseRatio + 0.1; // Fitur gets slightly more space (+10%)
        var otherRatio = (1 - fiturRatio) / (colCount - 1);

        $('#leading-table thead th').each(function () {
            if ($(this).hasClass('leading-th-no')) {
                $(this).css('width', '40px');
            } else if ($(this).hasClass('leading-th-action')) {
                $(this).css('width', '48px');
            } else if ($(this).hasClass('leading-th-fixed')) {
                $(this).css('width', 'calc((100% - 88px) * ' + fiturRatio + ')');
            } else {
                $(this).css('width', 'calc((100% - 88px) * ' + otherRatio + ')');
            }
        });
    }

    // Initialize on page load
    recalcLeadingWidths();

    $(document).on('click', '#add-leading-row', function () {
        var rowCount = $('#leading-table tbody tr').length + 1;
        var colCount = $('#leading-table thead th').length - 2; // minus No and the action column
        var row = '<tr>';
        row += '<td class="row-number">' + rowCount + '</td>';
        for (var i = 0; i < colCount; i++) {
            if (i === 0) {
                row += '<td><input type="text" class="form-input" placeholder="Nama fitur..."></td>';
            } else {
                row += '<td><input type="text" class="form-input" placeholder="Nilai..."></td>';
            }
        }
        row += '<td class="leading-row-delete-cell"><button class="btn-icon btn-delete leading-row-delete">x</button></td>';
        row += '</tr>';
        $('#leading-table tbody').append(row);
    });

    // Delete row
    $(document).on('click', '.leading-row-delete', function () {
        var $tbody = $('#leading-table tbody');
        if ($tbody.find('tr').length > 1) {
            $(this).closest('tr').remove();
            $tbody.find('.row-number').each(function (index) {
                $(this).text(index + 1);
            });
        } else {
            $(this).closest('tr').find('input').val('');
        }
    });

    $(document).on('click', '#add-leading-col', function () {
        // Add header before the action column
        var $actionTh = $('#leading-table thead tr th.leading-th-action');
        var newTh = '<th><input type="text" class="form-input leading-col-header" placeholder="Produk Lain" value=""><button class="leading-col-delete">x</button></th>';
        $actionTh.before(newTh);

        // Add cell before the delete button cell in each row
        $('#leading-table tbody tr').each(function () {
            $(this).find('.leading-row-delete-cell').before('<td><input type="text" class="form-input" placeholder="Nilai..."></td>');
        });

        recalcLeadingWidths();
    });

    $(document).on('click', '.leading-col-delete', function () {
        var $th = $(this).closest('th');
        var colIndex = $th.index();

        // Don't delete if only 2 data columns left (Fitur + 1 system)
        if ($('#leading-table thead th').length <= 4) return; // No + Fitur + 1 system + 1 action

        $th.remove();
        $('#leading-table tbody tr').each(function () {
            $(this).find('td').eq(colIndex).remove();
        });

        recalcLeadingWidths();
    });

    // ===== GANTT TABLE DATE VALIDATION =====
    $(document).on('change', '#gantt-table input[type="date"]', function () {
        var $row = $(this).closest('tr');
        var $startDateInput = $row.find('td:nth-child(3) input[type="date"]');
        var $endDateInput = $row.find('td:nth-child(4) input[type="date"]');

        var startDateStr = $startDateInput.val();
        var endDateStr = $endDateInput.val();

        // Define boundaries from Project definition (if available)
        var globalStart = typeof PROJECT_START_DATE !== 'undefined' && PROJECT_START_DATE ? PROJECT_START_DATE : null;
        var globalEnd = typeof PROJECT_END_DATE !== 'undefined' && PROJECT_END_DATE ? PROJECT_END_DATE : null;

        // 1. Calculate boundaries for Start Date
        var maxStart = endDateStr && globalEnd ? (new Date(endDateStr) < new Date(globalEnd) ? endDateStr : globalEnd) : (endDateStr || globalEnd);
        if (globalStart) $startDateInput.attr('min', globalStart); else $startDateInput.removeAttr('min');
        if (maxStart) $startDateInput.attr('max', maxStart); else $startDateInput.removeAttr('max');

        // 2. Calculate boundaries for End Date
        var minEnd = startDateStr && globalStart ? (new Date(startDateStr) > new Date(globalStart) ? startDateStr : globalStart) : (startDateStr || globalStart);
        if (minEnd) $endDateInput.attr('min', minEnd); else $endDateInput.removeAttr('min');
        if (globalEnd) $endDateInput.attr('max', globalEnd); else $endDateInput.removeAttr('max');

        // 3. Hard fallback: if user types an invalid date manually bypassing the UI picker
        var val = $(this).val();
        if (val) {
            var dVal = new Date(val);
            var invalid = false;
            if (globalStart && dVal < new Date(globalStart)) invalid = true;
            if (globalEnd && dVal > new Date(globalEnd)) invalid = true;
            if (startDateStr && endDateStr && new Date(startDateStr) > new Date(endDateStr)) invalid = true;

            if (invalid) {
                $(this).val('');
            }
        }
    });

    // Auto-fill dates on click/focus if empty to improve UX
    $(document).on('click focus', '#gantt-table input[type="date"]', function () {
        if ($(this).val()) return; // Already has a value

        var $row = $(this).closest('tr');
        var $startDateInput = $row.find('td:nth-child(3) input[type="date"]');
        var $endDateInput = $row.find('td:nth-child(4) input[type="date"]');
        var globalStart = typeof PROJECT_START_DATE !== 'undefined' && PROJECT_START_DATE ? PROJECT_START_DATE : null;
        var globalEnd = typeof PROJECT_END_DATE !== 'undefined' && PROJECT_END_DATE ? PROJECT_END_DATE : null;

        if ($(this).is($startDateInput)) {
            if (globalStart) {
                $(this).val(globalStart).trigger('change');
            }
        } else if ($(this).is($endDateInput)) {
            var baseDateStr = $startDateInput.val() || globalStart;
            if (baseDateStr) {
                var d = new Date(baseDateStr);
                d.setDate(d.getDate() + 1);

                // Ensure it doesn't exceed globalEnd
                if (globalEnd && d > new Date(globalEnd)) {
                    d = new Date(globalEnd);
                }

                var yyyy = d.getFullYear();
                var mm = String(d.getMonth() + 1).padStart(2, '0');
                var dd = String(d.getDate()).padStart(2, '0');
                $(this).val(yyyy + '-' + mm + '-' + dd).trigger('change');
            }
        }
    });

    // ===== GANTT TABLE - Add Phase =====
    $(document).on('click', '#add-phase-btn', function () {
        var $tbody = $('#gantt-table tbody');
        var $lastRow = $tbody.find('tr:last');
        var $newRow = $lastRow.clone();

        $newRow.find('input').val('');
        $newRow.find('select').prop('selectedIndex', 0);

        var rowCount = $tbody.find('tr').length + 1;
        $newRow.find('.row-number').text(rowCount);

        $tbody.append($newRow);
    });

    // ===== OBJECTIVES - Add/Remove Tab =====
    var objCounter = 1;
    var outcomeCounter = 1;
    var propertyCounter = 1;

    // Add Objective tab
    $(document).on('click', '#add-objective', function () {
        objCounter++;
        var tabId = objCounter;
        var tabBtn = '<button class="obj-tab-btn" data-obj="' + tabId + '">Objective ' + tabId + ' <span class="obj-tab-close">\u00d7</span></button>';
        $(this).before(tabBtn);

        var panel = '<div class="obj-tab-panel" id="obj-panel-' + tabId + '">' +
            '<label class="form-label">Tujuan Utama <span class="required">*</span></label>' +
            '<textarea class="form-textarea" placeholder="Apa tujuan utama organisasi yang ingin dicapai?"></textarea>' +
            '<div class="form-row-2col">' +
            '<div class="form-col"><label class="form-label">Bagaimana cara mencapainya? <span class="required">*</span></label><textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana strategi untuk mencapainya?"></textarea></div>' +
            '<div class="form-col"><label class="form-label">Bagaimana cara mengukurnya? <span class="required">*</span></label><textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana metrik keberhasilannya?"></textarea></div>' +
            '</div></div>';
        $(this).closest('.obj-tabs').find('.obj-tabs-content').append(panel);

        // Switch to new tab
        $(this).closest('.obj-tabs-nav').find('.obj-tab-btn').removeClass('active');
        $(this).closest('.obj-tabs-nav').find('.obj-tab-btn[data-obj="' + tabId + '"]').addClass('active');
        $(this).closest('.obj-tabs').find('.obj-tab-panel').removeClass('active');
        $('#obj-panel-' + tabId).addClass('active');
    });

    // Add Outcome tab
    $(document).on('click', '#add-outcome', function () {
        outcomeCounter++;
        var tabId = 'outcome-' + outcomeCounter;
        var tabBtn = '<button class="obj-tab-btn" data-obj="' + tabId + '" data-group="outcome">Outcome ' + outcomeCounter + ' <span class="obj-tab-close">\u00d7</span></button>';
        $(this).before(tabBtn);

        var panel = '<div class="obj-tab-panel" id="obj-panel-' + tabId + '">' +
            '<label class="form-label">Manfaat Pengguna <span class="required">*</span></label>' +
            '<textarea class="form-textarea" placeholder="Apa manfaat yang akan dirasakan pengguna?"></textarea>' +
            '<div class="form-row-2col">' +
            '<div class="form-col"><label class="form-label">Bagaimana cara mencapainya? <span class="required">*</span></label><textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana strategi untuk mencapainya?"></textarea></div>' +
            '<div class="form-col"><label class="form-label">Bagaimana cara mengukurnya? <span class="required">*</span></label><textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana metrik keberhasilannya?"></textarea></div>' +
            '</div></div>';
        $('#outcome-tabs-content').append(panel);

        $('#outcome-tabs-nav .obj-tab-btn').removeClass('active');
        $('#outcome-tabs-nav .obj-tab-btn[data-obj="' + tabId + '"]').addClass('active');
        $('#outcome-tabs-content .obj-tab-panel').removeClass('active');
        $('#obj-panel-' + tabId).addClass('active');
    });

    // Add Property tab
    $(document).on('click', '#add-property', function () {
        propertyCounter++;
        var tabId = 'property-' + propertyCounter;
        var tabBtn = '<button class="obj-tab-btn" data-obj="' + tabId + '" data-group="property">Property ' + propertyCounter + ' <span class="obj-tab-close">\u00d7</span></button>';
        $(this).before(tabBtn);

        var panel = '<div class="obj-tab-panel" id="obj-panel-' + tabId + '">' +
            '<label class="form-label">Kriteria Model <span class="required">*</span></label>' +
            '<textarea class="form-textarea" placeholder="Apa sifat atau kemampuan teknis model AI?"></textarea>' +
            '<div class="form-row-2col">' +
            '<div class="form-col"><label class="form-label">Bagaimana cara mencapainya? <span class="required">*</span></label><textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana cara mencapainya?"></textarea></div>' +
            '<div class="form-col"><label class="form-label">Bagaimana cara mengukurnya? <span class="required">*</span></label><textarea class="form-textarea form-textarea-sm" placeholder="Bagaimana cara mengukurnya?"></textarea></div>' +
            '</div></div>';
        $('#property-tabs-content').append(panel);

        $('#property-tabs-nav .obj-tab-btn').removeClass('active');
        $('#property-tabs-nav .obj-tab-btn[data-obj="' + tabId + '"]').addClass('active');
        $('#property-tabs-content .obj-tab-panel').removeClass('active');
        $('#obj-panel-' + tabId).addClass('active');
    });

    // Switch objective/outcome/property tabs
    $(document).on('click', '.obj-tab-btn', function (e) {
        if ($(e.target).hasClass('obj-tab-close')) return;
        var objId = $(this).data('obj');
        var $nav = $(this).closest('.obj-tabs-nav');
        var $content = $(this).closest('.obj-tabs').find('.obj-tabs-content');

        $nav.find('.obj-tab-btn').removeClass('active');
        $(this).addClass('active');
        $content.find('.obj-tab-panel').removeClass('active');
        $('#obj-panel-' + objId).addClass('active');
    });

    // Close/delete tab (not allowed on first tab of each group)
    $(document).on('click', '.obj-tab-close', function (e) {
        e.stopPropagation();
        var $btn = $(this).closest('.obj-tab-btn');
        var objId = $btn.data('obj');
        var $nav = $btn.closest('.obj-tabs-nav');
        var $content = $btn.closest('.obj-tabs').find('.obj-tabs-content');

        // Don't delete if it's the last tab
        if ($nav.find('.obj-tab-btn').length <= 1) return;

        var wasActive = $btn.hasClass('active');
        $btn.remove();
        $('#obj-panel-' + objId).remove();

        if (wasActive) {
            var $first = $nav.find('.obj-tab-btn:first');
            $first.addClass('active');
            $content.find('#obj-panel-' + $first.data('obj')).addClass('active');
        }
    });

    // ===== AUTO-POPULATE TECH TABLE from Process Table =====
    $(document).on('input', '.project-tabs #process-table .process-name-input', function () {
        syncProcessData();
    });

    function syncProcessData() {
        var processes = [];
        $('.project-tabs #process-table tbody tr').each(function () {
            var name = $(this).find('.process-name-input').val() || '-';
            processes.push(name);
        });

        // Update tech table — preserve existing tech values
        var $techTbody = $('.project-tabs #tech-table tbody');
        var existingTech = [];
        $techTbody.find('tr').each(function () {
            existingTech.push($(this).find('.tech-input').val() || '');
        });

        $techTbody.empty();
        processes.forEach(function (name, index) {
            var techVal = existingTech[index] || '';
            var row = '<tr>' +
                '<td class="row-number">' + (index + 1) + '</td>' +
                '<td class="process-name">' + escapeHtml(name) + '</td>' +
                '<td><input type="text" class="form-input tech-input" placeholder="Teknologi yang digunakan" value="' + escapeHtml(techVal) + '"></td>' +
                '<td><button class="btn-icon tech-list-btn" title="Pilih dari daftar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button></td>' +
                '</tr>';
            $techTbody.append(row);
        });

        // Update smart processes — preserve existing checked state and reasons
        var $smartList = $('#smart-processes');
        var existingSmart = [];
        $smartList.find('.smart-process-item').each(function () {
            existingSmart.push({
                checked: $(this).find('.smart-check').is(':checked'),
                reason: $(this).find('.smart-reason input').val() || ''
            });
        });

        $smartList.empty();
        processes.forEach(function (name, index) {
            var isChecked = existingSmart[index] ? existingSmart[index].checked : false;
            var reason = existingSmart[index] ? existingSmart[index].reason : '';
            var checkedAttr = isChecked ? ' checked' : '';
            var reasonDisplay = isChecked ? '' : ' style="display:none;"';

            var item = '<div class="smart-process-item">' +
                '<label class="checkbox-item">' +
                '<input type="checkbox" class="smart-check"' + checkedAttr + '>' +
                '<span class="checkbox-label">' + escapeHtml(name) + '</span>' +
                '</label>' +
                '<div class="smart-reason"' + reasonDisplay + '>' +
                '<input type="text" class="form-input" placeholder="Alasan perlunya AI untuk proses ini" value="' + escapeHtml(reason) + '">' +
                '</div>' +
                '</div>';
            $smartList.append(item);
        });
    }

    // ===== TECH STACK PICKER =====
    var techStackData = {
        'Bahasa Pemrograman': ['Python', 'JavaScript', 'TypeScript', 'Java', 'Kotlin', 'Swift', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby', 'Dart', 'R', 'Scala', 'Julia'],
        'Frontend Framework': ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'Flutter', 'React Native', 'SwiftUI', 'Jetpack Compose'],
        'Backend Framework': ['Django', 'Flask', 'FastAPI', 'Express.js', 'NestJS', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET', 'Gin', 'Fiber'],
        'Database': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase Firestore', 'DynamoDB', 'Cassandra', 'Neo4j', 'Elasticsearch'],
        'Machine Learning': ['TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras', 'XGBoost', 'LightGBM', 'Hugging Face', 'OpenCV', 'YOLO', 'spaCy', 'NLTK'],
        'Cloud & Infrastructure': ['AWS', 'Google Cloud', 'Azure', 'Digital Ocean', 'Heroku', 'Vercel', 'Netlify', 'Railway', 'Supabase', 'Firebase'],
        'DevOps & Tools': ['Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'Terraform', 'Ansible', 'Nginx', 'Apache', 'PM2'],
        'Data Processing': ['Pandas', 'NumPy', 'Apache Spark', 'Apache Kafka', 'Airflow', 'dbt', 'Tableau', 'Power BI', 'Metabase'],
        'API & Communication': ['REST API', 'GraphQL', 'gRPC', 'WebSocket', 'RabbitMQ', 'MQTT', 'Twilio', 'SendGrid']
    };

    var currentTechInput = null;

    function renderTechPicker(filter) {
        var html = '';
        var filterLower = (filter || '').toLowerCase();
        var currentValues = [];
        if (currentTechInput) {
            currentValues = currentTechInput.val().split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        }

        Object.keys(techStackData).forEach(function (category) {
            var items = techStackData[category].filter(function (item) {
                return !filterLower || item.toLowerCase().indexOf(filterLower) !== -1;
            });

            if (items.length > 0) {
                var isOpen = filterLower ? ' open' : '';
                html += '<div class="tech-picker-category">';
                html += '<div class="tech-picker-category-title' + isOpen + '">' + category + '</div>';
                html += '<div class="tech-picker-items' + isOpen + '">';
                items.forEach(function (item) {
                    var checked = currentValues.indexOf(item) !== -1 ? ' checked' : '';
                    html += '<label class="tech-picker-item"><input type="checkbox" class="tech-check"' + checked + ' value="' + item + '"> ' + item + '</label>';
                });
                html += '</div></div>';
            }
        });

        $('#tech-picker-list').html(html || '<p style="padding:12px;color:#6b7280;font-size:13px;">Tidak ditemukan</p>');
    }

    $(document).on('click', '.tech-picker-category-title', function () {
        $(this).toggleClass('open');
        $(this).next('.tech-picker-items').toggleClass('open');
    });

    $(document).on('change', '.tech-check', function () {
        if (!currentTechInput) return;

        var val = $(this).val();
        var isChecked = $(this).is(':checked');

        var currentValues = currentTechInput.val().split(',').map(function (s) {
            return s.trim();
        }).filter(function (s) {
            return s;
        });

        if (isChecked) {
            if (currentValues.indexOf(val) === -1) {
                currentValues.push(val);
            }
        } else {
            var idx = currentValues.indexOf(val);
            if (idx !== -1) {
                currentValues.splice(idx, 1);
            }
        }

        currentTechInput.val(currentValues.join(', '));

        $('#tech-search').focus();
    });

    $(document).on('click', '.tech-list-btn', function (e) {
        e.stopPropagation();
        var $btn = $(this);
        var $row = $btn.closest('tr');
        currentTechInput = $row.find('.tech-input');

        var offset = $btn.offset();
        var $picker = $('#tech-picker');

        $picker.css({
            top: offset.top + $btn.outerHeight() + 4,
            left: offset.left - 252
        }).show();

        $('#tech-search').val('').focus();
        renderTechPicker('');
    });

    // Search filter
    $(document).on('input', '#tech-search', function () {
        renderTechPicker($(this).val());
    });

    // Close picker when clicking outside
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#tech-picker, .tech-list-btn').length) {
            $('#tech-picker').hide();
        }
    });

    // ===== SMART PROCESS CHECKBOXES - Show/Hide Reason =====
    $(document).on('change', '.smart-check', function () {
        var $reason = $(this).closest('.smart-process-item').find('.smart-reason');
        if ($(this).is(':checked')) {
            $reason.slideDown(200);
        } else {
            $reason.slideUp(200);
        }
    });

    // ===== SYNC FUNCTION NAMES TO COMBOBOXES =====
    function syncFuncSelects() {
        var functions = [];
        $('.project-tabs #functions-table tbody tr').each(function () {
            var name = $(this).find('td:nth-child(2) input').val();
            if (name && name.trim() !== '') {
                functions.push(name.trim());
            }
        });

        $('.func-select').each(function () {
            var currentVal = $(this).val();
            var options = '<option value="">Pilih Fungsi...</option>';
            functions.forEach(function (fn) {
                var selected = (fn === currentVal) ? ' selected' : '';
                options += '<option value="' + escapeHtml(fn) + '"' + selected + '>' + escapeHtml(fn) + '</option>';
            });
            $(this).html(options);
        });
    }

    // Trigger sync when function table inputs change
    $(document).on('input', '#functions-table td:nth-child(2) input', function () {
        syncFuncSelects();
        syncStatusTable();
    });

    // Also sync when rows are added/removed from functions table
    $(document).on('click', '[data-table="functions-table"]', function () {
        setTimeout(function () { syncFuncSelects(); syncStatusTable(); }, 100);
    });

    $(document).on('click', '#functions-table .btn-delete', function () {
        setTimeout(function () { syncFuncSelects(); syncStatusTable(); }, 100);
    });

    // Sync status table from functions
    function syncStatusTable() {
        var functions = [];
        $('.project-tabs #functions-table tbody tr').each(function () {
            var name = $(this).find('td:nth-child(2) input').val();
            if (name && name.trim() !== '') {
                functions.push(name.trim());
            }
        });

        var $tbody = $('.project-tabs #status-table tbody');
        // Preserve existing status and notes
        var existing = [];
        $tbody.find('tr').each(function () {
            existing.push({
                name: $(this).find('.module-name').text(),
                status: $(this).find('.status-select').val() || 'not_started',
                notes: $(this).find('input').val() || ''
            });
        });

        $tbody.empty();
        if (functions.length === 0) {
            var row = '<tr><td class="row-number">1</td><td class="module-name">-</td>' +
                '<td><select class="form-select status-select"><option value="not_started">Belum Mulai</option><option value="in_progress">In Progress</option><option value="done">Done</option><option value="blocked">Blocked</option></select></td>' +
                '<td><input type="text" class="form-input optional-input" placeholder="Catatan tambahan"></td></tr>';
            $tbody.append(row);
        } else {
            functions.forEach(function (fn, index) {
                // Find existing data for this function
                var match = existing.find(function (e) { return e.name === fn; });
                var status = match ? match.status : 'not_started';
                var notes = match ? match.notes : '';

                var row = '<tr><td class="row-number">' + (index + 1) + '</td><td class="module-name">' + escapeHtml(fn) + '</td>' +
                    '<td><select class="form-select status-select">' +
                    '<option value="not_started"' + (status === 'not_started' ? ' selected' : '') + '>Belum Mulai</option>' +
                    '<option value="in_progress"' + (status === 'in_progress' ? ' selected' : '') + '>In Progress</option>' +
                    '<option value="done"' + (status === 'done' ? ' selected' : '') + '>Done</option>' +
                    '<option value="blocked"' + (status === 'blocked' ? ' selected' : '') + '>Blocked</option>' +
                    '</select></td>' +
                    '<td><input type="text" class="form-input optional-input" placeholder="Catatan tambahan" value="' + escapeHtml(notes) + '"></td></tr>';
                $tbody.append(row);
            });
        }
        calculateProgress();
    }

    // ===== PROGRESS CALCULATION from Status Table =====
    $(document).on('change', '#status-table .status-select', function () {
        calculateProgress();
    });

    function calculateProgress() {
        var total = 0;
        var done = 0;
        var inProgress = 0;
        var notStarted = 0;
        var blocked = 0;

        $('#status-table tbody tr').each(function () {
            var status = $(this).find('.status-select').val();
            total++;
            switch (status) {
                case 'done':
                    done++;
                    break;
                case 'in_progress':
                    inProgress++;
                    break;
                case 'not_started':
                    notStarted++;
                    break;
                case 'blocked':
                    blocked++;
                    break;
            }
        });

        var percentage = total > 0 ? Math.round((done / total) * 100) : 0;

        $('#creation-progress').css('width', percentage + '%');
        $('#creation-percentage').text(percentage + '%');

        $('#creation-stats').html(
            '<span class="stat-item stat-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Done: ' + done + '</span>' +
            '<span class="stat-item stat-progress"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Progress: ' + inProgress + '</span>' +
            '<span class="stat-item stat-pending"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg> Belum: ' + notStarted + '</span>' +
            '<span class="stat-item stat-blocked"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> Blocked: ' + blocked + '</span>'
        );
    }

    // ===== PREVIOUS / NEXT TAB NAVIGATION =====
    var tabOrder = ['objectives', 'experiences', 'implementation', 'creation', 'orchestration'];

    function getCurrentTabIndex() {
        var activeTab = $('.tab-btn.active').data('tab');
        return tabOrder.indexOf(activeTab);
    }

    function updateHighestUnlockedTab(index) {
        var $input = $('#highest-unlocked-index');
        if ($input.length === 0) {
            $input = $('<input type="hidden" id="highest-unlocked-index" value="0">');
            $('.tabs-content').prepend($input);
        }
        var currentHighest = parseInt($input.val()) || 0;
        if (index > currentHighest) {
            $input.val(index).attr('value', index);
            if (!window.isDirty) {
                window.isDirty = true;
                window.updateSaveButtonState();
            }
        }
    }

    function updateStepperStatus() {
        var highest = parseInt($('#highest-unlocked-index').val()) || 0;
        var activeTabId = $('.tab-btn.active').data('tab');

        $('.step-item').each(function () {
            var tabId = $(this).data('tab');
            var tabIdx = tabOrder.indexOf(tabId);

            var $circle = $(this).find('.step-circle');
            var $line = $(this).find('.step-line');
            var $label = $(this).find('.step-label');
            var $iconCompleted = $(this).find('.icon-completed');
            var $iconActive = $(this).find('.icon-active');
            var $iconDisabled = $(this).find('.icon-disabled');
            var $iconPending = $(this).find('.icon-pending');

            // Reset all inline styles
            $circle.css({ 'border-color': '', 'background-color': '', 'box-shadow': '', 'transform': '' });
            $line.css('background-color', '');
            $label.css({ 'color': '', 'font-weight': '' });
            $iconCompleted.css({ 'display': '', 'stroke': '' });
            $iconActive.css({ 'display': '', 'fill': '' });
            $iconDisabled.css({ 'display': '' });
            if ($iconPending.length) $iconPending.css({ 'display': '' });

            // Center icons with absolute positioning
            var centerCss = {
                'position': 'absolute',
                'top': '50%',
                'left': '50%',
                'transform': 'translate(-50%, -50%)',
                'margin': '0'
            };
            $iconCompleted.css(centerCss);
            $iconActive.css(centerCss);
            $iconDisabled.css(centerCss);
            if ($iconPending.length) $iconPending.css(centerCss);

            var isDisabled = $(this).hasClass('disabled');
            var isActive = (tabId === activeTabId);
            var isCompleted = false;
            if (typeof PROJECT_STATUS !== 'undefined' && PROJECT_STATUS.toLowerCase() === 'completed') {
                isCompleted = true;
            } else if (tabIdx < highest) {
                isCompleted = true;
            }

            if (isCompleted) {
                $(this).addClass('completed');
                // CSS handles green styling via .completed class
                // Force inline for reliability
                $circle.css({ 'background-color': '#4caf50', 'border-color': '#4caf50' });
                $line.css('background-color', '#4caf50');
                $label.css({ 'color': '#4caf50', 'font-weight': '600' });
                $iconCompleted.css({ 'display': 'block', 'stroke': 'white' });
                $iconActive.css({ 'display': 'none' });
                $iconDisabled.css({ 'display': 'none' });
                if ($iconPending.length) $iconPending.css({ 'display': 'none' });

                // If also active — keep green but add glowing ring
                if (isActive) {
                    $circle.css({
                        'background-color': '#4caf50', 'border-color': '#4caf50',
                        'box-shadow': '0 0 0 4px rgba(76,175,80,0.2)', 'transform': 'scale(1.1)'
                    });
                    $line.css('background-color', '#4caf50');
                    $label.css({ 'color': '#4caf50' });
                    $iconCompleted.css({ 'display': 'block', 'stroke': 'white' });
                    $iconActive.css({ 'display': 'none' });
                }
            } else {
                $(this).removeClass('completed');
                if (isDisabled) {
                    $iconCompleted.css({ 'display': 'none' });
                    $iconActive.css({ 'display': 'none' });
                    if ($iconPending.length) $iconPending.css({ 'display': 'none' });
                    $iconDisabled.css({ 'display': 'block', 'stroke': '#9ca3af', 'fill': 'none' });
                } else if (isActive) {
                    // Active but not completed — blue solid circle with pencil icon
                    $circle.css({
                        'background-color': 'var(--color-accent)', 'border-color': 'var(--color-accent)',
                        'box-shadow': '0 0 0 4px rgba(67,97,238,0.15)', 'transform': 'scale(1.1)'
                    });
                    $line.css('background-color', 'var(--color-accent)');
                    $label.css({ 'color': 'var(--color-accent)', 'font-weight': '600' });
                    $iconCompleted.css({ 'display': 'none' });
                    $iconActive.css({ 'display': 'block', 'stroke': 'white', 'fill': 'none' });
                    $iconDisabled.css({ 'display': 'none' });
                    if ($iconPending.length) $iconPending.css({ 'display': 'none' });
                } else {
                    // Default pending icon (ellipsis) for unlocked but incomplete tabs
                    $iconCompleted.css({ 'display': 'none' });
                    $iconActive.css({ 'display': 'none' });
                    $iconDisabled.css({ 'display': 'none' });
                    if ($iconPending.length) {
                        $iconPending.css({ 'display': 'block', 'stroke': 'var(--color-gray)' });
                    } else {
                        $iconCompleted.css({ 'display': 'block', 'stroke': 'var(--color-gray)' });
                    }
                }
            }
        });
    }

    function switchToTab(index) {
        if (index >= 0 && index < tabOrder.length) {
            var tabId = tabOrder[index];
            var $btn = $('.tab-btn[data-tab="' + tabId + '"]');

            // Remove disabled class to unlock it permanently
            $btn.removeClass('disabled');

            $('.tab-btn').removeClass('active');
            $btn.addClass('active');

            $('.tab-panel').removeClass('active');
            $('#tab-' + tabId).addClass('active');

            updateTabNavigation();

            updateHighestUnlockedTab(index);
            updateStepperStatus();

            // Scroll to top of tabs
            $('html, body').animate({
                scrollTop: $('.project-tabs').offset().top - 80
            }, 300);
        }
    }

    // ===== REVIEW & TAB DISABLE LOGIC =====
    var tabsUnlocked = false;
    if (SERVER_HTML_DRAFT && SERVER_HTML_DRAFT.trim() !== "") {
        // Only unlock if the draft explicitly contains the true value for ic-submitted
        tabsUnlocked = SERVER_HTML_DRAFT.indexOf('id="ic-submitted"') !== -1 && SERVER_HTML_DRAFT.indexOf('value="true"') !== -1;
    }

    if (typeof PROJECT_STATUS !== 'undefined' && PROJECT_STATUS.toLowerCase() === 'completed') {
        tabsUnlocked = true;
    }

    if (tabsUnlocked) {
        $('.tab-btn[data-tab="creation"]').removeClass('disabled');
    }

    function getTabSnapshot(tabId) {
        var $tab = $('#tab-' + tabId);
        if (!$tab.length) return '';
        var vals = [];
        $tab.find('input:not([type="hidden"]), textarea, select').each(function () {
            if ($(this).is(':checkbox') || $(this).is(':radio')) {
                vals.push($(this).prop('checked') ? '1' : '0');
            } else if ($(this).attr('type') !== 'file') {
                vals.push($(this).val() || '');
            }
        });

        $tab.find('.upload-file-item .file-name').each(function () {
            vals.push($(this).text().trim());
        });

        return vals.join('|');
    }

    function updateSubmittedState() {
        var state = {
            'objectives': getTabSnapshot('objectives'),
            'experiences': getTabSnapshot('experiences'),
            'implementation': getTabSnapshot('implementation')
        };
        $('#ic-submitted-state').val(JSON.stringify(state)).attr('value', JSON.stringify(state));
    }

    function isFormFullyFilled() {
        var objMissing = [];
        var $objPanel = $('#tab-objectives .obj-tabs-content:first .obj-tab-panel').first();
        if ($objPanel.length) {
            if (!$objPanel.find('textarea').eq(0).val().trim() || !$objPanel.find('textarea').eq(1).val().trim() || !$objPanel.find('textarea').eq(2).val().trim()) objMissing.push(1);
        }
        var hasLeading = false;
        $('#leading-table tbody tr').each(function () { if ($(this).find('td:nth-child(2) input').val() && $(this).find('td:nth-child(2) input').val().trim()) hasLeading = true; });
        if (!hasLeading) objMissing.push(1);
        var $outPanel = $('#outcome-tabs-content .obj-tab-panel').first();
        if ($outPanel.length) {
            if (!$outPanel.find('textarea').eq(0).val().trim() || !$outPanel.find('textarea').eq(1).val().trim() || !$outPanel.find('textarea').eq(2).val().trim()) objMissing.push(1);
        }
        var $propPanel = $('#property-tabs-content .obj-tab-panel').first();
        if ($propPanel.length) {
            if (!$propPanel.find('textarea').eq(0).val().trim() || !$propPanel.find('textarea').eq(1).val().trim() || !$propPanel.find('textarea').eq(2).val().trim()) objMissing.push(1);
        }

        var expFilled = $('#tab-experiences .checkbox-group input:checked').length > 0;
        var hasFunction = false;
        $('#functions-table tbody tr').each(function () { if ($(this).find('td:nth-child(2) input').val().trim()) hasFunction = true; });
        var hasMinError = false;
        $('#error-minimization tbody tr, #error-minimization .list-item').each(function () { if ($(this).find('.func-select').val() && $(this).find('input[type="text"]').val().trim()) hasMinError = true; });
        var hasDataPlan = false;
        $('#data-collection tbody tr, #data-collection .list-item').each(function () { if ($(this).find('.func-select').val() && $(this).find('input[type="text"]').val().trim()) hasDataPlan = true; });

        var hasProcess = false;
        $('#process-table tbody tr').each(function () { if ($(this).find('.process-name-input').val().trim()) hasProcess = true; });
        var allTechFilled = false;
        var hasProcForTech = false;
        $('#tech-table tbody tr').each(function () {
            var procName = $(this).find('.process-name').text().trim();
            var techVal = $(this).find('.tech-input').val().trim();
            if (procName && procName !== '-') {
                hasProcForTech = true;
                if (techVal) allTechFilled = true;
            }
        });
        if (!hasProcForTech) allTechFilled = true;

        // Auto-fill empty ones with "-" if at least one is filled
        if (allTechFilled && hasProcForTech) {
            $('#tech-table tbody tr').each(function () {
                var procName = $(this).find('.process-name').text().trim();
                var $techInput = $(this).find('.tech-input');
                if (procName && procName !== '-' && !$techInput.val().trim()) {
                    $techInput.val('-');
                }
            });
        }
        var hasSmart = false;
        $('#smart-processes .smart-process-item').each(function () {
            if ($(this).find('.smart-check').is(':checked') && $(this).find('.smart-reason input').val().trim()) hasSmart = true;
        });

        return objMissing.length === 0 && expFilled && hasFunction && hasMinError && hasDataPlan && hasProcess && allTechFilled && hasSmart;
    }

    function checkTabChanges() {
        if ($('#nav-save-text').length) {
            $('#nav-save-text').text('Simpan');
        }
    }

    function updateTabNavigation() {
        var currentIndex = getCurrentTabIndex();

        // Ensure stepper visual styles are synced
        if (typeof updateStepperStatus === 'function') {
            updateStepperStatus();
        }

        // Update step indicator
        $('#current-step').text(currentIndex + 1);

        // Show/hide prev button
        if (currentIndex === 0) {
            $('#prev-tab').hide();
        } else {
            $('#prev-tab').show();
        }

        // Show Blueprint button if project is completed (finalized)
        if (typeof PROJECT_STATUS !== 'undefined' && PROJECT_STATUS.toLowerCase() === 'completed') {
            $('#btn-lihat-blueprint').css('display', 'flex');
        } else {
            $('#btn-lihat-blueprint').hide();
        }

        // Handle Review Update button dynamically based on changes
        checkTabChanges();

        // Update next button
        if (currentIndex >= 4) {
            $('#next-tab').hide();
            $('#final-review-btn').show(); // Show finalisasi proyek
        } else {
            $('#next-tab').text('Selanjutnya \u2192').show();
            $('#final-review-btn').hide();
        }
    }

    function validateTab(index) {
        if (index < 0 || index >= tabOrder.length) return true;
        var tabId = tabOrder[index];
        var $tabPanel = $('#tab-' + tabId);
        var isValid = true;

        if (tabId === 'implementation') {
            var hasTech = false;
            $('#tech-table .tech-input').each(function () {
                if ($.trim($(this).val()) && $.trim($(this).val()) !== '-') hasTech = true;
            });
            if (hasTech) {
                $('#tech-table .tech-input').each(function () {
                    if (!$.trim($(this).val())) {
                        $(this).val('-');
                        $(this).css('border-color', '').removeClass('is-invalid');
                    }
                });
            }
        }

        function validateInputs($inputs) {
            // Only validate visible inputs (ignore hidden elements or elements in hidden containers)
            var $visibleInputs = $inputs.filter(':visible').not('.optional-input');

            var $checkboxes = $visibleInputs.filter('input[type="checkbox"]');
            var $others = $visibleInputs.not('input[type="checkbox"]');

            if ($checkboxes.length > 0) {
                var isAnyChecked = $checkboxes.is(':checked');
                var $container = $checkboxes.closest('.checkbox-group, .smart-process-list');

                if (!isAnyChecked) {
                    $container.css({
                        'border': '1px solid var(--color-error)',
                        'border-radius': '8px',
                        'padding': '8px'
                    }).addClass('is-invalid');
                    isValid = false;
                } else {
                    $container.css({
                        'border': '',
                        'border-radius': '',
                        'padding': ''
                    }).removeClass('is-invalid');
                }
            }

            if ($others.length > 0) {
                $others.each(function () {
                    if ($.trim($(this).val()) === '') {
                        if ($(this).attr('placeholder') === 'Catatan tambahan') {
                            $(this).val('-');
                            $(this).css('border-color', '').removeClass('is-invalid');
                        } else {
                            $(this).css('border-color', 'var(--color-error)').addClass('is-invalid');
                            isValid = false;
                        }
                    } else {
                        $(this).css('border-color', '').removeClass('is-invalid');
                    }
                });
            }
        }

        // Validate form-label fields
        $tabPanel.find('label.form-label').each(function () {
            var $label = $(this);
            if ($label.find('span.required').length > 0) {
                var $input = $label.next('input, textarea, select');
                if ($input.length === 0) {
                    $input = $label.parent().find('input, textarea, select');
                }
                if ($input.length > 0) {
                    validateInputs($input);
                }
            }
        });

        // Validate h3 header fields
        $tabPanel.find('h3').each(function () {
            var $h3 = $(this);
            if ($h3.find('span.required').length > 0) {
                var $input = $h3.next('input, textarea, select');
                if ($input.length === 0) {
                    $input = $h3.closest('.form-section').find('input[type!="hidden"], textarea, select');
                }
                if ($input.length > 0) {
                    validateInputs($input);
                }
            }
        });

        $tabPanel.find('input, textarea, select').on('input change', function () {
            $(this).css('border-color', '');
            if ($(this).is(':checkbox')) {
                $(this).closest('.checkbox-group, .smart-process-list').css({
                    'border': '',
                    'border-radius': '',
                    'padding': ''
                });
            }
        });

        return isValid;
    }

    // Override next button click for Review
    $(document).on('click', '#next-tab', function () {
        var currentIndex = getCurrentTabIndex();

        if (!validateTab(currentIndex)) {
            // Optional: you can show a toast or alert instead
            if ($('#custom-error-toast').length === 0) {
                $('body').append('<div id="custom-error-toast" style="display:none; position:fixed; bottom:24px; right:24px; top:auto; background:var(--color-error); color:white; padding:12px 24px; border-radius:8px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.1); font-weight:500;">Harap isi semua kolom yang wajib diisi (*) sebelum melanjutkan.</div>');
            }
            $('#custom-error-toast').fadeIn(300);
            setTimeout(function () { $('#custom-error-toast').fadeOut(300); }, 3000);

            // Scroll to the first invalid element
            var $firstInvalid = $('.is-invalid').first();
            if ($firstInvalid.length > 0) {
                $('html, body').animate({ scrollTop: $firstInvalid.offset().top - 120 }, 300);
            }

            return;
        }
        switchToTab(currentIndex + 1);
    });

    function buildTabs123ReviewContent() {
        // Empty cloned content first to prevent ID collisions during validation
        $('#review-final-cloned-content').empty();

        var allFilled = true;
        var missingErrors = [];

        // === 1. Objectives Validation ===
        var objMissing = [];

        // Organizational Objectives
        var $objPanel = $('#tab-objectives .obj-tabs-content:first .obj-tab-panel').first();
        if ($objPanel.length) {
            var parts = [];
            var sels = [];
            var pid = '#' + $objPanel.attr('id');
            if (!$objPanel.find('textarea').eq(0).val().trim()) { parts.push('Tujuan utama'); sels.push(pid + ' textarea:eq(0)'); }
            if (!$objPanel.find('textarea').eq(1).val().trim()) { parts.push('Cara mencapai'); sels.push(pid + ' textarea:eq(1)'); }
            if (!$objPanel.find('textarea').eq(2).val().trim()) { parts.push('Cara mengukur'); sels.push(pid + ' textarea:eq(2)'); }
            if (parts.length > 0) {
                var text = parts.length === 3 ? 'Semua isian Tujuan Organisasi (Tujuan, Cara mencapai, & Cara mengukur) belum diisi' : parts.join(', ').replace(/, ([^,]*)$/, ' dan $1') + ' Organisasi belum diisi';
                objMissing.push({ text: text, tab: 0, selector: sels.join(', ') });
            }
        }

        // Leading Indicators
        var hasLeading = false;
        $('#leading-table tbody tr').each(function () {
            if ($(this).find('td:nth-child(2) input').val() && $(this).find('td:nth-child(2) input').val().trim()) hasLeading = true;
        });
        if (!hasLeading) objMissing.push({ text: 'Leading Indicators belum diisi (minimal 1 fitur)', tab: 0, selector: '#leading-table' });

        // User Outcomes
        var $outPanel = $('#outcome-tabs-content .obj-tab-panel').first();
        if ($outPanel.length) {
            var parts2 = [];
            var sels2 = [];
            var pid2 = '#' + $outPanel.attr('id');
            if (!$outPanel.find('textarea').eq(0).val().trim()) { parts2.push('Manfaat pengguna'); sels2.push(pid2 + ' textarea:eq(0)'); }
            if (!$outPanel.find('textarea').eq(1).val().trim()) { parts2.push('Cara mencapai'); sels2.push(pid2 + ' textarea:eq(1)'); }
            if (!$outPanel.find('textarea').eq(2).val().trim()) { parts2.push('Cara mengukur'); sels2.push(pid2 + ' textarea:eq(2)'); }
            if (parts2.length > 0) {
                var text2 = parts2.length === 3 ? 'Semua isian User Outcome (Manfaat, Cara mencapai, & Cara mengukur) belum diisi' : parts2.join(', ').replace(/, ([^,]*)$/, ' dan $1') + ' (User Outcome) belum diisi';
                objMissing.push({ text: text2, tab: 0, selector: sels2.join(', ') });
            }
        }

        // Model Properties
        var $propPanel = $('#property-tabs-content .obj-tab-panel').first();
        if ($propPanel.length) {
            var parts3 = [];
            var sels3 = [];
            var pid3 = '#' + $propPanel.attr('id');
            if (!$propPanel.find('textarea').eq(0).val().trim()) { parts3.push('Sifat model AI'); sels3.push(pid3 + ' textarea:eq(0)'); }
            if (!$propPanel.find('textarea').eq(1).val().trim()) { parts3.push('Cara mencapai'); sels3.push(pid3 + ' textarea:eq(1)'); }
            if (!$propPanel.find('textarea').eq(2).val().trim()) { parts3.push('Cara mengukur'); sels3.push(pid3 + ' textarea:eq(2)'); }
            if (parts3.length > 0) {
                var text3 = parts3.length === 3 ? 'Semua isian Model Property (Sifat AI, Cara mencapai, & Cara mengukur) belum diisi' : parts3.join(', ').replace(/, ([^,]*)$/, ' dan $1') + ' (Model Property) belum diisi';
                objMissing.push({ text: text3, tab: 0, selector: sels3.join(', ') });
            }
        }

        if (objMissing.length > 0) {
            allFilled = false;
            missingErrors.push({ section: '1. Meaningful Objectives', errors: objMissing });
        }

        // === 2. Experiences Validation ===
        var hasPresentation = $('#tab-experiences .checkbox-group input:checked').length > 0;
        var hasFunction = false;
        $('#functions-table tbody tr').each(function () {
            if ($(this).find('td:nth-child(2) input').val().trim()) hasFunction = true;
        });
        var hasMinError = false;
        $('#error-minimization tbody tr, #error-minimization .list-item').each(function () {
            var func = $(this).find('.func-select').val();
            var text = $(this).find('input[type="text"]').val().trim();
            if (func && text) hasMinError = true;
        });
        var hasDataPlan = false;
        $('#data-collection tbody tr, #data-collection .list-item').each(function () {
            var func = $(this).find('.func-select').val();
            var text = $(this).find('input[type="text"]').val().trim();
            if (func && text) hasDataPlan = true;
        });

        var expFilled = hasPresentation && hasFunction && hasMinError && hasDataPlan;
        if (!expFilled) {
            allFilled = false;
            var expMissing = [];
            if (!hasPresentation) expMissing.push({ text: 'Penyajian Kecerdasan (pilih minimal 1)', tab: 1, selector: '#tab-experiences .checkbox-group' });
            if (!hasFunction) expMissing.push({ text: 'Fungsi-fungsi (minimal 1 nama fungsi)', tab: 1, selector: '#functions-table' });
            if (!hasMinError) expMissing.push({ text: 'Minimalisasi Kesalahan (pilih fungsi + isi strategi)', tab: 1, selector: '#error-minimization' });
            if (!hasDataPlan) expMissing.push({ text: 'Pengumpulan Data (pilih fungsi + isi rencana)', tab: 1, selector: '#data-collection' });
            missingErrors.push({ section: '2. Intelligence Experiences', errors: expMissing });
        }

        // === 3. Implementation Validation ===
        var hasProcess = false;
        $('#process-table tbody tr').each(function () {
            if ($(this).find('.process-name-input').val().trim()) hasProcess = true;
        });
        var allTechFilled = false;
        var hasProcForTech = false;
        $('#tech-table tbody tr').each(function () {
            var procName = $(this).find('.process-name').text().trim();
            var techVal = $(this).find('.tech-input').val().trim();
            if (procName && procName !== '-') {
                hasProcForTech = true;
                if (techVal) allTechFilled = true;
            }
        });
        if (!hasProcForTech) allTechFilled = true;
        var hasSmart = false;
        $('#smart-processes .smart-process-item').each(function () {
            if ($(this).find('.smart-check').is(':checked') && $(this).find('.smart-reason input').val().trim()) {
                hasSmart = true;
            }
        });

        var implFilled = hasProcess && allTechFilled && hasSmart;
        if (!implFilled) {
            allFilled = false;
            var implMissing = [];
            if (!hasProcess) implMissing.push({ text: 'Proses Bisnis (minimal 1 nama proses)', tab: 2, selector: '#process-table' });
            if (!allTechFilled) implMissing.push({ text: 'Teknologi per Proses (minimal 1 teknologi harus diisi)', tab: 2, selector: '#tech-table' });
            if (!hasSmart) implMissing.push({ text: 'Identifikasi Proses Cerdas (centang minimal 1 + isi alasan)', tab: 2, selector: '#smart-processes' });
            missingErrors.push({ section: '3. Intelligence Implementation', errors: implMissing });
        }

        // === Render Validation Errors ===
        var $errorsContainer = $('#review-final-validation-errors');
        $errorsContainer.empty();
        if (missingErrors.length > 0) {
            var errorHtml = '<div class="review-missing-alert" style="background:#fee2e2; border:1px solid #ef4444; color:#b91c1c; padding:16px; border-radius:8px; margin-bottom:24px;">' +
                '<h4 style="margin:0 0 12px 0; font-size:15px;">Data Belum Lengkap:</h4><ul style="margin:0; padding-left:20px;">';
            missingErrors.forEach(function (item) {
                errorHtml += '<li style="margin-bottom:12px;"><strong>' + item.section + '</strong><ul style="margin-top:6px; padding-left:20px; list-style-type:circle;">';
                item.errors.forEach(function (err) {
                    errorHtml += '<li style="margin-bottom: 6px;"><a href="#" class="fix-error-link" data-tab="' + err.tab + '" data-selector="' + err.selector + '" style="color:#b91c1c; text-decoration:underline; font-weight:500; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">' + err.text + ' &rarr;</a></li>';
                });
                errorHtml += '</ul></li>';
            });
            errorHtml += '</ul></div>';
            $errorsContainer.html(errorHtml);
        }

        // === Clone Content ===
        var $clonedContent = $('#review-final-cloned-content');

        var sources = [
            { id: '#tab-objectives', title: '1. Meaningful Objectives' },
            { id: '#tab-experiences', title: '2. Intelligence Experiences' },
            { id: '#tab-implementation', title: '3. Intelligence Implementation' }
        ];

        sources.forEach(function (src) {
            var $original = $(src.id);
            var $clone = $original.clone();

            // Sync values from original to clone
            var $origInputs = $original.find('input, textarea, select');
            var $cloneInputs = $clone.find('input, textarea, select');

            $origInputs.each(function (index) {
                var type = this.type || this.tagName.toLowerCase();
                if (type === 'checkbox' || type === 'radio') {
                    $cloneInputs.eq(index).prop('checked', $(this).prop('checked'));
                } else if (type !== 'file') {
                    $cloneInputs.eq(index).val($(this).val());
                }
            });

            // Remove interactive elements
            $clone.find('.btn-add, .btn-delete, .leading-col-delete, .tech-list-btn, .obj-tab-add').remove();
            $clone.find('.upload-dropzone, .example-link, .form-hint, .leading-toolbar, .obj-tab-close').remove();

            // Disable all form elements EXCEPT tab buttons (so tabs can still be clicked)
            $clone.find('button').not('.obj-tab-btn').prop('disabled', true);
            $clone.find('input[type="checkbox"], input[type="radio"]').prop('disabled', true);

            // Replace text inputs, date inputs, and textareas with div for better readable layout
            $clone.find('input[type="text"], input[type="date"], textarea').each(function () {
                var val = escapeHtml($(this).val() || '');
                var isTextarea = $(this).is('textarea');

                // Strip form-textarea and form-input so cached CSS !important doesn't hide our inline styles
                var origClass = ($(this).attr('class') || '').replace(/form-textarea/g, '').replace(/form-input/g, '');
                var className = origClass + ' readonly-text';

                var inTable = $(this).closest('table').length > 0;

                var cssProps = {
                    'min-height': isTextarea ? '80px' : 'auto',
                    'word-break': 'break-word',
                    'white-space': 'normal',
                    'overflow-wrap': 'break-word',
                    'padding': '12px 16px',
                    'border-radius': 'var(--radius)'
                };

                if (!inTable) {
                    cssProps['background-color'] = 'var(--color-gray-light)';
                    cssProps['border'] = '1px solid var(--color-border)';
                } else {
                    cssProps['background-color'] = 'transparent';
                    cssProps['border'] = 'none';
                    cssProps['padding'] = '8px'; // Less padding for table
                }

                var $div = $('<div></div>')
                    .addClass(className)
                    .html(val.replace(/\n/g, '<br>'))
                    .css(cssProps);
                $(this).replaceWith($div);
            });

            // Replace selects with div
            $clone.find('select').each(function () {
                var val = escapeHtml($(this).find('option:selected').text() || '');
                var origClass = ($(this).attr('class') || '').replace(/form-select/g, '');
                var className = origClass + ' readonly-text';

                var inTable = $(this).closest('table').length > 0;

                var cssProps = {
                    'word-break': 'break-word',
                    'white-space': 'normal',
                    'overflow-wrap': 'break-word',
                    'padding': '12px 16px',
                    'border-radius': 'var(--radius)'
                };

                if (!inTable) {
                    cssProps['background-color'] = 'var(--color-gray-light)';
                    cssProps['border'] = '1px solid var(--color-border)';
                } else {
                    cssProps['background-color'] = 'transparent';
                    cssProps['border'] = 'none';
                    cssProps['padding'] = '8px';
                }

                var $div = $('<div></div>')
                    .addClass(className)
                    .text(val)
                    .css(cssProps);
                $(this).replaceWith($div);
            });

            // Hide empty upload sections completely
            $clone.find('.upload-area').each(function () {
                var hasFiles = $(this).find('.upload-file-item').length > 0;
                if (!hasFiles) {
                    $(this).closest('.form-section').remove();
                } else {
                    // Remove file delete buttons from existing items
                    $(this).find('.file-remove').remove();
                }
            });

            // Fix cloned Sub-tabs ID Duplication so they work in review mode
            $clone.find('.obj-tab-btn').each(function () {
                var oldObjId = $(this).attr('data-obj');
                if (oldObjId) {
                    $(this).attr('data-obj', oldObjId + '-review');
                }
            });
            $clone.find('.obj-tab-panel').each(function () {
                var oldId = $(this).attr('id');
                if (oldId) {
                    $(this).attr('id', oldId + '-review');
                }
            });

            // Clean up empty table columns/rows (Action columns)
            $clone.find('.leading-th-action, .leading-row-delete-cell').remove();
            $clone.find('table.dynamic-table').each(function () {
                var $lastCol = $(this).find('colgroup col:last-child');
                if ($lastCol.attr('style') && $lastCol.attr('style').indexOf('48px') !== -1) {
                    $lastCol.remove();
                }
                var $lastTh = $(this).find('thead th:last-child');
                if ($lastTh.text().trim() === '' && $lastTh.children().length === 0) {
                    $lastTh.remove();
                }
                $(this).find('tbody tr').each(function () {
                    var $lastTd = $(this).find('td:last-child');
                    if ($lastTd.find('.btn-delete, .tech-list-btn').length > 0 || $lastTd.is(':empty')) {
                        $lastTd.remove();
                    }
                });
            });

            // Ensure the first sub-tab is always active in the review clone
            $clone.find('.obj-tabs').each(function () {
                $(this).find('.obj-tab-btn').removeClass('active');
                $(this).find('.obj-tab-panel').removeClass('active');
                $(this).find('.obj-tab-btn:first').addClass('active');
                $(this).find('.obj-tab-panel:first').addClass('active');
            });

            // Add a section header
            var $section = $('<div class="review-cloned-section" style="margin-bottom:48px;"></div>');
            $section.append('<h2 style="font-size:20px; font-weight:600; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--color-border); color:var(--color-accent);">' + src.title + '</h2>');

            // Ensure clone is visible
            $clone.show().addClass('active').css({ 'display': 'block', 'padding': '0', 'border': 'none', 'background': 'transparent' });
            $section.append($clone);

            $clonedContent.append($section);
        });

        return { allFilled: allFilled, missingErrors: missingErrors };
    }

    // Review sub-tab switching
    $(document).on('click', '.review-subtab', function () {
        var panelId = $(this).data('review-panel');
        var $nav = $(this).closest('.review-subtabs-nav');
        var $content = $nav.next('.review-subtabs-content');

        $nav.find('.review-subtab').removeClass('active');
        $(this).addClass('active');
        $content.find('.review-subpanel').removeClass('active');
        $('#' + panelId).addClass('active');
    });

    // Dynamically track form changes across tabs
    var changeTimeout;
    function triggerCheckTabChanges() {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(checkTabChanges, 100);
    }

    $(document).on('input change', '.tabs-content input, .tabs-content textarea, .tabs-content select', triggerCheckTabChanges);

    // Track structural changes (e.g. adding/deleting rows)
    var tabsObserver = new MutationObserver(triggerCheckTabChanges);
    var tabsContentNode = document.querySelector('.tabs-content');
    if (tabsContentNode) {
        tabsObserver.observe(tabsContentNode, { childList: true, subtree: true });
    }

    // Sync status table from functions
    syncStatusTable();

    $(document).on('click', '#prev-tab', function () {
        var currentIndex = getCurrentTabIndex();
        switchToTab(currentIndex - 1);
    });

    // Initialize navigation state on page load
    updateTabNavigation();

    // ===== FILE UPLOAD PREVIEW =====
    $(document).on('change', '.upload-input', function () {
        var $dropzone = $(this).closest('.upload-dropzone');
        var $preview = $dropzone.siblings('.upload-preview');
        var files = this.files;

        if (typeof SERVER_PROJECT_ID === 'undefined' || files.length === 0) return;

        var file = files[0]; // Handle one file for now
        var fileSize = (file.size / 1024 / 1024).toFixed(2);
        var isImage = file.type.startsWith('image/');
        var isPdf = file.type === 'application/pdf';

        // Show loading indicator
        var $loading = $('<div class="upload-file-item" style="padding:8px 12px; border-radius:6px; margin-top:8px; text-align:center; color:#6b7280; font-size:13px;">Meng-upload file...</div>');
        $preview.append($loading);

        var formData = new FormData();
        formData.append('file', file);

        $.ajax({
            url: (typeof SCRIPT_PREFIX !== 'undefined' ? SCRIPT_PREFIX : '') + '/projects/' + SERVER_PROJECT_ID + '/upload_file/',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (res) {
                $loading.remove();
                if (res.status === 'success') {
                    var fileUrl = res.file_url;
                    var thumbnail = '';
                    var previewLink = '';

                    if (isImage) {
                        thumbnail = '<img src="' + fileUrl + '" style="height:24px; width:24px; object-fit:cover; border-radius:4px; margin-right:8px; display:inline-block; vertical-align:middle;">';
                        previewLink = '<a href="' + fileUrl + '" target="_blank" class="file-preview-link" title="Lihat Gambar" style="margin-left:12px; color:var(--color-accent); font-size:13px; font-weight:500; text-decoration:none;">👁️ Lihat</a>';
                    } else if (isPdf) {
                        thumbnail = '<span class="file-icon" style="color:#ef4444; margin-right:8px; font-size:16px;">📄</span>';
                        previewLink = '<a href="' + fileUrl + '" target="_blank" class="file-preview-link" title="Buka PDF" style="margin-left:12px; color:var(--color-accent); font-size:13px; font-weight:500; text-decoration:none;">👁️ Buka</a>';
                    } else {
                        thumbnail = '<span class="file-icon" style="margin-right:8px;">&#9679;</span>';
                        previewLink = '<a href="' + fileUrl + '" target="_blank" class="file-preview-link" title="Download File" style="margin-left:12px; color:var(--color-accent); font-size:13px; font-weight:500; text-decoration:none;">⬇️ Unduh</a>';
                    }

                    var fileItem = '<div class="upload-file-item" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:6px; margin-top:8px;">' +
                        '<div style="display:flex; align-items:center; overflow:hidden;">' +
                        thumbnail +
                        '<span class="file-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">' + escapeHtml(file.name) + '</span>' +
                        '</div>' +
                        '<div style="display:flex; align-items:center;">' +
                        '<span class="file-size" style="color:#6b7280; font-size:13px; margin-left:8px;">(' + fileSize + ' MB)</span>' +
                        previewLink +
                        '<button class="file-remove" title="Hapus" style="margin-left:12px; background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>' +
                        '</div>' +
                        '</div>';
                    $preview.append(fileItem);

                    checkTabChanges();
                    saveDraft(false); // Trigger save to database
                } else {
                    alert('Gagal meng-upload file: ' + res.message);
                }
            },
            error: function (err) {
                $loading.remove();
                alert('Terjadi kesalahan saat meng-upload file.');
                console.error(err);
            }
        });

        // Clear the file input so the same file can be selected again
        $(this).val('');
    });

    // Remove uploaded file preview
    $(document).on('click', '.file-remove', function () {
        $(this).closest('.upload-file-item').remove();
        checkTabChanges();
    });

    // Drag & drop visual feedback
    $(document).on('dragover', '.upload-dropzone', function (e) {
        e.preventDefault();
        $(this).addClass('dragover');
    });

    $(document).on('dragleave', '.upload-dropzone', function (e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });

    $(document).on('drop', '.upload-dropzone', function (e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });

    // ===== UTILITY =====
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // ===== EXAMPLE ANIMATION MODAL =====
    $(document).on('click', '.example-link', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var type = $(this).data('example');
        var title = '';
        var content = '';

        switch (type) {
            case 'automate':
                title = 'Contoh: Automate';
                content = '<p class="anim-desc">Data masuk \u2192 Diproses otomatis \u2192 Hasil keluar</p>' +
                    '<div class="anim-automate">' +
                    '<div class="anim-input">DATA</div>' +
                    '<span class="anim-arrow">\u2192</span>' +
                    '<div class="anim-gear">\u2699</div>' +
                    '<span class="anim-arrow">\u2192</span>' +
                    '<div class="anim-output">HASIL</div>' +
                    '</div>';
                break;
            case 'prompt':
                title = 'Contoh: Prompt';
                content = '<p class="anim-desc">User bertanya \u2192 Sistem memberikan jawaban</p>' +
                    '<div class="anim-prompt">' +
                    '<div class="anim-input-box"><span class="anim-typing">Berapa harga rumah di Jakarta?</span></div>' +
                    '<div class="anim-response">Berdasarkan data pasar, rata-rata harga rumah di Jakarta adalah Rp 1.2 - 3.5 Miliar tergantung lokasi dan luas bangunan.</div>' +
                    '</div>';
                break;
            case 'organisation':
                title = 'Contoh: Organisation';
                content = '<p class="anim-desc">Data berantakan \u2192 Dikelompokkan secara cerdas ke dalam kategori</p>' +
                    '<div class="anim-organisation">' +
                    '<div class="anim-scattered">' +
                    '<span class="anim-item anim-item-1">Harga</span>' +
                    '<span class="anim-item anim-item-2">Lokasi</span>' +
                    '<span class="anim-item anim-item-3">Luas</span>' +
                    '<span class="anim-item anim-item-4">Kamar</span>' +
                    '<span class="anim-item anim-item-5">Garasi</span>' +
                    '<span class="anim-item anim-item-6">Taman</span>' +
                    '</div>' +
                    '<div class="anim-arrow-down">\u2193</div>' +
                    '<div class="anim-organized">' +
                    '<div class="anim-folder">' +
                    '<div class="anim-folder-title">Spesifikasi Rumah</div>' +
                    '<div class="anim-folder-item">Luas</div>' +
                    '<div class="anim-folder-item">Kamar</div>' +
                    '<div class="anim-folder-item">Garasi</div>' +
                    '<div class="anim-folder-item">Taman</div>' +
                    '</div>' +
                    '<div class="anim-folder">' +
                    '<div class="anim-folder-title">Informasi Umum</div>' +
                    '<div class="anim-folder-item">Harga</div>' +
                    '<div class="anim-folder-item">Lokasi</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
                break;
            case 'annotate':
                title = 'Contoh: Annotate';
                content = '<p class="anim-desc">Sistem membaca data lalu memberikan label/kategori secara otomatis</p>' +
                    '<div class="anim-annotate">' +
                    '<div class="anim-annotate-row"><span class="anim-annotate-text">Rumah ini sangat bagus dan nyaman</span><span class="anim-tag">SENTIMEN: POSITIF</span></div>' +
                    '<div class="anim-annotate-row"><span class="anim-annotate-text">Lokasi dekat stasiun MRT Lebak Bulus</span><span class="anim-tag">KATEGORI: LOKASI</span></div>' +
                    '<div class="anim-annotate-row"><span class="anim-annotate-text">Harga 1.5M nego tipis</span><span class="anim-tag">KATEGORI: HARGA</span></div>' +
                    '</div>';
                break;
            case 'diagram':
                title = 'Contoh: Diagram Proses Bisnis';
                content = '<p class="anim-desc">Diagram flowchart yang menggambarkan posisi sistem AI dalam alur kerja sistem utama. Bisa berupa file PDF, JPG, atau Visio.</p>' +
                    '<div style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; background: #f8fafc; color: #64748b; margin-top: 20px;">' +
                    '<div style="font-size: 32px; margin-bottom: 12px;">📊</div>' +
                    '<p style="margin: 0; font-weight: 500;">Bagan Alur Sistem (Flowchart)</p>' +
                    '<p style="margin: 8px 0 0 0; font-size: 13px;">Menunjukkan Integrasi API & UI</p>' +
                    '</div>';
                break;
            case 'sop':
                title = 'Contoh: SOP Deployment';
                content = '<p class="anim-desc">Dokumen Standar Operasional Prosedur (SOP) untuk instalasi dan pemeliharaan model AI di production server.</p>' +
                    '<div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; background: white; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">' +
                    '<div style="font-weight: 600; color: #1e293b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">SOP-AI-001: Panduan Deployment Model NLP</div>' +
                    '<ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">' +
                    '<li style="margin-bottom: 6px;">1. Penyiapan Docker Environment (GPU)</li>' +
                    '<li style="margin-bottom: 6px;">2. Download Model Weights dari Registry</li>' +
                    '<li style="margin-bottom: 6px;">3. Set Environment Variables (API Keys, DB)</li>' +
                    '<li style="margin-bottom: 6px;">4. Restart & Health Check (Liveness Probe)</li>' +
                    '</ul>' +
                    '</div>';
                break;
        }

        $('#example-modal-title').text(title);
        $('#example-modal-body').html(content);
        $('#example-modal').addClass('active');
    });

    // Close modal
    $(document).on('click', '.example-modal-close, .example-modal-overlay', function () {
        $('#example-modal').removeClass('active');
        $('#example-modal-body').html('');
    });

    // Close on Escape key
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            $('#example-modal').removeClass('active');
            $('#example-modal-body').html('');
        }
    });

    // ===== AUTO-SAVE DRAFT =====
    var draftKey = 'ie_project_draft_' + window.location.pathname;
    var lastSaveTime = null;
    var lastSavedHtml = '';
    var lastSavedTab = '';


    window.saveProjectToDB = function (onSuccess) { saveDraft(false, onSuccess); };

    function saveDraft(silent, onSuccessCallback) {
        // Sync values to attributes before grabbing HTML
        $('.dashboard-main input[type="text"], .dashboard-main input[type="number"], .dashboard-main input[type="hidden"], .dashboard-main input[type="date"]').each(function () {
            $(this).attr('value', $(this).val());
        });
        $('.dashboard-main textarea').each(function () {
            $(this).text($(this).val());
        });
        $('.dashboard-main input[type="checkbox"], .dashboard-main input[type="radio"]').each(function () {
            if ($(this).prop('checked')) {
                $(this).attr('checked', 'checked');
            } else {
                $(this).removeAttr('checked');
            }
        });
        $('.dashboard-main select').each(function () {
            var val = $(this).val();
            $(this).find('option').removeAttr('selected');
            if (val) {
                $(this).find('option[value="' + val + '"]').attr('selected', 'selected');
            }
        });

        // Save active main tab
        var activeTab = $('.project-tabs .tab-btn.active').data('tab');
        var currentHtml = $('.tabs-content').html();

        // Calculate Progress based on completed tabs (20% per tab)
        var progress = 0;
        if (typeof PROJECT_STATUS !== 'undefined' && PROJECT_STATUS.toLowerCase() === 'completed') {
            progress = 100;
        } else {
            var highest = parseInt($('#highest-unlocked-index').val()) || 0;
            progress = highest * 20;
            if (progress > 100) progress = 100;
        }

        var draftData = {
            html: currentHtml,
            active_tab: activeTab,
            progress: progress,
            timestamp: new Date().getTime()
        };

        if (typeof SERVER_PROJECT_ID !== 'undefined') {
            // Always save locally as safeguard
            localStorage.setItem('ie_local_draft_' + SERVER_PROJECT_ID, JSON.stringify(draftData));
        }

        if (typeof SERVER_PROJECT_ID !== 'undefined') {
            var originalText = '';
            if (silent !== true) {
                originalText = $('#nav-save-text').text();
                $('#nav-save-text').text('Menyimpan...');
            }

            $.ajax({
                url: (typeof SCRIPT_PREFIX !== 'undefined' ? SCRIPT_PREFIX : '') + '/projects/' + SERVER_PROJECT_ID + '/save/',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(draftData),
                success: function (res) {
                    console.log("Saved to DB" + (silent ? " silently" : " manually"));
                    window.isDirty = false;
                    window.updateSaveButtonState();
                    if (silent !== true) {
                        $('#nav-save-text').text(originalText);
                    }
                    $('#draft-status-card').text('Diperbarui beberapa detik yang lalu');
                    if (typeof onSuccessCallback === 'function') onSuccessCallback();
                },
                error: function (err) {
                    console.error("Save failed", err);
                    if (silent !== true) {
                        $('#nav-save-text').text('Gagal Simpan');
                        setTimeout(function () { $('#nav-save-text').text(originalText); }, 2000);
                    }
                }
            });
        }

        lastSavedHtml = currentHtml;
        lastSavedTab = activeTab;
        lastSaveTime = new Date();
    }

    $(window).on('beforeunload', function () {
        if (window.isDirty) {
            return "Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin keluar?";
        }
    });

    function loadDraft() {
        if (typeof SERVER_HTML_DRAFT !== 'undefined' && SERVER_HTML_DRAFT.trim() !== '') {
            try {
                // Migrate old hamburger icons to search icons for existing drafts
                SERVER_HTML_DRAFT = SERVER_HTML_DRAFT.replace(/(&#9776;|☰)/g, '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>');

                $('.tabs-content').html(SERVER_HTML_DRAFT);

                // Clean up expired blob URLs from restored drafts
                $('.tabs-content').find('a.file-preview-link[href^="blob:"]').remove();
                $('.tabs-content').find('img[src^="blob:"]').replaceWith('<span class="file-icon" style="margin-right:8px;">&#9679;</span>');

                // --- Backward compatibility for old UI structures saved in DB ---
                // Add labels to textareas that were saved before labels existed
                $('.tabs-content .obj-tabs-content textarea[placeholder="Apa tujuan utama organisasi yang ingin dicapai?"]').each(function () {
                    if ($(this).prev('label.form-label').length === 0) {
                        $(this).before('<label class="form-label">Tujuan Utama <span class="required">*</span></label>');
                    }
                });
                $('.tabs-content #outcome-tabs-content textarea[placeholder="Apa manfaat yang akan dirasakan pengguna?"]').each(function () {
                    if ($(this).prev('label.form-label').length === 0) {
                        $(this).before('<label class="form-label">Manfaat Pengguna <span class="required">*</span></label>');
                    }
                });
                $('.tabs-content #property-tabs-content textarea[placeholder="Apa sifat atau kemampuan teknis model AI?"]').each(function () {
                    if ($(this).prev('label.form-label').length === 0) {
                        $(this).before('<label class="form-label">Kriteria Model <span class="required">*</span></label>');
                    }
                });

                // Clean up any old form-actions saved in draft
                $('.tabs-content #tab-orchestration .form-actions').remove();

                // Upgrade Orchestration 'Fase Baru' button
                var $oldPhaseBtn = $('.tabs-content #add-phase-btn');
                if ($oldPhaseBtn.hasClass('btn-primary')) {
                    $oldPhaseBtn.removeClass('btn btn-primary btn-sm').addClass('btn-add');
                    var $header = $oldPhaseBtn.closest('.form-section').find('h3');
                    if ($header.length && !$header.parent().hasClass('form-section-header')) {
                        $header.wrap('<div class="form-section-header"></div>');
                        $oldPhaseBtn.detach().insertAfter($header);
                    }
                    $('.tabs-content .orchestration-toolbar').remove();
                }

                // Migrate old error-minimization and data-collection div structures to table structures
                ['error-minimization', 'data-collection'].forEach(function (id) {
                    var $container = $('.tabs-content #' + id);
                    if ($container.hasClass('dynamic-list')) {
                        var $table = $('<table class="dynamic-table table-fixed" id="' + id + '"></table>');
                        $table.append('<colgroup><col style="width: 40px;"><col style="width: 30%;"><col style="width: auto;"><col style="width: 48px;"></colgroup>');
                        $table.append('<thead><tr><th>No</th><th>Nama Fungsi</th><th>Strategi / Rencana</th><th></th></tr></thead>');
                        var $tbody = $('<tbody></tbody>');

                        $container.find('.list-item').each(function (index) {
                            var $select = $(this).find('select');
                            var $input = $(this).find('input');
                            var $btn = $(this).find('button.btn-delete');
                            var $tr = $('<tr></tr>');
                            $tr.append('<td class="row-number">' + (index + 1) + '</td>');

                            var $td1 = $('<td></td>');
                            $td1.append($select.clone());
                            $td1.find('select').val($select.val()); // Keep original value

                            var $td2 = $('<td></td>');
                            $td2.append($input.clone());

                            var $td3 = $('<td></td>');
                            $td3.append($btn.clone());

                            $tr.append($td1).append($td2).append($td3);
                            $tbody.append($tr);
                        });
                        $table.append($tbody);
                        $container.replaceWith($table);

                        // Update the add button attributes
                        var $addBtn = $('button[data-target="' + id + '"]');
                        if ($addBtn.length) {
                            $addBtn.removeAttr('data-target');
                            $addBtn.attr('data-table', id);
                            $addBtn.attr('data-numbered', 'true');
                        }
                    }
                });

                // Upgrade Orchestration 'Tambah Operator' button
                var $oldOpBtn = $('.tabs-content button[data-table="operators-table"]');
                if ($oldOpBtn.length && !$oldOpBtn.parent().hasClass('form-section-header')) {
                    $oldOpBtn.removeClass('btn btn-primary btn-sm').addClass('btn-add');
                    var $opHeader = $oldOpBtn.closest('.form-section').find('h3');
                    if ($opHeader.length && !$opHeader.parent().hasClass('form-section-header')) {
                        $opHeader.wrap('<div class="form-section-header"></div>');
                        $oldOpBtn.detach().insertAfter($opHeader);
                    }
                }

                // Add 'No' column to old leading-table drafts
                var $leadingTable = $('.tabs-content #leading-table');
                if ($leadingTable.length && $leadingTable.find('thead th.leading-th-no').length === 0) {
                    $leadingTable.find('thead tr').prepend('<th class="leading-th-no" style="width: 40px;">No</th>');
                    $leadingTable.find('tbody tr').each(function (index) {
                        $(this).prepend('<td class="row-number">' + (index + 1) + '</td>');
                    });
                }

                // Add 'No' column to old gantt-table drafts
                var $ganttTable = $('.tabs-content #gantt-table');
                if ($ganttTable.length && $ganttTable.find('thead th:first-child').text().trim() !== 'No') {
                    $ganttTable.find('colgroup').prepend('<col style="width: 40px;">');
                    $ganttTable.find('thead tr').prepend('<th>No</th>');
                    $ganttTable.find('tbody tr').each(function (index) {
                        $(this).prepend('<td class="row-number">' + (index + 1) + '</td>');
                    });
                }

                // Add 'No' column to old status-table drafts
                var $statusTable = $('.tabs-content #status-table');
                if ($statusTable.length && $statusTable.find('thead th:first-child').text().trim() !== 'No') {
                    $statusTable.find('colgroup').prepend('<col style="width: 40px;">');
                    $statusTable.find('thead tr').prepend('<th>No</th>');
                }

                // Add 'No' column to old operators-table drafts
                var $opTable = $('.tabs-content #operators-table');
                if ($opTable.length && $opTable.find('thead th:first-child').text().trim() !== 'No') {
                    $opTable.find('colgroup').prepend('<col style="width: 40px;">');
                    $opTable.find('thead tr').prepend('<th>No</th>');
                    $opTable.find('tbody tr').each(function (index) {
                        $(this).prepend('<td class="row-number">' + (index + 1) + '</td>');
                    });
                }

                // Add required/optional spans to Tab 4 and 5 headers if missing from old DB draft
                var requiredHeaders = [
                    'Batasan Pengembangan',
                    'Status Realisasi Modul Cerdas',
                    'Progress Keseluruhan',
                    'Timeline Orchestration',
                    'Pelaksana Operasi'
                ];
                var optionalHeaders = [
                    'Upload Bukti/Evidence',
                    'Upload SOP Deployment'
                ];

                $('.tabs-content h3').each(function () {
                    var text = $(this).text().replace('*', '').replace('(Opsional)', '').trim();
                    if (requiredHeaders.includes(text) && $(this).find('span.required').length === 0) {
                        $(this).html(text + ' <span class="required">*</span>');
                    } else if (optionalHeaders.includes(text) && $(this).find('span.optional').length === 0) {
                        $(this).html(text + ' <span class="optional">(Opsional)</span>');
                    }
                });

                // Add example links to Diagram and SOP if missing
                var addExampleLink = function (headerText, pdfUrl) {
                    $('.tabs-content h3').each(function () {
                        var text = $(this).text().replace('*', '').replace('(Opsional)', '').trim();
                        if (text === headerText) {
                            var $header = $(this);
                            var $container = $header.parent();
                            if (!$container.hasClass('form-section-header')) {
                                $header.wrap('<div class="form-section-header"></div>');
                            }
                            if ($header.parent().find('.view-pdf-link, .example-link').length === 0) {
                                $header.after('<a href="' + pdfUrl + '" target="_blank" class="view-pdf-link" style="float: right; font-size: 14px; font-weight: normal; color: var(--color-accent); text-decoration: none; margin-top: 4px;">Lihat Contoh (PDF)</a>');
                            } else if ($header.parent().find('.example-link').length > 0) {
                                // Upgrade existing example-link
                                $header.parent().find('.example-link').replaceWith('<a href="' + pdfUrl + '" target="_blank" class="view-pdf-link" style="float: right; font-size: 14px; font-weight: normal; color: var(--color-accent); text-decoration: none; margin-top: 4px;">Lihat Contoh (PDF)</a>');
                            }
                        }
                    });
                };
                addExampleLink('Upload Diagram Proses Bisnis', '/static/core/docs/contoh_diagram.pdf');
                addExampleLink('Upload SOP Deployment', '/static/core/docs/contoh_sop.pdf');
                // -----------------------------------------------------------------

                // Re-bind values from attributes to properties just in case
                $('.dashboard-main input[type="text"], .dashboard-main input[type="number"]').each(function () {
                    $(this).val($(this).attr('value') || '');
                });
                $('.dashboard-main textarea').each(function () {
                    $(this).val($(this).text());
                });
                $('.dashboard-main select').each(function () {
                    var selectedOpt = $(this).find('option[selected="selected"]').val();
                    if (selectedOpt) { $(this).val(selectedOpt); }
                });

                // Restore state variables
                objCounter = $('#tab-objectives .obj-tabs-nav:first .obj-tab-btn').length || 1;
                outcomeCounter = $('#outcome-tabs-nav .obj-tab-btn').length || 1;
                propertyCounter = $('#property-tabs-nav .obj-tab-btn').length || 1;

                // Restore active tab if exists
                if (typeof SERVER_ACTIVE_TAB !== 'undefined' && SERVER_ACTIVE_TAB) {
                    $('.project-tabs .tab-btn').removeClass('active');
                    $('.project-tabs .tab-btn[data-tab="' + SERVER_ACTIVE_TAB + '"]').addClass('active');
                    $('.tabs-content .tab-panel').removeClass('active');
                    $('#tab-' + SERVER_ACTIVE_TAB).addClass('active');
                }

                // Make sure hidden input exists for older drafts
                if ($('#ic-submitted').length === 0) {
                    $('.tabs-content').prepend('<input type="hidden" id="ic-submitted" value="false">');
                }
                if ($('#ic-submitted-state').length === 0) {
                    $('.tabs-content').prepend('<input type="hidden" id="ic-submitted-state" value="{}">');
                }

                // If they are on creation or orchestration, they MUST have submitted to IC
                if (SERVER_ACTIVE_TAB === 'creation' || SERVER_ACTIVE_TAB === 'orchestration') {
                    $('#ic-submitted').val('true').attr('value', 'true');
                }

                // Restore tabsUnlocked state from draft
                tabsUnlocked = $('#ic-submitted').val() === 'true' || (typeof PROJECT_STATUS !== 'undefined' && PROJECT_STATUS.toLowerCase() === 'completed');
                if (tabsUnlocked) {
                    $('.tab-btn[data-tab="creation"]').removeClass('disabled');

                    // Backward compatibility: if snapshot doesn't exist yet, current DB draft is the baseline
                    if ($('#ic-submitted-state').val() === '{}') {
                        updateSubmittedState();
                    }
                }

                // Restore highest unlocked tab sequence
                var $highestInput = $('#highest-unlocked-index');
                if ($highestInput.length > 0) {
                    var highestIdx = parseInt($highestInput.val()) || 0;
                    for (var i = 0; i <= highestIdx; i++) {
                        $('.tab-btn[data-tab="' + tabOrder[i] + '"]').removeClass('disabled');
                    }
                }

                // Now that all disabled states are correct, update stepper and navigation
                if (typeof updateTabNavigation === 'function') {
                    updateTabNavigation();
                }

                // Re-sync status table after draft restoration to regenerate tbody row-numbers
                if (typeof syncStatusTable === 'function') {
                    syncStatusTable();
                }

                lastSavedHtml = SERVER_HTML_DRAFT;
                lastSavedTab = SERVER_ACTIVE_TAB;
                if (typeof SERVER_UPDATED_AT !== 'undefined' && SERVER_UPDATED_AT) {
                    lastSaveTime = new Date(SERVER_UPDATED_AT);
                    updateDraftStatusUI();
                } else {
                    lastSaveTime = new Date();
                }

            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }



    // Load draft on startup
    loadDraft();
    // Fade in the tabs gently after draft is loaded to avoid flickering
    setTimeout(function () {
        $('.project-tabs').css('opacity', '1');
    }, 50);
    // Immediate silent save when tab is switched to preserve exact active tab state
    $(document).on('click', '.tab-btn', function () {
        setTimeout(function () { saveDraft(true); }, 50);
    });

    function updateDraftStatusUI() {
        if (!lastSaveTime) return;
        var now = new Date();
        var diff = Math.floor((now - lastSaveTime) / 1000);
        var text = '';
        if (diff < 60) {
            text = 'Diperbarui beberapa detik yang lalu';
        } else if (diff < 3600) {
            text = 'Diperbarui ' + Math.floor(diff / 60) + ' menit yang lalu';
        } else if (diff < 86400) {
            text = 'Diperbarui ' + Math.floor(diff / 3600) + ' jam yang lalu';
        } else {
            text = 'Diperbarui ' + Math.floor(diff / 86400) + ' hari yang lalu';
        }
        $('#draft-status-card').text(text);
    }

    // Update draft status text every 10 seconds
    setInterval(updateDraftStatusUI, 10000);

    // Navigate from Review Error to specific Tab and animate target
    $(document).on('click', '.fix-error-link', function (e) {
        e.preventDefault();
        var tabIndex = $(this).data('tab');
        var targetSel = $(this).data('selector');

        // Hide review, show tabs
        $('#review-final-container').hide();
        $('.project-tabs').show();
        $('.tab-navigation').show();

        // Switch to the target tab
        switchToTab(tabIndex);

        // Remove existing pulses
        $('.error-pulse').removeClass('error-pulse');

        // Scroll and pulse
        if (targetSel) {
            var $target = $(targetSel);
            if ($target.length) {
                // If it is inside a sub-tab, automatically activate that sub-tab so it is visible
                var $panel = $target.closest('.obj-tab-panel');
                if ($panel.length) {
                    var panelId = $panel.attr('id');
                    if (panelId) {
                        var objId = panelId.replace('obj-panel-', '');
                        var $navBtn = $('.obj-tab-btn[data-obj="' + objId + '"]');
                        if ($navBtn.length && !$navBtn.hasClass('active')) {
                            $navBtn.trigger('click');
                        }
                    }
                }

                $target.addClass('error-pulse');
                $('html, body').animate({
                    scrollTop: $target.first().offset().top - 140
                }, 400);
            }
        }
    });

    // Remove pulse on interaction
    $(document).on('focus input change click', '.error-pulse, .error-pulse input, .error-pulse textarea, .error-pulse select, .error-pulse button', function () {
        if ($(this).hasClass('error-pulse')) {
            $(this).removeClass('error-pulse');
        } else {
            $(this).closest('.error-pulse').removeClass('error-pulse');
        }
    });


    // ===== FINAL REVIEW LOGIC (Tab 4 & 5) =====
    $(document).on('click', '#final-review-btn', function () {
        var currentIndex = getCurrentTabIndex();
        // Remove existing invalid classes before validating
        $('.is-invalid').removeClass('is-invalid');
        if (!validateTab(currentIndex)) {
            if ($('#custom-error-toast').length === 0) {
                $('body').append('<div id="custom-error-toast" style="display:none; position:fixed; bottom:24px; right:24px; top:auto; background:var(--color-error); color:white; padding:12px 24px; border-radius:8px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.1); font-weight:500;">Harap isi semua kolom yang wajib diisi (*) sebelum melanjutkan.</div>');
            }
            $('#custom-error-toast').fadeIn(300);
            setTimeout(function () { $('#custom-error-toast').fadeOut(300); }, 3000);

            // Scroll to the first invalid element
            var $firstInvalid = $('.is-invalid').first();
            if ($firstInvalid.length > 0) {
                $('html, body').animate({ scrollTop: $firstInvalid.offset().top - 120 }, 300);
            }

            return;
        }
        showFinalReview();
    });

    $(document).on('click', '#review-final-back', function () {
        $('#review-final-container').hide();
        $('.project-tabs').show();
        $('.tab-navigation').show();
    });

    $(document).on('click', '#review-final-send', function () {
        $('#finalization-modal').css('display', 'flex');
    });

    function showFinalReview() {
        buildFinalReviewContent();
        $('.project-tabs').hide();
        $('.tab-navigation').hide();
        $('#review-final-container').show();
        $('html, body').animate({ scrollTop: $('#review-final-container').offset().top - 80 }, 300);
    }

    function buildFinalReviewContent() {
        var t123 = buildTabs123ReviewContent();
        var allFilled = t123.allFilled;
        var missingErrors = t123.missingErrors || [];
        // --- Tab 4 Validation ---
        var t4Missing = [];
        var hasConstraint = false;
        var allConstraintsFilled = true;
        $('#constraints-table tbody tr').each(function () {
            var cat = $(this).find('select').val();
            var desc = $(this).find('input[type="text"]').val().trim();
            if (cat || desc) {
                hasConstraint = true;
                if (!cat || !desc) allConstraintsFilled = false;
            }
        });
        if (!hasConstraint) t4Missing.push({ text: 'Minimal 1 Batasan Pengembangan harus diisi', tab: 3, selector: '#constraints-table' });
        else if (!allConstraintsFilled) t4Missing.push({ text: 'Kategori dan Deskripsi pada Batasan Pengembangan harus lengkap', tab: 3, selector: '#constraints-table' });

        var allStatusFilled = true;
        $('#module-status-table tbody tr').each(function () {
            var modName = $(this).find('.module-name').text().trim();
            var status = $(this).find('.module-status').val();
            if (modName && modName !== '-' && !status) {
                allStatusFilled = false;
            }
        });
        if (!allStatusFilled) t4Missing.push({ text: 'Status Realisasi untuk semua modul harus dipilih', tab: 3, selector: '#module-status-table' });

        if (t4Missing.length > 0) {
            allFilled = false;
            missingErrors.push({ section: '4. Creation Status', errors: t4Missing });
        }

        // --- Tab 5 Validation ---
        var t5Missing = [];
        var hasTimeline = false;
        var allTimelineFilled = true;
        $('#gantt-table tbody tr').each(function () {
            var cat = $(this).find('td:nth-child(2) select').val();
            var $nameInput = $(this).find('td:nth-child(3) input');
            var name = $nameInput.length && $nameInput.val() ? $nameInput.val().trim() : '';
            var start = $(this).find('td:nth-child(4) input').val();
            var end = $(this).find('td:nth-child(5) input').val();
            var status = $(this).find('td:nth-child(7) select').val();

            // Check if row is not completely empty
            if (cat || name || start || end || status) {
                hasTimeline = true;
                if (!cat || !name || !start || !end || !status) allTimelineFilled = false;
            }
        });
        if (!hasTimeline) t5Missing.push({ text: 'Minimal 1 fase/tugas pada Timeline Orchestration harus diisi', tab: 4, selector: '#gantt-table' });
        else if (!allTimelineFilled) t5Missing.push({ text: 'Semua kolom pada Timeline (Kategori, Fase, Mulai, Selesai, Status) harus lengkap', tab: 4, selector: '#gantt-table' });

        if (t5Missing.length > 0) {
            allFilled = false;
            missingErrors.push({ section: '5. Intelligence Orchestration', errors: t5Missing });
        }

        // Re-render validation errors if tab 4/5 added anything
        var $errorsContainer = $('#review-final-validation-errors');
        $errorsContainer.empty();
        if (missingErrors.length > 0) {
            var errorHtml = '<div class="review-missing-alert" style="background:#fee2e2; border:1px solid #ef4444; color:#b91c1c; padding:16px; border-radius:8px; margin-bottom:24px;">' +
                '<h4 style="margin:0 0 12px 0; font-size:15px;">Data Belum Lengkap:</h4><ul style="margin:0; padding-left:20px;">';
            missingErrors.forEach(function (item) {
                errorHtml += '<li style="margin-bottom:12px;"><strong>' + item.section + '</strong><ul style="margin-top:6px; padding-left:20px; list-style-type:circle;">';
                item.errors.forEach(function (err) {
                    errorHtml += '<li style="margin-bottom: 6px;"><a href="#" class="fix-error-link" data-tab="' + err.tab + '" data-selector="' + err.selector + '" style="color:#b91c1c; text-decoration:underline; font-weight:500; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">' + err.text + ' &rarr;</a></li>';
                });
                errorHtml += '</ul></li>';
            });
            errorHtml += '</ul></div>';
            $errorsContainer.html(errorHtml);
        }

        // Clone Tab 4 Content
        var $tab4 = $('#tab-creation').clone();

        // Clean up interactive elements in Tab 4 clone
        $tab4.find('input, textarea, select').each(function (index) {
            var $orig = $('#tab-creation').find('input, textarea, select').eq(index);
            var type = this.type || this.tagName.toLowerCase();
            if (type !== 'file') {
                $(this).val($orig.val());
            }
        });
        $tab4.find('.btn-add, .btn-delete, .file-remove').remove();
        $tab4.find('button').prop('disabled', true);
        $tab4.find('input, textarea, select').prop('disabled', true);

        // Hide empty upload sections completely, and remove dropzone if has files
        $tab4.find('.upload-area').each(function () {
            var hasFiles = $(this).find('.upload-file-item').length > 0;
            if (!hasFiles) {
                $(this).closest('.form-section').remove();
            } else {
                $(this).find('.upload-dropzone').remove();
            }
        });

        // Convert input texts to divs
        $tab4.find('input[type="text"], input[type="date"], textarea').each(function () {
            var val = escapeHtml($(this).val() || '');
            var $div = $('<div></div>')
                .addClass('readonly-text')
                .html(val.replace(/\n/g, '<br>'))
                .css({ 'min-height': $(this).is('textarea') ? '80px' : 'auto', 'padding': '8px 12px', 'background': '#f9fafb', 'border': '1px solid #e5e7eb', 'border-radius': '8px' });
            $(this).replaceWith($div);
        });
        $tab4.find('select').each(function () {
            var val = escapeHtml($(this).find('option:selected').text() || '');
            var $div = $('<div></div>')
                .addClass('readonly-text')
                .html(val)
                .css({ 'padding': '8px 12px', 'background': '#f9fafb', 'border': '1px solid #e5e7eb', 'border-radius': '8px', 'font-weight': '600' });
            $(this).replaceWith($div);
        });

        var $sectionTab4 = $('<div class="review-cloned-section" style="margin-bottom:48px;"></div>');
        $sectionTab4.append('<h2 style="font-size:20px; font-weight:600; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--color-border); color:var(--color-accent);">4. Creation Status</h2>');
        $tab4.show().addClass('active').css({ 'display': 'block', 'padding': '0', 'border': 'none', 'background': 'transparent' });
        $sectionTab4.append($tab4);
        $('#review-final-cloned-content').append($sectionTab4);

        // Build Jira-like Timeline for Tab 5
        var $tab5 = $('#tab-orchestration').clone();

        $tab5.find('input, textarea, select').each(function (index) {
            var $orig = $('#tab-orchestration').find('input, textarea, select').eq(index);
            var type = this.type || this.tagName.toLowerCase();
            if (type !== 'file') {
                $(this).val($orig.val());
            }
        });
        $tab5.find('.btn-add, .btn-delete, .file-remove').remove();
        $tab5.find('button').prop('disabled', true);
        $tab5.find('input[type="file"]').prop('disabled', true);

        // Hide empty upload sections completely, and remove dropzone if has files
        $tab5.find('.upload-area').each(function () {
            var hasFiles = $(this).find('.upload-file-item').length > 0;
            if (!hasFiles) {
                $(this).closest('.form-section').remove();
            } else {
                $(this).find('.upload-dropzone').remove();
            }
        });

        // Remove the original gantt table section because we are replacing it with the visual one
        $tab5.find('#gantt-table').closest('.form-section').remove();

        // Convert inputs to div
        $tab5.find('input[type="text"], input[type="date"], textarea').each(function () {
            var val = escapeHtml($(this).val() || '');
            var $div = $('<div></div>')
                .addClass('readonly-text')
                .html(val.replace(/\n/g, '<br>'))
                .css({ 'min-height': $(this).is('textarea') ? '80px' : 'auto', 'padding': '8px 12px', 'background': '#f9fafb', 'border': '1px solid #e5e7eb', 'border-radius': '8px' });
            $(this).replaceWith($div);
        });

        var $sectionTab5 = $('<div class="review-cloned-section" style="margin-bottom:48px;"></div>');
        $sectionTab5.append('<h2 style="font-size:20px; font-weight:600; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--color-border); color:var(--color-accent);">5. Intelligence Orchestration</h2>');

        var groupedPhases = {};
        var minDate = null;
        var maxDate = null;

        $('#gantt-table tbody tr').each(function () {
            var category = $(this).find('td:nth-child(2) select').val() || 'Uncategorized';
            var name = $(this).find('td:nth-child(3) input').val() || 'Unnamed Phase';
            var start = $(this).find('td:nth-child(4) input').val();
            var end = $(this).find('td:nth-child(5) input').val();
            var status = $(this).find('td:nth-child(7) select').val();

            if (start && end) {
                var sDate = new Date(start);
                var eDate = new Date(end);
                if (!minDate || sDate < minDate) minDate = sDate;
                if (!maxDate || eDate > maxDate) maxDate = eDate;

                if (!groupedPhases[category]) {
                    groupedPhases[category] = [];
                }
                groupedPhases[category].push({ name: name, start: sDate, end: eDate, status: status });
            }
        });

        if (Object.keys(groupedPhases).length === 0 || !minDate || !maxDate) {
            $sectionTab5.append('<p style="color:var(--color-gray);">Tidak ada data timeline yang valid untuk ditampilkan.</p>');
        } else {
            // Padding around min/max to ensure bars don't hit the absolute edges
            var paddingDays = 7;
            minDate = new Date(minDate.getTime() - paddingDays * 24 * 60 * 60 * 1000);
            maxDate = new Date(maxDate.getTime() + paddingDays * 24 * 60 * 60 * 1000);
            var totalDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

            var $wrapper = $('<div class="jira-timeline-wrapper" style="display: flex; border: 1px solid var(--color-border); border-radius: 8px; width: 100%; overflow: hidden; font-family: sans-serif; background: var(--color-bg);"></div>');

            // SIDEBAR
            var $sidebar = $('<div class="jira-sidebar" style="width: 250px; flex-shrink: 0; border-right: 1px solid var(--color-border); background: var(--color-gray-light); display: flex; flex-direction: column;"></div>');
            $sidebar.append('<div class="jira-sidebar-header" style="height: 40px; padding: 0 16px; display: flex; align-items: center; font-weight: 700; font-size: 13px; border-bottom: 1px solid var(--color-border); color: var(--color-text);">Kategori / Fase</div>');

            Object.keys(groupedPhases).forEach(function (cat) {
                // Category Row
                $sidebar.append('<div class="jira-sidebar-category" style="height: 32px; padding: 0 16px; display: flex; align-items: center; font-weight: 700; font-size: 12px; background: var(--color-gray-light); color: var(--color-text); border-bottom: 1px solid var(--color-border); text-transform: capitalize;">' + cat + '</div>');
                // Phase Rows
                groupedPhases[cat].forEach(function (p) {
                    $sidebar.append('<div class="jira-sidebar-row" style="height: 40px; padding: 0 16px 0 24px; display: flex; align-items: center; font-size: 12px; color: var(--color-gray); border-bottom: 1px solid var(--color-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' + p.name + '">' + p.name + '</div>');
                });
            });

            // TRACK CONTAINER
            var $trackContainer = $('<div class="jira-track-container" style="flex-grow: 1; display: flex; flex-direction: column; position: relative;"></div>');

            // GRID BACKGROUND (Months)
            var $gridBg = $('<div class="jira-track-grid-bg" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; pointer-events: none;"></div>');
            var currentDate = new Date(minDate);
            var currentMonth = currentDate.getMonth();
            var daysInMonth = 0;
            var monthsData = [];

            for (var i = 0; i <= totalDays; i++) {
                var d = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
                if (d.getMonth() === currentMonth) {
                    daysInMonth++;
                } else {
                    monthsData.push({ monthStr: currentDate.toLocaleString('default', { month: 'short', year: 'numeric' }), days: daysInMonth });
                    currentDate = d;
                    currentMonth = d.getMonth();
                    daysInMonth = 1;
                }
            }
            if (daysInMonth > 0) {
                monthsData.push({ monthStr: currentDate.toLocaleString('default', { month: 'short', year: 'numeric' }), days: daysInMonth });
            }

            var $trackHeader = $('<div class="jira-track-header" style="height: 40px; display: flex; border-bottom: 1px solid var(--color-border); background: var(--color-gray-light);"></div>');

            monthsData.forEach(function (m) {
                var pct = (m.days / totalDays) * 100;
                // Header cell
                $trackHeader.append('<div class="jira-track-month" style="width: ' + pct + '%; border-right: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-gray); flex-shrink: 0;">' + m.monthStr + '</div>');
                // Grid cell
                $gridBg.append('<div style="width: ' + pct + '%; border-right: 1px dashed var(--color-border); flex-shrink: 0;"></div>');
            });

            $trackContainer.append($trackHeader);
            $trackContainer.append($gridBg);

            // TRACK BODY
            var $trackBody = $('<div class="jira-track-body" style="width: 100%; position: relative; z-index: 1;"></div>');

            Object.keys(groupedPhases).forEach(function (cat) {
                // Category Row (Empty spacer)
                $trackBody.append('<div style="height: 32px; border-bottom: 1px solid var(--color-border); background: var(--color-gray-light);"></div>');
                // Phase Rows
                groupedPhases[cat].forEach(function (p) {
                    var $row = $('<div class="jira-track-row" style="height: 40px; position: relative; border-bottom: 1px solid transparent;"></div>'); // Transparent border to keep row height aligned

                    var startOffsetDays = (p.start - minDate) / (1000 * 60 * 60 * 24);
                    var durationDays = ((p.end - p.start) / (1000 * 60 * 60 * 24)) + 1;

                    var leftPct = (startOffsetDays / totalDays) * 100;
                    var widthPct = (durationDays / totalDays) * 100;

                    var statusClass = 'status-todo';
                    var bgColor = '#9ca3af'; // gray
                    if (p.status === 'selesai' || p.status === 'done') bgColor = '#10b981'; // green
                    if (p.status === 'berjalan' || p.status === 'in_progress') bgColor = '#3b82f6'; // blue

                    // Format dates for tooltip
                    var startDateStr = p.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    var endDateStr = p.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    var dateRange = startDateStr + ' s/d ' + endDateStr;

                    // Format shorter dates for inside the bar
                    var shortStart = p.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    var shortEnd = p.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    var shortDateRange = shortStart + ' - ' + shortEnd;

                    // Smart text positioning: if bar is too small (<= 13 days), put text outside
                    var isSmall = durationDays <= 13;
                    var isNearRight = leftPct > 80;
                    var innerStyle = 'width: 100%; text-align: center; color: #ffffff; overflow: hidden; text-overflow: ellipsis; padding: 0 8px;';
                    if (isSmall) {
                        if (isNearRight) {
                            innerStyle = 'position: absolute; right: 100%; padding-right: 6px; color: var(--color-gray); text-align: right; z-index: 2;';
                        } else {
                            innerStyle = 'position: absolute; left: 100%; padding-left: 6px; color: var(--color-gray); text-align: left; z-index: 2;';
                        }
                    }
                    var barInnerHtml = '<span style="white-space: nowrap; font-size: 11px; font-weight: 600; display: block; ' + innerStyle + '">' + shortDateRange + '</span>';

                    // The Bar (Short date inside, custom tooltip via data attributes)
                    var $bar = $('<div class="jira-bar" data-tooltip-title="' + escapeHtml(p.name) + '" data-tooltip-date="' + dateRange + '" style="position: absolute; top: 8px; height: 24px; border-radius: 4px; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1); background: ' + bgColor + '; left: ' + leftPct + '%; width: ' + widthPct + '%; cursor: pointer; transition: filter 0.2s;">' + barInnerHtml + '</div>');

                    $row.append($bar);
                    $trackBody.append($row);
                });
            });

            $trackContainer.append($trackBody);
            $wrapper.append($sidebar).append($trackContainer);
            $sectionTab5.append($wrapper);
        }

        // Append the rest of Tab 5 (Upload SOP, etc.) with some margin
        var $tab5Rest = $('<div style="margin-top: 32px;"></div>').append($tab5.children());
        $sectionTab5.append($tab5Rest);

        $('#review-final-cloned-content').append($sectionTab5);

        // Update Final Send Button State
        if (allFilled) {
            $('#review-final-send').removeClass('btn-disabled').prop('disabled', false);
            $('.review-final-send-hint').hide();
        } else {
            $('#review-final-send').addClass('btn-disabled').prop('disabled', true);
            $('.review-final-send-hint').show();
        }
    }


    // ===== DYNAMIC HOVER TOOLTIP FOR JIRA GANTT =====
    var hoverTimeout;
    $(document).on('mouseenter', '.jira-bar', function (e) {
        $('.jira-dynamic-tooltip').remove(); // Remove any existing tooltips first
        var $bar = $(this);
        $bar.css('filter', 'brightness(1.1)'); // highlight bar

        var title = $bar.attr('data-tooltip-title');
        var date = $bar.attr('data-tooltip-date');

        var $tt = $('<div class="jira-dynamic-tooltip" style="position:fixed; z-index:9999; background:#1f2937; color:#ffffff; padding:10px 14px; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.2); pointer-events:none; opacity:0; transition:opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform:translateY(8px);"></div>');
        $tt.append('<div style="font-weight:700; margin-bottom:4px; font-size:13px; font-family:sans-serif;">' + title + '</div>');
        $tt.append('<div style="color:#9ca3af; font-size:12px; font-weight:500; font-family:sans-serif;">' + date + '</div>');

        // Add tiny arrow at bottom
        $tt.append('<div style="position:absolute; top:100%; left:50%; transform:translateX(-50%); border-width:6px; border-style:solid; border-color:#1f2937 transparent transparent transparent;"></div>');

        $('body').append($tt);

        var rect = this.getBoundingClientRect();
        var ttRect = $tt[0].getBoundingClientRect();

        // Center horizontally above the bar
        var left = rect.left + (rect.width / 2) - (ttRect.width / 2);
        var top = rect.top - ttRect.height - 12; // 12px gap for the arrow

        // Clamp to screen bounds
        if (left < 10) left = 10;
        if (left + ttRect.width > $(window).width() - 10) left = $(window).width() - ttRect.width - 10;
        if (top < 10) top = rect.bottom + 12; // flip to bottom if hits top screen

        $tt.css({ left: left + 'px', top: top + 'px' });

        // animate in
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(function () {
            $tt.css({ opacity: 1, transform: 'translateY(0)' });
        }, 50);

    }).on('mouseleave', '.jira-bar', function () {
        $(this).css('filter', 'none');
        var $tt = $('.jira-dynamic-tooltip');
        $tt.css({ opacity: 0, transform: 'translateY(8px)' });
        setTimeout(function () { $tt.remove(); }, 200);
    });

    // ===== DATE VALIDATION FOR GANTT TABLE =====
    $(document).on('change', '#gantt-table tbody tr td:nth-child(4) input[type="date"]', function () {
        var startDate = $(this).val();
        var $endDateInput = $(this).closest('tr').find('td:nth-child(5) input[type="date"]');
        if (startDate) {
            $endDateInput.attr('min', startDate);
            // Clear end date if it's earlier than start date
            var endDate = $endDateInput.val();
            if (endDate && new Date(endDate) < new Date(startDate)) {
                $endDateInput.val('');
            }
        } else {
            $endDateInput.removeAttr('min');
        }
    });

    // ===== RESTORE ACTIVE TAB =====
    var savedTab = localStorage.getItem('ie_active_tab');
    if (savedTab) {
        var $savedTabBtn = $('.tab-btn[data-tab="' + savedTab + '"]');
        if ($savedTabBtn.length > 0 && !$savedTabBtn.hasClass('disabled')) {
            // Update active button
            $('.tab-btn').removeClass('active');
            $savedTabBtn.addClass('active');

            // Update active panel
            $('.tab-panel').removeClass('active');
            $('#tab-' + savedTab).addClass('active');

            // Update step indicator and prev/next buttons
            updateTabNavigation();
        }
    }

});
