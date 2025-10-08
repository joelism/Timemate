(function () {
  const v = document.getElementById('view');
  const byId = id => document.getElementById(id);

  // ====== Konstanten / Kategorien ======
  const CAT_GMA = 'Genossenschaft Migros Aare';
  const CAT_UNCAT = 'Unkategorisiert';

  const DEFAULT_CATS = [
    { key: 'Spitex Heitersberg', css: 'Spitex' },
    { key: 'Psychologin / Therapie', css: 'Psych' },
    { key: 'Töpferhaus', css: 'Töpferhaus' },
    { key: CAT_GMA, css: 'Geschäftlich' },
    { key: 'Administrativ', css: 'Administrativ' },
    { key: 'Privat', css: 'Privat' },
    { key: 'HKV Aarau', css: 'HKV' },
    { key: 'Persönlich', css: 'Persönlich' }
  ];

  let CATS_ALL = JSON.parse(localStorage.getItem('tmjw_cats_all') || 'null') || DEFAULT_CATS;
  const saveCats = () => localStorage.setItem('tmjw_cats_all', JSON.stringify(CATS_ALL));

  // ====== Theme ======
  if ((localStorage.getItem('tmjw_theme') || 'light') === 'dark') {
    document.documentElement.classList.add('dark');
  }

  // ====== Darkmode Styles & Tabs Scrollbar ======
  (function ensureDarkStyles() {
    const MARK_ID = 'tmjw-dark-style';
    if (document.getElementById(MARK_ID)) return;
    const css = `
      .dark {
        --bg:#0f172a; --fg:#f8fafc; --muted:#94a3b8; --primary:#38bdf8; --danger:#f87171; --border:#334155; --card:#1e293b;
      }
      body { background: var(--bg); color: var(--fg); }
      .app-header { background: var(--card); border-bottom: 1px solid var(--border); }
      .tab, input, select, textarea, button, .item, .card {
        background: var(--card); color: var(--fg); border-color: var(--border);
      }
      .muted { color: var(--muted); }
      .tabs { display: flex; gap: 8px; margin-top: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; }
      .tab { flex: 0 0 auto; white-space: nowrap; }
    `;
    const style = document.createElement('style');
    style.id = MARK_ID;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ====== Speicher ======
  const state = { items: JSON.parse(localStorage.getItem('tmjw_state') || '[]') };
  const save = () => localStorage.setItem('tmjw_state', JSON.stringify(state.items));

  const fmt = iso => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
  const fmtDMY_forPDF = iso => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}` };
  };

  function autoUpdate() {
    const now = Date.now();
    let changed = false;
    state.items.forEach(a => {
      const due = new Date(a.datetime).getTime();
      if (a.status !== 'archived' && now >= due && a.status !== 'done') {
        a.status = 'done'; changed = true;
      }
      if (a.status !== 'archived' && now - due > 3 * 24 * 60 * 60 * 1000) {
        a.status = 'archived'; changed = true;
      }
    });
    if (changed) save();
  }

  // ====== PDF / Terminbestätigung ======
  function openConfirmationPDF(entry) {
    try {
      const { date, time } = fmtDMY_forPDF(entry.datetime);
      const title = (entry.title || '(ohne Titel)').replace(/[<>]/g, '');
      const participants = ['Joel Weber', ...(Array.isArray(entry.person) ? entry.person : (entry.person ? [entry.person] : []))].join(', ');
      const location = (entry.location || '').replace(/[<>]/g, '');
      const html = `
      <!doctype html><html><head><meta charset="utf-8"><title>Terminbestätigung</title>
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
          <div class="row"><span class="label">Datum & Uhrzeit</span><div>${date} • ${time}</div></div>
          ${location ? `<div class="row"><span class="label">Ort</span><div>${location}</div></div>` : ''}
        </div>
        <div class="footer">Diese Terminbestätigung wurde automatisch von TimeMate by J.W. erstellt.</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),100)</script>
      </body></html>`;
      const w = window.open('', '_blank', 'noopener');
      if (!w) { alert('Popup blockiert – bitte erlauben.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e) { console.error('PDF-Fehler', e); alert('Konnte die Terminbestätigung nicht erstellen.'); }
  }

  // ====== Navigation ======
  function route(name, arg) {
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.route === name));
    if (name === 'overview') return overview();
    if (name === 'new') return form(arg);
    if (name === 'tasks') return tasksView();
  }

  // ====== Tabs anpassen ======
  (function adjustTabs() {
    const nav = document.querySelector('.tabs');
    if (!nav) return;
    const newBtn = [...nav.querySelectorAll('.tab')].find(b => b.dataset.route === 'new');
    if (newBtn) newBtn.textContent = 'Neuer Eintrag';
    if (!nav.querySelector('[data-route="tasks"]')) {
      const t = document.createElement('button');
      t.className = 'tab';
      t.dataset.route = 'tasks';
      t.textContent = 'Aufgaben';
      t.onclick = () => route('tasks');
      nav.appendChild(t);
    }
  })();

  // ====== Übersicht ======
  function overview() {
    autoUpdate();
    v.innerHTML = '<section><h2>Übersicht</h2></section>';
    state.items.filter(a => a.status !== 'archived').forEach(a => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<div><strong>${a.title}</strong><br>${fmt(a.datetime)}</div>`;
      const row = document.createElement('div');
      row.className = 'btnrow';
      const edit = document.createElement('button');
      edit.textContent = '✏️ Bearbeiten';
      edit.onclick = () => route('new', a.id);
      const pdf = document.createElement('button');
      pdf.textContent = '🧾 Bestätigung';
      pdf.onclick = () => openConfirmationPDF(a);
      row.append(edit, pdf);
      div.append(row);
      v.append(div);
    });
  }

  // ====== Aufgaben ======
  function tasksView() {
    v.innerHTML = '<section><h2>Aufgaben</h2></section>';
  }

  // ====== Formular ======
  function form(editId) {
    const editing = editId ? state.items.find(x => x.id === editId) : null;
    v.innerHTML = '';
    const s = document.createElement('section');
    s.innerHTML = `<h2>${editing ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>`;
    const title = document.createElement('input');
    title.id = 'title';
    title.placeholder = 'Titel';
    if (editing) title.value = editing.title;
    s.append(title);
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Speichern';
    saveBtn.onclick = () => {
      const val = title.value.trim();
      if (!val) return alert('Titel fehlt');
      if (editing) editing.title = val; else state.items.push({ id: String(Date.now()), title: val, datetime: new Date().toISOString(), status: 'upcoming' });
      save(); overview();
    };
    s.append(saveBtn);

    if (editing) {
      const pdf = document.createElement('button');
      pdf.textContent = '🧾 Terminbestätigung (PDF)';
      pdf.onclick = () => openConfirmationPDF(editing);
      s.append(pdf);
      setTimeout(() => openConfirmationPDF(editing), 200);
    }

    v.append(s);
  }

  document.querySelectorAll('.tabs .tab').forEach(b => b.addEventListener('click', () => route(b.dataset.route)));
  route('overview');
})();
