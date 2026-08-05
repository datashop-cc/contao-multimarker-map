# datashop/contao-multimarker-map

Contao-5-Content-Element: Karte (OpenStreetMap/Leaflet oder Google Maps) mit
mehreren Markern, Tooltips und einem Routing-Link, der auf Mobilgeräten die
installierte Maps-App (Google/Apple Maps) und auf dem Desktop die
Maps-Website öffnet.

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
   speichern, dann über das Stift-Icon in der Elementliste die Marker verwalten
   (Titel, Lat/Lng, Tooltip-Text, Reihenfolge per Drag & Drop).

## Konfiguration im Backend

- **Zoomstufe / Kartenhöhe** – Basis-Darstellung
- **Farbmodus**
  - *Standard* – Originalfarben der OSM-Kacheln
  - *Graustufen* – Kartenkacheln grau, Marker bleiben in der gewählten Farbe (CSS-Filter,
    trifft technisch nur die Tile-Ebene, nicht die Marker-Ebene)
  - *Benutzerdefiniert* – eigener CSS-Filter über `--multimarker-map-filter` im Theme
- **Markerfarbe** – Hex-Farbe für die Pin-Icons
- **Copyright-Hinweis ausblenden** – siehe Lizenzhinweis unten
- **Alternative Tile-URL** – eigener Tile-Server (MapTiler, Mapbox, Stadia, …)

## Wichtiger Lizenzhinweis (OpenStreetMap-Attribution)

OSM-Kartendaten stehen unter der **ODbL-Lizenz**, die eine sichtbare
Namensnennung ("© OpenStreetMap contributors") vorschreibt – das gilt
unabhängig vom Tile-Anbieter, auch bei CARTO, Stadia Maps o.ä. in deren
kostenlosen Tarifen.

Standardmäßig ist die Attribution **dezent gestylt** (klein, halbtransparent,
passt sich dem Graudesign an) statt komplett entfernt – das erfüllt die
Lizenzpflicht, fällt optisch aber kaum auf (siehe `.leaflet-control-attribution`
in `multimarker-map.css`).

Die Option "Copyright-Hinweis ausblenden" entfernt die Namensnennung technisch
vollständig. Das ist **nur zulässig**, wenn du entweder:

- einen kostenpflichtigen Tile-Anbieter mit White-Label-Tarif nutzt
  (z.B. MapTiler, Mapbox, Geoapify – dort explizit prüfen, ob "no attribution"
  im gebuchten Plan enthalten ist), oder
- eine anderweitig lizenzierte, attributionsfreie Kartenquelle einsetzt.

Bei reiner Nutzung des öffentlichen OSM-Tile-Servers verstößt das Ausblenden
gegen die Nutzungsbedingungen. Diese Einstellung liegt in der Verantwortung
des jeweiligen Projekts/Kunden.

## Technische Hinweise

- Marker-Icons sind eigene inline-SVGs (`buildColoredIcon()` in
  `multimarker-map.js`), keine Bild-Assets nötig.
- Leaflet selbst wird per CDN (unpkg) dynamisch nachgeladen, nur wenn
  tatsächlich eine `.multimarker-map`-Instanz auf der Seite ist. Für
  Projekte ohne externe CDN-Zugriffe: `multimarker-map.js` anpassen und
  Leaflet stattdessen lokal aus `public/vendor/leaflet/` einbinden.
- Der Routing-Link nutzt Googles Universal-URL-Schema
  (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`), das auf
  iOS/Android automatisch die installierte Maps-App öffnet und im
  Desktop-Browser auf die Maps-Website verlinkt.
