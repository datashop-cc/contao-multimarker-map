<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap\Dca;

use Contao\Backend;
use Contao\CoreBundle\Exception\ResponseException;
use Contao\DataContainer;
use Contao\Image;
use Contao\StringUtil;
use Contao\Widget;

class ContentMarkerCallbacks
{
    /**
     * Rendert den "Marker verwalten"-Button NUR für Content-Elemente vom Typ
     * "multimarker_map" - list.operations gilt sonst pauschal für ALLE
     * tl_content-Zeilen (jeden Elementtyp), unabhängig vom "type"-Feld der
     * einzelnen Zeile. Für andere Zeilen wird ein leerer String
     * zurückgegeben, wodurch Contao den Button für diese Zeile schlicht
     * nicht rendert.
     */
    public function markersButtonCallback(
        array $row,
        string $href,
        string $label,
        string $title,
        string $icon,
        string $attributes
    ): string {
        if (($row['type'] ?? null) !== 'multimarker_map') {
            return '';
        }

        return sprintf(
            '<a href="%s" title="%s"%s>%s</a> ',
            Backend::addToUrl($href . '&amp;id=' . $row['id']),
            StringUtil::specialchars($title),
            $attributes,
            Image::getHtml($icon, $label)
        );
    }
    /**
     * Stellt sicher, dass Lat/Lng gültige Dezimalgrad-Werte sind (z.B. 47.801, -122.4).
     */
    public function validateCoordinate(mixed $value, DataContainer $dc): string
    {
        if ($value === '' || $value === null) {
            return $value ?? '';
        }

        $normalized = str_replace(',', '.', (string) $value);

        if (!is_numeric($normalized) || (float) $normalized < -180 || (float) $normalized > 180) {
            throw new \RuntimeException(sprintf(
                'Ungültiger Koordinatenwert "%s" – bitte Dezimalgrad angeben, z.B. 47.8011 oder -13.2894.',
                $value
            ));
        }

        return (string) (float) $normalized;
    }

    /**
     * Rendert ein Wizard-Icon neben dem Lat-Feld, das über die kostenlose
     * OpenStreetMap-Nominatim-API eine Adresse sucht und Lat/Lng automatisch
     * befüllt. Bindet dabei einmalig das zugehörige Backend-JS ein
     * (bundles/datashopmultimarkermap/multimarker-map-backend.js).
     */
    public function addressSearchWizard(DataContainer $dc): string
    {
        $GLOBALS['TL_JAVASCRIPT']['ds_leaflet_geocode'] = 'bundles/datashopmultimarkermap/multimarker-map-backend.js|static';

        return ' <a href="#" class="ds-leaflet-geocode-wizard" data-lat-id="ctrl_lat" data-lng-id="ctrl_lng" title="Adresse suchen" style="padding-left:3px;cursor:pointer">' .
            Image::getHtml('search.svg', 'Adresse suchen') .
            '</a>';
    }
}

