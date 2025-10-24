/* TimeMate By J.W. — app.js (UI wie Original + neue Funktionen) */
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }

  function init() {
    const view = document.getElementById('view'); if(!view) return;

    const CAT_UNCAT='Unkategorisiert';
    const DEFAULT_CATS=[
      {key:'Spitex Heitersberg',css:'Spitex'},
      {key:'Psychologin / Therapie',css:'Psych'},
      {key:'Töpferhaus',css:'Töpferhaus'},
      {key:'Genossenschaft Migros Aare',css:'Geschäftlich'},
      {key:'Administrativ',css:'Administrativ'},
      {key:'Privat',css:'Privat'},
      {key:'HKV Aarau',css:'HKV'},
      {key:'Persönlich',css:'HKV'}
    ];
    const STATUS_LABEL={upcoming:'Bevorstehend',done:'Erledigt',archived:'Archiviert'};

    let CATS_ALL=JSON.parse(localStorage.getItem('tmjw_cats_all')||'null')||DEFAULT_CATS;
    const saveCats=()=>localStorage.setItem('tmjw_cats_all',JSON.stringify(CATS_ALL));

    let contacts=JSON.parse(localStorage.getItem('tmjw_contacts')||'[]');
    const saveContacts=()=>localStorage.setItem('tmjw_contacts',JSON.stringify(contacts));
    let catAddr=JSON.parse(localStorage.getItem('tmjw_cat_addr')||'{}');
    const saveCatAddr=()=>localStorage.setItem('tmjw_cat_addr',JSON.stringify(catAddr));
    const state={items:JSON.parse(localStorage.getItem('tmjw_state')||'[]')};
    const save=()=>localStorage.setItem('tmjw_state',JSON.stringify(state.items));

    const el=(t,a={},txt)=>{const n=document.createElement(t);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));if(txt!==undefined)n.textContent=txt;return n;};
    const byId=id=>document.getElementById(id);
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtDate=iso=>{const d=new Date(iso);return d.toLocaleDateString('de-CH')+', '+d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});};
    const personsForCategory=cat=>contacts.filter(c=>c.kategorie===cat).map(c=>`${c.vorname||''} ${c.name||''}`.trim()).filter(Boolean);

    function route(name,arg){
      document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.toggle('active', b.dataset.route===name));
      if(name==='overview') return overview();
      if(name==='new') return editor(arg);
      if(name==='list') return listView();
      if(name==='tasks') return tasksView();
      if(name==='archive') return archiveView();
      if(name==='settings') return settingsView();
      if(name==='contacts') return contactsView();
    }
    document.querySelectorAll('.tabs .tab').forEach(b=>b.addEventListener('click',()=>route(b.dataset.route)));
    (function enhanceTabs(){
      const nav=document.querySelector('.tabs'); if(!nav) return;
      const listBtn=[...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='list'); if(listBtn) listBtn.textContent='Termine';
      if(!nav.querySelector('[data-route="contacts"]')){ const btn=el('button',{class:'tab','data-route':'contacts',type:'button'},'Kontakte'); btn.addEventListener('click',()=>route('contacts')); nav.appendChild(btn); }
    })();

    function overview(){
      view.innerHTML = `
        <section><h2>Termine</h2>${renderItems(state.items.filter(i=>i.type!=='Aufgabe'&&i.status!=='archived'))||'<p class="meta">Nichts vorhanden.</p>'}</section>
        <div class="sep"></div>
        <section><h2>Aufgaben</h2>${renderItems(state.items.filter(i=>i.type==='Aufgabe'&&i.status!=='archived'))||'<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }
    function listView(){ const items=state.items.filter(i=>i.type!=='Aufgabe'&&i.status!=='archived'); view.innerHTML=`<section><h2>Termine</h2>${renderItems(items)||'<p class="meta">Nichts vorhanden.</p>'}</section>`; }
    function tasksView(){ const items=state.items.filter(i=>i.type==='Aufgabe'&&i.status!=='archived'); view.innerHTML=`<section><h2>Aufgaben</h2>${renderItems(items)||'<p class="meta">Nichts vorhanden.</p>'}</section>`; }
    function archiveView(){ const items=state.items.filter(i=>i.status==='archived'); view.innerHTML=`<section><h2>Archiv</h2>${renderItems(items)||'<p class="meta">Nichts vorhanden.</p>'}</section>`; }

    function settingsView(){
      view.innerHTML=`
        <section><h2>Einstellungen</h2>
          <div class="card">
            <label>Hauptadresse pro Kategorie</label>
            <div class="row">
              <select id="catSel"></select>
              <input id="catAddrInput" placeholder="Adresse…">
              <button id="saveCatAddr" type="button">Speichern</button>
            </div>
          </div>
        </section>`;
      const sel=byId('catSel'); CATS_ALL.forEach(c=>sel.append(el('option',{},c.key)));
      const addr=byId('catAddrInput'); const fill=()=>addr.value=catAddr[sel.value]||''; sel.addEventListener('change',fill); fill();
      byId('saveCatAddr').onclick=()=>{ catAddr[sel.value]=(addr.value||'').trim(); saveCatAddr(); alert('Hauptadresse gespeichert.'); };
    }

    function contactsView(){
      view.innerHTML=`<section><h2>Kontakte</h2>
        <div class="btnrow"><button id="addC" class="primary" type="button">+ Neuer Kontakt</button></div>
        <div id="clist" class="list"></div></section>`;
      const clist=byId('clist');
      const draw=()=>{
        clist.innerHTML='';
        if(!contacts.length){ clist.innerHTML='<p class="meta">Keine Kontakte.</p>'; return; }
        contacts.forEach(c=>{
          const it=el('div',{class:'item'});
          it.append(el('div',{class:'title'},`${c.vorname||''} ${c.name||''}`.trim()||'(ohne Namen)'));
          const row=el('div',{class:'btnrow'});
          const e=el('button',{},'Bearbeiten'); const d=el('button',{},'Löschen');
          e.onclick=()=>editContact(c); d.onclick=()=>{ if(confirm('Kontakt löschen?')){ contacts=contacts.filter(x=>x!==c); saveContacts(); draw(); } };
          row.append(e,d); it.append(row); clist.append(it);
        });
      }; draw(); byId('addC').onclick=()=>editContact(null);
    }

    function editContact(contact){
      const c = contact ? {...contact} : {id:String(Date.now()), vorname:'', name:'', kategorie:CATS_ALL[0]?.key||CAT_UNCAT, adresse:''};
      view.innerHTML=`<section><h2>Kontakt ${contact?'bearbeiten':'anlegen'}</h2>
        <div class="card">
          <label>Vorname<input id="c_vn" value="${esc(c.vorname)}"></label>
          <label>Name<input id="c_nn" value="${esc(c.name)}"></label>
          <label>Kategorie<select id="c_cat"></select></label>
          <label>Adresse<input id="c_addr" value="${esc(c.adresse||'')}"></label>
        </div>
        <div class="btnrow"><button id="saveC" class="primary">Speichern</button><button id="cancelC">Abbrechen</button></div></section>`;
      const sel=byId('c_cat'); CATS_ALL.forEach(k=>sel.append(el('option',{},k.key))); sel.value=c.kategorie;
      byId('saveC').onclick=()=>{ c.vorname=byId('c_vn').value.trim(); c.name=byId('c_nn').value.trim(); c.kategorie=sel.value; c.adresse=byId('c_addr').value.trim();
        if(contact){ Object.assign(contact,c);} else { contacts.push(c); } saveContacts(); contactsView(); };
      byId('cancelC').onclick=()=>contactsView();
    }

    function editor(editing){
      view.innerHTML=`<section><h2>${editing?'Termin bearbeiten':'Neuer Termin'}</h2>
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
      <div class="btnrow"><button id="saveT" class="primary">Speichern</button><button id="cancelT">Abbrechen</button></div>
      </section>`;

      const selCat=byId('t_cat'), selPer=byId('t_person'), selLoc=byId('t_locpick'), inpLoc=byId('t_location');

      CATS_ALL.forEach(c=>selCat.append(el('option',{},c.key)));

      function fillPersons(){ selPer.innerHTML=''; const arr=personsForCategory(selCat.value); ['Andere',...arr].forEach(p=>selPer.append(el('option',{},p))); }
      function fillLocationPicker(){
        selLoc.innerHTML='';
        const opts=[]; const h=catAddr[selCat.value]; if(h) opts.push({v:'__haupt__',t:`Hauptadresse (${h})`});
        const set=new Set(); contacts.filter(c=>c.kategorie===selCat.value && c.adresse).forEach(c=>set.add(c.adresse));
        [...set].forEach(a=>opts.push({v:`c:${a}`,t:a}));
        opts.push({v:'__other__',t:'Andere…'});
        opts.forEach(o=>selLoc.append(el('option',{value:o.v},o.t)));
      }
      function syncLocInput(){
        const v=selLoc.value;
        if(v==='__other__' || v===''){
          inpLoc.disabled=false; if(v==='__other__' && !inpLoc.value) inpLoc.focus();
        } else {
          const a=v==='__haupt__' ? (catAddr[selCat.value]||'') : v.slice(2);
          inpLoc.value=a; inpLoc.disabled=true;
        }
      }
      selCat.addEventListener('change',()=>{ fillPersons(); fillLocationPicker(); syncLocInput(); });
      selLoc.addEventListener('change',syncLocInput);
      fillPersons(); fillLocationPicker(); syncLocInput();

      if(editing){
        byId('t_title').value=editing.title||'';
        selCat.value=editing.category||selCat.value; fillPersons();
        const pVal=Array.isArray(editing.person)?editing.person[0]:(editing.person||'Andere');
        selPer.value=personsForCategory(selCat.value).includes(pVal)?pVal:'Andere';
        const d=new Date(editing.datetime); byId('t_date').value=d.toISOString().slice(0,10);
        byId('t_time').value=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        if(editing.endtime) byId('t_endtime').value=editing.endtime;
        inpLoc.value=editing.location||''; byId('t_notes').value=editing.notes||'';
      }

      byId('cancelT').onclick=()=>route('overview');
      byId('saveT').onclick=()=>{
        const title=byId('t_title').value.trim();
        const cat=selCat.value||CAT_UNCAT; const date=byId('t_date').value; const time=byId('t_time').value;
        if(!title||!date||!time){ alert('Bitte Titel, Kategorie, Datum und Uhrzeit angeben.'); return; }
        const dt=new Date(`${date}T${time}:00`).toISOString();
        const obj={ id:editing?editing.id:String(Date.now()), type:'Termin', title, category:cat, person:selPer.value, datetime:dt, endtime:byId('t_endtime').value||'', location:(inpLoc.value||'').trim(), notes:byId('t_notes').value.trim(), attachments:[], status:editing?editing.status:'upcoming' };
        if(editing){ Object.assign(editing,obj);} else { state.items.push(obj); } save(); route('list');
      };
    }

    function renderItems(items){
      if(!items.length) return '';
      const wrap=document.createElement('div'); wrap.className='list';
      items.sort((a,b)=>new Date(a.datetime)-new Date(b.datetime)).forEach(it=>{
        const card=el('div',{class:'item'});
        card.append(el('div',{class:'title'}, `${it.title||'(ohne Titel)'} — ${it.category||''}`));
        const meta=[fmtDate(it.datetime)+(it.endtime?`–${it.endtime}`:''), Array.isArray(it.person)?it.person.join(', '):it.person, it.location].filter(Boolean).join(' · ');
        card.append(el('div',{class:'meta'}, meta));
        const row=el('div',{class:'btnrow'});
        const bE=el('button',{},'Bearbeiten'); bE.onclick=()=>editor(it);
        const bD=el('button',{}, it.status==='done'?'Rückgängig':'Abhaken'); bD.onclick=()=>{ it.status=it.status==='done'?'upcoming':'done'; save(); route('list'); };
        const bA=el('button',{},'Archivieren'); bA.onclick=()=>{ it.status='archived'; save(); route('list'); };
        const bC=el('button',{},'Bestätigen'); bC.onclick=()=>openConfirmDoc(it);
        row.append(bE,bD,bA,bC); card.append(row); wrap.append(card);
      });
      return wrap.outerHTML;
    }

    function openConfirmDoc(item){
      try{
        const d=new Date(item.datetime);
        const dateStr=d.toLocaleDateString('de-CH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
        const timeStr=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`+(item.endtime?`–${item.endtime}`:'');
        const persons = Array.isArray(item.person)?item.person.slice():(item.person?[item.person]:[]);
        if(!persons.map(p=>String(p).toLowerCase()).includes('joel weber')) persons.push('Joel Weber');
        const perDisp=persons.length?persons.join(', '):'—';
        const nowStr=new Date().toLocaleString('de-CH',{dateStyle:'medium',timeStyle:'short'});
        const statusLabel=STATUS_LABEL[item.status]||item.status;
        const title=item.title||'Termin';
        const css=`@page{margin:18mm}body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a}h1{margin:0 0 6px;font-size:22px}.meta{color:#475569;margin-bottom:10px}.box{border:1px solid #3b82f6;border-radius:12px;padding:14px}.row{display:grid;grid-template-columns:160px 1fr;gap:8px;margin:6px 0}.label{color:#64748b}footer{margin-top:24px;font-size:12px;color:#64748b}.badge{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:12px}.small{font-size:12px}`;
        const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Terminbestätigung</title><style>${css}</style></head><body>
        <h1>Terminbestätigung</h1><div class="meta">Bestätigung des folgenden Termins</div>
        <div class="box">
          <div class="row"><div class="label">Titel</div><div><strong>${esc(title)}</strong></div></div>
          <div class="row"><div class="label">Typ</div><div>Termin</div></div>
          <div class="row"><div class="label">Kategorie</div><div><span class="badge">${esc(item.category||'')}</span></div></div>
          <div class="row"><div class="label">Datum</div><div>${esc(dateStr)} – ${esc(timeStr)} Uhr</div></div>
          <div class="row"><div class="label">Person(en)</div><div>${esc(perDisp)}</div></div>
          <div class="row"><div class="label">Standort</div><div>${esc(item.location||'—')}</div></div>
          <div class="row"><div class="label">Status</div><div>${esc(statusLabel)}</div></div>
          <div class="row"><div class="label">Notizen</div><div>${esc(item.notes||'—')}</div></div>
          <div class="row small"><div class="label">ID</div><div>${esc(item.id||'')}</div></div>
        </div>
        <footer><div>Erstellt am ${esc(nowStr)}</div><div>Automatisch generiert durch TimeMate by J.W.</div></footer>
        <script>setTimeout(function(){window.print()},250)</script></body></html>`;
        const w=window.open('','_blank'); if(!w){ alert('Popup blockiert – bitte Popups erlauben.'); return; }
        w.document.open('text/html'); w.document.write(html); w.document.close();
      }catch(e){ console.error('Bestätigung fehlgeschlagen',e); alert('Konnte die Terminbestätigung nicht erzeugen.'); }
    }

    // Start
    route('overview');
  }
})();