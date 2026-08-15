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

    /**
     * Übersetzt MapLibres eingebaute "Cooperative Gestures"-Hinweistexte
     * (Strg+Scrollen / zwei Finger) je nach Seitensprache. Contao setzt
     * <html lang="..."> automatisch pro Sprachversion - bei Deutsch wird
     * eingedeutscht, sonst bleibt MapLibres englischer Standardtext.
     */
    function getMapLibreLocale() {
        var lang = (document.documentElement.lang || '').toLowerCase();
        if (lang.indexOf('de') !== 0) {
            return {};
        }
        return {
            'CooperativeGesturesHandler.WindowsHelpText': 'Strg + Scrollen zum Zoomen der Karte verwenden',
            'CooperativeGesturesHandler.MacHelpText': '⌘ + Scrollen zum Zoomen der Karte verwenden',
            'CooperativeGesturesHandler.MobileHelpText': 'Mit zwei Fingern die Karte bewegen',
        };
    }

    function buildPopupHtml(m, linkColor) {
        var html = '<div class="multimarker-map__popup"><strong>' + escapeHtml(m.title) + '</strong>';
        if (m.tooltip) {
            html += '<p>' + m.tooltip + '</p>';
        }
        var colorStyle = linkColor ? ' style="color:' + linkColor + '"' : '';
        html += '<a href="' + m.routeUrl + '" target="_blank" rel="noopener" class="multimarker-map__route-link"' + colorStyle + '>Route berechnen</a></div>';
        return html;
    }

    /**
     * Google-Maps-artiges "Cooperative Gesture Handling" für Leaflet und
     * MapLibre nachgebaut (Google bietet das über die native
     * gestureHandling-Option bereits automatisch, siehe initGoogleMap):
     * Ein Finger scrollt die Seite normal weiter, erst zwei Finger bewegen
     * die Karte. Pinch-Zoom braucht ohnehin immer zwei Finger und bleibt
     * unangetastet - hier geht es nur ums Verschieben (Pan).
     *
     * setDraggingEnabled: Funktion, die dem jeweiligen Kartenobjekt sagt,
     * ob Verschieben per Ein-Finger-Touch gerade erlaubt ist oder nicht
     * (Leaflet: map.dragging.enable()/disable(), MapLibre: map.dragPan...).
     */
    function enableTwoFingerPanning(el, setDraggingEnabled, extraTouchActionEls) {
        // Nur auf Touch-Geräten eingreifen - am Desktop mit der Maus bleibt
        // Verschieben ganz normal per Klick+Ziehen möglich (dort kommen nie
        // Touch-Events, das Deaktivieren unten würde sonst dauerhaft aktiv
        // bleiben und die Maus-Bedienung kaputt machen).
        var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouchDevice) {
            return;
        }

        // touch-action muss auf ALLEN Elementen gesetzt werden, die
        // tatsächlich berührt werden können - bei MapLibre ist das nicht
        // nur unser Container, sondern zusätzlich die interne <canvas>
        // (map.getCanvas()), die eine eigene, unabhängige touch-action-
        // Einstellung mitbringt. Der Browser richtet sich nach dem konkret
        // berührten Element, nicht nach dem Container.
        var touchActionTargets = [el].concat(extraTouchActionEls || []);
        var setTouchAction = function (value) {
            touchActionTargets.forEach(function (target) {
                target.style.touchAction = value;
            });
        };

        // Startet auf "pan-y", damit ein Finger die Seite scrollen lässt.
        // Bei zwei Fingern (Pinch) wird unten dynamisch auf "none"
        // zurückgeschaltet - das ist Leaflets/MapLibres eigener,
        // unveränderter Standardwert, unter dem Pinch-Zoom schon immer
        // korrekt nur die Karte betraf. Bliebe "pan-y" dauerhaft aktiv,
        // würde der Browser den Pinch teils selbst als Seiten-Zoom
        // interpretieren statt ihn der Bibliothek zu überlassen.
        setTouchAction('pan-y');
        setDraggingEnabled(false);

        var hint = document.createElement('div');
        hint.className = 'multimarker-map__gesture-hint';
        var lang = (document.documentElement.lang || '').toLowerCase();
        hint.textContent = lang.indexOf('de') === 0 ? 'Mit zwei Fingern bewegen' : 'Use two fingers to move the map';
        el.appendChild(hint);

        var hintTimeout;
        var showHint = function () {
            hint.classList.add('is-visible');
            clearTimeout(hintTimeout);
            hintTimeout = setTimeout(function () {
                hint.classList.remove('is-visible');
            }, 1500);
        };

        el.addEventListener('touchstart', function (e) {
            var twoFingers = e.touches.length >= 2;
            setDraggingEnabled(twoFingers);
            setTouchAction(twoFingers ? 'none' : 'pan-y');
            if (!twoFingers) {
                showHint();
            }
        }, { passive: true });

        el.addEventListener('touchend', function (e) {
            var twoFingers = e.touches.length >= 2;
            setDraggingEnabled(twoFingers);
            setTouchAction(twoFingers ? 'none' : 'pan-y');
        }, { passive: true });
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
        var routeLinkColor = el.dataset.routeLinkColor || '';
        var animateFit = el.dataset.animateFit === '1';

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

        // Auf Touch-Geräten wie bei Google Maps: erst zwei Finger bewegen die
        // Karte, ein Finger scrollt die Seite normal weiter. Pinch-Zoom
        // (immer zwei Finger) bleibt davon unberührt.
        enableTwoFingerPanning(el, function (enabled) {
            if (enabled) {
                map.dragging.enable();
            } else {
                map.dragging.disable();
            }
        });

        var bounds = [];

        markers.forEach(function (m) {
            var marker = L.marker([m.lat, m.lng], { icon: icon, title: m.title }).addTo(map);
            marker.bindPopup(buildPopupHtml(m, routeLinkColor));
            bounds.push([m.lat, m.lng]);
        });

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [40, 40], animate: animateFit });
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
        var routeLinkColor = el.dataset.routeLinkColor || '';

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
                infoWindow.setContent(buildPopupHtml(m, routeLinkColor));
                infoWindow.open(map, marker);
            });
        });

        if (markers.length > 1) {
            map.fitBounds(bounds);
        }
    }

    // ---------- OpenFreeMap (Vektorkarte via MapLibre GL JS) ----------

    function loadMapLibre(callback) {
        if (window.maplibregl) {
            callback();
            return;
        }

        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
        document.head.appendChild(css);

        var script = document.createElement('script');
        script.src = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    function buildMapLibreMarkerElement(hexColor) {
        var el = document.createElement('div');
        el.innerHTML = buildPinSvg(hexColor);
        el.style.width = '30px';
        el.style.height = '42px';
        el.style.cursor = 'pointer';
        return el;
    }

    function initOpenFreeMapMap(el) {
        var markers = JSON.parse(el.dataset.markers || '[]');
        if (!markers.length) {
            return;
        }

        var hideAttribution = el.dataset.hideAttribution === '1';
        var zoom = parseInt(el.dataset.zoom, 10) || 13;
        var markerColor = el.dataset.markerColor || '#e63946';
        var routeLinkColor = el.dataset.routeLinkColor || '';
        var animateFit = el.dataset.animateFit === '1';
        var style = el.dataset.openfreemapStyle || 'liberty';
        var styleFileUrl = el.dataset.openfreemapStyleFileUrl || '';
        var styleJsonRaw = el.dataset.openfreemapStyleJson || '';

        // "3D" ist bei OpenFreeMap kein eigener Style unter einer festen URL,
        // sondern eine Technik: ein normaler Basis-Style (hier "bright") wird
        // um eine Gebäude-Extrusions-Ebene aus der separaten "planet"-
        // Vektorquelle ergänzt, kombiniert mit gekippter Kameraperspektive
        // (pitch/bearing). Siehe MapLibre-Beispiel "Display buildings in 3D".
        var use3dBuildings = style === '3d' && !styleJsonRaw && !styleFileUrl;
        var effectiveStyleSlug = use3dBuildings ? 'bright' : style;

        // Priorität: eingefügtes Style-JSON (Text) > hochgeladene Style-Datei
        // (Dateiverwaltung) > vordefinierter OpenFreeMap-Stil-Name.
        var mapStyle;
        if (styleJsonRaw) {
            try {
                mapStyle = JSON.parse(styleJsonRaw);
            } catch (e) {
                console.warn('MultiMarkerMap: eingefügtes Style-JSON ist ungültig, verwende Standard-Stil.', e);
                mapStyle = 'https://tiles.openfreemap.org/styles/' + effectiveStyleSlug;
            }
        } else if (styleFileUrl) {
            mapStyle = styleFileUrl;
        } else {
            mapStyle = 'https://tiles.openfreemap.org/styles/' + effectiveStyleSlug;
        }

        var mapOptions = {
            container: el,
            // Entweder ein Standard-OpenFreeMap-Stil, eine hochgeladene
            // Style-Datei aus der Dateiverwaltung, oder ein direkt
            // eingefügtes Style-JSON-Objekt (siehe Prioritätslogik oben).
            // Alle basieren letztlich auf OpenStreetMap-Daten (ODbL), daher
            // gilt dieselbe Attributionspflicht wie beim OSM-Provider.
            style: mapStyle,
            center: [markers[0].lng, markers[0].lat],
            zoom: zoom,
            attributionControl: !hideAttribution,
            // MapLibres eingebautes Pendant zu Googles gestureHandling:
            // Desktop braucht Strg/Cmd+Scrollen zum Zoomen, Mobile braucht
            // zwei Finger zum Verschieben - inkl. eigenem Hinweis-Overlay.
            // Zuverlässiger als eine eigene touch-action-Lösung, da MapLibre
            // das intern konsistent selbst verwaltet.
            cooperativeGestures: true,
            locale: getMapLibreLocale(),
        };

        if (use3dBuildings) {
            mapOptions.pitch = 45;
            mapOptions.bearing = -17.6;
        }

        var map = new maplibregl.Map(mapOptions);

        if (use3dBuildings) {
            map.on('load', function () {
                var labelLayerId;
                var layers = map.getStyle().layers;

                for (var i = 0; i < layers.length; i++) {
                    if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
                        labelLayerId = layers[i].id;
                        break;
                    }
                }

                map.addSource('multimarker-map-3d-buildings', {
                    type: 'vector',
                    url: 'https://tiles.openfreemap.org/planet',
                });

                map.addLayer({
                    id: 'multimarker-map-3d-buildings',
                    source: 'multimarker-map-3d-buildings',
                    'source-layer': 'building',
                    type: 'fill-extrusion',
                    minzoom: 14,
                    paint: {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 5],
                        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                        'fill-extrusion-opacity': 0.85,
                    },
                }, labelLayerId);
            });
        }

        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        var bounds = new maplibregl.LngLatBounds();

        markers.forEach(function (m) {
            var markerEl = buildMapLibreMarkerElement(markerColor);
            // 'anchor: bottom' erzwingt, dass das Popup immer OBERHALB des
            // Markers aufklappt (Spitze zeigt nach unten auf den Marker) -
            // MapLibre würde sonst je nach verfügbarem Platz automatisch
            // zwischen oben/unten wechseln, anders als bei Leaflet/Google.
            // offset: 38 statt der Bibliotheks-üblichen 25px, damit die
            // Popup-Spitze am OBEREN Rand des 42px hohen Pin-Icons landet
            // (analog zu Leaflets popupAnchor: [0, -38]) statt mittig auf
            // Höhe des weißen Punkts im Pin.
            var popup = new maplibregl.Popup({ offset: 38, anchor: 'bottom' }).setHTML(buildPopupHtml(m, routeLinkColor));

            // MapLibre schiebt die Karte (anders als Leaflet/Google) nicht
            // automatisch nach, wenn ein Popup am Kartenrand sonst
            // abgeschnitten würde - das bauen wir hier selbst nach.
            popup.on('open', function () {
                requestAnimationFrame(function () {
                    var popupEl = popup.getElement();
                    if (!popupEl) {
                        return;
                    }

                    var margin = 20;
                    var containerRect = el.getBoundingClientRect();
                    var popupRect = popupEl.getBoundingClientRect();
                    var dx = 0;
                    var dy = 0;

                    if (popupRect.top < containerRect.top + margin) {
                        dy = popupRect.top - (containerRect.top + margin);
                    }
                    if (popupRect.left < containerRect.left + margin) {
                        dx = popupRect.left - (containerRect.left + margin);
                    }
                    if (popupRect.right > containerRect.right - margin) {
                        dx = popupRect.right - (containerRect.right - margin);
                    }

                    if (dx !== 0 || dy !== 0) {
                        map.panBy([dx, dy], { duration: 300 });
                    }
                });
            });

            new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
                .setLngLat([m.lng, m.lat])
                .setPopup(popup)
                .addTo(map);

            bounds.extend([m.lng, m.lat]);
        });

        if (markers.length > 1) {
            // Standardmäßig kein sichtbares Heranzoomen von der
            // Anfangsposition zur passenden Ansicht (wie bei Leaflet/Google),
            // per Backend-Option "Zoom-Animation beim Laden" umschaltbar.
            map.fitBounds(bounds, { padding: 40, maxZoom: 16, animate: animateFit });
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
        var openFreeMapEls = [];

        allMaps.forEach(function (el) {
            if (el.dataset.provider === 'google') {
                googleEls.push(el);
            } else if (el.dataset.provider === 'openfreemap') {
                openFreeMapEls.push(el);
            } else {
                osmEls.push(el);
            }
        });

        if (osmEls.length) {
            loadLeaflet(function () {
                osmEls.forEach(initLeafletMap);
            });
        }

        if (openFreeMapEls.length) {
            loadMapLibre(function () {
                openFreeMapEls.forEach(initOpenFreeMapMap);
            });
        }

        if (googleEls.length) {
            var apiKey = googleEls[0].dataset.googleApiKey;
            if (!apiKey) {
                console.warn('MultiMarkerMap: Kartenanbieter "Google Maps" gewählt, aber kein API-Key hinterlegt.');
                return;
            }
            loadGoogleMaps(apiKey, function () {
                googleEls.forEach(initGoogleMap);
            });
        }
    });
})();
