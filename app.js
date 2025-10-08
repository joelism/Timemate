(function () {
  // ===== Basics =====
  const byId = (id) => document.getElementById(id);
  const view = byId('view');

  // Robust: falls #view fehlt, breche ab
  if (!view) {
    console.error('TimeMate: Element #view nicht gefunden.');
    return;
  }

  // ===== Darkmode styling (nur, wenn html.dark gesetzt ist) =====
  (function ensureDarkStyles() {
    if (!document.documentElement.classList.contains('dark')) return;
    if (document.getElementById('tmjw-dark-style')) return;
    const css = `
    .dark {
      --bg:#0f172a; --fg:#f8fafc; --muted:#94a3b8; --primary:#38bdf8; --danger:#f87171; --border:#334155; --card:#1e293b;
    }
    body{background:var(--bg);color:var(--fg)}
    .app-header{background:var(--card);border-bottom:1px solid var(--border)}
    .tab,input,select,textarea,button,.item,.card{background:var(--card);color:var(--fg);border-color:var(--border)}
    .muted{color:var(--muted)}
    .tabs{display:flex;gap:8px;margin-top:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
    .tab{flex:0 0 auto;white-space:nowrap}
    .item,.card{border:1px solid var(--border);border-radius:14px;padding:12px}
    `;
    const style = document.createElement('style');
    style.id = 'tmjw-dark-style';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ===== State =====
  const LS_KEY = 'tmjw_state';
  const state = {
    items: safeParse(localStorage.getItem(LS_KEY), []),
  };
  function safeParse(s, fallback) {
    try { const x = JSON.parse(s); return Array.isArray(fallback) && !Array.isArray(x) ? fallback : (x ?? fallback); }
    catch { return fallback; }
  }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(state.items)); }

  // ===== Utils =====
  const esc = (s) => String(s ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt = (iso) => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
  function fmtDMY(iso) {
    const d=new Date(iso);
    const dd=String(d.getDate()).padStart(2,'0');
    const mm=String(d.getMonth()+1).padStart(2,'0');
    const yyyy=d.getFullYear();
    const hh=String(d.getHours()).padStart(2,'0');
    const mi=String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }
  function autoUpdate() {
    const now = Date.now();
    let ch = false;
    state.items.forEach(a => {
      const due = new Date(a.datetime || Date.now()).getTime();
      if (a.status !== 'archived' && now >= due && a.status !== 'done') { a.status = 'done'; ch = true; }
      if (a.status !== 'archived' && now - due > 3*24*60*60*1000) { a.status = 'archived'; ch = true; }
    });
    if (ch) save();
  }

  // ===== PDF / Terminbestätigung =====
  function openConfirmationPDF(entry) {
    try {
      const title = (entry.title || '(ohne Titel)').replace(/[<>]/g,'');
      const persons = Array.isArray(entry.person) ? entry.person : (entry.person ? [entry.person] : []);
      const participants = ['Joel Weber', ...persons].join(', ');
      const when = fmtDMY(entry.datetime || new Date().toISOString());
      const location = (entry.location || '').replace(/[<>]/g,'');
      const html = `
<!doctype html><html><head><meta charset="utf-8"><title>Terminbestätigung</title>
<style>
  @page{size:A4;margin:20mm}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial;color:#0f172a}
  .head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  .logo{width:40px;height:40px;border-radius:8px}
  h1{margin:8px 0 14px 0;font-size:28px}
  .box{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f8fafc}
  .row{margin:8px 0}.label{color:#64748b;font-size:12px;display:block}
  .footer{margin-top:18px;color:#64748b;font-size:12px}
</style></head><body>
  <div class="head">
    <img class="logo" src="icons/icon-180x180.png" alt="TimeMate Logo">
    <div><strong>TimeMate by J.W.</strong></div>
  </div>
  <h1>Terminbestätigung</h1>
  <div class="box">
    <div class="row"><span class="label">Termin</span><div>${esc(title)}</div></div>
    <div class="row"><span class="label">Teilnehmer</span><div>${esc(participants)}</div></div>
    <div class="row"><span class="label">Datum & Uhrzeit</span><div>${esc(when)}</div></div>
    ${location ? `<div class="row"><span class="label">Ort</span><div>${esc(location)}</div></div>` : ''}
  </div>
  <div class="footer">Diese Terminbestätigung wurde automatisch von TimeMate by J.W. erstellt.</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),100)</script>
</body></html>`;
      const w = window.open('', '_blank', 'noopener');
      if (!w) { alert('Popup blockiert – bitte erlauben.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e) {
      console.error('PDF-Fehler', e);
      alert('Konnte die Terminbestätigung nicht erstellen.');
    }
  }

  // ===== Routen =====
  function route(name, arg) {
    document.querySelectorAll('.tabs .tab').forEach(b => {
      b.classList.toggle('active', (b.dataset.route || '').toLowerCase() === name);
    });
    if (name === 'overview') return renderOverview();
    if (name === 'new') return renderForm(arg);
    if (name === 'list') return renderList();
    if (name === 'archive') return renderArchive();
    if (name === 'settings') return renderSettings();
    if (name === 'tasks') return renderTasks();
    // Fallback
    renderOverview();
  }

  // ===== UI Helper =====
  function btn(label, onclick) { const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=onclick; return b; }
  function itemCard(contentEl, actions=[]) {
    const it = document.createElement('div'); it.className='item';
    it.appendChild(contentEl);
    if (actions.length) {
      const row=document.createElement('div'); row.className='btnrow'; actions.forEach(a=>row.appendChild(a)); it.appendChild(row);
    }
    return it;
  }

  // ===== Views =====
  function renderOverview() {
    autoUpdate();
    view.innerHTML = '<section><h2>Termine</h2><div id="cards"></div></section>';
    const cont = byId('cards');
    const upcoming = state.items
      .filter(x => (x.type || 'Termin') !== 'Aufgabe' && x.status !== 'archived')
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));

    if (!upcoming.length) {
      cont.innerHTML = '<p class="muted">Keine Termine.</p>';
      return;
    }

    upcoming.forEach(a => {
      const c = document.createElement('div');
      c.innerHTML = `<div class="title">${esc(a.title || '(ohne Titel)')}</div>
        <div>${esc(fmt(a.datetime))}${a.location ? ' · ' + esc(a.location) : ''}</div>
        ${a.person ? `<div>Person(en): ${esc(Array.isArray(a.person)?a.person.join(', '):a.person)}</div>` : ''}`;
      cont.appendChild(itemCard(c, [
        btn('☑️ Abhaken', () => { a.status = a.status==='done' ? 'upcoming' : 'done'; save(); renderOverview(); }),
        btn('↪ Archivieren', () => { a.status='archived'; save(); renderOverview(); }),
        btn('✏️ Bearbeiten', () => route('new', a.id)),
        btn('🧾 Bestätigung', () => openConfirmationPDF(a)),
      ]));
    });
  }

  function renderList() {
    autoUpdate();
    view.innerHTML = '<section><h2>Liste (alle offenen Termine)</h2><div id="lst"></div></section>';
    const cont = byId('lst');
    const arr = state.items.filter(a => (a.type||'Termin')!=='Aufgabe' && a.status!=='archived')
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    if (!arr.length) { cont.innerHTML = '<p class="muted">Keine Einträge.</p>'; return; }
    arr.forEach(a => {
      const c=document.createElement('div');
      c.innerHTML=`<div class="title">${esc(a.title||'(ohne Titel)')}</div><div>${esc(fmt(a.datetime))}</div>`;
      cont.appendChild(itemCard(c, [
        btn('✏️ Bearbeiten', () => route('new', a.id)),
        btn('🧾 Bestätigung', () => openConfirmationPDF(a)),
      ]));
    });
  }

  function renderArchive() {
    autoUpdate();
    view.innerHTML = '<section><h2>Archiv</h2><div id="arch"></div></section>';
    const cont = byId('arch');
    const arr = state.items.filter(a => a.status==='archived')
      .sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
    if (!arr.length) { cont.innerHTML = '<p class="muted">Archiv ist leer.</p>'; return; }
    arr.forEach(a => {
      const c=document.createElement('div');
      c.innerHTML=`<div class="title">${esc(a.title||'(ohne Titel)')}</div><div>${esc(fmt(a.datetime))}</div>`;
      cont.appendChild(itemCard(c, [
        btn('↩ Zurückholen', () => { a.status='upcoming'; save(); renderArchive(); }),
        btn('🧾 Bestätigung', () => openConfirmationPDF(a)),
      ]));
    });
  }

  function renderSettings() {
    view.innerHTML = `<section><h2>Einstellungen</h2>
      <div class="btnrow">
        <button id="expJson" type="button">Termine → JSON exportieren</button>
        <button id="impJsonBtn" type="button">Termine importieren (JSON)</button>
        <input id="impJson" type="file" accept="application/json" style="display:none">
      </div>
    </section>`;
    byId('expJson').onclick = () => {
      const blob = new Blob([JSON.stringify(state.items,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='TimeMate_Termine.json'; a.click(); URL.revokeObjectURL(url);
    };
    const file = byId('impJson');
    byId('impJsonBtn').onclick = ()=>file.click();
    file.onchange = async () => {
      if (!file.files || !file.files[0]) return;
      try {
        const txt = await file.files[0].text();
        const data = JSON.parse(txt);
        if (Array.isArray(data)) { state.items = data; save(); alert('Import erfolgreich'); renderOverview(); }
        else alert('Ungültiges Format');
      } catch { alert('Konnte Datei nicht lesen'); }
    };
  }

  function renderTasks() {
    autoUpdate();
    view.innerHTML = '<section><h2>Aufgaben</h2><div id="tasks"></div></section>';
    const cont = byId('tasks');
    const arr = state.items.filter(a => (a.type||'Termin')==='Aufgabe' && a.status!=='archived')
      .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
    if (!arr.length) { cont.innerHTML = '<p class="muted">Keine Aufgaben.</p>'; return; }
    arr.forEach(a => {
      const c=document.createElement('div');
      c.innerHTML=`<div class="title">${esc(a.title||'(ohne Titel)')}</div><div>${esc(fmt(a.datetime))}</div>`;
      cont.appendChild(itemCard(c, [
        btn(a.status==='done'?'Als offen markieren':'☑️ Abhaken', ()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); renderTasks(); }),
        btn('↪ Archivieren', ()=>{ a.status='archived'; save(); renderTasks(); }),
        btn('✏️ Bearbeiten', ()=>route('new', a.id)),
      ]));
    });
  }

  function renderForm(editId) {
    const editing = editId ? state.items.find(x=>x.id===editId) : null;
    view.innerHTML = '';
    const s = document.createElement('section');
    const h = document.createElement('h2');
    h.textContent = editing ? 'Eintrag bearbeiten' : 'Neuer Eintrag';
    s.appendChild(h);

    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Art';
    const selType = document.createElement('select');
    ['Termin','Aufgabe'].forEach(t=>{ const o=document.createElement('option'); o.textContent=t; selType.appendChild(o); });
    if (editing) selType.value = editing.type || 'Termin';
    typeLabel.appendChild(selType); s.appendChild(typeLabel);

    const tLabel = document.createElement('label');
    tLabel.textContent = 'Titel';
    const inputTitle = document.createElement('input'); inputTitle.type='text'; inputTitle.placeholder='Titel';
    if (editing) inputTitle.value = editing.title || '';
    tLabel.appendChild(inputTitle); s.appendChild(tLabel);

    const dRow = document.createElement('div'); dRow.style.display='flex'; dRow.style.gap='10px';
    const lDate = document.createElement('label'); lDate.textContent='Datum';
    const iDate = document.createElement('input'); iDate.type='date';
    const lTime = document.createElement('label'); lTime.textContent='Uhrzeit';
    const iTime = document.createElement('input'); iTime.type='time';
    if (editing && editing.datetime) {
      const d = new Date(editing.datetime);
      iDate.value = d.toISOString().slice(0,10);
      iTime.value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    lDate.appendChild(iDate); lTime.appendChild(iTime); dRow.append(lDate,lTime); s.appendChild(dRow);

    const pLabel = document.createElement('label');
    pLabel.textContent='Person(en)';
    const iPerson = document.createElement('input'); iPerson.placeholder='z.B. Tina Bauer';
    iPerson.value = editing ? (Array.isArray(editing.person)?editing.person.join(', '):(editing.person||'')) : '';
    pLabel.appendChild(iPerson); s.appendChild(pLabel);

    const locLabel = document.createElement('label');
    locLabel.textContent='Ort';
    const iLoc = document.createElement('input'); iLoc.placeholder='Ort / Adresse';
    iLoc.value = editing ? (editing.location || '') : '';
    locLabel.appendChild(iLoc); s.appendChild(locLabel);

    const notesLabel = document.createElement('label');
    notesLabel.textContent='Notizen';
    const ta = document.createElement('textarea'); ta.rows = 3; ta.value = editing ? (editing.notes||'') : '';
    notesLabel.appendChild(ta); s.appendChild(notesLabel);

    const saveBtn = btn(editing ? 'Änderungen speichern' : 'Speichern', () => {
      const title = inputTitle.value.trim();
      const date = iDate.value;
      const time = iTime.value || '00:00';
      if (!title || !date) { alert('Bitte mindestens Titel und Datum angeben.'); return; }
      const dt = new Date(`${date}T${time}:00`);
      const obj = {
        id: editing ? editing.id : String(Date.now()),
        type: selType.value,
        title,
        datetime: dt.toISOString(),
        person: iPerson.value ? iPerson.value.split(',').map(s=>s.trim()).filter(Boolean) : [],
        location: iLoc.value.trim(),
        notes: ta.value,
        status: editing ? (editing.status||'upcoming') : 'upcoming'
      };
      if (editing) {
        const idx = state.items.findIndex(x=>x.id===editing.id);
        if (idx>=0) state.items[idx] = obj;
      } else {
        state.items.push(obj);
      }
      save();
      route('overview');
    });
    s.appendChild(saveBtn);

    if (editing && (editing.type || 'Termin') !== 'Aufgabe') {
      const pdfBtn = btn('🧾 Terminbestätigung (PDF)', () => openConfirmationPDF(editing));
      s.appendChild(pdfBtn);
      // Auto-öffnen
      setTimeout(()=>openConfirmationPDF(editing), 150);
    }

    view.appendChild(s);
  }

  // ===== Tabs initialisieren =====
  (function initTabs() {
    const nav = document.querySelector('.tabs');
    if (!nav) return;

    // „Neuer Termin“ → „Neuer Eintrag“
    const newBtn = [...nav.querySelectorAll('.tab')].find(b => (b.dataset.route||'')==='new');
    if (newBtn) newBtn.textContent = 'Neuer Eintrag';

    // Aufgaben-Tab hinzufügen, falls er fehlt
    if (![...nav.querySelectorAll('.tab')].some(b => (b.dataset.route||'')==='tasks')) {
      const t = document.createElement('button');
      t.className = 'tab';
      t.dataset.route = 'tasks';
      t.textContent = 'Aufgaben';
      t.type = 'button';
      t.addEventListener('click', () => route('tasks'));
      // vor Einstellungen einfügen, wenn vorhanden
      const settingsBtn = [...nav.querySelectorAll('.tab')].find(b => (b.dataset.route||'')==='settings');
      settingsBtn ? nav.insertBefore(t, settingsBtn) : nav.appendChild(t);
    }

    // Click-Handler
    [...nav.querySelectorAll('.tab')].forEach(b => {
      b.addEventListener('click', () => route((b.dataset.route||'overview').toLowerCase()));
    });
  })();

  // ===== Start =====
  route('overview');
})();
