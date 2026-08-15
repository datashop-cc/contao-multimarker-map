<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap\Controller\ContentElement;

use Contao\ContentModel;
use Contao\CoreBundle\Controller\ContentElement\AbstractContentElementController;
use Contao\CoreBundle\DependencyInjection\Attribute\AsContentElement;
use Contao\Environment;
use Contao\FilesModel;
use Contao\Template;
use Datashop\MultiMarkerMap\Model\MapMarkerModel;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[AsContentElement('multimarker_map', category: 'media', template: 'content_element/multimarker_map')]
class MultiMarkerMapController extends AbstractContentElementController
{
    protected function getResponse(Template $template, ContentModel $model, Request $request): Response
    {
        $markers = MapMarkerModel::findPublishedByPid((int) $model->id);

        $markerData = [];
        $bounds = [];

        if ($markers !== null) {
            foreach ($markers as $marker) {
                $lat = (float) $marker->lat;
                $lng = (float) $marker->lng;

                $markerData[] = [
                    'lat' => $lat,
                    'lng' => $lng,
                    'title' => $marker->title,
                    'tooltip' => $marker->tooltip,
                    // Universelles Link-Schema: öffnet auf Mobilgeräten die installierte
                    // Maps-App (iOS -> Apple/Google Maps, Android -> Google Maps),
                    // im Desktop-Browser die Maps-Website.
                    'routeUrl' => sprintf(
                        'https://www.google.com/maps/dir/?api=1&destination=%s,%s',
                        $lat,
                        $lng
                    ),
                ];
                $bounds[] = [$lat, $lng];
            }
        }

        $template->markersJson = json_encode($markerData, JSON_THROW_ON_ERROR);
        $template->mapId = 'leaflet-map-' . $model->id;
        $template->provider = $model->leafletProvider ?: 'osm';
        $template->googleApiKey = $model->leafletGoogleApiKey ?: '';
        $template->googleMapId = $model->leafletGoogleMapId ?: '';
        $template->openFreeMapStyle = $model->leafletOpenFreeMapStyle ?: 'liberty';

        // Priorität: eingefügtes Style-JSON (Text) > hochgeladene Style-Datei
        // (Dateiverwaltung) > vordefinierter Stil-Name oben.
        $openFreeMapStyleJson = trim((string) ($model->leafletOpenFreeMapStyleJson ?? ''));
        $openFreeMapStyleFileUrl = '';

        if ($openFreeMapStyleJson === '' && $model->leafletOpenFreeMapStyleFile) {
            $filesModel = FilesModel::findByUuid($model->leafletOpenFreeMapStyleFile);

            if ($filesModel !== null) {
                $openFreeMapStyleFileUrl = Environment::get('base') . $filesModel->path;
            }
        }

        $template->openFreeMapStyleJson = $openFreeMapStyleJson;
        $template->openFreeMapStyleFileUrl = $openFreeMapStyleFileUrl;
        $template->colorMode = $model->leafletColorMode ?: 'gray';
        $template->zoom = (int) ($model->leafletZoom ?: 13);
        $template->height = $model->leafletHeight ?: '450px';
        $template->hideAttribution = (bool) $model->leafletHideAttribution;
        $template->tileUrl = $model->leafletTileUrl ?: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        // Contao speichert Colorpicker-Werte ohne führendes '#' - das ergänzen,
        // sonst ist der Hex-Wert als SVG-fill/CSS-Farbe ungültig und wird
        // stillschweigend ignoriert (Marker bleiben dann schwarz/unbunt).
        $markerColor = $model->leafletMarkerColor ?: 'e63946';
        $template->markerColor = '#' . ltrim($markerColor, '#');

        // Leer = Markerfarbe auch für den Routing-Link verwenden.
        $routeLinkColor = trim((string) ($model->leafletRouteLinkColor ?? ''));
        $template->routeLinkColor = $routeLinkColor !== '' ? '#' . ltrim($routeLinkColor, '#') : $template->markerColor;

        $template->animateFit = (bool) $model->leafletAnimateFit;

        return $template->getResponse();
    }
}
