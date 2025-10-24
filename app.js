/* TimeMate by J.W. — app.js (Original-UI: Kategorie-Kacheln + neue Funktionen)
   - Nutzt deine vorhandene styles.css (grid/card/cat-… Klassen)
   - Neue Features: Ende (optional), Standort-Auswahl (Hauptadresse/Kontakte/Andere…), Kontakte-Tab, Bestätigen-Dokument
*/
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }

  // ========== Helpers ==========
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
  const el = (t,a={},txt)=>{const n=document.createElement(t);for(const k in a)n.setAttribute(k,a[k]);if(txt!==undefined)n.textContent=txt;return n;};
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function init(){
    const view = $('#view'); if(!view) return;

    // ===== Categories =====
    const DEFAULT_CATS = [
      { key:'Genossenschaft Migros Aare', css:'Geschäftlich' },
      { key:'Privat',                      css:'Privat' },
      { key:'HKV Aarau',                   css:'HKV' },
      { key:'Activ Fitness',               css:'HKV' },
      { key:'Spitex Heitersberg',          css:'Spitex' },
      { key:'Psychologin / Therapie',      css:'Psych' },
      { key:'Töpferhaus',                  css:'Töpferhaus' },
      { key:'Administrativ',               css:'Administrativ' },
      { key:'Persönlich',                  css:'HKV' },
      { key:'Unkategorisiert',             css:'HKV' }
    ];
    const CAT_UNCAT='Unkategorisiert';
    const STATUS_LABEL = { upcoming:'Bevorstehend', done:'Erledigt', archived:'Archiviert' };

    // ===== Storage =====
    let CATS_ALL = JSON.parse(localStorage.getItem('tmjw_cats_all')||'null') || DEFAULT_CATS;
    const saveCats=()=>localStorage.setItem('tmjw_cats_all',JSON.stringify(CATS_ALL));

    let contacts = JSON.parse(localStorage.getItem('tmjw_contacts')||'[]');
    const saveContacts=()=>localStorage.setItem('tmjw_contacts',JSON.stringify(contacts));

    let catAddr = JSON.parse(localStorage.getItem('tmjw_cat_addr')||'{}');
    const saveCatAddr=()=>localStorage.setItem('tmjw_cat_addr',JSON.stringify(catAddr));

    const state={ items: JSON.parse(localStorage.getItem('tmjw_state')||'[]') };
    const save =()=>localStorage.setItem('tmjw_state',JSON.stringify(state.items));

    // ===== Utils =====
    const fullName = c => `${c.vorname||''} ${c.name||''}`.trim();
    const personsForCategory = cat => contacts.filter(c=>c.kategorie===cat).map(fullName);
    const fmtDate = iso => { const d=new Date(iso); return d.toLocaleDateString('de-CH')+', '+d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}); };
    const isFuture = iso => new Date(iso).getTime() >= (Date.now() - 60*60*1000);

    // ===== Routing =====
    function route(name,arg){
      $$('.tabs .tab').forEach(b=>b.classList.toggle('active', b.dataset.route===name));
      if(name==='overview') return overview();
      if(name==='new') return editor(arg);
      if(name==='list') return listView();
      if(name==='tasks') return tasksView();
      if(name==='archive') return archiveView();
      if(name==='settings') return settingsView();
      if(name==='contacts') return contactsView();
    }
    $$('.tabs .tab').forEach(b=>b.addEventListener('click',()=>route(b.dataset.route)));
    (function ensureContactsTab(){
      const tabs=$('.tabs'); if(!tabs) return;
      const listBtn=[...tabs.querySelectorAll('.tab')].find(b=>b.dataset.route==='list'); if(listBtn) listBtn.textContent='Termine';
      if(!tabs.querySelector('[data-route="contacts"]')){
        const t=el('button',{class:'tab','data-route':'contacts',type:'button'},'Kontakte');
        t.addEventListener('click',()=>route('contacts')); tabs.appendChild(t);
      }
    })();

    // ===== Views =====
    function overview(){
      // Karten-Gitter: eine Karte pro Kategorie
      const grid = el('div',{class:'grid'});
      const groups=new Map(); CATS_ALL.forEach(c=>groups.set(c.key,[]));
      state.items.filter(i=>i.type!=='Aufgabe' && i.status!=='archived').forEach(i=>{
        const k=i.category||CAT_UNCAT; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(i);
      });
      CATS_ALL.forEach(cat=>{
        const arr=(groups.get(cat.key)||[]).filter(a=>isFuture(a.datetime)).sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
        const card = el('div',{class:`card cat-${cat.css}`});
        const body = arr[0] ? renderApptBlock(arr[0]) : el('div',{}, '❗ Kein Termin eingetragen');
        card.append(el('div',{class:'title'},cat.key));
        card.append(body);
        grid.append(card);
      });
      view.innerHTML='';
      view.append(grid);

      // Aufgaben darunter
      const tasks = state.items.filter(i=>i.type==='Aufgabe' && i.status!=='archived');
      const sec = el('section'); sec.innerHTML=`<h2>Aufgaben</h2>${renderItems(tasks)||'<p class="meta">Nichts vorhanden.</p>'}`;
      view.append(sec);
    }

    function renderApptBlock(item){
      const wrap = el('div');
      const meta=[ fmtDate(item.datetime)+(item.endtime?('–'+item.endtime):''),
                   Array.isArray(item.person)?item.person.join(', '):item.person,
                   item.location||'—' ].filter(Boolean).join(' · ');
      wrap.append(el('div',{class:'meta'},esc(meta)));
      const row=el('div',{class:'btnrow'});
      const bD=el('button',{},'✅ Abhaken'); bD.onclick=()=>{ item.status=item.status==='done'?'upcoming':'done'; save(); overview(); };
      const bA=el('button',{},'🗃️ Archivieren'); bA.onclick=()=>{ item.status='archived'; save(); overview(); };
      const bE=el('button',{},'✏️ Bearbeiten'); bE.onclick=()=>editor(item);
      const bC=el('button',{},'🧾 Bestätigen'); bC.onclick=()=>openConfirmDoc(item);
      row.append(bD,bA,bE,bC);
      wrap.append(row);
      return wrap;
    }

    function listView(){
      const items = state.items.filter(i=>i.type!=='Aufgabe' && i.status!=='archived');
      view.innerHTML = `<section><h2>Termine</h2>${renderItems(items)||'<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }
    function tasksView(){
      const items = state.items.filter(i=>i.type==='Aufgabe' && i.status!=='archived');
      view.innerHTML = `<section><h2>Aufgaben</h2>${renderItems(items)||'<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }
    function archiveView(){
      const items = state.items.filter(i=>i.status==='archived');
      view.innerHTML = `<section><h2>Archiv</h2>${renderItems(items)||'<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }

    function settingsView(){
      view.innerHTML = `
        <section><h2>Einstellungen</h2>
          <div class="card">
            <label>Hauptadresse pro Kategorie</label>
            <div class="row">
              <select id="catSel"></select>
              <input id="catAddrInput" placeholder="Adresse…">
              <button id="saveCatAddr" class="primary" type="button">Speichern</button>
            </div>
          </div>
        </section>`;
      const sel=$('#catSel'); CATS_ALL.forEach(c=> sel.append(el('option',{},c.key)));
      const addr=$('#catAddrInput'); const fill=()=> addr.value=catAddr[sel.value]||''; sel.addEventListener('change',fill); fill();
      $('#saveCatAddr').onclick=()=>{ catAddr[sel.value]=(addr.value||'').trim(); saveCatAddr(); alert('Hauptadresse gespeichert.'); };
    }

    function contactsView(){
      view.innerHTML = `<section><h2>Kontakte</h2>
        <div class="btnrow"><button id="addC" class="primary" type="button">+ Neuer Kontakt</button></div>
        <div id="clist" class="list"></div>
      </section>`;
      const clist=$('#clist');
      const draw=()=>{
        clist.innerHTML='';
        if(!contacts.length){ clist.innerHTML='<p class="meta">Keine Kontakte.</p>'; return; }
        contacts.forEach(c=>{
          const item=el('div',{class:'item'});
          item.append(el('div',{class:'title'}, fullName(c)||'(ohne Namen)'));
          const meta=[c.kategorie||CAT_UNCAT, c.adresse||'—'].filter(Boolean).join(' · ');
          item.append(el('div',{class:'meta'}, meta));
          const row=el('div',{class:'btnrow'});
          const e=el('button',{},'✏️ Bearbeiten'); e.onclick=()=>editContact(c);
          const d=el('button',{},'🗑️ Löschen'); d.onclick=()=>{ if(confirm('Kontakt löschen?')){ contacts=contacts.filter(x=>x!==c); saveContacts(); draw(); } };
          row.append(e,d); item.append(row); clist.append(item);
        });
      };
      draw();
      $('#addC').onclick=()=>editContact(null);
    }

    function editContact(contact){
      const c = contact ? {...contact} : { id:String(Date.now()), vorname:'', name:'', kategorie:CATS_ALL[0]?.key||CAT_UNCAT, adresse:'' };
      view.innerHTML = `<section><h2>Kontakt ${contact?'bearbeiten':'anlegen'}</h2>
        <div class="card">
          <label>Vorname<input id="c_vn" value="${esc(c.vorname)}"></label>
          <label>Name<input id="c_nn" value="${esc(c.name)}"></label>
          <label>Kategorie<select id="c_cat"></select></label>
          <label>Adresse<input id="c_addr" value="${esc(c.adresse||'')}"></label>
        </div>
        <div class="btnrow"><button id="saveC" class="primary">Speichern</button><button id="cancelC">Abbrechen</button></div>`;
      const sel=$('#c_cat'); CATS_ALL.forEach(k=> sel.append(el('option',{},k.key))); sel.value=c.kategorie;
      $('#saveC').onclick=()=>{ c.vorname=$('#c_vn').value.trim(); c.name=$('#c_nn').value.trim(); c.kategorie=sel.value; c.adresse=$('#c_addr').value.trim();
        if(contact){ Object.assign(contact,c); } else { contacts.push(c); } saveContacts(); contactsView(); };
      $('#cancelC').onclick=()=>contactsView();
    }

    // ===== Editor =====
    function editor(editing){
      view.innerHTML = `<section><h2>${editing?'Termin bearbeiten':'Neuer Termin'}</h2>
        <div class="card">
          <label>Titel<input id="t_title"></label>
          <label>Kategorie<select id="t_cat"></select></label>
          <label>Person<select id="t_person"></select></label>
          <div class="row"><label style="flex:1">Beginn<input id="t_date" type="date"> <input id="t_time" type="time"></label></div>
          <label>Ende (optional)<input id="t_endtime" type="time" placeholder="—"></label>
          <label>Standort
            <select id="t_locpick"></select>
            <input id="t_location" placeholder="Standort/Adresse" style="margin-top:6px">
          </label>
          <label>Notizen<textarea id="t_notes" rows="4"></textarea></label>
        </div>
        <div class="btnrow"><button id="saveT" class="primary">Speichern</button><button id="cancelT">Abbrechen</button></div>`;

      const selCat=$('#t_cat'), selPer=$('#t_person'), selLoc=$('#t_locpick'), inpLoc=$('#t_location');

      CATS_ALL.forEach(c=> selCat.append(el('option',{},c.key)));

      function fillPersons(){ selPer.innerHTML=''; const arr=personsForCategory(selCat.value); ['Andere',...arr].forEach(p=> selPer.append(el('option',{},p))); }
      function fillLocationPicker(){
        selLoc.innerHTML='';
        const opts=[]; const h=catAddr[selCat.value]; if(h) opts.push({v:'__haupt__',t:`Hauptadresse (${h})`});
        const set=new Set(); contacts.filter(c=>c.kategorie===selCat.value && c.adresse).forEach(c=>set.add(c.adresse));
        [...set].forEach(a=>opts.push({v:`c:${a}`,t:a})); opts.push({v:'__other__',t:'Andere…'});
        opts.forEach(o=> selLoc.append(el('option',{value:o.v},o.t)));
      }
      function syncLocInput(){ const v=selLoc.value; if(v==='__other__'||v===''){ inpLoc.disabled=false; if(v==='__other__'&&!inpLoc.value) inpLoc.focus(); } else { const a=v==='__haupt__'?(catAddr[selCat.value]||''):v.slice(2); inpLoc.value=a; inpLoc.disabled=true; } }
      selCat.addEventListener('change',()=>{ fillPersons(); fillLocationPicker(); syncLocInput(); });
      selLoc.addEventListener('change',syncLocInput);
      fillPersons(); fillLocationPicker(); syncLocInput();

      if(editing){
        $('#t_title').value=editing.title||''; selCat.value=editing.category||selCat.value; fillPersons();
        const pVal=Array.isArray(editing.person)?editing.person[0]:(editing.person||'Andere'); selPer.value=personsForCategory(selCat.value).includes(pVal)?pVal:'Andere';
        const d=new Date(editing.datetime); $('#t_date').value=d.toISOString().slice(0,10); $('#t_time').value=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        if(editing.endtime) $('#t_endtime').value=editing.endtime; inpLoc.value=editing.location||''; $('#t_notes').value=editing.notes||'';
      }

      $('#cancelT').onclick=()=>route('overview');
      $('#saveT').onclick=()=>{
        const title=$('#t_title').value.trim(); const cat=selCat.value||CAT_UNCAT; const date=$('#t_date').value; const time=$('#t_time').value;
        if(!title||!date||!time){ alert('Bitte Titel, Kategorie, Datum und Uhrzeit angeben.'); return; }
        const dt=new Date(`${date}T${time}:00`).toISOString();
        const obj={ id: editing?editing.id:String(Date.now()), type:'Termin', title, category:cat, person:selPer.value, datetime:dt, endtime:$('#t_endtime').value||'', location:(inpLoc.value||'').trim(), notes:$('#t_notes').value.trim(), attachments:[], status: editing?editing.status:'upcoming' };
        if(editing){ Object.assign(editing,obj);} else { state.items.push(obj); } save(); route('list');
      };
    }

    // ===== List helpers =====
    function renderItems(items){
      if(!items.length) return '';
      const wrap=el('div',{class:'list'});
      items.sort((a,b)=>new Date(a.datetime)-new Date(b.datetime)).forEach(it=>{
        const item=el('div',{class:'item'});
        item.append(el('div',{class:'title'}, `${esc(it.title||'(ohne Titel)')} — ${esc(it.category||'')}`));
        const meta = [ fmtDate(it.datetime)+(it.endtime?('–'+it.endtime):''), Array.isArray(it.person)?it.person.join(', '):it.person, it.location||'—' ].filter(Boolean).join(' · ');
        item.append(el('div',{class:'meta'}, meta));
        const row=el('div',{class:'btnrow'});
        const e=el('button',{},'✏️ Bearbeiten'); const d=el('button',{}, it.status==='done'?'↩️ Rückgängig':'✅ Abhaken'); const a=el('button',{},'🗃️ Archivieren'); const c=el('button',{},'🧾 Bestätigen');
        e.onclick=()=>editor(it); d.onclick=()=>{ it.status=it.status==='done'?'upcoming':'done'; save(); route('list'); }; a.onclick=()=>{ it.status='archived'; save(); route('list'); }; c.onclick=()=>openConfirmDoc(it);
        row.append(e,d,a,c); item.append(row); wrap.append(item);
      });
      return wrap.outerHTML;
    }

    // ===== Confirmation Doc =====
    function openConfirmDoc(item){
      try{
        const d=new Date(item.datetime);
        const dateStr=d.toLocaleDateString('de-CH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
        const timeStr=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`+(item.endtime?`–${item.endtime}`:'');
        const persons = Array.isArray(item.person)?item.person.slice():(item.person?[item.person]:[]);
        if(!persons.map(p=>String(p).toLowerCase()).includes('joel weber')) persons.push('Joel Weber');
        const perDisp=persons.length?persons.join(', '):'—';
        const nowStr=new Date().toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'});
        const statusLabel=STATUS_LABEL[item.status]||item.status;
        const css=`@page{margin:16mm}body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;background:#0b1220;color:#e5e7eb;padding:24px}
        h1{margin:0 0 6px}.sub{color:#9fb1d0;margin:0 0 16px}.box{border:2px solid #3b82f6;border-radius:12px;background:#0f172a;padding:16px}
        .row{display:grid;grid-template-columns:160px 1fr;gap:10px;padding:6px 0;border-bottom:1px solid #1e293b}.row:last-child{border:0}
        .label{color:#9fb1d0}.badge{display:inline-block;border:1px solid #334155;border-radius:999px;padding:.1rem .5rem;font-size:.9rem}
        footer{display:flex;justify-content:space-between;margin-top:18px;color:#9fb1d0;font-size:.9rem}
        @media print{body{background:#fff;color:#000}.box{background:#fff;border-color:#1e90ff}}`;
        const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Terminbestätigung</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
        <body><h1>Terminbestätigung</h1><p class="sub">Bestätigung des folgenden Termins</p><div class="box">
        <div class="row"><div class="label">Titel</div><div><strong>${esc(item.title||'Termin')}</strong></div></div>
        <div class="row"><div class="label">Typ</div><div>Termin</div></div>
        <div class="row"><div class="label">Kategorie</div><div><span class="badge">${esc(item.category||'')}</span></div></div>
        <div class="row"><div class="label">Datum</div><div>${esc(dateStr)} – ${esc(timeStr)} Uhr</div></div>
        <div class="row"><div class="label">Person(en)</div><div>${esc(perDisp)}</div></div>
        <div class="row"><div class="label">Standort</div><div>${esc(item.location||'—')}</div></div>
        <div class="row"><div class="label">Status</div><div>${esc(statusLabel)}</div></div>
        <div class="row"><div class="label">Notizen</div><div>${esc(item.notes||'—')}</div></div>
        <div class="row"><div class="label">ID</div><div>${esc(item.id||'')}</div></div>
        </div><footer><div>Erstellt am ${esc(nowStr)}</div><div>Automatisch generiert durch TimeMate by J.W.</div></footer>
        <script>setTimeout(()=>window.print(),250)</script></body></html>`;
        const w=window.open('','_blank'); if(!w){ alert('Popup blockiert – bitte Popups erlauben.'); return; }
        w.document.open('text/html'); w.document.write(html); w.document.close();
      }catch(e){ console.error(e); alert('Konnte die Terminbestätigung nicht erzeugen.'); }
    }

    // Start
    route('overview');
  }
})();