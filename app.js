(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    const v = document.getElementById('view');
    if (!v) {
      console.error('TimeMate JW: #view nicht gefunden.');
      return;
    }

    const state = { items: JSON.parse(localStorage.getItem('tmjw_state') || '[]') };

    function ov() {
      v.innerHTML = '';
      const now = new Date();
      const h = now.getHours(), min = now.getMinutes();
      const nm = (localStorage.getItem('tmjw_user_name') || '').trim();
      let greet;
      if (h < 11 || (h === 11 && min <= 30)) greet = 'Guten Morgen';
      else if ((h === 11 && min >= 31) || (h > 11 && h < 18) || (h === 17 && min <= 59)) greet = 'Guten Tag';
      else greet = 'Guten Abend';
      const title = nm ? `${greet} ${nm}!` : `${greet}!`;

      const isSameDay = (d1, d2) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

      const todayItems = (state.items || [])
        .filter(a => a.type !== 'Aufgabe' && a.status !== 'archived' && isSameDay(new Date(a.datetime), now))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

      const top = document.createElement('section');
      top.className = 'card hero';
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'flex-end';
      header.style.gap = '12px';
      header.style.flexWrap = 'wrap';
      const h2 = document.createElement('h2');
      h2.textContent = title;
      h2.style.fontSize = '1.6rem';
      h2.style.margin = '0';
      header.append(h2);
      top.append(header);

      if (todayItems.length) {
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = `Du hast ${todayItems.length} Termine heute:`;
        top.append(meta);

        const list = document.createElement('div');
        list.className = 'list';
        todayItems.forEach(a => {
          const row = document.createElement('div');
          row.className = 'item small';
          const left = document.createElement('div');
          left.style.display = 'flex';
          left.style.alignItems = 'center';
          left.style.gap = '10px';
          const t = new Date(a.datetime).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const titleTxt = (a.title || '').trim() || '(ohne Titel)';
          left.append(document.createTextNode(titleTxt));
          row.append(left);
          const meta = document.createElement('div');
          meta.className = 'meta';
          meta.textContent = `${t}${a.location ? ' · ' + a.location : ''}`;
          row.append(meta);
          list.append(row);
        });
        top.append(list);
      } else {
        const p = document.createElement('p');
        p.className = 'meta';
        p.textContent = 'Du hast heute keine eingetragenen Termine!';
        top.append(p);
      }
      v.append(top);
    }

    ov();
  }
})();