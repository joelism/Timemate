(function () {
  const v = document.getElementById('view');
  const byId = id => document.getElementById(id);

  // ---------- Kategorien ----------
  const CAT_GMA = 'Genossenschaft Migros Aare';
  const CATS_TERM = [
    { key: 'Spitex Heitersberg', css: 'Spitex' },
    { key: 'Psychologin / Therapie', css: 'Psych' },
    { key: 'Töpferhaus', css: 'Töpferhaus' },
    { key: CAT_GMA, css: 'Geschäftlich' }, // umbenannt
    { key: 'Administrativ', css: 'Administrativ' },
    { key: 'Privat', css: 'Privat' },
  ];
  const CATS_TASK = [
    { key: 'HKV Aarau', css: 'HKV' },
    { key: 'Persönlich', css: 'HKV' },
  ];
  const ALL_CATS = [...CATS_TERM.map(c=>c.key), ...CATS_TASK.map(c=>c.key)];

  // ---------- Migrations (einmalig) ----------
  (function migrateOnce(){
    const key='tmjw_mig_gma_v1';
    if(localStorage.getItem(key)) return;
    // Kontakte „Geschäftlich“ -> GMA
    let contacts = JSON.parse(localStorage.getItem('tmjw_contacts')||'[]');
    contacts = contacts.map(c => c.kategorie==='Geschäftlich' ? {...c, kategorie: CAT_GMA} : c);
    localStorage.setItem('tmjw_contacts', JSON.stringify(contacts));
    // Termine „Geschäftlich“ -> GMA
    let items = JSON.parse(localStorage.getItem('tmjw_state')||'[]');
    items = items.map(i => i.category==='Geschäftlich' ? {...i, category: CAT_GMA} : i);
    localStorage.setItem('tmjw_state', JSON.stringify(items));
    localStorage.setItem(key,'1');
  })();

  // ---------- Kontakte ----------
  let contacts = JSON.parse(localStorage.getItem('tmjw_contacts') || '[]');
  function saveContacts(){ localStorage.setItem('tmjw_contacts', JSON.stringify(contacts)); }
  // Logs pro Kontakt
  let contactLogs = JSON.parse(localStorage.getItem('tmjw_contact_logs') || '{}');
  function saveContactLogs(){ localStorage.setItem('tmjw_contact_logs', JSON.stringify(contactLogs)); }
  const fullName = c => `${c.vorname||''} ${c.name||''}`.trim();

  // Kategorie-Bilder
  let catImages = JSON.parse(localStorage.getItem('tmjw_cat_images') || '{}');
  function saveCatImages(){ localStorage.setItem('tmjw_cat_images', JSON.stringify(catImages)); }

  // ---------- Theme ----------
  const theme = localStorage.getItem('tmjw_theme') || 'light';
  if (theme === 'dark') document.documentElement.classList.add('dark');

  // ---------- Storage ----------
  const state = { items: JSON.parse(localStorage.getItem('tmjw_state') || '[]') };
  const save  = () => localStorage.setItem('tmjw_state', JSON.stringify(state.items));
  const fmt = iso => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
  const esc = s => String(s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // ---------- Auto-Status / -Archiv ----------
  function autoUpdate(){
    const now=Date.now(); let ch=false;
    state.items.forEach(a=>{
      const due=new Date(a.datetime).getTime();
      if(a.status!=='archived' && now>=due && a.status!=='done'){ a.status='done'; ch=true; }
      if(a.status!=='archived' && now-due>3*24*60*60*1000){ a.status='archived'; ch=true; }
    });
    if(ch) save();
  }

  // ---------- Helpers ----------
  function el(tag, attrs={}, text){
    const n=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
    if(text!==undefined) n.textContent=text;
    return n;
  }
  function route(name,arg){
    document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.toggle('active', b.dataset.route===name));
    if(name==='overview') return ov();
    if(name==='new')      return form(arg);
    if(name==='list')     return listView();
    if(name==='tasks')    return tasksView();
    if(name==='archive')  return arch();
    if(name==='settings') return settings();
    if(name==='contacts') return contactsView();
  }
  function dataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }

  // Tabs: „Kontakte“ dynamisch hinzufügen, „Archiv“-Tab ausblenden
  (function adjustTabs(){
    const nav=document.querySelector('.tabs');
    if(nav){
      // Kontakte
      if(!nav.querySelector('[data-route="contacts"]')){
        const btn=el('button',{class:'tab','data-route':'contacts'},'Kontakte');
        btn.addEventListener('click',()=>route('contacts'));
        nav.appendChild(btn);
      }
      // Archiv (falls vorhanden) entfernen/verstecken
      const archBtn=[...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='archive');
      if(archBtn) archBtn.remove();
    }
  })();

  // ---------- Übersicht ----------
  function ov(){
    autoUpdate(); v.innerHTML='';
    const wrap=el('section');

    // Termine
    wrap.append(el('h2',{},'Termine'));
    const grid=el('div',{class:'grid'});
    const upcoming=state.items
      .filter(x=>x.type!=='Aufgabe' && x.status!=='archived' && new Date(x.datetime)>new Date())
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    CATS_TERM.forEach(c=>{
      const card=el('div',{class:'card cat-'+c.css});
      // Bild/Heading
      const head=el('div',{style:'display:flex;align-items:center;gap:10px'});
      if(catImages[c.key]){ const im=el('img',{src:catImages[c.key],style:'width:28px;height:28px;border-radius:6px;object-fit:cover'}); head.append(im); }
      head.append(el('div',{class:'title'},c.key));
      card.append(head);

      const next=upcoming.find(x=>x.category===c.key);
      if(next){
        const p=Array.isArray(next.person)?next.person.join(', '):(next.person||'—');
        card.append(el('div',{},next.title||'(ohne Titel)'));
        card.append(el('div',{},`${fmt(next.datetime)} · ${p} · ${next.location||''}`));
        const row=el('div',{class:'btnrow'});
        const b1=el('button',{}, next.status==='done'?'✓ Erledigt':'☑️ Abhaken');
        b1.onclick=()=>{ next.status=next.status==='done'?'upcoming':'done'; save(); ov(); };
        const b2=el('button',{},'↪ Archivieren'); b2.onclick=()=>{ next.status='archived'; save(); ov(); };
        const b3=el('button',{},'✏️ Bearbeiten'); b3.onclick=()=>route('new', next.id);
        row.append(b1,b2,b3); card.append(row);
      }else{
        card.append(el('div',{},'❗️ Kein Termin eingetragen'));
      }
      grid.append(card);
    });
    wrap.append(grid);

    // Aufgaben
    wrap.append(el('div',{class:'sep'}));
    wrap.append(el('h2',{},'Aufgaben'));
    const tasks=state.items
      .filter(x=>x.type==='Aufgabe' && x.status!=='archived')
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    const list=el('div',{class:'list'});
    if(!tasks.length) list.innerHTML='<p class="meta">Keine Aufgaben.</p>';
    tasks.forEach(a=>{
      const it=el('div',{class:'item'});
      it.append(el('div',{class:'title'},a.title||'(ohne Titel)'));
      it.append(el('div',{},`${a.category} • ${fmt(a.datetime)} ${a.status==='done'?'✓':''}`));
      const row=el('div',{class:'btnrow'});
      const b1=el('button',{}, a.status==='done'?'Als offen markieren':'☑️ Abhaken');
      b1.onclick=()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); ov(); };
      const b2=el('button',{},'↪ Archivieren'); b2.onclick=()=>{ a.status='archived'; save(); ov(); };
      const b3=el('button',{},'✏️ Bearbeiten'); b3.onclick=()=>route('new', a.id);
      row.append(b1,b2,b3); it.append(row); list.append(it);
    });
    wrap.append(list);

    v.append(wrap);
  }

  // ---------- Liste (nur Termine; archivierte ausblenden) ----------
  function listView(){
    autoUpdate();
    v.innerHTML='<section><h2>Alle Termine</h2><div id="list" class="list"></div></section>';
    const list=byId('list');
    const all=state.items
      .filter(a=>a.type!=='Aufgabe' && a.status!=='archived')
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    if(!all.length){ list.innerHTML='<p class="meta">Keine Termine.</p>'; return; }
    all.forEach(a=>list.append(renderItem(a, ()=>listView())));
  }

  // ---------- Aufgaben (archivierte ausblenden) ----------
  function tasksView(){
    autoUpdate();
    v.innerHTML='<section><h2>Aufgaben</h2><div id="tasks" class="list"></div></section>';
    const list=byId('tasks');
    const all=state.items
      .filter(a=>a.type==='Aufgabe' && a.status!=='archived')
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    if(!all.length){ list.innerHTML='<p class="meta">Keine Aufgaben.</p>'; return; }
    all.forEach(a=>list.append(renderItem(a, ()=>tasksView())));
  }

  // ---------- Archiv (über Einstellungen erreichbar) ----------
  function arch(){
    autoUpdate();
    v.innerHTML='<section><h2>Archiv</h2><div id="arch" class="list"></div></section>';
    const cont=byId('arch');
    const arr=state.items.filter(a=>a.status==='archived').sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
    if(!arr.length){ cont.innerHTML='<p class="meta">Archiv ist leer.</p>'; return; }
    arr.forEach(a=>{
      const it=renderItem(a, ()=>arch());
      const row=it.querySelector('.btnrow');
      const back=el('button',{},'↩︎ Zurückholen');
      back.onclick=()=>{ a.status='upcoming'; save(); arch(); };
      row.append(back);
      cont.append(it);
    });
  }

  // ---------- Neuer Eintrag / Bearbeiten ----------
  function form(editId){
    const editing = editId ? state.items.find(x=>x.id===editId) : null;
    v.innerHTML=''; const s=el('section');
    s.append(el('h2',{}, editing?'Eintrag bearbeiten':'Neuer Eintrag'));

    // Art
    const lType=el('label'); lType.append('Art');
    const selType=el('select',{id:'type'}); ['Termin','Aufgabe'].forEach(t=>selType.append(el('option',{},t)));
    lType.append(selType); s.append(lType);

    // Titel
    const lTitle=el('label'); lTitle.append('Titel');
    lTitle.append(el('input',{id:'title',type:'text',required:'true',placeholder:'z.B. Kontrolle / Hausaufgabe'}));
    s.append(lTitle);

    // Kategorie
    const lCat=el('label'); lCat.append('Kategorie');
    const selCat=el('select',{id:'category',required:'true'}); lCat.append(selCat); s.append(lCat);

    // Dyn Bereich
    const dyn=el('div',{id:'dyn'}); s.append(dyn);

    // Datum/Uhrzeit
    const row=el('div',{class:'row'});
    const lD=el('label',{class:'half'}); lD.append('Datum'); lD.append(el('input',{id:'date',type:'date',required:'true'})); row.append(lD);
    const lT=el('label',{class:'half'}); lT.append('Uhrzeit');
    const ti=el('input',{id:'time',type:'time',step:'300',required:'true'});
    ti.addEventListener('change',()=>{const [h,m]=ti.value.split(':').map(x=>parseInt(x||'0',10)); const mm=Math.round((m||0)/5)*5; ti.value=String(h).padStart(2,'0')+':'+String(mm%60).padStart(2,'0');});
    lT.append(ti); row.append(lT); s.append(row);

    // Notizen + Anhänge
    const lN=el('label'); lN.append('Notizen'); lN.append(el('textarea',{id:'notes',rows:'4',placeholder:'Kurznotiz…'})); s.append(lN);
    const lF=el('label'); lF.append('Anhänge (Bild/PDF)');
    const inp=el('input',{id:'files',type:'file',accept:'image/*,application/pdf',multiple:'true'}); lF.append(inp); s.append(lF);
    const at=el('div',{class:'attach',id:'attachList'}); s.append(at);

    // Buttons
    const saveBtn=el('button',{class:'primary'}, editing?'Änderungen speichern':'Speichern'); s.append(saveBtn);
    const cancelBtn=el('button',{},'Abbrechen'); cancelBtn.onclick=()=>route('overview'); s.append(cancelBtn);
    v.append(s);

    // Kontakte-Datalist
    buildContactsDatalist();

    let tmp=[];
    inp.addEventListener('change',async()=>{
      at.innerHTML=''; tmp=[];
      for(const f of inp.files){
        const id='f_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
        const d=await db(); await new Promise((res,rej)=>{const tx=d.transaction('files','readwrite'); tx.objectStore('files').put(f,id); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);});
        tmp.push({id,name:f.name,type:f.type,size:f.size});
        at.append(el('span',{class:'chip'},f.name));
      }
    });

    function populateCats(){
      selCat.innerHTML='';
      const list=(selType.value==='Aufgabe')?CATS_TASK:CATS_TERM;
      list.forEach(c=>selCat.append(el('option',{},c.key)));
      fillDyn(selType.value, selCat.value, dyn);
    }
    selType.addEventListener('change',populateCats);
    selCat.addEventListener('change',()=>fillDyn(selType.value, selCat.value, dyn));
    populateCats();

    // Prefill bei Bearbeiten
    if(editing){
      selType.value = editing.type || 'Termin';
      populateCats();
      byId('title').value = editing.title || '';
      selCat.value = editing.category || (selType.value==='Aufgabe'?'Persönlich':CATS_TERM[0].key);
      fillDyn(selType.value, selCat.value, dyn);
      const d=new Date(editing.datetime);
      byId('date').value = d.toISOString().slice(0,10);
      byId('time').value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      byId('notes').value= editing.notes || '';
      if(byId('personMulti') && Array.isArray(editing.person)){
        Array.from(byId('personMulti').options).forEach(o=>o.selected = editing.person.includes(o.value));
      }else if(byId('person')){
        byId('person').value = Array.isArray(editing.person)?(editing.person.join(', ')):(editing.person||'');
      }
      if(byId('location')) byId('location').value = editing.location || '';
    }

    saveBtn.onclick=()=>{
      const title=byId('title').value.trim();
      const type =selType.value;
      const cat  =selCat.value;
      const date =byId('date').value;
      const time =byId('time').value;
      if(!title||!cat||!date||!time){ alert('Bitte Titel, Kategorie, Datum und Uhrzeit angeben.'); return; }

      let person = byId('personMulti')
        ? Array.from(byId('personMulti').selectedOptions).map(o=>o.value)
        : (byId('personOther') && byId('personOther').style.display==='block') ? byId('personOther').value
        : (byId('person') ? byId('person').value : '');
      if(type==='Aufgabe' && cat==='Persönlich') person='Ich';

      const loc = byId('location') ? byId('location').value : '';
      const dt  = new Date(`${date}T${time}:00`).toISOString();
      const base = { type, title, category:cat, person, location:loc, datetime:dt, notes: byId('notes').value, attachments: tmp };

      if(editing){ Object.assign(editing, base); }
      else { state.items.push({ id:String(Date.now()), status:'upcoming', ...base }); }
      save(); alert('Gespeichert.'); route('overview');
    };
  }

  // ---------- Dynamische Felder ----------
  function fillDyn(type, cat, d){
    d.innerHTML='';
    const mk=h=>{const x=document.createElement('div'); x.innerHTML=h; return x.firstElementChild;};

    // Aufgaben
    if(type==='Aufgabe'){
      if(cat==='HKV Aarau'){
        const HKV_PERSONS=['Berat Aliu','Ellen Ricciardella','Gabriela Hirt','Kristina Brütsch','Rinor Aslani','Persönlich','Andere'];
        d.append(mk('<label>Person<select id="person">'+HKV_PERSONS.map(p=>`<option>${p}</option>`).join('')+'</select></label>'));
        d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
        d.append(mk('<label>Standort<input id="location" placeholder="z. B. Zimmer / Gebäude"></label>'));
        const sel=d.querySelector('#person'); const other=d.querySelector('#personOther');
        sel.addEventListener('change',()=>{ const v=sel.value; other.style.display=(v==='Andere')?'block':'none'; if(v==='Persönlich') other.style.display='none'; });
        return;
      }
      if(cat==='Persönlich'){
        d.append(mk('<label>Standort<input id="location" placeholder="z. B. Zuhause / Arbeitsplatz"></label>'));
        return;
      }
    }

    // Termine
    if(cat==='Spitex Heitersberg'){
      d.append(mk('<label>Termin mit<select id="person"><option>F. Völki</option><option>A. Rudgers</option><option>Andere</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>5200 Brugg</option><option>5442 Fislisbach</option><option>5507 Mellingen</option></select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      d.querySelector('#person').addEventListener('change',()=> d.querySelector('#personOther').style.display = d.querySelector('#person').value==='Andere'?'block':'none');
    } else if(cat==='Töpferhaus'){
      // Domenique Hürzeler statt Caroline Hanst
      d.append(mk('<label>Termin mit<select id="person"><option>Domenique Hürzeler</option><option>Jeanine Haygis</option><option>Sandra Schriber</option><option>Andere</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau - Bleichmattstr.</option><option>5000 Aarau - Bachstr. 95</option></select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      d.querySelector('#person').addEventListener('change',()=> d.querySelector('#personOther').style.display = d.querySelector('#person').value==='Andere'?'block':'none');
    } else if(cat===CAT_GMA){
      d.append(mk('<label>Termin mit (Mehrfachauswahl)<select id="personMulti" multiple size="6"><option>Beatriz Häsler</option><option>Helena Huser</option><option>Jasmin Widmer</option><option>Linda Flückiger</option><option>Mathias Tomaske</option><option>Svenja Studer</option></select></label>'));
      d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>3322 Schönbühl</option></select></label>'));
    } else if(cat==='Administrativ'){
      d.append(mk('<label>Person<input id="person" placeholder="Name" list="contactsAll"></label>'));
      d.append(mk('<label>Standort<input id="location" list="locs"></label>'));
    } else if(cat==='Privat'){
      d.append(mk('<label>Person<input id="person" list="contactsAll" placeholder="Name"></label>'));
      d.append(mk('<label>Standort<input id="location" list="locs"></label>'));
    } else if(cat==='Psychologin / Therapie'){
      d.append(mk('<label>Termin mit<input id="person" list="contactsAll" placeholder="Name"></label>'));
      d.append(mk('<label>Standort<input id="location" placeholder="Ort / Adresse"></label>'));
    }
  }

  // Datalist mit allen Kontakten
  function buildContactsDatalist(){
    let dl=document.getElementById('contactsAll');
    if(!dl){ dl=el('datalist',{id:'contactsAll'}); document.body.appendChild(dl); }
    dl.innerHTML='';
    contacts.forEach(c=> dl.append(el('option',{}, fullName(c))));
  }

  // ---------- Kontakte: Kategorien-Übersicht ----------
  function contactsView(){
    v.innerHTML = `<section>
      <h2>Kontakte</h2>
      <div id="catList" class="list"></div>
      <div class="btnrow" style="margin-top:12px">
        <button id="cNew" class="primary">+ Neuer Kontakt</button>
        <button id="catImg" >Kategorie-Bild setzen</button>
      </div>
    </section>`;

    const catList=byId('catList');
    const counts = ALL_CATS.map(k => ({
      k,
      n: contacts.filter(c => c.kategorie === k).length
    }));

    counts.forEach(({k,n})=>{
      const it=el('div',{class:'item'});
      const head=el('div',{style:'display:flex;align-items:center;gap:10px'});
      if(catImages[k]){ head.append(el('img',{src:catImages[k],style:'width:28px;height:28px;border-radius:6px;object-fit:cover'})); }
      head.append(el('div',{class:'title'}, k));
      it.append(head);
      it.append(el('div',{}, `${n} Kontakte (individuell)`));
      const row=el('div',{class:'btnrow'});
      const open=el('button',{},'Öffnen'); open.onclick=()=>contactsByCategory(k);
      row.append(open); it.append(row);
      catList.append(it);
    });

    byId('cNew').onclick=()=>editContact(null);
    byId('catImg').onclick=async()=>{
      const cat = prompt('Für welche Kategorie ein Bild setzen?\n' + ALL_CATS.join('\n'));
      if(!cat || !ALL_CATS.includes(cat)) return;
      const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange=async()=>{ if(inp.files && inp.files[0]){ catImages[cat]=await dataURL(inp.files[0]); saveCatImages(); contactsView(); } };
      inp.click();
    };
  }

  function contactsByCategory(cat){
    v.innerHTML = `<section>
      <h2>${cat}</h2>
      <div id="cList"></div>
      <div class="btnrow" style="margin-top:12px">
        <button id="cNew" class="primary">+ Neuer Kontakt</button>
        <button id="back">← Kategorien</button>
      </div>
    </section>`;
    const cList=byId('cList');
    const arr=contacts.filter(c=>c.kategorie===cat);
    if(!arr.length){ cList.innerHTML='<p class="meta">Keine Kontakte.</p>'; }
    arr.forEach(c=>{
      const it=el('div',{class:'item'});
      const head=el('div',{style:'display:flex;align-items:center;gap:10px'});
      if(c.img){ head.append(el('img',{src:c.img,style:'width:32px;height:32px;border-radius:50%;object-fit:cover'})); }
      head.append(el('div',{class:'title'}, `${fullName(c)}${c.kategorie?` (${c.kategorie})`:''}`));
      it.append(head);
      if(c.funktion) it.append(el('div',{}, `Funktion: ${c.funktion}`));
      if(c.telefon)  it.append(el('div',{}, `Telefon: ${c.telefon}`));
      if(c.notizen)  it.append(el('div',{}, `Notizen: ${c.notizen}`));
      const row=el('div',{class:'btnrow'});
      const b1=el('button',{},'✏️ Bearbeiten'); b1.onclick=()=>editContact(c.id);
      const b2=el('button',{},'🗑️ Löschen'); b2.onclick=()=>{ if(confirm('Kontakt löschen?')){ contacts=contacts.filter(x=>x.id!==c.id); saveContacts(); contactsByCategory(cat); } };
      const b3=el('button',{},'🕘 Verlauf'); b3.onclick=()=>showContactHistory(c.id, cat);
      const b4=el('button',{},'Bild ändern'); b4.onclick=()=>changeContactImage(c.id, cat);
      row.append(b1,b2,b3,b4); it.append(row);
      cList.append(it);
    });
    byId('cNew').onclick=()=>editContact(null, cat);
    byId('back').onclick=()=>contactsView();
  }

  async function changeContactImage(id, cat){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange=async()=>{ if(inp.files&&inp.files[0]){ const c=contacts.find(x=>x.id===id); c.img=await dataURL(inp.files[0]); saveContacts(); contactsByCategory(cat||c.kategorie); } };
    inp.click();
  }

  function editContact(id, presetCat){
    const c = id ? contacts.find(x=>x.id===id) : {vorname:'',name:'',kategorie:presetCat||'',funktion:'',notizen:'',telefon:'',img:''};
    v.innerHTML='<section><h2>Kontakt</h2></section>';
    const s=v.querySelector('section');
    const fields=['vorname','name','kategorie','funktion','telefon','notizen'];
    const labels={vorname:'Vorname',name:'Name',kategorie:'Kategorie',funktion:'Funktion',telefon:'Telefonnummer',notizen:'Notizen'};
    const f={};
    fields.forEach(k=>{
      const wrap=el('label'); wrap.append(labels[k]);
      if(k==='kategorie'){
        const sel=el('select',{id:k});
        ALL_CATS.forEach(cat=> sel.append(el('option',{},cat)));
        f[k]=sel;
      }else{
        f[k]=el(k==='notizen'?'textarea':'input',{id:k});
        if(k==='notizen') f[k].rows=3;
      }
      f[k].value = c[k]||'';
      wrap.append(f[k]); s.append(wrap);
    });
    // Bild
    const imgRow=el('div',{class:'btnrow'});
    const imgSet=el('button',{}, c.img ? 'Kontaktbild ersetzen' : 'Kontaktbild hinzufügen');
    const imgDel=el('button',{}, 'Bild entfernen');
    imgRow.append(imgSet,imgDel); s.append(imgRow);
    imgSet.onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=async()=>{ if(inp.files&&inp.files[0]){ c.img=await dataURL(inp.files[0]); showPreview(); } }; inp.click(); };
    imgDel.onclick=()=>{ c.img=''; showPreview(); };
    function showPreview(){ if(pre) pre.remove(); if(c.img){ pre=el('img',{src:c.img,style:'width:80px;height:80px;border-radius:50%;object-fit:cover;margin:8px 0'}); s.insertBefore(pre, imgRow); } }
    let pre=null; showPreview();

    const row=el('div',{class:'btnrow'});
    const saveBtn=el('button',{class:'primary'},'Speichern');
    const cancel=el('button',{},'Abbrechen');
    row.append(saveBtn,cancel); s.append(row);
    saveBtn.onclick=()=>{
      const obj={ id: id || String(Date.now()),
        vorname:f.vorname.value.trim(), name:f.name.value.trim(),
        kategorie:f.kategorie.value.trim(), funktion:f.funktion.value.trim(),
        telefon:f.telefon.value.trim(), notizen:f.notizen.value.trim(), img:c.img||''
      };
      if(!obj.name && !obj.vorname){ alert('Bitte mindestens Vorname oder Name angeben.'); return; }
      if(id){ contacts=contacts.map(x=>x.id===id?obj:x); } else { contacts.push(obj); }
      saveContacts(); contactsByCategory(obj.kategorie);
    };
    cancel.onclick=()=>contactsView();
  }

  function showContactHistory(id, backCat){
    const c=contacts.find(x=>x.id===id);
    v.innerHTML=`<section><h2>Verlauf: ${fullName(c)}</h2></section>`;
    const s=v.querySelector('section');

    // Vergangene Termine (inkl. archivierte)
    const isMatch = (item)=>{
      const fullname=fullName(c); const target=item.person;
      if(Array.isArray(target)) return target.some(p=>String(p).includes(c.name)||String(p).includes(fullname));
      return String(target||'').includes(c.name)||String(target||'').includes(fullname);
    };
    const past=state.items
      .filter(x=> new Date(x.datetime) < new Date())
      .filter(isMatch)
      .sort((a,b)=> new Date(b.datetime)-new Date(a.datetime));
    if(!past.length){ s.append(el('p',{},'Keine vergangenen Termine gefunden.')); }
    else{
      const list=el('div',{class:'list'});
      past.forEach(p=>{
        const it=el('div',{class:'item'});
        it.append(el('div',{class:'title'}, `${fmt(p.datetime)} – ${p.title||'(ohne Titel)'}`));
        it.append(el('div',{}, `${p.type||'Termin'} • ${p.category}`));
        if(p.notes) it.append(el('div',{}, `Notiz: ${p.notes}`));
        list.append(it);
      });
      s.append(list);
    }

    // Kurzberichte
    const key = id;
    const logs = contactLogs[key] || [];
    s.append(el('h3',{},'Kurzberichte'));
    const logList=el('div',{class:'list'});
    if(!logs.length) logList.innerHTML='<p class="meta">Keine Kurzberichte.</p>';
    logs.forEach(entry=>{
      const it=el('div',{class:'item'});
      it.append(el('div',{class:'title'}, `${fmt(entry.ts)} – Notiz`));
      it.append(el('div',{}, entry.text));
      const row=el('div',{class:'btnrow'});
      const del=el('button',{},'🗑️ Löschen');
      del.onclick=()=>{ contactLogs[key]= (contactLogs[key]||[]).filter(x=>x.id!==entry.id); saveContactLogs(); showContactHistory(id, backCat); };
      row.append(del); it.append(row);
      logList.append(it);
    });
    s.append(logList);

    const ta=el('textarea',{rows:3,placeholder:'Kurzbericht…'});
    const addBtn=el('button',{class:'primary'},'Kurzbericht speichern');
    addBtn.onclick=()=>{
      const text=ta.value.trim(); if(!text) return;
      const entry={id:String(Date.now()), ts:new Date().toISOString(), text};
      contactLogs[key]=[...(contactLogs[key]||[]), entry];
      saveContactLogs(); showContactHistory(id, backCat);
    };
    s.append(ta); s.append(addBtn);

    const back=el('button',{},'← Zurück'); back.onclick=()=> backCat ? contactsByCategory(backCat) : contactsView(); s.append(back);
  }

  // ---------- Render Item ----------
  function renderItem(a, refresh){
    const it=el('div',{class:'item'});
    const p=Array.isArray(a.person)?a.person.join(', '):(a.person||'—');
    it.append(el('div',{class:'title'}, a.title||'(ohne Titel)'));
    it.append(el('div',{}, `${a.type||'Termin'} • ${a.category} • ${fmt(a.datetime)} ${a.status==='done'?'✓':''} ${a.status==='archived'?'(Archiv)':''}`));
    if(a.type!=='Aufgabe'){
      it.append(el('div',{}, `Person(en): ${p}`));
      it.append(el('div',{}, `Standort: ${a.location||'—'}`));
    }
    it.append(el('div',{}, `Notizen: ${esc(a.notes||'—')}`));
    const row=el('div',{class:'btnrow'});
    const b1=el('button',{}, a.status==='done'?'Als offen markieren':'☑️ Abhaken');
    b1.onclick=()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); refresh(); };
    const b2=el('button',{},'↪ Archivieren'); b2.onclick=()=>{ a.status='archived'; save(); refresh(); };
    const b3=el('button',{},'✏️ Bearbeiten'); b3.onclick=()=>route('new', a.id);
    row.append(b1,b2,b3); it.append(row);
    return it;
  }

  // ---------- Export / Import / Settings ----------
  function exportCSV(){
    const rows=[['Typ','Titel','Kategorie','Datum','Uhrzeit','Person(en)','Standort','Notizen','Status','Anhänge','ID']];
    const all=state.items.slice().sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    all.forEach(a=>{
      const d=new Date(a.datetime); const date=d.toLocaleDateString('de-CH');
      const time=d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
      const per=Array.isArray(a.person)?a.person.join('; '):(a.person||'');
      const files=(a.attachments||[]).map(x=>x.name).join('; ');
      rows.push([a.type||'Termin',a.title||'',a.category,date,time,per,a.location||'',String(a.notes||'').replace(/\n/g,' '),a.status,files,a.id||'']);
    });
    const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='TimeMateJW_Export.csv'; a.click(); URL.revokeObjectURL(url);
  }
  async function importFile(file){
    const text=await file.text();
    try{ const data=JSON.parse(text); if(Array.isArray(data)){ mergeItems(data); alert('Import (JSON) erfolgreich.'); route('overview'); return; } }catch(_){}
    const lines=text.split(/\r?\n/).filter(x=>x.trim().length);
    const header=lines.shift(); const cols=header.split(';').map(x=>x.replace(/^"|"$/g,''));
    const idx=n=>cols.indexOf(n); const out=[];
    for(const line of lines){
      const cells=splitCSV(line);
      const obj={
        type:cells[idx('Typ')]?.replace(/^"|"$/g,'')||'Termin',
        title:cells[idx('Titel')]?.replace(/^"|"$/g,'')||'',
        category:cells[idx('Kategorie')]?.replace(/^"|"$/g,'')||'',
        date:cells[idx('Datum')]?.replace(/^"|"$/g,'')||'',
        time:cells[idx('Uhrzeit')]?.replace(/^"|"$/g,'')||'',
        person:cells[idx('Person(en)')]?.replace(/^"|"$/g,'')||'',
        location:cells[idx('Standort')]?.replace(/^"|"$/g,'')||'',
        notes:cells[idx('Notizen')]?.replace(/^"|"$/g,'')||'',
        status:cells[idx('Status')]?.replace(/^"|"$/g,'')||'upcoming',
        id:cells[idx('ID')]?.replace(/^"|"$/g,'')||String(Date.now()+Math.random())
      };
      let dt; try{ const [d,m,y]=obj.date.split('.'); dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${(obj.time||'00:00')}:00`);}catch(_){ dt=new Date(); }
      out.push({ id:obj.id, type:obj.type, title:obj.title, category:obj.category,
        person: obj.person.includes(';') ? obj.person.split(';').map(s=>s.trim()) : obj.person,
        location:obj.location, datetime: dt.toISOString(), notes:obj.notes, status:obj.status, attachments:[] });
    }
    mergeItems(out); alert('Import (CSV) erfolgreich.'); route('overview');
  }
  function splitCSV(line){
    const res=[]; let cur=''; let inq=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){ if(inq && line[i+1]==='"'){ cur+='"'; i++; } else { inq=!inq; } }
      else if(ch===';' && !inq){ res.push(cur); cur=''; }
      else cur+=ch;
    }
    res.push(cur); return res;
  }
  function mergeItems(arr){
    const byId=new Map(state.items.map(x=>[x.id,x]));
    arr.forEach(n=>{ if(n.id && byId.has(n.id)){ const prev=byId.get(n.id); byId.set(n.id,{...prev,...n}); } else { if(!n.id) n.id=String(Date.now()+Math.random()); byId.set(n.id,n); } });
    state.items=Array.from(byId.values()); save();
  }

  function settings(){
    v.innerHTML=`<section><h2>Einstellungen</h2>
      <div class="btnrow">
        <button id="theme-toggle"></button>
        <button id="exp-csv">Als Excel/CSV exportieren</button>
        <input type="file" id="imp-file" accept=".csv,.json" style="display:none">
        <button id="imp-btn">Importieren (CSV/JSON)</button>
        <button id="open-arch">Archiv öffnen</button>
        <button id="wipe" class="danger">Alle Termine löschen</button>
      </div>
    </section>`;
    const isDark=document.documentElement.classList.contains('dark');
    const tt=byId('theme-toggle');
    tt.textContent=isDark?'🌙 Dark-Mode ist an — ausschalten':'🌞 Dark-Mode ist aus — einschalten';
    tt.onclick=()=>{ const dark=document.documentElement.classList.toggle('dark'); localStorage.setItem('tmjw_theme',dark?'dark':'light'); settings(); };
    byId('exp-csv').onclick=exportCSV;
    const file=byId('imp-file'); byId('imp-btn').onclick=()=>file.click();
    file.onchange=()=>{ if(file.files && file.files[0]) importFile(file.files[0]); };
    byId('open-arch').onclick=()=>route('archive');
    byId('wipe').onclick=async()=>{ if(confirm('Wirklich alles löschen?')){ const d=await db(); await new Promise((res,rej)=>{const tx=d.transaction('files','readwrite'); tx.objectStore('files').clear(); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);}); state.items=[]; save(); alert('Gelöscht.'); route('overview'); } };
  }

  // ---------- IndexedDB Handle (für Uploads – keine Anzeige nötig) ----------
  const DB='tmjw_files', STORE='files'; let dbp;
  function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB,1); r.onupgradeneeded=e=>e.target.result.createObjectStore(STORE); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(e);}); return dbp; }

  // ---------- Tabs registrieren & Start ----------
  document.querySelectorAll('.tabs .tab').forEach(b=>b.addEventListener('click',()=>route(b.dataset.route)));
  route('overview');
})();
