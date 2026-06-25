from bs4 import BeautifulSoup
import json

def parse_html_draft(html_draft):
    soup = BeautifulSoup(html_draft, 'html.parser')
    
    blueprint_data = {
        'objectives': {},
        'experiences': {},
        'implementation': {},
        'creation': {},
        'orchestration': {}
    }
    
    try:
        # 1. Objectives
        org_goals = []
        # Target only the first form-section to avoid grabbing outcome/property tabs
        for panel in soup.select('#tab-objectives > .form-section:nth-of-type(1) .obj-tab-panel'):
            textareas = panel.find_all('textarea')
            if len(textareas) >= 3:
                goal = textareas[0].text.strip()
                strategy = textareas[1].text.strip()
                metrics = textareas[2].text.strip()
                if goal:
                    org_goals.append({'goal': goal, 'strategy': strategy, 'metrics': metrics})
        blueprint_data['objectives']['organizational'] = org_goals
        
        headers = []
        for th in soup.select('#leading-table thead th')[1:-1]:
            inp = th.find('input')
            if inp and inp.get('value'):
                headers.append(inp.get('value'))
                
        leading_data = []
        for tr in soup.select('#leading-table tbody tr'):
            tds = tr.find_all('td')
            if not tds: continue
            feature_inp = tds[0].find('input')
            if not feature_inp: continue
            feature = feature_inp.get('value')
            values = []
            for td in tds[1:-1]:
                val_inp = td.find('input')
                values.append(val_inp.get('value') if val_inp else '')
            if feature:
                leading_data.append({'feature': feature, 'values': values})
        blueprint_data['objectives']['leading_indicators'] = {'systems': headers, 'data': leading_data}
        
        outcomes = []
        for panel in soup.select('#outcome-tabs-content .obj-tab-panel'):
            textareas = panel.find_all('textarea')
            if len(textareas) >= 3:
                out = textareas[0].text.strip()
                strat = textareas[1].text.strip()
                met = textareas[2].text.strip()
                if out:
                    outcomes.append({'outcome': out, 'strategy': strat, 'metrics': met})
        blueprint_data['objectives']['user_outcomes'] = outcomes

        properties = []
        for panel in soup.select('#property-tabs-content .obj-tab-panel'):
            textareas = panel.find_all('textarea')
            if len(textareas) >= 3:
                prop = textareas[0].text.strip()
                strat = textareas[1].text.strip()
                met = textareas[2].text.strip()
                if prop:
                    properties.append({'property': prop, 'strategy': strat, 'metrics': met})
        blueprint_data['objectives']['model_properties'] = properties
        
        # 2. Experiences
        presentations = []
        for inp in soup.select('#tab-experiences .checkbox-item input[checked]'):
            label = inp.find_next_sibling(class_='checkbox-label')
            desc = inp.find_next_sibling(class_='checkbox-desc')
            if label and desc:
                presentations.append({'label': label.text.strip(), 'desc': desc.text.strip()})
        
        pres_desc_area = soup.select_one('#tab-experiences > .form-section textarea')
        pres_desc = pres_desc_area.text.strip() if pres_desc_area else ''
        blueprint_data['experiences']['presentation'] = {'types': presentations, 'description': pres_desc}
        
        functions = []
        for tr in soup.select('#functions-table tbody tr'):
            tds = tr.find_all('td')
            if len(tds) >= 3:
                name_inp = tds[1].find('input')
                desc_inp = tds[2].find('input')
                if name_inp and desc_inp and name_inp.get('value'):
                    functions.append({'name': name_inp.get('value'), 'description': desc_inp.get('value')})
        blueprint_data['experiences']['functions'] = functions
        
        error_min = []
        for item in soup.select('#error-minimization tbody tr, #error-minimization .list-item'):
            sel = item.find('select')
            if not sel:
                tds = item.find_all('td')
                if len(tds) >= 3: sel = tds[1].find('select')
            inp = item.find('input')
            if not inp:
                tds = item.find_all('td')
                if len(tds) >= 3: inp = tds[2].find('input')
                
            if sel and inp:
                opt = sel.find('option', selected=True)
                func = opt.get('value') if opt else ''
                strat = inp.get('value')
                if func and strat:
                    error_min.append({'function': func, 'strategy': strat})
        blueprint_data['experiences']['error_minimization'] = error_min

        data_col = []
        for item in soup.select('#data-collection tbody tr, #data-collection .list-item'):
            sel = item.find('select')
            if not sel:
                tds = item.find_all('td')
                if len(tds) >= 3: sel = tds[1].find('select')
            inp = item.find('input')
            if not inp:
                tds = item.find_all('td')
                if len(tds) >= 3: inp = tds[2].find('input')
                
            if sel and inp:
                opt = sel.find('option', selected=True)
                func = opt.get('value') if opt else ''
                plan = inp.get('value')
                if func and plan:
                    data_col.append({'function': func, 'plan': plan})
        blueprint_data['experiences']['data_collection'] = data_col

        # 3. Implementation
        processes = []
        for tr in soup.select('#process-table tbody tr'):
            tds = tr.find_all('td')
            if len(tds) >= 3:
                name_inp = tds[1].find('input')
                desc_inp = tds[2].find('input')
                if name_inp and desc_inp and name_inp.get('value'):
                    processes.append({'name': name_inp.get('value'), 'description': desc_inp.get('value')})
        blueprint_data['implementation']['business_processes'] = processes
        
        techs = []
        for tr in soup.select('#tech-table tbody tr'):
            name = tr.find(class_='process-name')
            tds = tr.find_all('td')
            if name and len(tds) >= 3:
                tech_inp = tds[2].find('input')
                if tech_inp and tech_inp.get('value'):
                    techs.append({'process': name.text.strip(), 'technologies': tech_inp.get('value')})
        blueprint_data['implementation']['technologies'] = techs
        
        smarts = []
        for item in soup.select('#smart-processes .smart-process-item'):
            check = item.find('input', class_='smart-check')
            if check and check.has_attr('checked'):
                lbl = item.find(class_='checkbox-label')
                reason_inp = item.find(class_='smart-reason')
                if reason_inp: reason_inp = reason_inp.find('input')
                if lbl and lbl.text.strip() != '-':
                    smarts.append({'process': lbl.text.strip(), 'reason': reason_inp.get('value') if reason_inp else ''})
        blueprint_data['implementation']['smart_processes'] = smarts
        
        files_impl = []
        for item in soup.select('#preview-implementation .upload-file-item'):
            name = item.find(class_='file-name')
            link = item.find('a')
            if name and link:
                files_impl.append({'name': name.text.strip(), 'url': link.get('href')})
        blueprint_data['implementation']['attachments'] = files_impl

        # 4. Creation Status
        constraints = []
        for tr in soup.select('#constraints-table tbody tr'):
            tds = tr.find_all('td')
            if len(tds) >= 3:
                opt = tds[1].find('option', selected=True)
                desc_inp = tds[2].find('input')
                if opt and desc_inp and opt.text.strip() != 'Pilih...' and desc_inp.get('value'):
                    constraints.append({'category': opt.text.strip(), 'description': desc_inp.get('value')})
        blueprint_data['creation']['constraints'] = constraints
        
        statuses = []
        for tr in soup.select('#status-table tbody tr'):
            tds = tr.find_all('td')
            if len(tds) >= 4:
                name = tds[1].text.strip()
                status_sel = tds[2].find('select')
                notes_inp = tds[3].find('input')
                if name and name != '-' and status_sel and notes_inp:
                    opt = status_sel.find('option', selected=True)
                    statuses.append({'module': name, 'status': opt.get('value') if opt else status_sel.get('value', ''), 'notes': notes_inp.get('value')})
        blueprint_data['creation']['module_statuses'] = statuses
        
        # 5. Orchestration
        timeline = []
        for tr in soup.select('#gantt-table tbody tr'):
            tds = tr.find_all('td')
            if len(tds) >= 7:
                cat_opt = tds[1].find('option', selected=True)
                name_inp = tds[2].find('input')
                start_inp = tds[3].find('input')
                end_inp = tds[4].find('input')
                pic_inp = tds[5].find('input')
                stat_opt = tds[6].find('option', selected=True)
                
                cat = cat_opt.get('value') if cat_opt else ''
                name = name_inp.get('value') if name_inp else ''
                start = start_inp.get('value') if start_inp else ''
                end = end_inp.get('value') if end_inp else ''
                pic = pic_inp.get('value') if pic_inp else ''
                stat = stat_opt.get('value') if stat_opt else ''
                
                if name:
                    timeline.append({'category': cat, 'phase': name, 'start_date': start, 'end_date': end, 'pic': pic, 'status': stat})
        blueprint_data['orchestration']['timeline'] = timeline

        operators = []
        for tr in soup.select('#operators-table tbody tr'):
            tds = tr.find_all('td')
            if len(tds) >= 4:
                name_inp = tds[1].find('input')
                role_inp = tds[2].find('input')
                contact_inp = tds[3].find('input')
                
                name = name_inp.get('value') if name_inp else ''
                role = role_inp.get('value') if role_inp else ''
                contact = contact_inp.get('value') if contact_inp else ''
                
                if name:
                    operators.append({'name': name, 'role': role, 'contact': contact})
        blueprint_data['orchestration']['operators'] = operators
        
    except Exception as e:
        print("Parse error:", e)
        
    return json.dumps(blueprint_data)
