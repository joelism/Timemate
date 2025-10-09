
// TimeMate by J.W. – minimal SPA + Dark UI + Tabs
(function(){
  const view = document.getElementById('view');
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Kategorie -> CSS Klasse
  const CAT_CSS = {
    'Spitex Heitersberg': 'cat-Spitex',
    'Psychologin / Therapie': 'cat-Psych',
    'Töpferhaus': 'cat-Toepferhaus',
    'Genossenschaft Migros Aare': 'cat-GMA',
    'Administrativ': 'cat-Administrativ',
    'Privat': 'cat-Privat',
    'HKV Aarau': 'cat-HKV',
    'Persönlich': 'cat-Persoenlich'
  };

  // Demo-Daten falls leer
  const LS = 'tmjw_items';
  let items = []; try{ items = JSON.parse(localStorage.getItem(LS))||[]; }catch(e){ items=[]; }
  if (!items.length){
    items = [
      {id:'1', type:'Termin', title:'Gesprächstermin', category:'Spitex Heitersberg', person:['A. Rudgers'], location:'5442 Fislisbach', datetime:new Date(Date.now()+3*86400000).toISOString(), status:'upcoming'},
      {id:'2', type:'Termin', title:'Fallbeurteilung', category:'Psychologin / Therapie', person:['Dr. Ulrich Geissendörfer'], location:'Täfernstrasse 207, Dättwil', datetime:new Date(Date.now()+10*86400000).toISOString(), status:'upcoming'},
      {id:'3', type:'Termin', title:'Wohnungsübergabe', category:'Töpferhaus', person:['—'], location:'Aarau – Bachstr. 95', datetime:new Date(Date.now()+6*86400000).toISOString(), status:'upcoming'}
    ];
    localStorage.setItem(LS, JSON.stringify(items));
  }

  function fmt(iso){ return new Date(iso).toLocaleString('de-CH', {dateStyle:'medium', timeStyle:'short'}); }

  function setActive(route){
    $$('.tabs .tab').forEach(b=>b.classList.toggle('active', b.dataset.route===route));
  }

  // Routing
  window.route = function(route){
    setActive(route);
    if (route==='overview') return renderOverview();
    if (route==='new') return renderForm();
    if (route==='list') return renderList();
    if (route==='tasks') return renderTasks();
    if (route==='contacts') return renderContacts();
    if (route==='settings') return renderSettings();
  }

  function renderOverview(){
    view.innerHTML = '<h2>Termine</h2>';
    const cont = document.createElement('div');
    items.filter(x=>x.type!=='Aufgabe' && x.status!=='archived')
         .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime))
         .forEach(a=>cont.appendChild(card(a)));
    if(!cont.children.length) cont.innerHTML = '<p class="meta">Keine Termine.</p>';
    view.appendChild(cont);
  }

  function renderList(){
    view.innerHTML = '<h2>Termine</h2>';
    const cont = document.createElement('div');
    items.filter(x=>x.type!=='Aufgabe' && x.status!=='archived')
         .sort((a,b)=>new Date(a.datetime)-new Date(b.datetime))
         .forEach(a=>cont.appendChild(card(a)));
    view.appendChild(cont);
  }

  function renderForm(){
    view.innerHTML = '<h2>Neuer Eintrag</h2><p class="meta">Platzhalter – Formular kommt später.</p>';
  }
  function renderTasks(){ view.innerHTML = '<h2>Aufgaben</h2><p class="meta">Keine Aufgaben.</p>'; }
  function renderContacts(){ view.innerHTML = '<h2>Kontakte</h2><p class="meta">Kontaktverwaltung folgt.</p>'; }
  function renderSettings(){ view.innerHTML = '<h2>Einstellungen</h2><p class="meta">Darkmode aktiv. PWA ist installiert.</p>'; }

  function card(a){
    const d = document.createElement('div'); d.className='card';
    if (CAT_CSS[a.category]) d.classList.add(CAT_CSS[a.category]);
    d.innerHTML = `<div class="title">${escapeHtml(a.category)}</div>
      <div>${escapeHtml(a.title||'')}</div>
      <div class="meta" style="margin-top:6px">${escapeHtml(fmt(a.datetime))} · ${escapeHtml(Array.isArray(a.person)?a.person.join(', '):(a.person||''))} · ${escapeHtml(a.location||'')}</div>`;
    const row = document.createElement('div'); row.className='btnrow';
    const b1 = document.createElement('button'); b1.textContent='☑️ Abhaken'; b1.onclick=()=>{ a.status=a.status==='done'?'upcoming':'done'; save(); route('overview'); };
    const b2 = document.createElement('button'); b2.textContent='↪ Archivieren'; b2.onclick=()=>{ a.status='archived'; save(); route('overview'); };
    row.append(b1,b2); d.append(row);
    return d;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function save(){ localStorage.setItem(LS, JSON.stringify(items)); }

  // Init tabs
  (function initTabs(){
    const tabs = document.querySelector('.tabs');
    const order = [
      ['overview','Übersicht'],
      ['new','Neuer Eintrag'],
      ['list','Termine'],
      ['tasks','Aufgaben'],
      ['contacts','Kontakte'],
      ['settings','Einstellungen']
    ];
    tabs.innerHTML = '';
    order.forEach(([route,label],i)=>{
      const b=document.createElement('button');
      b.className='tab'+(i===0?' active':'');
      b.dataset.route=route; b.textContent=label; b.type='button';
      b.addEventListener('click', ()=>window.route(route));
      tabs.appendChild(b);
    });
  })();

  // Start
  window.route('overview');
})();
