// TimeMate by J.W. – Darkmode + Kategorien-Farben aktiv
document.documentElement.classList.add('dark');

// Kategorie -> CSS-Klasse (für den farbigen Balken)
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

// Beispielhafte Funktion: Karte mit Kategorie-Klasse erzeugen
function createCard(title, category){
  const card = document.createElement('div');
  card.className = 'card';
  card.textContent = title;
  if (CAT_CSS[category]) card.classList.add(CAT_CSS[category]);
  document.getElementById('view').appendChild(card);
}

window.onload = () => {
  // Demo-Karten
  createCard('Spitex Heitersberg – kein Termin', 'Spitex Heitersberg');
  createCard('Psychologin / Therapie – Gespräch', 'Psychologin / Therapie');
  createCard('Töpferhaus – Übergabe', 'Töpferhaus');
  createCard('Genossenschaft Migros Aare – Meeting', 'Genossenschaft Migros Aare');
};
