
*/
(function(){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

  function init(){
    const view = document.getElementById('view');
    const $ = (s, r=document)=>r.querySelector(s);
    const $$= (s, r=document)=>Array.from(r.querySelectorAll(s));

    // ---------- Utils ----------
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const el = (tag, attrs = {}, ...kids) => {
      const n = document.createElement(tag);
      for (const [k,val] of Object.entries(attrs||{})){
        if (k === 'class') n.className = val;
        else if (k === 'style') n.setAttribute('style', val);
        else if (k.startsWith('on') && typeof val === 'function') n.addEventListener(k.slice(2), val);
        else n.setAttribute(k, val);
      }
      kids.flat().forEach(k => n.append(typeof k === 'string' ? document.createTextNode(k) : k));
      return n;
    };
    const toLocalInput = iso => { try{ if(!iso) return ''; const d=new Date(iso); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}catch{return '';} };
    const fromLocalInput = val => { try{ if(!val) return ''; const d=new Date(val); return new Date(d.getTime()+d.getTimezoneOffset()*60000).toISOString();}catch{return '';} };
    const fmtDate = iso => { const d=new Date(iso); if(isNaN(d)) return '—'; return d.toLocaleDateString('de-CH',{year:'numeric',month:'2-digit',day:'2-digit'}); };
    const fmtTime = iso => { const d=new Date(iso); if(isNaN(d)) return ''; return d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}); };
    const fmtRange = (a,b) => { const t0=fmtTime(a); const t1=fmtTime(b); return (t0&&t1)? `${t0}–${t1}` : (t0||''); };
    const yyyymmdd=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

    // ---------- State + Migration ----------
    const LSKEY = 'timemate_jw_state_v3';
    const LEGACY_KEYS = ['timemate_jw_state_v4','timemate_jw_state_v2','timemate_jw_state'];
    let state = null;
    try{ state = JSON.parse(localStorage.getItem(LSKEY) || 'null'); }catch{ state = null; }
    if(!state){
      for(const k of LEGACY_KEYS){
        try{
          const raw = localStorage.getItem(k);
          if(raw){ state = JSON.parse(raw); localStorage.setItem(LSKEY, raw); break; }
        }catch{}
      }
    }
    if(!state) state = { items: [], contacts: [], cats: ['Spitex Heitersberg','Psychologin / Therapie','Töpferhaus','Genossenschaft Migros Aare','Administrativ','Privat','HKV Aarau','Persönlich','Unkategorisiert'] };
    const save = ()=> localStorage.setItem(LSKEY, JSON.stringify(state));

    // Persistente Zusatzspeicher
    let catImages = JSON.parse(localStorage.getItem('tmjw_cat_images') || '{}'); // {cat:dataURL}
    const saveCatImages = ()=> localStorage.setItem('tmjw_cat_images', JSON.stringify(catImages));
    let catAddr   = JSON.parse(localStorage.getItem('tmjw_cat_addr')   || '{}'); // {cat:'Hauptadresse'}
    const saveCatAddr   = ()=> localStorage.setItem('tmjw_cat_addr',   JSON.stringify(catAddr));

    // ---------- Tabs (optional, falls vorhanden) ----------
    $$('.tabs .tab').forEach(b => b.addEventListener('click', ()=>{
      const txt=(b.textContent||'').trim();
      const map={'Übersicht':'overview','Neuer Eintrag':'new','Liste':'list','Aufgaben':'tasks','Kontakte':'contacts','Kategorien':'cats','Einstellungen':'settings','Archiv':'archive'};
      route(b.dataset.route||map[txt]||'list');
    }));

    // ---------- Helpers ----------
    const fullName = c => [c?.vorname,c?.name].filter(Boolean).join(' ').trim();
    const contactsByCategory = cat => state.contacts.filter(x => (x.kategorie||'Unkategorisiert')===cat);
    function catContactAddresses(cat){
      const set=new Set(), out=[];
      contactsByCategory(cat).forEach(c=>{
        const a=(c.adresse||'').trim();
        if(a && !set.has(a.toLowerCase())){ set.add(a.toLowerCase()); out.push(a); }
      });
      return out;
    }
    function addressForPerson(name, cat){
      if(!name) return '';
      const n=String(name).trim().toLowerCase();
      const inCat = state.contacts.find(c=>{
        const fn = fullName(c).toLowerCase();
        return fn===n && (c.kategorie||'Unkategorisiert')===cat;
      });
      if(inCat && inCat.adresse) return inCat.adresse.trim();
      const any = state.contacts.find(c=> fullName(c).toLowerCase()===n && c.adresse);
      return any ? any.adresse.trim() : '';
    }

    // ---------- Routing ----------
    function route(name,arg){
      if(name==='overview') return overview();
      if(name==='list')     return listView();
      if(name==='tasks')    return tasksView();
      if(name==='new')      return editView(arg);
      if(name==='archive')  return archiveView();
      if(name==='contacts') return contactsView();
      if(name==='cats')     return catsView();
      if(name==='settings') return settingsView();
      return listView();
    }

    // ---------- Bestätigung ----------
    function nextNumFor(person){
      try{
        const KEY='tmjw_confirm_counter'; const map=JSON.parse(localStorage.getItem(KEY)||'{}');
        const k=String(person||'Joel Weber'); const n=(map[k]||0)+1; map[k]=n; localStorage.setItem(KEY, JSON.stringify(map)); return n;
      }catch{ return 1; }
    }
    function openConfirmDoc(item){
      try{
        const persons0 = Array.isArray(item.person)? item.person.slice() : (item.person? [item.person] : []);
        if(!persons0.some(p => String(p||'').trim().toLowerCase()==='joel weber')) persons0.push('Joel Weber');
        const perDisp = persons0.length ? persons0.join(', ') : '—';
        const statusLabel = ({done:'Erledigt', archived:'Archiviert', upcoming:'Bevorstehend'}[item.status] || 'Bevorstehend');

        const dt = new Date(item.datetime || Date.now());
        const dateStr = !isNaN(dt) ? dt.toLocaleDateString('de-CH',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
        const range = fmtRange(item.datetime, item.datetimeEnd);
        const nowStr = new Date().toLocaleString('de-CH',{dateStyle:'medium',timeStyle:'short'});
        const title = item.title || '(ohne Titel)';

        const fileBase = `${yyyymmdd(!isNaN(dt)?dt:new Date())}_Terminbestätigung_${String(title).replace(/[^A-Za-z0-9_. -]/g,'').replace(/\s+/g,'_').slice(0,80)||'ohne_Titel'}_(${nextNumFor('Joel Weber')})`;

        const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${esc(fileBase)}</title>
<style>
  @page { margin: 18mm; }
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.45;}
  h1{margin:0 0 6px 0;font-size:22px;}
  .meta{color:#475569;margin-bottom:10px;}
  .box{border:1px solid #3b82f6;border-radius:12px;padding:14px;}
  .row{display:grid;grid-template-columns:160px 1fr;gap:8px;margin:6px 0;}
  .label{color:#64748b;}
  footer{margin-top:24px;font-size:12px;color:#64748b;}
  .badge{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:12px;}
  .small{font-size:12px;}
</style>
</head>
<body>
  <h1>Terminbestätigung</h1>
  <div class="meta">Bestätigung des folgenden Termins</div>
  <div class="box">
    <div class="row"><div class="label">Titel</div><div><strong>${esc(title)}</strong></div></div>
    <div class="row"><div class="label">Kategorie</div><div><span class="badge">${esc(item.category||'')}</span></div></div>
    <div class="row"><div class="label">Datum</div><div>${esc(dateStr)}${range ? ' – '+esc(range)+' Uhr' : ''}</div></div>
    <div class="row"><div class="label">Person(en)</div><div>${esc(perDisp)}</div></div>
    <div class="row"><div class="label">Standort</div><div>${esc(item.location||'—')}</div></div>
    <div class="row"><div class="label">Status</div><div>${esc(statusLabel)}</div></div>
    <div class="row"><div class="label">Notizen</div><div>${esc(item.notes||'—')}</div></div>
    <div class="row small"><div class="label">ID</div><div>${esc(item.id||'')}</div></div>
  </div>
  <footer>
    <div>Erstellt am ${esc(nowStr)}</div>
    <div>Automatisch generiert durch TimeMate by J.W.</div>
  </footer>
  <script>setTimeout(function(){ window.print(); }, 200);</script>
</body>
</html>`;

        const ww = window.open('', '_blank');
        if(!ww){ alert('Popup blockiert – bitte erlauben.'); return; }
        ww.document.open('text/html'); ww.document.write(html); ww.document.close();
      }catch(e){ console.error('Bestätigung fehlgeschlagen', e); alert('Konnte die Terminbestätigung nicht erzeugen.'); }
    }

    // ---------- Views ----------
    function overview(){
      view.innerHTML='';
      const upcoming = state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      const tasks = state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      view.append(
        el('section',{}, el('h2',{},'Termine'), renderList(upcoming, overview)),
        el('div',{class:'sep'}),
        el('section',{}, el('h2',{},'Aufgaben'), renderList(tasks, overview))
      );
    }

    function listView(){
      view.innerHTML='';
      const arr = state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      view.append(el('section',{}, el('h2',{},'Termine'), renderList(arr, listView)));
    }

    function tasksView(){
      view.innerHTML='';
      const arr = state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      view.append(el('section',{}, el('h2',{},'Aufgaben'), renderList(arr, tasksView)));
    }

    function archiveView(){
      view.innerHTML='';
      const arr = state.items.filter(a=>a.status==='archived')
        .sort((a,b)=> new Date(b.datetime)-new Date(a.datetime));
      view.append(el('section',{}, el('h2',{},'Archiv'), renderList(arr, archiveView)));
    }

    function contactsView(){
      view.innerHTML='';
      const sec = el('section',{},
        el('h2',{},'Kontakte'),
        el('div',{class:'btnrow'},
          el('button',{type:'button', onclick:()=>editContact()},'Neu'),
          el('button',{type:'button', onclick:()=>exportContacts()},'Export')
        ),
        el('div',{id:'clist', class:'list'})
      );
      view.append(sec);
      renderContacts();
    }

    function catsView(){
      view.innerHTML='';
      const sec = el('section',{},
        el('h2',{},'Kategorien'),
        el('div',{class:'btnrow'},
          el('button',{type:'button', onclick:()=>addCategory()},'+ Kategorie'),
          el('button',{type:'button', onclick:()=>renameCategory()},'Umbenennen'),
          el('button',{type:'button', onclick:()=>setCategoryImageUI()},'Bild setzen'),
          el('button',{type:'button', onclick:()=>setCategoryAddressUI()},'Hauptadresse setzen')
        ),
        el('div',{id:'catlist', class:'list'})
      );
      view.append(sec);
      renderCats();
    }

    function settingsView(){
      view.innerHTML='';
      view.append(el('section',{}, el('h2',{},'Einstellungen'), el('p',{class:'meta'},'Keine Einstellungen erforderlich.')));
    }

    // ---------- List renderers ----------
    function renderList(arr, refresh){
      const list = el('div',{class:'list'});
      if(!arr.length){ list.innerHTML='<p class="meta">Nichts vorhanden.</p>'; return list; }
      arr.forEach(a => list.append(renderItem(a, refresh)));
      return list;
    }

    function renderItem(a, refresh){
      const it = el('div',{class:'item'});
      it.append(el('div',{class:'title'}, a.title || '(ohne Titel)'));
      it.append(el('div',{}, `${fmtDate(a.datetime)} ${fmtRange(a.datetime, a.datetimeEnd)} • ${a.category||''}`.trim()));
      if (a.type!=='Aufgabe'){
        const pDisp = Array.isArray(a.person)? a.person.join(', ') : (a.person||'—');
        it.append(el('div',{}, `Person(en): ${pDisp}`));
        it.append(el('div',{}, `Standort: ${a.location || '—'}`));
      }
      it.append(el('div',{}, `Notizen: ${esc(a.notes || '—')}`));

      const row = el('div',{class:'btnrow'});
      const b1 = el('button',{type:'button'}, a.status==='done'?'↺ Reaktivieren':'☑️ Abhaken');
      b1.onclick=()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); refresh(); };
      const b2 = el('button',{type:'button'}, '↪ Archivieren'); b2.onclick=()=>{ a.status='archived'; save(); refresh(); };
      const b3 = el('button',{type:'button'}, '✏️ Bearbeiten'); b3.onclick=()=> editView(a.id);
      row.append(b1,b2,b3);
      if (a.type!=='Aufgabe'){
        const b4 = el('button',{type:'button'},'🧾 Bestätigen'); b4.onclick=()=> openConfirmDoc(a);
        row.append(b4);
      }
      it.append(row);
      return it;
    }

    // ---------- Editor ----------
    function editView(id){
      const item = id ? state.items.find(x=>String(x.id)===String(id)) : null;
      view.innerHTML='';
      const form = el('form',{class:'editor'});

      const hid = el('input',{type:'hidden', name:'id', value: item? item.id : String(Date.now())});
      form.append(hid);

      const title = el('input',{type:'text', name:'title', value: item? (item.title||'') : ''});
      form.append(el('label',{},'Titel'), title);

      const catSel = el('select',{name:'category', id:'category'});
      state.cats.forEach(c => catSel.append(el('option',{value:c,selected:(item?item.category:'')===c}, c)));
      form.append(el('label',{},'Kategorie'), catSel);

      // Person (Auswahl aus Kontakten der Kategorie + "Andere")
      const perSel = el('select',{name:'personSel', id:'personSel'});
      function rebuildPersons(){
        const names = contactsByCategory(catSel.value).map(fullName);
        perSel.innerHTML='';
        [...new Set(names)].concat(['Andere']).forEach(n => perSel.append(el('option',{value:n}, n)));
      }
      rebuildPersons();
      const perOther = el('input',{type:'text', id:'personOther', placeholder:'Andere (Name)', style:'display:none'});
      form.append(el('label',{},'Person'), perSel, perOther);

      // Beginn/Ende
      const start = el('input',{type:'datetime-local', name:'datetime', id:'datetime', value: item? toLocalInput(item.datetime) : ''});
      const end   = el('input',{type:'datetime-local', name:'datetimeEnd', id:'datetimeEnd', value: item? toLocalInput(item.datetimeEnd) : ''});
      form.append(el('label',{},'Beginn'), start);
      form.append(el('label',{},'Ende (optional)'), end);

      // Standort mit Vorschlägen (Datalist)
      const loc = el('input',{type:'text', name:'location', id:'location', placeholder:'Standort/Adresse', value: item? (item.location||'') : ''});
      const dl = el('datalist',{id:'tm_addr_list'});
      loc.setAttribute('list','tm_addr_list');
      form.append(el('label',{},'Standort'), loc, dl);

      function rebuildAddressDatalist(){
        dl.innerHTML='';
        const cat = catSel.value || 'Unkategorisiert';
        const main = (catAddr && catAddr[cat]) ? String(catAddr[cat]).trim() : '';
        const opts = [];
        if (main) opts.push(main);
        catContactAddresses(cat).forEach(a => { if (a && !opts.includes(a)) opts.push(a); });
        // Adresse der gewählten Person
        const pSelVal = perSel.value;
        const pAddr = (pSelVal && pSelVal!=='Andere') ? addressForPerson(pSelVal, cat) : '';
        if (pAddr && !opts.includes(pAddr)) opts.push(pAddr);
        // Optionen schreiben
        opts.forEach(o => dl.append(el('option',{value:o})));
        dl.append(el('option',{value:'Andere…'}));
        // falls leer → Hauptadresse vorfüllen
        if (!loc.value && main) loc.value = main;
      }
      rebuildAddressDatalist();

      // Notizen
      const notes = el('textarea',{name:'notes'}, item? (item.notes||'') : '');
      form.append(el('label',{},'Notizen'), notes);

      // Wechsel-Logik
      perSel.addEventListener('change', ()=>{
        perOther.style.display = (perSel.value==='Andere') ? 'block' : 'none';
        // Personenadresse direkt übernehmen, wenn vorhanden
        const cat = catSel.value || 'Unkategorisiert';
        const pAddr = (perSel.value && perSel.value!=='Andere') ? addressForPerson(perSel.value, cat) : '';
        if (pAddr) loc.value = pAddr;
        rebuildAddressDatalist();
      });
      perSel.addEventListener('input', rebuildAddressDatalist);
      catSel.addEventListener('change', ()=>{
        rebuildPersons();
        perOther.style.display='none';
        rebuildAddressDatalist();
      });

      const actions = el('div',{class:'btnrow'});
      const saveBtn = el('button',{type:'submit'},'💾 Speichern');
      const cancel  = el('button',{type:'button', onclick:()=>route('list')},'Abbrechen');
      actions.append(saveBtn,cancel);
      form.append(actions);

      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const id  = hid.value;
        const cat = catSel.value;
        const person = (perSel.value==='Andere') ? perOther.value.trim() : perSel.value;
        // Standort: wenn leer → Hauptadresse übernehmen
        let locationVal = (loc.value||'').trim();
        if (!locationVal && catAddr[cat]) locationVal = String(catAddr[cat]).trim();

        const obj = {
          id,
          type: 'Termin',
          title: title.value.trim(),
          category: cat,
          person: person ? [person] : [],
          datetime: fromLocalInput(start.value),
          datetimeEnd: fromLocalInput(end.value),
          location: locationVal,
          status: (item? item.status : 'upcoming'),
          notes: notes.value.trim()
        };
        const i = state.items.findIndex(x=>String(x.id)===String(id));
        if(i>=0) state.items[i]=obj; else state.items.push(obj);
        save();
        route('list');
      });

      view.innerHTML='';
      view.append(el('section',{}, el('h2',{}, item?'Termin bearbeiten':'Neuer Termin'), form));

      // Wenn bestehender Termin: Person vorauswählen + Datalist aktualisieren
      if(item){
        const name0 = (Array.isArray(item.person)? item.person[0] : (item.person||''));
        if (name0){
          const opt = Array.from(perSel.options).find(o=>o.value===name0);
          if(!opt){ perSel.append(el('option',{value:name0,selected:true},name0)); }
          else { perSel.value = name0; }
          perOther.style.display='none';
          rebuildAddressDatalist();
        }
      }
    }

    // ---------- Kontakte ----------
    function renderContacts(){
      const list = $('#clist'); list.innerHTML='';
      if(!state.contacts.length){ list.innerHTML='<p class="meta">Keine Kontakte.</p>'; return; }
      state.contacts.forEach(c => list.append(contactRow(c)));
    }
    function contactRow(c){
      const it = el('div',{class:'item'});
      it.append(el('div',{class:'title'}, fullName(c) || '(ohne Name)'));
      it.append(el('div',{}, `Kategorie: ${c.kategorie || 'Unkategorisiert'}`));
      if (c.telefon) it.append(el('div',{}, `Telefon: ${c.telefon}`));
      if (c.email)   it.append(el('div',{}, `E-Mail: ${c.email}`));
      if (c.adresse) it.append(el('div',{}, `Adresse: ${c.adresse}`));
      const row = el('div',{class:'btnrow'});
      row.append(
        el('button',{type:'button',onclick:()=>editContact(c.id)},'Bearbeiten'),
        el('button',{type:'button',onclick:()=>{ state.contacts = state.contacts.filter(x=>x.id!==c.id); save(); renderContacts(); }},'Löschen')
      );
      it.append(row);
      return it;
    }
    function editContact(id){
      const c = id ? state.contacts.find(x=>x.id===id) : null;
      view.innerHTML='';
      const f = el('form',{class:'editor'});
      const hid = el('input',{type:'hidden',value: c? c.id : String(Date.now())});
      const mk = (id,label,type='text',val='')=>{ const w=el('div',{}); w.append(el('label',{},label)); w.append(el('input',{type,id,value:val||''})); return w; };
      const catSel = el('select',{id:'kategorie'}); state.cats.forEach(x=> catSel.append(el('option',{value:x,selected:(c?c.kategorie:'')===x},x)));
      f.append(hid);
      f.append(el('label',{},'Kategorie'), catSel);
      f.append(mk('vorname','Vorname','text', c?.vorname));
      f.append(mk('name','Name','text', c?.name));
      f.append(mk('funktion','Funktion','text', c?.funktion));
      f.append(mk('telefon','Telefon','text', c?.telefon));
      f.append(mk('email','E-Mail','email', c?.email));
      f.append(mk('adresse','Adresse','text', c?.adresse)); // neues Adressfeld für Kontakte
      const note = el('textarea',{id:'notizen'}, c?.notizen||'');
      f.append(el('label',{},'Notizen'), note);
      const actions = el('div',{class:'btnrow'},
        el('button',{type:'submit'},'Speichern'),
        el('button',{type:'button',onclick:()=>route('contacts')},'Abbrechen')
      );
      f.append(actions);
      f.addEventListener('submit', (e)=>{
        e.preventDefault();
        const obj = {
          id: hid.value,
          vorname: $('#vorname').value.trim(),
          name:    $('#name').value.trim(),
          kategorie: catSel.value,
          funktion: $('#funktion').value.trim(),
          telefon:  $('#telefon').value.trim(),
          email:    $('#email').value.trim(),
          adresse:  $('#adresse').value.trim(),
          notizen:  $('#notizen').value.trim()
        };
        const i = state.contacts.findIndex(x=>x.id===obj.id);
        if(i>=0) state.contacts[i]=obj; else state.contacts.push(obj);
        save(); route('contacts');
      });
      view.append(el('section',{}, el('h2',{}, c?'Kontakt bearbeiten':'Neuer Kontakt'), f));
    }
    function exportContacts(){
      const head=['ID','Vorname','Name','Kategorie','Funktion','Telefon','E-Mail','Adresse','Notizen'];
      const rows = state.contacts.map(c=>[c.id,c.vorname||'',c.name||'',c.kategorie||'',c.funktion||'',c.telefon||'',c.email||'',c.adresse||'',(c.notizen||'').replace(/\n/g,' ')]);
      const csv = [head,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='kontakte.csv'; a.click(); URL.revokeObjectURL(a.href);
    }

    // ---------- Kategorien ----------
    function renderCats(){
      const list = $('#catlist'); list.innerHTML='';
      state.cats.forEach(c => {
        const it = el('div',{class:'item'});
        const row = el('div',{style:'display:flex;align-items:center;gap:8px'});
        if(catImages[c]) row.append(el('img',{src:catImages[c],style:'width:32px;height:32px;border-radius:6px;border:1px solid #e5e7eb;object-fit:cover'}));
        row.append(el('div',{class:'title'}, c));
        it.append(row);
        it.append(el('div',{class:'meta'}, catAddr[c]?('Hauptadresse: '+catAddr[c]):'Keine Hauptadresse'));
        it.append(el('div',{class:'btnrow'},
          el('button',{type:'button',onclick:()=>{ const n=prompt('Kategorie umbenennen',c); if(n && n!==c){ state.cats = state.cats.map(x=>x===c?n:x); if(catImages[c]){ catImages[n]=catImages[c]; delete catImages[c]; saveCatImages(); } if(catAddr[c]){ catAddr[n]=catAddr[c]; delete catAddr[c]; saveCatAddr(); } save(); renderCats(); }}},'Umbenennen'),
          el('button',{type:'button',onclick:()=> setCategoryImage(c)},'Bild setzen'),
          el('button',{type:'button',onclick:()=> setCategoryAddress(c)},'Hauptadresse setzen'),
          el('button',{type:'button',onclick:()=>{ if(confirm('Kategorie wirklich löschen?')){ state.cats=state.cats.filter(x=>x!==c); delete catImages[c]; delete catAddr[c]; save(); saveCatImages(); saveCatAddr(); renderCats(); }}},'Löschen')
        ));
        list.append(it);
      });
    }
    function addCategory(){
      const name = prompt('Neue Kategorie'); if(!name) return;
      if(!state.cats.includes(name)) state.cats.push(name);
      save(); renderCats();
    }
    function renameCategory(){ route('cats'); }
    function setCategoryImageUI(){ route('cats'); }
    function setCategoryImage(cat){
      const inp = el('input',{type:'file',accept:'image/*'});
      inp.onchange = ()=>{ const f=inp.files[0]; if(!f) return; const r=new FileReader(); r.onload = ()=>{ catImages[cat]=r.result; saveCatImages(); renderCats(); }; r.readAsDataURL(f); };
      inp.click();
    }
    function setCategoryAddressUI(){ route('cats'); }
    function setCategoryAddress(cat){
      const cur = catAddr[cat] || '';
      const val = prompt('Hauptadresse für "'+cat+'"', cur);
      if(val!==null){ catAddr[cat] = val.trim(); saveCatAddr(); renderCats(); }
    }

    // ---------- Start ----------
    route('list');
  }
})();
