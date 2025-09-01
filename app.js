
// ---- Global error banner ----
(function(){
  const css = ".err-banner{position:fixed;left:0;right:0;bottom:0;background:#fee2e2;color:#991b1b;padding:10px 14px;font:14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;z-index:9999;border-top:1px solid #fecaca} .err-banner code{white-space:pre-wrap}";
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  function showErr(msg){
    let b = document.querySelector('.err-banner');
    if(!b){ b = document.createElement('div'); b.className='err-banner'; document.body.appendChild(b); }
    b.innerHTML = "⚠️ <strong>App-Fehler:</strong> <code>"+String(msg)+"</code>";
  }
  window.addEventListener('error', (e)=> showErr(e.message || e.error || e));
  window.addEventListener('unhandledrejection', (e)=> showErr((e.reason && (e.reason.message||e.reason)) || e));
})();


/** TimeMate JW - Vanilla JS SPA with IndexedDB storage **/

const CATEGORIES = [
  "Spitex Heitersberg",
  "Psychologin / Therapie",
  "Töpferhaus",
  "Administrativ",
  "Geschäftlich",
  "Privat"
];

const CAT_META = {
  "Spitex Heitersberg": { key: "spitex", colorClass: "b-spitex", dot: "dot-spitex" },
  "Psychologin / Therapie": { key: "psy", colorClass: "b-psy", dot: "dot-psy" },
  "Töpferhaus": { key: "toepfer", colorClass: "b-toepfer", dot: "dot-toepfer" },
  "Administrativ": { key: "admin", colorClass: "b-admin", dot: "dot-admin" },
  "Geschäftlich": { key: "biz", colorClass: "b-biz", dot: "dot-biz" },
  "Privat": { key: "priv", colorClass: "b-priv", dot: "dot-priv" },
};

// Predefined options per category
const OPTIONS = {
  "Spitex Heitersberg": {
    persons: ["F. Völki", "A. Rudgers", "Andere"],
    locations: ["5000 Aarau", "5200 Brugg", "5442 Fislisbach", "5507 Mellingen"],
    multiPerson: false,
  },
  "Töpferhaus": {
    persons: ["Caroline Hanst", "Jeanine Haygis", "Sandra Schriber", "Andere"],
    locations: ["5000 Aarau - Bleichmattstr.", "5000 Aarau - Bachstr. 95"],
    multiPerson: false,
  },
  "Geschäftlich": {
    persons: ["Beatriz Häsler", "Helena Huser", "Jasmin Widmer", "Linda Flückiger", "Mathias Tomaske", "Svenja Studer"],
    locations: ["5000 Aarau", "3322 Schönbühl"],
    multiPerson: true,
  },
  "Administrativ": {
    persons: [],
    locations: ["5000 Aarau","5200 Brugg","5400 Baden","5405 Dättwil","5442 Fislisbach"],
    privPersons: []
  },
  "Privat": {
    persons: ["Aleks","Alina","Mama","Papa","Luana","Yulio"],
    locations: ["5000 Aarau","5200 Brugg","5400 Baden","5405 Dättwil","5442 Fislisbach"],
    privPersons: ["Aleks","Alina","Mama","Papa","Luana","Yulio"]
  }
};

// ---- IndexedDB minimal wrapper ----
const DB_NAME = "timematejw-db";
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains("appointments")) {
        const store = db.createObjectStore("appointments", { keyPath: "id" });
        store.createIndex("byCategory", "category", { unique: false });
        store.createIndex("byStatus", "status", { unique: false });
        store.createIndex("byDue", "datetime", { unique: false });
      }
      if (!db.objectStoreNames.contains("attachments")) {
        const a = db.createObjectStore("attachments", { keyPath: "id" });
        a.createIndex("byAppointment", "appointmentId", { unique: false });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeNames, mode = "readonly") {
  const t = db.transaction(storeNames, mode);
  const stores = storeNames.map(n => t.objectStore(n));
  return { t, stores };
}

function saveAppointment(appt) {
  return new Promise((resolve, reject) => {
    const { t, stores } = tx(["appointments"], "readwrite");
    stores[0].put(appt);
    t.oncomplete = () => resolve(appt);
    t.onerror = () => reject(t.error);
  });
}

