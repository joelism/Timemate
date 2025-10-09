
(function(){
  const v=document.getElementById('view'); const byId=id=>document.getElementById(id);
  const CATS_TERM=[
    {key:"Spitex Heitersberg",css:"Spitex"},
    {key:"Psychologin / Therapie",css:"Psych"},
    {key:"Töpferhaus",css:"Töpferhaus"},
    {key:"Administrativ",css:"Administrativ"},
    {key:"Geschäftlich",css:"Geschäftlich"},
    {key:"Privat",css:"Privat"}
  ];
  const CATS_TASK=[ {key:"HKV Aarau", css:"HKV"} ];
  const HKV_PERSONS=["Berat Aliu","Ellen Ricciardella","Gabriela Hirt","Kristina Brütsch","Rinor Aslani"];

  const theme = localStorage.getItem('tmjw_theme') || 'light';
  if(theme==='dark') document.documentElement.classList.add('dark');

  const state={items:JSON.parse(localStorage.getItem('tmjw_state')||'[]')}; const save=()=>localStorage.setItem('tmjw_state',JSON.stringify(state.items));
  const fmt=iso=>new Date(iso).toLocaleString('de-CH',{dateStyle:'medium',timeStyle:'short'});
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // IndexedDB for attachments
  const DB='tmjw_files',STORE='files'; let dbp;
  function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB,1); r.onupgradeneeded=e=>e.target.result.createObjectStore(STORE); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(e);}); return dbp; }
  async function putFile(id,blob){const d=await db(); return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(blob,id); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);});}
  async function getFile(id){const d=await db(); return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readonly'); const r=tx.objectStore(STORE).get(id); r.onsuccess=()=>res(r.result||null); r.onerror=e=>rej(e);});}

  function autoUpdate(){const now=Date.now(); let ch=false; state.items.forEach(a=>{const due=new Date(a.datetime).getTime(); if(a.status!=='archived'&&now>=due&&a.status!=='done'){a.status='done'; ch=true;} if(a.status!=='archived'&&now-due>259200000){a.status='archived'; ch=true;}}); if(ch) save();}

  function el(t,a={},txt){const n=document.createElement(t); Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v)); if(txt!==undefined)n.textContent=txt; return n;}
  function route(name){document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.route===name)); if(name==='overview')return ov(); if(name==='new')return form(); if(name==='list')return listView(); if(name==='tasks')return tasksView(); if(name==='archive')return arch(); if(name==='settings')return settings();}

  // Overview
  function ov(){autoUpdate(); v.innerHTML='';
    const wrap=el('section'); wrap.append(el('h2',{},'Termine')); const g=el('div',{class:'grid'});
    const up=state.items.filter(x=>x.type!=='Aufgabe' && x.status!=='archived' && new Date(x.datetime)>new Date()).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    CATS_TERM.forEach(c=>{const card=el('div',{class:'card cat-'+c.css}); card.append(el('div',{class:'title'},c.key)); const next=up.find(x=>x.category===c.key);
      if(next){const p=Array.isArray(next.person)?next.person.join(', '):(next.person||'—'); card.append(el('div',{},next.title||'(ohne Titel)')); card.append(el('div',{},`${fmt(next.datetime)} · ${p} · ${next.location||''}`));
        const row=el('div',{class:'btnrow'}); const b1=el('button',{},next.status==='done'?'✓ Erledigt':'☑️ Abhaken'); b1.onclick=()=>{next.status=next.status==='done'?'upcoming':'done'; save(); ov();};
        const b2=el('button',{},'↪ Archivieren'); b2.onclick=()=>{next.status='archived'; save(); ov();}; row.append(b1,b2); card.append(row);
      } else { card.append(el('div',{},'❗️ Kein Termin eingetragen')); } g.append(card);}); wrap.append(g);
    wrap.append(el('div',{class:'sep'}));
    wrap.append(el('h2',{},'Aufgaben'));
    const tasks=state.items.filter(x=>x.type==='Aufgabe' && x.status!=='archived').sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    const list=el('div',{class:'list'});
    if(!tasks.length){list.innerHTML='<p class="meta">Keine Aufgaben.</p>';}
    tasks.forEach(a=>{const it=el('div',{class:'item'}); it.append(el('div',{class:'title'},a.title||'(ohne Titel)')); it.append(el('div',{},`${a.category} • ${fmt(a.datetime)} ${a.status==='done'?'✓':''}`));
      const row=el('div',{class:'btnrow'}); const b1=el('button',{},a.status==='done'?'Als offen markieren':'☑️ Abhaken'); b1.onclick=()=>{a.status=a.status==='done'?'upcoming':'done'; save(); ov();};
      const b2=el('button',{},'↪ Archivieren'); b2.onclick=()=>{a.status='archived'; save(); ov();}; row.append(b1,b2); it.append(row); list.append(it); });
    wrap.append(list); v.append(wrap);
  }

  // New Entry (Termin | Aufgabe)
  function form(){v.innerHTML=''; const s=el('section'); s.append(el('h2',{},'Neuer Eintrag'));
    // type
    const lType=el('label'); lType.append('Art'); const selType=el('select',{id:'type'}); ['Termin','Aufgabe'].forEach(t=>selType.append(el('option',{},t))); lType.append(selType); s.append(lType);
    // title
    const lTitle=el('label'); lTitle.append('Titel'); lTitle.append(el('input',{id:'title',type:'text',required:'true',placeholder:'z.B. Kontrolle / Hausaufgabe'})); s.append(lTitle);
    // category
    const lCat=el('label'); lCat.append('Kategorie'); const selCat=el('select',{id:'category',required:'true'}); lCat.append(selCat); s.append(lCat);
    // dynamic area
    const dyn=el('div',{id:'dyn'}); s.append(dyn);
    // date/time
    const row=el('div',{class:'row'});
    const lD=el('label',{class:'half'}); lD.append('Datum'); lD.append(el('input',{id:'date',type:'date',required:'true'})); row.append(lD);
    const lT=el('label',{class:'half'}); lT.append('Uhrzeit'); const ti=el('input',{id:'time',type:'time',step:'300',required:'true'});
    ti.addEventListener('change',()=>{const [h,m]=ti.value.split(':').map(x=>parseInt(x||'0',10)); const mm=Math.round((m||0)/5)*5; ti.value=String(h).padStart(2,'0')+':'+String(mm%60).padStart(2,'0');});
    lT.append(ti); row.append(lT); s.append(row);
    // notes + files
    const lN=el('label'); lN.append('Notizen'); lN.append(el('textarea',{id:'notes',rows:'4',placeholder:'Kurznotiz…'})); s.append(lN);
    const lF=el('label'); lF.append('Anhänge (Bild/PDF)'); const inp=el('input',{id:'files',type:'file',accept:'image/*,application/pdf',multiple:'true'}); lF.append(inp); s.append(lF);
    const at=el('div',{class:'attach',id:'attachList'}); s.append(at);
    const saveBtn=el('button',{class:'primary'},'Speichern'); s.append(saveBtn); v.append(s);

    // temp files
    let tmp=[]; inp.addEventListener('change',async()=>{at.innerHTML=''; tmp=[]; for(const f of inp.files){const id='f_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); const d=await db(); await new Promise((res,rej)=>{const tx=d.transaction('files','readwrite'); tx.objectStore('files').put(f,id); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);}); tmp.push({id,name:f.name,type:f.type,size:f.size}); const chip=el('span',{class:'chip'},f.name); at.append(chip);} });

    function populateCats(){
      selCat.innerHTML='';
      const list = (selType.value==='Aufgabe') ? CATS_TASK : CATS_TERM;
      list.forEach(c=> selCat.append(el('option',{},c.key)));
      fillDyn(selType.value, selCat.value, dyn);
    }
    selType.addEventListener('change', populateCats);
    selCat.addEventListener('change', ()=> fillDyn(selType.value, selCat.value, dyn));
    populateCats(); // initial

    saveBtn.onclick=()=>{
      const title=byId('title').value.trim(), type=selType.value, cat=selCat.value, date=byId('date').value, time=byId('time').value;
      if(!title||!cat||!date||!time){alert('Bitte Titel, Kategorie, Datum und Uhrzeit angeben.');return;}
      const person=byId('personMulti')?Array.from(byId('personMulti').selectedOptions).map(o=>o.value):(byId('personOther')&&byId('personOther').style.display==='block'?byId('personOther').value:(byId('person')?byId('person').value:''));
      const loc=byId('location')?byId('location').value:''; const dt=new Date(`${date}T${time}:00`);
      state.items.push({id:String(Date.now()),type,title,category:cat,person,location:loc,datetime:dt.toISOString(),notes:byId('notes').value,status:'upcoming',attachments:tmp});
      save(); alert((type==='Aufgabe'?'Aufgabe':'Termin')+' gespeichert.'); route('overview');
    };
  }

  function fillDyn(type, cat, d){
    d.innerHTML='';
    const mk=h=>{const x=document.createElement('div'); x.innerHTML=h; return x.firstElementChild;};
    if(type==='Aufgabe'){
      if(cat==='HKV Aarau'){
        d.append(mk('<label>Person<select id="person">'+ HKV_PERSONS.map(p=>`<option>${p}</option>`).join('') +'</select></label>'));
        d.append(mk('<label>Standort<input id="location" placeholder="z.B. Zimmer / Gebäude"></label>'));
      }
      return;
    }
    // Termine
    if(cat==='Spitex Heitersberg'){
      d.append(mk('<label>Termin mit<select id="person"><option>F. Völki</option><option>A. Rudgers</option><option>Andere</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>5200 Brugg</option><option>5442 Fislisbach</option><option>5507 Mellingen</option></select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      d.querySelector('#person').addEventListener('change',()=> d.querySelector('#personOther').style.display = d.querySelector('#person').value==='Andere'?'block':'none');
    } else if(cat==='Töpferhaus'){
      d.append(mk('<label>Termin mit<select id="person"><option>Caroline Hanst</option><option>Jeanine Haygis</option><option>Sandra Schriber</option><option>Andere</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau - Bleichmattstr.</option><option>5000 Aarau - Bachstr. 95</option></select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      d.querySelector('#person').addEventListener('change',()=> d.querySelector('#personOther').style.display = d.querySelector('#person').value==='Andere'?'block':'none');
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

  // Termine-Liste
  function listView(){autoUpdate(); v.innerHTML='<section><h2>Alle Termine</h2><div id="list" class="list"></div></section>'; const list=byId('list');
    const all=state.items.filter(a=>a.type!=='Aufgabe').slice().sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    if(!all.length){list.innerHTML='<p class="meta">Keine Termine.</p>'; return;}
    all.forEach(a=> list.append(renderItem(a, ()=>listView())));
  }

  // Aufgaben-Tab
  function tasksView(){autoUpdate(); v.innerHTML='<section><h2>Aufgaben</h2><div id="tasks" class="list"></div></section>'; const list=byId('tasks');
    const all=state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived').slice().sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    if(!all.length){list.innerHTML='<p class="meta">Keine Aufgaben.</p>'; return;}
    all.forEach(a=> list.append(renderItem(a, ()=>tasksView())));
  }

  function renderItem(a, refresh){
    const it=el('div',{class:'item'});
    const p=Array.isArray(a.person)?a.person.join(', '):(a.person||'—');
    it.append(el('div',{class:'title'}, a.title||'(ohne Titel)'));
    it.append(el('div',{}, `${a.type||'Termin'} • ${a.category} • ${fmt(a.datetime)} ${a.status==='done'?'✓':''} ${a.status==='archived'?'(Archiv)':''}`));
    if(a.type!=='Aufgabe'){ it.append(el('div',{}, `Person(en): ${p}`)); it.append(el('div',{}, `Standort: ${a.location||'—'}`)); }
    it.append(el('div',{}, `Notizen: ${esc(a.notes||'—')}`));
    const row=el('div',{class:'btnrow'});
    const b1=el('button',{}, a.status==='done'?'Als offen markieren':'☑️ Abhaken');
    b1.onclick=()=>{a.status=a.status==='done'?'upcoming':'done'; save(); refresh();};
    const b2=el('button',{}, '↪ Archivieren');
    b2.onclick=()=>{a.status='archived'; save(); refresh();};
    row.append(b1,b2); it.append(row);
    return it;
  }

  // Archiv
  function arch(){autoUpdate(); v.innerHTML='<section><h2>Archiv</h2><div id="arch" class="list"></div></section>'; const arch=byId('arch');
    const arr=state.items.filter(a=>a.status==='archived').sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
    if(!arr.length){arch.innerHTML='<p class="meta">Archiv ist leer.</p>'; return;}
    arr.forEach(a=>{const it=renderItem(a, ()=>arch()); const row=it.querySelector('.btnrow'); const back=el('button',{},'↩︎ Zurückholen'); back.onclick=()=>{a.status='upcoming'; save(); arch();}; row.append(back); arch.append(it);});
  }

  // Export & Settings inkl. Dark Mode
  function exportCSV(){
    const rows=[["Typ","Titel","Kategorie","Datum","Uhrzeit","Person(en)","Standort","Notizen","Status","Anhänge"]];
    const all=state.items.slice().sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    all.forEach(a=>{const d=new Date(a.datetime); const date=d.toLocaleDateString('de-CH'); const time=d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
      const per=Array.isArray(a.person)?a.person.join('; '):(a.person||''); const files=(a.attachments||[]).map(x=>x.name).join('; ');
      rows.push([a.type||'Termin',a.title||'',a.category,date,time,per,a.location||'',String(a.notes||'').replace(/\n/g,' '),a.status,files]);});
    const csv=rows.map(r=>r.map(x=>`\"${String(x).replace(/\"/g,'\"\"')}\"`).join(';')).join('\\r\\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='TimeMateJW_Export.csv'; a.click(); URL.revokeObjectURL(url);
  }
  function settings(){v.innerHTML=`<section><h2>Einstellungen</h2><div class="btnrow"><button id="theme-toggle"></button><button id="exp-csv">Als Excel/CSV exportieren</button><button id="wipe" class="danger">Alle Termine löschen</button></div></section>`;
    const isDark=document.documentElement.classList.contains('dark'); const tt=byId('theme-toggle'); tt.textContent=isDark?'🌙 Dark‑Mode ist an — ausschalten':'🌞 Dark‑Mode ist aus — einschalten';
    tt.onclick=()=>{const dark=document.documentElement.classList.toggle('dark'); localStorage.setItem('tmjw_theme',dark?'dark':'light'); settings(); };
    byId('exp-csv').onclick=exportCSV;
    byId('wipe').onclick=async()=>{ if(confirm('Wirklich alles löschen?')){ const d=await db(); await new Promise((res,rej)=>{const tx=d.transaction('files','readwrite'); tx.objectStore('files').clear(); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);}); state.items=[]; save(); alert('Gelöscht.'); route('overview'); } };
  }

  document.querySelectorAll('.tabs .tab').forEach(b=>b.addEventListener('click',()=>route(b.dataset.route)));
  route('new'); // Start direkt im Formular, damit du die Felder sofort siehst
})();
