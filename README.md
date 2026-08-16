# datashop/contao-multimarker-map

Contao-5-Content-Element: Karte (OpenStreetMap/Leaflet, OpenFreeMap oder
Google Maps) mit mehreren Markern, Tooltips und einem Routing-Link, der auf
Mobilgeräten die installierte Maps-App (Google/Apple Maps) und auf dem
Desktop die Maps-Website öffnet.

## Installation

Ab Veröffentlichung auf Packagist reicht in jedem Contao-5-Projekt (oder per
Contao Manager unter "Erweiterungen suchen"):

```bash
composer require datashop/contao-multimarker-map
```

Danach:

1. `vendor/bin/contao-console assets:install --symlink public`
2. `vendor/bin/contao-console contao:migrate` (legt `tl_content_map_marker` an)
3. Im Backend: Content-Element vom Typ **"Karte mit mehreren Markern"** einfügen,
   speichern, dann über das **blaue Marker-Symbol** in der Elementliste die
   Marker verwalten (Titel, Lat/Lng, Tooltip-Text, Reihenfolge per Drag & Drop).
   Für Lat/Lng gibt's im Marker-Bearbeitungsformular ein Lupen-Icon neben dem
   Lat-Feld für eine Adresssuche (OSM-Nominatim).

**Wichtig:** Ohne mindestens einen angelegten (und veröffentlichten) Marker
bleibt die Karte leer bzw. zeigt im Frontend nur einen Hinweis, dass noch
kein Marker existiert – erst nach dem ersten Marker wird die eigentliche
Karte gerendert.

## Konfiguration im Backend

- **Kartenanbieter** – OpenStreetMap (Leaflet), OpenFreeMap (Vektorkarte,
  kostenlos, kein API-Key) oder Google Maps (kostenpflichtiger API-Key nötig)
- **Zoomstufe / Kartenhöhe** – Basis-Darstellung
- **Farbmodus** (OSM & OpenFreeMap)
  - *Standard* – Originalfarben
  - *Graustufen* – Karte grau, Marker bleiben in der gewählten Farbe (CSS-Filter,
    trifft nur die Kartenebene, nicht die Marker-Ebene)
  - *Benutzerdefiniert* – eigener CSS-Filter über `--multimarker-map-filter` im Theme
- **Markerfarbe** – Hex-Farbe für die Pin-Icons (Standard: `e63946`)
- **Link-Farbe ("Route berechnen")** – Hex-Farbe für den Routing-Link im
  Tooltip (Standard: `004080`). Leer lassen, um stattdessen die Markerfarbe
  zu verwenden.
- **OSM-spezifisch**: Copyright-Hinweis ausblenden (siehe Lizenzhinweis
  unten), alternative Tile-URL (z.B. MapTiler/Mapbox/Stadia)
- **Google-spezifisch**: API-Key (Pflicht, siehe Google Cloud Console),
  Map-ID (optional – aktiviert Googles echte Pin-Form in der Markerfarbe
  über "Advanced Markers"; ohne Map-ID kein Graustufen-Modus möglich, da
  Map-IDs eigenes Cloud-Styling verlangen)
- **OpenFreeMap-spezifisch**: Stil-Auswahl (Positron/Bright/Liberty/Dark/
  Fiord/3D – "3D" nutzt Gebäude-Extrusion statt einer eigenen Style-URL),
  wahlweise überschreibbar durch eine eigene, in Maputnik
  (maputnik.github.io/editor) gestaltete Style-Datei aus der Dateiverwaltung
  oder direkt eingefügtes Style-JSON als Text (Priorität: Text > Datei >
  Stil-Auswahl), sowie "Zoom-Animation beim Laden" (standardmäßig aus, damit
  die Karte sofort in der passenden Ansicht startet statt sichtbar
  heranzuzoomen)

### Bedienung (Desktop & Mobile)

Alle drei Anbieter verhindern versehentliches Verzoomen beim Scrollen über
der Karte:

- **OSM/Leaflet**: Mausrad-Zoom ist deaktiviert (Zoom über die +/-Buttons
  oder Doppelklick); auf Touch-Geräten bewegt erst ein Zwei-Finger-Gestus die
  Karte, ein Finger scrollt die Seite normal weiter (mit kurzem
  Hinweis-Overlay, sprachabhängig DE/EN).
- **OpenFreeMap**: nutzt MapLibres eingebaute `cooperativeGestures`-Option
  (Strg/Cmd+Scrollen zum Zoomen am Desktop, zwei Finger zum Bewegen auf
  Mobile), inklusive eigenem, ebenfalls sprachabhängigem Hinweis-Overlay.
- **Google Maps**: `gestureHandling: 'cooperative'`, Googles eigener
  Standard-Mechanismus für dasselbe Verhalten.

## Wichtiger Lizenzhinweis (OpenStreetMap-Attribution)

OSM-Kartendaten stehen unter der **ODbL-Lizenz**, die eine sichtbare
Namensnennung ("© OpenStreetMap contributors") vorschreibt – das gilt
unabhängig vom Tile-Anbieter (auch bei OpenFreeMap, das ebenfalls auf
OSM-Daten basiert) und unabhängig von CARTO, Stadia Maps o.ä. in deren
kostenlosen Tarifen.

Standardmäßig ist die Attribution **dezent gestylt** (klein, halbtransparent,
passt sich dem Graudesign an) statt komplett entfernt – das erfüllt die
Lizenzpflicht, fällt optisch aber kaum auf (siehe `.leaflet-control-attribution`
bzw. `.maplibregl-ctrl-attrib` in `multimarker-map.css`).

Die Option "Copyright-Hinweis ausblenden" entfernt die Namensnennung technisch
vollständig (nur bei OSM/Leaflet verfügbar). Das ist **nur zulässig**, wenn du entweder:

- einen kostenpflichtigen Tile-Anbieter mit White-Label-Tarif nutzt
  (z.B. MapTiler, Mapbox, Geoapify – dort explizit prüfen, ob "no attribution"
  im gebuchten Plan enthalten ist), oder
- eine anderweitig lizenzierte, attributionsfreie Kartenquelle einsetzt.

Bei reiner Nutzung des öffentlichen OSM-Tile-Servers verstößt das Ausblenden
gegen die Nutzungsbedingungen. Diese Einstellung liegt in der Verantwortung
des jeweiligen Projekts/Kunden.

**Google Maps** verbietet das Entfernen seines Logos/Copyright-Hinweises laut
Nutzungsbedingungen ausdrücklich – dafür gibt es bewusst keine
Ausblenden-Option.

## Technische Hinweise

- Marker-Icons sind eigene inline-SVGs (`buildPinSvg()` in
  `multimarker-map.js`), keine Bild-Assets nötig. Bei Google Maps mit
  gesetzter Map-ID wird stattdessen Googles native Pin-Form über die
  "Advanced Markers"-API in der Markerfarbe verwendet.
- Leaflet bzw. MapLibre GL JS werden jeweils per CDN (unpkg) dynamisch
  nachgeladen, nur wenn tatsächlich eine passende `.multimarker-map`-Instanz
  (OSM bzw. OpenFreeMap) auf der Seite ist. Für Projekte ohne externe
  CDN-Zugriffe: `multimarker-map.js` anpassen und die jeweilige Bibliothek
  stattdessen lokal einbinden.
- Der Routing-Link nutzt Googles Universal-URL-Schema
  (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`), das auf
  iOS/Android automatisch die installierte Maps-App öffnet und im
  Desktop-Browser auf die Maps-Website verlinkt.

