<?php

$GLOBALS['TL_LANG']['CTE']['multimarker_map'] = ['Karte mit mehreren Markern', 'Zeigt eine interaktive Karte (OpenStreetMap, OpenFreeMap oder Google Maps) mit mehreren Markern, Tooltips und Routing-Link.'];

$GLOBALS['TL_LANG']['tl_content']['leaflet_legend'] = 'Karteneinstellungen';
$GLOBALS['TL_LANG']['tl_content']['leaflet_markers'] = ['Marker verwalten', 'Die Marker dieser Karte bearbeiten.'];
$GLOBALS['TL_LANG']['tl_content']['leafletProvider'] = ['Kartenanbieter', 'Welcher Kartendienst verwendet wird. Die Marker bleiben in allen Fällen identisch.'];
$GLOBALS['TL_LANG']['tl_content']['leafletProviders'] = [
    'osm'         => 'OpenStreetMap (Leaflet, kostenlos)',
    'openfreemap' => 'OpenFreeMap (Vektorkarte, kostenlos, kein API-Key nötig)',
    'google'      => 'Google Maps (kostenpflichtiger API-Key nötig)',
];
$GLOBALS['TL_LANG']['tl_content']['leafletGoogleApiKey'] = ['Google Maps API-Key', 'Erforderlich bei Kartenanbieter "Google Maps" - siehe Google Cloud Console (Billing muss aktiviert sein). Achtung: Google-Logo/Copyright-Hinweis darf laut Nutzungsbedingungen nicht ausgeblendet werden.'];
$GLOBALS['TL_LANG']['tl_content']['leafletGoogleMapId'] = ['Google Maps Map-ID', 'Optional. Nur mit gesetzter Map-ID werden Googles echte Pin-Marker (statt unserem eigenen SVG-Icon) in der Markerfarbe verwendet ("Advanced Markers"). Map-ID kostenlos anlegbar in der Google Cloud Console unter "Map Management".'];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyle'] = ['OpenFreeMap-Stil', 'Native Kartenoptik. Lässt sich zusätzlich mit dem Farbmodus (z.B. Graustufen) weiter unten kombinieren. Wird ignoriert, falls unten eine Style-Datei oder ein eigenes Style-JSON angegeben ist.'];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyles'] = [
    'positron' => 'Positron (hell, dezent)',
    'bright'   => 'Bright (kräftig, klassisch)',
    'liberty'  => 'Liberty (Standard, ausgewogen)',
    'dark'     => 'Dark (dunkles Design)',
    'fiord'    => 'Fiord (kühl, bläulich)',
    '3d'       => '3D (mit Gebäude-Extrusion)',
];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyleFile'] = ['Eigene Style-Datei (Dateiverwaltung)', 'Eine in Maputnik (maputnik.github.io/editor) angepasste style.json über die Dateiverwaltung hochladen und hier auswählen. Wird ignoriert, falls unten zusätzlich Style-JSON als Text eingefügt ist.'];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyleJson'] = ['Eigenes Style-JSON (Text)', 'Alternativ: kompletten Inhalt einer style.json (z.B. Export aus Maputnik) hier direkt einfügen. Hat Vorrang vor Datei-Auswahl und Stil-Auswahl oben.'];

$GLOBALS['TL_LANG']['tl_content']['leafletZoom'] = ['Zoomstufe', 'Anfängliche Zoomstufe der Karte (1-19).'];
$GLOBALS['TL_LANG']['tl_content']['leafletHeight'] = ['Kartenhöhe', 'z.B. 450px oder 60vh.'];
$GLOBALS['TL_LANG']['tl_content']['leafletColorMode'] = ['Farbmodus', 'Wie die Karte eingefärbt wird. Marker bleiben in jedem Modus farbig.'];
$GLOBALS['TL_LANG']['tl_content']['leafletColorModes'] = [
    'default' => 'Standard (Originalfarben der Kartenkacheln)',
    'gray'    => 'Graustufen (Kartenkacheln grau, Marker farbig)',
    'custom'  => 'Benutzerdefiniert (CSS-Filter im Theme anpassen)',
];
$GLOBALS['TL_LANG']['tl_content']['leafletMarkerColor'] = ['Markerfarbe', 'Farbe der Marker-Icons (Hex-Wert).'];
$GLOBALS['TL_LANG']['tl_content']['leafletRouteLinkColor'] = ['Link-Farbe ("Route berechnen")', 'Optional. Leer lassen, um die Markerfarbe auch für den Routing-Link im Tooltip zu verwenden.'];
$GLOBALS['TL_LANG']['tl_content']['leafletAnimateFit'] = ['Zoom-Animation beim Laden', 'Beim ersten Laden sanft zur passenden Ansicht zoomen/schwenken, statt sofort zu springen.'];
$GLOBALS['TL_LANG']['tl_content']['leafletHideAttribution'] = ['Copyright-Hinweis ausblenden', 'Achtung: Die Namensnennung "© OpenStreetMap contributors" ist bei Nutzung von OSM-Kartendaten lizenzrechtlich vorgeschrieben (ODbL). Nur deaktivieren, wenn ein Tile-Anbieter mit entsprechender Lizenz (z.B. White-Label-Tarif) verwendet wird.'];
$GLOBALS['TL_LANG']['tl_content']['leafletTileUrl'] = ['Alternative Tile-URL', 'Optional: eigener Tile-Server, z.B. von MapTiler/Mapbox/Stadia. Leer lassen für den öffentlichen OSM-Standardserver.'];
