
(function(){
  'use strict';

  // Lightweight error overlay
  (function(){
    function showErr(msg){
      try{
        var box = document.getElementById('err');
        if(!box){
          box = document.createElement('div'); box.id='err';
          box.style.position='fixed'; box.style.left='12px'; box.style.right='12px';
          box.style.bottom='12px'; box.style.zIndex='99999'; box.style.padding='12px 14px';
          box.style.borderRadius='12px'; box.style.background='rgba(220,53,69,.12)';
          box.style.color='#b00020'; box.style.backdropFilter='blur(6px)'; 
          box.style.boxShadow='0 4px 16px rgba(0,0,0,.15)';
          document.body.appendChild(box);
        }
        box.hidden=false; box.textContent=String(msg);
      }catch(_){}
    }
    window.addEventListener('error', e => showErr('JS-Fehler: ' + (e && e.message ? e.message : 'unbekannt')));
    window.addEventListener('unhandledrejection', e => showErr('Promise-Fehler: ' + (e && e.reason ? (e.reason.message||e.reason) : 'unbekannt')));
  })();

  const byId = (id)=>document.getElementById(id);
  const el = (tag, attrs, ...kids)=>{
    const n=document.createElement(tag);
    if(attrs) for(const [k,v] of Object.entries(attrs)) (v!==null && v!==undefined) && n.setAttribute(k, String(v));
    kids.forEach(k=> n.append(k && k.nodeType? k : document.createTextNode(k??'')));
    return n;
  };
  const esc = s => String(s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const fmt = iso => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
  const fmtRange = (startIso, endIso) => {
    try{
      const s = new Date(startIso);
      const startDate = s.toLocaleDateString('de-CH', { dateStyle: 'medium' });
      const startTime = s.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' });
      if(!endIso) return `${startDate}, ${startTime}`;
      const e = new Date(endIso);
      if(isNaN(e.getTime())) return `${startDate}, ${startTime}`;
      const sameDay = s.toDateString() === e.toDateString();
      const endTime = e.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' });
      if(sameDay) return `${startDate}, ${startTime}–${endTime}`;
      const endDate = e.toLocaleDateString('de-CH', { dateStyle: 'medium' });
      return `${startDate}, ${startTime} → ${endDate}, ${endTime}`;
    }catch(_){ return fmt(startIso); }
  };

  // State
  const v = byId('view');
  const state = { items: JSON.parse(localStorage.getItem('tmjw_state') || '[]') };
  const save  = () => localStorage.setItem('tmjw_state', JSON.stringify(state.items));

  function route(name, arg){
    document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.toggle('active', b.dataset.route===name));
    if(name==='overview') return ov();
    if(name==='new')      return form(arg);
    if(name==='list')     return listView();
    if(name==='tasks')    return tasksView();
    if(name==='archive')  return archiveView();
    if(name==='settings') return settingsView();
    return ov();
  }

  function bootTabs(){
    document.querySelectorAll('.tabs .tab').forEach(b=>{
      b.addEventListener('click', ()=> route(b.dataset.route));
    });
  }

  
function ov(){
    v.innerHTML='';
    const wrap=el('section');
    wrap.append(el('h2',{},'Termine'));
    const upcoming=state.items
      .filter(x=>x.type!=='Aufgabe' && x.status!=='archived')
      .sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));

    // Gruppieren nach Kategorie
    const groups = new Map();
    upcoming.forEach(a=>{
      const k = a.category && String(a.category).trim() ? a.category : 'Ohne Kategorie';
      if(!groups.has(k)) groups.set(k, []);
      groups.get(k).push(a);
    });

    const grid=el('div',{class:'grid'});
    if(groups.size===0){
      grid.append(el('div',{class:'card'}, el('div',{class:'title'},'Keine Termine'), el('div',{},'Lege einen neuen Eintrag an.')));
    } else {
      for(const [cat, arr] of groups){
        const card=el('div',{class:'card cat-'+cat});
        const head=el('div',{class:'title'}, cat);
        card.append(head);
        arr.slice(0,6).forEach(a=>{
          const row=el('div',{});
          row.innerHTML = `<div>${esc(a.title||'(ohne Titel)')}</div>
                           <div style="font-size:14px;color:var(--muted)">${esc(fmtRange(a.datetime, a.endDatetime))}${a.location? ' · '+esc(a.location):''}</div>`;
          card.append(row);
        });
        grid.append(card);
      }
    }
    wrap.append(grid);
    v.append(wrap);
  }
