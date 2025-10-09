
// Ensure dark is on
document.documentElement.classList.add('dark');

(function setupHeader(){
  const header = document.querySelector('.app-header') || (function(){
    const h = document.createElement('header'); h.className='app-header';
    h.innerHTML = '<div class="topbar"></div><div class="brand"><h1>TimeMate <span class="light">by J.W.</span></h1></div><div class="tabs"></div>';
    document.body.insertBefore(h, document.body.firstChild);
    return h;
  })();

  const tabs = header.querySelector('.tabs');
  const want = [
    ['overview','Übersicht'],
    ['new','Neuer Eintrag'],
    ['list','Termine'],
    ['tasks','Aufgaben'],
    ['contacts','Kontakte'],
    ['settings','Einstellungen'],
  ];

  // clear and rebuild tabs in correct order
  tabs.innerHTML = '';
  want.forEach(([route,label],i)=>{
    const b=document.createElement('button');
    b.className='tab' + (i===0?' active':'');
    b.dataset.route=route;
    b.textContent=label;
    b.type='button';
    b.addEventListener('click',()=>{
      document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.toggle('active', x===b));
      if (typeof route === 'string' && typeof window.route === 'function') {
        window.route(route);
      } else {
        // fallback: anchor to hash
        location.hash = route;
      }
    });
    tabs.appendChild(b);
  });
})();
