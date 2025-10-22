
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    const v = document.getElementById('view');
    const byId = id => document.getElementById(id);

    // ===== Utils =====
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const el = (tag, attrs = {}, ...kids) => {
      const n = document.createElement(tag);
      for (const [k, val] of Object.entries(attrs || {})) {
        if (k === 'class') n.className = val;
        else if (k === 'style') n.setAttribute('style', val);
        else if (k.startsWith('on') && typeof val === 'function') n.addEventListener(k.slice(2), val);
        else n.setAttribute(k, val);
      }
      kids.flat().forEach(k => {
        if (k == null) return;
        n.append(typeof k === 'string' ? document.createTextNode(k) : k);
      });
      return n;
    };
    const fmtDate = iso => {
      const d = new Date(iso); if (isNaN(d)) return '—';
      return d.toLocaleDateString('de-CH', { year:'numeric', month:'2-digit', day:'2-digit' });
    };
    const fmtTime = iso => {
      const d = new Date(iso); if (isNaN(d)) return '';
      return d.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' });
    };
    const fmt = (iso, isoEnd) => {
      const date = fmtDate(iso);
      const t0 = fmtTime(iso);
      const t1 = fmtTime(isoEnd);
      return `${date} ${t0}${isoEnd && t1 ? '–' + t1 : ''}`.trim();
    };
    const toLocalInput = iso => {
      try { const d = new Date(iso); if (isNaN(d)) return ''; return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); } catch { return ''; }
    };
    const fromLocalInput = val => {
      try { if (!val) return ''; const d = new Date(val); return new Date(d.getTime()+d.getTimezoneOffset()*60000).toISOString(); } catch { return ''; }
    };

    // ===== State =====
    const LSKEY = 'timemate_jw_state_v4';
    const state = JSON.parse(localStorage.getItem(LSKEY) || '{}');
    if (!state.items) state.items = [];
    // Contact: {id, type:'Firma'|'Privat', vorname, nachname, firma, firmAddress, personAddress, firmId}
    if (!state.contacts) state.contacts = [];
    if (!state.cats) state.cats = ['Spitex Heitersberg','Psychologin / Therapie','Töpferhaus','Genossenschaft Migros Aare','Administrativ','Privat','HKV Aarau','Persönlich','Unkategorisiert'];
    save();

    function save(){ localStorage.setItem(LSKEY, JSON.stringify(state)); }

    // ===== Contacts helpers =====
    function fullName(c){
      return c && (c.type==='Firma' ? (c.firma || '') : [c.vorname, c.nachname].filter(Boolean).join(' '));
    }
    function collectFirmAddresses(){
      const firms = state.contacts.filter(c=>c.type==='Firma' && c.firmAddress);
      const seen=new Set(); const out=[];
      firms.forEach(f=>{ const addr=String(f.firmAddress).trim(); if(addr && !seen.has(addr.toLowerCase())){ seen.add(addr.toLowerCase()); out.push({label:`${f.firma||'Firma'} – ${addr}`, value: addr, id:f.id}); }});
      return out;
    }
    function getDefaultAddressForPerson(personId){
      const p = state.contacts.find(c=>String(c.id)===String(personId));
      if (!p) return '';
      if (p.personAddress) return p.personAddress;
      const firm = p.firmId ? state.contacts.find(c=>String(c.id)===String(p.firmId)) : null;
      return (firm && firm.firmAddress) ? firm.firmAddress : '';
    }

    // ===== Avatar =====
    function avatarStack(names){
      const wrap = el('div', {style:'display:flex;gap:4px;align-items:center;flex-wrap:wrap'});
      (names||[]).forEach(n=>{
        const ini = (n||'?').trim().slice(0,2).toUpperCase();
        wrap.append(el('div',{style:'width:22px;height:22px;border-radius:999px;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:11px;background:#f8fafc'},ini));
      });
      return wrap;
    }

    // ===== Confirmation =====
    function yyyymmdd(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0'); return `${y}${m}${dd}`; }
    function nextNumFor(person){
      try{
        const KEY='tmjw_confirm_counter';
        const map = JSON.parse(localStorage.getItem(KEY) || '{}');
        const k = String(person||'Joel Weber');
        const n = (map[k]||0)+1; map[k]=n; localStorage.setItem(KEY, JSON.stringify(map));
        return n;
      }catch{ return 1; }
    }
    function openConfirmDoc(item){
      try{
        const persons0 = Array.isArray(item.person)? item.person.slice() : (item.person? [item.person]: []);
        if(!persons0.some(p => String(p||'').trim().toLowerCase()==='joel weber')) persons0.push('Joel Weber');
        const perDisp = persons0.length ? persons0.join(', ') : '—';
        const statusLabel = ({done:'Erledigt', archived:'Archiviert', upcoming:'Bevorstehend'}[item.status] || 'Bevorstehend');

        const dt = new Date(item.datetime || Date.now());
        const valid = !isNaN(dt.getTime());
        const dateStr = valid
          ? dt.toLocaleDateString('de-CH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
          : (item.datetime || '—');
        const tStart = valid ? dt.toLocaleTimeString('de-CH', {hour:'2-digit',minute:'2-digit'}) : '';
        const hasEnd = item.datetimeEnd && !isNaN(new Date(item.datetimeEnd).getTime());
        const dtEnd = hasEnd ? new Date(item.datetimeEnd) : null;
        const tEnd = hasEnd ? dtEnd.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}) : '';
        const timeRange = hasEnd ? `${tStart} – ${tEnd} Uhr` : (tStart ? `${tStart} Uhr` : '');

        const nowStr = new Date().toLocaleString('de-CH', { dateStyle:'medium', timeStyle:'short' });
        const attach = (item.attachments && item.attachments.length) ? item.attachments.map(a=>a.name||'Anhang').join(', ') : '—';
        const title = (item.title || '(ohne Titel)');

        const datePart = valid ? yyyymmdd(dt) : yyyymmdd(new Date());
        const num = nextNumFor('Joel Weber');
        const fileBase = `${datePart}_Terminbestätigung_${String(title).replace(/[^A-Za-z0-9_. -]/g,'').replace(/\s+/g,'_').slice(0,80) || 'ohne_Titel'}_(${num})`;

        const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${esc(fileBase)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0f172a; line-height:1.45; }
  h1 { margin:0 0 6px 0; font-size:22px; }
  .meta { color:#475569; margin-bottom:10px; }
  .box { border:1px solid #3b82f6; border-radius:12px; padding:14px; }
  .row { display:grid; grid-template-columns:160px 1fr; gap:8px; margin:6px 0; }
  .label { color:#64748b; }
  footer { margin-top:24px; font-size:12px; color:#64748b; }
  .badge { display:inline-block; border:1px solid #e5e7eb; border-radius:999px; padding:2px 8px; font-size:12px; }
  .small { font-size:12px; }
</style>
</head>
<body>
  <h1>Terminbestätigung</h1>
  <div class="meta">Bestätigung des folgenden Termins</div>

  <div class="box">
    <div class="row"><div class="label">Titel</div><div><strong>${esc(title)}</strong></div></div>
    <div class="row"><div class="label">Typ</div><div>${esc(item.type || 'Termin')}</div></div>
    <div class="row"><div class="label">Kategorie</div><div><span class="badge">${esc(item.category || '')}</span></div></div>
    <div class="row"><div class="label">Datum</div><div>${esc(dateStr)}${timeRange ? ' – ' + esc(timeRange) : ''}</div></div>
    <div class="row"><div class="label">Person(en)</div><div>${esc(perDisp)}</div></div>
    <div class="row"><div class="label">Standort</div><div>${esc(item.location || '—')}</div></div>
    <div class="row"><div class="label">Status</div><div>${esc(statusLabel)}</div></div>
    <div class="row"><div class="label">Notizen</div><div>${esc(item.notes || '—')}</div></div>
    <div class="row"><div class="label">Anhänge</div><div>${esc(attach)}</div></div>
    <div class="row small"><div class="label">ID</div><div>${esc(item.id || '')}</div></div>
  </div>

  <footer>
    <div>Erstellt am ${esc(nowStr)}</div>
    <div>Automatisch generiert durch TimeMate by J.W.</div>
  </footer>

  <script>setTimeout(function(){ window.print(); }, 250);</script>
</body>
</html>`;

        const ww = window.open('', '_blank');
        if(!ww){ alert('Popup blockiert – bitte Popups erlauben.'); return; }
        ww.document.open('text/html');
        ww.document.write(html);
        ww.document.close();
      }catch(e){
        console.error('Bestätigung fehlgeschlagen', e);
        alert('Konnte die Terminbestätigung nicht erzeugen.');
      }
    }

    // ===== Routing =====
    function route(name, arg){
      if (name==='overview') ov();
      else if (name==='list') listView();
      else if (name==='tasks') tasksView();
      else if (name==='new') { editView(arg); try{ enhanceEditor(); }catch{} }
      else if (name==='archive') arch();
    }

    // ===== Enhance editor with Endzeit + Address datalist =====
    function enhanceEditor(){
      const form = v.querySelector('form'); if(!form) return;
      // Endzeit
      const start = form.querySelector('input[type="datetime-local"][name="datetime"]') || form.querySelector('#datetime') || form.querySelector('input[type="datetime-local"]');
      if (start && !form.querySelector('#datetimeEnd')) {
        const wrap = el('div', {style:'margin-top:8px;'});
        const lbl = el('label', {style:'display:block;font-size:12px;color:#64748b;'}, 'Ende (optional)');
        const end = el('input', {type:'datetime-local', id:'datetimeEnd', name:'datetimeEnd', style:'margin-top:4px;width:100%'});
        // if editing
        const idInput = form.querySelector('input[name="id"]'); const id = idInput ? idInput.value : null;
        const item = id ? state.items.find(x=>String(x.id)===String(id)) : null;
        if (item && item.datetimeEnd) end.value = toLocalInput(item.datetimeEnd);
        wrap.append(lbl, end); (start.closest('div')||start).after(wrap);
      }
      // Address datalist
      const loc = form.querySelector('input[name="location"]') || form.querySelector('#location');
      if (loc && !loc.getAttribute('list')) {
        const listId = 'address_list';
        let list = byId(listId); if(!list){ list = el('datalist', {id:listId}); document.body.appendChild(list); }
        list.innerHTML='';
        collectFirmAddresses().forEach(a=>{ list.append(el('option',{value:a.value, label:a.label})); });
        loc.setAttribute('list', listId);
        // Default address from person/firm linkage
        const personSel = form.querySelector('select[name="personId"]');
        const firmSel   = form.querySelector('select[name="firmId"]');
        const idInput   = form.querySelector('input[name="id"]'); const id = idInput? idInput.value : null;
        const item      = id ? state.items.find(x=>String(x.id)===String(id)) : null;
        let defaultAddr = '';
        if (item && item.personId) defaultAddr = getDefaultAddressForPerson(item.personId);
        if (!item && personSel && personSel.value) defaultAddr = getDefaultAddressForPerson(personSel.value);
        if (!defaultAddr && firmSel && firmSel.value) {
          const firm = state.contacts.find(c=>String(c.id)===String(firmSel.value));
          if (firm && firm.firmAddress) defaultAddr = firm.firmAddress;
        }
        if (!loc.value && defaultAddr) loc.value = defaultAddr;
        if (personSel) personSel.addEventListener('change', ()=>{
          const addr = getDefaultAddressForPerson(personSel.value);
          if (!loc.value && addr) loc.value = addr;
        });
        if (firmSel) firmSel.addEventListener('change', ()=>{
          if (!loc.value) {
            const firm = state.contacts.find(c=>String(c.id)===String(firmSel.value));
            if (firm && firm.firmAddress) loc.value = firm.firmAddress;
          }
        });
      }
      // Submit hook to persist datetimeEnd
      if (!form.dataset.endHook) {
        form.dataset.endHook = '1';
        form.addEventListener('submit', ()=>{
          try{
            const idInput=form.querySelector('input[name="id"]'); const id=idInput? idInput.value : null;
            const end=form.querySelector('#datetimeEnd'); if(!id || !end) return;
            const it = state.items.find(x=>String(x.id)===String(id)); if(!it) return;
            it.datetimeEnd = end.value ? fromLocalInput(end.value) : '';
            save();
          }catch(e){ console.warn('datetimeEnd persist failed', e); }
        }, {capture:true});
      }
    }

    // ===== Overview =====
    function ov(){
      v.innerHTML='';
      const wrap = el('section');
      wrap.append(el('h2',{},'Termine'));
      const list = el('div',{class:'list'});

      const upcoming = state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));

      if(!upcoming.length) list.innerHTML='<p class="meta">Keine Termine.</p>';
      upcoming.forEach(a=> list.append(renderItem(a, ()=>ov())));

      wrap.append(list);
      wrap.append(el('div',{class:'sep'}));
      wrap.append(el('h2',{},'Aufgaben'));

      const tasks = state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      const tlist = el('div',{class:'list'});
      if(!tasks.length) tlist.innerHTML='<p class="meta">Keine Aufgaben.</p>';
      tasks.forEach(a=> tlist.append(renderItem(a, ()=>ov())));
      wrap.append(tlist);

      v.append(wrap);
    }

    // ===== Termine Liste =====
    function listView(){
      v.innerHTML = '<section><h2>Termine</h2><div id="list" class="list"></div></section>';
      const list = byId('list');
      const all = state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      if (!all.length) { list.innerHTML='<p class="meta">Keine Termine.</p>'; return; }
      all.forEach(a => list.append(renderItem(a, ()=>listView())));
    }

    function tasksView(){
      v.innerHTML = '<section><h2>Aufgaben</h2><div id="tasks" class="list"></div></section>';
      const list = byId('tasks');
      const all = state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      if (!all.length) { list.innerHTML='<p class="meta">Keine Aufgaben.</p>'; return; }
      all.forEach(a => list.append(renderItem(a, ()=>tasksView())));
    }

    function arch(){
      v.innerHTML = '<section><h2>Archiv</h2><div id="arch" class="list"></div></section>';
      const cont = byId('arch');
      const arr = state.items.filter(x => x.status === 'archived').sort((a,b)=> new Date(b.datetime)-new Date(a.datetime));
      if (!arr.length){ cont.innerHTML='<p class="meta">Leer.</p>'; return; }
      arr.forEach(a => cont.append(renderItem(a, ()=>arch())));
    }

    // ===== Render Item (Termin/Aufgabe) =====
    function renderItem(a, refresh){
      const it = el('div',{class:'item'});

      const head = el('div', {style:'display:flex;align-items:center;gap:8px;justify-content:space-between'});
      head.append(el('div',{class:'title'}, a.title || '(ohne Titel)'));
      const persons = Array.isArray(a.person) ? a.person : (a.person ? [a.person] : []);
      head.append(avatarStack(persons));
      it.append(head);

      const statusStr = a.status==='done' ? '✓' : (a.status==='archived' ? '(Archiv)' : '');
      it.append(el('div',{}, `${a.type || 'Termin'} • ${a.category||''} • ${fmt(a.datetime, a.datetimeEnd)} ${statusStr}`));
      if (a.type!=='Aufgabe') {
        const pDisp = Array.isArray(a.person) ? a.person.join(', ') : (a.person || '—');
        it.append(el('div',{}, `Person(en): ${pDisp}`));
        it.append(el('div',{}, `Standort: ${a.location || '—'}`));
      }
      it.append(el('div',{}, `Notizen: ${esc(a.notes || '—')}`));

      const row = el('div',{class:'btnrow'});
      const b1 = el('button',{type:'button'}, a.status==='done'?'↺ Reaktivieren':'☑️ Abhaken');
      b1.onclick=()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); refresh(); };
      const b2 = el('button',{type:'button'}, '↪ Archivieren');
      b2.onclick=()=>{ a.status='archived'; save(); refresh(); };
      const b3 = el('button',{type:'button'}, '✏️ Bearbeiten');
      b3.onclick=()=> route('new', a.id);
      row.append(b1,b2,b3);
      if (a.type!=='Aufgabe'){ const b4=el('button',{type:'button'},'🧾 Bestätigen'); b4.onclick=()=>openConfirmDoc(a); row.append(b4); }
      it.append(row);
      return it;
    }

    // ===== Editor =====
    function editView(id){
      const item = id ? state.items.find(x=>String(x.id)===String(id)) : null;

      v.innerHTML = '';
      const form = el('form', {class:'editor'});

      // Hidden id
      form.append(el('input',{type:'hidden', name:'id', value: item? item.id : String(Date.now())}));

      // Type
      const typeSel = el('select', {name:'type'});
      ['Termin','Aufgabe'].forEach(t=> typeSel.append(el('option',{value:t, selected: (item?item.type:'Termin')===t}, t)));
      form.append(el('label',{},'Typ'), typeSel);

      // Titel
      const titleIn = el('input',{type:'text', name:'title', value: item? (item.title||'') : ''});
      form.append(el('label',{},'Titel'), titleIn);

      // Kategorie
      const catSel = el('select',{name:'category'});
      state.cats.forEach(c=> catSel.append(el('option',{value:c, selected:(item?item.category:'')===c}, c)));
      form.append(el('label',{},'Kategorie'), catSel);

      // Firmen-Auswahl & Personen-Auswahl
      const firmSel = el('select',{name:'firmId'});
      firmSel.append(el('option',{value:''},'— Firma (optional) —'));
      state.contacts.filter(c=>c.type==='Firma').forEach(f=>{
        firmSel.append(el('option',{value:f.id, selected: (item?String(item.firmId||''):'')===String(f.id)}, f.firma || ('Firma '+f.id)));
      });
      const personSel = el('select',{name:'personId'});
      personSel.append(el('option',{value:''},'— Person (optional) —'));
      state.contacts.filter(c=>c.type==='Privat').forEach(p=>{
        personSel.append(el('option',{value:p.id, selected:(item?String(item.personId||''):'')===String(p.id)}, fullName(p) || ('Kontakt '+p.id)));
      });
      form.append(el('label',{},'Firma'), firmSel);
      form.append(el('label',{},'Person'), personSel);

      // Start/Ende
      const start = el('input',{type:'datetime-local', name:'datetime', value: item? toLocalInput(item.datetime) : ''});
      const end   = el('input',{type:'datetime-local', name:'datetimeEnd', value: item? toLocalInput(item.datetimeEnd) : ''});
      form.append(el('label',{},'Beginn'), start);
      form.append(el('label',{},'Ende (optional)'), end);

      // Standort (datalist aus Firmadressen) + Defaults
      const loc = el('input',{type:'text', name:'location', placeholder:'Standort/Adresse', value: item? (item.location||'') : ''});
      const dl = el('datalist',{id:'address_list'});
      collectFirmAddresses().forEach(a=> dl.append(el('option',{value:a.value, label:a.label})));
      loc.setAttribute('list','address_list');
      function applyDefaultLocation(){
        const pId = personSel.value;
        const fId = firmSel.value;
        let addr = '';
        if (pId) addr = getDefaultAddressForPerson(pId);
        if (!addr && fId) {
          const firm = state.contacts.find(c=>String(c.id)===String(fId));
          if (firm && firm.firmAddress) addr = firm.firmAddress;
        }
        if (!loc.value && addr) loc.value = addr;
      }
      applyDefaultLocation();
      personSel.addEventListener('change', ()=>{ if(!loc.value) applyDefaultLocation(); });
      firmSel.addEventListener('change', ()=>{ if(!loc.value) applyDefaultLocation(); });

      form.append(el('label',{},'Standort'), loc, dl);

      // Notizen
      const notes = el('textarea',{name:'notes'}, item? (item.notes||'') : '');
      form.append(el('label',{},'Notizen'), notes);

      // Buttons
      const actions = el('div',{class:'btnrow'});
      const saveBtn = el('button',{type:'submit'},'💾 Speichern');
      const cancel  = el('button',{type:'button', onclick:()=>route('list')},'Abbrechen');
      actions.append(saveBtn, cancel);
      form.append(actions);

      // Submit
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const id = form.querySelector('input[name="id"]').value;
        const obj = {
          id,
          type: typeSel.value,
          title: titleIn.value,
          category: catSel.value,
          firmId: firmSel.value || '',
          personId: personSel.value || '',
          person: personSel.value ? [fullName(state.contacts.find(c=>String(c.id)===String(personSel.value)))] : [],
          datetime: fromLocalInput(start.value),
          datetimeEnd: fromLocalInput(end.value),
          location: loc.value,
          status: (item? item.status : 'upcoming'),
          notes: notes.value
        };
        const idx = state.items.findIndex(x=>String(x.id)===String(id));
        if (idx>=0) state.items[idx]=obj; else state.items.push(obj);
        save();
        route('list');
      });

      // Render editor
      const head = el('h2',{}, item? 'Termin bearbeiten' : 'Neuer Termin');
      v.append(el('section',{}, head, form));
    }

    // ===== Top Nav (if exists) =====
    const tabs = document.querySelectorAll('.tabs .tab');
    if (tabs && tabs.length) tabs.forEach(b => b.addEventListener('click', () => route(b.dataset.route)));
    // Start
    route('list');
  }
})();
