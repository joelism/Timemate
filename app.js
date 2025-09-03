
(function(){
  const v=document.getElementById('view');
  const state={items:JSON.parse(localStorage.getItem('tmjw_state')||'[]')};
  const save=()=>localStorage.setItem('tmjw_state',JSON.stringify(state.items));
  function route(r){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.route===r));
    if(r==='overview') return overview(); if(r==='new') return form(); if(r==='list') return list(); if(r==='tasks') return tasks(); if(r==='archive') return archive(); if(r==='settings') return settings();}
  function overview(){v.innerHTML='<h2>Termine</h2>';state.items.filter(i=>i.type!=='Aufgabe').forEach(i=>{v.append(card(i));});v.append(document.createElement('hr'));v.innerHTML+='<h2>Aufgaben</h2>';state.items.filter(i=>i.type==='Aufgabe').forEach(i=>{v.append(card(i));});}
  function form(){v.innerHTML='<h2>Neuer Eintrag</h2>';const sel=document.createElement('select');sel.id='type';['Termin','Aufgabe'].forEach(x=>{const o=document.createElement('option');o.textContent=x;sel.append(o);});v.append(sel);const t=document.createElement('input');t.placeholder='Titel';t.id='title';v.append(t);const saveBtn=document.createElement('button');saveBtn.textContent='Speichern';saveBtn.onclick=()=>{state.items.push({id:Date.now(),type:sel.value,title:t.value,status:'upcoming'});save();route('overview');};v.append(saveBtn);}
  function list(){v.innerHTML='<h2>Alle Termine</h2>';state.items.filter(i=>i.type!=='Aufgabe').forEach(i=>v.append(card(i)));}
  function tasks(){v.innerHTML='<h2>Aufgaben</h2>';state.items.filter(i=>i.type==='Aufgabe').forEach(i=>v.append(card(i)));}
  function archive(){v.innerHTML='<h2>Archiv</h2>';state.items.filter(i=>i.status==='archived').forEach(i=>v.append(card(i)));}
  function settings(){v.innerHTML='<h2>Einstellungen</h2>';const b=document.createElement('button');b.textContent=document.documentElement.classList.contains('dark')?'🌙 DarkMode an':'🌞 DarkMode aus';b.onclick=()=>{document.documentElement.classList.toggle('dark');localStorage.setItem('tmjw_theme',document.documentElement.classList.contains('dark')?'dark':'light');settings();};v.append(b);}
  function card(i){const d=document.createElement('div');d.className='card';d.textContent=i.type+': '+i.title;return d;}
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>route(b.dataset.route));
  if(localStorage.getItem('tmjw_theme')==='dark')document.documentElement.classList.add('dark');
  route('overview');
})();
