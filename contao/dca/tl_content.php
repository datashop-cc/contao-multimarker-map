<?php

declare(strict_types=1);

use Contao\CoreBundle\DataContainer\PaletteManipulator;

// Eigene Palette für den neuen Content-Element-Typ
$GLOBALS['TL_DCA']['tl_content']['palettes']['multimarker_map'] =
    '{type_legend},type,headline'
    . ';{leaflet_legend},leafletProvider,leafletZoom,leafletHeight,leafletColorMode,leafletMarkerColor,leafletHideAttribution,leafletTileUrl'
    . ';{template_legend:hide},customTpl'
    . ';{protected_legend:hide},protected'
    . ';{expert_legend:hide},guests,cssID'
    . ';{invisible_legend:hide},invisible,start,stop';

// leafletProvider ist ein Selector-Feld: bei "google" werden API-Key und
// Map-ID über eine Subpalette eingeblendet, sonst bleiben sie versteckt.
$GLOBALS['TL_DCA']['tl_content']['palettes']['__selector__'][] = 'leafletProvider';
$GLOBALS['TL_DCA']['tl_content']['subpalettes']['leafletProvider_google'] = 'leafletGoogleApiKey,leafletGoogleMapId';

// Integration mit datashop/contao-cookiebar-bridge (falls installiert): die
// Bridge hängt ihr "ccbVisibility"-Feld per Schleife an alle *zum
// Ladezeitpunkt bereits registrierten* tl_content-Paletten an. Da die
// Bundle-Ladereihenfolge nicht garantiert ist, könnte unsere
// "multimarker_map"-Palette zu diesem Zeitpunkt noch fehlen. Über
// onload_callback (läuft erst zur Laufzeit, wenn alle DCA-Dateien bereits
// vollständig zusammengeführt sind) holen wir das notfalls selbst nach.
$GLOBALS['TL_DCA']['tl_content']['config']['onload_callback'][] = static function (): void {
    if (
        !isset($GLOBALS['TL_DCA']['tl_content']['fields']['ccbVisibility'])
        || !isset($GLOBALS['TL_DCA']['tl_content']['palettes']['multimarker_map'])
        || str_contains($GLOBALS['TL_DCA']['tl_content']['palettes']['multimarker_map'], 'ccbVisibility')
    ) {
        return;
    }

    PaletteManipulator::create()
        ->addField('ccbVisibility', 'protected', PaletteManipulator::POSITION_APPEND)
        ->applyToPalette('multimarker_map', 'tl_content');
};

// Operation "Marker verwalten" analog zum Contao-Muster für Kind-Datensätze.
// 'primary' => true holt sie aus dem "..."-Kontextmenü heraus (seit Contao
// 5.5 landen Operationen sonst standardmäßig dort). Zusätzlich wird sie
// gezielt VOR die "toggle"-Operation (grünes Auge) einsortiert, statt nur
// ans Ende der Liste angehängt zu werden - so erscheint sie zwischen
// Bearbeiten-Stift und Sichtbarkeits-Auge.
$leafletMarkersOperation = [
    'href'            => 'table=tl_content_map_marker',
    'icon'            => 'bundles/datashopmultimarkermap/icons/marker-manage.svg',
    'attributes'      => 'onclick="Backend.getScrollOffset()"',
    'primary'         => true,
    // Nur für Zeilen vom Typ "multimarker_map" rendern, siehe Kommentar
    // in ContentMarkerCallbacks::markersButtonCallback().
    'button_callback' => ['Datashop\MultiMarkerMap\Dca\ContentMarkerCallbacks', 'markersButtonCallback'],
];

$existingOperations = $GLOBALS['TL_DCA']['tl_content']['list']['operations'] ?? [];

// Seit Contao 5.5 nutzt der Core die Kurzschreibweise (Liste von Namen wie
// ['edit', 'copy', 'cut', 'delete', 'toggle', 'show'], optional mit '!'-
// Präfix für "immer sichtbar"), NICHT mehr die alte assoziative Form mit
// 'toggle' als Array-Schlüssel. Deshalb hier sowohl auf den Wert (Kurzform)
// als auch den Schlüssel (alte/eigene Form) prüfen.
$reorderedOperations = [];
$inserted = false;

foreach ($existingOperations as $operationKey => $operationConfig) {
    $operationName = is_string($operationConfig) ? ltrim($operationConfig, '!') : $operationKey;

    if (!$inserted && $operationName === 'toggle') {
        $reorderedOperations['leaflet_markers'] = $leafletMarkersOperation;
        $inserted = true;
    }

    $reorderedOperations[$operationKey] = $operationConfig;
}

if (!$inserted) {
    $reorderedOperations['leaflet_markers'] = $leafletMarkersOperation;
}

$GLOBALS['TL_DCA']['tl_content']['list']['operations'] = $reorderedOperations;

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletProvider'] = [
    'inputType' => 'select',
    'options'   => ['osm', 'google'],
    'reference' => &$GLOBALS['TL_LANG']['tl_content']['leafletProviders'],
    'default'   => 'osm',
    'eval'      => ['tl_class' => 'w50', 'submitOnChange' => true],
    'sql'       => "varchar(16) NOT NULL default 'osm'",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletGoogleApiKey'] = [
    'inputType' => 'text',
    'eval'      => ['tl_class' => 'w50', 'mandatory' => true],
    'sql'       => "varchar(255) NOT NULL default ''",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletGoogleMapId'] = [
    'inputType' => 'text',
    'eval'      => ['tl_class' => 'w50'],
    'sql'       => "varchar(64) NOT NULL default ''",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletZoom'] = [
    'inputType' => 'text',
    'default'   => 13,
    'eval'      => ['rgxp' => 'natural', 'tl_class' => 'w50'],
    'sql'       => "smallint(5) unsigned NOT NULL default 13",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletHeight'] = [
    'inputType' => 'text',
    'default'   => '450px',
    'eval'      => ['tl_class' => 'w50'],
    'sql'       => "varchar(16) NOT NULL default '450px'",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletColorMode'] = [
    'inputType' => 'select',
    'options'   => ['default', 'gray', 'custom'],
    'reference' => &$GLOBALS['TL_LANG']['tl_content']['leafletColorModes'],
    'eval'      => ['tl_class' => 'w50', 'submitOnChange' => true],
    'sql'       => "varchar(16) NOT NULL default 'gray'",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletMarkerColor'] = [
    'inputType' => 'text',
    'default'   => '#e63946',
    'eval'      => ['tl_class' => 'w50', 'colorpicker' => true, 'isHexColor' => true, 'decodeEntities' => true],
    'sql'       => "varchar(7) NOT NULL default '#e63946'",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletHideAttribution'] = [
    'inputType' => 'checkbox',
    'eval'      => ['tl_class' => 'w50 m12'],
    'sql'       => "char(1) NOT NULL default ''",
];

$GLOBALS['TL_DCA']['tl_content']['fields']['leafletTileUrl'] = [
    'inputType' => 'text',
    'eval'      => ['tl_class' => 'w50 clr', 'placeholder' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
    'sql'       => "varchar(255) NOT NULL default ''",
];
