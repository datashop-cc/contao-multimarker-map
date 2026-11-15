<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap\Controller\ContentElement;

use Contao\ContentModel;
use Contao\CoreBundle\Controller\ContentElement\AbstractContentElementController;
use Contao\CoreBundle\DependencyInjection\Attribute\AsContentElement;
use Contao\Environment;
use Contao\FilesModel;
use Contao\System;
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

        // Ohne veröffentlichte Marker: Besucher sehen gar nichts (keine leere
        // Fläche, kein Hinweistext). Der Hinweis für Redakteure erscheint nur
        // in der Backend-Ansicht und in der Frontend-Vorschau.
        if ($markers === null && !$this->isBackendScope($request) && !$this->isPreviewMode()) {
            return new Response('');
        }

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
        $template->hasMarkers = count($markerData) > 0;
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
        // Nur bei OpenStreetMap/Leaflet auswählbar (Subpalette). Bei anderen
        // Anbietern bewusst ignorieren, damit ein früher gesetzter, im
        // Backend nicht mehr sichtbarer Haken nicht unbemerkt weiterwirkt.
        $template->hideAttribution = $template->provider === 'osm' && (bool) $model->leafletHideAttribution;
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

        // Marker gruppieren (Clustering über die lokal mitgelieferte
        // Supercluster-Bibliothek, gilt einheitlich für alle drei Anbieter).
        $template->clusterEnabled = (bool) $model->leafletCluster;
        $template->clusterMaxZoom = max(1, min(20, (int) ($model->leafletClusterMaxZoom ?: 15)));
        $template->clusterRadius = max(10, min(200, (int) ($model->leafletClusterRadius ?: 60)));

        // Leer = Markerfarbe auch für die Gruppen-Kreise verwenden.
        $clusterColor = trim((string) ($model->leafletClusterColor ?? ''));
        $template->clusterColor = $clusterColor !== '' ? '#' . ltrim($clusterColor, '#') : $template->markerColor;

        // Pfad zur Bibliothek explizit übergeben statt im JS aus der eigenen
        // Script-URL abzuleiten: Contao fasst "|static"-Skripte ggf. zu einer
        // Datei unter assets/js/ zusammen, dann stimmt der relative Pfad nicht.
        $template->clusterScript = $request->getBasePath() . '/bundles/datashopmultimarkermap/vendor/supercluster/supercluster.min.js';

        return $template->getResponse();
    }

    private function isPreviewMode(): bool
    {
        $container = System::getContainer();

        if (!$container->has('contao.security.token_checker')) {
            return false;
        }

        return $container->get('contao.security.token_checker')->isPreviewMode();
    }
}
