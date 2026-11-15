(function () {
    'use strict';

    // ---------- Gemeinsame Helfer ----------

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /*
     * Abmessungen des Pin-Icons inkl. 1px Rand rundherum für die Kontur.
     * Die Pin-Form selbst ist 30x42 groß; die Kontur (stroke-width 1) liegt
     * aber MITTIG auf dem Pfad, ragt also 0.5px nach außen. Mit einer exakt
     * 30x42 großen viewBox wurde diese äußere Hälfte vom SVG-Viewport
     * (overflow: hidden) abgeschnitten -> Rand links/rechts/oben und an der
     * Spitze sichtbar dünner bzw. angeschnitten. Daher viewBox um 1px
     * erweitert und Spitze per stroke-linejoin="round" nicht spitz verlängert.
     */
    var PIN_WIDTH = 32;
    var PIN_HEIGHT = 44;
    // Position der Pin-Spitze im Icon (= Ankerpunkt auf der Koordinate).
    var PIN_TIP_X = 16;
    var PIN_TIP_Y = 43;

    // Abstand, den die Marker-GRAFIK beim automatischen Einpassen mehrerer
    // Marker (fitBounds) mindestens zum Kartenrand haben soll.
    var FIT_MARGIN = 40;

    function buildPinSvg(hexColor) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + PIN_WIDTH + '" height="' + PIN_HEIGHT + '" viewBox="-1 -1 32 44">' +
            '<path fill="' + hexColor + '" stroke="#1a1a1a" stroke-width="1" stroke-linejoin="round" ' +
            'd="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z"/>' +
            '<circle cx="15" cy="15" r="6" fill="#fff"/>' +
            '</svg>';
    }

    /**
     * Padding für fitBounds: Die Bounds bestehen nur aus den Marker-
     * KOORDINATEN, also den Pin-Spitzen. Der Pin ragt aber PIN_HEIGHT px
     * nach oben (und halbe Breite zur Seite) über seine Koordinate hinaus.
     * Ein symmetrisches Padding reicht daher oben nicht aus - der oberste
     * Marker wurde am Kartenrand abgeschnitten (bei Google ganz ohne
     * Padding sogar komplett bis auf die Spitze). Deshalb oben die volle
     * Pin-Höhe und seitlich die halbe Pin-Breite zusätzlich einrechnen.
     *
     * Bei sehr kleinen Karten wird das Padding proportional reduziert, da
     * Leaflet/MapLibre/Google bei Padding größer als die Karte sonst falsch
     * bzw. gar nicht zoomen.
     */
    function getFitPadding(el) {
        var padding = {
            top: FIT_MARGIN + PIN_HEIGHT,
            right: FIT_MARGIN + PIN_WIDTH / 2,
            bottom: FIT_MARGIN,
            left: FIT_MARGIN + PIN_WIDTH / 2,
        };

        var maxShare = 0.6;
        var height = el.clientHeight;
        var width = el.clientWidth;
        var vScale = height ? Math.min(1, (height * maxShare) / (padding.top + padding.bottom)) : 1;
        var hScale = width ? Math.min(1, (width * maxShare) / (padding.left + padding.right)) : 1;

        return {
            top: Math.round(padding.top * vScale),
            right: Math.round(padding.right * hScale),
            bottom: Math.round(padding.bottom * vScale),
            left: Math.round(padding.left * hScale),
        };
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

    function buildPopupBody(m, linkColor) {
        var html = '<strong>' + escapeHtml(m.title) + '</strong>';
        if (m.tooltip) {
            html += '<p>' + m.tooltip + '</p>';
        }
        var colorStyle = linkColor ? ' style="color:' + linkColor + '"' : '';
        html += '<a href="' + m.routeUrl + '" target="_blank" rel="noopener" class="multimarker-map__route-link"' + colorStyle + '>Route berechnen</a>';
        return html;
    }

    function buildPopupHtml(m, linkColor) {
        return '<div class="multimarker-map__popup">' + buildPopupBody(m, linkColor) + '</div>';
    }

    /**
     * Listen-Popup für mehrere Marker an (nahezu) derselben Stelle: jeder
     * Eintrag mit Titel, Tooltip-Text und eigenem Routing-Link.
     */
    function buildListPopupHtml(items, markers, linkColor) {
        var html = '<div class="multimarker-map__popup multimarker-map__popup--list">';
        items.forEach(function (i) {
            html += '<div class="multimarker-map__popup-item">' + buildPopupBody(markers[i], linkColor) + '</div>';
        });
        return html + '</div>';
    }

    // ---------- Marker gruppieren (Clustering, alle Anbieter) ----------

    /*
     * Die eigentliche Gruppierungs-Logik übernimmt Supercluster (ISC-Lizenz,
     * lokal unter public/vendor/supercluster/ mitgeliefert, kein CDN). Die
     * Darstellung (Kreis mit Anzahl) und das Ein-/Ausblenden der Marker
     * erledigt pro Kartenanbieter ein kleiner "Adapter" (siehe
     * initLeafletMap/initGoogleMap/initOpenFreeMapMap). Dadurch sehen Gruppen
     * bei allen drei Anbietern gleich aus und verhalten sich gleich.
     */
    var superclusterCallbacks = null;

    function loadSupercluster(src, callback) {
        if (window.Supercluster) {
            callback();
            return;
        }

        if (superclusterCallbacks) {
            superclusterCallbacks.push(callback);
            return;
        }

        superclusterCallbacks = [callback];

        var done = function () {
            var callbacks = superclusterCallbacks;
            superclusterCallbacks = null;
            if (!window.Supercluster) {
                // z.B. wenn die Seite einen AMD-Loader (require.js) nutzt und
                // die Bibliothek sich dort statt global registriert hat.
                console.warn('MultiMarkerMap: Supercluster konnte nicht geladen werden, Marker werden ungruppiert angezeigt.');
            }
            callbacks.forEach(function (cb) { cb(); });
        };

        var script = document.createElement('script');
        script.src = src;
        script.onload = done;
        script.onerror = done;
        document.head.appendChild(script);
    }

    function getClusterOptions(el) {
        if (el.dataset.cluster !== '1') {
            return null;
        }

        return {
            maxZoom: parseInt(el.dataset.clusterMaxZoom, 10) || 15,
            radius: parseInt(el.dataset.clusterRadius, 10) || 60,
            color: el.dataset.clusterColor || el.dataset.markerColor || '#e63946',
            script: el.dataset.clusterScript || '',
        };
    }

    /**
     * Lädt Supercluster nur nach, wenn bei diesem Element "Marker gruppieren"
     * aktiv ist, und startet danach die eigentliche Karten-Initialisierung.
     */
    function withClusterLibrary(el, init) {
        var options = getClusterOptions(el);
        if (!options || !options.script) {
            init(el);
            return;
        }
        loadSupercluster(options.script, function () {
            init(el);
        });
    }

    // Weiß oder Dunkelgrau als Zahlenfarbe - je nachdem, was auf der
    // gewählten Gruppen-Farbe besser lesbar ist (relative Luminanz).
    function getContrastTextColor(hexColor) {
        var hex = (hexColor || '').replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var num = parseInt(hex, 16);
        if (isNaN(num)) {
            return '#ffffff';
        }
        var channel = function (c) {
            c /= 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        var luminance = 0.2126 * channel(num >> 16) + 0.7152 * channel((num >> 8) & 0xFF) + 0.0722 * channel(num & 0xFF);
        return luminance > 0.45 ? '#1a1a1a' : '#ffffff';
    }

    function getClusterSize(count) {
        if (count < 10) {
            return 36;
        }
        return count < 100 ? 42 : 50;
    }

    function formatClusterCount(count) {
        return count >= 1000 ? Math.round(count / 1000) + 'k' : String(count);
    }

    /**
     * Gruppen-Kreis als SVG: halbtransparenter Außenring + voller Kreis mit
     * weißem Rand und der Anzahl in der Mitte. Als SVG (statt HTML/CSS),
     * damit dieselbe Grafik auch bei Google ohne Map-ID (klassische Marker
     * mit Bild-Icon) verwendet werden kann.
     */
    function buildClusterSvg(count, hexColor) {
        var size = getClusterSize(count);
        var half = size / 2;
        var fontSize = count < 100 ? 14 : 13;
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
            '<circle cx="' + half + '" cy="' + half + '" r="' + half + '" fill="' + hexColor + '" fill-opacity="0.35"/>' +
            '<circle cx="' + half + '" cy="' + half + '" r="' + (half - 5) + '" fill="' + hexColor + '" stroke="#ffffff" stroke-width="2"/>' +
            '<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="' + fontSize + '" font-weight="700" fill="' + getContrastTextColor(hexColor) + '">' +
            formatClusterCount(count) + '</text>' +
            '</svg>';
    }

    function buildClusterElement(count, hexColor) {
        var size = getClusterSize(count);
        var el = document.createElement('div');
        el.className = 'multimarker-map__cluster';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.innerHTML = buildClusterSvg(count, hexColor);
        el.setAttribute('role', 'button');
        el.setAttribute('title', formatClusterCount(count) + ' Marker');
        return el;
    }

    /**
     * Gemeinsame Gruppierungs-Logik für alle Anbieter.
     *
     * adapter muss bereitstellen:
     *   getView()                       -> { bbox: [west, south, east, north], zoom } oder null
     *   getMaxZoom()                    -> höchste mögliche Zoomstufe der Karte
     *   createPoint(index)              -> Marker-Objekt für markers[index] (noch nicht auf der Karte)
     *   createCluster(lat, lng, count, onClick) -> Gruppen-Objekt (noch nicht auf der Karte)
     *   show(handle) / hide(handle)     -> Objekt auf die Karte setzen / entfernen
     *   zoomTo(lat, lng, zoom)
     *   openList(lat, lng, items, handle) -> Listen-Popup für mehrere Marker-Indizes
     *   onViewChange(callback)          -> callback nach jedem Verschieben/Zoomen
     */
    function setupClustering(markers, options, adapter) {
        // 1. Marker mit (auf ~10 cm) identischen Koordinaten vorab zu einem
        //    Punkt zusammenfassen. Die lösen sich durch Zoomen nie auf, daher
        //    zeigen sie stattdessen beim Klick ein Listen-Popup.
        var groups = [];
        var groupIndexByKey = {};

        markers.forEach(function (m, i) {
            var key = m.lat.toFixed(6) + ',' + m.lng.toFixed(6);
            if (groupIndexByKey[key] === undefined) {
                groupIndexByKey[key] = groups.length;
                groups.push({ lat: m.lat, lng: m.lng, items: [] });
            }
            groups[groupIndexByKey[key]].items.push(i);
        });

        // 2. Supercluster: "maxZoom" ist dort die HÖCHSTE Zoomstufe, auf der
        //    noch gruppiert wird. Im Backend heißt die Einstellung "ab
        //    Zoomstufe X nicht mehr gruppieren", daher X - 1.
        var index = new window.Supercluster({
            radius: options.radius,
            maxZoom: Math.max(0, options.maxZoom - 1),
            map: function (props) {
                return { count: props.count };
            },
            reduce: function (accumulated, props) {
                accumulated.count += props.count;
            },
        });

        index.load(groups.map(function (g, groupIndex) {
            return {
                type: 'Feature',
                properties: { group: groupIndex, count: g.items.length },
                geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
            };
        }));

        var rendered = {};
        var pointCache = {};

        function itemsOfCluster(clusterId) {
            var items = [];
            index.getLeaves(clusterId, Infinity).forEach(function (leaf) {
                items = items.concat(groups[leaf.properties.group].items);
            });
            return items;
        }

        // Liefert [Schlüssel, Objekt] für ein Supercluster-Ergebnis. Eigene
        // Funktion, damit jeder Klick-Handler "seine" Werte festhält.
        function resolveFeature(feature) {
            var props = feature.properties;
            var lng = feature.geometry.coordinates[0];
            var lat = feature.geometry.coordinates[1];
            var key;
            var handle;

            if (props.cluster) {
                key = 'c' + props.cluster_id;
                if (rendered[key]) {
                    return [key, rendered[key]];
                }
                handle = adapter.createCluster(lat, lng, props.count, function () {
                    var expansionZoom = index.getClusterExpansionZoom(props.cluster_id);
                    if (expansionZoom > adapter.getMaxZoom()) {
                        // Gruppe würde sich erst jenseits der maximalen
                        // Zoomstufe der Karte auflösen -> Liste statt Zoom.
                        adapter.openList(lat, lng, itemsOfCluster(props.cluster_id), handle);
                    } else {
                        adapter.zoomTo(lat, lng, expansionZoom);
                    }
                });
                return [key, handle];
            }

            var group = groups[props.group];

            if (group.items.length === 1) {
                key = 'p' + group.items[0];
                if (!pointCache[key]) {
                    pointCache[key] = adapter.createPoint(group.items[0]);
                }
                return [key, pointCache[key]];
            }

            key = 'g' + props.group;
            if (rendered[key]) {
                return [key, rendered[key]];
            }
            handle = adapter.createCluster(lat, lng, group.items.length, function () {
                adapter.openList(lat, lng, group.items, handle);
            });
            return [key, handle];
        }

        function update() {
            var view = adapter.getView();
            if (!view) {
                return;
            }

            var next = {};
            index.getClusters(view.bbox, view.zoom).forEach(function (feature) {
                var resolved = resolveFeature(feature);
                next[resolved[0]] = resolved[1];
            });

            Object.keys(rendered).forEach(function (key) {
                if (!next[key]) {
                    adapter.hide(rendered[key]);
                }
            });
            Object.keys(next).forEach(function (key) {
                if (!rendered[key]) {
                    adapter.show(next[key]);
                }
            });

            rendered = next;
        }

        adapter.onViewChange(update);
        update();
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
            iconSize: [PIN_WIDTH, PIN_HEIGHT],
            iconAnchor: [PIN_TIP_X, PIN_TIP_Y],
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

        var bounds = markers.map(function (m) {
            return [m.lat, m.lng];
        });

        var createPoint = function (i) {
            var m = markers[i];
            var marker = L.marker([m.lat, m.lng], { icon: icon, title: m.title });
            marker.bindPopup(buildPopupHtml(m, routeLinkColor));
            return marker;
        };

        var clusterOptions = getClusterOptions(el);

        if (clusterOptions && window.Supercluster) {
            // Einpassen VOR dem Gruppieren, damit die erste Berechnung schon
            // mit dem endgültigen Ausschnitt arbeitet (bei Animation folgt
            // ohnehin noch ein "moveend").
            fitLeafletBounds(map, el, bounds, animateFit);

            setupClustering(markers, clusterOptions, {
                getView: function () {
                    var b = map.getBounds();
                    return { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() };
                },
                getMaxZoom: function () {
                    return map.getMaxZoom();
                },
                createPoint: createPoint,
                createCluster: function (lat, lng, count, onClick) {
                    var size = getClusterSize(count);
                    var marker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'multimarker-map__cluster',
                            html: buildClusterSvg(count, clusterOptions.color),
                            iconSize: [size, size],
                            iconAnchor: [size / 2, size / 2],
                        }),
                        title: formatClusterCount(count) + ' Marker',
                        // Gruppen über einzelnen Pins, größere Gruppen oben.
                        zIndexOffset: 1000 + count,
                    });
                    marker.on('click', onClick);
                    return marker;
                },
                show: function (handle) {
                    handle.addTo(map);
                },
                hide: function (handle) {
                    handle.remove();
                },
                zoomTo: function (lat, lng, zoom) {
                    map.setView([lat, lng], zoom);
                },
                openList: function (lat, lng, items) {
                    var size = getClusterSize(items.length);
                    L.popup({ offset: [0, 5 - size / 2], maxHeight: 280 })
                        .setLatLng([lat, lng])
                        .setContent(buildListPopupHtml(items, markers, routeLinkColor))
                        .openOn(map);
                },
                onViewChange: function (callback) {
                    map.on('moveend', callback);
                },
            });
            return;
        }

        markers.forEach(function (m, i) {
            createPoint(i).addTo(map);
        });

        fitLeafletBounds(map, el, bounds, animateFit);
    }

    function fitLeafletBounds(map, el, bounds, animateFit) {
        if (bounds.length > 1) {
            var fitPadding = getFitPadding(el);
            map.fitBounds(bounds, {
                paddingTopLeft: [fitPadding.left, fitPadding.top],
                paddingBottomRight: [fitPadding.right, fitPadding.bottom],
                animate: animateFit,
            });
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
            scaledSize: new google.maps.Size(PIN_WIDTH, PIN_HEIGHT),
            anchor: new google.maps.Point(PIN_TIP_X, PIN_TIP_Y),
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

        // Klassische Marker haben setMap(), Advanced Markers die Eigenschaft
        // "map" - beides hier vereinheitlicht.
        var setMarkerMap = function (marker, targetMap) {
            if (typeof marker.setMap === 'function') {
                marker.setMap(targetMap);
            } else {
                marker.map = targetMap;
            }
        };

        var createPoint = function (i) {
            var m = markers[i];
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
                    title: m.title,
                    content: pin.element,
                });
            } else {
                marker = new google.maps.Marker({ position: position, icon: icon, title: m.title });
            }

            marker.addListener('click', function () {
                infoWindow.setContent(buildPopupHtml(m, routeLinkColor));
                infoWindow.open({ anchor: marker, map: map });
            });

            return marker;
        };

        markers.forEach(function (m) {
            bounds.extend({ lat: m.lat, lng: m.lng });
        });

        if (markers.length > 1) {
            map.fitBounds(bounds, getFitPadding(el));
        }

        var clusterOptions = getClusterOptions(el);

        if (clusterOptions && window.Supercluster) {
            setupClustering(markers, clusterOptions, {
                getView: function () {
                    // Vor dem ersten "idle" kennt Google den Ausschnitt noch
                    // nicht - dann einfach auf das idle-Event warten.
                    var b = map.getBounds();
                    if (!b) {
                        return null;
                    }
                    var ne = b.getNorthEast();
                    var sw = b.getSouthWest();
                    return { bbox: [sw.lng(), sw.lat(), ne.lng(), ne.lat()], zoom: map.getZoom() };
                },
                getMaxZoom: function () {
                    return map.get('maxZoom') || 21;
                },
                createPoint: createPoint,
                createCluster: function (lat, lng, count, onClick) {
                    var size = getClusterSize(count);
                    var title = formatClusterCount(count) + ' Marker';
                    var marker;

                    if (useAdvancedMarkers) {
                        var content = buildClusterElement(count, clusterOptions.color);
                        // Advanced Markers sitzen mit der UNTERKANTE auf der
                        // Koordinate - für den Kreis soll es die Mitte sein.
                        content.style.transform = 'translateY(50%)';
                        marker = new google.maps.marker.AdvancedMarkerElement({
                            position: { lat: lat, lng: lng },
                            title: title,
                            content: content,
                            zIndex: 1000 + count,
                        });
                    } else {
                        marker = new google.maps.Marker({
                            position: { lat: lat, lng: lng },
                            title: title,
                            zIndex: 1000 + count,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildClusterSvg(count, clusterOptions.color)),
                                scaledSize: new google.maps.Size(size, size),
                                anchor: new google.maps.Point(size / 2, size / 2),
                            },
                        });
                    }

                    marker.addListener('click', onClick);
                    return marker;
                },
                show: function (handle) {
                    setMarkerMap(handle, map);
                },
                hide: function (handle) {
                    setMarkerMap(handle, null);
                },
                zoomTo: function (lat, lng, zoom) {
                    map.setCenter({ lat: lat, lng: lng });
                    map.setZoom(zoom);
                },
                openList: function (lat, lng, items, handle) {
                    infoWindow.setContent(buildListPopupHtml(items, markers, routeLinkColor));
                    infoWindow.open({ anchor: handle, map: map });
                },
                onViewChange: function (callback) {
                    map.addListener('idle', callback);
                },
            });
            return;
        }

        markers.forEach(function (m, i) {
            setMarkerMap(createPoint(i), map);
        });
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
        el.className = 'multimarker-map__pin';
        el.innerHTML = buildPinSvg(hexColor);
        el.style.width = PIN_WIDTH + 'px';
        el.style.height = PIN_HEIGHT + 'px';
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

        // MapLibre schiebt die Karte (anders als Leaflet/Google) nicht
        // automatisch nach, wenn ein Popup am Kartenrand sonst
        // abgeschnitten würde - das bauen wir hier selbst nach.
        var keepPopupInView = function (popup) {
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
            return popup;
        };

        var createPoint = function (i) {
            var m = markers[i];
            var markerEl = buildMapLibreMarkerElement(markerColor);
            // 'anchor: bottom' erzwingt, dass das Popup immer OBERHALB des
            // Markers aufklappt (Spitze zeigt nach unten auf den Marker) -
            // MapLibre würde sonst je nach verfügbarem Platz automatisch
            // zwischen oben/unten wechseln, anders als bei Leaflet/Google.
            // offset: 38 statt der Bibliotheks-üblichen 25px, damit die
            // Popup-Spitze am OBEREN Rand des 42px hohen Pin-Icons landet
            // (analog zu Leaflets popupAnchor: [0, -38]) statt mittig auf
            // Höhe des weißen Punkts im Pin.
            var popup = keepPopupInView(new maplibregl.Popup({ offset: 38, anchor: 'bottom' }).setHTML(buildPopupHtml(m, routeLinkColor)));

            // offset: Pin-Spitze sitzt 1px über der Unterkante des Icons
            // (Platz für die Kontur), daher 1px nach unten verschieben, damit
            // die Spitze exakt auf der Koordinate liegt (wie bei Leaflet/Google).
            return new maplibregl.Marker({ element: markerEl, anchor: 'bottom', offset: [0, PIN_HEIGHT - PIN_TIP_Y] })
                .setLngLat([m.lng, m.lat])
                .setPopup(popup);
        };

        markers.forEach(function (m) {
            bounds.extend([m.lng, m.lat]);
        });

        if (markers.length > 1) {
            // Standardmäßig kein sichtbares Heranzoomen von der
            // Anfangsposition zur passenden Ansicht (wie bei Leaflet/Google),
            // per Backend-Option "Zoom-Animation beim Laden" umschaltbar.
            map.fitBounds(bounds, { padding: getFitPadding(el), maxZoom: 16, animate: animateFit });
        }

        var clusterOptions = getClusterOptions(el);

        if (clusterOptions && window.Supercluster) {
            var listPopup = null;

            setupClustering(markers, clusterOptions, {
                getView: function () {
                    var b = map.getBounds();
                    return { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() };
                },
                getMaxZoom: function () {
                    return map.getMaxZoom();
                },
                createPoint: createPoint,
                createCluster: function (lat, lng, count, onClick) {
                    var clusterEl = buildClusterElement(count, clusterOptions.color);
                    clusterEl.style.zIndex = String(1000 + count);
                    clusterEl.addEventListener('click', function (e) {
                        // Sonst wertet MapLibre den Klick zusätzlich als
                        // Klick auf die Karte und schließt das Listen-Popup.
                        e.stopPropagation();
                        onClick();
                    });
                    return new maplibregl.Marker({ element: clusterEl, anchor: 'center' }).setLngLat([lng, lat]);
                },
                show: function (handle) {
                    handle.addTo(map);
                },
                hide: function (handle) {
                    handle.remove();
                },
                zoomTo: function (lat, lng, zoom) {
                    map.easeTo({ center: [lng, lat], zoom: zoom });
                },
                openList: function (lat, lng, items) {
                    if (listPopup) {
                        listPopup.remove();
                    }
                    var size = getClusterSize(items.length);
                    listPopup = keepPopupInView(new maplibregl.Popup({ offset: size / 2, anchor: 'bottom', maxWidth: '300px' }))
                        .setLngLat([lng, lat])
                        .setHTML(buildListPopupHtml(items, markers, routeLinkColor))
                        .addTo(map);
                },
                onViewChange: function (callback) {
                    map.on('moveend', callback);
                },
            });
            return;
        }

        markers.forEach(function (m, i) {
            createPoint(i).addTo(map);
        });
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
                osmEls.forEach(function (el) {
                    withClusterLibrary(el, initLeafletMap);
                });
            });
        }

        if (openFreeMapEls.length) {
            loadMapLibre(function () {
                openFreeMapEls.forEach(function (el) {
                    withClusterLibrary(el, initOpenFreeMapMap);
                });
            });
        }

        if (googleEls.length) {
            var apiKey = googleEls[0].dataset.googleApiKey;
            if (!apiKey) {
                console.warn('MultiMarkerMap: Kartenanbieter "Google Maps" gewählt, aber kein API-Key hinterlegt.');
                return;
            }
            loadGoogleMaps(apiKey, function () {
                googleEls.forEach(function (el) {
                    withClusterLibrary(el, initGoogleMap);
                });
            });
        }
    });
})();
