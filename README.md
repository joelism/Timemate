# TimeMate JW (PWA)

Leichte Organisations‑App für Termine & Notizen. Funktioniert komplett offline im Browser (IndexedDB), kann auf dem iPhone als App installiert werden („Zum Home‑Bildschirm hinzufügen“).

## Features
- Kategorien: Spitex Heitersberg · Psychologin/Therapie · Töpferhaus · Administrativ · Geschäftlich · Privat
- Beim Anlegen: dynamische Felder je nach Kategorie (Termin mit, Standort)
- Privat/Administrativ: Freitext mit Vorschlagslisten (Orte & Personen)
- Geschäftlich: Mehrfachauswahl für „Termin mit“
- Feste Uhrzeiten im 5‑Minuten‑Raster
- Notizen (Text) + Anhänge (Bilder, PDF)
- Übersicht mit farbigen Karten und „Nächster Termin“ pro Kategorie; kein Termin = rotes Ausrufezeichen
- Automatik: nach Fälligkeit wird der Termin ✓ gesetzt; 72h später wird er ins Archiv verschoben
- Export: CSV (Excel) und PDF (Druckansicht); Löschen aller Termine in den Einstellungen
- PWA: Manifest + Service Worker + Apple Touch Icon

## Lokaler Start
- Einfach `index.html` mit einem modernen Browser öffnen.

## GitHub Pages
- Repo erstellen, Dateien hochladen, Pages auf „/ (root)“ setzen.
- URL auf dem iPhone öffnen, „Zum Home‑Bildschirm“ hinzufügen.