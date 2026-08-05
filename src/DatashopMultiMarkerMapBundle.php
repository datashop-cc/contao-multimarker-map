<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

/**
 * AbstractBundle löst getPath() automatisch korrekt auf das Paket-Root auf
 * (wichtig, damit Contao contao/dca, contao/languages, contao/templates
 * findet - siehe https://docs.contao.org/5.x/dev/framework/templates/architecture/).
 *
 * WICHTIG: AbstractBundle lädt config/services.yaml NICHT automatisch.
 * Ohne dieses explizite loadExtension() würde keiner unserer Services
 * (u.a. der Content-Element-Controller mit #[AsContentElement]) jemals im
 * Container registriert - DCA-Felder/Tabellen erscheinen trotzdem (das läuft
 * über einen separaten Contao-Mechanismus), aber der Elementtyp selbst
 * bliebe im Backend unsichtbar, weil Contao ihn aus den registrierten
 * Fragment-Services ermittelt.
 */
class DatashopMultiMarkerMapBundle extends AbstractBundle
{
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->import('../config/services.yaml');
    }
}
