(function () {
    'use strict';

    document.addEventListener('click', function (event) {
        var trigger = event.target.closest('.ds-leaflet-geocode-wizard');
        if (!trigger) {
            return;
        }

        event.preventDefault();

        var address = window.prompt('Adresse eingeben (z.B. Marktplatz 1, 5400 Hallein):');
        if (!address) {
            return;
        }

        var latField = document.getElementById(trigger.dataset.latId);
        var lngField = document.getElementById(trigger.dataset.lngId);

        if (!latField || !lngField) {
            return;
        }

        trigger.style.opacity = '0.5';

        // Kostenlose OSM-Nominatim-API. Nutzungsrichtlinie beachten: max. 1
        // Anfrage/Sekunde, nur für geringes Volumen gedacht (Backend-Wizard,
        // nicht für Massenabfragen). Siehe
        // https://operations.osmfoundation.org/policies/nominatim/
        var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);

        fetch(url, { headers: { 'Accept-Language': 'de' } })
            .then(function (response) {
                return response.json();
            })
            .then(function (results) {
                trigger.style.opacity = '1';

                if (!results || !results.length) {
                    window.alert('Adresse nicht gefunden. Bitte präziser eingeben oder Lat/Lng manuell setzen.');
                    return;
                }

                latField.value = parseFloat(results[0].lat).toFixed(6);
                lngField.value = parseFloat(results[0].lon).toFixed(6);

                // Contao/Widget-Change-Events auslösen, damit evtl. gebundene
                // Validierungen/Listener reagieren.
                latField.dispatchEvent(new Event('input', { bubbles: true }));
                lngField.dispatchEvent(new Event('input', { bubbles: true }));
            })
            .catch(function () {
                trigger.style.opacity = '1';
                window.alert('Adresssuche fehlgeschlagen. Bitte Lat/Lng manuell eingeben.');
            });
    });
})();