;

    s.append(f);
    v.append(s);
  }

  function settingsView(){
    v.innerHTML='';
    const s = el('section'); s.append(el('h2',{},'Einstellungen'));

    // Export JSON
    const expJ = el('button', {type:'button'}, 'Termine als JSON exportieren');
    expJ.onclick = ()=> downloadBlob('TimeMateJW_Termine.json','application/json;charset=utf-8', JSON.stringify(state.items,null,2));
    s.append(expJ);

    // Import JSON
    const impJ = el('input',{type:'file',accept:'.json'});
    impJ.onchange = async()=>{
      const f=impJ.files && impJ.files[0]; if(!f) return;
      const txt = await f.text();
      try{
        const data = JSON.parse(txt);
        if(Array.isArray(data)){ mergeItems(data); alert('Termine (JSON) importiert.'); route('overview'); }
      }catch(e){ alert('Ungültiges JSON: '+e.message); }
    };
    s.append(el('div',{style:'margin-top:8px'}, el('label',{}, 'Import JSON: '), impJ));

    // Export CSV
    const expC = el('button',{type:'button',style:'margin-top:12px'},'Termine als CSV exportieren');
    expC.onclick = ()=> downloadBlob('TimeMateJW_Termine.csv','text/csv;charset=utf-8', exportCSV(state.items));
    s.append(expC);

    // Import CSV
    const impC = el('input',{type:'file',accept:'.csv'});
    impC.onchange = async()=>{
      const f=impC.files && impC.files[0]; if(!f) return;
      const txt = await f.text();
      importCSV(txt);
    };
    s.append(el('div',{style:'margin-top:8px'}, el('label',{}, 'Import CSV: '), impC));

    v.append(s);
  }

  function exportCSV(items){
    const rows=[['Typ','Titel','Kategorie','Datum','Uhrzeit','Endzeit','Person(en)','Standort','Notizen','Status','Anhänge','ID']];
    items.slice().sort((a,b)=>new Date(a.datetime)-new Date(b.datetime)).forEach(a=>{
      const d=new Date(a.datetime);
      const date=d.toLocaleDateString('de-CH'); 
      const time=d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
      const te=a.endDatetime? new Date(a.endDatetime).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}) : '';
      const per=Array.isArray(a.person)?a.person.join('; '):(a.person||'');
      const files=(a.attachments||[]).map(x=>x.name||'').join('; ');
      rows.push([a.type||'Termin',a.title||'',a.category||'',date,time,te,per,a.location||'',String(a.notes||'').replace(/\n/g,' '),a.status||'upcoming',files,a.id||'']);
    });
    return rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  }

  function importCSV(text){
    const lines=text.split(/\r?\n/).filter(x=>x.trim().length);
    if(lines.length<2){ alert('CSV ist leer.'); return; }
    const header = lines[0].split(';').map(h=>h.replace(/^"|"$/g,'').trim());
    const idx = name => header.indexOf(name);
    const rows = [];
    for(let i=1;i<lines.length;i++){
      const cells = lines[i].match(/("([^"]|"")*"|[^;]*)/g).map(c=>c.replace(/^"|"$/g,'').replace(/""/g,'"'));
      const obj = {
        type:      cells[idx('Typ')]||'Termin',
        title:     cells[idx('Titel')]||'',
        category:  cells[idx('Kategorie')]||'',
        date:      cells[idx('Datum')]||'',
        time:      cells[idx('Uhrzeit')]||'',
        end:       idx('Endzeit')>=0 ? (cells[idx('Endzeit')]||'') : '',
        person:    cells[idx('Person(en)')]||'',
        location:  cells[idx('Standort')]||'',
        notes:     cells[idx('Notizen')]||'',
        status:    cells[idx('Status')]||'upcoming',
        id:        cells[idx('ID')]||String(Date.now()+Math.random())
      };
      let dt; try{ const [d,m,y]=obj.date.split('.'); dt = new Date(`${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${(obj.time||'00:00')}:00`);}catch(_){ dt=new Date(); }
      let dtEnd=null; if(obj.end){ try{ const [d,m,y]=obj.date.split('.'); dtEnd = new Date(`${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${obj.end}:00`);}catch(_){ dtEnd=null; } }
      rows.push({
        id:obj.id, type:obj.type, title:obj.title, category:obj.category,
        person: obj.person.includes(';') ? obj.person.split(';').map(s=>s.trim()) : obj.person,
        location:obj.location, datetime: dt.toISOString(), endDatetime: (dtEnd && !isNaN(dtEnd.getTime())) ? dtEnd.toISOString() : '',
        notes:obj.notes, status:obj.status, attachments:[]
      });
    }
    mergeItems(rows);
    alert('Termine (CSV) importiert.');
    route('overview');
  }

  function mergeItems(arr){
    const byId = new Map(state.items.map(x=>[x.id,x]));
    arr.forEach(n=> byId.set(n.id, Object.assign({}, byId.get(n.id)||{}, n)));
    state.items = Array.from(byId.values());
    save();
  }

  function downloadBlob(name, mime, data){
    const blob=new Blob([data],{type:mime}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ()=>{ bootTabs(); route('overview'); }, { once:true });
  } else {
    bootTabs(); route('overview');
  }
})();
