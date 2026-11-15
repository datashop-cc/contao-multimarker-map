# Changelog

## 1.3.0

- **Leaflet und MapLibre lokal mitgeliefert** statt von unpkg.com geladen:
  Leaflet 1.9.4 (BSD-2-Clause) unter `public/vendor/leaflet/`, MapLibre GL JS
  4.7.1 (BSD-3-Clause) unter `public/vendor/maplibre-gl/`. Besucher-IPs gehen
  nicht mehr an ein CDN (DSGVO), und ein CDN-Ausfall legt die Karte nicht
  mehr lahm.
- **Frontend-Texte übersetzbar**: "Route berechnen", die Gesten-Hinweise,
  der Gruppen-Titel und der Hinweis bei Karten ohne Marker kommen jetzt aus
  den Contao-Sprachdateien (`MSC.multimarker_map`) und folgen der Sprache
  der Seite (Deutsch und Englisch enthalten).
- Englische Backend-Übersetzungen für alle Felder und Marker-Operationen
  vervollständigt.

## 1.2.1

- Neu: **Marker gruppieren** (Clustering) für alle drei Kartenanbieter
  (OpenStreetMap/Leaflet, OpenFreeMap, Google Maps) mit einheitlicher
  Darstellung. Einstellbar: Zoomstufe, ab der nicht mehr gruppiert wird,
  Gruppierungs-Radius und eigene Gruppen-Farbe.
- Marker mit identischen Koordinaten werden zusammengefasst und zeigen beim
  Klick ein Listen-Popup mit allen Einträgen.
- Supercluster 9.1.0 (ISC) lokal unter `public/vendor/supercluster/`
  mitgeliefert, wird nur bei aktiver Gruppierung nachgeladen.
- Bestehende Karten ändern sich nicht (Gruppierung standardmäßig aus).

### Korrekturen

- Breitengrad wird jetzt auf -90 bis 90 geprüft (vorher ±180 wie beim
  Längengrad), mit Hinweis auf evtl. vertauschte Werte.
- Lösch-Rückfrage bei Markern zeigt wieder Contaos Text statt eines leeren
  Dialogs.
- Karte ohne veröffentlichte Marker: Besucher sehen nichts mehr; der
  Hinweis für Redakteure erscheint nur noch im Backend und in der
  Frontend-Vorschau.
- "Copyright-Hinweis ausblenden" und "Alternative Tile-URL" werden nur noch
  beim Anbieter OpenStreetMap angezeigt. "Copyright-Hinweis ausblenden" wirkt
  entsprechend nur noch dort (bei OpenFreeMap ist die OSM-Namensnennung
  wieder sichtbar, falls der Haken früher gesetzt war).
