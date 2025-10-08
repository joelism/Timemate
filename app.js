(function () {
  // Robust starten: erst nach DOM-Ready loslegen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    const v = document.getElementById('view');
    const byId = id => document.getElementById(id);
    if (!v) {
      console.error('TimeMate JW: #view nicht gefunden. Stelle sicher, dass das HTML geladen ist und ein <div id="view"></div> vorhanden ist.');
      return;
    }

    // ====== Konstanten / Kategorien ======
    const CAT_GMA = 'Genossenschaft Migros Aare';
    const CAT_UNCAT = 'Unkategorisiert';

    // Gemeinsame Kategorienliste (Termine & Aufgaben)
    const DEFAULT_CATS = [
      { key: 'Spitex Heitersberg', css: 'Spitex' },
      { key: 'Psychologin / Therapie', css: 'Psych' },
      { key: 'Töpferhaus', css: 'Töpferhaus' },
      { key: CAT_GMA, css: 'Geschäftlich' }, // ehemals "Geschäftlich"
      { key: 'Administrativ', css: 'Administrativ' },
      { key: 'Privat', css: 'Privat' },
      { key: 'HKV Aarau', css: 'HKV' },
      { key: 'Persönlich', css: 'HKV' }
    ];

    let CATS_ALL = JSON.parse(localStorage.getItem('tmjw_cats_all') || 'null') || DEFAULT_CATS;
    const saveCats = () => localStorage.setItem('tmjw_cats_all', JSON.stringify(CATS_ALL));

    // ====== Kontakte / Logs / Bilder ======
    let contacts = JSON.parse(localStorage.getItem('tmjw_contacts') || '[]');
    function saveContacts(){ localStorage.setItem('tmjw_contacts', JSON.stringify(contacts)); }
    let contactLogs = JSON.parse(localStorage.getItem('tmjw_contact_logs') || '{}'); // {contactId:[{id,ts,text}]}
    function saveContactLogs(){ localStorage.setItem('tmjw_contact_logs', JSON.stringify(contactLogs)); }
    const fullName = c => `${c.vorname||''} ${c.name||''}`.trim();
    const findContactByName = n => {
      if(!n) return null; const s=String(n).trim();
      return contacts.find(c => fullName(c)===s || c.name===s || (`${c.vorname||''} ${c.name||''}`).trim().includes(s));
    };
    const getContactImageByName = n => {
      const c=findContactByName(n); return c&&c.img?c.img:null;
    };
    let catImages = JSON.parse(localStorage.getItem('tmjw_cat_images') || '{}'); // {catName:dataURL}
    const saveCatImages = () => localStorage.setItem('tmjw_cat_images', JSON.stringify(catImages));

    // ====== Theme ======
    if ((localStorage.getItem('tmjw_theme')||'light') === 'dark') document.documentElement.classList.add('dark');

    // ====== Termine Storage ======
    const state = { items: JSON.parse(localStorage.getItem('tmjw_state') || '[]') };
    const save  = () => localStorage.setItem('tmjw_state', JSON.stringify(state.items));
    const fmt = iso => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
    const esc = s => String(s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    function autoUpdate(){
      const now=Date.now(); let ch=false;
      state.items.forEach(a=>{
        const due=new Date(a.datetime).getTime();
        if(a.status!=='archived' && now>=due && a.status!=='done'){ a.status='done'; ch=true; }
        if(a.status!=='archived' && now-due>3*24*60*60*1000){ a.status='archived'; ch=true; }
      });
      if(ch) save();
    }

    // ====== Helpers ======
    function el(tag, attrs={}, text){ const n=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); if(text!==undefined) n.textContent=text; return n; }
    function dataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }
    function avatarStack(names){
      const wrap = el('div',{style:'display:flex;gap:4px;align-items:center;flex-wrap:wrap'});
      (Array.isArray(names)?names:[names]).forEach(n=>{
        const src=getContactImageByName(n);
        if(src){ wrap.append(el('img',{src,style:'width:22px;height:22px;border-radius:50%;object-fit:cover'})); }
      });
      return wrap;
    }

    // ====== Dark-Mode sichtbar + Tabs scrollbar (Style-Injection) ======
    (function ensureDarkStyles(){
      const MARK_ID = 'tmjw-dark-style';
      if (document.getElementById(MARK_ID)) return;
      const css = `
      :root{--bg:#fff;--fg:#0f172a;--muted:#64748b;--primary:#0ea5e9;--danger:#ef4444;--border:#e5e7eb;--card:#f8fafc;}
      .dark{--bg:#0f172a;--fg:#f8fafc;--muted:#94a3b8;--primary:#38bdf8;--danger:#f87171;--border:#334155;--card:#1e293b;}
      body{background:var(--bg);color:var(--fg)}
      .app-header{background:var(--card);border-bottom:1px solid var(--border)}
      .tab,input,select,textarea,button,.item,.card{background:var(--card);color:var(--fg);border-color:var(--border)}
      .muted{color:var(--muted)}
      /* Tabs scrollen */
      .tabs{display:flex;gap:8px;margin-top:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
      .tab{flex:0 0 auto;white-space:nowrap}
      `;
      const style = document.createElement('style');
      style.id = MARK_ID;
      style.textContent = css;
      document.head.appendChild(style);
    })();

    // ====== PDF / Terminbestätigung ======
    function fmtDMY_forPDF(iso){
      const d=new Date(iso);
      const dd=String(d.getDate()).padStart(2,'0');
      const mm=String(d.getMonth()+1).padStart(2,'0');
      const yyyy=d.getFullYear();
      const hh=String(d.getHours()).padStart(2,'0');
      const mi=String(d.getMinutes()).padStart(2,'0');
      return {date:`${dd}/${mm}/${yyyy}`, time:`${hh}:${mi}`};
    }
    function toArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }
    function openConfirmationPDF(entry){
      try{
        const {date,time} = fmtDMY_forPDF(entry.datetime);
        const title = (entry.title || '(ohne Titel)').replace(/[<>]/g,'');
        const participants = ['Joel Weber', ...toArray(entry.person||[])].filter(Boolean).join(', ');
        const location = (entry.location||'').replace(/[<>]/g,'');
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Terminbestätigung</title>
        <style>
          @page{size:A4;margin:20mm}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial;color:#0f172a}
          .head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
          .logo{width:40px;height:40px;border-radius:8px}
          h1{margin:6px 0 14px 0;font-size:28px}
          .box{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f8fafc}
          .row{margin:8px 0}
          .label{color:#64748b;font-size:12px;display:block}
          .footer{margin-top:18px;color:#64748b;font-size:12px}
        </style></head><body>
          <div class="head">
            <img class="logo" src="icons/icon-180x180.png" alt="TimeMate Logo">
            <div><strong>TimeMate by J.W.</strong></div>
          </div>
          <h1>Terminbestätigung</h1>
          <div class="box">
            <div class="row"><span class="label">Termin</span><div>${title}</div></div>
            <div class="row"><span class="label">Teilnehmer</span><div>${participants}</div></div>
            <div class="row"><span class="label">Datum &amp; Uhrzeit</span><div>${date} • ${time}</div></div>
            ${location ? `<div class="row"><span class="label">Ort</span><div>${location}</div></div>` : ''}
          </div>
          <div class="footer">Diese Terminbestätigung wurde automatisch von TimeMate by J.W. erstellt.</div>
          <script>window.onload=()=>setTimeout(()=>window.print(),100)</script>
        </body></html>`;
        const w=window.open('', '_blank', 'noopener'); if(!w){ alert('Popup blockiert – bitte erlauben.'); return; }
        w.document.open(); w.document.write(html); w.document.close();
      }catch(e){ console.error('PDF-Fehler', e); alert('Konnte die Terminbestätigung nicht erstellen.'); }
    }

    // ====== Navigation ======
    function route(name,arg){
      document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.toggle('active', b.dataset.route===name));
      if(name==='overview') return ov();
      if(name==='new')      return form(arg);
      if(name==='list')     return listView();   // Tab-Text wird zu "Termine"
      if(name==='tasks')    return tasksView();
      if(name==='archive')  return arch();
      if(name==='settings') return settings();
      if(name==='contacts') return contactsView();
    }

    // Tabs anpassen
    (function adjustTabs(){
      const nav=document.querySelector('.tabs');
      if(!nav) return;

      // Fallback: scrollbar erzwingen
      try{ nav.style.overflowX='auto'; nav.style.webkitOverflowScrolling='touch'; nav.style.display='flex'; nav.style.gap='8px'; }catch(_){}

      // „Neuer Termin“ → „Neuer Eintrag“
      const newBtn=[...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='new');
      if(newBtn) newBtn.textContent='Neuer Eintrag';

      // „Liste“ → „Termine“
      const listBtn=[...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='list');
      if(listBtn) listBtn.textContent='Termine';

      // Aufgaben-Tab hinzufügen, falls fehlt
      if(!nav.querySelector('[data-route="tasks"]')){
        const t=el('button',{class:'tab','data-route':'tasks',type:'button'},'Aufgaben');
        t.addEventListener('click',()=>route('tasks'));
        // vor Einstellungen einfügen, wenn vorhanden
        const settingsBtn=[...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='settings');
        if(settingsBtn) nav.insertBefore(t, settingsBtn); else nav.appendChild(t);
      }

      // Kontakte-Tab hinzufügen, falls fehlt (bestand aus deiner Datei)
      if(!nav.querySelector('[data-route="contacts"]')){
        const btn=el('button',{class:'tab','data-route':'contacts',type:'button'},'Kontakte');
        btn.addEventListener('click',()=>route('contacts'));
        nav.appendChild(btn);
      }

      // Archiv-Tab entfernen (wie in deiner Datei)
      const archBtn=[...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='archive');
      if(archBtn) archBtn.remove();
    })();

    // ====== Seed-Kontakte (nur falls fehlen) ======
    (function seedContactsOnce(){
      const key='tmjw_seed_contacts_v3';
      if(localStorage.getItem(key)) return;
      const addIfMissing=(vorname,name,kategorie)=>{
        if(!contacts.some(c=>c.vorname===vorname && c.name===name && c.kategorie===kategorie)){
          contacts.push({ id:String(Date.now()+Math.random()), vorname, name, kategorie, funktion:'', notizen:'', telefon:'', email:'', img:''});
        }
      };
      ['Aleks','Alina','Mama','Papa','Luana','Yulio'].forEach(n=>addIfMissing('',n,'Privat'));
      addIfMissing('F.','Völki','Spitex Heitersberg'); addIfMissing('A.','Rudgers','Spitex Heitersberg');
      addIfMissing('Domenique','Hürzeler','Töpferhaus'); addIfMissing('Jeanine','Haygis','Töpferhaus'); addIfMissing('Sandra','Schriber','Töpferhaus');
      ['Beatriz Häsler','Helena Huser','Jasmin Widmer','Linda Flückiger','Mathias Tomaske','Svenja Studer'].forEach(n=>{ const [v,...r]=n.split(' '); addIfMissing(v,r.join(' '),CAT_GMA); });
      ['Berat Aliu','Ellen Ricciardella','Gabriela Hirt','Kristina Brütsch','Rinor Aslani'].forEach(n=>{ const [v,...r]=n.split(' '); addIfMissing(v,r.join(' '),'HKV Aarau'); });
      saveContacts(); localStorage.setItem(key,'1');
    })();

    // ====== IndexedDB (Anhänge) ======
    const DB='tmjw_files', STORE='files'; let dbp;
    function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB,1); r.onupgradeneeded=e=>e.target.result.createObjectStore(STORE); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(e);}); return dbp; }

    // ====== Übersicht ======
    function ov(){
      autoUpdate(); v.innerHTML='';
      const wrap=el('section');
      wrap.append(el('h2',{},'Termine'));
      const grid=el('div',{class:'grid'});
      const upcoming=state.items.filter(x=>x.type!=='Aufgabe' && x.status!=='archived' && new Date(x.datetime)>new Date())
                               .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
      CATS_ALL.forEach(c=>{
        const card=el('div',{class:'card cat-'+(c.css||'cat')});
        const head=el('div',{style:'display:flex;align-items:center;gap:10px;justify-content:space-between'});
        const left=el('div',{style:'display:flex;align-items:center;gap:10px'});
        if(catImages[c.key]) left.append(el('img',{src:catImages[c.key],style:'width:28px;height:28px;border-radius:6px;object-fit:cover'}));
        left.append(el('div',{class:'title'},c.key));
        head.append(left);
        const next=upcoming.find(x=>x.category===c.key);
        const right=el('div',{style:'display:flex;gap:6px;align-items:center'});
        if(next){ const persons=Array.isArray(next.person)?next.person:(next.person?[next.person]:[]); right.append(avatarStack(persons)); }
        head.append(right); card.append(head);

        if(next){
          const p=Array.isArray(next.person)?next.person.join(', '):(next.person||'—');
          card.append(el('div',{},next.title||'(ohne Titel)'));
          card.append(el('div',{},`${fmt(next.datetime)} · ${p} · ${next.location||''}`));
          const row=el('div',{class:'btnrow'});
          const b1=el('button',{type:'button'}, next.status==='done'?'✓ Erledigt':'☑️ Abhaken'); b1.onclick=()=>{ next.status=next.status==='done'?'upcoming':'done'; save(); ov(); };
          const b2=el('button',{type:'button'},'↪ Archivieren'); b2.onclick=()=>{ next.status='archived'; save(); ov(); };
          const b3=el('button',{type:'button'},'✏️ Bearbeiten'); b3.onclick=()=>route('new', next.id);
          const b4=el('button',{type:'button'},'🧾 Bestätigung'); b4.onclick=()=>openConfirmationPDF(next);
          row.append(b1,b2,b3,b4); card.append(row);
        } else { card.append(el('div',{},'❗️ Kein Termin eingetragen')); }
        grid.append(card);
      });
      wrap.append(grid);

      wrap.append(el('div',{class:'sep'}));
      wrap.append(el('h2',{},'Aufgaben'));
      const tasks=state.items.filter(x=>x.type==='Aufgabe' && x.status!=='archived')
                             .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
      const list=el('div',{class:'list'});
      if(!tasks.length) list.innerHTML='<p class="meta">Keine Aufgaben.</p>';
      tasks.forEach(a=>{
        const it=el('div',{class:'item'});
        const titleRow=el('div',{style:'display:flex;align-items:center;gap:8px;justify-content:space-between'});
        titleRow.append(el('div',{class:'title'},a.title||'(ohne Titel)'));
        const persons=Array.isArray(a.person)?a.person:(a.person?[a.person]:[]);
        titleRow.append(avatarStack(persons));
        it.append(titleRow);
        it.append(el('div',{},`${a.category} • ${fmt(a.datetime)} ${a.status==='done'?'✓':''}`));
        const row=el('div',{class:'btnrow'});
        const b1=el('button',{type:'button'}, a.status==='done'?'Als offen markieren':'☑️ Abhaken'); b1.onclick=()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); ov(); };
        const b2=el('button',{type:'button'},'↪ Archivieren'); b2.onclick=()=>{ a.status='archived'; save(); ov(); };
        const b3=el('button',{type:'button'},'✏️ Bearbeiten'); b3.onclick=()=>route('new', a.id);
        row.append(b1,b2,b3); it.append(row); list.append(it);
      });
      wrap.append(list);
      v.append(wrap);
    }

    // ====== Termine- & Aufgaben-Listen ======
    function listView(){
      autoUpdate();
      v.innerHTML='<section><h2>Termine</h2><div id="list" class="list"></div></section>';
      const list=byId('list');
      const all=state.items.filter(a=>a.type!=='Aufgabe' && a.status!=='archived').sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
      if(!all.length){ list.innerHTML='<p class="meta">Keine Termine.</p>'; return; }
      all.forEach(a=>list.append(renderItem(a, ()=>listView())));
    }
    function tasksView(){
      autoUpdate();
      v.innerHTML='<section><h2>Aufgaben</h2><div id="tasks" class="list"></div></section>';
      const list=byId('tasks');
      const all=state.items.filter(a=>a.type==='Aufgabe' && a.status!=='archived').sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
      if(!all.length){ list.innerHTML='<p class="meta">Keine Aufgaben.</p>'; return; }
      all.forEach(a=>list.append(renderItem(a, ()=>tasksView())));
    }

    // ====== Archiv (über Einstellungen) ======
    function arch(){
      autoUpdate();
      v.innerHTML='<section><h2>Archiv</h2><div id="arch" class="list"></div></section>';
      const cont=byId('arch');
      const arr=state.items.filter(a=>a.status==='archived').sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
      if(!arr.length){ cont.innerHTML='<p class="meta">Archiv ist leer.</p>'; return; }
      arr.forEach(a=>{
        const it=renderItem(a, ()=>arch());
        const row=it.querySelector('.btnrow');
        const back=el('button',{type:'button'},'↩︎ Zurückholen'); back.onclick=()=>{ a.status='upcoming'; save(); arch(); };
        row.append(back); cont.append(it);
      });
    }

    // ====== Formular Neuer Eintrag / Bearbeiten ======
    function form(editId){
      const editing = editId ? state.items.find(x=>x.id===editId) : null;
      v.innerHTML=''; const s=el('section'); s.append(el('h2',{}, editing?'Eintrag bearbeiten':'Neuer Eintrag'));

      // Art
      const lType=el('label'); lType.append('Art');
      const selType=el('select',{id:'type'}); ['Termin','Aufgabe'].forEach(t=>selType.append(el('option',{},t)));
      lType.append(selType); s.append(lType);

      // Titel
      const lTitle=el('label'); lTitle.append('Titel'); lTitle.append(el('input',{id:'title',type:'text',required:'true',placeholder:'z.B. Kontrolle / Hausaufgabe'})); s.append(lTitle);

      // Kategorie
      const lCat=el('label'); lCat.append('Kategorie');
      const selCat=el('select',{id:'category',required:'true'}); lCat.append(selCat); s.append(lCat);

      // Dynamik
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
      const saveBtn=el('button',{class:'primary',type:'button'}, editing?'Änderungen speichern':'Speichern'); s.append(saveBtn);
      const cancelBtn=el('button',{type:'button'},'Abbrechen'); cancelBtn.onclick=()=>route('overview'); s.append(cancelBtn);

      // PDF-Button (nur bei Terminen) + Auto-Öffnen beim Bearbeiten
      if (editing && editing.type!=='Aufgabe') {
        const pdfBtn=el('button',{type:'button'},'🧾 Terminbestätigung (PDF)');
        pdfBtn.onclick=()=>openConfirmationPDF(editing);
        s.append(pdfBtn);
        setTimeout(()=>openConfirmationPDF(editing), 150);
      }

      v.append(s);

      // Datalist (für Freitext/„Andere“)
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
        CATS_ALL.forEach(c=>selCat.append(el('option',{},c.key)));
        if (editing && editing.category && !CATS_ALL.some(c=>c.key===editing.category)) selCat.append(el('option',{},editing.category));
        fillDyn(selType.value, selCat.value, dyn);
      }
      selType.addEventListener('change',populateCats);
      selCat.addEventListener('change',()=>fillDyn(selType.value, selCat.value, dyn));
      populateCats();

      // Prefill
      if(editing){
        selType.value = editing.type || 'Termin';
        populateCats();
        byId('title').value = editing.title || '';
        selCat.value = editing.category || (CATS_ALL[0]?.key || CAT_UNCAT);
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
        const cat  =selCat.value || CAT_UNCAT;
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
        const base = { id: editing?editing.id:String(Date.now()), type, title, category:cat, person, location:loc, datetime:dt, notes: byId('notes').value, attachments: tmp, status: editing?editing.status:'upcoming' };

        if(editing){ Object.assign(editing, base); }
        else { state.items.push(base); }
        save(); alert('Gespeichert.'); route('overview');
      };
    }

    // ====== Dynamische Felder ======
    function personsForCategory(cat){
      return contacts.filter(c=>c.kategorie===cat).map(fullName);
    }
    function fillDyn(type, cat, d){
      d.innerHTML='';
      const mk=h=>{const x=document.createElement('div'); x.innerHTML=h; return x.firstElementChild;};

      // Aufgaben
      if(type==='Aufgabe'){
        const names = personsForCategory(cat);
        if(cat==='HKV Aarau'){
          const opts = names.concat(['Persönlich','Andere']);
          d.append(mk('<label>Person<select id="person">'+opts.map(p=>`<option>${p}</option>`).join('')+'</select></label>'));
          d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
          const sel=d.querySelector('#person'); const other=d.querySelector('#personOther');
          sel.addEventListener('change',()=>{ other.style.display=(sel.value==='Andere')?'block':'none'; });
        } else if(cat==='Persönlich'){
          if(names.length){
            d.append(mk('<label>Person<select id="person">'+names.concat(['Andere']).map(p=>`<option>${p}</option>`).join('')+'</select></label>'));
            d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
            const sel=d.querySelector('#person'); const other=d.querySelector('#personOther');
            sel.addEventListener('change',()=>{ other.style.display=(sel.value==='Andere')?'block':'none'; });
          }
        } else {
          const opts = names.concat(['Andere']);
          d.append(mk('<label>Person<select id="person">'+opts.map(p=>`<option>${p}</option>`).join('')+'</select></label>'));
          d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
          const sel=d.querySelector('#person'); const other=d.querySelector('#personOther');
          sel.addEventListener('change',()=>{ other.style.display=(sel.value==='Andere')?'block':'none'; });
        }
        d.append(mk('<label>Standort<input id="location" placeholder="Ort / Kontext"></label>'));
        return;
      }

      // Termine
      if(cat===CAT_GMA){
        const names = personsForCategory(cat);
        d.append(mk('<label>Termin mit (Mehrfachauswahl)<select id="personMulti" multiple size="6">'+names.map(n=>`<option>${n}</option>`).join('')+'</select></label>'));
        d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>3322 Schönbühl</option></select></label>'));
        return;
      }
      const names = personsForCategory(cat);
      d.append(mk('<label>Termin mit<select id="person">'+names.concat(['Andere']).map(n=>`<option>${n}</option>`).join('')+'</select></label>'));
      d.append(mk('<input id="personOther" placeholder="Andere (Name)" style="display:none;">'));
      const sel=d.querySelector('#person'); const other=d.querySelector('#personOther');
      sel.addEventListener('change',()=>{ other.style.display = sel.value==='Andere' ? 'block' : 'none'; });

      if(cat==='Spitex Heitersberg'){
        d.append(mk('<label>Standort<select id="location"><option>5000 Aarau</option><option>5200 Brugg</option><option>5442 Fislisbach</option><option>5507 Mellingen</option></select></label>'));
      } else if(cat==='Töpferhaus'){
        d.append(mk('<label>Standort<select id="location"><option>5000 Aarau - Bleichmattstr.</option><option>5000 Aarau - Bachstr. 95</option></select></label>'));
      } else {
        d.append(mk('<label>Standort<input id="location" placeholder="Ort / Adresse"></label>'));
      }
    }

    // ====== Datalist (nur für Freitextfälle) ======
    function buildContactsDatalist(){
      let dl=document.getElementById('contactsAll'); if(!dl){ dl=el('datalist',{id:'contactsAll'}); document.body.appendChild(dl); }
      dl.innerHTML=''; contacts.forEach(c=> dl.append(el('option',{}, fullName(c))));
    }

    // ====== Kontakte: Hauptansicht (nur Hinzufügen) + Kategorien-Grid (nur Öffnen) ======
    function contactsView(){
      v.innerHTML = `<section>
        <h2>Kontakte</h2>

        <div style="margin:4px 0 12px">
          <input id="contactSearch" placeholder="Suchen (Name, Kategorie, Funktion, Telefon, E-Mail, Notiz)" style="width:100%">
        </div>

        <h3>Kategorien</h3>
        <div id="catListAll"></div>

        <div class="btnrow" style="margin:8px 0 16px">
          <button id="addCatAll" type="button" class="primary">+ Kategorie hinzufügen</button>
        </div>

        <h3>Suchergebnisse</h3>
        <div id="searchGrid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;"></div>

        <div class="btnrow" style="margin-top:16px">
          <button id="cNew" class="primary" type="button">+ Neuer Kontakt</button>
        </div>
      </section>`;

      renderCatList(); // Kategorien als Grid (nur Öffnen)
      byId('cNew').onclick=()=>editContact(null);
      byId('addCatAll').onclick=()=>addCategory();

      const searchInput = byId('contactSearch');
      const searchGrid  = byId('searchGrid');
      const renderSearch = ()=>{
        const q = searchInput.value.trim().toLowerCase();
        searchGrid.innerHTML='';
        if(!q) { searchGrid.innerHTML='<p class="meta" style="grid-column:1/-1;opacity:.8">Gib etwas ein, um zu suchen…</p>'; return; }
        const hits = contacts.filter(c=>{
          const hay = [
            fullName(c), c.kategorie||'', c.funktion||'',
            c.telefon||'', c.email||'', c.notizen||''
          ].join(' ').toLowerCase();
          return hay.includes(q);
        });
        if(!hits.length){ searchGrid.innerHTML='<p class="meta" style="grid-column:1/-1">Keine Treffer.</p>'; return; }
        hits.forEach(c=>searchGrid.append(contactCard(c)));
      };
      searchInput.addEventListener('input', renderSearch);
      renderSearch();
    }

    // Kategorien-Grid — pro Karte nur „Öffnen“
    function renderCatList(){
      const listEl = byId('catListAll');
      listEl.innerHTML = '';

      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      grid.style.gap = '12px';

      const cats = CATS_ALL.map(c=>c.key);
      cats.forEach(k=>{
        const n = contacts.filter(c => c.kategorie === k).length;

        const card = el('div', { class: 'item', style: 'height:100%' });
        const head = el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px' });
        if (catImages[k]) {
          head.append(el('img', { src: catImages[k], style: 'width:28px;height:28px;border-radius:6px;object-fit:cover' }));
        }
        head.append(el('div', { class: 'title' }, k));
        card.append(head);

        card.append(el('div', {}, `${n} Kontakte`));

        const row = el('div', { class: 'btnrow', style: 'margin-top:8px' });
        const open  = el('button', {type:'button'}, 'Öffnen');
        open.onclick  = () => contactsByCategory(k);
        row.append(open);
        card.append(row);

        grid.append(card);
      });

      listEl.append(grid);
    }

    // Karte (
