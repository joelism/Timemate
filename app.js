
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
