(function () {
    'use strict';

    // ---------- Gemeinsame Helfer ----------

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function buildPinSvg(hexColor) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">' +
            '<path fill="' + hexColor + '" stroke="#1a1a1a" stroke-width="1" ' +
            'd="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z"/>' +
            '<circle cx="15" cy="15" r="6" fill="#fff"/>' +
            '</svg>';
    }

    function buildPopupHtml(m) {
        var html = '<div class="multimarker-map__popup"><strong>' + escapeHtml(m.title) + '</strong>';
        if (m.tooltip) {
            html += '<p>' + m.tooltip + '</p>';
        }
        html += '<a href="' + m.routeUrl + '" target="_blank" rel="noopener" class="multimarker-map__route-link">Route berechnen</a></div>';
        return html;
    }

    // ---------- Leaflet / OpenStreetMap ----------

    function loadLeaflet(callback) {
        if (window.L) {
            callback();
            return;
        }

        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        var script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    function buildLeafletIcon(hexColor) {
        // Eigenes SVG-Pin-Icon in der konfigurierten Markerfarbe, damit der Marker
        // unabhängig vom (evtl. grauen) Kartenfilter immer farbig bleibt.
        return L.divIcon({
            className: 'multimarker-map__pin',
            html: buildPinSvg(hexColor),
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -38],
        });
    }

    function initLeafletMap(el) {
        var markers = JSON.parse(el.dataset.markers || '[]');
        if (!markers.length) {
            return;
        }

        var hideAttribution = el.dataset.hideAttribution === '1';
        var tileUrl = el.dataset.tileUrl;
        var zoom = parseInt(el.dataset.zoom, 10) || 13;
        var icon = buildLeafletIcon(el.dataset.markerColor || '#e63946');

        var map = L.map(el, {
            zoomControl: true,
            attributionControl: !hideAttribution,
            // Mausrad soll die Seite weiterscrollen statt die Karte zu
            // zoomen - Zoom bleibt über die +/- Buttons oder Doppelklick
            // weiterhin möglich.
            scrollWheelZoom: false,
        }).setView([markers[0].lat, markers[0].lng], zoom);

        // Leaflet fügt standardmäßig einen eigenen "Leaflet"-Credit-Link voran
        // (leafletjs.com). Das ist reine Bibliotheks-Höflichkeit, keine
        // Lizenzpflicht (Leaflet ist BSD-lizenziert) - im Gegensatz zur
        // OSM-Datenattribution unten bleibt dieser Präfix daher entfernbar.
        if (!hideAttribution && map.attributionControl) {
            map.attributionControl.setPrefix(false);
        }

        L.tileLayer(tileUrl, {
            // Pflicht-Attribution laut ODbL-Lizenz der OSM-Daten. Nur entfernen,
            // wenn ein lizenzrechtlich abgesicherter Tile-Anbieter verwendet wird
            // (siehe Feld "Copyright-Hinweis ausblenden" im Backend).
            attribution: hideAttribution
                ? ''
                : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);

        var bounds = [];

        markers.forEach(function (m) {
            var marker = L.marker([m.lat, m.lng], { icon: icon, title: m.title }).addTo(map);
            marker.bindPopup(buildPopupHtml(m));
            bounds.push([m.lat, m.lng]);
        });

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    // ---------- Google Maps ----------

    function loadGoogleMaps(apiKey, callback) {
        if (window.google && window.google.maps) {
            callback();
            return;
        }

        if (window.__dsLeafletGoogleMapsCallbacks) {
            window.__dsLeafletGoogleMapsCallbacks.push(callback);
            return;
        }

        window.__dsLeafletGoogleMapsCallbacks = [callback];
        window.__dsLeafletGoogleMapsInit = function () {
            window.__dsLeafletGoogleMapsCallbacks.forEach(function (cb) { cb(); });
        };

        // "libraries=marker" wird für die Advanced-Markers-API benötigt
        // (Googles echte Pin-Form in eigener Farbe, siehe buildGoogleIcon/-Pin).
        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) + '&libraries=marker&callback=__dsLeafletGoogleMapsInit';
        script.async = true;
        document.head.appendChild(script);
    }

    function buildGoogleIcon(hexColor) {
        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildPinSvg(hexColor)),
            scaledSize: new google.maps.Size(30, 42),
            anchor: new google.maps.Point(15, 42),
        };
    }

    function darkenHex(hexColor, amount) {
        var hex = hexColor.replace('#', '');
        var num = parseInt(hex, 16);
        var r = Math.max(0, (num >> 16) - amount);
        var g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
        var b = Math.max(0, (num & 0x0000FF) - amount);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function initGoogleMap(el) {
        var markers = JSON.parse(el.dataset.markers || '[]');
        if (!markers.length) {
            return;
        }

        var zoom = parseInt(el.dataset.zoom, 10) || 13;
        var colorMode = el.dataset.colorMode;
        var markerColor = el.dataset.markerColor || '#e63946';
        var mapId = el.dataset.googleMapId || '';

        var mapOptions = {
            zoom: zoom,
            center: { lat: markers[0].lat, lng: markers[0].lng },
            // Google verbietet laut Nutzungsbedingungen das Entfernen ihres
            // Logos/Copyright-Hinweises - anders als bei OSM gibt es dafür
            // bewusst keine "hideAttribution"-Option.
            // "cooperative" ist Googles empfohlener Standard für Karten
            // innerhalb einer scrollbaren Seite: Mausrad scrollt die Seite,
            // Zoom nur noch mit gedrückter Strg-/Cmd-Taste (mit kurzem
            // Hinweis-Overlay bei Bedarf). Auf Touch-Geräten bleibt normales
            // Zwei-Finger-Pinch-Zoom unverändert möglich.
            gestureHandling: 'cooperative',
        };

        if (mapId) {
            // Advanced Markers verlangen zwingend eine Map-ID; Styling per
            // "styles"-Array ist dann nicht mehr möglich (das läuft bei
            // Map-IDs stattdessen über die Cloud Console selbst).
            mapOptions.mapId = mapId;
        } else if (colorMode === 'gray') {
            // Näherungsweise Graustufen-Darstellung über Google Maps' eigene
            // Style-API (kein CSS-Filter-Trick nötig/möglich wie bei Leaflet).
            mapOptions.styles = [{ stylers: [{ saturation: -100 }] }];
        }

        var map = new google.maps.Map(el, mapOptions);
        var bounds = new google.maps.LatLngBounds();
        var infoWindow = new google.maps.InfoWindow();

        // Mit Map-ID: Googles echte Pin-Form ("Advanced Markers"), eingefärbt
        // in der konfigurierten Markerfarbe. Ohne Map-ID: Fallback auf
        // unser eigenes SVG-Icon über die klassische Marker-API.
        var useAdvancedMarkers = !!mapId && google.maps.marker && google.maps.marker.AdvancedMarkerElement;
        var pinElementCtor = useAdvancedMarkers ? google.maps.marker.PinElement : null;
        var icon = useAdvancedMarkers ? null : buildGoogleIcon(markerColor);

        markers.forEach(function (m) {
            var position = { lat: m.lat, lng: m.lng };
            var marker;

            if (useAdvancedMarkers) {
                var pin = new pinElementCtor({
                    background: markerColor,
                    borderColor: darkenHex(markerColor, 40),
                    glyphColor: '#ffffff',
                });
                marker = new google.maps.marker.AdvancedMarkerElement({
                    position: position,
                    map: map,
                    title: m.title,
                    content: pin.element,
                });
            } else {
                marker = new google.maps.Marker({ position: position, map: map, icon: icon, title: m.title });
            }

            bounds.extend(position);

            marker.addListener('click', function () {
                infoWindow.setContent(buildPopupHtml(m));
                infoWindow.open(map, marker);
            });
        });

        if (markers.length > 1) {
            map.fitBounds(bounds);
        }
    }

    // ---------- Init ----------

    document.addEventListener('DOMContentLoaded', function () {
        var allMaps = document.querySelectorAll('.multimarker-map');
        if (!allMaps.length) {
            return;
        }

        var osmEls = [];
        var googleEls = [];

        allMaps.forEach(function (el) {
            if (el.dataset.provider === 'google') {
                googleEls.push(el);
            } else {
                osmEls.push(el);
            }
        });

        if (osmEls.length) {
            loadLeaflet(function () {
                osmEls.forEach(initLeafletMap);
            });
        }

        if (googleEls.length) {
            var apiKey = googleEls[0].dataset.googleApiKey;
            if (!apiKey) {
                console.warn('Leaflet-MultiMap: Kartenanbieter "Google Maps" gewählt, aber kein API-Key hinterlegt.');
                return;
            }
            loadGoogleMaps(apiKey, function () {
                googleEls.forEach(initGoogleMap);
            });
        }
    });
})();