function getAllAppointments() {
  return new Promise((resolve, reject) => {
    const { t, stores } = tx(["appointments"], "readonly");
    const req = stores[0].getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deleteAllAppointments() {
  return new Promise((resolve, reject) => {
    const { t, stores } = tx(["appointments","attachments"], "readwrite");
    stores[0].clear();
    stores[1].clear();
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}

function saveAttachments(attachmentList) {
  return new Promise((resolve, reject) => {
    if (!attachmentList || !attachmentList.length) return resolve();
    const { t, stores } = tx(["attachments"], "readwrite");
    attachmentList.forEach(a => stores[0].put(a));
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}

function getAttachmentsFor(appointmentId) {
  return new Promise((resolve, reject) => {
    const { t, stores } = tx(["attachments"], "readonly");
    const idx = stores[0].index("byAppointment");
    const req = idx.getAll(appointmentId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ---- Utilities ----
function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nowISO() { return new Date().toISOString(); }

// Auto-mark done (✓) if past due; after 72h move to archive
async function autoUpdateStatuses() {
  const all = await getAllAppointments();
  const now = new Date();
  const changed = [];
  for (const a of all) {
    const due = new Date(a.datetime);
    if (a.status !== 'archived' && now >= due) {
      if (a.status !== 'done') {
        a.status = 'done';
        a.completedAt = nowISO();
        changed.push(a);
      } else {
        // already done; check for archive threshold (72h after due)
        const seventyTwoH = 72 * 60 * 60 * 1000;
        if (now - due >= seventyTwoH && a.status !== 'archived') {
          a.status = 'archived';
          changed.push(a);
        }
      }
    }
  }
  for (const c of changed) await saveAppointment(c);
}

// ---- Routing ----
const view = document.getElementById('view');
const tabs = document.querySelectorAll('.tabs .tab');
tabs.forEach(btn => btn.addEventListener('click', () => route(btn.dataset.route)));

function setActiveTab(routeName) {
  tabs.forEach(b => b.classList.toggle('active', b.dataset.route === routeName));
}

async function route(name) {
  setActiveTab(name);
  if (name === 'overview') await renderOverview();
  if (name === 'new') await renderNew();
  if (name === 'list') await renderList();
  if (name === 'archive') await renderArchive();
  if (name === 'settings') await renderSettings();
  window.location.hash = name;
}

window.addEventListener('hashchange', () => {
  const r = location.hash.replace('#', '') || 'overview';
  route(r);
});

// ---- Renderers ----
async function renderOverview() {
  await autoUpdateStatuses();
  const tpl = document.getElementById('tpl-overview').content.cloneNode(true);
  const grid = tpl.querySelector('.grid');
  const all = await getAllAppointments();
  const upcoming = all.filter(a => a.status !== 'archived' && new Date(a.datetime) > new Date())
                      .sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
  CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'card';
    const meta = CAT_META[cat];
    const dot = `<span class="cat-dot ${meta.dot}"></span>`;
    const title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = `${dot} ${cat}`;
    card.appendChild(title);

    const next = upcoming.find(x => x.category === cat);
    if (next) {
      const line = document.createElement('div');
      const person = Array.isArray(next.person) ? next.person.join(', ') : (next.person || '—');
      line.innerHTML = `<span class="badge ${meta.colorClass}">Nächster</span> ${fmtDateTime(next.datetime)} · ${person} · ${next.location || ''}`;
      card.appendChild(line);
    } else {
      const emp = document.createElement('div');
      emp.className = 'empty';
      emp.innerHTML = `<span class="bang">!</span> <span>Kein Termin eingetragen</span>`;
      card.appendChild(emp);
    }

    grid.appendChild(card);
  });
  view.innerHTML = "";
  view.appendChild(tpl);
}

async function renderNew() {
  const tpl = document.getElementById('tpl-new').content.cloneNode(true);
  view.innerHTML = "";
  view.appendChild(tpl);

  const category = document.getElementById('category');
  const dyn = document.getElementById('dynamic-fields');
  category.addEventListener('change', () => fillDynamic(category.value, dyn));
  document.getElementById('new-form').addEventListener('submit', onSaveNew);
}

function fillDynamic(cat, root) {
  root.innerHTML = "";
  if (!cat) return;
  if (cat === "Spitex Heitersberg" || cat === "Töpferhaus") {
    const opts = OPTIONS[cat];
    root.appendChild(htmlLabel("Termin mit", selectWithOther("person", opts.persons)));
    root.appendChild(htmlLabel("Standort", makeSelect("location", opts.locations)));
  } else if (cat === "Geschäftlich") {
    const opts = OPTIONS[cat];
    root.appendChild(htmlLabel("Termin mit (Mehrfachauswahl)", makeMultiSelect("personMulti", opts.persons)));
    root.appendChild(htmlLabel("Standort", makeSelect("location", opts.locations)));
  } else if (cat === "Administrativ") {
    const opts = OPTIONS[cat];
    root.appendChild(htmlLabel("Person", inputWithDatalist("person", "", opts.locations, true)));
    root.appendChild(htmlLabel("Standort", inputWithDatalist("location", "", opts.locations)));
  } else if (cat === "Privat") {
    const opts = OPTIONS[cat];
    root.appendChild(htmlLabel("Person", inputWithDatalist("person", "", opts.persons)));
    root.appendChild(htmlLabel("Standort", inputWithDatalist("location", "", opts.locations)));
  } else if (cat === "Psychologin / Therapie") {
    root.appendChild(htmlLabel("Termin mit", makeInput("person", "Name")));
    root.appendChild(htmlLabel("Standort", makeInput("location", "Ort / Adresse")));
  }
}

function htmlLabel(text, el) {
  const label = document.createElement('label');
  label.textContent = text;
  label.appendChild(el);
  return label;
}

function makeSelect(id, options) {
  const sel = document.createElement('select');
  sel.id = id;
  sel.required = true;
  const ph = document.createElement('option');
  ph.value = ""; ph.disabled = true; ph.selected = true; ph.textContent = "Bitte wählen…";
  sel.appendChild(ph);
  options.forEach(o => {
    const op = document.createElement('option');
    op.value = o; op.textContent = o; sel.appendChild(op);
  });
  return sel;
}

function makeMultiSelect(id, options) {
  const sel = document.createElement('select');
  sel.id = id; sel.multiple = true; sel.size = Math.min(6, options.length);
  options.forEach(o => {
    const op = document.createElement('option');
    op.value = o; op.textContent = o; sel.appendChild(op);
  });
  return sel;
}

function selectWithOther(id, options) {
  const wrap = document.createElement('div');
  const sel = makeSelect(id, options);
  sel.addEventListener('change', () => {
    if (sel.value === "Andere") other.style.display = "block";
    else other.style.display = "none";
  });
  const other = makeInput(id + "-other", "Andere (Name)");
  other.style.display = "none";
  wrap.appendChild(sel);
  wrap.appendChild(other);
  return wrap;
}

function makeInput(id, placeholder="") {
  const inp = document.createElement('input');
  inp.type = "text"; inp.id = id; inp.placeholder = placeholder;
  return inp;
}

function inputWithDatalist(id, placeholder, list, allowFreeText=true) {
  const wrap = document.createElement('div');
  const inp = makeInput(id, placeholder);
  const dlId = id+"-dl";
  const dl = document.createElement('datalist');
  dl.id = dlId;
  list.forEach(v => {
    const o = document.createElement('option'); o.value = v; dl.appendChild(o);
  });
  inp.setAttribute('list', dlId);
  wrap.appendChild(inp);
  wrap.appendChild(dl);
  return wrap;
}

async function onSaveNew(ev) {
  ev.preventDefault();
  const cat = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  if (!cat || !date || !time) return alert("Bitte Kategorie, Datum und Uhrzeit angeben.");

  // round minutes to 5 just in case
  const [hh, mm] = time.split(":").map(Number);
  const rounded = Math.round(mm / 5) * 5;
  const fixedTime = `${String(hh).padStart(2,'0')}:${String(rounded).padStart(2,'0')}`;

  const notes = document.getElementById('notes').value.trim();

  let person = "";
  let location = "";

  if (cat === "Spitex Heitersberg" || cat === "Töpferhaus") {
    const pSel = document.getElementById('person');
    person = pSel.value === "Andere" ? document.getElementById('person-other').value.trim() : pSel.value;
    location = document.getElementById('location').value;
  } else if (cat === "Geschäftlich") {
    const pMul = Array.from(document.getElementById('personMulti').selectedOptions).map(o=>o.value);
    person = pMul; // array
    location = document.getElementById('location').value;
  } else {
    const p = document.getElementById('person');
    person = p ? p.value.trim() : "";
    const l = document.getElementById('location');
    location = l ? l.value.trim() : "";
  }

  const id = uuid();
  const dt = new Date(`${date}T${fixedTime}:00`);
  const appt = {
    id,
    category: cat,
    person,
    location,
    datetime: dt.toISOString(),
    notes,
    status: 'upcoming',
    createdAt: nowISO()
  };

  // Attachments
  const files = document.getElementById('attachments').files;
  const atts = [];
  for (const file of files) {
    const idA = uuid();
    const buf = await file.arrayBuffer();
    const blob = new Blob([buf], { type: file.type });
    atts.push({ id: idA, appointmentId: id, name: file.name, type: file.type, blob });
  }
  await openDB();
  await saveAppointment(appt);
  await saveAttachments(atts);

  alert("Termin gespeichert.");
  route('overview');
}

// List item rendering
async function renderList() {
  await autoUpdateStatuses();
  const tpl = document.getElementById('tpl-list').content.cloneNode(true);
  const container = tpl.getElementById ? tpl.getElementById('list-container') : tpl.querySelector('#list-container');
  const all = await getAllAppointments();
  all.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));

  if (!all.length) {
    const p = document.createElement('p');
    p.className = 'muted'; p.textContent = 'Keine Termine.';
    container.appendChild(p);
  }

  for (const a of all) {
    const meta = CAT_META[a.category];
    const item = document.createElement('div');
    item.className = 'item';
    const badge = `<span class="badge ${meta.colorClass}">${a.category}</span>`;
    const person = Array.isArray(a.person) ? a.person.join(', ') : (a.person || '—');
    item.innerHTML = `
      <div>${badge} ${fmtDateTime(a.datetime)} ${a.status === 'done' ? '✓' : ''} ${a.status === 'archived' ? '(Archiv)' : ''}</div>
      <div class="kv"><div>Person(en)</div><div>${person}</div></div>
      <div class="kv"><div>Standort</div><div>${a.location || '—'}</div></div>
      <div class="kv"><div>Notizen</div><div>${a.notes ? escapeHtml(a.notes) : '—'}</div></div>
      <div class="tags"></div>
      <div class="meta">Erstellt: ${fmtDateShort(a.createdAt)}</div>
    `;
    // attachments info
    const tags = item.querySelector('.tags');
    const btn = document.createElement('button');
    btn.textContent = "Anhänge anzeigen / speichern";
    btn.addEventListener('click', async () => {
      const atts = await getAttachmentsFor(a.id);
      if (!atts.length) return alert("Keine Anhänge.");
      for (const file of atts) {
        const url = URL.createObjectURL(file.blob);
        const link = document.createElement('a');
        link.href = url; link.download = file.name;
        link.textContent = `↧ ${file.name}`;
        link.style.display = "inline-block";
        link.style.marginRight = "10px";
        tags.appendChild(link);
      }
      btn.disabled = true;
    });
    item.appendChild(btn);
    container.appendChild(item);
  }

  view.innerHTML = "";
  view.appendChild(tpl);
}

async function renderArchive() {
  await autoUpdateStatuses();
  const tpl = document.getElementById('tpl-archive').content.cloneNode(true);
  const container = tpl.querySelector('#archive-container');
  const all = await getAllAppointments();
  const archived = all.filter(a => a.status === 'archived')
                      .sort((a,b) => new Date(b.datetime) - new Date(a.datetime));
  if (!archived.length) {
    const p = document.createElement('p');
    p.className = 'muted'; p.textContent = 'Archiv ist leer.';
    container.appendChild(p);
  }
  archived.forEach(a => {
    const meta = CAT_META[a.category];
    const item = document.createElement('div');
    item.className = 'item';
    const person = Array.isArray(a.person) ? a.person.join(', ') : (a.person || '—');
    item.innerHTML = `
      <div><span class="badge ${meta.colorClass}">${a.category}</span> ${fmtDateTime(a.datetime)} ✓</div>
      <div class="kv"><div>Person(en)</div><div>${person}</div></div>
      <div class="kv"><div>Standort</div><div>${a.location || '—'}</div></div>
      <div class="kv"><div>Notizen</div><div>${a.notes ? escapeHtml(a.notes) : '—'}</div></div>
    `;
    container.appendChild(item);
  });
  view.innerHTML = "";
  view.appendChild(tpl);
}

async function renderSettings() {
  const tpl = document.getElementById('tpl-settings').content.cloneNode(true);
  view.innerHTML = "";
  view.appendChild(tpl);

  document.getElementById('wipe').addEventListener('click', async () => {
    if (!confirm("Alle Termine & Anhänge dauerhaft löschen?")) return;
    await openDB();
    await deleteAllAppointments();
    alert("Alles gelöscht.");
    route('overview');
  });

  document.getElementById('export-csv').addEventListener('click', async () => {
    await exportCSV();
  });

  document.getElementById('export-pdf').addEventListener('click', async () => {
    await exportPrint();
  });
}

// Export as CSV (Excel-friendly)
async function exportCSV() {
  const rows = [["Kategorie","Datum","Uhrzeit","Person(en)","Standort","Notizen","Status"]];
  await openDB();
  const all = await getAllAppointments();
  all.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
  for (const a of all) {
    const d = new Date(a.datetime);
    const date = d.toLocaleDateString('de-CH');
    const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    const person = Array.isArray(a.person) ? a.person.join('; ') : (a.person || '');
    rows.push([a.category, date, time, person, a.location || "", a.notes?.replace(/\n/g, ' ') || "", a.status]);
  }
  const csv = rows.map(r => r.map(x => `"${(x||'').replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = "timemate-jw-export.csv"; a.click();
  URL.revokeObjectURL(url);
}

// Export as "PDF" via print view (works on iOS -> als PDF sichern)
async function exportPrint() {
  await openDB();
  const all = await getAllAppointments();
  const sorted = all.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
  const rows = sorted.map(a => {
    const d = fmtDateTime(a.datetime);
    const p = Array.isArray(a.person) ? a.person.join(', ') : (a.person || '—');
    return `<tr>
      <td>${a.category}</td>
      <td>${d}</td>
      <td>${escapeHtml(p)}</td>
      <td>${escapeHtml(a.location || '—')}</td>
      <td>${escapeHtml(a.notes || '—')}</td>
      <td>${a.status}</td>
    </tr>`;
  }).join("");

  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>TimeMate JW Export</title>
      <meta charset="utf-8">
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,Arial;padding:24px;}
        h1{font-size:18px;margin:0 0 12px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#f3f4f6}
      </style>
    </head><body>
      <h1>TimeMate JW – Export ${new Date().toLocaleString('de-CH')}</h1>
      <table>
        <thead><tr><th>Kategorie</th><th>Datum & Uhrzeit</th><th>Person(en)</th><th>Standort</th><th>Notizen</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>setTimeout(()=>window.print(), 300);</script>
    </body></html>
  `);
  win.document.close();
}

// ---- Helpers ----
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

// ---- App init ----

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await openDB();
    // Bind tab clicks safely
    const tabButtons = document.querySelectorAll('.tabs .tab');
    tabButtons.forEach(btn => btn.addEventListener('click', () => route(btn.dataset.route)));
    // initial route
    const r = location.hash.replace('#', '') || 'overview';
    route(r);
  } catch (e) {
    console.error(e);
    alert("Fehler beim Starten der App: " + (e.message||e));
  }
});

