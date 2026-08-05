<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap\Dca;

use Contao\CoreBundle\Exception\ResponseException;
use Contao\DataContainer;
use Contao\Image;
use Contao\Widget;

class ContentMarkerCallbacks
{
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

