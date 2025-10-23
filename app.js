(function () {
  // ===== Boot =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    const view = document.getElementById('view');
    if (!view) return;

    // ===== Constants / Labels =====
    const CAT_UNCAT = 'Unkategorisiert';
    const DEFAULT_CATS = [
      { key: 'Spitex Heitersberg', css: 'Spitex' },
      { key: 'Psychologin / Therapie', css: 'Psych' },
      { key: 'Töpferhaus', css: 'Töpferhaus' },
      { key: 'Genossenschaft Migros Aare', css: 'Geschäftlich' },
      { key: 'Administrativ', css: 'Administrativ' },
      { key: 'Privat', css: 'Privat' },
      { key: 'HKV Aarau', css: 'HKV' },
      { key: 'Persönlich', css: 'HKV' }
    ];

    const STATUS_LABEL = {
      upcoming: 'Bevorstehend',
      done: 'Erledigt',
      archived: 'Archiviert'
    };

    // ===== Storage =====
    let CATS_ALL = JSON.parse(localStorage.getItem('tmjw_cats_all') || 'null') || DEFAULT_CATS;
    const saveCats = () => localStorage.setItem('tmjw_cats_all', JSON.stringify(CATS_ALL));

    let contacts = JSON.parse(localStorage.getItem('tmjw_contacts') || '[]');
    const saveContacts = () => localStorage.setItem('tmjw_contacts', JSON.stringify(contacts));

    // {catName: "Hauptadresse"}
    let catAddr = JSON.parse(localStorage.getItem('tmjw_cat_addr') || '{}');
    const saveCatAddr = () => localStorage.setItem('tmjw_cat_addr', JSON.stringify(catAddr));

    // Items
    const state = { items: JSON.parse(localStorage.getItem('tmjw_state') || '[]') };
    const save = () => localStorage.setItem('tmjw_state', JSON.stringify(state.items));

    // ===== Utilities =====
    const byId = id => document.getElementById(id);
    const el = (t, attrs = {}, text) => {
      const n = document.createElement(t);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fullName = c => `${c.vorname||''} ${c.name||''}`.trim();
    const personsForCategory = cat => contacts.filter(c => c.kategorie === cat).map(fullName);
    const fmtDate = iso => new Date(iso).toLocaleString('de-CH',{dateStyle:'medium', timeStyle:'short'});

    // ===== Router =====
    function route(name, arg) {
      document.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.route === name));
      if (name === 'overview') return overview();
      if (name === 'new') return editor(arg);
      if (name === 'list') return listView();
      if (name === 'tasks') return tasksView();
      if (name === 'archive') return archiveView();
      if (name === 'settings') return settingsView();
      if (name === 'contacts') return contactsView();
    }
    document.querySelectorAll('.tabs .tab').forEach(b => b.addEventListener('click', () => route(b.dataset.route)));
    // Add "Kontakte" tab if missing
    (function addContactsTab(){
      const nav = document.querySelector('.tabs');
      if (!nav) return;
      if (!nav.querySelector('[data-route="contacts"]')) {
        const btn = el('button', { class:'tab', 'data-route':'contacts', type:'button' }, 'Kontakte');
        btn.addEventListener('click', ()=>route('contacts'));
        nav.appendChild(btn);
      }
      // Rename "Liste" -> "Termine" (rein optisch)
      const listBtn = [...nav.querySelectorAll('.tab')].find(b=>b.dataset.route==='list');
      if (listBtn) listBtn.textContent = 'Termine';
    })();

    // ===== Views =====
    function overview(){
      view.innerHTML = `
        <section class="panel">
          <h2>Termine</h2>
          ${renderItems(state.items.filter(i=>i.type!=='Aufgabe' && i.status!=='archived')) || '<p class="meta">Nichts vorhanden.</p>'}
        </section>
        <hr class="sep">
        <section class="panel">
          <h2>Aufgaben</h2>
          ${renderItems(state.items.filter(i=>i.type==='Aufgabe' && i.status!=='archived')) || '<p class="meta">Nichts vorhanden.</p>'}
        </section>
      `;
    }

    function listView(){
      const items = state.items.filter(i=>i.type!=='Aufgabe' && i.status!=='archived');
      view.innerHTML = `<section class="panel"><h2>Termine</h2>${renderItems(items) || '<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }

    function tasksView(){
      const items = state.items.filter(i=>i.type==='Aufgabe' && i.status!=='archived');
      view.innerHTML = `<section class="panel"><h2>Aufgaben</h2>${renderItems(items) || '<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }

    function archiveView(){
      const items = state.items.filter(i=>i.status==='archived');
      view.innerHTML = `<section class="panel"><h2>Archiv</h2>${renderItems(items) || '<p class="meta">Nichts vorhanden.</p>'}</section>`;
    }

    function settingsView(){
      view.innerHTML = `
        <section class="panel">
          <h2>Einstellungen</h2>
          <div class="box">
            <div class="row"><div class="label">Hauptadresse pro Kategorie</div>
              <div>
                <select id="catSel"></select>
                <input id="catAddrInput" placeholder="Adresse…">
                <button id="saveCatAddr" type="button">Speichern</button>
              </div>
            </div>
          </div>
        </section>
      `;

      const sel = byId('catSel');
      CATS_ALL.forEach(c=> sel.append(el('option',{},c.key)));
      const addrInp = byId('catAddrInput');
      const fill = ()=> addrInp.value = catAddr[sel.value] || '';
      sel.addEventListener('change', fill);
      fill();
      byId('saveCatAddr').addEventListener('click', ()=>{
        catAddr[sel.value] = addrInp.value.trim();
        saveCatAddr();
        alert('Hauptadresse gespeichert.');
      });
    }

    function contactsView(){
      // Simple read-only list for diese Version
      view.innerHTML = `
        <section class="panel">
          <h2>Kontakte</h2>
          <div class="btnrow">
            <button id="addC" class="primary" type="button">+ Neuer Kontakt</button>
          </div>
          <div id="clist"></div>
        </section>
      `;
      const clist = byId('clist');
      const draw = ()=>{
        clist.innerHTML = '';
        if (!contacts.length) { clist.innerHTML = '<p class="meta">Keine Kontakte.</p>'; return; }
        contacts.forEach(c=>{
          const row = el('div',{class:'row'});
          row.append(el('div',{class:'label'}, fullName(c) || '(ohne Namen)'));
          const right = el('div');
          const editB = el('button',{},'Bearbeiten');
          const delB = el('button',{},'Löschen');
          editB.onclick = ()=> editContact(c);
          delB.onclick = ()=>{
            if (confirm('Kontakt löschen?')){
              contacts = contacts.filter(x=>x!==c);
              saveContacts(); draw();
            }
          };
          right.append(editB, delB);
          row.append(right);
          clist.append(row);
        });
      };
      draw();
      byId('addC').onclick = ()=> editContact(null);
    }

    function editContact(contact){
      const c = contact ? {...contact} : {id:String(Date.now()), vorname:'', name:'', kategorie: CATS_ALL[0]?.key || CAT_UNCAT, adresse:''};
      view.innerHTML = `
        <section class="panel">
          <h2>Kontakt ${contact?'bearbeiten':'anlegen'}</h2>
          <div class="box">
            <div class="row"><div class="label">Vorname</div><div><input id="c_vn" value="${esc(c.vorname)}"></div></div>
            <div class="row"><div class="label">Name</div><div><input id="c_nn" value="${esc(c.name)}"></div></div>
            <div class="row"><div class="label">Kategorie</div><div><select id="c_cat"></select></div></div>
            <div class="row"><div class="label">Adresse</div><div><input id="c_addr" value="${esc(c.adresse||'')}"></div></div>
          </div>
          <div class="btnrow">
            <button id="saveC" class="primary">Speichern</button>
            <button id="cancelC">Abbrechen</button>
          </div>
        </section>
      `;
      const sel = byId('c_cat');
      CATS_ALL.forEach(k=> sel.append(el('option',{},k.key)));
      sel.value = c.kategorie;
      byId('saveC').onclick = ()=>{
        c.vorname = byId('c_vn').value.trim();
        c.name    = byId('c_nn').value.trim();
        c.kategorie = sel.value;
        c.adresse = byId('c_addr').value.trim();
        if (contact){
          Object.assign(contact, c);
        } else {
          contacts.push(c);
        }
        saveContacts();
        contactsView();
      };
      byId('cancelC').onclick = ()=> contactsView();
    }

    function editor(editing){
      // Build form
      view.innerHTML = `
        <section class="panel">
          <h2>${editing?'Termin bearbeiten':'Neuer Termin'}</h2>
          <div class="box">
            <div class="row"><div class="label">Titel</div><div><input id="t_title"></div></div>
            <div class="row"><div class="label">Kategorie</div><div><select id="t_cat"></select></div></div>
            <div class="row"><div class="label">Person</div><div><select id="t_person"></select></div></div>
            <div class="row"><div class="label">Beginn</div><div><input id="t_date" type="date"> <input id="t_time" type="time"></div></div>
            <div class="row"><div class="label">Ende (optional)</div><div><input id="t_endtime" type="time" placeholder="—"></div></div>
            <div class="row"><div class="label">Standort</div><div>
              <select id="t_locpick"></select>
              <input id="t_location" placeholder="Standort/Adresse" style="margin-top:6px">
            </div></div>
            <div class="row"><div class="label">Notizen</div><div><textarea id="t_notes" rows="4"></textarea></div></div>
          </div>
          <div class="btnrow">
            <button id="saveT" class="primary">Speichern</button>
            <button id="cancelT">Abbrechen</button>
          </div>
        </section>
      `;
      const selCat = byId('t_cat');
      const selPer = byId('t_person');
      const selLoc = byId('t_locpick');
      const inpLoc = byId('t_location');

      // Fill selects
      CATS_ALL.forEach(c=> selCat.append(el('option',{},c.key)));
      function fillPersons(){
        selPer.innerHTML='';
        const persons = personsForCategory(selCat.value);
        ['Andere', ...persons].forEach(p=> selPer.append(el('option',{},p)));
      }
      function fillLocationPicker(){
        selLoc.innerHTML='';
        const opts = [];
        const h = catAddr[selCat.value];
        if (h) opts.push({v:'__haupt__', t:`Hauptadresse (${h})`, addr:h});
        // collect unique addresses from contacts of that category
        const addrSet = new Set();
        contacts.filter(c=>c.kategorie===selCat.value && c.adresse).forEach(c=>addrSet.add(c.adresse));
        [...addrSet].forEach(a=> opts.push({v:`c:${a}`, t:a, addr:a}));
        opts.push({v:'__other__', t:'Andere…', addr:''});
        opts.forEach(o=> selLoc.append(el('option',{value:o.v},o.t)));
      }
      function syncLocInput(){
        const v = selLoc.value;
        if (v==='__other__' || v==='') {
          inpLoc.disabled=false;
          if (v==='__other__' && !inpLoc.value) inpLoc.focus();
        } else {
          const a = v==='__haupt__' ? (catAddr[selCat.value] || '') : v.slice(2);
          inpLoc.value = a; inpLoc.disabled=true;
        }
      }

      selCat.addEventListener('change', ()=>{ fillPersons(); fillLocationPicker(); syncLocInput(); });
      selLoc.addEventListener('change', syncLocInput);
      fillPersons(); fillLocationPicker(); syncLocInput();

      // Prefill editing
      if (editing){
        byId('t_title').value = editing.title || '';
        selCat.value = editing.category || selCat.value;
        fillPersons();
        const personVal = Array.isArray(editing.person)? editing.person.join(', ') : (editing.person||'Andere');
        selPer.value = personsForCategory(selCat.value).includes(personVal)? personVal : 'Andere';
        const d = new Date(editing.datetime);
        byId('t_date').value = d.toISOString().slice(0,10);
        byId('t_time').value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        if (editing.endtime) byId('t_endtime').value = editing.endtime;
        inpLoc.value = editing.location || '';
        byId('t_notes').value = editing.notes || '';
      }

      byId('cancelT').onclick = ()=> route('overview');

      byId('saveT').onclick = ()=>{
        const title = byId('t_title').value.trim();
        const cat = selCat.value || CAT_UNCAT;
        const date = byId('t_date').value;
        const time = byId('t_time').value;
        if (!title || !date || !time) { alert('Bitte Titel, Kategorie, Datum und Uhrzeit angeben.'); return; }
        const person = selPer.value === 'Andere' ? 'Andere' : selPer.value;
        const dt = new Date(`${date}T${time}:00`).toISOString();
        const obj = {
          id: editing? editing.id : String(Date.now()),
          type: 'Termin',
          title, category: cat, person,
          datetime: dt,
          endtime: byId('t_endtime').value || '', // optional
          location: inpLoc.value.trim(),
          notes: byId('t_notes').value.trim(),
          attachments: [],
          status: editing ? editing.status : 'upcoming'
        };
        if (editing) { Object.assign(editing, obj); }
        else { state.items.push(obj); }
        save();
        alert('Gespeichert.');
        route('list');
      };
    }

    function renderItems(items){
      if (!items.length) return '';
      const sorted = [...items].sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
      const wrapper = document.createElement('div');
      sorted.forEach(it=>{
        const row = el('div', {class:'row'});
        const left = el('div');
        left.append(el('div',{}, `${it.title} — ${it.category}`));
        left.append(el('div',{class:'meta'}, `${fmtDate(it.datetime)}${it.endtime? '–'+it.endtime : ''} · ${it.person||''}`));
        if (it.location) left.append(el('div',{class:'meta'}, it.location));
        row.append(left);
        const right = el('div');
        const btnE = el('button',{},'Bearbeiten'); btnE.onclick = ()=> editor(it);
        const btnD = el('button',{}, it.status==='done'?'Rückgängig':'Abhaken'); btnD.onclick = ()=>{ it.status = it.status==='done'?'upcoming':'done'; save(); route('list'); };
        const btnA = el('button',{},'Archivieren'); btnA.onclick = ()=>{ it.status='archived'; save(); route('list'); };
        const btnC = el('button',{},'Bestätigen'); btnC.onclick = ()=> openConfirmDoc(it);
        right.append(btnE, btnD, btnA, btnC);
        row.append(right);
        wrapper.append(row);
      });
      return wrapper.outerHTML;
    }

    // ===== Confirm Document =====
    function openConfirmDoc(item){
      try{
        const d = new Date(item.datetime);
        const dateStr = d.toLocaleDateString('de-CH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` + (item.endtime? `–${item.endtime}`: '');
        const perDisp = Array.isArray(item.person) ? item.person.join(', ') : (item.person || '');
        const nowStr = new Date().toLocaleString('de-CH',{dateStyle:'short', timeStyle:'short'});
        const statusLabel = STATUS_LABEL[item.status] || item.status;
        const title = item.title || 'Termin';

        const css = `
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto; background:#f7fafc; color:#111827; padding:28px;}
          h1{margin:0 0 6px;}
          .sub{color:#6b7280; margin:0 0 16px;}
          .box{border:2px solid #1e90ff; border-radius:12px; background:#fff; padding:16px;}
          .row{display:grid; grid-template-columns:140px 1fr; gap:10px; padding:6px 0; border-bottom:1px solid #eef2f7;}
          .row:last-child{border:0}
          .label{color:#6b7280}
          .badge{display:inline-block; border:1px solid #e5e7eb; border-radius:999px; padding:.1rem .5rem; font-size:.9rem}
          footer{display:flex; justify-content:space-between; margin-top:18px; color:#6b7280; font-size:.9rem}
          @media print{ body{padding:0} footer{position:fixed; bottom:16px; left:28px; right:28px} }
        `;

        const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Terminbestätigung</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
<body>
  <h1>Terminbestätigung</h1>
  <p class="sub">Bestätigung des folgenden Termins</p>
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
  <footer>
    <div>Erstellt am ${esc(nowStr)}</div>
    <div>Automatisch generiert durch TimeMate by J.W.</div>
  </footer>
  <script>setTimeout(()=>window.print(), 250)</script>
</body></html>`;

        const w = window.open('', '_blank');
        if(!w){ alert('Popup blockiert – bitte Popups erlauben.'); return; }
        w.document.open('text/html'); w.document.write(html); w.document.close();
      }catch(e){ console.error(e); alert('Konnte die Terminbestätigung nicht erzeugen.'); }
    }

    // ===== Start =====
    route('overview');
  }
})();
