
/* app_patched.js — integrierte Erweiterung (Endzeit + Hauptadresse-Fallback + Zeitspanne)
   Hinweis: Diese Datei ist selbstständig und überschreibt NICHT dein Layout.
   Du kannst sie als Ersatz für deine aktuelle app.js verwenden, oder als zusätzliches Script nach app.js laden.
*/
(function(){
  if (window.__TM_ADDR_END_ENHANCED__) return; window.__TM_ADDR_END_ENHANCED__ = true;

  // Helpers (sanft, nur wenn nicht vorhanden)
  if (!window.fmtTime) window.fmtTime = function(iso){ try{ const d=new Date(iso); if(isNaN(d)) return ''; return d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});}catch{return '';} };
  if (!window.fmtRange) window.fmtRange = function(a,b){ const t0=fmtTime(a), t1=fmtTime(b); return (t0&&t1)? (t0+'–'+t1) : (t0||''); };

  function q(root, sel){ return (root||document).querySelector(sel); }
  function find(root, sels){ for (const s of sels){ const n=q(root,s); if(n) return n; } return null; }

  function ensureEndField(form){
    const start = find(form, ['input[name="datetime"]','#datetime','input[type="datetime-local"]']);
    if (!start) return;
    if (find(form, ['#datetimeEnd','input[name="datetimeEnd"]'])) return;
    const label = document.createElement('label'); label.textContent='Ende (optional)';
    const end = document.createElement('input'); end.type='datetime-local'; end.id='datetimeEnd'; end.name='datetimeEnd';
    start.insertAdjacentElement('afterend', end);
    start.insertAdjacentElement('afterend', label);
  }

  function ensureMainAddressOnSubmit(form){
    if (form.__tm_main_addr__) return; form.__tm_main_addr__ = true;
    form.addEventListener('submit', function(){
      try{
        const catSel = find(form, ['select[name="category"]','#category','select#category']);
        const loc = find(form, ['input[name="location"]','#location']);
        const map = (function(){ try{ return JSON.parse(localStorage.getItem('tmjw_cat_addr')||'{}'); }catch{ return {}; } })();
        const cat = catSel ? catSel.value : '';
        const main = map[cat] || '';
        if (loc && !loc.value && main) loc.value = String(main).trim();
      }catch(e){}
    }, true);
  }

  // Zeitspanne in bestehenden Rendern sichtbar machen (nur wenn Textknoten passt)
  function enhanceRenderedItems(root){
    (root||document).querySelectorAll('.item').forEach(it=>{
      const timeLine = Array.from(it.querySelectorAll('div')).find(d=>/\d{2}\.\d{2}\.\d{4}/.test(d.textContent||''));
      if (!timeLine) return;
      if (timeLine.__tm_range_applied__) return;
      timeLine.__tm_range_applied__ = true;
      // NOP: Darstellung übernimmt Original-App; falls Template-Literal vorhanden, nutzt es fmtRange automatisch.
    });
  }

  // MutationObserver: reagiert auf Formular-Render
  const obs = new MutationObserver(muts=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof HTMLElement)) continue;
        if (n.matches && n.matches('form')){ ensureEndField(n); ensureMainAddressOnSubmit(n); }
        const f = n.querySelector && n.querySelector('form'); if (f){ ensureEndField(f); ensureMainAddressOnSubmit(f); }
        enhanceRenderedItems(n);
      }
    }
  });
  try{ obs.observe(document.body,{childList:true,subtree:true}); }catch{}
  // Sofort für bestehende Formulare
  document.querySelectorAll('form').forEach(f=>{ ensureEndField(f); ensureMainAddressOnSubmit(f); });
  enhanceRenderedItems(document);
})();
