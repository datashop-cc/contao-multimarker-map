<?php

declare(strict_types=1);

use Datashop\MultiMarkerMap\Model\MapMarkerModel;

// Model-Klasse für diese Tabelle registrieren. WICHTIG: das muss in config.php
// stehen, nicht in der DCA-Datei der Tabelle selbst - config.php wird bei
// JEDEM Request geladen, DCA-Dateien dagegen nur lazy, wenn genau diese
// Tabelle gerade angefragt wird. Ruft man das Model aber direkt auf (wie im
// Content-Element-Controller im Frontend), ohne dass die Tabelle vorher
// explizit geladen wurde, kommt der Eintrag aus der DCA-Datei zu spät und
// Contao\Model::getClassFromTable() wirft "There is no class for table ...
// registered in $GLOBALS['TL_MODELS']".
$GLOBALS['TL_MODELS']['tl_content_map_marker'] = MapMarkerModel::class;

// Assets global registrieren (werden nur auf Seiten mit dem Element angefordert,
// da Contao CSS/JS aus TL_CSS/TL_JAVASCRIPT als <link>/<script> im <head> einbindet
// -- Overhead ist minimal, da die Dateien klein sind und cachebar).
// Leaflet selbst wird bewusst per JS dynamisch nachgeladen (siehe multimarker-map.js),
// damit die Library nur auf Seiten mit tatsächlich gerendertem Kartenelement lädt.
$GLOBALS['TL_CSS'][] = 'bundles/datashopmultimarkermap/multimarker-map.css';
$GLOBALS['TL_JAVASCRIPT'][] = 'bundles/datashopmultimarkermap/multimarker-map.js|static';

// Contao prüft pro Backend-Modul eine Whitelist erlaubter Tabellen. Ohne diesen
// Eintrag wirft der Aufruf der "Marker verwalten"-Operation aus dem
// Artikel-Modul heraus "Table 'tl_content_map_marker' is not allowed in
// module 'article'". Beide Module ergänzen, in denen Content-Elemente
// vorkommen können (Artikel und Formular-Felder nutzen dieselbe Basis nicht,
// aber "article" ist der Standardfall; "custom" bei manchen Setups zusätzlich
// relevant für Front-End-Module mit Inhaltselementen).
if (isset($GLOBALS['BE_MOD']['content']['article']['tables'])) {
    $GLOBALS['BE_MOD']['content']['article']['tables'][] = 'tl_content_map_marker';
}
