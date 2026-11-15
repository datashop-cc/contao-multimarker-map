<?php

$GLOBALS['TL_LANG']['CTE']['multimarker_map'] = ['Map with multiple markers', 'Displays an interactive map (OpenStreetMap, OpenFreeMap or Google Maps) with multiple markers, tooltips and a routing link.'];

$GLOBALS['TL_LANG']['tl_content']['leaflet_legend'] = 'Map settings';
$GLOBALS['TL_LANG']['tl_content']['leaflet_markers'] = ['Manage markers', 'Edit the markers of this map.'];
$GLOBALS['TL_LANG']['tl_content']['leafletProvider'] = ['Map provider', 'Which map service is used. The markers stay the same in every case.'];
$GLOBALS['TL_LANG']['tl_content']['leafletProviders'] = [
    'osm'         => 'OpenStreetMap (Leaflet, free)',
    'openfreemap' => 'OpenFreeMap (vector map, free, no API key required)',
    'google'      => 'Google Maps (paid API key required)',
];
$GLOBALS['TL_LANG']['tl_content']['leafletGoogleApiKey'] = ['Google Maps API key', 'Required for the map provider "Google Maps" - see the Google Cloud Console (billing must be enabled). Note: according to the terms of service, the Google logo/copyright notice must not be hidden.'];
$GLOBALS['TL_LANG']['tl_content']['leafletGoogleMapId'] = ['Google Maps map ID', 'Optional. Only with a map ID are Google\'s real pin markers (instead of our own SVG icon) used in the marker color ("Advanced Markers"). A map ID can be created free of charge in the Google Cloud Console under "Map Management".'];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyle'] = ['OpenFreeMap style', 'Native map look. Can additionally be combined with the color mode (e.g. grayscale) below. Ignored if a style file or custom style JSON is specified below.'];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyles'] = [
    'positron' => 'Positron (light, subtle)',
    'bright'   => 'Bright (vivid, classic)',
    'liberty'  => 'Liberty (default, balanced)',
    'dark'     => 'Dark (dark design)',
    'fiord'    => 'Fiord (cool, bluish)',
    '3d'       => '3D (with building extrusion)',
];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyleFile'] = ['Custom style file (file manager)', 'Upload a style.json customized in Maputnik (maputnik.github.io/editor) via the file manager and select it here. Ignored if style JSON is also pasted as text below.'];
$GLOBALS['TL_LANG']['tl_content']['leafletOpenFreeMapStyleJson'] = ['Custom style JSON (text)', 'Alternatively, paste the complete content of a style.json (e.g. exported from Maputnik) here. Takes precedence over the file and style selection above.'];

$GLOBALS['TL_LANG']['tl_content']['leafletZoom'] = ['Zoom level', 'Initial zoom level of the map (1-19).'];
$GLOBALS['TL_LANG']['tl_content']['leafletHeight'] = ['Map height', 'e.g. 450px or 60vh.'];
$GLOBALS['TL_LANG']['tl_content']['leafletColorMode'] = ['Color mode', 'How the map is colored. Markers stay colored in every mode.'];
$GLOBALS['TL_LANG']['tl_content']['leafletColorModes'] = [
    'default' => 'Default (original colors of the map tiles)',
    'gray'    => 'Grayscale (map tiles gray, markers colored)',
    'custom'  => 'Custom (adjust the CSS filter in the theme)',
];
$GLOBALS['TL_LANG']['tl_content']['leafletMarkerColor'] = ['Marker color', 'Color of the marker icons (hex value).'];
$GLOBALS['TL_LANG']['tl_content']['leafletRouteLinkColor'] = ['Link color ("Get directions")', 'Optional. Leave empty to use the marker color for the routing link in the tooltip as well.'];
$GLOBALS['TL_LANG']['tl_content']['leafletAnimateFit'] = ['Zoom animation on load', 'Smoothly zoom/pan to the fitting view on first load instead of jumping there immediately.'];
$GLOBALS['TL_LANG']['tl_content']['leafletHideAttribution'] = ['Hide copyright notice', 'Note: the attribution "© OpenStreetMap contributors" is required by the license (ODbL) when using OSM map data. Only disable it if you use a tile provider with an appropriate license (e.g. a white-label plan).'];
$GLOBALS['TL_LANG']['tl_content']['leafletTileUrl'] = ['Alternative tile URL', 'Optional: your own tile server, e.g. from MapTiler/Mapbox/Stadia. Leave empty for the public OSM default server.'];

$GLOBALS['TL_LANG']['tl_content']['cluster_legend'] = 'Marker clustering';
$GLOBALS['TL_LANG']['tl_content']['leafletCluster'] = ['Cluster markers', 'Markers close to each other are merged into a circle showing their count when zoomed out. Clicking it zooms in.'];
$GLOBALS['TL_LANG']['tl_content']['leafletClusterMaxZoom'] = ['Stop clustering at zoom level', 'From this zoom level (1-20) on, all markers are shown individually. Markers with identical coordinates stay grouped and show a list on click.'];
$GLOBALS['TL_LANG']['tl_content']['leafletClusterRadius'] = ['Cluster radius (pixels)', 'How close markers must be on screen to be clustered (10-200, default 60).'];
$GLOBALS['TL_LANG']['tl_content']['leafletClusterColor'] = ['Cluster color', 'Color of the cluster circle. Leave empty to use the marker color.'];
