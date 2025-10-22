
(function(){
  // ---------- Boot ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else { init(); }

  function init(){
    const v = document.getElementById('view');
    const byId = id => document.getElementById(id);

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
    const fmtRange = (a,b) => { const t0=fmtTime(a); const t1=fmtTime(b); return (t0 && t1) ? `${t0}–${t1}` : (t0 || ''); };
    const yyyymmdd = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

    // ---------- State (with migration) ----------
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

    // Per-category main address + image
    let catImages = JSON.parse(localStorage.getItem('tmjw_cat_images') || '{}'); // {cat:dataURL}
    const saveCatImages = ()=> localStorage.setItem('tmjw_cat_images', JSON.stringify(catImages));
    let catAddr   = JSON.parse(localStorage.getItem('tmjw_cat_addr')   || '{}'); // {cat:'Hauptadresse'}
    const saveCatAddr   = ()=> localStorage.setItem('tmjw_cat_addr',   JSON.stringify(catAddr));

    // ---------- Top nav (if present) ----------
    document.querySelectorAll('.tabs .tab')?.forEach(b => b.addEventListener('click', ()=> route(b.dataset.route)));

    // ---------- Routing ----------
    function route(name, arg){
      if(name==='overview') ov();
      else if(name==='list') listView();
      else if(name==='tasks') tasksView();
      else if(name==='contacts') contactsView();
      else if(name==='cats') catsView();
      else if(name==='new') { editView(arg); }
      else if(name==='archive') archiveView();
      else listView();
    }

    // ---------- Contacts helpers ----------
    function fullName(c){ return [c.vorname, c.name].filter(Boolean).join(' ').trim(); }
    function contactsByCategory(cat){ return state.contacts.filter(c => (c.kategorie||'Unkategorisiert')===cat); }
    function allContactAddressesForCategory(cat){
      const ret = [];
      contactsByCategory(cat).forEach(c => { if (c.adresse && c.adresse.trim()) ret.push(c.adresse.trim()); });
      return Array.from(new Set(ret.map(s=>s.toLowerCase()))).map(lc => ret.find(s=>s.toLowerCase()===lc));
    }

    // ---------- Confirmation ----------
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
    function ov(){
      v.innerHTML='';
      const upcoming = state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      const wrap = el('section',{},
        el('h2',{},'Termine'),
        renderList(upcoming, ()=>ov()),
        el('div',{class:'sep'}),
        el('h2',{},'Aufgaben'),
        renderList(state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived'), ()=>ov())
      );
      v.append(wrap);
    }

    function listView(){
      v.innerHTML='';
      const arr = state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      v.append(el('section',{}, el('h2',{},'Termine'), renderList(arr, ()=>listView())));
    }

    function tasksView(){
      v.innerHTML='';
      const arr = state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived')
        .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      v.append(el('section',{}, el('h2',{},'Aufgaben'), renderList(arr, ()=>tasksView())));
    }

    function archiveView(){
      v.innerHTML='';
      const arr = state.items.filter(a=>a.status==='archived')
        .sort((a,b)=> new Date(b.datetime)-new Date(a.datetime));
      v.append(el('section',{}, el('h2',{},'Archiv'), renderList(arr, ()=>archiveView())));
    }

    function contactsView(){
      v.innerHTML='';
      const sec = el('section',{},
        el('h2',{},'Kontakte'),
        el('div',{class:'btnrow'},
          el('button',{type:'button', onclick:()=>editContact()},'Neu'),
          el('button',{type:'button', onclick:()=>exportContacts()},'Export')
        ),
        el('div',{id:'clist', class:'list'})
      );
      v.append(sec);
      renderContacts();
    }

    function catsView(){
      v.innerHTML='';
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
      v.append(sec);
      renderCats();
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
      const dateLine = `${fmtDate(a.datetime)} ${fmtRange(a.datetime, a.datetimeEnd)} • ${a.category||''}`.trim();
      it.append(el('div',{}, dateLine));
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
      if (a.type!=='Aufgabe'){ const b4 = el('button',{type:'button'},'🧾 Bestätigen'); b4.onclick=()=> openConfirmDoc(a); row.append(b4); }
      it.append(row);
      return it;
    }

    // ---------- Editor (Nur Kategorie & Person wählbar) ----------
    function editView(id){
      const item = id ? state.items.find(x=>String(x.id)===String(id)) : null;
      v.innerHTML='';
      const form = el('form',{class:'editor'});
      const hid = el('input',{type:'hidden', name:'id', value: item? item.id : String(Date.now())});
      form.append(hid);

      const title = el('input',{type:'text', name:'title', value: item? (item.title||'') : ''});
      form.append(el('label',{},'Titel'), title);

      const catSel = el('select',{name:'category'});
      state.cats.forEach(c => catSel.append(el('option',{value:c,selected:(item?item.category:'')===c}, c)));
      form.append(el('label',{},'Kategorie'), catSel);

      // Person (freie Eingabe oder Auswahl aus Kontakten der Kategorie)
      const perSel = el('select',{name:'personSel'});
      const names = contactsByCategory(item? item.category||state.cats[0] : state.cats[0]).map(fullName);
      ;[...new Set(names)].concat(['Andere']).forEach(n => perSel.append(el('option',{value:n}, n)));
      const perOther = el('input',{type:'text', id:'personOther', placeholder:'Andere (Name)', style:'display:none'});

      form.append(el('label',{},'Person'), perSel, perOther);

      // Beginn / Ende optional
      const start = el('input',{type:'datetime-local', name:'datetime', value: item? toLocalInput(item.datetime) : ''});
      const end   = el('input',{type:'datetime-local', name:'datetimeEnd', value: item? toLocalInput(item.datetimeEnd) : ''});
      form.append(el('label',{},'Beginn'), start);
      form.append(el('label',{},'Ende (optional)'), end);

      // Standort (auto aus Kategorie/Kontakten)
      const loc = el('input',{type:'text', name:'location', placeholder:'Standort/Adresse', value: item? (item.location||'') : ''});
      const dl = el('datalist',{id:'address_list'});
      loc.setAttribute('list','address_list');
      form.append(el('label',{},'Standort'), loc, dl);
      function rebuildAddressDatalist(){
        dl.innerHTML='';
        const cat = catSel.value;
        const main = catAddr[cat];
        const opts = [];
        if (main && main.trim()) opts.push(main.trim());
        allContactAddressesForCategory(cat).forEach(a => { if(!opts.includes(a)) opts.push(a); });
        opts.forEach(o => dl.append(el('option',{value:o})));
        if (!loc.value && main) loc.value = main;
      }
      rebuildAddressDatalist();

      // Notizen
      const notes = el('textarea',{name:'notes'}, item? (item.notes||'') : '');
      form.append(el('label',{},'Notizen'), notes);

      // Wechsel-Logik
      perSel.addEventListener('change', ()=>{
        perOther.style.display = (perSel.value==='Andere') ? 'block' : 'none';
      });
      catSel.addEventListener('change', ()=>{
        // Rebuild person list for new category
        const names = contactsByCategory(catSel.value).map(fullName);
        perSel.innerHTML='';
        [...new Set(names)].concat(['Andere']).forEach(n => perSel.append(el('option',{value:n}, n)));
        perOther.style.display='none';
        rebuildAddressDatalist();
      });

      // Buttons
      const actions = el('div',{class:'btnrow'});
      const saveBtn = el('button',{type:'submit'},'💾 Speichern');
      const cancel  = el('button',{type:'button', onclick:()=>route('list')},'Abbrechen');
      actions.append(saveBtn,cancel);
      form.append(actions);

      // Submit
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const id  = hid.value;
        const cat = catSel.value;
        const person = (perSel.value==='Andere') ? perOther.value.trim() : perSel.value;
        const obj = {
          id,
          type: 'Termin',
          title: title.value.trim(),
          category: cat,
          person: person ? [person] : [],
          datetime: fromLocalInput(start.value),
          datetimeEnd: fromLocalInput(end.value),
          location: loc.value.trim() || (catAddr[cat]||''),
          status: (item? item.status : 'upcoming'),
          notes: notes.value.trim()
        };
        const i = state.items.findIndex(x=>String(x.id)===String(id));
        if(i>=0) state.items[i]=obj; else state.items.push(obj);
        save();
        route('list');
      });

      v.innerHTML='';
      v.append(el('section',{}, el('h2',{}, item?'Termin bearbeiten':'Neuer Termin'), form));
    }

    // ---------- Contacts UI ----------
    function renderContacts(){
      const list = byId('clist'); list.innerHTML='';
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
      v.innerHTML='';
      const f = el('form',{class:'editor'});
      const hid = el('input',{type:'hidden',value: c? c.id : String(Date.now())});
      function mkField(key, label, type='text', val=''){ const i=el('input',{type, id:key, value:val||''}); return el('div',{}, el('label',{},label), i); }
      const catSel = el('select',{id:'kategorie'}); state.cats.forEach(x=> catSel.append(el('option',{value:x,selected:(c?c.kategorie:'')===x},x)));
      f.append(hid);
      f.append(mkField('vorname','Vorname','text', c?.vorname));
      f.append(mkField('name','Name','text', c?.name));
      f.append(el('div',{}, el('label',{},'Kategorie'), catSel));
      f.append(mkField('funktion','Funktion','text', c?.funktion));
      f.append(mkField('telefon','Telefon','text', c?.telefon));
      f.append(mkField('email','E-Mail','email', c?.email));
      f.append(mkField('adresse','Adresse','text', c?.adresse)); // NEW
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
          vorname: byId('vorname').value.trim(),
          name:    byId('name').value.trim(),
          kategorie: catSel.value,
          funktion: byId('funktion').value.trim(),
          telefon:  byId('telefon').value.trim(),
          email:    byId('email').value.trim(),
          adresse:  byId('adresse').value.trim(),
          notizen:  byId('notizen').value.trim()
        };
        const i = state.contacts.findIndex(x=>x.id===obj.id);
        if(i>=0) state.contacts[i]=obj; else state.contacts.push(obj);
        save(); route('contacts');
      });
      v.append(el('section',{}, el('h2',{}, c?'Kontakt bearbeiten':'Neuer Kontakt'), f));
    }
    function exportContacts(){
      const head=['ID','Vorname','Name','Kategorie','Funktion','Telefon','E-Mail','Adresse','Notizen'];
      const rows = state.contacts.map(c=>[c.id,c.vorname||'',c.name||'',c.kategorie||'',c.funktion||'',c.telefon||'',c.email||'',c.adresse||'',(c.notizen||'').replace(/\n/g,' ')]);
      const csv = [head,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='kontakte.csv'; a.click(); URL.revokeObjectURL(a.href);
    }

    // ---------- Categories UI ----------
    function renderCats(){
      const list = byId('catlist'); list.innerHTML='';
      state.cats.forEach(c => {
        const it = el('div',{class:'item'});
        const img = catImages[c] ? el('img',{src:catImages[c], style:'width:32px;height:32px;border-radius:6px;border:1px solid #e5e7eb;object-fit:cover;margin-right:8px'}) : null;
        const row = el('div',{style:'display:flex;align-items:center;gap:8px'});
        if(img) row.append(img);
        row.append(el('div',{class:'title'}, c));
        it.append(row);
        const addr = catAddr[c] ? el('div',{class:'meta'}, 'Hauptadresse: '+catAddr[c]) : el('div',{class:'meta'}, 'Keine Hauptadresse');
        it.append(addr);
        const btn = el('div',{class:'btnrow'},
          el('button',{type:'button',onclick:()=>{ const n=prompt('Kategorie umbenennen',c); if(n && n!==c){ state.cats = state.cats.map(x=>x===c?n:x); if(catImages[n]==null && catImages[c]){ catImages[n]=catImages[c]; delete catImages[c]; saveCatImages(); } if(catAddr[n]==null && catAddr[c]){ catAddr[n]=catAddr[c]; delete catAddr[c]; saveCatAddr(); } save(); renderCats(); }}},'Umbenennen'),
          el('button',{type:'button',onclick:()=> setCategoryImage(c)},'Bild setzen'),
          el('button',{type:'button',onclick:()=> setCategoryAddress(c)},'Hauptadresse setzen'),
          el('button',{type:'button',onclick:()=>{ if(confirm('Kategorie wirklich löschen?')){ state.cats=state.cats.filter(x=>x!==c); delete catImages[c]; delete catAddr[c]; save(); saveCatImages(); saveCatAddr(); renderCats(); }}},'Löschen')
        );
        it.append(btn);
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
      inp.onchange = ()=>{
        const f = inp.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = ()=>{ catImages[cat]=r.result; saveCatImages(); renderCats(); };
        r.readAsDataURL(f);
      };
      inp.click();
    }
    function setCategoryAddress(cat){
      const cur = catAddr[cat] || '';
      const val = prompt('Hauptadresse für "'+cat+'"', cur);
      if(val!==null){ catAddr[cat] = val.trim(); saveCatAddr(); renderCats(); }
    }

    // ---------- Start ----------
    route('list');
  }
})();
