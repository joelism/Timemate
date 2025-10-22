// TimeMate full enhancer integration (Standort-Vorschläge, Auto-Default, Personen-Adresse)
(function(){
  if (window.__TM_ADDR_ENHANCER__) return;
  window.__TM_ADDR_ENHANCER__ = true;

  const LS_KEYS = ['timemate_jw_state_v3','timemate_jw_state_v4','timemate_jw_state_v2','timemate_jw_state'];
  function readState(){
    for (const k of LS_KEYS){
      try{
        const raw = localStorage.getItem(k);
        if (raw) return { key:k, data: JSON.parse(raw) };
      }catch{}
    }
    return { key:'timemate_jw_state_v3', data:{ items:[], contacts:[], cats:[] } };
  }

  let catAddr = {};
  try{ catAddr = JSON.parse(localStorage.getItem('tmjw_cat_addr')||'{}'); }catch{ catAddr = {}; }

  function addressesForCategory(cat){
    const { data } = readState();
    const arr = Array.isArray(data.contacts) ? data.contacts : [];
    const set = new Set(), out = [];
    arr.filter(c => (c.kategorie||'Unkategorisiert') === cat).forEach(c=>{
      const a = (c.adresse||'').trim();
      if (a && !set.has(a.toLowerCase())) { set.add(a.toLowerCase()); out.push(a); }
    });
    return out;
  }
  function addressForPerson(name, cat){
    if (!name) return '';
    const n = String(name).trim().toLowerCase();
    const { data } = readState();
    const arr = Array.isArray(data.contacts) ? data.contacts : [];
    let c = arr.find(c=>{
      const full = [c.vorname, c.name].filter(Boolean).join(' ').trim().toLowerCase();
      return full === n && (c.kategorie||'Unkategorisiert') === cat;
    });
    if (!c) {
      c = arr.find(c=>{
        const full = [c.vorname, c.name].filter(Boolean).join(' ').trim().toLowerCase();
        return full === n;
      });
    }
    return (c && c.adresse) ? String(c.adresse).trim() : '';
  }

  function findCategorySelect(root){
    let s = root.querySelector('select[name="category"], #category, select#category');
    if (s) return s;
    const selects = Array.from(root.querySelectorAll('select'));
    for (const sel of selects){
      const lbl = sel.closest('label') || sel.previousElementSibling;
      if (lbl && /kategorie/i.test(lbl.textContent||'')) return sel;
    }
    return null;
  }
  function findPersonField(root){
    let s = root.querySelector('select[name="person"], select[name="personSel"], #person, #personSel');
    if (s) return s;
    const selects = Array.from(root.querySelectorAll('select'));
    for (const sel of selects){
      const lbl = sel.closest('label') || sel.previousElementSibling;
      if (lbl && /person/i.test(lbl.textContent||'')) return sel;
    }
    let i = root.querySelector('input[name="person"], #person');
    if (i) return i;
    return null;
  }
  function findLocationInput(root){
    let i = root.querySelector('input[name="location"], #location, input#location');
    if (i) return i;
    const inputs = Array.from(root.querySelectorAll('input[type="text"], input:not([type])'));
    for (const inp of inputs){
      const lbl = inp.closest('label') || inp.previousElementSibling;
      if (lbl && /(standort|adresse)/i.test(lbl.textContent||'')) return inp;
    }
    return null;
  }

  function applyLocationLogic(form){
    const catSel = findCategorySelect(form);
    const personField = findPersonField(form);
    const locInput = findLocationInput(form);
    if (!catSel || !locInput) return;

    let dl = document.getElementById('tm_addr_list');
    if (!dl){ dl = document.createElement('datalist'); dl.id='tm_addr_list'; document.body.appendChild(dl); }
    locInput.setAttribute('list', dl.id);

    function currentPersonName(){
      if (!personField) return '';
      if (personField.tagName === 'SELECT') return personField.value || '';
      return personField.value || '';
    }

    function rebuild(){
      const cat = catSel.value || 'Unkategorisiert';
      const main = (catAddr && catAddr[cat]) ? String(catAddr[cat]).trim() : '';
      const opts = [];
      dl.innerHTML = '';
      if (main) opts.push(main);
      addressesForCategory(cat).forEach(a => { if (a && !opts.includes(a)) opts.push(a); });
      const pAddr = addressForPerson(currentPersonName(), cat);
      if (pAddr && !opts.includes(pAddr)) opts.push(pAddr);
      opts.forEach(o => { const op=document.createElement('option'); op.value=o; dl.appendChild(op); });
      const opOther=document.createElement('option'); opOther.value='Andere…'; dl.appendChild(opOther);
      if (!locInput.value && main) locInput.value = main;
    }

    rebuild();
    catSel.addEventListener('change', rebuild);
    if (personField) personField.addEventListener('change', ()=>{
      const cat = catSel.value || 'Unkategorisiert';
      const pAddr = addressForPerson(currentPersonName(), cat);
      if (pAddr) locInput.value = pAddr;
      rebuild();
    });
    if (personField) personField.addEventListener('input', rebuild);

    if (!form.__tm_addr_submit_hook__){
      form.__tm_addr_submit_hook__ = true;
      form.addEventListener('submit', ()=>{
        const cat = catSel.value || 'Unkategorisiert';
        const main = (catAddr && catAddr[cat]) ? String(catAddr[cat]).trim() : '';
        if (!locInput.value && main) locInput.value = main;
        if (String(locInput.value).trim() === 'Andere…') locInput.value = '';
      }, {capture:true});
    }
  }

  const obs = new MutationObserver((muts)=>{
    for (const m of muts){
      for (const node of m.addedNodes){
        if (!(node instanceof HTMLElement)) continue;
        const form = node.matches && node.matches('form') ? node : node.querySelector && node.querySelector('form');
        if (form){
          const hasCat = !!findCategorySelect(form);
          const hasLoc = !!findLocationInput(form);
          if (hasCat && hasLoc){
            try { applyLocationLogic(form); } catch(e){ console.warn('tm apply failed', e); }
          }
        }
      }
    }
  });
  try { obs.observe(document.body, { childList:true, subtree:true }); } catch {}
  document.querySelectorAll('form').forEach(f=>{
    const hasCat = !!findCategorySelect(f);
    const hasLoc = !!findLocationInput(f);
    if (hasCat && hasLoc) { try { applyLocationLogic(f); } catch(e){ console.warn('tm apply failed', e); } }
  });
})();