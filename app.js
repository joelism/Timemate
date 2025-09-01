
// TimeMate JW - Stable (no Service Worker) - Buttons guaranteed
(function(){
  const err = document.getElementById('err');
  function showErr(m){ err.hidden=false; err.textContent='Fehler: ' + m; }

  const state = { items: JSON.parse(localStorage.getItem('tmjw_state')||'[]') };
  const CATS = ["Spitex Heitersberg","Psychologin / Therapie","Töpferhaus","Administrativ","Geschäftlich","Privat"];
  const v = document.getElementById('view');

  function save(){ localStorage.setItem('tmjw_state', JSON.stringify(state.items)); }
  function byId(id){ return document.getElementById(id); }
  function el(tag, attrs={}, text){
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=> n.setAttribute(k,v));
    if(text!==undefined) n.textContent = text;
    return n;
  }
  function fmt(iso){ const d=new Date(iso); return d.toLocaleString('de-CH',{dateStyle:'medium', timeStyle:'short'}); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function autoUpdate(){
    const now = Date.now(); let changed=false;
    state.items.forEach(a=>{
      const due = new Date(a.datetime).getTime();
      if(a.status!=='archived' && now>=due && a.status!=='done'){ a.status='done'; a.completedCount=(a.completedCount||0)+1; changed=true; }
      if(a.status!=='archived' && now-due>72*60*60*1000 && (a.completedCount||0)>=1){ a.status='archived'; changed=true; }
    });
    if(changed) save();
  }

  function route(name){
    document.querySelectorAll('.tabs .tab').forEach(b=> b.classList.toggle('active', b.dataset.route===name));
    if(name==='overview') return renderOverview();
    if(name==='new') return renderNew();
    if(name==='list') return renderList();
    if(name==='archive') return renderArchive();
    if(name==='settings') return renderSettings();
  }

  // Renders
  function renderOverview(){
    try {
      autoUpdate();
      v.innerHTML='';
      const grid = el('section',{class:'grid'});
      const upcoming = state.items.filter(x=> x.status!=='archived' && new Date(x.datetime) > new Date())
                                  .sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));
      CATS.forEach(cat=>{
        const card = el('div',{class:'card'});
        card.append(el('div',{class:'title'}, cat));
        const next = upcoming.find(x=> x.category===cat);
        if(next){
          const person = Array.isArray(next.person)? next.person.join(', ') : (next.person||'—');
          card.append(el('div',{}, next.title||'(ohne Titel)'));
          card.append(el('div',{}, `${fmt(next.datetime)} · ${person} · ${next.location||''}`));
          const btns = el('div',{class:'btnrow'});
          const done = el('button',{}, next.status==='done'?'✓ Erledigt':'☑️ Abhaken');
          done.addEventListener('click', ()=>{ next.status = next.status==='done'?'upcoming':'done'; if(next.status==='done'){ next.completedCount=(next.completedCount||0)+1; } save(); renderOverview(); });
          const toArch = el('button',{}, '↪ Archivieren');
          toArch.addEventListener('click', ()=>{ next.status='archived'; save(); renderOverview(); });
          btns.append(done, toArch);
          card.append(btns);
        } else {
          card.append(el('div',{}, '❗️ Kein Termin eingetragen'));
        }
        grid.append(card);
      });
      v.append(grid);
    } catch(e){ showErr('renderOverview: ' + (e.message||e)); }
  }

  function renderNew(){
    v.innerHTML='';
    const sec = el('section',{class:'form'});
    sec.append(el('h2',{},'Neuen Termin anlegen'));
    // Title
    const lTitle = el('label'); lTitle.append('Titel'); lTitle.append(el('input',{type:'text',id:'title',placeholder:'z.B. Kontrolle beim Arzt',required:'true'})); sec.append(lTitle);
    // Category
    const lCat = el('label'); lCat.append('Kategorie'); const sel = el('select',{id:'category',required:'true'});
    sel.append(el('option',{value:'',disabled:'true',selected:'true'},'Bitte wählen…')); CATS.forEach(c=> sel.append(el('option',{},c))); lCat.append(sel); sec.append(lCat);
    const dyn = el('div',{id:'dyn'}); sec.append(dyn);
    // Date/Time
    const row = el('div',{class:'row'});
    const lDate = el('label',{class:'half'}); lDate.append('Datum'); lDate.append(el('input',{type:'date',id:'date',required:'true'})); row.append(lDate);
    const lTime = el('label',{class:'half'}); lTime.append('Uhrzeit'); lTime.append(el('input',{type:'time',id:'time',step:'300',required:'true'})); row.append(lTime);
    sec.append(row);
    // Notes
    const lNotes = el('label'); lNotes.append('Notizen'); lNotes.append(el('textarea',{id:'notes',rows:'4',placeholder:'Kurznotiz…'})); sec.append(lNotes);
    const saveBtn = el('button',{id:'save',class:'primary'},'Speichern'); sec.append(saveBtn);
    v.append(sec);

    sel.addEventListener('change', ()=> fillDyn(sel.value, dyn));
    saveBtn.addEventListener('click', onSave);
  }

  function fillDyn(cat, d){
    d.innerHTML='';
    function mk(html){ const div=document.createElement('div'); div.innerHTML=html; return div.firstElementChild; }
    if(cat==='Spitex Heitersberg'){
      d.append(mk('<label>Termin mit<select id="person"><option>F. Völki</option><option>A. Rudgers</option><option>Andere</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>5200 Brugg</option><option>5442 Fislisbach</option><option>5507 Mellingen</option></select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      d.querySelector('#person').addEventListener('change', ()=> d.querySelector('#personOther').style.display = d.querySelector('#person').value==='Andere' ? 'block':'none');
    } else if(cat==='Töpferhaus'){
      d.append(mk('<label>Termin mit<select id="person"><option>Caroline Hanst</option><option>Jeanine Haygis</option><option>Sandra Schriber</option><option>Andere</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau - Bleichmattstr.</option><option>5000 Aarau - Bachstr. 95</option></select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      d.querySelector('#person').addEventListener('change', ()=> d.querySelector('#personOther').style.display = d.querySelector('#person').value==='Andere' ? 'block':'none');
    } else if(cat==='Geschäftlich'){
      d.append(mk('<label>Termin mit (Mehrfachauswahl)<select id="personMulti" multiple size="6"><option>Beatriz Häsler</option><option>Helena Huser</option><option>Jasmin Widmer</option><option>Linda Flückiger</option><option>Mathias Tomaske</option><option>Svenja Studer</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>3322 Schönbühl</option></select></label>'));
    } else if(cat==='Administrativ'){
      d.append(mk('<label>Person<input id="person" placeholder="Name"></label>'));
      d.append(mk('<label>Standort<input id="location" list="locs"></label>'));
    } else if(cat==='Privat'){
      d.append(mk('<label>Person<input id="person" list="persons"></label>'));
      d.append(mk('<label>Standort<input id="location" list="locs"></label>'));
    } else if(cat==='Psychologin / Therapie'){
      d.append(mk('<label>Termin mit<input id="person" placeholder="Name"></label>'));
      d.append(mk('<label>Standort<input id="location" placeholder="Ort / Adresse"></label>'));
    }
  }

  function onSave(){
    const title = byId('title').value.trim();
    const cat = byId('category').value;
    const date = byId('date').value;
    const time = byId('time').value;
    if(!title || !cat || !date || !time){ alert('Bitte Titel, Kategorie, Datum und Uhrzeit angeben.'); return; }
    const person = byId('personMulti') ? Array.from(byId('personMulti').selectedOptions).map(o=>o.value)
                : (byId('personOther') && byId('personOther').style.display==='block' ? byId('personOther').value : (byId('person')?byId('person').value:''));
    const loc = byId('location') ? byId('location').value : '';
    const dt = new Date(`${date}T${time}:00`);
    state.items.push({ id:String(Date.now()), title, category:cat, person, location:loc, datetime:dt.toISOString(), notes:byId('notes').value, status:'upcoming', completedCount:0, createdAt:new Date().toISOString() });
    save();
    alert('Termin gespeichert.');
    route('overview');
  }

  function renderList(){
    autoUpdate();
    v.innerHTML = '<section><h2>Alle Termine</h2><div id="list" class="list"></div></section>';
    const list = byId('list');
    const all = state.items.slice().sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));
    if(!all.length){ list.innerHTML = '<p class="muted small">Keine Termine.</p>'; return; }
    all.forEach(a=>{
      const it=el('div',{class:'item'});
      const person = Array.isArray(a.person)? a.person.join(', '):(a.person||'—');
      it.append(el('div',{class:'title'}, a.title||'(ohne Titel)'));
      it.append(el('div',{}, `${a.category} • ${fmt(a.datetime)} ${a.status==='done'?'✓':''} ${a.status==='archived'?'(Archiv)':''}`));
      it.append(el('div',{}, `Person(en): ${person}`));
      it.append(el('div',{}, `Standort: ${a.location||'—'}`));
      it.append(el('div',{}, `Notizen: ${escapeHtml(a.notes||'—')}`));
      const row = el('div',{class:'btnrow'});
      const btnDone = el('button',{}, a.status==='done'?'Als unerledigt markieren':'☑️ Abhaken');
      btnDone.addEventListener('click', ()=>{ a.status = a.status==='done'?'upcoming':'done'; if(a.status==='done'){a.completedCount=(a.completedCount||0)+1;} save(); renderList(); });
      const btnArch = el('button',{}, '↪ Archivieren');
      btnArch.addEventListener('click', ()=>{ a.status='archived'; save(); renderList(); });
      row.append(btnDone, btnArch);
      it.append(row);
      list.append(it);
    });
  }

  function renderArchive(){
    autoUpdate();
    v.innerHTML = '<section><h2>Archiv</h2><div id="arch" class="list"></div></section>';
    const arch = byId('arch');
    const arr = state.items.filter(a=> a.status==='archived').sort((a,b)=> new Date(b.datetime) - new Date(a.datetime));
    if(!arr.length){ arch.innerHTML = '<p class="muted small">Archiv ist leer.</p>'; return; }
    arr.forEach(a=>{
      const it=el('div',{class:'item'});
      const person = Array.isArray(a.person)? a.person.join(', '):(a.person||'—');
      it.append(el('div',{class:'title'}, a.title||'(ohne Titel)'));
      it.append(el('div',{}, `${a.category} • ${fmt(a.datetime)} ✓`));
      it.append(el('div',{}, `Person(en): ${person}`));
      it.append(el('div',{}, `Standort: ${a.location||'—'}`));
      it.append(el('div',{}, `Notizen: ${escapeHtml(a.notes||'—')}`));
      const row = el('div',{class:'btnrow'});
      const btnBack = el('button',{}, '↩︎ Zurückholen');
      btnBack.addEventListener('click', ()=>{ a.status='upcoming'; save(); renderArchive(); });
      row.append(btnBack);
      it.append(row);
      arch.append(it);
    });
  }

  function exportCSV(){
    const rows = [["Titel","Kategorie","Datum","Uhrzeit","Person(en)","Standort","Notizen","Status"]];
    const all = state.items.slice().sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
    all.forEach(a=>{
      const d = new Date(a.datetime);
      const date = d.toLocaleDateString('de-CH');
      const time = d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
      const person = Array.isArray(a.person)?a.person.join('; '):(a.person||'');
      rows.push([a.title||'', a.category, date, time, person, a.location||'', String(a.notes||'').replace(/\n/g,' '), a.status]);
    });
    const csv = rows.map(r=> r.map(x=> `"${String(x).replace(/"/g,'""')}"`).join(";")).join("\r\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='TimeMateJW_Export.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function exportPrint(){
    const all = state.items.slice().sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
    const rows = all.map(a=>{
      const d = fmt(a.datetime);
      const p = Array.isArray(a.person)?a.person.join(', '):(a.person||'—');
      return `<tr>
        <td>${escapeHtml(a.title||'—')}</td>
        <td>${a.category}</td>
        <td>${d}</td>
        <td>${escapeHtml(p)}</td>
        <td>${escapeHtml(a.location||'—')}</td>
        <td>${escapeHtml(a.notes||'—')}</td>
        <td>${a.status}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>TimeMate JW Export</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f3f4f6}</style>
      </head><body onload="setTimeout(function(){window.print()},300)">
        <h1>TimeMate JW – Export</h1>
        <table><thead><tr><th>Titel</th><th>Kategorie</th><th>Datum & Uhrzeit</th><th>Person(en)</th><th>Standort</th><th>Notizen</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  }

  function renderSettings(){
    v.innerHTML = `<section>
      <h2>Einstellungen</h2>
      <div class="btnrow">
        <button id="exp-csv">Als Excel/CSV exportieren</button>
        <button id="exp-pdf">Als PDF exportieren (Druckansicht)</button>
        <button id="wipe" class="danger">Alle Termine löschen</button>
      </div>
    </section>`;
    byId('exp-csv').addEventListener('click', exportCSV);
    byId('exp-pdf').addEventListener('click', exportPrint);
    byId('wipe').addEventListener('click', ()=>{ if(confirm('Wirklich alles löschen?')){ state.items=[]; save(); alert('Gelöscht.'); route('overview'); } });
  }

  // Bind tabs & initial route
  document.querySelectorAll('.tabs .tab').forEach(btn => btn.addEventListener('click', ()=> route(btn.dataset.route)));
  route((location.hash||'#overview').replace('#',''));
})();
