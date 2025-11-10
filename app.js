
// TimeMate by J.W. — v1.24 (stabilized bundle)
// This file is self-contained so the app never renders blank even if the HTML is minimal.
// Includes:
// - Safe bootstrapping, helpers, router, storage layer
// - Tabs: Übersicht, Neuer Eintrag, Liste, Aufgaben, Einstellungen, Archiv
// - Calendar fixes: back button works reliably; removed explicit "Heute"-label (visual highlight only)
// - Settings: calendar range (1/3/12 months), personalization, IO, maintenance
// - No external CSS required (uses simple inline styles + CSS vars)

(function(){
  'use strict';

  // ---------- helpers ----------
  const byId = (id)=> document.getElementById(id);
  function el(tag, attrs={}, ...children){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})){
      if (k==='style' && typeof v==='string') n.setAttribute('style', v);
      else if (k==='class' || k==='className') n.className = v;
      else if (k.startsWith('on') && typeof v==='function') n[k] = v;
      else n.setAttribute(k, v);
    }
    children.flat().forEach(c=>{
      if (c==null) return;
      if (c.nodeType) n.appendChild(c);
      else n.appendChild(document.createTextNode(String(c)));
    });
    return n;
  }
  function fmtDateTime(d){
    try{
      const dt = (d instanceof Date) ? d : new Date(d);
      return dt.toLocaleString('de-CH', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
    }catch(_){ return String(d||''); }
  }

  // ---------- root container ----------
  let v = window.v;
  if(!v){
    // create minimal scaffold if none provided
    const root = byId('app') || el('div', {id:'app'});
    if(!root.parentNode) document.body.appendChild(root);

    // header + tabs
    const header = el('div', {id:'hdr', style:'position:sticky;top:0;z-index:10;background:linear-gradient(90deg,#0aa,#09f);color:#fff;padding:14px 16px'});
    header.append(el('div', {style:'font-size:26px;font-weight:800;letter-spacing:.4px'}, 'TimeMate By J.W.'));
    const tabs = el('div', {id:'tabs', style:'display:flex;gap:10px;flex-wrap:wrap;padding:10px 2px'});
    function tabBtn(routeId, label){
      const b = el('button', {type:'button', style:btnStyle('light')}, label);
      b.onclick = ()=> route(routeId);
      return b;
    }
    tabs.append(
      tabBtn('overview','Übersicht'),
      tabBtn('new','Neuer Eintrag'),
      tabBtn('list','Liste'),
      tabBtn('tasks','Aufgaben'),
      tabBtn('settings','Einstellungen')
    );
    header.append(tabs);
    root.append(header);

    v = el('div', {id:'view', style:'padding:14px'});
    root.append(v);
    const foot = el('div', {style:'text-align:center;margin:20px 0;opacity:.6'}, '© TimeMate JW');
    root.append(foot);
    window.v = v;
  }

  // ---------- simple styles ----------
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#fff;--fg:#111;--muted:#666;--card:#fff;--border:#d0d0d0}
    .dark:root{--bg:#0f1115;--fg:#eaeaea;--muted:#94a3b8;--card:#111827;--border:#334155}
    body{background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;margin:0}
    .btnrow{display:flex;gap:8px;flex-wrap:wrap}
    .card{border:1px solid var(--border);border-radius:14px;background:var(--card);box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .title{font-weight:700}
    .meta{font-size:12px;color:var(--muted)}
    input,select,button,textarea{padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--fg)}
    button.primary{background:#0ea5e9;border-color:#0284c7;color:white}
    .list{display:flex;flex-direction:column;gap:8px}
    a.btnlike{display:inline-block;text-decoration:none}
  `;
  document.head.appendChild(style);

  function btnStyle(kind){
    if(kind==='light') return 'background:rgba(255,255,255,.9);color:#0b355e;border:1px solid rgba(255,255,255,.6);backdrop-filter:blur(6px);padding:10px 14px;border-radius:999px;font-weight:600';
    return 'padding:10px 14px;border-radius:12px';
  }

  // ---------- storage ----------
  let state = { items: [] };
  let contacts = [];
  let catImages = {};
  let catAddr = {};
  let CATS_ALL = [
    {key:'Privat'},{key:'Migros'},{key:'HKV Aarau'},{key:'Activ Fitness'},{key:'Spitex Heitersberg'},{key:'Töpferhaus'}
  ];
  function loadAll(){
    try{
      state = JSON.parse(localStorage.getItem('tmjw_state')||'{"items":[]}');
      contacts = JSON.parse(localStorage.getItem('tmjw_contacts')||'[]');
      catImages = JSON.parse(localStorage.getItem('tmjw_catImages')||'{}');
      catAddr = JSON.parse(localStorage.getItem('tmjw_catAddr')||'{}');
      CATS_ALL = JSON.parse(localStorage.getItem('tmjw_cats')||JSON.stringify(CATS_ALL));
    }catch(_){}
  }
  function save(){ try{ localStorage.setItem('tmjw_state', JSON.stringify(state)); }catch(_){} }
  function saveContacts(){ try{ localStorage.setItem('tmjw_contacts', JSON.stringify(contacts)); }catch(_){} }
  function saveCats(){ try{ localStorage.setItem('tmjw_cats', JSON.stringify(CATS_ALL)); }catch(_){} }
  function saveCatImages(){ try{ localStorage.setItem('tmjw_catImages', JSON.stringify(catImages)); }catch(_){} }
  function saveCatAddr(){ try{ localStorage.setItem('tmjw_catAddr', JSON.stringify(catAddr)); }catch(_){} }

  function autoUpdate(){ /* noop for now */ }

  // colors
  function __norm(s){ return String(s||'').toLowerCase().replace(/\s+/g,'_'); }
  function __loadColors(){ try{ return JSON.parse(localStorage.getItem('tmjw_colors')||'{}'); }catch(_){ return {}; } }
  function __saveColors(m){ try{ localStorage.setItem('tmjw_colors', JSON.stringify(m||{})); }catch(_){} }
  function catColor(key){
    const map = __loadColors();
    return map[__norm(key)] || {
      'privat':'#0ea5e9',
      'migros':'#16a34a',
      'hkv_aarau':'#f97316',
      'activ_fitness':'#a855f7',
      'spitex_heitersberg':'#ef4444',
      'töpferhaus':'#06b6d4'
    }[__norm(key)] || '#94a3b8';
  }

  // ---------- rendering ----------
  function renderItem(a, onChange){
    const wrap = el('div', {class:'card', style:'padding:10px 12px'});
    const top = el('div', {style:'display:flex;justify-content:space-between;gap:10px;align-items:center'});
    const left = el('div', {},
      el('div', {class:'title'}, a.title || '(ohne Titel)'),
      el('div', {class:'meta'}, fmtDateTime(a.datetime) + (a.category? ' • '+a.category : ''))
    );
    const dot = el('span', {style:`display:inline-block;width:12px;height:12px;border-radius:50%;background:${catColor(a.category)}`});
    top.append(left, dot);
    wrap.append(top);

    return wrap;
  }

  // ---------- router ----------
  const routes = {};
  function def(name, fn){ routes[name]=fn; }
  function route(name){
    (routes[name] || routes['overview'])();
  }
  window.route = route;

  // ---------- views ----------
  function overview(){
    autoUpdate();
    v.innerHTML = '';
    const s = el('section');
    s.append(el('h2', {}, 'Übersicht'));

    // Greeting
    const nm = (localStorage.getItem('tmjw_user_name')||'').trim();
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const isMorning = (h>=0 && (h<11 || (h===11 && m<=30)));
    const isDay = (h>11 || (h===11 && m>30)) && (h<18);
    const greet = isMorning ? 'Guten Morgen' : (isDay ? 'Guten Tag' : 'Guten Abend');
    s.append(el('div',{class:'card',style:'padding:14px;margin:10px 0;font-size:18px;font-weight:700'}, `${greet} ${nm||''}!`));

    // Today card (respect settings)
    let showToday='on', mode='detailed', includeTasks='off';
    try{
      showToday = localStorage.getItem('tmjw_view_today_show')||'on';
      mode = localStorage.getItem('tmjw_view_today_mode')||'detailed';
      includeTasks = localStorage.getItem('tmjw_view_today_include_tasks')||'off';
    }catch(_){}
    if(showToday==='on'){
      const tcard = el('div', {class:'card', style:'padding:14px'});
      tcard.append(el('div', {class:'title'}, 'Heute'));
      const today = new Date();
      const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
      const todays = state.items.filter(x=> x.type!=='Aufgabe' && isSameDay(new Date(x.datetime), today))
                    .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      if(todays.length===0) tcard.append(el('div',{class:'meta'}, 'Keine Termine heute.'));
      else{
        const list = el('div', {class:'list'});
        todays.forEach(a=> list.append(renderItem(a, overview)));
        tcard.append(list);
      }
      if(includeTasks==='on'){
        const tasks = state.items.filter(x=> x.type==='Aufgabe' && !x.done);
        if(tasks.length){
          tcard.append(el('div',{class:'title',style:'margin-top:8px'}, 'Aufgaben'));
          const l = el('ul', {});
          tasks.slice(0,5).forEach(t=> l.append(el('li',{}, t.title)));
          tcard.append(l);
        }
      }
      s.append(tcard);
    }

    v.append(s);
  }

  function newEntry(){
    v.innerHTML = '<section><h2>Neuer Eintrag</h2></section>';
    const sec = v.querySelector('section');

    const form = el('div', {class:'card', style:'padding:12px;display:grid;gap:8px;max-width:520px'});
    const title = el('input', {type:'text', placeholder:'Titel (z.B. Training)'});
    const when = el('input', {type:'datetime-local'});
    const cat = el('select', {});
    CATS_ALL.forEach(c=> cat.append(el('option', {value:c.key}, c.key)));
    const type = el('select', {}); type.append(el('option',{value:'Termin'},'Termin'), el('option',{value:'Aufgabe'},'Aufgabe'));

    const add = el('button', {class:'primary', type:'button'}, 'Hinzufügen');
    add.onclick = ()=>{
      const obj = { id: String(Date.now()), title: title.value||'(ohne Titel)', datetime: when.value||new Date().toISOString(), category: cat.value, type: type.value };
      if(obj.type==='Aufgabe') obj.done=false;
      state.items.push(obj); save(); route(obj.type==='Aufgabe'?'tasks':'list');
    };

    form.append(
      el('label',{},'Titel'), title,
      el('label',{},'Datum/Zeit'), when,
      el('label',{},'Kategorie'), cat,
      el('label',{},'Typ'), type,
      add
    );
    sec.append(form);
  }

  function tasks(){
    v.innerHTML = '<section><h2>Aufgaben</h2><div class="list" id="tasklist"></div></section>';
    const L = byId('tasklist');
    const arr = state.items.filter(x=> x.type==='Aufgabe');
    if(!arr.length){ L.append(el('div',{class:'meta'},'Keine Aufgaben.')); return; }
    arr.forEach(t=>{
      const row = el('div',{class:'card',style:'padding:10px 12px;display:flex;justify-content:space-between;align-items:center'});
      row.append(el('div',{}, t.title || '(ohne Titel)'));
      const cb = el('input',{type:'checkbox'}); cb.checked = !!t.done;
      cb.onchange = ()=>{ t.done = cb.checked; save(); };
      row.append(cb);
      L.append(row);
    });
  }

  function archive(){
    v.innerHTML = '<section><h2>Archiv</h2><div class="meta">Hier könnte dein Archiv erscheinen.</div></section>';
  }

  // ----- Insert the user's (fixed) settings() and listView() implementations -----

  
// TimeMate by J.W. — v1.24 (patch)
// Fixes:
// - Kalender: Zurück-Pfeil funktioniert zuverlässig (keine Rückwärtsbegrenzung)
// - "heute"-Label entfernt, nur visuelle Hervorhebung
// - Einstellungen → Ansicht: Kalender-Reichweite (1 / 3 / 12 Monate)

function settings(){
  v.innerHTML = '';
  const s = el('section');
  s.append(el('h2', {}, 'Einstellungen'));
  const content = el('div', {id:'settings-content'});
  s.append(content);
  v.append(s);

  function showMenu(){
    content.innerHTML = '';
    const btns = el('div', {class:'btnrow', style:'display:flex;gap:12px;flex-wrap:wrap'});
    const mk = (id, label, desc)=>{
      const b = el('button', {class:'primary', type:'button', style:'padding:10px 14px;border-radius:12px'}, label);
      b.title = desc||'';
      b.onclick = ()=> showSection(id);
      return b;
    };
    btns.append(mk('personal','Personalisierung','Name und Dark Mode'));
    btns.append(mk('view','Ansicht','Heute-Karte, Termine-Tab, Farben'));
    btns.append(mk('io','Export/Import','Daten sichern oder laden'));
    btns.append(mk('maint','Wartung','Aufräumen & Archiv'));
    content.append(btns);

    const foot = el('div', {style:'margin-top:24px;padding-top:12px;border-top:1px dashed var(--border,#444);opacity:.8'});
    foot.append(el('div', {class:'meta'}, 'TimeMate by J.W. Version 1.24'));
    content.append(foot);
  }

  function backBtn(){
    const b = el('button', {type:'button'}, '← Zurück');
    b.onclick = showMenu;
    return b;
  }

  // helpers
  const compact = ()=> (window.innerWidth||0) < 420;
  const row = ()=> compact()
    ? el('div', {style:'display:flex;flex-direction:column;gap:4px;margin:8px 0'})
    : el('div', {style:'display:grid;grid-template-columns:260px 1fr;gap:10px;align-items:center;margin:6px 0'});
  const card = (title, sub)=>{
    const c = el('div', {class:'card', style:'padding:14px'});
    c.append(el('h3', {}, title));
    if(sub) c.append(el('div', {class:'meta', style:'margin:-6px 0 10px;opacity:.85'}, sub));
    return c;
  };

  function showSection(id){
    content.innerHTML = '';

    if(id==='view'){
      // Heute-Karte
      const t = card('Ansicht • Heute-Karte', 'Steuert die Karte oben im Tab „Übersicht“.');
      const r1 = row(); r1.append(el('label',{},'Heute-Karte anzeigen'));
      const selShow = el('select', {id:'view_today_show', style:'width:100%'});
      selShow.append(el('option',{value:'on'},'An'));
      selShow.append(el('option',{value:'off'},'Aus'));
      try{ selShow.value = (localStorage.getItem('tmjw_view_today_show') || 'on'); }catch(_){}
      r1.append(selShow); t.append(r1);

      const r2 = row(); r2.append(el('label',{},'Detailgrad'));
      const selMode = el('select', {id:'view_today_mode', style:'width:100%'});
      selMode.append(el('option',{value:'detailed'},'Ausführlich'));
      selMode.append(el('option',{value:'compact'},'Komprimiert'));
      try{ selMode.value = (localStorage.getItem('tmjw_view_today_mode') || 'detailed'); }catch(_){}
      r2.append(selMode); t.append(r2);

      const r3 = row(); r3.append(el('label',{},'Aufgaben des Tages anzeigen'));
      const selTasks = el('select', {id:'view_today_tasks', style:'width:100%'});
      selTasks.append(el('option',{value:'on'},'Ja'));
      selTasks.append(el('option',{value:'off'},'Nein'));
      try{ selTasks.value = (localStorage.getItem('tmjw_view_today_include_tasks') || 'off'); }catch(_){}
      r3.append(selTasks); t.append(r3);

      // Termine-Tab
      const tt = card('Ansicht • Termine-Tab', 'Listen-/Kalenderdarstellung und Hervorhebung.');
      const r4 = row(); r4.append(el('label',{},'„Morgen/Übermorgen“ abtrennen'));
      const selNext2 = el('select', {id:'view_terms_next2', style:'width:100%'});
      selNext2.append(el('option',{value:'on'},'An'));
      selNext2.append(el('option',{value:'off'},'Aus'));
      try{ selNext2.value = (localStorage.getItem('tmjw_view_terms_next2') || 'on'); }catch(_){}
      r4.append(selNext2); tt.append(r4);

      const r5 = row(); r5.append(el('label',{},'„Ansicht wechseln“-Button'));
      const selToggle = el('select', {id:'view_terms_toggle', style:'width:100%'});
      selToggle.append(el('option',{value:'on'},'An'));
      selToggle.append(el('option',{value:'off'},'Aus'));
      try{ selToggle.value = (localStorage.getItem('tmjw_view_terms_toggle') || 'on'); }catch(_){}
      r5.append(selToggle); tt.append(r5);

      const r6 = row(); r6.append(el('label',{},'Kalender: Reichweite'));
      const selRange = el('select', {id:'view_terms_calrange', style:'width:100%'});
      selRange.append(el('option',{value:'1'},'Nur aktueller Monat'));
      selRange.append(el('option',{value:'3'},'Nächste 3 Monate'));
      selRange.append(el('option',{value:'12'},'Nächstes Jahr (12 Monate)'));
      try{ selRange.value = (localStorage.getItem('tmjw_view_terms_calrange') || '1'); }catch(_){}
      r6.append(selRange); tt.append(r6);

      // Farben
      const colors = __loadColors ? __loadColors() : {};
      const fc = card('Kategorien & Farben', 'Farbpunkte in Karten & Kalender.');
      const gridC = el('div', {style:'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px'});
      (CATS_ALL||[]).forEach(c=>{
        const rowC = el('div', {style:'display:flex;align-items:center;gap:10px'});
        rowC.append(el('div', {style:'flex:1'}, c.key));
        const input = el('input', {type:'color', value: (colors[__norm(c.key)] || catColor(c.key) || '#888888')});
        input.oninput = ()=>{ const m = __loadColors(); m[__norm(c.key)] = input.value; __saveColors(m); };
        rowC.append(input);
        gridC.append(rowC);
      });
      fc.append(gridC);

      const saveV = el('button', {class:'primary', type:'button', style:'margin-top:12px'}, 'Ansicht speichern');
      saveV.onclick = ()=>{
        try{
          localStorage.setItem('tmjw_view_today_show', selShow.value);
          localStorage.setItem('tmjw_view_today_mode', selMode.value);
          localStorage.setItem('tmjw_view_today_include_tasks', selTasks.value);
          localStorage.setItem('tmjw_view_terms_next2', selNext2.value);
          localStorage.setItem('tmjw_view_terms_toggle', selToggle.value);
          localStorage.setItem('tmjw_view_terms_calrange', selRange.value);
          alert('Ansicht gespeichert.');
        }catch(_){ alert('Konnte Ansicht nicht speichern.'); }
      };

      content.append(t, tt, fc, saveV, backBtn());
      return;
    }

    if(id==='personal'){
      const box = card('Personalisierung');
      const r1 = row(); r1.append(el('label', {}, 'Dein Name'));
      const nameInp = el('input', {id:'set_name', type:'text', placeholder:'z.B. Joel', style:'width:100%'});
      try { nameInp.value = localStorage.getItem('tmjw_user_name') || ''; } catch(_){}
      r1.append(nameInp); box.append(r1);

      const r2 = row(); r2.append(el('label', {}, 'Dark Mode'));
      const dmSel = el('select', {id:'set_theme', style:'width:100%'});
      dmSel.append(el('option', {value:'light'}, 'Hell'));
      dmSel.append(el('option', {value:'dark'}, 'Dunkel'));
      try{ dmSel.value = localStorage.getItem('tmjw_theme') || 'light'; }catch(_){}
      r2.append(dmSel); box.append(r2);

      const saveBtn = el('button', {class:'primary', type:'button', style:'margin-top:12px'}, 'Speichern');
      saveBtn.onclick = ()=>{
        try{
          localStorage.setItem('tmjw_user_name', (nameInp.value||'').trim());
          const th = dmSel.value==='dark' ? 'dark' : 'light';
          localStorage.setItem('tmjw_theme', th);
          if(th==='dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          alert('Gespeichert.');
        }catch(_){ alert('Konnte nicht speichern.'); }
      };
      content.append(box, saveBtn, backBtn());
      return;
    }

    if(id==='io'){
      const box = card('Export / Import');
      box.append(el('p', {class:'meta'}, 'Sichere oder lade deine Daten.'));
      const expBtn = el('button', {type:'button'}, 'Export als JSON');
      expBtn.onclick = ()=>{
        try{
          const blob = new Blob([JSON.stringify({items:state.items,contacts,catImages,catAddr,catsAll:CATS_ALL}, null, 2)], {type:'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'TimeMate_Export.json';
          a.click();
        }catch(e){ alert('Export fehlgeschlagen.'); }
      };
      box.append(expBtn);

      const impWrap = el('div', {style:'margin-top:10px'});
      const inp = el('input', {type:'file', accept:'application/json'});
      const impBtn = el('button', {type:'button'}, 'Import laden');
      impBtn.onclick = async ()=>{
        if(!inp.files || !inp.files[0]) { alert('Bitte Datei auswählen.'); return; }
        try{
          const txt = await inp.files[0].text();
          const obj = JSON.parse(txt);
          if(obj.items){ state.items = obj.items; save(); }
          if(obj.contacts){ contacts = obj.contacts; saveContacts(); }
          if(obj.catsAll){ CATS_ALL = obj.catsAll; saveCats(); }
          if(obj.catImages){ catImages = obj.catImages; saveCatImages(); }
          if(obj.catAddr){ catAddr = obj.catAddr; saveCatAddr(); }
          alert('Import abgeschlossen.');
        }catch(e){ alert('Import fehlgeschlagen.'); }
      };
      impWrap.append(inp, impBtn);
      box.append(impWrap);
      content.append(box, backBtn());
      return;
    }

    if(id==='maint'){
      const box = card('Wartung');
      const rowB = el('div', {class:'btnrow'});
      const delAll = el('button', {type:'button'}, 'Alle Termine & Aufgaben löschen');
      delAll.onclick = ()=>{
        if(confirm('Wirklich ALLE Termine/Aufgaben löschen?')){
          state.items = []; save(); alert('Alles gelöscht.'); route('overview');
        }
      };
      const openArch = el('button', {type:'button'}, 'Archiv öffnen');
      openArch.onclick = ()=> route('archive');
      rowB.append(delAll, openArch);
      box.append(rowB);
      content.append(box, backBtn());
      return;
    }
  }

  showMenu();
}

// --- Termine-Tab ---
function listView(){
  autoUpdate();

  let next2 = 'on', toggle = 'on';
  try{
    next2  = localStorage.getItem('tmjw_view_terms_next2')  || 'on';
    toggle = localStorage.getItem('tmjw_view_terms_toggle') || 'on';
  }catch(_){}

  let mode = 'list';
  try{ mode = sessionStorage.getItem('tmjw_terms_mode') || 'list'; }catch(_){}

  v.innerHTML = '<section><h2>Termine</h2><div id="toolbar" class="btnrow"></div><div id="content"></div></section>';
  const content = byId('content');
  const toolbar = byId('toolbar');

  if (toggle === 'on'){
    const btn = el('button', {type:'button'}, mode==='list' ? 'Ansicht wechseln: Kalender' : 'Ansicht wechseln: Liste');
    btn.onclick = ()=>{ mode = (mode==='list' ? 'cal' : 'list'); try{ sessionStorage.setItem('tmjw_terms_mode', mode); }catch(_){ } listView(); };
    toolbar.append(btn);
  }

  const all = state.items
    .filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
    .sort((a,b)=> new Date(a.datetime)- new Date(b.datetime));

  function isSameDay(d1,d2){ return d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate(); }

  if (mode === 'cal'){
    const today = new Date();
    let maxRange = 1;
    try{ maxRange = parseInt(localStorage.getItem('tmjw_view_terms_calrange')||'1',10); }catch(_){}

    let vy, vm;
    try{ const s = sessionStorage.getItem('tmjw_cal_cursor'); if(s){ const o=JSON.parse(s); vy=o.y; vm=o.m; } }catch(_){}
    if(vy==null || vm==null){ vy=today.getFullYear(); vm=today.getMonth(); }
    const saveCursor = ()=>{ try{ sessionStorage.setItem('tmjw_cal_cursor', JSON.stringify({y:vy,m:vm})); }catch(_){}};

    const bar = el('div', {class:'btnrow', style:'justify-content:space-between;align-items:center;margin-bottom:8px'});
    const left  = el('button', {type:'button'}, '←');
    const mid   = el('div', {class:'title'}, new Date(vy,vm,1).toLocaleString('de-CH',{month:'long', year:'numeric'}));
    const right = el('button', {type:'button'}, '→');
    bar.append(left, mid, right);
    content.append(bar);

    const monthsDiff = (y,m)=> (y - today.getFullYear())*12 + (m - today.getMonth());
    const withinForwardLimit = (y,m)=> monthsDiff(y,m) >= 0 && monthsDiff(y,m) <= (maxRange-1);
    // Rückwärts: unbegrenzt (historische Monate erlaubt)
    left.onclick = ()=>{
      let ny=vy, nm=vm-1; if(nm<0){ nm=11; ny--; }
      vy=ny; vm=nm; saveCursor(); listView();
    };
    right.onclick = ()=>{
      let ny=vy, nm=vm+1; if(nm>11){ nm=0; ny++; }
      if(withinForwardLimit(ny,nm)){ vy=ny; vm=nm; saveCursor(); listView(); }
    };

    const first = new Date(vy, vm, 1);
    const last  = new Date(vy, vm+1, 0);
    const startDay = (first.getDay()+6)%7;
    const days = last.getDate();

    const map = {};
    all.forEach(a=>{
      const d = new Date(a.datetime);
      if(d.getMonth()!==vm || d.getFullYear()!==vy) return;
      (map[d.getDate()] = map[d.getDate()] || []).push(a);
    });

    const wrap = el('div', {class:'calendar', style:'display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px'});
    ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(w=> wrap.append(el('div',{class:'meta', style:'text-align:center;opacity:.8'}, w)));
    for(let i=0;i<startDay;i++) wrap.append(el('div', {class:'meta'}, ''));
    for(let d=1; d<=days; d++){
      const cell = el('div', {class:'card', style:'padding:8px;min-height:60px'});
      const hd = el('div', {style:'display:flex;justify-content:space-between;align-items:center'});
      const dt = new Date(vy, vm, d);
      const isToday = isSameDay(dt, today);
      hd.append(el('div', {class:'title'}, String(d)));
      cell.append(hd);

      if(isToday){
        cell.style.border='2px solid rgba(80,160,255,.9)';
        cell.style.boxShadow='0 0 0 2px rgba(80,160,255,.15) inset';
        cell.style.background='rgba(80,160,255,.08)';
      }

      const items = map[d] || [];
      if(items.length){
        const dots = el('div', {style:'display:flex;gap:4px;flex-wrap:wrap;margin-top:6px'});
        items.slice(0,6).forEach(a=>{
          const dot = el('span', {style:'display:inline-block;width:10px;height:10px;border-radius:50%'});
          try{ const col=catColor(a.category); if(col) dot.style.background = col; }catch(_){}
          dots.append(dot);
        });
        cell.append(dots);
        cell.onclick = ()=>{
          v.innerHTML = '<section><h2>Termine – '+dt.toLocaleDateString('de-CH')+'</h2><div id="list" class="list"></div><div class="btnrow"><button id="calBack" type="button">Zurück</button></div></section>';
          const list=byId('list');
          items.forEach(a=> list.append(renderItem(a, ()=>listView())));
          byId('calBack').onclick = ()=> listView();
        };
      }
      wrap.append(cell);
    }
    content.append(wrap);
    return;
  }

  // Listenansicht
  const listWrap = el('div', {class:'list'});
  const subhead = (txt)=> el('div', {style:'position:sticky;top:0;z-index:1;margin:8px 0;padding:6px 10px;border-radius:10px;background:rgba(80,160,255,.15);border:1px solid rgba(80,160,255,.35);font-weight:600'}, txt);
  const sep = ()=> el('div', {class:'sep'});

  if (next2 === 'on'){
    const now = new Date();
    const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
    const day2= new Date(now.getFullYear(), now.getMonth(), now.getDate()+2);
    const isTmr = a=> isSameDay(new Date(a.datetime), tmr);
    const isDay2= a=> isSameDay(new Date(a.datetime), day2);
    const arrTmr = all.filter(isTmr);
    const arrD2  = all.filter(isDay2);
    const rest   = all.filter(a=> !isTmr(a) && !isDay2(a));

    if(arrTmr.length){
      listWrap.append(subhead('Morgen'));
      arrTmr.forEach(a=> listWrap.append(renderItem(a, ()=>listView())));
      listWrap.append(sep());
    }
    if(arrD2.length){
      listWrap.append(subhead('Übermorgen'));
      arrD2.forEach(a=> listWrap.append(renderItem(a, ()=>listView())));
      listWrap.append(sep());
    }
    if(rest.length){
      listWrap.append(subhead('Später'));
      rest.forEach(a=> listWrap.append(renderItem(a, ()=>listView())));
    }
  } else {
    all.forEach(a=> listWrap.append(renderItem(a, ()=>listView())));
  }

  content.append(listWrap);
}


  // Register routes
  def('overview', overview);
  def('new', newEntry);
  def('list', listView);
  def('tasks', tasks);
  def('settings', settings);
  def('archive', archive);

  // Boot
  loadAll();
  // theme
  try{ const th = localStorage.getItem('tmjw_theme'); if(th==='dark') document.documentElement.classList.add('dark'); }catch(_){}
  route('overview');
})();