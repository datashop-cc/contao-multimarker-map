<?php

declare(strict_types=1);

namespace Datashop\MultiMarkerMap\ContaoManager;

use Contao\ManagerPlugin\Bundle\BundlePluginInterface;
use Contao\ManagerPlugin\Bundle\Config\BundleConfig;
use Contao\ManagerPlugin\Bundle\Parser\ParserInterface;
use Contao\CoreBundle\ContaoCoreBundle;
use Datashop\MultiMarkerMap\DatashopMultiMarkerMapBundle;

class Plugin implements BundlePluginInterface
{
    public function getBundles(ParserInterface $parser): array
    {
        return [
            BundleConfig::create(DatashopMultiMarkerMapBundle::class)
                ->setLoadAfter([ContaoCoreBundle::class]),
        ];
    }
}
