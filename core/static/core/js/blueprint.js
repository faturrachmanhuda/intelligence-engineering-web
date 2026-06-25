$(document).ready(function () {
    // 1. Load draft into parser
    if (typeof SERVER_HTML_DRAFT !== 'undefined' && SERVER_HTML_DRAFT.trim() !== '') {
        $('#draft-parser').html(SERVER_HTML_DRAFT);
    }

    // The main data object
    var blueprintData = {
        objectives: {},
        experiences: {},
        implementation: {},
        creation: {},
        orchestration: {}
    };

    
    var useJsonDraft = false;
    if (typeof SERVER_JSON_DRAFT !== 'undefined' && SERVER_JSON_DRAFT.trim() !== '' && SERVER_JSON_DRAFT !== 'null' && SERVER_JSON_DRAFT !== 'None') {
        try {
            var parsed = JSON.parse(SERVER_JSON_DRAFT);
            var mapped = {
                objectives: parsed.step_1 || parsed.objectives || {},
                experiences: parsed.step_2 || parsed.experiences || {},
                implementation: parsed.step_3 || parsed.implementation || {},
                creation: parsed.step_4 || parsed.creation || {},
                orchestration: parsed.step_5 || parsed.orchestration || {}
            };
            
            // Normalize leading indicators
            if (Array.isArray(mapped.objectives.leading_indicators)) {
                mapped.objectives.leading_indicators = {
                    systems: ['Sistem Cerdas', 'Sistem Saat Ini', 'Kompetitor'],
                    data: mapped.objectives.leading_indicators
                };
            }
            
            // Normalize presentation
            if (mapped.experiences.presentations) {
                mapped.experiences.presentation = {
                    types: mapped.experiences.presentations.map(function(t) { return {label: t.toString(), desc: ''}; }),
                    description: mapped.experiences.presentation_description || ''
                };
            }
            
            // Normalize module_statuses to creation.modules
            if (mapped.creation.module_statuses && !mapped.creation.modules) {
                mapped.creation.modules = mapped.creation.module_statuses.map(function(m) {
                    return { module: m.module, status: m.status, notes: m.notes };
                });
            }

            if (Object.keys(mapped).length > 0) {
                blueprintData = $.extend(true, blueprintData, mapped);
                useJsonDraft = true;
            }
        } catch(e) {}
    }



    // --- Helper Functions ---
    function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function createCard(title, content, headerRight = '') {
        return `
            <div class="bp-card">
                <div class="bp-card-header">
                    <div class="bp-card-header-title">${title}</div>
                    ${headerRight}
                </div>
                <div>${content}</div>
            </div>
        `;
    }

    function createDataItem(label, value) {
        if (!value || value.trim() === '') value = '-';
        let labelHtml = label ? `<div class="bp-label">${escapeHtml(label)}</div>` : '';
        return `
            <div class="bp-data-item">
                ${labelHtml}
                <div class="bp-value">${escapeHtml(value).replace(/\n/g, '<br>')}</div>
            </div>
        `;
    }

    // --- EXTRACTION & RENDERING ---
    setTimeout(function () {
        var $parser = $('#draft-parser');

        // ==========================================
        // 1. MEANINGFUL OBJECTIVES
        // ==========================================
        var objHtml = '';
        var orgGoals = [];
        $parser.find('#tab-objectives .obj-tabs').eq(0).find('.obj-tab-panel').each(function () {
            var goal = $(this).find('textarea').eq(0).val();
            var strategy = $(this).find('textarea').eq(1).val();
            var metrics = $(this).find('textarea').eq(2).val();
            if (goal) orgGoals.push({ goal: goal, strategy: strategy, metrics: metrics });
        });
        blueprintData.objectives.organizational = orgGoals;

        if (orgGoals.length > 0) {
            let tabsNav = '<div class="bp-tabs-nav">';
            let tabsContent = '<div class="bp-tabs-content">';
            orgGoals.forEach((g, i) => {
                let activeClass = i === 0 ? ' active' : '';
                tabsNav += `<button class="bp-tab-btn bp-tab-org${activeClass}" data-target="bp-org-panel-${i}">Objective ${i + 1}</button>`;

                tabsContent += `
                    <div class="bp-tab-panel bp-org-panel${activeClass}" id="bp-org-panel-${i}">
                        <div class="print-only-heading">Objective ${i + 1}</div>
                        <div style="margin-bottom: 24px;">
                            ${createDataItem('', g.goal)}
                            <div style="display: flex; gap: 24px; margin-top: 16px;">
                                <div style="flex: 1;">${createDataItem('Bagaimana cara mencapainya?', g.strategy)}</div>
                                <div style="flex: 1;">${createDataItem('Bagaimana cara mengukurnya?', g.metrics)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            tabsNav += '</div>';
            tabsContent += '</div>';

            var orgContent = `<div class="bp-tabs">${tabsNav}${tabsContent}</div>`;
            objHtml += createCard('Organizational Objectives', orgContent);
        }

        // Leading Indicators
        var leadingData = [];
        var headers = [];
        $parser.find('#leading-table thead th').each(function (i) {
            if (i <= 1 || i === $parser.find('#leading-table thead th').length - 1) return;
            var val = $(this).find('input').val();
            if (val) headers.push(val);
        });
        $parser.find('#leading-table tbody tr').each(function () {
            var feature = $(this).find('td').eq(1).find('input').val();
            var values = [];
            $(this).find('td').each(function (i) {
                if (i > 1 && i < $(this).parent().children().length - 1) {
                    values.push($(this).find('input').val());
                }
            });
            if (feature) leadingData.push({ feature: feature, values: values });
        });
        blueprintData.objectives.leading_indicators = { systems: headers, data: leadingData };

        if (leadingData.length > 0) {
            var tableHtml = `<table class="bp-table"><thead><tr><th>Fitur / Indikator</th>`;
            headers.forEach(h => tableHtml += `<th>${escapeHtml(h)}</th>`);
            tableHtml += `</tr></thead><tbody>`;
            leadingData.forEach(row => {
                tableHtml += `<tr><td><strong>${escapeHtml(row.feature)}</strong></td>`;
                row.values.forEach(v => tableHtml += `<td>${escapeHtml(v)}</td>`);
                tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table>`;
            objHtml += createCard('Leading Indicators', tableHtml);
        }

        // User Outcomes
        var outcomes = [];
        $parser.find('#outcome-tabs-content .obj-tab-panel').each(function () {
            var outcome = $(this).find('textarea').eq(0).val();
            var strategy = $(this).find('textarea').eq(1).val();
            var metrics = $(this).find('textarea').eq(2).val();
            if (outcome) outcomes.push({ outcome: outcome, strategy: strategy, metrics: metrics });
        });
        blueprintData.objectives.user_outcomes = outcomes;

        if (outcomes.length > 0) {
            let tabsNav = '<div class="bp-tabs-nav">';
            let tabsContent = '<div class="bp-tabs-content">';
            outcomes.forEach((g, i) => {
                let activeClass = i === 0 ? ' active' : '';
                tabsNav += `<button class="bp-tab-btn bp-tab-out${activeClass}" data-target="bp-out-panel-${i}">Outcome ${i + 1}</button>`;

                tabsContent += `
                    <div class="bp-tab-panel bp-out-panel${activeClass}" id="bp-out-panel-${i}">
                        <div class="print-only-heading">Outcome ${i + 1}</div>
                        <div style="margin-bottom: 24px;">
                            ${createDataItem('', g.outcome)}
                            <div style="display: flex; gap: 24px; margin-top: 16px;">
                                <div style="flex: 1;">${createDataItem('Bagaimana cara mencapainya?', g.strategy)}</div>
                                <div style="flex: 1;">${createDataItem('Bagaimana cara mengukurnya?', g.metrics)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            tabsNav += '</div>';
            tabsContent += '</div>';

            var outContent = `<div class="bp-tabs">${tabsNav}${tabsContent}</div>`;
            objHtml += createCard('User Outcomes', outContent);
        }

        // Model Properties
        var properties = [];
        $parser.find('#property-tabs-content .obj-tab-panel').each(function () {
            var prop = $(this).find('textarea').eq(0).val();
            var strategy = $(this).find('textarea').eq(1).val();
            var metrics = $(this).find('textarea').eq(2).val();
            if (prop) properties.push({ property: prop, strategy: strategy, metrics: metrics });
        });
        blueprintData.objectives.model_properties = properties;

        if (properties.length > 0) {
            let tabsNav = '<div class="bp-tabs-nav">';
            let tabsContent = '<div class="bp-tabs-content">';
            properties.forEach((g, i) => {
                let activeClass = i === 0 ? ' active' : '';
                tabsNav += `<button class="bp-tab-btn bp-tab-prop${activeClass}" data-target="bp-prop-panel-${i}">Property ${i + 1}</button>`;

                tabsContent += `
                    <div class="bp-tab-panel bp-prop-panel${activeClass}" id="bp-prop-panel-${i}">
                        <div class="print-only-heading">Property ${i + 1}</div>
                        <div style="margin-bottom: 24px;">
                            ${createDataItem('', g.property)}
                            <div style="display: flex; gap: 24px; margin-top: 16px;">
                                <div style="flex: 1;">${createDataItem('Bagaimana cara mencapainya?', g.strategy)}</div>
                                <div style="flex: 1;">${createDataItem('Bagaimana cara mengukurnya?', g.metrics)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            tabsNav += '</div>';
            tabsContent += '</div>';

            var propContent = `<div class="bp-tabs">${tabsNav}${tabsContent}</div>`;
            objHtml += createCard('Model Properties', propContent);
        }

        $('#render-objectives').html(objHtml);

        // ==========================================
        // 2. INTELLIGENCE EXPERIENCES
        // ==========================================
        var expHtml = '';
        var presentations = [];
        $parser.find('#tab-experiences .checkbox-item input:checked').each(function () {
            var label = $(this).siblings('.checkbox-label').text();
            var desc = $(this).siblings('.checkbox-desc').text();
            presentations.push({ label: label, desc: desc });
        });
        var presentationDesc = $parser.find('#tab-experiences > .form-section').eq(0).find('textarea').val();
        blueprintData.experiences.presentation = { types: presentations, description: presentationDesc };

        var presTags = '<div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;">' + presentations.map(p => `
            <div style="flex: 1; min-width: 220px; padding: 16px; border-radius: 10px; border: 1px solid rgba(37, 99, 235, 0.3); background: rgba(37, 99, 235, 0.1); box-shadow: 0 1px 3px rgba(37,99,235,0.05);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div style="width: 18px; height: 18px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>
                    <div style="font-weight: 700; color: var(--color-text); font-size: 15px;">${escapeHtml(p.label)}</div>
                </div>
                <div style="font-size: 13px; color: #3b82f6; padding-left: 26px; line-height: 1.4;">${escapeHtml(p.desc)}</div>
            </div>
        `).join('') + '</div>';

        expHtml += createCard('Penyajian Kecerdasan', `
            ${presTags}
            ${createDataItem('Deskripsi', presentationDesc)}
        `);

        // Functions
        var functions = [];
        $parser.find('#functions-table tbody tr').each(function () {
            var name = $(this).find('td').eq(1).find('input').val();
            var desc = $(this).find('td').eq(2).find('input').val();
            if (name) functions.push({ name: name, description: desc });
        });
        blueprintData.experiences.functions = functions;

        if (functions.length > 0) {
            var fList = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            functions.forEach((f, i) => {
                fList += `
                <div style="display: flex; gap: 16px; align-items: flex-start; padding: 16px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; background: var(--color-gray-light); border: 1px solid var(--color-border); color: #3b82f6; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 15px;">
                        ${i + 1}
                    </div>
                    <div>
                        <div style="font-weight: 700; color: var(--color-text); font-size: 16px; margin-bottom: 4px;">${escapeHtml(f.name)}</div>
                        <div style="color: var(--color-gray); font-size: 14px; line-height: 1.5;">${escapeHtml(f.description)}</div>
                    </div>
                </div>`;
            });
            fList += `</div>`;
            expHtml += createCard('Fungsi-Fungsi Realisasi', fList);
        }

        // Error Minimization & Data Collection
        var errorMin = [];
        $parser.find('#error-minimization tbody tr, #error-minimization .list-item').each(function () {
            var func = $(this).find('select').val() || $(this).find('td').eq(1).find('select').val();
            var strat = $(this).find('input').val() || $(this).find('td').eq(2).find('input').val();
            if (func && strat) errorMin.push({ function: func, strategy: strat });
        });
        blueprintData.experiences.error_minimization = errorMin;

        var dataCol = [];
        $parser.find('#data-collection tbody tr, #data-collection .list-item').each(function () {
            var func = $(this).find('select').val() || $(this).find('td').eq(1).find('select').val();
            var plan = $(this).find('input').val() || $(this).find('td').eq(2).find('input').val();
            if (func && plan) dataCol.push({ function: func, plan: plan });
        });
        blueprintData.experiences.data_collection = dataCol;

        if (errorMin.length > 0) {
            var eList = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            errorMin.forEach(f => {
                eList += `
                <div style="padding: 14px 16px; background: var(--color-bg); border-radius: 8px; border: 1px solid var(--color-border);">
                    <div style="font-weight: 600; color: var(--color-text); font-size: 14px; margin-bottom: 4px;">Target: ${escapeHtml(f.function)}</div>
                    <div style="color: var(--color-gray); font-size: 14px;">${escapeHtml(f.strategy)}</div>
                </div>`;
            });
            eList += `</div>`;
            expHtml += createCard('Strategi Minimalisasi Kesalahan (Error Handling)', eList);
        }

        if (dataCol.length > 0) {
            var dList = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            dataCol.forEach(f => {
                dList += `
                <div style="padding: 14px 16px; background: var(--color-bg); border-radius: 8px; border: 1px solid var(--color-border);">
                    <div style="font-weight: 600; color: var(--color-text); font-size: 14px; margin-bottom: 4px;">Target: ${escapeHtml(f.function)}</div>
                    <div style="color: var(--color-gray); font-size: 14px;">${escapeHtml(f.plan)}</div>
                </div>`;
            });
            dList += `</div>`;
            expHtml += createCard('Rencana Pengumpulan Data (Continuous Learning)', dList);
        }

        $('#render-experiences').html(expHtml);

        // ==========================================
        // 3. INTELLIGENCE IMPLEMENTATION
        // ==========================================
        var impHtml = '';
        var processes = [];
        $parser.find('#process-table tbody tr').each(function () {
            var name = $(this).find('td').eq(1).find('input').val();
            var desc = $(this).find('td').eq(2).find('input').val();
            if (name) processes.push({ name: name, description: desc });
        });
        blueprintData.implementation.business_processes = processes;

        var techs = [];
        $parser.find('#tech-table tbody tr').each(function () {
            var name = $(this).find('.process-name').text();
            var tech = $(this).find('td').eq(2).find('input').val();
            if (tech) techs.push({ process: name, technologies: tech });
        });
        blueprintData.implementation.technologies = techs;

        var smarts = [];
        $parser.find('#smart-processes .smart-process-item').each(function () {
            var isChecked = $(this).find('input.smart-check').is(':checked');
            var name = $(this).find('.checkbox-label').text();
            var reason = $(this).find('.smart-reason input').val();
            if (isChecked && name !== '-') smarts.push({ process: name, reason: reason });
        });
        blueprintData.implementation.smart_processes = smarts;

        if (processes.length > 0) {
            var pTable = `<table class="bp-table"><thead><tr><th width="40">No</th><th>Proses Bisnis</th><th>Teknologi</th><th>Status AI</th></tr></thead><tbody>`;
            processes.forEach((p, i) => {
                var techRow = techs.find(t => t.process === p.name);
                var techStr = techRow ? techRow.technologies : '-';
                var smartRow = smarts.find(s => s.process === p.name);
                var smartBadge = smartRow ? `<span class="bp-badge bp-badge-blue" title="${escapeHtml(smartRow.reason)}">Proses AI</span>` : `<span class="bp-badge bp-badge-gray">Sistem Biasa</span>`;

                pTable += `<tr>
                    <td>${i + 1}</td>
                    <td><strong>${escapeHtml(p.name)}</strong><br><span style="font-size:12px;color: var(--color-gray);">${escapeHtml(p.description)}</span></td>
                    <td>${escapeHtml(techStr)}</td>
                    <td>${smartBadge}</td>
                </tr>`;
            });
            pTable += `</tbody></table>`;
            impHtml += createCard('Arsitektur Proses Bisnis & Teknologi', pTable);
        }

        if (smarts.length > 0) {
            var sList = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            smarts.forEach(s => {
                sList += `
                <div style="padding: 14px 16px; background: var(--color-bg); border-radius: 8px; border: 1px solid var(--color-border);">
                    <div style="font-weight: 600; color: var(--color-text); font-size: 14px; margin-bottom: 4px;">${escapeHtml(s.process)}</div>
                    <div style="color: var(--color-gray); font-size: 14px;">${escapeHtml(s.reason)}</div>
                </div>`;
            });
            sList += `</div>`;
            impHtml += createCard('Justifikasi Penggunaan AI', sList);
        }

        var filesImpl = [];
        $parser.find('#preview-implementation .upload-file-item').each(function () {
            var name = $(this).find('.file-name').text();
            var link = $(this).find('a').attr('href');
            if (name && link) filesImpl.push({ name: name, url: link });
        });
        blueprintData.implementation.attachments = filesImpl;
        if (filesImpl.length > 0) {
            var aLinks = filesImpl.map(f => {
                var urlNoQuery = f.url.split('?')[0];
                var ext = urlNoQuery.split('.').pop().toLowerCase();
                var label = `<div style="font-size:14px; font-weight:600; margin-bottom:8px; color: var(--color-gray);">${escapeHtml(f.name)}</div>`;
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                    return `<div style="margin-bottom: 24px;">${label}<img src="${f.url}" style="max-width:100%; max-height:400px; object-fit:contain; border-radius:8px; border: 1px solid var(--color-border);"></div>`;
                } else {
                    return `<div style="margin-bottom: 24px; border: 1px solid var(--color-border); border-radius: 8px; padding: 16px; background: var(--color-gray-light); display: flex; align-items: center; justify-content: space-between; gap: 16px; page-break-inside: avoid;">
                        <div style="overflow: hidden;">
                            <div style="font-size:14px; font-weight:600; margin-bottom:4px; color: var(--color-text); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(f.name)}</div>
                            <div style="font-size:12px; color: var(--color-gray); font-family: monospace; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${window.location.origin}${f.url}</div>
                        </div>
                        <a href="${f.url}" target="_blank" style="white-space: nowrap; display:inline-flex; align-items:center; padding:8px 16px; background:#2563eb; color:white; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500;">📄 Buka Dokumen</a>
                    </div>`;
                }
            }).join('');
            impHtml += createCard('Lampiran Implementasi', aLinks);
        }

        if (impHtml.trim() === '') {
            impHtml = '<div style="padding: 32px; text-align: center; color: var(--color-gray); background: var(--color-gray-light); border-radius: 12px; border: 1px dashed #cbd5e1; font-weight: 500;">Intelligence Implementation belum didefinisikan.</div>';
        }

        $('#render-implementation').html(impHtml);

        // ==========================================
        // 4. CREATION STATUS
        // ==========================================
        var creHtml = '';
        var constraints = [];
        $parser.find('#constraints-table tbody tr').each(function () {
            var cat = $(this).find('td').eq(1).find('select option:selected').text();
            var desc = $(this).find('td').eq(2).find('input').val();
            if (cat && cat !== 'Pilih...' && desc) constraints.push({ category: cat, description: desc });
        });
        blueprintData.creation.constraints = constraints;

        if (constraints.length > 0) {
            function getCatStyle(cat) {
                return { bg: 'var(--color-accent)', shadow: 'rgba(37, 99, 235, 0.2)', border: 'var(--color-accent)', text: 'var(--color-text)' };
            }

            var groupedConstraints = {};
            constraints.forEach(c => {
                if (!groupedConstraints[c.category]) groupedConstraints[c.category] = [];
                groupedConstraints[c.category].push(c.description);
            });

            var cList = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: stretch;">`;
            for (let cat in groupedConstraints) {
                let s = getCatStyle(cat);
                cList += `
                <div class="bp-print-avoid" style="background: var(--color-bg); border: 1px solid var(--color-border); border-top: 4px solid ${s.bg}; border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
                    <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 800; color: ${s.text}; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--color-border); padding-bottom: 12px;">
                        <span style="display: block; width: 8px; height: 8px; background: ${s.bg}; border-radius: 50%; box-shadow: 0 0 0 3px ${s.shadow};"></span>
                        ${escapeHtml(cat)}
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">`;
                
                groupedConstraints[cat].forEach(desc => {
                    cList += `
                        <div style="display: flex; gap: 12px;">
                            <span style="color: ${s.bg}; font-size: 16px; line-height: 1.4; opacity: 0.7;">&bull;</span>
                            <div style="color: var(--color-gray); font-size: 14px; line-height: 1.6;">${escapeHtml(desc)}</div>
                        </div>`;
                });

                cList += `
                    </div>
                </div>`;
            }
            cList += `</div>`;
            creHtml += createCard('Batasan Pengembangan (Constraints)', cList);
        }

        var statuses = [];
        $parser.find('#status-table tbody tr').each(function () {
            var name = $(this).find('td').eq(1).text();
            var status = $(this).find('td').eq(2).find('select').val();
            var notes = $(this).find('td').eq(3).find('input').val();
            if (name && name !== '-') statuses.push({ module: name, status: status, notes: notes });
        });
        blueprintData.creation.module_statuses = statuses;

        if (statuses.length > 0) {
            var sList = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            statuses.forEach(s => {
                var badge = 'bp-badge-gray';
                var text = s.status;
                if (s.status === 'done') { badge = 'bp-badge-green'; text = 'Selesai'; }
                else if (s.status === 'in_progress') { badge = 'bp-badge-blue'; text = 'Sedang Berjalan'; }
                else if (s.status === 'blocked') { badge = 'bp-badge-gray'; text = 'Terhambat'; }

                sList += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="flex: 1; padding-right: 16px;">
                        <div style="font-weight: 700; color: var(--color-text); font-size: 15px; margin-bottom: 4px;">${escapeHtml(s.module)}</div>
                        <div style="color: var(--color-gray); font-size: 13px;">${escapeHtml(s.notes)}</div>
                    </div>
                    <div style="flex-shrink: 0;">
                        <span class="bp-badge ${badge}">${text}</span>
                    </div>
                </div>`;
            });
            sList += `</div>`;
            creHtml += createCard('Status Realisasi Modul', sList);
        }
        var filesCre = [];
        $parser.find('#preview-creation .upload-file-item').each(function () {
            var name = $(this).find('.file-name').text();
            var link = $(this).find('a').attr('href');
            if (name && link) filesCre.push({ name: name, url: link });
        });
        blueprintData.creation.attachments = filesCre;
        if (filesCre.length > 0) {
            var aLinks = filesCre.map(f => {
                var urlNoQuery = f.url.split('?')[0];
                var ext = urlNoQuery.split('.').pop().toLowerCase();
                var label = `<div style="font-size:14px; font-weight:600; margin-bottom:8px; color: var(--color-gray);">${escapeHtml(f.name)}</div>`;
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                    return `<div style="margin-bottom: 24px;">${label}<img src="${f.url}" style="max-width:100%; max-height:400px; object-fit:contain; border-radius:8px; border: 1px solid var(--color-border);"></div>`;
                } else {
                    return `<div style="margin-bottom: 24px; border: 1px solid var(--color-border); border-radius: 8px; padding: 16px; background: var(--color-gray-light); display: flex; align-items: center; justify-content: space-between; gap: 16px; page-break-inside: avoid;">
                        <div style="overflow: hidden;">
                            <div style="font-size:14px; font-weight:600; margin-bottom:4px; color: var(--color-text); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(f.name)}</div>
                            <div style="font-size:12px; color: var(--color-gray); font-family: monospace; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${window.location.origin}${f.url}</div>
                        </div>
                        <a href="${f.url}" target="_blank" style="white-space: nowrap; display:inline-flex; align-items:center; padding:8px 16px; background:#2563eb; color:white; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500;">📄 Buka Dokumen</a>
                    </div>`;
                }
            }).join('');
            creHtml += createCard('Bukti / Evidence', aLinks);
        }

        if (creHtml.trim() === '') {
            creHtml = '<div style="padding: 32px; text-align: center; color: var(--color-gray); background: var(--color-gray-light); border-radius: 12px; border: 1px dashed #cbd5e1; font-weight: 500;">Creation Status belum didefinisikan.</div>';
        }

        $('#render-creation').html(creHtml);

        // ==========================================
        // 5. ORCHESTRATION
        // ==========================================
        var orcHtml = '';
        var gantt = [];
        $parser.find('#gantt-table tbody tr').each(function () {
            var cat = $(this).find('td').eq(1).find('select').val();
            var name = $(this).find('td').eq(2).find('input').val();
            var start = $(this).find('td').eq(3).find('input').val();
            var end = $(this).find('td').eq(4).find('input').val();
            var pic = $(this).find('td').eq(5).find('input').val();
            var status = $(this).find('td').eq(6).find('select').val();
            if (name) gantt.push({ category: cat, phase: name, start_date: start, end_date: end, pic: pic, status: status });
        });
        blueprintData.orchestration.timeline = gantt;

        if (gantt.length > 0) {
            // Build Table View
            var gTable = `<table class="bp-table" id="view-gantt-table" style="display: none;"><thead><tr><th>Kategori</th><th>Fase</th><th>Timeline</th><th>PIC</th><th>Status</th></tr></thead><tbody>`;
            gantt.forEach(g => {
                var badge = 'bp-badge-gray';
                if (g.status === 'done') badge = 'bp-badge-green';
                else if (g.status === 'in_progress') badge = 'bp-badge-blue';

                gTable += `<tr>
                    <td><span style="text-transform:capitalize; color: var(--color-gray); font-size:13px;">${escapeHtml(g.category)}</span></td>
                    <td><strong>${escapeHtml(g.phase)}</strong></td>
                    <td>${g.start_date} s/d ${g.end_date}</td>
                    <td>${escapeHtml(g.pic)}</td>
                    <td><span class="bp-badge ${badge}" style="text-transform:capitalize;">${escapeHtml(g.status).replace('_', ' ')}</span></td>
                </tr>`;
            });
            gTable += `</tbody></table>`;

            // Build Visual Gantt Chart View (Jira Style)
            var ganttHtml = `<div class="gantt-wrapper" id="view-gantt-visual" style="margin-bottom: 16px;">`;

            var groupedPhases = {};
            let minDate = null, maxDate = null;
            gantt.forEach(g => {
                let start = new Date(g.start_date);
                let end = new Date(g.end_date);
                if (isNaN(start) || isNaN(end)) return;

                if (!minDate || start < minDate) minDate = start;
                if (!maxDate || end > maxDate) maxDate = end;

                if (!groupedPhases[g.category]) groupedPhases[g.category] = [];
                groupedPhases[g.category].push({ name: g.phase, start: start, end: end, status: g.status });
            });

            if (Object.keys(groupedPhases).length === 0 || !minDate || !maxDate) {
                ganttHtml += '<p style="color: var(--color-gray);">Tidak ada data timeline yang valid.</p></div>';
            } else {
                var paddingDays = 7;
                minDate = new Date(minDate.getTime() - paddingDays * 24 * 60 * 60 * 1000);
                maxDate = new Date(maxDate.getTime() + paddingDays * 24 * 60 * 60 * 1000);
                var totalDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

                ganttHtml += '<div class="jira-timeline-wrapper" style="display: flex; border: 1px solid var(--color-border); border-radius: 8px; width: 100%; overflow: hidden; font-family: sans-serif; background: var(--color-bg);">';

                // SIDEBAR
                var sidebarHtml = '<div class="jira-sidebar" style="width: 250px; flex-shrink: 0; border-right: 1px solid var(--color-border); background: var(--color-gray-light); display: flex; flex-direction: column;">';
                sidebarHtml += '<div class="jira-sidebar-header" style="height: 40px; padding: 0 16px; display: flex; align-items: center; font-weight: 700; font-size: 13px; border-bottom: 1px solid var(--color-border); color: var(--color-text);">Kategori / Fase</div>';

                Object.keys(groupedPhases).forEach(function (cat) {
                    sidebarHtml += '<div class="jira-sidebar-category" style="height: 32px; padding: 0 16px; display: flex; align-items: center; font-weight: 700; font-size: 12px; background: var(--color-gray-light); color: var(--color-text); border-bottom: 1px solid var(--color-border); text-transform: capitalize;">' + escapeHtml(cat) + '</div>';
                    groupedPhases[cat].forEach(function (p) {
                        sidebarHtml += '<div class="jira-sidebar-row" style="height: 40px; padding: 0 16px 0 24px; display: flex; align-items: center; font-size: 12px; color: var(--color-gray); border-bottom: 1px solid var(--color-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + '</div>';
                    });
                });
                sidebarHtml += '</div>';

                // TRACK CONTAINER
                var trackHtml = '<div class="jira-track-container" style="flex-grow: 1; display: flex; flex-direction: column; position: relative;">';

                // GRID BACKGROUND (Months)
                var gridBgHtml = '<div class="jira-track-grid-bg" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; pointer-events: none;">';
                var currentDate = new Date(minDate);
                var currentMonth = currentDate.getMonth();
                var daysInMonth = 0;
                var monthsData = [];

                for (var i = 0; i <= totalDays; i++) {
                    var d = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
                    if (d.getMonth() === currentMonth) {
                        daysInMonth++;
                    } else {
                        monthsData.push({ monthStr: currentDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' }), days: daysInMonth });
                        currentDate = d;
                        currentMonth = d.getMonth();
                        daysInMonth = 1;
                    }
                }
                if (daysInMonth > 0) {
                    monthsData.push({ monthStr: currentDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' }), days: daysInMonth });
                }

                var trackHeaderHtml = '<div class="jira-track-header" style="height: 40px; display: flex; border-bottom: 1px solid var(--color-border); background: var(--color-gray-light);">';

                monthsData.forEach(function (m) {
                    var pct = (m.days / totalDays) * 100;
                    trackHeaderHtml += '<div class="jira-track-month" style="width: ' + pct + '%; border-right: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-gray); flex-shrink: 0;">' + m.monthStr + '</div>';
                    gridBgHtml += '<div style="width: ' + pct + '%; border-right: 1px dashed var(--color-border); flex-shrink: 0;"></div>';
                });
                trackHeaderHtml += '</div>';
                gridBgHtml += '</div>';

                trackHtml += trackHeaderHtml + gridBgHtml;

                // TRACK BODY
                var trackBodyHtml = '<div class="jira-track-body" style="width: 100%; position: relative; z-index: 1;">';

                Object.keys(groupedPhases).forEach(function (cat) {
                    trackBodyHtml += '<div style="height: 32px; border-bottom: 1px solid var(--color-border); background: var(--color-gray-light);"></div>';
                    groupedPhases[cat].forEach(function (p) {
                        var startOffsetDays = (p.start - minDate) / (1000 * 60 * 60 * 24);
                        var durationDays = ((p.end - p.start) / (1000 * 60 * 60 * 24)) + 1;

                        var leftPct = (startOffsetDays / totalDays) * 100;
                        var widthPct = (durationDays / totalDays) * 100;

                        var bgColor = '#9ca3af'; // gray
                        if (p.status === 'selesai' || p.status === 'done') bgColor = '#10b981'; // green
                        if (p.status === 'berjalan' || p.status === 'in_progress') bgColor = '#3b82f6'; // blue

                        var shortStart = p.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                        var shortEnd = p.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                        var shortDateRange = shortStart + ' - ' + shortEnd;

                        var startDateStr = p.start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        var endDateStr = p.end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        var dateRange = startDateStr + ' s/d ' + endDateStr;

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

                        trackBodyHtml += '<div class="jira-track-row" style="height: 40px; position: relative; border-bottom: 1px solid transparent;">';
                        trackBodyHtml += '<div class="jira-bar" data-tooltip-title="' + escapeHtml(p.name) + '" data-tooltip-date="' + dateRange + '" style="position: absolute; top: 8px; height: 24px; border-radius: 4px; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1); background: ' + bgColor + '; left: ' + leftPct + '%; width: ' + widthPct + '%; cursor: pointer; transition: filter 0.2s;">' + barInnerHtml + '</div>';
                        trackBodyHtml += '</div>';
                    });
                });
                trackBodyHtml += '</div>';
                trackHtml += trackBodyHtml + '</div>';

                ganttHtml += sidebarHtml + trackHtml + '</div></div>';
            }

            // Filter Toggle HTML
            var filterHtml = `
                <div class="bp-filter-group" id="gantt-filter">
                    <button class="bp-filter-btn active" data-view="visual">Gantt Chart</button>
                    <button class="bp-filter-btn" data-view="table">Table</button>
                </div>
            `;

            orcHtml += createCard('Timeline & Penugasan (Gantt)', ganttHtml + gTable, filterHtml);
        }

        var operators = [];
        $parser.find('#operators-table tbody tr').each(function () {
            var name = $(this).find('td').eq(1).find('input').val();
            var role = $(this).find('td').eq(2).find('input').val();
            var contact = $(this).find('td').eq(3).find('input').val();
            if (name) operators.push({ name: name, role: role, contact: contact });
        });
        blueprintData.orchestration.operators = operators;

        if (operators.length > 0) {
            var oTable = `<table class="bp-table"><thead><tr><th>Nama Operator</th><th>Peran operasional</th><th>Kontak</th></tr></thead><tbody>`;
            operators.forEach(o => {
                oTable += `<tr><td><strong>${escapeHtml(o.name)}</strong></td><td>${escapeHtml(o.role)}</td><td>${escapeHtml(o.contact)}</td></tr>`;
            });
            oTable += `</tbody></table>`;
            orcHtml += createCard('Tim Pelaksana Operasi', oTable);
        }

        var filesOrc = [];
        $parser.find('#preview-orchestration .upload-file-item').each(function () {
            var name = $(this).find('.file-name').text();
            var link = $(this).find('a').attr('href');
            if (name && link) filesOrc.push({ name: name, url: link });
        });
        blueprintData.orchestration.attachments = filesOrc;
        if (filesOrc.length > 0) {
            var aLinks = filesOrc.map(f => {
                var urlNoQuery = f.url.split('?')[0];
                var ext = urlNoQuery.split('.').pop().toLowerCase();
                var label = `<div style="font-size:14px; font-weight:600; margin-bottom:8px; color: var(--color-gray);">${escapeHtml(f.name)}</div>`;
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                    return `<div style="margin-bottom: 24px;">${label}<img src="${f.url}" style="max-width:100%; max-height:400px; object-fit:contain; border-radius:8px; border: 1px solid var(--color-border);"></div>`;
                } else {
                    return `<div style="margin-bottom: 24px; border: 1px solid var(--color-border); border-radius: 8px; padding: 16px; background: var(--color-gray-light); display: flex; align-items: center; justify-content: space-between; gap: 16px; page-break-inside: avoid;">
                        <div style="overflow: hidden;">
                            <div style="font-size:14px; font-weight:600; margin-bottom:4px; color: var(--color-text); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(f.name)}</div>
                            <div style="font-size:12px; color: var(--color-gray); font-family: monospace; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${window.location.origin}${f.url}</div>
                        </div>
                        <a href="${f.url}" target="_blank" style="white-space: nowrap; display:inline-flex; align-items:center; padding:8px 16px; background:#2563eb; color:white; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500;">📄 Buka Dokumen</a>
                    </div>`;
                }
            }).join('');
            orcHtml += createCard('Dokumen SOP', aLinks);
        }

        if (orcHtml.trim() === '') {
            orcHtml = '<div style="padding: 32px; text-align: center; color: var(--color-gray); background: var(--color-gray-light); border-radius: 12px; border: 1px dashed #cbd5e1; font-weight: 500;">Fase Orkestrasi belum didefinisikan.</div>';
        }

        $('#render-orchestration').html(orcHtml);

        // ==========================================
        // PREPARE API VIEW SWAGGER UI
        // ==========================================
        var baseUrl = window.location.origin + '/api/projects/' + SERVER_PROJECT_ID + '/';
        
        var endpoints = [
            { method: 'GET', path: '', name: 'Get All Data', desc: 'Retrieve the entire blueprint data payload.', resp: blueprintData },
            { method: 'GET', path: 'objectives/', name: 'Meaningful Objectives', desc: 'Retrieve organizational goals and user outcomes.', resp: blueprintData.objectives },
            { method: 'GET', path: 'experiences/', name: 'Intelligence Experiences', desc: 'Retrieve AI presentation and functions.', resp: blueprintData.experiences },
            { method: 'GET', path: 'implementation/', name: 'Intelligence Implementation', desc: 'Retrieve processes and technologies.', resp: blueprintData.implementation },
            { method: 'GET', path: 'creation/', name: 'Creation Status', desc: 'Retrieve module constraints and statuses.', resp: blueprintData.creation },
            { method: 'GET', path: 'orchestration/', name: 'Orchestration', desc: 'Retrieve timeline and teams.', resp: blueprintData.orchestration },
            { method: 'PUT', path: 'creation/status/', name: 'Update Creation Status', desc: 'Update the status of a specific module.', req: { module: 'Nama Modul', status: 'done' }, resp: { success: true, message: 'Status updated' } },
            { method: 'PUT', path: 'orchestration/status/', name: 'Update Orchestration Status', desc: 'Update the status of a specific phase.', req: { phase: 'Nama Phase', status: 'done' }, resp: { success: true, message: 'Status updated' } }
        ];
        
        var swaggerHtml = `
        <style>
            .swag-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
            .swag-scroll::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 4px; }
            .swag-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            .swag-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            .swag-tab-btn { background: transparent; color: var(--color-gray); border: 1px solid transparent; padding: 12px 24px; cursor: pointer; font-size: 14px; font-weight: 600; border-top-left-radius: 6px; border-top-right-radius: 6px; margin-right: 4px; transition: all 0.2s; position: relative; top: 1px; border-bottom: 1px solid var(--color-border); }
            .swag-tab-btn.active { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-bottom: 1px solid #ffffff; border-top: 2px solid #3b82f6; }
            .swag-tab-btn:hover:not(.active) { color: #334155; background: #e2e8f0; border-bottom: 1px solid var(--color-border); }
            .swag-tab-content { display: none; }
            .swag-tab-content.active { display: block; }
        </style>
        <div style="background: var(--color-bg); border-radius: 8px; overflow: hidden; font-family: sans-serif; color: var(--color-text); border: 1px solid var(--color-border); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">`;
        
        endpoints.forEach((ep, i) => {
            var color = ep.method === 'GET' ? '#3b82f6' : (ep.method === 'PUT' ? '#f59e0b' : '#10b981');
            var bgColor = ep.method === 'GET' ? 'rgba(59,130,246,0.1)' : (ep.method === 'PUT' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)');
            
            var reqTabsHtml = '';
            var reqContentHtml = '';
            
            // Build Request Tabs
            reqTabsHtml += `<button class="swag-tab-btn active" onclick="switchSwagTab(this, 'swag-ep-${i}')">Endpoint</button>`;
            reqTabsHtml += `<button class="swag-tab-btn" onclick="switchSwagTab(this, 'swag-head-${i}')">Header</button>`;
            reqTabsHtml += `<button class="swag-tab-btn" onclick="switchSwagTab(this, 'swag-tab-body-${i}')">Body</button>`;
            reqTabsHtml += `<button class="swag-tab-btn" onclick="switchSwagTab(this, 'swag-req-${i}')">Contoh Request</button>`;
            
            // Endpoint Content
            reqContentHtml += `
            <div id="swag-ep-${i}" class="swag-tab-content active">
                <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="width: 120px; color: var(--color-gray); font-size: 12px; font-weight: 700; text-transform: uppercase;">Method</div>
                    <div style="color: var(--color-text); font-weight: 600;">${ep.method}</div>
                </div>
                <div style="display: flex; gap: 16px; align-items: center; margin-top: 12px;">
                    <div style="width: 120px; color: var(--color-gray); font-size: 12px; font-weight: 700; text-transform: uppercase;">Production URL</div>
                    <div style="background: var(--color-gray-light); padding: 6px 12px; border-radius: 4px; color: #059669; font-family: monospace; font-size: 13px; user-select: all; word-break: break-all;">${baseUrl}${ep.path}</div>
                </div>
            </div>`;
            
            // Header Content
            reqContentHtml += `
            <div id="swag-head-${i}" class="swag-tab-content">
                <div style="color: var(--color-text); margin-bottom: 12px; font-size: 13px; font-weight: 600;">Header Wajib:</div>
                <div style="border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: var(--color-gray-light); color: #334155;">
                            <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Key</th>
                            <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Value</th>
                            <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--color-border); background: var(--color-bg);">
                            <td style="padding: 12px; color: var(--color-text);">Content-Type</td>
                            <td style="padding: 12px; color: #2563eb;">application/json</td>
                            <td style="padding: 12px; color: var(--color-gray);">Wajib untuk semua request</td>
                        </tr>
                    </tbody>
                </table>
                </div>
            </div>`;
            
            // Body Content
            if (ep.method === 'GET') {
                reqContentHtml += `
                <div id="swag-tab-body-${i}" class="swag-tab-content">
                    <div style="color: var(--color-gray); font-size: 13px; padding: 12px; background: var(--color-gray-light); border-radius: 6px; border: 1px dashed #cbd5e1;">Endpoint ini tidak memerlukan parameter khusus pada body maupun query string.</div>
                </div>`;
            } else {
                var bodyRows = '';
                if (ep.req) {
                    for (var key in ep.req) {
                        var desc = key === 'status' ? "Pilihan: 'done', 'in_progress', 'blocked'" : ("Nama " + key + " yang ingin diupdate statusnya");
                        bodyRows += `
                            <tr style="border-bottom: 1px solid var(--color-border); background: var(--color-bg);">
                                <td style="padding: 12px; color: var(--color-text);">${key}</td>
                                <td style="padding: 12px; color: #9333ea;">String</td>
                                <td style="padding: 12px; color: #059669;">Ya</td>
                                <td style="padding: 12px; color: var(--color-gray);">${desc}</td>
                            </tr>`;
                    }
                }
                
                reqContentHtml += `
                <div id="swag-tab-body-${i}" class="swag-tab-content">
                    <div style="border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                        <thead>
                            <tr style="background: var(--color-gray-light); color: #334155;">
                                <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Parameter</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Tipe</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Wajib</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--color-border);">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
${bodyRows}
                        </tbody>
                    </table>
                    </div>
                </div>`;
            }
            
            // Contoh Request Content
            var fetchCode = '';
            if (ep.method === 'GET') {
                fetchCode = `// Contoh menggunakan javascript fetch\nfetch("${baseUrl}${ep.path}")\n  .then(res => res.json())\n  .then(data => console.log(data));`;
            } else {
                var reqBodyStr = JSON.stringify(ep.req || {}, null, 2).replace(/\n/g, '\n  ');
                fetchCode = `// Contoh menggunakan javascript fetch\nfetch("${baseUrl}${ep.path}", {\n  method: "${ep.method}",\n  headers: {\n    "Content-Type": "application/json",\n    // Gunakan fungsi cookie helper django untuk mengambil token\n    "X-CSRFToken": getCookie('csrftoken')\n  },\n  body: JSON.stringify(${reqBodyStr})\n})\n.then(res => res.json())\n.then(data => console.log(data));`;
            }
            
            reqContentHtml += `
            <div id="swag-req-${i}" class="swag-tab-content">
                <pre class="swag-scroll" style="margin: 0; background: var(--color-gray-light); padding: 16px; border-radius: 6px; color: #334155; font-family: monospace; font-size: 13px; overflow-x: auto;">${escapeHtml(fetchCode)}</pre>
            </div>`;
            
            // Response Tabs
            var errTabLabel = ep.method === 'GET' ? '404 Not Found (Gagal)' : '400 Bad Request (Gagal)';
            var resTabsHtml = `
            <button class="swag-tab-btn active" onclick="switchSwagTab(this, 'swag-res-succ-${i}')">200 OK (Berhasil)</button>
            <button class="swag-tab-btn" onclick="switchSwagTab(this, 'swag-res-err-${i}')">${errTabLabel}</button>`;
            
            var errResp = ep.method === 'GET' 
                ? { error: "Project with id " + SERVER_PROJECT_ID + " not found." }
                : { error: "Invalid payload", details: { module: ["This field is required."] } };
            
            var resContentHtml = `
            <div id="swag-res-succ-${i}" class="swag-tab-content active">
                <pre class="swag-scroll" style="margin: 0; background: var(--color-gray-light); padding: 16px; border-radius: 6px; color: #059669; font-family: monospace; font-size: 13px; overflow-x: auto; max-height: 400px;">${JSON.stringify(ep.resp, null, 2)}</pre>
            </div>
            <div id="swag-res-err-${i}" class="swag-tab-content">
                <pre class="swag-scroll" style="margin: 0; background: var(--color-gray-light); padding: 16px; border-radius: 6px; color: #dc2626; font-family: monospace; font-size: 13px; overflow-x: auto;">${JSON.stringify(errResp, null, 2)}</pre>
            </div>`;

            swaggerHtml += `
            <div style="border-bottom: 1px solid var(--color-border);">
                <!-- Accordion Header -->
                <div onclick="document.getElementById('swag-body-${i}').style.display = document.getElementById('swag-body-${i}').style.display === 'none' ? 'block' : 'none';" style="padding: 16px 20px; cursor: pointer; display: flex; align-items: center; background: ${bgColor}; transition: background 0.2s;">
                    <span style="font-weight: 800; background: ${color}; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 13px; margin-right: 16px; min-width: 45px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${ep.method}</span>
                    <span style="font-size: 15px; font-weight: 700; font-family: monospace; color: var(--color-text);">/api/projects/{id}/${ep.path}</span>
                    <span style="margin-left: auto; color: var(--color-gray); font-size: 14px;">${escapeHtml(ep.name)}</span>
                </div>
                
                <!-- Accordion Body -->
                <div id="swag-body-${i}" style="display: none; padding: 24px; background: var(--color-bg); border-top: 1px solid var(--color-border);">
                    <div style="color: var(--color-gray); font-size: 14px; margin-bottom: 24px;">${escapeHtml(ep.desc)}</div>
                    
                    <h3 style="color: var(--color-text); font-size: 18px; margin: 0 0 16px 0;">Request</h3>
                    <div style="background: var(--color-bg); border-radius: 6px; margin-bottom: 32px; border: 1px solid var(--color-border);">
                        <div style="display: flex; border-bottom: 1px solid var(--color-border); padding: 8px 8px 0 8px; background: var(--color-gray-light); border-top-left-radius: 6px; border-top-right-radius: 6px;">
                            ${reqTabsHtml}
                        </div>
                        <div style="padding: 16px;">
                            ${reqContentHtml}
                        </div>
                    </div>
                    
                    <h3 style="color: var(--color-text); font-size: 18px; margin: 0 0 16px 0;">Response</h3>
                    <div style="background: var(--color-bg); border-radius: 6px; border: 1px solid var(--color-border);">
                        <div style="display: flex; border-bottom: 1px solid var(--color-border); padding: 8px 8px 0 8px; background: var(--color-gray-light); border-top-left-radius: 6px; border-top-right-radius: 6px;">
                            ${resTabsHtml}
                        </div>
                        <div style="padding: 16px;">
                            ${resContentHtml}
                        </div>
                    </div>
                </div>
            </div>`;
        });
        
        swaggerHtml += '</div>';
        
        // Inject JS helper for tabs
        swaggerHtml += `
        <script>
            function switchSwagTab(btn, targetId) {
                var group = btn.parentElement.nextElementSibling;
                Array.from(btn.parentElement.children).forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                Array.from(group.children).forEach(c => {
                    if (c.classList.contains('swag-tab-content')) {
                        c.classList.remove('active');
                    }
                });
                document.getElementById(targetId).classList.add('active');
            }
        </script>`;
        $('#swagger-container').html(swaggerHtml);

        // Hide Loading
        $('#bp-loading').fadeOut(300);

        // Gantt Filter interactions
        $(document).on('click', '#gantt-filter .bp-filter-btn', function () {
            $('#gantt-filter .bp-filter-btn').removeClass('active');
            $(this).addClass('active');

            if ($(this).data('view') === 'table') {
                $('#view-gantt-visual').hide();
                $('#view-gantt-table').show();
            } else {
                $('#view-gantt-table').hide();
                $('#view-gantt-visual').show();
            }
        });

    }, 500); // 500ms delay to ensure DOM is ready

    // Navigation interactions
    const sections = [
        { id: 'bp-objectives', title: 'Meaningful Objectives', target: 'bp-objectives' },
        { id: 'bp-experiences', title: 'Intelligence Experiences', target: 'bp-experiences' },
        { id: 'bp-implementation', title: 'Intelligence Implementation', target: 'bp-implementation' },
        { id: 'bp-creation', title: 'Creation Status', target: 'bp-creation' },
        { id: 'bp-orchestration', title: 'Orchestration', target: 'bp-orchestration' }
    ];

    function updateBottomNav(targetId) {
        if (targetId === 'bp-api-view') {
            $('#bp-bottom-nav').hide();
            return;
        }
        $('#bp-bottom-nav').show();

        let currentIndex = sections.findIndex(s => s.target === targetId);
        if (currentIndex === -1) currentIndex = 0; // Default

        if (currentIndex > 0) {
            $('#bp-prev-title').text(sections[currentIndex - 1].title);
            $('#bp-prev-nav').show().data('target', sections[currentIndex - 1].target);
        } else {
            $('#bp-prev-nav').hide();
        }

        if (currentIndex < sections.length - 1) {
            $('#bp-next-title').text(sections[currentIndex + 1].title);
            $('#bp-next-nav').show().data('target', sections[currentIndex + 1].target);
        } else {
            $('#bp-next-nav').hide();
        }
    } // End of updateBottomNav

    window.showExportModal = function() {
        var optionsHtml = `
            <button onclick="$('#export-modal').hide(); setTimeout(function(){window.print();}, 300);" style="display:flex; align-items:center; gap:12px; padding:12px 16px; background: var(--color-gray-light); border: 1px solid var(--color-border); border-radius:8px; cursor:pointer; text-align:left; color: var(--color-text); font-weight:500;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Print Blueprint (PDF)</span>
            </button>
        `;

        var allFiles = [];
        var allowedExts = ['pdf', 'doc', 'docx'];

        function processFiles(files, prefix, color) {
            var validFiles = files.filter(f => {
                var ext = f.url.split('?')[0].split('.').pop().toLowerCase();
                return allowedExts.includes(ext);
            });
            
            validFiles.forEach(f => {
                allFiles.push(f);
                var ext = f.url.split('?')[0].split('.').pop().toLowerCase();
                var actionText = ext === 'pdf' ? 'Print' : 'Download';
                
                optionsHtml += `<button onclick="window.open('${f.url}', '_blank')" style="display:flex; align-items:center; gap:12px; padding:12px 16px; background: var(--color-gray-light); border: 1px solid var(--color-border); border-radius:8px; cursor:pointer; text-align:left; color: var(--color-text); font-weight:500;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>${actionText} ${prefix}: ${escapeHtml(f.name)}</span>
                </button>`;
            });
        }

        processFiles(blueprintData.orchestration.attachments || [], 'SOP', '#10b981');
        processFiles(blueprintData.creation.attachments || [], 'Bukti/Evidence', '#f59e0b');
        processFiles(blueprintData.implementation.attachments || [], 'Diagram', '#8b5cf6');

        $('#export-options-list').html(optionsHtml);
        $('#export-modal').css('display', 'flex');
    };
        setTimeout(function () {
            $('.bp-tab-btn').first().click();
        }, 100);
    


    $('.bp-nav-item').on('click', function (e) {
        e.preventDefault();
        $('.bp-nav-item').removeClass('active');
        $(this).addClass('active');

        var target = $(this).data('target');
        
        // Save to localStorage
        localStorage.setItem('bp_active_tab', target);

        $('.bp-section').removeClass('active');
        $('#' + target).addClass('active');

        updateBottomNav(target);
        // Scroll to top of content
        $('.bp-content').animate({ scrollTop: 0 }, 200);
    });

    // Bottom Navigation Click Handlers
    $('#bp-prev-nav, #bp-next-nav').on('click', function () {
        var target = $(this).data('target');
        if (target) {
            $('.bp-nav-item[data-target="' + target + '"]').click();
        }
    });

    // API View Toggle
    $('#btn-api-view').on('click', function () {
        $('.bp-nav-item').removeClass('active');
        $('.bp-section').removeClass('active');
        $('#bp-api-view').addClass('active');
        
        // Save to localStorage
        localStorage.setItem('bp_active_tab', 'bp-api-view');

        updateBottomNav('bp-api-view');
    });

    // Initialize Bottom Nav on load
    // Let's rewrite the load logic cleanly:
    var savedBpTab = localStorage.getItem('bp_active_tab');
    if (savedBpTab) {
        if (savedBpTab === 'bp-api-view') {
            $('#btn-api-view').click();
        } else {
            var $targetNav = $('.bp-nav-item[data-target="' + savedBpTab + '"]');
            if ($targetNav.length > 0) {
                // Manually trigger click but without animation to avoid jump on load
                $('.bp-nav-item').removeClass('active');
                $targetNav.addClass('active');
                $('.bp-section').removeClass('active');
                $('#' + savedBpTab).addClass('active');
                updateBottomNav(savedBpTab);
            } else {
                updateBottomNav('bp-objectives');
            }
        }
    } else {
        updateBottomNav('bp-objectives');
    }

    // Blueprint Tabs
    $(document).on('click', '.bp-tab-btn', function (e) {
        e.preventDefault();
        var target = $(this).data('target');

        // Find siblings
        var $nav = $(this).closest('.bp-tabs-nav');
        $nav.find('.bp-tab-btn').removeClass('active');
        $(this).addClass('active');

        var $tabs = $(this).closest('.bp-tabs');
        $tabs.find('.bp-tab-panel').removeClass('active');
        $tabs.find('#' + target).addClass('active');
    });
});

// ===== DYNAMIC HOVER TOOLTIP FOR JIRA GANTT =====
var hoverTimeout;
$(document).on('mouseenter', '.jira-bar', function (e) {
    $('.jira-dynamic-tooltip').remove(); // Remove any existing tooltips first
    var $bar = $(this);
    $bar.css('filter', 'brightness(1.1)'); // highlight bar

    var title = $bar.attr('data-tooltip-title');
    var date = $bar.attr('data-tooltip-date');

    if (!title) return; // Prevent tooltip on non-Gantt elements that somehow got the class

    var $tt = $('<div class="jira-dynamic-tooltip" style="position:fixed; z-index:9999; background:#1f2937; color:#ffffff; padding:10px 14px; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.2); pointer-events:none; opacity:0; transition:opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); transform:translateY(8px);"></div>');
    $tt.append('<div style="font-weight:700; margin-bottom:4px; font-size:13px; font-family:sans-serif;">' + title + '</div>');
    $tt.append('<div style="color:#9ca3af; font-size:12px; font-weight:500; font-family:sans-serif;">' + date + '</div>');

    // Add tiny arrow at bottom
    $tt.append('<div style="position:absolute; top:100%; left:50%; transform:translateX(-50%); border-width:6px; border-style:solid; border-color: var(--color-text) transparent transparent transparent;"></div>');

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
