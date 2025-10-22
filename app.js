
(function(){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init(){
    const v = document.getElementById('view');
    const $ = (s, r=document) => r.querySelector(s);
    const $$= (s, r=document) => Array.from(r.querySelectorAll(s));

    // ---------- Utils ----------
    const el = (tag, attrs={}, ...kids) => {
      const n = document.createElement(tag);
      for (const [k,val] of Object.entries(attrs||{})){
        if (k === 'class') n.className = val;
        else if (k === 'style') n.setAttribute('style', val);
        else if (k.startsWith('on') && typeof val === 'function') n.addEventListener(k.slice(2), val);
        else n.setAttribute(k, val);
      }
      kids.flat().forEach(k => n.append(typeof k === 'string' ? document.createTextNode(k) : k));
      return n;
    };

    // ---------- State with migration ----------
    const LSKEY = 'timemate_jw_state_v3';
    const LEGACY = ['timemate_jw_state_v4','timemate_jw_state_v2','timemate_jw_state'];
    let state = null;
    try{ state = JSON.parse(localStorage.getItem(LSKEY) || 'null'); }catch{ state = null; }
    if (!state) {
      for (const k of LEGACY) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) { state = JSON.parse(raw); localStorage.setItem(LSKEY, raw); break; }
        } catch {}
      }
    }
    if (!state) state = { items: [], contacts: [], cats: ['Spitex Heitersberg','Psychologin / Therapie','Töpferhaus','Genossenschaft Migros Aare','Administrativ','Privat','HKV Aarau','Persönlich','Unkategorisiert'] };
    const save = () => localStorage.setItem(LSKEY, JSON.stringify(state));

    // ---------- NEW: Hauptadresse pro Kategorie ----------
    let catAddr = JSON.parse(localStorage.getItem('tmjw_cat_addr') || '{}'); // { [cat]: 'Adresse' }
    const saveCatAddr = () => localStorage.setItem('tmjw_cat_addr', JSON.stringify(catAddr));

    // ---------- Robust tab routing (by visible text) ----------
    $$('.tabs .tab').forEach(b => {
      b.addEventListener('click', () => {
        const txt = (b.textContent || '').trim();
        const map = {
          'Übersicht':'overview',
          'Neuer Eintrag':'new',
          'Liste':'list',
          'Aufgaben':'tasks',
          'Kontakte':'contacts',
          'Einstellungen':'settings',
          'Archiv':'archive'
        };
        route(b.dataset.route || map[txt] || 'overview');
      });
    });

    function route(name, arg){
      if (name === 'contacts') return contactsView();
      if (name === 'overview') return simpleHeadline('Übersicht');
      if (name === 'new') return simpleHeadline('Neuer Eintrag');
      if (name === 'list') return simpleHeadline('Liste');
      if (name === 'tasks') return simpleHeadline('Aufgaben');
      if (name === 'settings') return simpleHeadline('Einstellungen');
      if (name === 'archive') return simpleHeadline('Archiv');
      return contactsView();
    }
    function simpleHeadline(title){
      v.innerHTML = '';
      const sec = el('section', {}, el('h2', {}, title), el('p', {class:'meta'}, ''));
      v.append(sec);
    }

    // ---------- Kontakte (mit Adresse & Hauptadresse pro Kategorie) ----------
    function contactsView(){
      v.innerHTML = '';
      const sec = el('section', {});
      sec.append(el('h2', {}, 'Kontakte'));

      // Toolbar: Kategorie-Auswahl + Hauptadresse setzen
      const bar = el('div', {class:'btnrow'});
      const catSel = el('select', {id:'contactCatFilter'});
      state.cats.forEach(c => catSel.append(el('option', {value:c}, c)));
      const btnMain = el('button', {type:'button'}, 'Hauptadresse setzen');
      const info = el('div', {class:'meta', style:'margin-top:6px'});
      const updateInfo = () => {
        const cat = catSel.value;
        info.textContent = catAddr[cat] ? ('Hauptadresse: ' + catAddr[cat]) : 'Keine Hauptadresse hinterlegt.';
      };
      btnMain.onclick = () => {
        const cat = catSel.value;
        const cur = catAddr[cat] || '';
        const val = prompt(`Hauptadresse für „${cat}“`, cur);
        if (val !== null) {
          catAddr[cat] = val.trim();
          saveCatAddr();
          updateInfo();
        }
      };
      bar.append('Kategorie: ', catSel, btnMain);
      sec.append(bar, info);

      // Actions
      const act = el('div', {class:'btnrow', style:'margin-top:8px'});
      act.append(el('button', {type:'button', onclick:()=>editContact()}, 'Neu'));
      sec.append(act);

      // Liste
      const list = el('div', {id:'clist', class:'list'});
      sec.append(list);
      v.append(sec);

      function renderContacts(){
        list.innerHTML = '';
        const cat = catSel.value;
        const arr = state.contacts.filter(c => (c.kategorie || 'Unkategorisiert') === cat);
        if (!arr.length) {
          list.innerHTML = '<p class="meta">Keine Kontakte.</p>';
          return;
        }
        arr.forEach(c => list.append(contactRow(c)));
      }

      catSel.addEventListener('change', () => { updateInfo(); renderContacts(); });
      updateInfo();
      renderContacts();
    }

    function contactRow(c){
      const it = el('div', {class:'item'});
      const title = [c.vorname, c.name].filter(Boolean).join(' ').trim() || '(ohne Name)';
      it.append(el('div', {class:'title'}, title));
      it.append(el('div', {}, `Kategorie: ${c.kategorie || 'Unkategorisiert'}`));
      if (c.telefon) it.append(el('div', {}, `Telefon: ${c.telefon}`));
      if (c.email)   it.append(el('div', {}, `E-Mail: ${c.email}`));
      if (c.adresse) it.append(el('div', {}, `Adresse: ${c.adresse}`));
      const row = el('div', {class:'btnrow'});
      row.append(
        el('button', {type:'button', onclick:()=>editContact(c.id)}, 'Bearbeiten'),
        el('button', {type:'button', onclick:()=>{ state.contacts = state.contacts.filter(x => x.id !== c.id); save(); contactsView(); }}, 'Löschen')
      );
      it.append(row);
      return it;
    }

    function editContact(id){
      const c = id ? state.contacts.find(x => x.id === id) : null;
      v.innerHTML = '';
      const sec = el('section', {});
      sec.append(el('h2', {}, c ? 'Kontakt bearbeiten' : 'Neuer Kontakt'));

      const f = el('form', {class:'editor'});
      const hid = el('input', {type:'hidden', value: c ? c.id : String(Date.now())});
      f.append(hid);

      const mkField = (id,label,type='text',val='') => {
        const wrap = el('div', {});
        wrap.append(el('label', {}, label));
        wrap.append(el('input', {type, id, value: val||''}));
        return wrap;
      };

      const catSel = el('select', {id:'kategorie'});
      state.cats.forEach(x => catSel.append(el('option', {value:x, selected: (c?c.kategorie:'')===x}, x)));
      f.append(el('label', {}, 'Kategorie'), catSel);
      f.append(mkField('vorname','Vorname','text', c?.vorname));
      f.append(mkField('name','Name','text', c?.name));
      f.append(mkField('funktion','Funktion','text', c?.funktion));
      f.append(mkField('telefon','Telefon','text', c?.telefon));
      f.append(mkField('email','E-Mail','email', c?.email));

      // NEW: Adresse
      f.append(mkField('adresse','Adresse','text', c?.adresse));

      const note = el('textarea', {id:'notizen'}, c?.notizen || '');
      f.append(el('label', {}, 'Notizen'), note);

      const actions = el('div', {class:'btnrow'});
      const saveBtn = el('button', {type:'submit'}, 'Speichern');
      const cancel  = el('button', {type:'button', onclick:()=>contactsView()}, 'Abbrechen');
      actions.append(saveBtn, cancel);
      f.append(actions);

      f.addEventListener('submit', (e)=>{
        e.preventDefault();
        const obj = {
          id: hid.value,
          vorname: ($('#vorname')?.value || '').trim(),
          name: ($('#name')?.value || '').trim(),
          kategorie: $('#kategorie')?.value || 'Unkategorisiert',
          funktion: ($('#funktion')?.value || '').trim(),
          telefon: ($('#telefon')?.value || '').trim(),
          email: ($('#email')?.value || '').trim(),
          adresse: ($('#adresse')?.value || '').trim(), // store address
          notizen: ($('#notizen')?.value || '').trim()
        };
        const i = state.contacts.findIndex(x => x.id === obj.id);
        if (i>=0) state.contacts[i] = obj; else state.contacts.push(obj);
        save();
        contactsView();
      });

      sec.append(f);
      v.append(sec);
    }

    // Start in Kontakte, damit du es sofort siehst
    route('contacts');
  }
})();
